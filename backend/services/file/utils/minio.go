package utils

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	sharedDB "github.com/Aneesh-Hegde/expenseManager/shared/db"
	pb "github.com/Aneesh-Hegde/expenseManager/grpc_file"
	"github.com/google/uuid"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"gocv.io/x/gocv"
)

type MinIOClient struct {
	Client     *minio.Client
	BucketName string
	FolderPath string
	Endpoint   string
}

// FileServiceServer implements the gRPC FileService.
type FileServiceServer struct {
	minioClient   *MinIOClient
	tempUploadDir string
	uploadStates  map[string]*fileUploadState
	mu            sync.Mutex
}

type fileUploadState struct {
	filePath       string
	totalChunks    int
	receivedChunks map[int]bool
}

var MinIOClientInstance *MinIOClient

// InitMinIO initializes the MinIO client.
func InitMinIO() error {
	log.Print("Initializing MinIO client...")
	
	endpoint := "localhost:9000"
	accessKey := "minioadmin"
	secretKey := "minioadmin"
	BucketName := "test"
	folderPath := "upload"

	log.Printf("MinIO config - Endpoint: %s, Bucket: %s, Folder: %s", endpoint, BucketName, folderPath)

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: false,
	})
	if err != nil {
		log.Printf("ERROR: Failed to create MinIO client: %v", err)
		return fmt.Errorf("failed to create MinIO client: %v", err)
	}

	MinIOClientInstance = &MinIOClient{
		Client:     client,
		BucketName: BucketName,
		FolderPath: folderPath,
		Endpoint:   endpoint,
	}

	log.Print("Testing MinIO connection...")
	err = MinIOClientInstance.createBucketIfNotExists()
	if err != nil {
		log.Printf("ERROR: Failed to create/check Bucket: %v", err)
		return fmt.Errorf("failed to create/check Bucket: %v", err)
	}

	log.Print("MinIO client initialized successfully!")
	return nil
}

// NewFileServiceServer creates a new instance of the FileServiceServer.
func NewFileServiceServer() *FileServiceServer {
	if MinIOClientInstance == nil {
		log.Fatalf("MinIO client not initialized. Call InitMinIO() first.")
	}

	uploadDir := "uploads_temp"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		log.Fatalf("Failed to create base temporary upload directory %s: %v", uploadDir, err)
	}

	return &FileServiceServer{
		minioClient:   MinIOClientInstance,
		tempUploadDir: uploadDir,
		uploadStates:  make(map[string]*fileUploadState),
	}
}

