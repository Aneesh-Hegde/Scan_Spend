package products

import (
	"context"
	"fmt"
	"github.com/Aneesh-Hegde/expenseManager/product"
	productDB "github.com/Aneesh-Hegde/expenseManager/services/product/db"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"log"
)

func GetUserProduct(ctx context.Context, req *product.GetProductsByUserRequest) (*product.ProductsList, error) {
	md, _ := metadata.FromIncomingContext(ctx)

	if len(md["token"]) > 0 && len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}

	userId := md["user_id"][0]

	productResults, err := productDB.GetUserProducts(ctx, userId)
	if err != nil {
		log.Printf("Error fetching products for user %s: %v", userId, err)
		return nil, err
	}

	var products product.ProductsList
	for _, result := range productResults {
		product := &product.Product{
			ProductName: result.ProductName,
			Amount:      float32(result.Price),
			Category:    result.CategoryName,
			Quantity:    float32(result.Quantity),
			Date:        result.DateAdded.Format("2006-01-02"),
		}
		products.Products = append(products.Products, product)
		fmt.Printf("Product: %s | Quantity: %d | Date: %v | Price: %.2f | Category: %s\n",
			result.ProductName, result.Quantity, result.DateAdded, result.Price, result.CategoryName)
	}

	return &products, nil
}
