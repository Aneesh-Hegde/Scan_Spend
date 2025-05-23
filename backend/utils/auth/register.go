package auth

import (
	"context"
	"fmt"
	"github.com/Aneesh-Hegde/expenseManager/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"github.com/Aneesh-Hegde/expenseManager/utils"
	"github.com/Aneesh-Hegde/expenseManager/utils/jwt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"log"
)

func Register(ctx context.Context, req *user.RegisterUserRequest) (*user.UserResponse, error) {
  fmt.Println(req.GetUsername(), req.GetEmail())
	query := `INSERT INTO users (username, email) VALUES ($1, $2) RETURNING user_id`
	var userID int
	err := db.DB.QueryRow(ctx, query, req.GetUsername(), req.GetEmail()).Scan(&userID)
	if err != nil {
		log.Printf("error hashing password: %v", err)
		return nil, err
	}

	token, err := jwt.GenerateJWT(userID)
	if err != nil {
		log.Print(err)
	}
	refreshToken, err := utils.GenerateRefreshToken()
	headers := metadata.Pairs("refresh_token", refreshToken)
	grpc.SendHeader(ctx, headers)
	return &user.UserResponse{
		Message: fmt.Sprintf("User registered successfully with ID: %d and token:%s", userID, token),
	}, nil
}