func (m *MinIOClient) createBucketIfNotExists() error {
	ctx := context.Background()
	log.Printf("Checking if Bucket '%s' exists...", m.BucketName)

	exists, err := m.Client.BucketExists(ctx, m.BucketName)
	if err != nil {
		log.Printf("ERROR: Failed to check Bucket existence: %v", err)
		return fmt.Errorf("failed to check Bucket existence: %v", err)
	}

	if !exists {
		log.Printf("Bucket '%s' doesn't exist, creating...", m.BucketName)
		err = m.Client.MakeBucket(ctx, m.BucketName, minio.MakeBucketOptions{})
		if err != nil {
			log.Printf("ERROR: Failed to create Bucket: %v", err)
			return fmt.Errorf("failed to create Bucket: %v", err)
		}
		log.Printf("Bucket '%s' created successfully", m.BucketName)

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
		}`, m.BucketName)

		err = m.Client.SetBucketPolicy(ctx, m.BucketName, policy)
		if err != nil {
			log.Printf("Warning: Could not set Bucket policy: %v", err)
		} else {
			log.Print("Bucket policy set successfully")
		}
	} else {
		log.Printf("Bucket '%s' already exists", m.BucketName)
	}
	return nil
}

func (m *MinIOClient) uploadProcessedImage(imageData []byte, filename string, userId int64) (string, error) {
	ctx := context.Background()

	ext := filepath.Ext(filename)
	uniqueFilename := fmt.Sprintf("%s_%s%s",
		strings.TrimSuffix(filename, ext),
		uuid.New().String()[:8],
		ext)
	
	objectName := fmt.Sprintf("%s/user_%d/%s", m.FolderPath, userId, uniqueFilename)

	log.Printf("Uploading to MinIO - Object: %s", objectName)

	reader := bytes.NewReader(imageData)
	_, err := m.Client.PutObject(ctx, m.BucketName, objectName, reader, int64(len(imageData)), minio.PutObjectOptions{
		ContentType: getContentType(ext),
	})
	if err != nil {
		log.Printf("ERROR: Failed to upload to MinIO: %v", err)
		return "", err
	}

	imageURL := fmt.Sprintf("http://%s/%s/%s", m.Endpoint, m.BucketName, objectName)
	log.Printf("Image uploaded successfully to user folder: %s", imageURL)
	return imageURL, nil
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

// UploadFile implements the gRPC UploadFile method.
func (s *FileServiceServer) UploadFile(ctx context.Context, req *pb.UploadFileRequest) (*pb.UploadFileResponse, error) {
	log.Print("FileServiceServer: Received UploadFile request.")

	userId := req.UserId
	filename := req.Filename
	chunkNumber := int(req.ChunkNumber)
	totalChunks := int(req.TotalChunks)
	chunkData := req.ChunkData

	log.Printf("Received data - ChunkNumber: %d, TotalChunks: %d, Filename: %s, UserId: %d",
		chunkNumber, totalChunks, filename, userId)

	fileKey := fmt.Sprintf("%s_%d", filename, userId)
	
	s.mu.Lock()
	state, exists := s.uploadStates[fileKey]
	if !exists {
		userUploadDir := filepath.Join(s.tempUploadDir, fmt.Sprintf("user_%d", userId))
		if err := os.MkdirAll(userUploadDir, os.ModePerm); err != nil {
			s.mu.Unlock()
			log.Printf("ERROR: Error creating user upload directory %s: %v", userUploadDir, err)
			return &pb.UploadFileResponse{
				Success: false,
				Message: fmt.Sprintf("Error creating user upload directory: %v", err),
			}, nil
		}
		state = &fileUploadState{
			filePath:       filepath.Join(userUploadDir, fmt.Sprintf("temp_%s", filename)),
			totalChunks:    totalChunks,
			receivedChunks: make(map[int]bool),
		}
		s.uploadStates[fileKey] = state
	}
	s.mu.Unlock()

	outFile, err := os.OpenFile(state.filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Printf("ERROR: Error opening temporary file %s: %v", state.filePath, err)
		return &pb.UploadFileResponse{
			Success: false,
			Message: fmt.Sprintf("Error opening temporary file: %v", err),
		}, nil
	}
	defer outFile.Close()

	_, err = outFile.Write(chunkData)
	if err != nil {
		log.Printf("ERROR: Error writing chunk data to file %s: %v", state.filePath, err)
		return &pb.UploadFileResponse{
			Success: false,
			Message: fmt.Sprintf("Error writing chunk data: %v", err),
		}, nil
	}
	
	s.mu.Lock()
	state.receivedChunks[chunkNumber] = true
	s.mu.Unlock()

	log.Printf("Chunk %d/%d for user %d saved to temporary file.", chunkNumber, totalChunks, userId)

	allChunksReceived := false
	s.mu.Lock()
	if len(state.receivedChunks) == state.totalChunks {
		allChunksReceived = true
		delete(s.uploadStates, fileKey)
	}
	s.mu.Unlock()

	var imageURL string
	if allChunksReceived {
		log.Printf("All chunks received for %s (user %d), processing image...", filename, userId)

		img := gocv.IMRead(state.filePath, gocv.IMReadColor)
		if img.Empty() {
			log.Printf("ERROR: Could not read image file from temporary path: %s", state.filePath)
			os.Remove(state.filePath)
			return &pb.UploadFileResponse{
				Success: false,
				Message: "Could not process image file",
			}, nil
		}
		defer img.Close()
		
		log.Printf("Image loaded successfully, converting to grayscale...")

		gray := gocv.NewMat()
		defer gray.Close()
		gocv.CvtColor(img, &gray, gocv.ColorBGRToGray)

		processedImagePath := filepath.Join(filepath.Dir(state.filePath), fmt.Sprintf("processed_%s", filename))
		if ok := gocv.IMWrite(processedImagePath, gray); !ok {
			log.Printf("ERROR: Could not save processed image to: %s", processedImagePath)
			os.Remove(state.filePath)
			return &pb.UploadFileResponse{
				Success: false,
				Message: "Could not save processed image",
			}, nil
		}
		
		log.Printf("Processed image saved successfully")

		processedImageData, err := os.ReadFile(processedImagePath)
		if err != nil {
			log.Printf("ERROR: Error reading processed image: %v", err)
			os.Remove(state.filePath)
			os.Remove(processedImagePath)
			return &pb.UploadFileResponse{
				Success: false,
				Message: fmt.Sprintf("Could not read processed image: %v", err),
			}, nil
		}
		
		log.Printf("Processed image data read successfully, size: %d bytes", len(processedImageData))

		imageURL, err = s.minioClient.uploadProcessedImage(processedImageData, filename, userId)
		if err != nil {
			log.Printf("ERROR: Error uploading to MinIO: %v", err)
			os.Remove(state.filePath)
			os.Remove(processedImagePath)
			return &pb.UploadFileResponse{
				Success: false,
				Message: fmt.Sprintf("Error uploading to MinIO: %v", err),
			}, nil
		}

		log.Printf("Image uploaded to MinIO successfully: %s", imageURL)

		fmt.Println("Database: ",sharedDB.GetDB())
		query := "INSERT INTO file_management_service.file_metadata (user_id, file_name, image_url, upload_date) VALUES ($1, $2, $3, $4)"
		_, err =sharedDB.GetDB().Query(context.Background(), query, userId, filename, imageURL, time.Now())
		if err != nil {
			log.Printf("ERROR: Error storing file metadata: %v", err)
		} else {
			log.Printf("File metadata uploaded to database successfully")
		}

		log.Printf("Cleaning up temporary files...")
		if err := os.Remove(state.filePath); err != nil {
			log.Printf("Warning: Could not remove temp file %s: %v", state.filePath, err)
		}
		if err := os.Remove(processedImagePath); err != nil {
			log.Printf("Warning: Could not remove processed file %s: %v", processedImagePath, err)
		}
		
		log.Printf("Upload process completed successfully for user %d!", userId)

		return &pb.UploadFileResponse{
			Success:     true,
			Message:     "File uploaded and processed successfully",
			ImageUrl:    imageURL,
			UserId:      userId,
			ChunkStatus: fmt.Sprintf("%d/%d", chunkNumber, totalChunks),
		}, nil

	}

	log.Printf("Chunk %d/%d uploaded successfully for user %d", chunkNumber, totalChunks, userId)
	return &pb.UploadFileResponse{
		Success:     true,
		Message:     fmt.Sprintf("Chunk %d/%d uploaded successfully", chunkNumber, totalChunks),
		UserId:      userId,
		ChunkStatus: fmt.Sprintf("%d/%d", chunkNumber, totalChunks),
	}, nil
}
