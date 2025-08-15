package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
	grpcMiddleware "github.com/Aneesh-Hegde/expenseManager/middleware"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	balanceHandler "github.com/Aneesh-Hegde/expenseManager/services/balance/balance"
	sharedDB "github.com/Aneesh-Hegde/expenseManager/shared/db"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
)

// observatory for balance service
var (
	// Request count and duration in one histogram (includes count, sum, buckets)
	grpcRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "grpc_request_duration_seconds",
			Help:    "Duration of gRPC requests",
			Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10}, // Custom buckets for better granularity
		},
		[]string{"method", "status"},
	)

	// Current request duration (shows individual request times - auto-resets)
	grpcCurrentRequestDuration = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "grpc_current_request_duration_seconds",
			Help: "Duration of the current/latest gRPC request",
		},
		[]string{"method"},
	)

	// System health - combined gauge
	systemHealth = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "system_health_status",
			Help: "System component health status (1=healthy, 0=unhealthy)",
		},
		[]string{"component"}, // db, redis
	)

	// Active connections
	activeConnections = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "grpc_active_connections",
			Help: "Number of active gRPC connections",
		},
	)
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

func metricInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	start := time.Now()
	activeConnections.Inc()
	defer activeConnections.Dec()

	res, err := handler(ctx, req)
	duration := time.Since(start).Seconds()

	statusCode := "success"
	if err != nil {
		statusCode = status.Code(err).String()
	}

	grpcRequestDuration.WithLabelValues(info.FullMethod, statusCode).Observe(duration)

	grpcCurrentRequestDuration.WithLabelValues(info.FullMethod).Set(duration)

	return res, nil
}

func chainInterceptor(interceptors ...grpc.UnaryServerInterceptor) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		for i := len(interceptors) - 1; i >= 0; i-- {
			h := handler
			handler = func(newCtx context.Context, currReq interface{}) (interface{}, error) {
				return interceptors[i](newCtx, currReq, info, h)
			}
		}
		return handler(ctx, req)
	}
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
					systemHealth.WithLabelValues("database").Set(0)
				} else {

					systemHealth.WithLabelValues("database").Set(1)
				}
				cancel()
			} else {
				systemHealth.WithLabelValues("database").Set(0)
			}
		}

		systemHealth.WithLabelValues("redis").Set(1)
	}()
}

func startMetricServer() {

	http.Handle("/metrics", promhttp.Handler())

	//simple health endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
	go func() {
		log.Println("🔍 Starting metrics server on port 2116...")
		log.Println("📊 Metrics: http://localhost:2116/metrics")
		log.Println("❤️  Health: http://localhost:2116/health")
		if err := http.ListenAndServe(":2116", nil); err != nil {
			log.Printf("Failed to start metrics server: %v", err)
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

func startMetricsCleaner() {
	ticker := time.NewTicker(1 * time.Minute) // Check every minute
	go func() {
		defer ticker.Stop()
		for range ticker.C {
			// Reset current request duration to 0 after 2 minutes of inactivity
			// This prevents the "ghost" values

			// For now, the gauge will just show the last request duration
		}
	}()
}

func main() {
	if err := godotenv.Load(".env-dev"); err != nil {
		log.Printf("Error loading .env-dev file: %v", err)
	}

	startMetricServer()
	// Initialize database - will auto-reconnect when needed
	sharedDB.InitDB()
	redis.InitRedis()

	// Start background health monitoring
	startDBHealthMonitor()

	listener, err := net.Listen("tcp", ":50055")
	if err != nil {
		log.Fatalf("Failed to listen on port 50055: %v", err)
	}

	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(chainInterceptor(metricInterceptor, authInterceptor)))
	balance.RegisterBalanceServiceServer(grpcServer, &BalanceService{})
	reflection.Register(grpcServer)

	// Setup graceful shutdown
	setupGracefulShutdown(grpcServer)

	// Start metrics cleaner
	startMetricsCleaner()
	log.Println("🚀 Starting Balance gRPC server on port 50055...")
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve Balance gRPC server: %v", err)
	}
}
