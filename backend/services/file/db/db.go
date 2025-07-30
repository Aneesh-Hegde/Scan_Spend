package db

import (
	"context"
	"fmt"
	sharedDB "github.com/Aneesh-Hegde/expenseManager/shared/db"
	"strconv"
	"time"
)

type FileMetadata struct {
	FileID     int32
	FileName   string
	ImageURL   *string
	UploadDate time.Time
	UserID     int32
}

type ProductResult struct {
	ProductID    int32
	ProductName  string
	Quantity     int32
	Price        float64
	FileName     string
	DateAdded    time.Time
	CategoryID   int32
	CategoryName string
}

func parseUserID(userID string) (int32, error) {
	id, err := strconv.ParseInt(userID, 10, 32)
	if err != nil {
		return 0, fmt.Errorf("invalid user ID: %v", err)
	}
	return int32(id), nil
}

func GetFilesWithURLs(ctx context.Context, userID string) ([]FileMetadata, error) {
	userIDInt, err := parseUserID(userID)
	if err != nil {
		return nil, err
	}

	rows, err := sharedDB.GetDB().Query(ctx, `
        SELECT file_id, file_name, image_url, upload_date, user_id 
        FROM file_management_service.file_metadata 
        WHERE user_id = $1 ORDER BY upload_date DESC`,
		userIDInt)

	if err != nil {
		return nil, fmt.Errorf("error fetching files from DB: %v", err)
	}
	defer rows.Close()

	var files []FileMetadata
	for rows.Next() {
		var file FileMetadata
		if err := rows.Scan(&file.FileID, &file.FileName, &file.ImageURL,
			&file.UploadDate, &file.UserID); err != nil {
			return nil, fmt.Errorf("error scanning file row: %v", err)
		}
		files = append(files, file)
	}

	return files, rows.Err()
}

func GetFileProducts(ctx context.Context, filename, userID string) ([]ProductResult, error) {
	userIDInt, err := parseUserID(userID)
	if err != nil {
		return nil, err
	}

	rows, err := sharedDB.GetDB().Query(ctx, `
        SELECT p.product_id, p.product_name, p.quantity, p.price, p.file_name, 
               p.date_added, p.category_id, c.name AS category_name 
        FROM product_category_service.products p 
        JOIN product_category_service.categories c ON p.category_id = c.category_id 
        WHERE p.user_id = $1 AND p.file_name = $2`,
		userIDInt, filename)

	if err != nil {
		return nil, fmt.Errorf("error fetching products: %v", err)
	}
	defer rows.Close()

	var products []ProductResult
	for rows.Next() {
		var product ProductResult
		if err := rows.Scan(&product.ProductID, &product.ProductName, &product.Quantity,
			&product.Price, &product.FileName, &product.DateAdded,
			&product.CategoryID, &product.CategoryName); err != nil {
			return nil, fmt.Errorf("error scanning product row: %v", err)
		}
		products = append(products, product)
	}

	if len(products) == 0 {
		return nil, fmt.Errorf("no data found")
	}

	return products, rows.Err()
}

func UpdateImageURL(ctx context.Context, userID string, fileName, imageURL string) error {
	userIDInt, err := parseUserID(userID)
	if err != nil {
		return err
	}

	result, err := sharedDB.GetDB().Exec(ctx, `
        UPDATE file_management_service.file_metadata 
        SET image_url = $1 WHERE user_id = $2 AND file_name = $3`,
		imageURL, userIDInt, fileName)

	if err != nil {
		return fmt.Errorf("failed to update image URL: %v", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("no rows updated - file not found")
	}

	return nil
}

func GetAllFileNames(ctx context.Context, userID string) ([]string, error) {
	userIDInt, err := parseUserID(userID)
	if err != nil {
		return nil, err
	}

	rows, err := sharedDB.GetDB().Query(ctx, `
        SELECT file_name FROM file_management_service.file_metadata WHERE user_id = $1`,
		userIDInt)

	if err != nil {
		return nil, fmt.Errorf("failed to query database: %v", err)
	}
	defer rows.Close()

	var fileNames []string
	for rows.Next() {
		var fileName string
		if err := rows.Scan(&fileName); err != nil {
			continue
		}
		fileNames = append(fileNames, fileName)
	}

	return fileNames, rows.Err()
}
