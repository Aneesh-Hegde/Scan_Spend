package auth

import (
	"context"
	"fmt"
	userDB "github.com/Aneesh-Hegde/expenseManager/services/user/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"github.com/Aneesh-Hegde/expenseManager/services/user/jwt"
	"log"
)

func EmailToken(ctx context.Context, req *user.TokenRequest) (*user.TokenResponse, error) {
	email := req.GetEmail()
	username := req.GetUsername()
	token, err := jwt.GenerateEmailToken(email, username)
	fmt.Println(token)
	if err != nil {
		log.Print(err)
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

func VerifyEmail(ctx context.Context, req *user.VerifyRequest) (*user.VerifyResponse, error) {
	token := req.GetToken()
	email, err := jwt.ValidateEmailToken(token)
	if err != nil {
		log.Print("Token is expired for email verification")
		return &user.VerifyResponse{
			Validation: false,
		}, nil
	}

	err = userDB.VerifyUser(ctx, email)
	if err != nil {
		log.Print("Error in making email verified")
		return &user.VerifyResponse{
			Validation: false,
		}, nil
	}

	return &user.VerifyResponse{
		Validation: true,
	}, nil
}
