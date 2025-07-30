package auth

import (
	"context"
	"fmt"
	userDB "github.com/Aneesh-Hegde/expenseManager/services/user/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"github.com/Aneesh-Hegde/expenseManager/services/user/jwt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"log"
)

func Register(ctx context.Context, req *user.RegisterUserRequest) (*user.UserResponse, error) {
	fmt.Println(req.GetUsername(), req.GetEmail())

	userID, err := userDB.CreateUser(ctx, req.GetUsername(), req.GetEmail())
	if err != nil {
		log.Printf("error creating user: %v", err)
		return nil, err
	}

	token, err := jwt.GenerateJWT(int(userID))
	if err != nil {
		log.Print(err)
	}

	refreshToken, err := jwt.GenerateRefreshToken()
	headers := metadata.Pairs("refresh_token", refreshToken)
	grpc.SendHeader(ctx, headers)

	return &user.UserResponse{
		Message: fmt.Sprintf("User registered successfully with ID: %d and token:%s", userID, token),
	}, nil
}
