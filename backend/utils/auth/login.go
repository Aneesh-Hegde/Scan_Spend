package auth

import (
	"context"
	"fmt"
	"github.com/Aneesh-Hegde/expenseManager/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"github.com/Aneesh-Hegde/expenseManager/utils/jwt"
)

func Login(ctx context.Context, req *user.LoginUserRequest) (*user.LoginResponse, error) {
	var userID int
	query := `SELECT user_id FROM users WHERE email = $1`
	err := db.DB.QueryRow(ctx, query, req.GetEmail()).Scan(&userID)
	if err != nil {
		return nil, fmt.Errorf("invalid credentials: %v", err)
	}

	token, err := jwt.GenerateJWT(userID)
	if err != nil {
		return nil, fmt.Errorf("could not generate token: %v", err)
	}

	return &user.LoginResponse{
		Token: token,
	}, nil
}
