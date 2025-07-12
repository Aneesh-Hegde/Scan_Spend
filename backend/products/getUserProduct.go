package products

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/Aneesh-Hegde/expenseManager/db"
	"github.com/Aneesh-Hegde/expenseManager/product"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func GetUserProduct(ctx context.Context, req *product.GetProductsByUserRequest) (*product.ProductsList, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	if len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}
	userId := md["user_id"][0]
	query := `SELECT p.name AS product_name, p.quantity, p.date_added, p.price, c.name AS category_name FROM products p INNER JOIN categories c ON p.category_id = c.category_id WHERE p.user_id = $1`
	rows, err := db.DB.Query(ctx, query, userId)
	if err != nil {
		return nil, fmt.Errorf("No data found:%s", err)
	}
	defer rows.Close()
	var products product.ProductsList
	for rows.Next() {
		var productName string
		var quantity int
		var dateAdded time.Time
		var price float64
		var categoryName string
		var product product.Product

		if err := rows.Scan(&productName, &quantity, &dateAdded, &price, &categoryName); err != nil {
			log.Fatal("Error scanning row:", err)
		}
		product.ProductName = productName
		product.Amount = float32(price)
		product.Category = categoryName
		product.Quantity = float32(quantity)
		product.Date = dateAdded.Format("2006-01-02")
		products.Products = append(products.Products, &product)
		fmt.Println("Product:", productName, "| Quantity:", quantity, "| Date:", dateAdded, "| Price:", price, "| Category:", categoryName)

	}

	if err = rows.Err(); err != nil {
		log.Fatal("Error during row iteration:", err)
	}
	return &products, nil
}
