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

	balanceHandler "github.com/Aneesh-Hegde/expenseManager/services/balance/balance"
	sharedDB "github.com/Aneesh-Hegde/expenseManager/shared/db"
	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
	grpcMiddleware "github.com/Aneesh-Hegde/expenseManager/middleware"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
)

type BalanceService struct {
	balance.UnimplementedBalanceServiceServer
}

func (s *BalanceService) GetBalances(ctx context.Context, req *balance.GetBalanceRequest) (*balance.GetBalanceResponse, error) {
	return balanceHandler.GetBalance(ctx, req)
}

func (s *BalanceService) AddBalanceSource(ctx context.Context, req *balance.AddBalanceSourceRequest) (*balance.AddBalanceSourceResponse, error) {
	return balanceHandler.AddBalance(ctx, req)
}

func (s *BalanceService) UpdateBalance(ctx context.Context, req *balance.UpdateBalanceRequest) (*balance.UpdateBalanceResponse, error) {
	return balanceHandler.UpdateBalance(ctx, req)
}

func (s *BalanceService) GetTransfer(ctx context.Context, req *balance.GetTransferRequest) (*balance.GetTransferResponse, error) {
	return balanceHandler.GetTransfer(ctx, req)
}

func (s *BalanceService) GetIncomes(ctx context.Context, req *balance.GetIncomeRequest) (*balance.GetIncomeResponse, error) {
	return balanceHandler.GetIncome(ctx, req)
}

func (s *BalanceService) AddIncomeSource(ctx context.Context, req *balance.AddIncomeSourceRequest) (*balance.AddIncomeSourceResponse, error) {
	return balanceHandler.AddIncome(ctx, req)
}

func (s *BalanceService) UpdateIncome(ctx context.Context, req *balance.UpdateIncomeRequest) (*balance.UpdateIncomeResponse, error) {
	return balanceHandler.UpdateIncome(ctx, req)
}

func authInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	fmt.Println(info.FullMethod)
	newCtx, err := grpcMiddleware.AuthInterceptor(ctx)
	if err != nil {
		log.Println("Authentication failed:", err)
		return nil, status.Error(codes.Unauthenticated, "Authentication required")
	}
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

	listener, err := net.Listen("tcp", ":50055")
	if err != nil {
		log.Fatalf("Failed to listen on port 50055: %v", err)
	}

	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(authInterceptor))
	balance.RegisterBalanceServiceServer(grpcServer, &BalanceService{})
	reflection.Register(grpcServer)

	// Setup graceful shutdown
	setupGracefulShutdown(grpcServer)

	log.Println("🚀 Starting Balance gRPC server on port 50055...")
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve Balance gRPC server: %v", err)
	}
}
