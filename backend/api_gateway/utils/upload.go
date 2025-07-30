package utils

import (
	"context"
	"fmt"
	"io"
	"log"
	"strconv"
	"sync"
	"time"

	"github.com/Aneesh-Hegde/expenseManager/api_gateway/jwt"
	pb "github.com/Aneesh-Hegde/expenseManager/grpc_file"
	"github.com/Aneesh-Hegde/expenseManager/middleware"
	"github.com/labstack/echo/v4"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
)

var fileServiceClient pb.FileServiceClient
var grpcClientOnce sync.Once

// InitFileServiceClient initializes the gRPC client for the FileService.
func InitFileServiceClient(fileServiceAddr string) {
	grpcClientOnce.Do(func() {
		log.Printf("Connecting to File Service gRPC server at: %s", fileServiceAddr)
		conn, err := grpc.NewClient(fileServiceAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			log.Fatalf("Failed to connect to File Service: %v", err)
		}
		fileServiceClient = pb.NewFileServiceClient(conn)
		log.Print("File Service gRPC client initialized.")
	})
}

// Upload handles the HTTP request for file uploads in the API Gateway.
func Upload(c echo.Context) error {
	if fileServiceClient == nil {
		log.Print("ERROR: File Service gRPC client not initialized - call InitFileServiceClient() first")
		return c.JSON(500, map[string]interface{}{
			"success": false,
			"error":   "File Service not configured - server configuration error",
		})
	}

	log.Print("API Gateway: Starting upload process...")

	fileHeader, err := c.FormFile("file")
	if err != nil {
		log.Printf("ERROR: Error getting file from form: %v", err)
		return c.JSON(400, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Error getting file: %v", err),
		})
	}

	log.Printf("API Gateway: File received: %s", fileHeader.Filename)

	chunkNumberStr := c.FormValue("chunk_number")
	totalChunksStr := c.FormValue("total_chunks")
	filename := c.FormValue("filename")
	// userIdStr := c.FormValue("userId")
	// refreshToken := c.FormValue("refresh_token")
var token, refreshToken string
	
	// Try to get tokens from cookies first
	if tokenCookie, err := c.Cookie("token"); err == nil {
		token = tokenCookie.Value
	}
	
	if refreshCookie, err := c.Cookie("refresh_token"); err == nil {
		refreshToken = refreshCookie.Value
	}

	userId, err := jwt.ValidateJWT(token)
	if err != nil || userId == 0 {
		log.Printf("API Gateway: JWT validation failed for userId form value: %v", err)
		if refreshToken != "" {
			_, refreshedUserID, refreshErr := middleware.RefreshAccessToken(refreshToken)
			if refreshErr != nil {
				log.Printf("API Gateway: Refresh token failed: %v", refreshErr)
				return c.JSON(401, map[string]interface{}{
					"success": false,
					"error":   "Authentication failed: Invalid or expired tokens",
				})
			}
			userId = refreshedUserID
			log.Printf("API Gateway: Token refreshed, new user ID: %d", userId)
		} else {
			return c.JSON(401, map[string]interface{}{
				"success": false,
				"error":   "Authentication required: No valid user ID token or refresh token",
			})
		}
	}

	if userId == 0 {
		log.Printf("API Gateway: Failed to determine user ID.")
		return c.JSON(400, map[string]interface{}{
			"success": false,
			"error":   "Invalid or missing user ID",
		})
	}

	chunkNum, err := strconv.Atoi(chunkNumberStr)
	if err != nil {
		log.Printf("ERROR: Invalid chunk number '%s': %v", chunkNumberStr, err)
		return c.JSON(400, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Invalid chunk number: %v", err),
		})
	}

	totalChunkNum, err := strconv.Atoi(totalChunksStr)
	if err != nil {
		log.Printf("ERROR: Invalid total chunks '%s': %v", totalChunksStr, err)
		return c.JSON(400, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Invalid total chunks: %v", err),
		})
	}

	log.Printf("API Gateway: Processing for User ID: %d, File: %s, Chunk: %d/%d", userId, filename, chunkNum, totalChunkNum)

	inFile, err := fileHeader.Open()
	if err != nil {
		log.Printf("ERROR: Error opening uploaded file chunk: %v", err)
		return c.JSON(500, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Error opening uploaded file: %v", err),
		})
	}
	defer inFile.Close()

	chunkData, err := io.ReadAll(inFile)
	if err != nil {
		log.Printf("ERROR: Error reading chunk data: %v", err)
		return c.JSON(500, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Error reading chunk data: %v", err),
		})
	}

	grpcReq := &pb.UploadFileRequest{
		UserId:      int64(userId),
		Filename:    filename,
		ChunkData:   chunkData,
		ChunkNumber: int32(chunkNum),
		TotalChunks: int32(totalChunkNum),
	}

	grpcCtx, cancel := context.WithTimeout(c.Request().Context(), 60*time.Second)
	md:=metadata.Pairs("refresh_token",refreshToken,"authentication",fmt.Sprintf("Bearer %s",token))
	grpcCtx=metadata.NewOutgoingContext(c.Request().Context(),md)
	defer cancel()

	log.Print("API Gateway: Calling File Service gRPC UploadFile...")
	grpcRes, err := fileServiceClient.UploadFile(grpcCtx, grpcReq)
	if err != nil {
		log.Printf("ERROR: gRPC call to File Service failed: %v", err)
		return c.JSON(500, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("File processing service error: %v", err),
		})
	}

	log.Printf("API Gateway: Received response from File Service: %+v", grpcRes)

	return c.JSON(200, map[string]interface{}{
		"success":   grpcRes.Success,
		"message":   grpcRes.Message,
		"image_url": grpcRes.ImageUrl,
		"user_id":   grpcRes.UserId,
		"chunk":     grpcRes.ChunkStatus,
	})
}
