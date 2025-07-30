package main

import (
	"github.com/Aneesh-Hegde/expenseManager/api_gateway/utils"
	"github.com/Aneesh-Hegde/expenseManager/db"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"log"
	"net/http"
	"os"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(".env-dev"); err != nil {
		log.Printf("Error loading .env-dev file: %v", err)
	}

	// Initialize database and Redis connections
	db.InitDB()
	redis.InitRedis()
	defer db.CloseDB()
	defer redis.CloseRedis()
	fileServiceGrpcAddr := os.Getenv("FILE_SERVICE_GRPC_ADDR")
	if fileServiceGrpcAddr == "" {
		fileServiceGrpcAddr = "localhost:50053" // Default, if not set
	}
	utils.InitFileServiceClient(fileServiceGrpcAddr)

	// Echo HTTP server setup
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{"http://localhost:8080"},                             // Allow requests from your Next.js app
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodOptions}, // Allow methods
		AllowHeaders:     []string{"Content-Type", "Authorization"},                     // Allow necessary headers for file upload
		AllowCredentials: true,                                                          // Allow credentials (cookies, etc)
	}))

	// Routes
	e.GET("/", func(c echo.Context) error {
		return c.String(200, "Hello, HTTP/2 without TLS!")
	})

	// File upload endpoint using Echo
	e.POST("/upload", utils.Upload)
	e.POST("/refresh", utils.SetRefreshTokenHandler)
	e.GET("/get-refresh-token", utils.GetRefreshTokenHandler)

	// Health check endpoint
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(200, map[string]string{"status": "healthy"})
	})

	// Start the Echo HTTP server
	log.Println("🚀 Starting API service (Echo HTTP server) on port 8081...")
	if err := e.Start(":8081"); err != nil {
		log.Fatalf("Failed to start Echo server: %v", err)
	}
}
