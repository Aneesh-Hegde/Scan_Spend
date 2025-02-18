package data

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"

	"github.com/Aneesh-Hegde/expenseManager/db"
	files "github.com/Aneesh-Hegde/expenseManager/grpc_file"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/Aneesh-Hegde/expenseManager/utils/jwt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

// Generate a new access token using the refresh token
func generateNewAccessToken(refreshToken string) (string, int, error) {
	userIdStr, err := redis.GetRefreshToken(refreshToken)
	if err != nil {
		return "", 0, fmt.Errorf("failed to get user ID from refresh token: %v", err)
	}

	userId, err := strconv.Atoi(userIdStr)
	if err != nil {
		return "", 0, fmt.Errorf("invalid user ID in refresh token: %v", err)
	}

	newAccessToken, err := jwt.GenerateJWT(userId)
	if err != nil {
		return "", 0, fmt.Errorf("failed to generate new access token: %v", err)
	}

	fmt.Printf("Generated new access token: %s\n", newAccessToken)
	return newAccessToken, userId, nil
}

// Retrieve files from DB for a given user
func getFilesFromDB(ctx context.Context, userId int) (*files.FileList, error) {
	query := `SELECT DISTINCT file_name FROM products WHERE user_id = $1`
	rows, err := db.DB.Query(ctx, query, userId) // 🔹 Use ctx from request
	if err != nil {
		log.Println("Error fetching files from DB:", err)
		return nil, err
	}
	defer rows.Close()

	var fileList files.FileList
	for rows.Next() {
		var fileName string
		if err := rows.Scan(&fileName); err != nil {
			return nil, fmt.Errorf("error scanning file name: %v", err)
		}
		fileList.Allfiles = append(fileList.Allfiles, &files.File{Filename: fileName})
	}
	return &fileList, nil
}

// Extract metadata safely
func extractMetadata(ctx context.Context) (string, string, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return "", "", fmt.Errorf("no metadata in context")
	}

	authHeaders := md["authentication"]
	refreshTokenHeaders := md["refresh_token"]

	if len(authHeaders) == 0 && len(refreshTokenHeaders) == 0 {
		return "", "", fmt.Errorf("no authentication or refresh token headers found")
	}
	if len(refreshTokenHeaders) == 0 {
		return "", "", fmt.Errorf("refresh token header is missing")
	}

	authToken := strings.TrimPrefix(authHeaders[0], "Bearer ")
	refreshToken := refreshTokenHeaders[0]

	return authToken, refreshToken, nil
}

// Main gRPC function
func GetFiles(ctx context.Context, req *files.GetFileByUser) (*files.FileList, error) {
	authToken, refreshToken, err := extractMetadata(ctx)
	if err != nil {
		log.Println("Metadata extraction error:", err)
		return nil, err
	}

	var userId int
	if authToken == "null" {
		log.Println("Access token is null, attempting refresh...")
		newAccessToken, _ , err := generateNewAccessToken(refreshToken)
		if err != nil {
			return nil, fmt.Errorf("failed to refresh access token: %v", err)
		}

		// Send the new token in the response header
		headers := metadata.Pairs("token", newAccessToken)
		if err := grpc.SendHeader(ctx, headers); err != nil {
			return nil, fmt.Errorf("failed to send headers: %v", err)
		}
	} else {
		// Validate token
		userId, err = jwt.ValidateJWT(authToken)
		if err != nil {
			log.Println("Invalid token, generating a new one...")
			newAccessToken, newUserId, err := generateNewAccessToken(refreshToken)
			if err != nil {
				return nil, fmt.Errorf("failed to generate new token: %v", err)
			}
			userId = newUserId

			headers := metadata.Pairs("token", newAccessToken)
			if err := grpc.SendHeader(ctx, headers); err != nil {
				return nil, fmt.Errorf("failed to send headers: %v", err)
			}
		}
	}

	log.Println("Fetching files for user ID:", userId)
	return getFilesFromDB(ctx, userId)
}
