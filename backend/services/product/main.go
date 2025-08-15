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
	"github.com/Aneesh-Hegde/expenseManager/product"
	"github.com/Aneesh-Hegde/expenseManager/services/product/products"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	sharedDB "github.com/Aneesh-Hegde/expenseManager/shared/db"
	"github.com/joho/godotenv"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
)

// observatory for product service
var (
	// Request count and duration in one histogram (includes count, sum, buckets)
	grpcRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "grpc_request_duration_seconds",
			Help:    "Duration of gRPC requests",
			Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10}, // Custom buckets for better granularity
		},
		[]string{"method", "status"},
	)

	// Current request duration (shows individual request times - auto-resets)
	grpcCurrentRequestDuration = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "grpc_current_request_duration_seconds",
			Help: "Duration of the current/latest gRPC request",
		},
		[]string{"method"},
	)

	// System health - combined gauge
	systemHealth = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "system_health_status",
			Help: "System component health status (1=healthy, 0=unhealthy)",
		},
		[]string{"component"}, // db, redis
	)

	// Active connections
	activeConnections = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "grpc_active_connections",
			Help: "Number of active gRPC connections",
		},
	)
)

func init() {
	// Register all metrics
	prometheus.MustRegister(grpcRequestDuration)
	prometheus.MustRegister(grpcCurrentRequestDuration)
	prometheus.MustRegister(systemHealth)
	prometheus.MustRegister(activeConnections)
}

type ProductService struct {
	product.UnimplementedProductServiceServer
}

func (s *ProductService) GetProductsByUser(ctx context.Context, req *product.GetProductsByUserRequest) (*product.ProductsList, error) {
	return products.GetUserProduct(ctx, req)
}

// Simplified metrics interceptor
func metricsInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	start := time.Now()
	
	// Track active connections
	activeConnections.Inc()
	defer activeConnections.Dec()

	// Call the handler
	resp, err := handler(ctx, req)
	
	// Calculate duration
	duration := time.Since(start).Seconds()
	
	// Determine status
	statusCode := "success"
	if err != nil {
		statusCode = status.Code(err).String()
	}

	// Record metrics (histogram automatically provides count, sum, and buckets)
	grpcRequestDuration.WithLabelValues(info.FullMethod, statusCode).Observe(duration)
	
	// Update current request duration (this will show individual request times)
	grpcCurrentRequestDuration.WithLabelValues(info.FullMethod).Set(duration)

	return resp, err
}

// Authentication interceptor
func authInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	fmt.Println("Authenticating:", info.FullMethod)

	newCtx, err := grpcMiddlware.AuthInterceptor(ctx)
	if err != nil {
		log.Println("Authentication failed:", err)
		return nil, status.Error(codes.Unauthenticated, "Authentication required")
	}

	return handler(newCtx, req)
}

// Chain interceptors
func chainUnaryInterceptors(interceptors ...grpc.UnaryServerInterceptor) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		for i := len(interceptors) - 1; i >= 0; i-- {
			h := handler
			handler = func(currentCtx context.Context, currentReq interface{}) (interface{}, error) {
				return interceptors[i](currentCtx, currentReq, info, h)
			}
		}
		return handler(ctx, req)
	}
}

// Simplified health monitoring
func startHealthMonitor() {
	ticker := time.NewTicker(30 * time.Second) // Check every 30 seconds
	go func() {
		defer ticker.Stop()
		for range ticker.C {
			// Check database health
			db := sharedDB.GetDB()
			if db != nil {
				ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				if err := db.Ping(ctx); err != nil {
					log.Printf("Database health check failed: %v", err)
					systemHealth.WithLabelValues("database").Set(0)
				} else {
					systemHealth.WithLabelValues("database").Set(1)
				}
				cancel()
			} else {
				systemHealth.WithLabelValues("database").Set(0)
			}

			// For now, setting as healthy - replace with actual Redis ping
			systemHealth.WithLabelValues("redis").Set(1)
		}
	}()
}

// Auto-reset current request duration after inactivity
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

// Start metrics server
func startMetricsServer() {
	http.Handle("/metrics", promhttp.Handler())
	
	//simple health endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
	
	go func() {
		log.Println("🔍 Starting metrics server on port 2113...")
		log.Println("📊 Metrics: http://localhost:2113/metrics")
		log.Println("❤️  Health: http://localhost:2113/health")
		if err := http.ListenAndServe(":2113", nil); err != nil {
			log.Printf("Failed to start metrics server: %v", err)
		}
	}()
}

// Graceful shutdown
func setupGracefulShutdown(grpcServer *grpc.Server) {
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-c
		log.Println("Received shutdown signal, gracefully stopping...")
		grpcServer.GracefulStop()
		sharedDB.CloseDB()
		redis.CloseRedis()
		log.Println("Product service shutdown complete")
		os.Exit(0)
	}()
}

func main() {
	if err := godotenv.Load(".env-dev"); err != nil {
		log.Printf("Error loading .env-dev file: %v", err)
	}

	// Initialize database and redis
	sharedDB.InitDB()
	redis.InitRedis()

	// Start metrics server
	startMetricsServer()

	// Start health monitoring
	startHealthMonitor()

	// Start metrics cleaner
	startMetricsCleaner()

	// Setup gRPC server
	listener, err := net.Listen("tcp", ":50054")
	if err != nil {
		log.Fatalf("Failed to listen on port 50054: %v", err)
	}

	// Create gRPC server with interceptors
	grpcServer := grpc.NewServer(
		grpc.UnaryInterceptor(chainUnaryInterceptors(metricsInterceptor, authInterceptor)),
	)

	// Register services
	product.RegisterProductServiceServer(grpcServer, &ProductService{})
	reflection.Register(grpcServer)

	// Setup graceful shutdown
	setupGracefulShutdown(grpcServer)

	log.Println("🚀 Starting Product gRPC server on port 50054...")
	log.Println("📈 Prometheus metrics available at :2113/metrics")
	
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve gRPC server: %v", err)
	}
}
