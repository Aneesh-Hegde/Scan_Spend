package main

import (
	"context"
	"github.com/Aneesh-Hegde/expenseManager/db"
	pb "github.com/Aneesh-Hegde/expenseManager/grpc"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/Aneesh-Hegde/expenseManager/utils"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
	"log"
	"net"
	"net/http"
)

type server struct {
	pb.UnimplementedFileProcessingServiceServer
}

func (s *server) GetText(ctx context.Context, req *pb.GetTextRequest) (*pb.GetTextResponse, error) {
	return utils.GetText(ctx, req)
}
func main() {
	db.InitDB()
	redis.InitRedis()
	defer db.CloseDB()
	defer redis.CloseRedis()
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	// e := echo.New()
	//
	// e.Use(middleware.Logger())
	// e.Use(middleware.Recover())
	// e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
	// 	AllowOrigins: []string{"http://localhost:3000"}, // Your frontend URL
	// 	AllowMethods: []string{echo.GET, echo.POST, echo.PUT, echo.DELETE},
	// 	AllowHeaders: []string{echo.HeaderContentType, echo.HeaderAuthorization},
	// }))

	// Serve static files (adjust path as necessary)
	// e.Static("/uploads", "uploads")

	// Route to display the list of uploaded files (rendering logic removed)
	// e.GET("/", func(c echo.Context) error {
	// 	return c.JSON(http.StatusOK, map[string]interface{}{"files": states.Files.Filenames})
	// })
	//
	// // Route for file upload
	// e.POST("/upload", utils.Upload)
	//
	// // Route to serve a file (adjust file name and path as needed)
	// e.GET("/file", func(c echo.Context) error {
	// 	c.Attachment("celebi.png", "celebi.png")
	// 	return c.String(http.StatusOK, "File served")
	// })
	//
	// // Route to extract text from an image file (using OCR)
	// e.POST("/get-text/:file", utils.GetText)
	//
	// // Route to edit a product
	// e.POST("/edit/:file/:id", utils.EditProduct)
	//
	// // Route to update a product
	// e.POST("/update/:file/:id", utils.UpdateProduct)
	//
	// // Route to delete a product
	// e.DELETE("/:file/:id", utils.DeleteProduct)
	//
	// e.POST("/login", utils.Login) // Login route that generates the JWT
	//
	// // Protected Routes
	// e.GET("/profile", func(c echo.Context) error {
	// 	// Get the user ID from the context if needed
	// 	userID := c.Get("user_id").(string)
	// 	// Fetch user profile from database using userID
	// 	return c.JSON(http.StatusOK, map[string]string{"user_id": userID, "profile": "user profile data"})
	// }, utils.JWTMiddleware)
	//
	// // Start the server
	// e.Logger.Fatal(e.Start(":1323"))

	// Create a TCP listener for gRPC
	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	// Create gRPC server
	grpcServer := grpc.NewServer()

	// Register the gRPC service
	server := &server{}
	pb.RegisterFileProcessingServiceServer(grpcServer, server)
	reflection.Register(grpcServer)

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

	// Enable HTTP2 for Echo server without TLS (non-secure)
	e.Server.Addr = ":8081"

	// Start the Echo HTTP server in a goroutine (so it runs concurrently)
	go func() {
		log.Println("Starting HTTP2 file upload server on http://localhost:8081")
		if err := e.Start(":8081"); err != nil {
			log.Fatalf("Failed to start Echo server: %v", err)
		}
	}()

	// Start the gRPC server (this will block the main goroutine)
	log.Println("Starting gRPC server on port 50051...")
	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve gRPC server: %v", err)
	}
}
