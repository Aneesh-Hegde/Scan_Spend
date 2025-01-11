package utils

import (
	"fmt"
	"github.com/labstack/echo/v4"
	"io"
	"os"
	"path/filepath"
)

func Upload(c echo.Context) error {
	// Ensure the upload directory exists
	uploadDir := "uploads"
	err := os.MkdirAll(uploadDir, os.ModePerm)
	if err != nil {
		fmt.Println("Error creating upload directory:", err) // Log error
		return c.String(500, fmt.Sprintf("Error creating upload directory: %v", err))
	}

	// Get the file from the request
	file, err := c.FormFile("file") // "file" is the field name in FormData
	if err != nil {
		fmt.Println("Error getting file:", err) // Log error
		return c.String(400, fmt.Sprintf("Error getting file: %v", err))
	}

	// Log that the file is received
	fmt.Println("File received:", file.Filename)

	// Get other fields like chunk_number, total_chunks, filename
	chunkNumber := c.FormValue("chunk_number")
	totalChunks := c.FormValue("total_chunks")
	filename := c.FormValue("filename")

	// Log chunk data
	fmt.Println("Chunk Number:", chunkNumber)
	fmt.Println("Total Chunks:", totalChunks)
	fmt.Println("Filename:", filename)

	// Process the file chunk
	filePath := filepath.Join(uploadDir, filename)

	// Open the file in append mode to add chunks
	outFile, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		fmt.Println("Error opening file:", err) // Log error
		return c.String(500, fmt.Sprintf("Error opening file: %v", err))
	}
	defer outFile.Close()

	// Open the incoming file chunk for reading
	inFile, err := file.Open()
	if err != nil {
		fmt.Println("Error opening uploaded file:", err) // Log error
		return c.String(500, fmt.Sprintf("Error opening uploaded file: %v", err))
	}
	defer inFile.Close()

	// Copy the chunk to the file
	_, err = io.Copy(outFile, inFile)
	if err != nil {
		fmt.Println("Error saving file:", err) // Log error
		return c.String(500, fmt.Sprintf("Error saving file: %v", err))
	}

	// Log that the upload is successful
	fmt.Println("File uploaded successfully:", file.Filename)

	// Respond to the client
	return c.String(200, fmt.Sprintf("File uploaded successfully (chunk %s/%s)", chunkNumber, totalChunks))
}
