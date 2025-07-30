package auth

import (
	"context"
	"fmt"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	userDB "github.com/Aneesh-Hegde/expenseManager/services/user/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"github.com/Aneesh-Hegde/expenseManager/services/user/jwt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func Login(ctx context.Context, req *user.LoginUserRequest) (*user.LoginResponse, error) {
	userID, err := userDB.GetUserByEmail(ctx, req.GetEmail())
	if err != nil {
		return nil, err
	}

	token, err := jwt.GenerateJWT(int(userID))
	if err != nil {
		return nil, fmt.Errorf("could not generate token: %v", err)
	}

	refreshToken, err := jwt.GenerateRefreshToken()
	if err != nil {
		return nil, fmt.Errorf("could not generate refresh token: %v", err)
	}

	err = redis.CacheRefreshToken(refreshToken, int(userID))
	if err != nil {
		return nil, fmt.Errorf("could not cache refresh token: %v", err)
	}

	headers := metadata.Pairs("refresh_token", refreshToken)
	if err := grpc.SendHeader(ctx, headers); err != nil {
		return nil, err
	}

	fmt.Println("Response send")
	return &user.LoginResponse{
		Token: token,
	}, nil
}
