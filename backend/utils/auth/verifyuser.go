package auth

import (
	"context"
	"fmt"
	"log"

	"github.com/Aneesh-Hegde/expenseManager/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"github.com/Aneesh-Hegde/expenseManager/utils/jwt"
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
	dbQuery := `UPDATE users SET is_verified=TRUE WHERE email=$1`
	_, err = db.DB.Exec(ctx, dbQuery, email)
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
