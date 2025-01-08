package main

import (
	"log"
	"net"

	"github.com/Aneesh-Hegde/expenseManager/db"
	pb "github.com/Aneesh-Hegde/expenseManager/grpc"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/Aneesh-Hegde/expenseManager/utils"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

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

	listener, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("Failed to listen:%v", err)
	}
	grpcServer := grpc.NewServer()
	server := &utils.FileUploadServer{}
	pb.RegisterFileProcessingServiceServer(grpcServer, server)
	reflection.Register(grpcServer)
	log.Println("gRPC server running on port 50051...")

	if err := grpcServer.Serve(listener); err != nil {
		log.Fatalf("Failed to serve:%v", err)
	}
}
