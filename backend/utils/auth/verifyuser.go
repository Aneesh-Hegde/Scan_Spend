package auth

import (
	"context"
	"fmt"
	"log"

	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"github.com/Aneesh-Hegde/expenseManager/utils/jwt"
)

func EmailToken(ctx context.Context, req *user.TokenRequest) (*user.TokenResponse, error) {
	email := req.GetEmail()
	username := req.GetUsername()
	token, err := jwt.GenerateToken(email, username)
	fmt.Println(token)
	if err != nil {
		log.Fatal(err)
		return &user.TokenResponse{
			Token:   "",
			Message: "Error in generating token",
		}, nil
	}
	return &user.TokenResponse{
		Token:   token,
		Message: "Token generated successfully",
	}, nil
}
