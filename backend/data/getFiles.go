package data

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"time"
	"net/url"
	"strings"
	"github.com/Aneesh-Hegde/expenseManager/db"
	files "github.com/Aneesh-Hegde/expenseManager/grpc_file"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

// Add MinIO client variable (should be initialized elsewhere in your app)
var minioClient *minio.Client

// File struct to include both filename and pre-signed URL
type FileWithURL struct {
	Filename string `json:"filename"`
	ImageURL string `json:"image_url"`
}

// IMPROVED: Get files from file_metadata table instead of products table
func getFilesFromDBWithURLs(ctx context.Context, userId int) (*files.FileList, error) {
	// Updated query to use file_metadata table and include stored image_url
	query := `SELECT file_id, file_name, image_url FROM file_metadata WHERE user_id = $1 ORDER BY upload_date DESC`
	rows, err := db.DB.Query(ctx, query, userId)
	if err != nil {
		log.Printf("Error fetching files from DB for user %d: %v", userId, err)
		return nil, err
	}
	defer rows.Close()

	var fileList files.FileList
	bucketName := "test" // Replace with your actual bucket name
	
	for rows.Next() {
		var fileId int
		var fileName string
		var storedImageURL *string // Allow NULL values
		
		if err := rows.Scan(&fileId, &fileName, &storedImageURL); err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		var imageURL string
		
		// If we have a stored URL, try to generate a fresh pre-signed URL
		if storedImageURL != nil && *storedImageURL != "" {
			// Extract object key from stored URL or construct it
			objectKey := fmt.Sprintf("upload/user_%d/processed_%s", userId, fileName)
			
			// Generate fresh pre-signed URL (valid for 24 hours)
			presignedURL, err := generatePresignedURL(bucketName, objectKey, 24*time.Hour)
			if err != nil {
				log.Printf("Error generating pre-signed URL for %s: %v", fileName, err)
				// Fall back to stored URL if pre-signed generation fails
				imageURL = *storedImageURL
			} else {
				imageURL = presignedURL
			}
		} else {
			// If no stored URL, try to generate one from expected path
			objectKey := fmt.Sprintf("upload/user_%d/processed_%s", userId, fileName)
			presignedURL, err := generatePresignedURL(bucketName, objectKey, 24*time.Hour)
			if err != nil {
				log.Printf("No URL available for file %s: %v", fileName, err)
				imageURL = "" // Empty URL if file not found
			} else {
				imageURL = presignedURL
			}
		}

		fileList.Allfiles = append(fileList.Allfiles, &files.File{
			Filename: fileName,
			ImageUrl: imageURL,
		})
	}

	log.Printf("Retrieved %d files for user %d", len(fileList.Allfiles), userId)
	return &fileList, nil
}

// IMPROVED: Enhanced pre-signed URL generation with better error handling
func generatePresignedURL(bucketName, objectKey string, expiry time.Duration) (string, error) {
	if minioClient == nil {
		return "", fmt.Errorf("MinIO client not initialized")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if object exists
	_, err := minioClient.StatObject(ctx, bucketName, objectKey, minio.StatObjectOptions{})
	if err != nil {
		log.Printf("Object %s not found in bucket %s: %v", objectKey, bucketName, err)
		return "", fmt.Errorf("image not found: %s", objectKey)
	}

	// Generate pre-signed URL for GET operation
	reqParams := make(url.Values)
	// Add cache control headers
	reqParams.Set("response-cache-control", "max-age=3600")
	
	presignedURL, err := minioClient.PresignedGetObject(ctx, bucketName, objectKey, expiry, reqParams)
	if err != nil {
		return "", fmt.Errorf("error generating pre-signed URL: %v", err)
	}

	return presignedURL.String(), nil
}

// IMPROVED: Generate pre-signed URL with better content type detection
func generatePresignedURLWithHeaders(bucketName, objectKey string, expiry time.Duration) (string, error) {
	if minioClient == nil {
		return "", fmt.Errorf("MinIO client not initialized")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if object exists and get its info
	objInfo, err := minioClient.StatObject(ctx, bucketName, objectKey, minio.StatObjectOptions{})
	if err != nil {
		return "", fmt.Errorf("object not found: %v", err)
	}

	// Set appropriate headers based on content type
	reqParams := make(url.Values)
	reqParams.Set("response-content-type", objInfo.ContentType)
	reqParams.Set("response-content-disposition", "inline") // Display in browser
	reqParams.Set("response-cache-control", "max-age=3600, public")

	presignedURL, err := minioClient.PresignedGetObject(ctx, bucketName, objectKey, expiry, reqParams)
	if err != nil {
		return "", fmt.Errorf("error generating pre-signed URL: %v", err)
	}

	return presignedURL.String(), nil
}

// IMPROVED: Enhanced gRPC function with better error handling
func GetFiles(ctx context.Context, req *files.GetFileByUser) (*files.FileList, error) {
	// Extract user_id from context (set by interceptor)
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, fmt.Errorf("metadata not found in context")
	}
	
	userIdStr := md.Get("user_id")
	if len(userIdStr) == 0 {
		return nil, fmt.Errorf("user ID not found in context")
	}
	
	userId, err := strconv.Atoi(userIdStr[0])
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %v", err)
	}
	
	// Forward access token if present
	accessToken := md.Get("token")
	if len(accessToken) > 0 {
		headers := metadata.Pairs("token", accessToken[0])
		grpc.SendHeader(ctx, headers)
	}
	
	log.Printf("Fetching files for user ID: %d", userId)
	return getFilesFromDBWithURLs(ctx, userId)
}

