package utils

import (
	"fmt"
	"github.com/Aneesh-Hegde/expenseManager/states"
	"github.com/labstack/echo/v4"
	"io"
	"os"
)

func Upload(c echo.Context) error {
	// Read file from form data
	file, err := c.FormFile("file") // Make sure this key matches the frontend
	if err != nil {
		return c.JSON(400, map[string]string{"status": "error", "message": fmt.Sprintf("Error retrieving file: %v", err)})
	}

	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return c.JSON(500, map[string]string{"status": "error", "message": fmt.Sprintf("Error opening file: %v", err)})
	}
	defer src.Close()

	// Ensure the uploads directory exists
	uploadDir := "uploads"
	err = os.MkdirAll(uploadDir, os.ModePerm)
	if err != nil {
		return c.JSON(500, map[string]string{"status": "error", "message": fmt.Sprintf("Error creating directory: %v", err)})
	}

	// Create the destination file path
	dst, err := os.Create(fmt.Sprintf("%s/%s", uploadDir, file.Filename))
	if err != nil {
		return c.JSON(500, map[string]string{"status": "error", "message": fmt.Sprintf("Error creating file: %v", err)})
	}
	defer dst.Close()

	// Copy the content of the uploaded file to the destination file
	if _, err := io.Copy(dst, src); err != nil {
		return c.JSON(500, map[string]string{"status": "error", "message": fmt.Sprintf("Error copying file: %v", err)})
	}

	// Append the uploaded filename to the list
	states.Files.Filenames = append(states.Files.Filenames, file.Filename)
	// Return a success JSON response with the filename
	return c.JSON(200, map[string]string{"status": "success", "message": "Upload successful", "filename": file.Filename})
}
