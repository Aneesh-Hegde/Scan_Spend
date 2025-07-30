package utils

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	pb "github.com/Aneesh-Hegde/expenseManager/grpc"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/Aneesh-Hegde/expenseManager/services/file/utils"
	"github.com/Aneesh-Hegde/expenseManager/states"
	"github.com/minio/minio-go/v7"
	"github.com/otiai10/gosseract/v2"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

var minioClient *utils.MinIOClient

// DownloadImageFromMinIO downloads an image from MinIO to local temp directory for OCR processing
// Now supports user-based folder structure
func DownloadImageFromMinIO(filename string, userId int) (string, error) {
	if minioClient == nil {
		return "", fmt.Errorf("MinIO Client not initialized")
	}

	ctx := context.Background()

	// Create user-specific temp directory if it doesn't exist
	tempDir := filepath.Join("temp_ocr", fmt.Sprintf("user_%d", userId))
	err := os.MkdirAll(tempDir, os.ModePerm)
	if err != nil {
		return "", fmt.Errorf("failed to create temp directory: %w", err)
	}

	// Construct object name with user-based folder structure
	objectName := fmt.Sprintf("%s/user_%d/%s", minioClient.FolderPath, userId, filename)

	// Local file path for temporary storage
	localFilePath := filepath.Join(tempDir, filename)

	fmt.Printf("Downloading from MinIO: %s to %s\n", objectName, localFilePath)

	// Download object from MinIO
	err = minioClient.Client.FGetObject(ctx, minioClient.BucketName, objectName, localFilePath, minio.GetObjectOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to download image from MinIO: %w", err)
	}

	return localFilePath, nil
}

// FindImageInMinIO tries to find the image file by searching for different variations of the filename
// Now searches within user-specific folder
func FindImageInMinIO(baseFilename string, userId int) (string, error) {
	fmt.Println(minioClient)
	if minioClient == nil {
		return "", fmt.Errorf("MinIO Client not initialized")
	}

	ctx := context.Background()

	fmt.Printf("Searching for image in MinIO with base filename: %s for user: %d\n", baseFilename, userId)

	// Search within user-specific folder
	userFolderPrefix := fmt.Sprintf("%s/user_%d/", minioClient.FolderPath, userId)
	fmt.Printf("Searching in bucket: %s, user folder: %s\n", minioClient.BucketName, userFolderPrefix)

	// List objects in the user's upload folder
	objectCh := minioClient.Client.ListObjects(ctx, minioClient.BucketName, minio.ListObjectsOptions{
		Prefix:    userFolderPrefix,
		Recursive: true,
	})

	// Common image extensions (both cases)
	extensions := []string{".jpg", ".jpeg", ".png", ".gif", ".webp", ".JPG", ".JPEG", ".PNG", ".GIF", ".WEBP"}

	// Remove extension from base filename for comparison
	baseNameWithoutExt := strings.TrimSuffix(baseFilename, filepath.Ext(baseFilename))
	fmt.Printf("Base filename without extension: %s\n", baseNameWithoutExt)

	var foundObjects []string

	for object := range objectCh {
		if object.Err != nil {
			fmt.Printf("Error listing object: %v\n", object.Err)
			continue
		}

		foundObjects = append(foundObjects, object.Key)

		// Get just the filename from the full object key
		objectFilename := filepath.Base(object.Key)
		fmt.Printf("Checking object: %s (filename: %s)\n", object.Key, objectFilename)

		// Check for exact match first
		if objectFilename == baseFilename {
			fmt.Printf("Found exact match: %s\n", objectFilename)
			return objectFilename, nil
		}

		// Check if it starts with the base filename (for unique ID appended files)
		// This handles cases like: basefilename_uniqueid.extension
		if strings.HasPrefix(objectFilename, baseNameWithoutExt+"_") {
			// Check if it has a valid image extension
			objectExt := strings.ToLower(filepath.Ext(objectFilename))
			for _, ext := range extensions {
				if objectExt == strings.ToLower(ext) {
					fmt.Printf("Found pattern match: %s\n", objectFilename)
					return objectFilename, nil
				}
			}
		}

		// Additional check: try with different extensions
		for _, ext := range extensions {
			if objectFilename == baseNameWithoutExt+ext {
				fmt.Printf("Found extension match: %s\n", objectFilename)
				return objectFilename, nil
			}
		}
	}

	fmt.Printf("Available objects in user folder: %v\n", foundObjects)
	return "", fmt.Errorf("image file not found in MinIO for filename: %s, user: %d", baseFilename, userId)
}

// Helper function to get user ID from metadata
func getUserIDFromMetadata(md metadata.MD) (int, error) {
	if len(md["user_id"]) == 0 {
		return 0, fmt.Errorf("user_id not found in metadata")
	}

	userID, err := strconv.Atoi(md["user_id"][0])
	if err != nil {
		return 0, fmt.Errorf("invalid user_id in metadata: %w", err)
	}

	return userID, nil
}

