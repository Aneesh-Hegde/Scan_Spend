package data

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"strconv"
	"strings"
	"time"

	files "github.com/Aneesh-Hegde/expenseManager/grpc_file"
	fileDB "github.com/Aneesh-Hegde/expenseManager/services/file/db"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

var minioClient *minio.Client

type FileWithURL struct {
	Filename string `json:"filename"`
	ImageURL string `json:"image_url"`
}

func getFilesFromDBWithURLs(ctx context.Context, userId int) (*files.FileList, error) {
	fileResults, err := fileDB.GetFilesWithURLs(ctx, strconv.Itoa(userId))
	if err != nil {
		log.Printf("Error fetching files from DB for user %d: %v", userId, err)
		return nil, err
	}

	var fileList files.FileList
	bucketName := "test"

	for _, result := range fileResults {
		var imageURL string

		if result.ImageURL != nil && *result.ImageURL != "" {
			objectKey := fmt.Sprintf("upload/user_%d/processed_%s", userId, result.FileName)
			presignedURL, err := generatePresignedURL(bucketName, objectKey, 24*time.Hour)
			if err != nil {
				log.Printf("Error generating pre-signed URL for %s: %v", result.FileName, err)
				imageURL = *result.ImageURL
			} else {
				imageURL = presignedURL
			}
		} else {
			objectKey := fmt.Sprintf("upload/user_%d/processed_%s", userId, result.FileName)
			presignedURL, err := generatePresignedURL(bucketName, objectKey, 24*time.Hour)
			if err != nil {
				log.Printf("No URL available for file %s: %v", result.FileName, err)
				imageURL = ""
			} else {
				imageURL = presignedURL
			}
		}

		fileList.Allfiles = append(fileList.Allfiles, &files.File{
			Filename: result.FileName,
			ImageUrl: imageURL,
		})
	}

	log.Printf("Retrieved %d files for user %d", len(fileList.Allfiles), userId)
	return &fileList, nil
}

func generatePresignedURL(bucketName, objectKey string, expiry time.Duration) (string, error) {
	if minioClient == nil {
		return "", fmt.Errorf("MinIO client not initialized")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err := minioClient.StatObject(ctx, bucketName, objectKey, minio.StatObjectOptions{})
	if err != nil {
		log.Printf("Object %s not found in bucket %s: %v", objectKey, bucketName, err)
		return "", fmt.Errorf("image not found: %s", objectKey)
	}

	reqParams := make(url.Values)
	reqParams.Set("response-cache-control", "max-age=3600")

	presignedURL, err := minioClient.PresignedGetObject(ctx, bucketName, objectKey, expiry, reqParams)
	if err != nil {
		return "", fmt.Errorf("error generating pre-signed URL: %v", err)
	}

	return presignedURL.String(), nil
}

func generatePresignedURLWithHeaders(bucketName, objectKey string, expiry time.Duration) (string, error) {
	if minioClient == nil {
		return "", fmt.Errorf("MinIO client not initialized")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	objInfo, err := minioClient.StatObject(ctx, bucketName, objectKey, minio.StatObjectOptions{})
	if err != nil {
		return "", fmt.Errorf("object not found: %v", err)
	}

	reqParams := make(url.Values)
	reqParams.Set("response-content-type", objInfo.ContentType)
	reqParams.Set("response-content-disposition", "inline")
	reqParams.Set("response-cache-control", "max-age=3600, public")

	presignedURL, err := minioClient.PresignedGetObject(ctx, bucketName, objectKey, expiry, reqParams)
	if err != nil {
		return "", fmt.Errorf("error generating pre-signed URL: %v", err)
	}

	return presignedURL.String(), nil
}

func GetFiles(ctx context.Context, req *files.GetFileByUser) (*files.FileList, error) {
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

	accessToken := md.Get("token")
	if len(accessToken) > 0 {
		headers := metadata.Pairs("token", accessToken[0])
		grpc.SendHeader(ctx, headers)
	}

	log.Printf("Fetching files for user ID: %d", userId)
	return getFilesFromDBWithURLs(ctx, userId)
}

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

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	buckets, err := minioClient.ListBuckets(ctx)
	if err != nil {
		return fmt.Errorf("failed to test MinIO connection: %v", err)
	}

	log.Printf("MinIO client initialized successfully. Found %d buckets", len(buckets))
	return nil
}

func UpdateImageURLInDB(ctx context.Context, userId int, fileName, imageURL string) error {
	return fileDB.UpdateImageURL(ctx, strconv.Itoa(userId), fileName, imageURL)
}

func CleanupOrphanedFiles(ctx context.Context, userId int) error {
	if minioClient == nil {
		return fmt.Errorf("MinIO client not initialized")
	}

	dbFiles, err := fileDB.GetAllFileNames(ctx, strconv.Itoa(userId))
	if err != nil {
		return fmt.Errorf("failed to query database: %v", err)
	}

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

		parts := strings.Split(object.Key, "/")
		if len(parts) >= 3 {
			minioFileName := strings.TrimPrefix(parts[2], "processed_")
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
