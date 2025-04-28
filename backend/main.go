package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"

	"github.com/Aneesh-Hegde/expenseManager/data"
	"github.com/Aneesh-Hegde/expenseManager/db"
	pb "github.com/Aneesh-Hegde/expenseManager/grpc"
	files "github.com/Aneesh-Hegde/expenseManager/grpc_file"
	grpcMiddlware "github.com/Aneesh-Hegde/expenseManager/middleware"
	"github.com/Aneesh-Hegde/expenseManager/product"
	"github.com/Aneesh-Hegde/expenseManager/products"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"github.com/Aneesh-Hegde/expenseManager/utils"
	"github.com/Aneesh-Hegde/expenseManager/utils/auth"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
  balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
	balanceHandler "github.com/Aneesh-Hegde/expenseManager/balance"
)

type server struct {
	pb.UnimplementedFileProcessingServiceServer
}

func (s *server) GetText(ctx context.Context, req *pb.GetTextRequest) (*pb.GetTextResponse, error) {
	return utils.GetText(ctx, req)
}
func (s *server) SaveToDB(ctx context.Context, req *pb.GetProducts) (*pb.DBMessage, error) {
	return db.SaveProducts(ctx, req)
}

type UserServiceServer struct {
	user.UnimplementedUserServiceServer
}

// Register a new user
func (s *UserServiceServer) RegisterUser(ctx context.Context, req *user.RegisterUserRequest) (*user.UserResponse, error) {
	return auth.Register(ctx, req)
}

// Login a user and return a JWT token
func (s *UserServiceServer) LoginUser(ctx context.Context, req *user.LoginUserRequest) (*user.LoginResponse, error) {
	return auth.Login(ctx, req)
}

//Get user profile information

func (s *UserServiceServer) GetUserProfile(ctx context.Context, req *user.GetUserProfileRequest) (*user.UserProfile, error) {
	return auth.UserProfile(ctx, req)
}

// UpdateUser updates user profile information
func (s *UserServiceServer) UpdateUser(ctx context.Context, req *user.UpdateUserRequest) (*user.UserResponse, error) {
	return auth.UpdateUser(ctx, req)
}

func (s *UserServiceServer) GenerateVerifyToken(ctx context.Context, req *user.TokenRequest) (*user.TokenResponse, error) {
	return auth.EmailToken(ctx, req)
}

func (s *UserServiceServer) VerifyUser(ctx context.Context, req *user.VerifyRequest) (*user.VerifyResponse, error) {
	return auth.VerifyEmail(ctx, req)
}

type FileService struct {
	files.UnimplementedFileServiceServer
}

func (s *FileService) GetAllFiles(ctx context.Context, req *files.GetFileByUser) (*files.FileList, error) {
	return data.GetFiles(ctx, req)
}

type ProductService struct {
	product.UnimplementedProductServiceServer
}

func (s *ProductService) GetProductsByUser(ctx context.Context, req *product.GetProductsByUserRequest) (*product.ProductsList, error) {
	return products.GetUserProduct(ctx, req)
}

// Validate JWT token and extract user ID
// func (s *UserServiceServer) ValidateToken(ctx context.Context, req *user.ValidateTokenRequest) (*user.userResponse, error) {
// 	_, err := jwt.ValidateJWT(req.GetToken())
// 	if err != nil {
// 		return nil, fmt.Errorf("invalid or expired token: %v", err)
// 	}
//
// 	return &auth.AuthResponse{
// 		Message: "Token is valid",
// 	}, nil
// }

type BalanceService struct{
  balance.UnimplementedBalanceServiceServer
}

func (s *BalanceService) GetBalances(ctx context.Context,req *balance.GetBalanceRequest)(*balance.GetBalanceResponse,error){
 return balanceHandler.GetBalance(ctx,req)
}

func (s *BalanceService) AddBalanceSource(ctx context.Context,req *balance.AddBalanceSourceRequest)(*balance.AddBalanceSourceResponse,error){
 return balanceHandler.AddBalance(ctx,req)
}

func (s *BalanceService) UpdateBalance(ctx context.Context,req *balance.UpdateBalanceRequest)(*balance.UpdateBalanceResponse,error){
 return balanceHandler.UpdateBalance(ctx,req)
}

func authInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	fmt.Println(info.FullMethod)
	if info.FullMethod == "/auth.UserService/LoginUser" || info.FullMethod == "/auth.UserService/RegisterUser" || info.FullMethod == "/auth.UserService/GenerateVerifyToken" || info.FullMethod == "/auth.UserService/VerifyUser" {
		return handler(ctx, req)
	}
	newCtx, err := grpcMiddlware.AuthInterceptor(ctx)
	if err != nil {
		log.Println("Authentication failed:", err)
		return nil, status.Error(codes.Unauthenticated, "Authentication required")
	}

	// 🔹 Proceed with the actual request handler
	return handler(newCtx, req)
}

func main() {
	err := godotenv.Load(".env-dev")
	db.InitDB()
	redis.InitRedis()
	defer db.CloseDB()
	defer redis.CloseRedis()
	// Create a TCP listener for gRPC
	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Printf("Failed to listen: %v", err)
	}

	// Create gRPC server
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(authInterceptor))

	// Register the gRPC service
	server := &server{}
	pb.RegisterFileProcessingServiceServer(grpcServer, server)
	reflection.Register(grpcServer)

	UserServiceServer := &UserServiceServer{}
	user.RegisterUserServiceServer(grpcServer, UserServiceServer)

	FileService := &FileService{}
	files.RegisterFileServiceServer(grpcServer, FileService)

	ProductService := &ProductService{}
	product.RegisterProductServiceServer(grpcServer, ProductService)

  BalanceService := &BalanceService{}
  balance.RegisterBalanceServiceServer(grpcServer, BalanceService)
	// Echo HTTP server setup (without TLS)
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{"http://localhost:8080"},                             // Allow requests from your Next.js app
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodOptions}, // Allow methods
		AllowHeaders:     []string{"Content-Type", "Authorization"},                     // Allow necessary headers for file upload
		AllowCredentials: true,                                                          // Allow credentials (cookies, etc)
	}))
	e.GET("/", func(c echo.Context) error {
		return c.String(200, "Hello, HTTP/2 without TLS!")
	})

	// File upload endpoint using Echo
	e.POST("/upload", utils.Upload)
	e.POST("/refresh", utils.SetRefreshTokenHandler)
	e.GET("/get-refresh-token", utils.GetRefreshTokenHandler)

	// Enable HTTP2 for Echo server without TLS (non-secure)
	e.Server.Addr = ":8081"

	// Start the Echo HTTP server in a goroutine (so it runs concurrently)
	go func() {
		log.Println("Starting HTTP2 file upload server on http://localhost:8081")
		if err := e.Start(":8081"); err != nil {
			log.Printf("Failed to start Echo server: %v", err)
		}
	}()

	// Start the gRPC server (this will block the main goroutine)
	log.Println("Starting gRPC server on port 50051...")
	if err := grpcServer.Serve(listener); err != nil {
		log.Printf("Failed to serve gRPC server: %v", err)
	}
}
