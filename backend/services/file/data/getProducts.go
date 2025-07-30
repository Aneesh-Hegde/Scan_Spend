package data

import (
	"context"
	"fmt"
	"strconv"

	"github.com/Aneesh-Hegde/expenseManager/grpc"
	fileDB "github.com/Aneesh-Hegde/expenseManager/services/file/db"
)

func GetFileProduct(ctx context.Context, filename string, userId string) (*grpc.GetTextResponse, error) {
	fmt.Println("Data to db")
	fmt.Println(userId, filename)

	productResults, err := fileDB.GetFileProducts(ctx, filename, userId)
	if err != nil {
		return nil, err
	}

	var products []*grpc.Product
	var totalAmount float32

	for _, result := range productResults {
		product := &grpc.Product{
			Id:          strconv.Itoa(int(result.ProductID)),
			ProductName: result.ProductName,
			Quantity:    float32(result.Quantity),
			Amount:      float32(result.Price),
			Name:        result.FileName,
			Category:    result.CategoryName,
			Date:        result.DateAdded.Format("02/01/2006"),
		}

		totalAmount += float32(result.Quantity) * float32(result.Price)
		products = append(products, product)
	}

	fmt.Println(products)

	response := &grpc.GetTextResponse{
		Products: products,
		Total:    fmt.Sprintf("%.2f", totalAmount),
	}

	return response, nil
}
