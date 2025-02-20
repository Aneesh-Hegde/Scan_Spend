package auth

import (
	"context"
	"fmt"
	"github.com/Aneesh-Hegde/expenseManager/db"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"github.com/Aneesh-Hegde/expenseManager/utils"
	"github.com/Aneesh-Hegde/expenseManager/utils/jwt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
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

	refreshToken, err := utils.GenerateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("could not generate refresh token: %v", err)
	}

	err = redis.CacheRefreshToken(refreshToken, userID)
	if err != nil {
		return nil, fmt.Errorf("could not cache refresh token: %v", err)
	}
	headers := metadata.Pairs(
		"refresh_token", refreshToken,
	)
	if err := grpc.SendHeader(ctx, headers); err != nil {
		return nil, err
	}
	fmt.Println("Response send")
	return &user.LoginResponse{
		Token: token,
	}, nil
}
