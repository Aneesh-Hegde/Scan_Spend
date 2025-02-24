package data

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/Aneesh-Hegde/expenseManager/db"
	"github.com/Aneesh-Hegde/expenseManager/grpc"
)

func GetFileProduct(ctx context.Context, filename string, userId string) (*grpc.GetTextResponse, error) {
	fmt.Println("Data to db")
	fmt.Println(userId, filename)
	dbQuery := `SELECT p.product_id, p.name, p.quantity, p.price, p.file_name, p.date_added, p.category_id, c.name AS category_name 
	            FROM products p JOIN categories c ON p.category_id=c.category_id WHERE user_id=$1 AND file_name=$2`
	rows, err := db.DB.Query(ctx, dbQuery, userId, filename)
	if err != nil {
		return nil, err
	}
	var products []*grpc.Product
	var totalAmount float32 // To calculate total as quantity * price
	if !rows.Next() {
		return nil, fmt.Errorf("No data found")
	}
	for rows.Next() {
		var product grpc.Product
		var categoryID, product_id, quantity int
		var price float64
		var date_added time.Time
		// Scan values from the DB
		err := rows.Scan(&product_id, &product.ProductName, &quantity, &price, &product.Name, &date_added, &categoryID, &product.Category)
		if err != nil {
			return nil, err
		}

		// Assign values
		product.Id = strconv.Itoa(product_id)
		product.Quantity = float32(quantity)
		product.Amount = float32(price)
		// product.Category = fmt.Sprintf("%d", categoryID)
		product.Date = date_added.Format("2006-01-02")

		// Compute total amount (sum of quantity * price for all products)
		totalAmount += float32(quantity) * float32(price)

		products = append(products, &product)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("row iteration error: %w", err)
	}

	// Create response
	response := &grpc.GetTextResponse{
		Products: products,
		Total:    fmt.Sprintf("%.2f", totalAmount), // Format total amount as string with 2 decimal places
	}

	return response, nil
}
