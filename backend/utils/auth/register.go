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
	hashedPassword, err := jwt.HashPassword(req.GetPassword())
	log.Print(string(hashedPassword))
	if err != nil {
		log.Printf("error hashing password: %v", err)
		return nil, err
	}

	query := `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id`
	var userID int
	err = db.DB.QueryRow(ctx, query, req.GetUsername(), req.GetEmail(), hashedPassword).Scan(&userID)
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
