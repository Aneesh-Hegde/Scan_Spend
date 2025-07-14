package main

import (
	"context"
	"fmt"
	"log"
	"net"

	"github.com/Aneesh-Hegde/expenseManager/db"
	goalsHandler "github.com/Aneesh-Hegde/expenseManager/goals"
	goals "github.com/Aneesh-Hegde/expenseManager/grpc_goal"
	grpcMiddlware "github.com/Aneesh-Hegde/expenseManager/middleware"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
)

type GoalService struct {
	goals.UnimplementedGoalServiceServer
}

func (s *GoalService) GetGoals(ctx context.Context, req *goals.GetGoalRequest) (*goals.GetGoalResponse, error) {
	return goalsHandler.GetGoals(ctx, req)
}

func (s *GoalService) CreateGoals(ctx context.Context, req *goals.CreateGoalRequest) (*goals.CreateGoalResponse, error) {
	return goalsHandler.CreateGoals(ctx, req)
}

func (s *GoalService) UpdateGoals(ctx context.Context, req *goals.UpdateGoalRequest) (*goals.UpdateResponse, error) {
	return goalsHandler.UpdateGoals(ctx, req)
}

func (s *GoalService) EditGoals(ctx context.Context, req *goals.EditGoalRequest) (*goals.EditResponse, error) {
	return goalsHandler.EditGoals(ctx, req)
}

func (s *GoalService) GetGoalTransactions(ctx context.Context, req *goals.GetGoalTransactionsRequest) (*goals.GetGoalTransactionsResponse, error) {
	return goalsHandler.GoalTransactions(ctx, req)
}

func (s *GoalService) DeleteGoals(ctx context.Context, req *goals.DeleteGoalRequest) (*goals.DeleteResponse, error) {
	return goalsHandler.DeleteGoals(ctx, req)
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

	listener, err := net.Listen("tcp", ":50056")
	if err != nil {
		log.Fatalf("Failed to listen on port 50056: %v", err)
	}

	// Create gRPC server with authentication interceptor
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(authInterceptor))

	goals.RegisterGoalServiceServer(grpcServer, &GoalService{})
	reflection.Register(grpcServer)

	log.Println("🚀 Starting Goals gRPC server on port 50056...")
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve Goals gRPC server: %v", err)
	}
}

