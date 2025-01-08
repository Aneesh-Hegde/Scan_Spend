package utils

import (
	"fmt"
	"io"
	"os"
	"path/filepath"

	pb "github.com/Aneesh-Hegde/expenseManager/grpc"
	"github.com/Aneesh-Hegde/expenseManager/states"
)

type FileUploadServer struct {
	pb.UnimplementedFileProcessingServiceServer
}

func (s *FileUploadServer) Upload(stream pb.FileProcessingService_UploadServer) error {
	// Ensure the uploads directory exists
	uploadDir := "uploads"
	err := os.MkdirAll(uploadDir, os.ModePerm)
	if err != nil {
		return fmt.Errorf("Error creating upload directory: %v", err)
	}

	// Receive the first part of the stream to get the filename
	req, err := stream.Recv()
	if err != nil {
		return fmt.Errorf("Error receiving filename: %v", err)
	}

	// Save the file path to the upload directory
	filePath := filepath.Join(uploadDir, req.GetFilename())
	file, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("Error creating file: %v", err)
	}
	defer file.Close()

	// Start receiving file chunks and writing them to the file
	for {
		req, err := stream.Recv()
		if err == io.EOF {
			// End of stream
			break
		}
		if err != nil {
			return fmt.Errorf("Error receiving file content: %v", err)
		}

		// Write the content to the file
		_, err = file.Write(req.GetContent())
		if err != nil {
			return fmt.Errorf("Error writing file content: %v", err)
		}
	}

	// Append the uploaded filename to the list
	states.Files.Filenames = append(states.Files.Filenames, req.GetFilename())

	// Return a success JSON response with the filename
	return stream.SendAndClose(&pb.UploadResponse{
		Status:   "success",
		Message:  "File uploaded successfully",
		Filename: req.GetFilename(),
	})
}
