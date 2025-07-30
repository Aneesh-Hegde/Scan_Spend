package auth

import (
	"context"
	"fmt"
	userDB "github.com/Aneesh-Hegde/expenseManager/services/user/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"log"
)

func UserProfile(ctx context.Context, req *user.GetUserProfileRequest) (*user.UserProfile, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	fmt.Println(md)

	if len(md["token"]) > 0 && len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}

	userId := md["user_id"][0]
	id, username, email, err := userDB.GetUserProfile(ctx, userId)
	if err != nil {
		log.Printf("Error fetching user profile: %v", err)
		return nil, err
	}

	return &user.UserProfile{
		UserId:   id,
		Username: username,
		Email:    email,
	}, nil
}
