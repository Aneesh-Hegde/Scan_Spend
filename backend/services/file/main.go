package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"
	files "github.com/Aneesh-Hegde/expenseManager/grpc_file"
	grpcMiddlware "github.com/Aneesh-Hegde/expenseManager/middleware"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/Aneesh-Hegde/expenseManager/services/file/data"
	"github.com/Aneesh-Hegde/expenseManager/services/file/utils"
	sharedDB "github.com/Aneesh-Hegde/expenseManager/shared/db"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
)

type FileService struct {
	files.UnimplementedFileServiceServer
	fileLogic *utils.FileServiceServer
}

func (s *FileService) GetAllFiles(ctx context.Context, req *files.GetFileByUser) (*files.FileList, error) {
	return data.GetFiles(ctx, req)
}

func (s *FileService) UploadFile(ctx context.Context, req *files.UploadFileRequest) (*files.UploadFileResponse, error) {
	return s.fileLogic.UploadFile(ctx, req)
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


// Background health monitoring for database
func startDBHealthMonitor() {
	ticker := time.NewTicker(time.Minute * 2)
	go func() {
		defer ticker.Stop()
		for range ticker.C {
			// Force health check by calling GetDB - it will auto-reconnect if needed
			db := sharedDB.GetDB()
			if db != nil {
				ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				if err := db.Ping(ctx); err != nil {
					log.Printf("Health check failed: %v", err)
				}
				cancel()
			}
		}
	}()
}

// Graceful shutdown handler
func setupGracefulShutdown(grpcServer *grpc.Server) {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Received shutdown signal, gracefully stopping...")
		grpcServer.GracefulStop()
		sharedDB.CloseDB()
		redis.CloseRedis()
		log.Println("Balance service shutdown complete")
		os.Exit(0)
	}()
}

func main() {
	if err := godotenv.Load(".env-dev"); err != nil {
		log.Printf("Error loading .env-dev file: %v", err)
	}

	if err := utils.InitMinIO(); err != nil {
		log.Fatalf("Failed to initialize MinIO: %v", err)
	}
	newFileLogic := utils.NewFileServiceServer()
	fileService := &FileService{
		fileLogic: newFileLogic,
	}

	// Initialize database - will auto-reconnect when needed
	sharedDB.InitDB()
	redis.InitRedis()

	// Start background health monitoring
	startDBHealthMonitor()

	listener, err := net.Listen("tcp", ":50053")
	if err != nil {
		log.Fatalf("Failed to listen on port 50053: %v", err)
	}

	// Create gRPC server with authentication interceptor
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(authInterceptor))

	files.RegisterFileServiceServer(grpcServer, fileService)
	reflection.Register(grpcServer)

	// Setup graceful shutdown
	setupGracefulShutdown(grpcServer)

	log.Println("🚀 Starting File gRPC server on port 50053...")
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve File gRPC server: %v", err)
	}
}