// IMPROVED: Better initialization with configuration validation
func InitMinIOForFiles(endpoint, accessKeyID, secretAccessKey string, useSSL bool) error {
	log.Printf("Initializing MinIO client for files - Endpoint: %s, SSL: %v", endpoint, useSSL)
	
	var err error
	minioClient, err = minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKeyID, secretAccessKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return fmt.Errorf("failed to initialize MinIO client: %v", err)
	}
	
	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	buckets, err := minioClient.ListBuckets(ctx)
	if err != nil {
		return fmt.Errorf("failed to test MinIO connection: %v", err)
	}
	
	log.Printf("MinIO client initialized successfully. Found %d buckets", len(buckets))
	return nil
}

// NEW: Function to update image URL in database
func UpdateImageURLInDB(ctx context.Context, userId int, fileName, imageURL string) error {
	query := `UPDATE file_metadata SET image_url = $1 WHERE user_id = $2 AND file_name = $3`
	result, err := db.DB.Exec(ctx, query, imageURL, userId, fileName)
	if err != nil {
		return fmt.Errorf("failed to update image URL: %v", err)
	}
	
	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("no rows updated - file not found")
	}
	
	log.Printf("Updated image URL for user %d, file %s", userId, fileName)
	return nil
}

// NEW: Function to clean up orphaned files
func CleanupOrphanedFiles(ctx context.Context, userId int) error {
	if minioClient == nil {
		return fmt.Errorf("MinIO client not initialized")
	}
	
	// Get all files from database
	query := `SELECT file_name FROM file_metadata WHERE user_id = $1`
	rows, err := db.DB.Query(ctx, query, userId)
	if err != nil {
		return fmt.Errorf("failed to query database: %v", err)
	}
	defer rows.Close()
	
	var dbFiles []string
	for rows.Next() {
		var fileName string
		if err := rows.Scan(&fileName); err != nil {
			continue
		}
		dbFiles = append(dbFiles, fileName)
	}
	
	// List files in MinIO
	bucketName := "test"
	prefix := fmt.Sprintf("upload/user_%d/", userId)
	
	objectCh := minioClient.ListObjects(ctx, bucketName, minio.ListObjectsOptions{
		Prefix:    prefix,
		Recursive: true,
	})
	
	var orphanedFiles []string
	for object := range objectCh {
		if object.Err != nil {
			log.Printf("Error listing objects: %v", object.Err)
			continue
		}
		
		// Extract filename from object key
		// Expected format: upload/user_1/processed_filename.jpg
		parts := strings.Split(object.Key, "/")
		if len(parts) >= 3 {
			minioFileName := strings.TrimPrefix(parts[2], "processed_")
			
			// Check if this file exists in database
			found := false
			for _, dbFile := range dbFiles {
				if dbFile == minioFileName {
					found = true
					break
				}
			}
			
			if !found {
				orphanedFiles = append(orphanedFiles, object.Key)
			}
		}
	}
	
	// Delete orphaned files
	for _, objectKey := range orphanedFiles {
		err := minioClient.RemoveObject(ctx, bucketName, objectKey, minio.RemoveObjectOptions{})
		if err != nil {
			log.Printf("Failed to delete orphaned file %s: %v", objectKey, err)
		} else {
			log.Printf("Deleted orphaned file: %s", objectKey)
		}
	}
	
	log.Printf("Cleanup completed for user %d. Removed %d orphaned files", userId, len(orphanedFiles))
	return nil
}
