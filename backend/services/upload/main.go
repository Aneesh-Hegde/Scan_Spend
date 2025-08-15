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

	pb "github.com/Aneesh-Hegde/expenseManager/grpc"
	grpcMiddlware "github.com/Aneesh-Hegde/expenseManager/middleware"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	uploadDB "github.com/Aneesh-Hegde/expenseManager/services/upload/db"
	"github.com/Aneesh-Hegde/expenseManager/services/upload/utils"
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

// observatory for goals service
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

func metricInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	start := time.Now()
	activeConnections.Inc()
	defer activeConnections.Dec()

	res, err := handler(ctx, req)
	duration := time.Since(start).Seconds()
	successCode := "success"
	if err != nil {
		successCode = status.Code(err).String()
	}
	grpcRequestDuration.WithLabelValues(info.FullMethod, successCode).Observe(duration)
	grpcCurrentRequestDuration.WithLabelValues(info.FullMethod).Set(duration)
	return res, nil
}

func chainInterceptor(interceptors ...grpc.UnaryServerInterceptor) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		for i := len(interceptors)-1; i >= 0; i-- {
			h := handler
			handler = func(newCtx context.Context, newReq interface{}) (interface{}, error) {
				return interceptors[i](newCtx, newReq, info, h)
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

func startMetricServer(){
	http.Handle("/metrics",promhttp.Handler())
	
	//simple health endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
	go func() {
		log.Println("🔍 Starting metrics server on port 2115...")
		log.Println("📊 Metrics: http://localhost:2115/metrics")
		log.Println("❤️  Health: http://localhost:2115/health")
		if err := http.ListenAndServe(":2115", nil); err != nil {
			log.Printf("Failed to start metrics server: %v", err)
		}
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

	listener, err := net.Listen("tcp", ":50057")
	if err != nil {
		log.Fatalf("Failed to listen on port 50057: %v", err)
	}

	// Create gRPC server with authentication interceptor
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(chainInterceptor(metricInterceptor,authInterceptor)))

	pb.RegisterFileProcessingServiceServer(grpcServer, &FileProcessingServer{})
	reflection.Register(grpcServer)

	// Setup graceful shutdown
	setupGracefulShutdown(grpcServer)
	
	// Start metrics cleaner
	startMetricsCleaner()

	log.Println("🚀 Starting User gRPC server on port 50057...")
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve User gRPC server: %v", err)
	}
}
