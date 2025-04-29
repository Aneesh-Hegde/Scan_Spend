package data

import (
	"context"
	"fmt"
	"log"
	// "strings"

	"strconv"

	"github.com/Aneesh-Hegde/expenseManager/db"
	files "github.com/Aneesh-Hegde/expenseManager/grpc_file"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

// Retrieve files from DB for a given user
func getFilesFromDB(ctx context.Context, userId int) (*files.FileList, error) {
	query := `SELECT DISTINCT file_name FROM products WHERE user_id = $1 and file_name != 'manual-entry'`
	rows, err := db.DB.Query(ctx, query, userId) // 🔹 Use ctx from request
	if err != nil {
		log.Println("Error fetching files from DB:", err)
		return nil, err
	}
	defer rows.Close()

	var fileList files.FileList
	for rows.Next() {
		var fileName string
		if err := rows.Scan(&fileName); err != nil {
			return nil, fmt.Errorf("error scanning file name: %v", err)
		}
		fileList.Allfiles = append(fileList.Allfiles, &files.File{Filename: fileName})
	}
	return &fileList, nil
}

// // Extract metadata safely
// func extractMetadata(ctx context.Context) (string, string, error) {
// 	md, ok := metadata.FromIncomingContext(ctx)
// 	if !ok {
// 		return "", "", fmt.Errorf("no metadata in context")
// 	}
//
// 	authHeaders := md["authentication"]
// 	refreshTokenHeaders := md["refresh_token"]
//
// 	if len(authHeaders) == 0 && len(refreshTokenHeaders) == 0 {
// 		return "", "", fmt.Errorf("no authentication or refresh token headers found")
// 	}
// 	if len(refreshTokenHeaders) == 0 {
// 		return "", "", fmt.Errorf("refresh token header is missing")
// 	}
//
// 	authToken := strings.TrimPrefix(authHeaders[0], "Bearer ")
// 	refreshToken := refreshTokenHeaders[0]
//
// 	return authToken, refreshToken, nil
// }

// Main gRPC function

func GetFiles(ctx context.Context, req *files.GetFileByUser) (*files.FileList, error) {
	// Extract user_id from context (set by interceptor)
	md, _ := metadata.FromIncomingContext(ctx)
	fmt.Println(md)
	userIdStr := md.Get("user_id")
  accessToken:=md.Get("token")
  if len(accessToken)>0{
    headers:=metadata.Pairs("token",accessToken[0])
    grpc.SendHeader(ctx,headers)
  }
	if len(userIdStr) == 0 {
		return nil, fmt.Errorf("user ID not found in context")
	}

	userId, err := strconv.Atoi(userIdStr[0])
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %v", err)
	}

	log.Println("Fetching files for user ID:", userId)
	return getFilesFromDB(ctx, userId)
}
