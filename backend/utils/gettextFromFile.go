package utils

import (
	"context"
	"fmt"
	"path/filepath"
	"strconv"

	// "github.com/Aneesh-Hegde/expenseManager/db"
	"github.com/Aneesh-Hegde/expenseManager/data"
	pb "github.com/Aneesh-Hegde/expenseManager/grpc"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/Aneesh-Hegde/expenseManager/states"
	"github.com/otiai10/gosseract/v2"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func GetText(ctx context.Context, req *pb.GetTextRequest) (*pb.GetTextResponse, error) {
	filename := req.GetFilename()
	md, _ := metadata.FromIncomingContext(ctx)
	fmt.Println(md)
	accessToken := md.Get("token")
	if len(accessToken) > 0 {
		header := metadata.Pairs("accessToken", accessToken[0])
		grpc.SendHeader(ctx, header)
	}

	// Check if product data is already cached in Redis
	cachedProducts, err := redis.GetCachedProductData(filename)
	if err == nil && cachedProducts != nil {
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
	fmt.Println(req.GetToken())
	productFromDB, err := data.GetFileProduct(ctx, filename, md["user_id"][0])
	if err == nil && productFromDB != nil {
		fmt.Println("From db")
		return productFromDB, nil
	}
	if err != nil {
		fmt.Println(err)
	}

	// OCR to extract text from the image
	client := gosseract.NewClient()
	defer client.Close()

	err = client.SetImage(filepath.Join("uploads", filename))
	if err != nil {
		return nil, fmt.Errorf("failed to set image: %w", err)
	}

	text, err := client.Text()
	if err != nil {
		return nil, fmt.Errorf("failed to extract text: %w", err)
	}

	// Extract product data from text
	extractedData, err := ExtractProductDataFromText(text)
	if err != nil {
		return nil, fmt.Errorf("failed to extract product data: %w", err)
	}
	fmt.Print(extractedData)
	// Process extracted data
	var products []states.Product
	total := 0.0
	for i, product := range extractedData {
		product.ID = strconv.Itoa(i + 1)
		product.FileName = filename
		total += product.Quantity * product.Amount
		products = append(products, product)
	}

	// Cache the product data
	err = redis.CacheProductData(filename, products)
	if err != nil {
		return nil, fmt.Errorf("failed to cache product data: %w", err)
	}

	// Store the extracted product data in the database
	// err = db.StoreProductData(1, filename, products)
	// if err != nil {
	// 	return nil, fmt.Errorf("failed to insert products into database: %w", err)
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
