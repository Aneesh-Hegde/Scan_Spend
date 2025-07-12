package utils

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/Aneesh-Hegde/expenseManager/db"
	"github.com/Aneesh-Hegde/expenseManager/middleware"
	"github.com/Aneesh-Hegde/expenseManager/utils/jwt"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"gocv.io/x/gocv"
)

type MinIOClient struct {
	client     *minio.Client
	bucketName string
	folderPath string // Base folder path
	endpoint   string
}

var minioClient *MinIOClient

// Initialize MinIO client (call this in your main function or init)
func InitMinIO() error {
	log.Print("Initializing MinIO client...")
	
	endpoint := "localhost:9000"
	accessKey := "minioadmin"
	secretKey := "minioadmin"
	bucketName := "test"
	folderPath := "upload" // Base folder path

	log.Printf("MinIO config - Endpoint: %s, Bucket: %s, Folder: %s", endpoint, bucketName, folderPath)

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: false, // Set to true for HTTPS
	})
	if err != nil {
		log.Printf("ERROR: Failed to create MinIO client: %v", err)
		return fmt.Errorf("failed to create MinIO client: %v", err)
	}

	minioClient = &MinIOClient{
		client:     client,
		bucketName: bucketName,
		folderPath: folderPath,
		endpoint:   endpoint,
	}

	// Test connection by checking if bucket exists
	log.Print("Testing MinIO connection...")
	err = minioClient.createBucketIfNotExists()
	if err != nil {
		log.Printf("ERROR: Failed to create/check bucket: %v", err)
		return fmt.Errorf("failed to create/check bucket: %v", err)
	}

	log.Print("MinIO client initialized successfully!")
	return nil
}

func (m *MinIOClient) createBucketIfNotExists() error {
	ctx := context.Background()
	
	log.Printf("Checking if bucket '%s' exists...", m.bucketName)

	exists, err := m.client.BucketExists(ctx, m.bucketName)
	if err != nil {
		log.Printf("ERROR: Failed to check bucket existence: %v", err)
		return fmt.Errorf("failed to check bucket existence: %v", err)
	}

	if !exists {
		log.Printf("Bucket '%s' doesn't exist, creating...", m.bucketName)
		err = m.client.MakeBucket(ctx, m.bucketName, minio.MakeBucketOptions{})
		if err != nil {
			log.Printf("ERROR: Failed to create bucket: %v", err)
			return fmt.Errorf("failed to create bucket: %v", err)
		}
		log.Printf("Bucket '%s' created successfully", m.bucketName)

		// Set bucket policy to allow public read access
		log.Print("Setting bucket policy for public read access...")
		policy := fmt.Sprintf(`{
			"Version": "2012-10-17",
			"Statement": [
				{
					"Effect": "Allow",
					"Principal": {"AWS": ["*"]},
					"Action": ["s3:GetObject"],
					"Resource": ["arn:aws:s3:::%s/*"]
				}
			]
		}`, m.bucketName)

		err = m.client.SetBucketPolicy(ctx, m.bucketName, policy)
		if err != nil {
			log.Printf("Warning: Could not set bucket policy: %v", err)
		} else {
			log.Print("Bucket policy set successfully")
		}
	} else {
		log.Printf("Bucket '%s' already exists", m.bucketName)
	}

	return nil
}

// Modified to include userId parameter for folder organization
func (m *MinIOClient) uploadProcessedImage(imageData []byte, filename string, userId int) (string, error) {
	ctx := context.Background()

	// Generate unique filename
	ext := filepath.Ext(filename)
	uniqueFilename := fmt.Sprintf("%s_%s%s", 
		strings.TrimSuffix(filename, ext), 
		uuid.New().String()[:8], 
		ext)
	
	// Create folder structure: base_folder/user_id/filename
	// Example: upload/user_123/image_abc123.jpg
	objectName := fmt.Sprintf("%s/user_%d/%s", m.folderPath, userId, uniqueFilename)

	log.Printf("Uploading to MinIO - Object: %s", objectName)

	// Upload to MinIO
	reader := bytes.NewReader(imageData)
	_, err := m.client.PutObject(ctx, m.bucketName, objectName, reader, int64(len(imageData)), minio.PutObjectOptions{
		ContentType: getContentType(ext),
	})
	if err != nil {
		log.Printf("ERROR: Failed to upload to MinIO: %v", err)
		return "", err
	}

	// Generate public URL
	imageURL := fmt.Sprintf("http://%s/%s/%s", m.endpoint, m.bucketName, objectName)
	log.Printf("Image uploaded successfully to user folder: %s", imageURL)
	return imageURL, nil
}

