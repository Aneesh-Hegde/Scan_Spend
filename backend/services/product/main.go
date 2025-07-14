package main

import (
	"context"
	"fmt"
	"log"
	"net"

	"github.com/Aneesh-Hegde/expenseManager/db"
	grpcMiddlware "github.com/Aneesh-Hegde/expenseManager/middleware"
	"github.com/Aneesh-Hegde/expenseManager/product"
	"github.com/Aneesh-Hegde/expenseManager/products"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
)

type ProductService struct {
	product.UnimplementedProductServiceServer
}

func (s *ProductService) GetProductsByUser(ctx context.Context, req *product.GetProductsByUserRequest) (*product.ProductsList, error) {
	return products.GetUserProduct(ctx, req)
}

// Authentication interceptor - all endpoints require authentication
func authInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	fmt.Println(info.FullMethod)

	// Apply authentication for all endpoints
	newCtx, err := grpcMiddlware.AuthInterceptor(ctx)
	if err != nil {
		log.Println("Authentication failed:", err)
		return nil, status.Error(codes.Unauthenticated, "Authentication required")
	}

	// Proceed with the actual request handler
	return handler(newCtx, req)
}

func main() {
	if err := godotenv.Load(".env-dev"); err != nil {
		log.Printf("Error loading .env-dev file: %v", err)
	}

	db.InitDB()
	redis.InitRedis()
	defer db.CloseDB()
	defer redis.CloseRedis()

	listener, err := net.Listen("tcp", ":50054")
	if err != nil {
		log.Fatalf("Failed to listen on port 50054: %v", err)
	}

	// Create gRPC server with authentication interceptor
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(authInterceptor))

	product.RegisterProductServiceServer(grpcServer, &ProductService{})
	reflection.Register(grpcServer)

	log.Println("🚀 Starting Product gRPC server on port 50054...")
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve Product gRPC server: %v", err)
	}
}
