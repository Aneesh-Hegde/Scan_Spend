package main

import (
	"context"
	"fmt"
	"log"
	"net"

	balanceHandler "github.com/Aneesh-Hegde/expenseManager/balance"
	"github.com/Aneesh-Hegde/expenseManager/db"
	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
	grpcMiddlware "github.com/Aneesh-Hegde/expenseManager/middleware"
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

	listener, err := net.Listen("tcp", ":50055")
	if err != nil {
		log.Fatalf("Failed to listen on port 50055: %v", err)
	}

	// Create gRPC server with authentication interceptor
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(authInterceptor))

	balance.RegisterBalanceServiceServer(grpcServer, &BalanceService{})
	reflection.Register(grpcServer)

	log.Println("🚀 Starting Balance gRPC server on port 50055...")
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve Balance gRPC server: %v", err)
	}
}