// Helper function to list all images for a specific user
func (m *MinIOClient) ListUserImages(userId int) ([]string, error) {
	ctx := context.Background()
	
	// Define the prefix for the user's folder
	prefix := fmt.Sprintf("%s/user_%d/", m.folderPath, userId)
	
	log.Printf("Listing images for user %d with prefix: %s", userId, prefix)
	
	var imageURLs []string
	
	// List objects with the user's prefix
	objectCh := m.client.ListObjects(ctx, m.bucketName, minio.ListObjectsOptions{
		Prefix:    prefix,
		Recursive: true,
	})
	
	for object := range objectCh {
		if object.Err != nil {
			log.Printf("ERROR: Error listing objects: %v", object.Err)
			return nil, object.Err
		}
		
		// Generate public URL for each image
		imageURL := fmt.Sprintf("http://%s/%s/%s", m.endpoint, m.bucketName, object.Key)
		imageURLs = append(imageURLs, imageURL)
	}
	
	log.Printf("Found %d images for user %d", len(imageURLs), userId)
	return imageURLs, nil
}

// Helper function to delete a specific user's image
func (m *MinIOClient) DeleteUserImage(userId int, filename string) error {
	ctx := context.Background()
	
	// Construct the object name (you might need to adjust this based on how you store the original object names)
	objectName := fmt.Sprintf("%s/user_%d/%s", m.folderPath, userId, filename)
	
	log.Printf("Deleting image: %s", objectName)
	
	err := m.client.RemoveObject(ctx, m.bucketName, objectName, minio.RemoveObjectOptions{})
	if err != nil {
		log.Printf("ERROR: Failed to delete image: %v", err)
		return err
	}
	
	log.Printf("Image deleted successfully: %s", objectName)
	return nil
}

// Helper function to delete all images for a user (useful for account deletion)
func (m *MinIOClient) DeleteAllUserImages(userId int) error {
	ctx := context.Background()
	
	// Get list of all user's images first
	prefix := fmt.Sprintf("%s/user_%d/", m.folderPath, userId)
	
	log.Printf("Deleting all images for user %d with prefix: %s", userId, prefix)
	
	objectCh := m.client.ListObjects(ctx, m.bucketName, minio.ListObjectsOptions{
		Prefix:    prefix,
		Recursive: true,
	})
	
	// Create a channel for objects to delete
	objectsCh := make(chan minio.ObjectInfo)
	
	// Send objects to delete
	go func() {
		defer close(objectsCh)
		for object := range objectCh {
			if object.Err != nil {
				log.Printf("ERROR: Error listing objects for deletion: %v", object.Err)
				return
			}
			objectsCh <- object
		}
	}()
	
	// Remove objects
	for rErr := range m.client.RemoveObjects(ctx, m.bucketName, objectsCh, minio.RemoveObjectsOptions{}) {
		if rErr.Err != nil {
			log.Printf("ERROR: Failed to delete object %s: %v", rErr.ObjectName, rErr.Err)
			return rErr.Err
		}
		log.Printf("Deleted object: %s", rErr.ObjectName)
	}
	
	log.Printf("All images deleted for user %d", userId)
	return nil
}

func getContentType(ext string) string {
	switch strings.ToLower(ext) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	default:
		return "application/octet-stream"
	}
}

// GetMinIOClient returns the initialized MinIO client (for testing or external use)
func GetMinIOClient() *MinIOClient {
	return minioClient
}

// Check if MinIO client is initialized
func IsMinIOInitialized() bool {
	return minioClient != nil
}

