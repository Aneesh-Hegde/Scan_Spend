package db

import (
	"context"
	"fmt"
	sharedDB "github.com/Aneesh-Hegde/expenseManager/shared/db"
	"strconv"
	"time"
)

type ProductResult struct {
	ProductName  string
	Quantity     int32
	DateAdded    time.Time
	Price        float64
	CategoryName string
}

func parseUserID(userID string) (int32, error) {
	id, err := strconv.ParseInt(userID, 10, 32)
	if err != nil {
		return 0, fmt.Errorf("invalid user ID: %v", err)
	}
	return int32(id), nil
}

func GetUserProducts(ctx context.Context, userID string) ([]ProductResult, error) {
	userIDInt, err := parseUserID(userID)
	if err != nil {
		return nil, err
	}

	rows, err := sharedDB.GetDB().Query(ctx, `
        SELECT p.product_name AS product_name, p.quantity, p.date_added, p.price, c.name AS category_name 
        FROM product_category_service.products p 
        INNER JOIN product_category_service.categories c ON p.category_id = c.category_id 
        WHERE p.user_id = $1`,
		userIDInt)

	if err != nil {
		return nil, fmt.Errorf("no data found: %v", err)
	}
	defer rows.Close()

	var products []ProductResult
	for rows.Next() {
		var product ProductResult
		if err := rows.Scan(&product.ProductName, &product.Quantity, &product.DateAdded,
			&product.Price, &product.CategoryName); err != nil {
			return nil, fmt.Errorf("error scanning product row: %v", err)
		}
		products = append(products, product)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error during row iteration: %v", err)
	}

	return products, nil
}
