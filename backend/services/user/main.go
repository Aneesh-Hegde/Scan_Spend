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

	grpcMiddlware "github.com/Aneesh-Hegde/expenseManager/middleware"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/Aneesh-Hegde/expenseManager/services/user/auth"
	sharedDB "github.com/Aneesh-Hegde/expenseManager/shared/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
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
					systemHealth.WithLabelValues("databasae").Set(0)
				} else {
					systemHealth.WithLabelValues("databasae").Set(1)
				}
				cancel()
			} else {
				systemHealth.WithLabelValues("databasae").Set(0)
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
		log.Println("🔍 Starting metrics server on port 2112...")
		log.Println("📊 Metrics: http://localhost:2112/metrics")
		log.Println("❤️  Health: http://localhost:2112/health")
		if err := http.ListenAndServe(":2112", nil); err != nil {
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

	listener, err := net.Listen("tcp", ":50052")
	if err != nil {
		log.Fatalf("Failed to listen on port 50052: %v", err)
	}

	// Create gRPC server with authentication interceptor
	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(chainInterceptor(metricInterceptor,authInterceptor)))

	user.RegisterUserServiceServer(grpcServer, &UserServiceServer{})
	reflection.Register(grpcServer)

	// Setup graceful shutdown
	setupGracefulShutdown(grpcServer)
	
	// Start metrics cleaner
	startMetricsCleaner()

	log.Println("🚀 Starting User gRPC server on port 50052...")
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve User gRPC server: %v", err)
	}
}