func Upload(c echo.Context) error {
	// Check if MinIO client is initialized
	if minioClient == nil {
		log.Print("ERROR: MinIO client not initialized - call InitMinIO() first")
		return c.JSON(500, map[string]interface{}{
			"success": false,
			"error":   "MinIO client not initialized - server configuration error",
		})
	}
	
	log.Print("Starting upload process...")

	// Ensure the upload directory exists (for temporary storage)
	uploadDir := "uploads"
	err := os.MkdirAll(uploadDir, os.ModePerm)
	if err != nil {
		log.Printf("ERROR: Error creating upload directory: %v", err)
		return c.JSON(500, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Error creating upload directory: %v", err),
		})
	}

	// Get the file from the request
	file, err := c.FormFile("file")
	if err != nil {
		log.Printf("ERROR: Error getting file: %v", err)
		return c.JSON(400, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Error getting file: %v", err),
		})
	}

	log.Printf("File received: %s", file.Filename)

	// Get other fields
	chunkNumber := c.FormValue("chunk_number")
	totalChunks := c.FormValue("total_chunks")
	filename := c.FormValue("filename")
	userId,err := jwt.ValidateJWT(c.FormValue("userId"))
	if err!=nil || userId==0{
		fmt.Println(c.FormValue("refresh_token"))
		_,userId,_=middleware.RefreshAccessToken(c.FormValue("refresh_token"))
	}
	
	log.Printf("Received data - ChunkNumber: %s, TotalChunks: %s, Filename: %s, UserIdStr: %d", 
		chunkNumber, totalChunks, filename, userId)
	
	if err != nil {
		log.Printf("ERROR: Error parsing user ID '%d': %v", userId, err)
		return c.JSON(400, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Invalid user ID: %v", err),
		})
	}

	fmt.Println("User ID:", userId)
	fmt.Println("Chunk Number:", chunkNumber)
	fmt.Println("Total Chunks:", totalChunks)
	fmt.Println("Filename:", filename)

	// Create user-specific temporary directory
	userUploadDir := filepath.Join(uploadDir, fmt.Sprintf("user_%d", userId))
	err = os.MkdirAll(userUploadDir, os.ModePerm)
	if err != nil {
		log.Printf("ERROR: Error creating user upload directory: %v", err)
		return c.JSON(500, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Error creating user upload directory: %v", err),
		})
	}

	// Process the file chunk (temporary local storage in user-specific folder)
	tempFilePath := filepath.Join(userUploadDir, fmt.Sprintf("temp_%s", filename))
	
	log.Printf("Saving chunk to temporary file: %s", tempFilePath)

	// Open the file in append mode to add chunks
	outFile, err := os.OpenFile(tempFilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Printf("ERROR: Error opening file %s: %v", tempFilePath, err)
		return c.JSON(500, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Error opening file: %v", err),
		})
	}
	defer outFile.Close()

	// Open the incoming file chunk for reading
	inFile, err := file.Open()
	if err != nil {
		log.Printf("ERROR: Error opening uploaded file: %v", err)
		return c.JSON(500, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Error opening uploaded file: %v", err),
		})
	}
	defer inFile.Close()

	// Copy the chunk to the file
	_, err = io.Copy(outFile, inFile)
	if err != nil {
		log.Printf("ERROR: Error saving file: %v", err)
		return c.JSON(500, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Error saving file: %v", err),
		})
	}
	
	log.Printf("Chunk saved successfully")

	// Check if this is the last chunk
	chunkNum, err := strconv.Atoi(chunkNumber)
	if err != nil {
		log.Printf("ERROR: Invalid chunk number '%s': %v", chunkNumber, err)
		return c.JSON(400, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Invalid chunk number: %v", err),
		})
	}
	
	totalChunkNum, err := strconv.Atoi(totalChunks)
	if err != nil {
		log.Printf("ERROR: Invalid total chunks '%s': %v", totalChunks, err)
		return c.JSON(400, map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Invalid total chunks: %v", err),
		})
	}

	var imageURL string

	// Process the complete file only when all chunks are received
	if chunkNum == totalChunkNum {
		log.Printf("All chunks received (%d/%d), processing image for user %d...", chunkNum, totalChunkNum, userId)

		// Use OpenCV for image processing
		log.Printf("Reading image from: %s", tempFilePath)
		img := gocv.IMRead(tempFilePath, gocv.IMReadColor)
		if img.Empty() {
			log.Printf("ERROR: Could not read image file: %s", tempFilePath)
			// Clean up temp file
			os.Remove(tempFilePath)
			return c.JSON(500, map[string]interface{}{
				"success": false,
				"error":   "Could not process image file",
			})
		}
		defer img.Close()
		
		log.Printf("Image loaded successfully, converting to grayscale...")

		// Convert to grayscale
		gray := gocv.NewMat()
		defer gray.Close()
		gocv.CvtColor(img, &gray, gocv.ColorBGRToGray)

		// Encode processed image to memory buffer
		processedImagePath := filepath.Join(userUploadDir, fmt.Sprintf("processed_%s", filename))
		log.Printf("Saving processed image to: %s", processedImagePath)
		
		if ok := gocv.IMWrite(processedImagePath, gray); !ok {
			log.Printf("ERROR: Could not save processed image to: %s", processedImagePath)
			os.Remove(tempFilePath)
			return c.JSON(500, map[string]interface{}{
				"success": false,
				"error":   "Could not save processed image",
			})
		}
		
		log.Printf("Processed image saved successfully")

		// Read processed image data
		log.Printf("Reading processed image data from: %s", processedImagePath)
		processedImageData, err := os.ReadFile(processedImagePath)
		if err != nil {
			log.Printf("ERROR: Error reading processed image: %v", err)
			os.Remove(tempFilePath)
			os.Remove(processedImagePath)
			return c.JSON(500, map[string]interface{}{
				"success": false,
				"error":   fmt.Sprintf("Could not read processed image: %v", err),
			})
		}
		
		log.Printf("Processed image data read successfully, size: %d bytes", len(processedImageData))

		// Upload to MinIO with user-specific folder
		log.Printf("Uploading to MinIO for user %d...", userId)
		imageURL, err = minioClient.uploadProcessedImage(processedImageData, filename, userId)
		if err != nil {
			log.Printf("ERROR: Error uploading to MinIO: %v", err)
			os.Remove(tempFilePath)
			os.Remove(processedImagePath)
			return c.JSON(500, map[string]interface{}{
				"success": false,
				"error":   fmt.Sprintf("Error uploading to MinIO: %v", err),
			})
		}

		log.Printf("Image uploaded to MinIO successfully: %s", imageURL)

		// Store file metadata in database with MinIO URL
		log.Printf("Storing file metadata in database...")
		query := "INSERT INTO file_metadata (user_id, file_name, image_url, upload_date) VALUES ($1, $2, $3, $4)"
		_, err = db.DB.Exec(c.Request().Context(), query, userId, filename, imageURL, time.Now())
		if err != nil {
			log.Printf("ERROR: Error storing file metadata: %v", err)
			// Don't return error here as the file is already uploaded to MinIO
		} else {
			log.Printf("File metadata uploaded to database successfully")
		}

		// Clean up temporary files
		log.Printf("Cleaning up temporary files...")
		if err := os.Remove(tempFilePath); err != nil {
			log.Printf("Warning: Could not remove temp file %s: %v", tempFilePath, err)
		}
		if err := os.Remove(processedImagePath); err != nil {
			log.Printf("Warning: Could not remove processed file %s: %v", processedImagePath, err)
		}
		
		log.Printf("Upload process completed successfully for user %d!", userId)

		// Return success response with image URL
		return c.JSON(200, map[string]interface{}{
			"success":   true,
			"message":   "File uploaded and processed successfully",
			"image_url": imageURL,
			"user_id":   userId,
			"chunk":     fmt.Sprintf("%s/%s", chunkNumber, totalChunks),
		})
	}

	// For intermediate chunks, just return success
	log.Printf("Chunk %s/%s uploaded successfully for user %d", chunkNumber, totalChunks, userId)
	return c.JSON(200, map[string]interface{}{
		"success": true,
		"message": fmt.Sprintf("Chunk %s/%s uploaded successfully", chunkNumber, totalChunks),
		"user_id": userId,
		"chunk":   fmt.Sprintf("%s/%s", chunkNumber, totalChunks),
	})
}
