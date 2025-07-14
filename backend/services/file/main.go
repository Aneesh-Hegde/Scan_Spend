package main

import (
	"context"
	"fmt"
	"log"
	"net"

	"github.com/Aneesh-Hegde/expenseManager/data"
	"github.com/Aneesh-Hegde/expenseManager/db"
	files "github.com/Aneesh-Hegde/expenseManager/grpc_file"
	grpcMiddlware "github.com/Aneesh-Hegde/expenseManager/middleware"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/Aneesh-Hegde/expenseManager/utils"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
)

type FileService struct {
	files.UnimplementedFileServiceServer
}

func (s *FileService) GetAllFiles(ctx context.Context, req *files.GetFileByUser) (*files.FileList, error) {
	return data.GetFiles(ctx, req)
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

	if err := utils.InitMinIO(); err != nil {
		log.Fatalf("Failed to initialize MinIO: %v", err)
	}

	db.InitDB()
	redis.InitRedis()
	defer db.CloseDB()
	defer redis.CloseRedis()

	listener, err := net.Listen("tcp", ":50053")
	if err != nil {
		log.Fatalf("Failed to listen on port 50053: %v", err)
	}

	// Create gRPC server with authentication interceptor
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(authInterceptor))

	files.RegisterFileServiceServer(grpcServer, &FileService{})
	reflection.Register(grpcServer)

	log.Println("🚀 Starting File gRPC server on port 50053...")
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve File gRPC server: %v", err)
	}
}
