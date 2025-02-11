package auth

import (
	"context"
	"fmt"
	"github.com/Aneesh-Hegde/expenseManager/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"github.com/Aneesh-Hegde/expenseManager/utils/jwt"
	"log"
)

func Register(ctx context.Context, req *user.RegisterUserRequest) (*user.UserResponse, error) {

	query := `INSERT INTO users (username, email) VALUES ($1, $2) RETURNING user_id`
	var userID int
  err := db.DB.QueryRow(ctx, query, req.GetUsername(), req.GetEmail()).Scan(&userID)
	if err != nil {
		log.Printf("error hashing password: %v", err)
		return nil, err
	}

	token, err := jwt.GenerateJWT(userID)
	if err != nil {
		log.Fatal(err)
	}

	return &user.UserResponse{
		Message: fmt.Sprintf("User registered successfully with ID: %d and token:%s", userID, token),
	}, nil
}