func GetText(ctx context.Context, req *pb.GetTextRequest) (*pb.GetTextResponse, error) {
	filename := req.GetFilename()
	fmt.Printf("=== GetText called for filename: %s ===\n", filename)

	md, _ := metadata.FromIncomingContext(ctx)
	fmt.Printf("Metadata received: %+v\n", md)

	// Get user ID from metadata
	userID, err := getUserIDFromMetadata(md)
	if err != nil {
		return nil, fmt.Errorf("failed to get user ID: %w", err)
	}

	fmt.Printf("Processing request for user ID: %d\n", userID)

	accessToken := md.Get("token")
	if len(accessToken) > 0 {
		header := metadata.Pairs("accessToken", accessToken[0])
		grpc.SendHeader(ctx, header)
	}

	// Check if product data is already cached in Redis (user-specific)
	cachedProducts, err := redis.GetCachedProductData(userID, filename)
	if err == nil && cachedProducts != nil {
		fmt.Printf("Found cached data for user %d, filename: %s\n", userID, filename)
		var grpcProducts []*pb.Product
		for _, product := range cachedProducts {
			grpcProducts = append(grpcProducts, &pb.Product{
				Id:          product.ID,
				ProductName: product.ProductName,
				Quantity:    float32(product.Quantity),
				Amount:      float32(product.Amount),
				Date:        product.Date,
				Category:    product.Category,
			})
		}
		total := calculateTotal(cachedProducts)
		return &pb.GetTextResponse{
			Products: grpcProducts,
			Total:    strconv.FormatFloat(total, 'f', 2, 64),
		}, nil
	}

	// Check database for existing product data
	productFromDB, err := GetFileProduct(ctx, filename, md["user_id"][0])
	if err == nil && productFromDB != nil {
		fmt.Printf("Found existing data in database for user %d, filename: %s\n", userID, filename)
		return productFromDB, nil
	}
	if err != nil {
		// Check if it's just "no data found" or an actual error
		if strings.Contains(strings.ToLower(err.Error()), "no data found") ||
			strings.Contains(strings.ToLower(err.Error()), "not found") ||
			strings.Contains(strings.ToLower(err.Error()), "no rows") {
			fmt.Printf("No existing data found in database for user %d, filename: %s (proceeding with OCR)\n", userID, filename)
		} else {
			fmt.Printf("Database lookup error for user %d, filename %s: %v\n", userID, filename, err)
		}
	}

	// Try to find the actual image file in MinIO (user-specific)
	actualFilename, err := FindImageInMinIO(filename, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to find image in MinIO for user %d: %w", userID, err)
	}

	fmt.Printf("Found image in MinIO for user %d: %s\n", userID, actualFilename)

	// Download image from MinIO to local temp directory (user-specific)
	localImagePath, err := DownloadImageFromMinIO(actualFilename, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to download image from MinIO for user %d: %w", userID, err)
	}

	// Ensure cleanup of temporary file
	defer func() {
		if err := os.Remove(localImagePath); err != nil {
			fmt.Printf("Warning: Failed to cleanup temp file %s: %v\n", localImagePath, err)
		}
		// Also try to cleanup the user-specific temp directory if it's empty
		userTempDir := filepath.Dir(localImagePath)
		if err := os.Remove(userTempDir); err != nil {
			// This is expected to fail if directory is not empty, so we don't log it
		}
	}()

	fmt.Printf("Downloaded image to: %s\n", localImagePath)

	// OCR to extract text from the image
	Client := gosseract.NewClient()
	defer Client.Close()

	// Set language for better OCR accuracy (optional)
	Client.SetLanguage("eng")

	err = Client.SetImage(localImagePath)
	if err != nil {
		return nil, fmt.Errorf("failed to set image for OCR: %w", err)
	}

	text, err := Client.Text()
	if err != nil {
		return nil, fmt.Errorf("failed to extract text from image: %w", err)
	}

	fmt.Printf("Extracted text: %s\n", text)

	// Extract product data from text
	extractedData, err := ExtractProductDataFromText(text)
	if err != nil {
		return nil, fmt.Errorf("failed to extract product data from text: %w", err)
	}

	fmt.Printf("Extracted products: %+v\n", extractedData)

	// Process extracted data
	var products []states.Product
	total := 0.0
	for i, product := range extractedData {
		product.ID = strconv.Itoa(i + 1)
		product.FileName = filename
		if product.Date == "" {
			product.Date = time.Now().Format("2006-01-02")
		}
		total += product.Quantity * product.Amount
		products = append(products, product)
	}

	// Cache the product data (user-specific)
	err = redis.CacheProductData(userID, filename, products)
	if err != nil {
		fmt.Printf("Warning: Failed to cache product data for user %d: %v\n", userID, err)
	} else {
		fmt.Printf("Successfully cached product data for user %d, filename: %s\n", userID, filename)
	}

	// Store the extracted product data in the database
	// Uncomment when ready to use database storage
	// err = db.StoreProductData(userID, filename, products)
	// if err != nil {
	// 	fmt.Printf("Warning: Failed to store product data in database for user %d: %v\n", userID, err)
	// }

	// Prepare gRPC response
	var grpcProducts []*pb.Product
	for _, product := range products {
		grpcProducts = append(grpcProducts, &pb.Product{
			Id:          product.ID,
			ProductName: product.ProductName,
			Quantity:    float32(product.Quantity),
			Amount:      float32(product.Amount),
			Name:        filename,
			Date:        product.Date,
			Category:    product.Category,
		})
	}

	return &pb.GetTextResponse{
		Products: grpcProducts,
		Total:    strconv.FormatFloat(total, 'f', 2, 64),
	}, nil
}

func calculateTotal(products []states.Product) float64 {
	total := 0.0
	for _, product := range products {
		total += product.Quantity * product.Amount
	}
	return total
}
