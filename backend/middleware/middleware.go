package middleware

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"

	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/Aneesh-Hegde/expenseManager/utils/jwt"
	// "google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

// middleware to validate refresh and access token
func AuthInterceptor(ctx context.Context) (context.Context, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	fmt.Println(md)
	if !ok {
		return nil, fmt.Errorf("Error in getting the metadata")
	}

	authHeaders := md["authentication"]
	refreshTokenHeaders := md["refresh_token"]

	if len(authHeaders) == 0 || len(refreshTokenHeaders) == 0 {
		return nil, fmt.Errorf("authentication or refresh token missing")
	}
	requestAccessToken := strings.TrimPrefix(authHeaders[0], "Bearer ")
	refreshToken := refreshTokenHeaders[0]

	var userId int
	var err error
	var accessToken string

	userId, err = jwt.ValidateJWT(requestAccessToken)
  fmt.Println(err)
	if err != nil && err.Error() != "token expired" {
		return nil, fmt.Errorf("Invalid tokens passed:%v", err)
	}
	if err != nil {
		log.Println("Invalid or expired access token:", err)
		accessToken, userId, err = refreshAccessToken(refreshToken)
		if err != nil {
			return nil, fmt.Errorf("failed to refresh access token: %v", err)
		}
	}
	headers := metadata.New(map[string]string{"user_id": strconv.Itoa(userId), "token": accessToken, "prev_token": requestAccessToken})
	fmt.Println(headers)
	newCtx := metadata.NewIncomingContext(ctx, headers)

	return newCtx, nil
}

// Refreshes a access token using the refresh token
func refreshAccessToken(refreshToken string) (string, int, error) {
	userIdStr, err := redis.GetRefreshToken(refreshToken)
	if err != nil {
		return "", 0, fmt.Errorf("failed to get user ID from refresh token: %v", err)
	}

	userId, err := strconv.Atoi(userIdStr)
	if err != nil {
		return "", 0, fmt.Errorf("invalid user ID in refresh token: %v", err)
	}

	newAccessToken, err := jwt.GenerateJWT(userId)
	if err != nil {
		return "", 0, fmt.Errorf("failed to generate new access token: %v", err)
	}

	fmt.Printf("Generated new access token: %s\n", newAccessToken)
	return newAccessToken, userId, nil
}
