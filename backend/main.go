package main

import (
	"github.com/Aneesh-Hegde/expenseManager/states"
	"github.com/Aneesh-Hegde/expenseManager/utils"
	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"log"
	"net/http"
)

func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}
	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"http://localhost:3000"}, // Your frontend URL
		AllowMethods: []string{echo.GET, echo.POST, echo.PUT, echo.DELETE},
		AllowHeaders: []string{echo.HeaderContentType, echo.HeaderAuthorization},
	}))

	// Serve static files (adjust path as necessary)
	// e.Static("/uploads", "uploads")

	// Route to display the list of uploaded files (rendering logic removed)
	e.GET("/", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]interface{}{"files": states.Files.Filenames})
	})

	// Route for file upload
	e.POST("/upload", utils.Upload)

	// Route to serve a file (adjust file name and path as needed)
	e.GET("/file", func(c echo.Context) error {
		c.Attachment("celebi.png", "celebi.png")
		return c.String(http.StatusOK, "File served")
	})

	// Route to extract text from an image file (using OCR)
	e.POST("/get-text/:file", utils.GetText)

	// Route to edit a product
	e.POST("/edit/:file/:id", utils.EditProduct)

	// Route to update a product
	e.POST("/update/:file/:id", utils.UpdateProduct)

	// Route to delete a product
	e.DELETE("/:file/:id", utils.DeleteProduct)

	// Start the server
	e.Logger.Fatal(e.Start(":1323"))
}
