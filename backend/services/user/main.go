package main

import (
	"context"
	"fmt"
	"log"
	"net"

	"github.com/Aneesh-Hegde/expenseManager/db"
	grpcMiddlware "github.com/Aneesh-Hegde/expenseManager/middleware"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"github.com/Aneesh-Hegde/expenseManager/utils/auth"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
)

type UserServiceServer struct {
	user.UnimplementedUserServiceServer
}

func (s *UserServiceServer) RegisterUser(ctx context.Context, req *user.RegisterUserRequest) (*user.UserResponse, error) {
	return auth.Register(ctx, req)
}

func (s *UserServiceServer) LoginUser(ctx context.Context, req *user.LoginUserRequest) (*user.LoginResponse, error) {
	return auth.Login(ctx, req)
}

func (s *UserServiceServer) GetUserProfile(ctx context.Context, req *user.GetUserProfileRequest) (*user.UserProfile, error) {
	return auth.UserProfile(ctx, req)
}

func (s *UserServiceServer) UpdateUser(ctx context.Context, req *user.UpdateUserRequest) (*user.UserResponse, error) {
	return auth.UpdateUser(ctx, req)
}

func (s *UserServiceServer) GenerateVerifyToken(ctx context.Context, req *user.TokenRequest) (*user.TokenResponse, error) {
	return auth.EmailToken(ctx, req)
}

func (s *UserServiceServer) VerifyUser(ctx context.Context, req *user.VerifyRequest) (*user.VerifyResponse, error) {
	return auth.VerifyEmail(ctx, req)
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

func main() {
	if err := godotenv.Load(".env-dev"); err != nil {
		log.Printf("Error loading .env-dev file: %v", err)
	}

	db.InitDB()
	redis.InitRedis()
	defer db.CloseDB()
	defer redis.CloseRedis()

	listener, err := net.Listen("tcp", ":50052")
	if err != nil {
		log.Fatalf("Failed to listen on port 50052: %v", err)
	}

	// Create gRPC server with authentication interceptor
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(authInterceptor))

	user.RegisterUserServiceServer(grpcServer, &UserServiceServer{})
	reflection.Register(grpcServer)

	log.Println("🚀 Starting User gRPC server on port 50052...")
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve User gRPC server: %v", err)
	}
}
