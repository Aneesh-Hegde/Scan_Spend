package data

import (
	"context"
	"fmt"
	"github.com/Aneesh-Hegde/expenseManager/db"
	files "github.com/Aneesh-Hegde/expenseManager/grpc_file"
	"github.com/Aneesh-Hegde/expenseManager/utils/jwt"
	"google.golang.org/grpc/metadata"
	"log"
	"strings"
)

func GetFiles(ctx context.Context, req *files.GetFileByUser) (*files.FileList, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, fmt.Errorf("no metadata in context")
	}

	// Retrieve the Authorization header from metadata
	authHeader := md["authentication"]
  refreshTokenHeader:=md["refresh_token"]
	if len(authHeader) == 0 {
		return nil, fmt.Errorf("authorization header is missing")
	}

	if len(refreshTokenHeader) == 0 {
		return nil, fmt.Errorf("refresh token header is missing")
	}

	// Extract the token from the "Bearer" string
	tokenfrommeta := authHeader[0] // "Bearer <token>"
	tokenfrommeta = strings.TrimPrefix(tokenfrommeta, "Bearer ")

  refresh_token:=refreshTokenHeader[0]

	// Print or use the token
	fmt.Println("Received token:", tokenfrommeta)
	fmt.Println("Refresh token:", refresh_token)

	token := req.GetToken()
	userId, err := jwt.ValidateJWT(token)
	fmt.Println(userId)
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	log.Println(userId)
	dbquery := `SELECT DISTINCT file_name FROM products WHERE user_id=$1`
	rows, err := db.DB.Query(context.Background(), dbquery, userId)
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	defer rows.Close()
	allfiles := &files.FileList{}
	for rows.Next() {
		var fileName string
		if err := rows.Scan(&fileName); err != nil {
			return nil, err
		}
		file := files.File{Filename: fileName}
		allfiles.Allfiles = append(allfiles.Allfiles, &file)
	}
	return allfiles, nil
}
