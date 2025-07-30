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

	sharedDB "github.com/Aneesh-Hegde/expenseManager/shared/db"
	uploadDB "github.com/Aneesh-Hegde/expenseManager/services/upload/db"
	pb "github.com/Aneesh-Hegde/expenseManager/grpc"
	grpcMiddlware "github.com/Aneesh-Hegde/expenseManager/middleware"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/Aneesh-Hegde/expenseManager/services/upload/utils"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
)

type FileProcessingServer struct {
	pb.UnimplementedFileProcessingServiceServer
}

func (s *FileProcessingServer) GetText(ctx context.Context, req *pb.GetTextRequest) (*pb.GetTextResponse, error) {
	return utils.GetText(ctx, req)
}
func (s *FileProcessingServer) SaveToDB(ctx context.Context, req *pb.GetProducts) (*pb.DBMessage, error) {
	return uploadDB.SaveProducts(ctx, req)
}

// Authentication interceptor - same as in your old implementation
func authInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	fmt.Println(info.FullMethod)

	// Skip authentication for public endpoints
	if info.FullMethod == "/auth.UserService/LoginUser" ||
		info.FullMethod == "/auth.UserService/RegisterUser" ||
		info.FullMethod == "/auth.UserService/GenerateVerifyToken" ||
		info.FullMethod == "/auth.UserService/VerifyUser" {
		return handler(ctx, req)
	}

	// Apply authentication for protected endpoints
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

	// Initialize database - will auto-reconnect when needed
	sharedDB.InitDB()
	redis.InitRedis()

	// Start background health monitoring
	startDBHealthMonitor()

	listener, err := net.Listen("tcp", ":50057")
	if err != nil {
		log.Fatalf("Failed to listen on port 50057: %v", err)
	}

	// Create gRPC server with authentication interceptor
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(authInterceptor))

	pb.RegisterFileProcessingServiceServer(grpcServer, &FileProcessingServer{})
	reflection.Register(grpcServer)

	// Setup graceful shutdown
	setupGracefulShutdown(grpcServer)

	log.Println("🚀 Starting User gRPC server on port 50057...")
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve User gRPC server: %v", err)
	}
}
