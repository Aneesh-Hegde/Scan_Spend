package auth

import (
	"context"
	userDB "github.com/Aneesh-Hegde/expenseManager/services/user/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"log"
)

func UpdateUser(ctx context.Context, req *user.UpdateUserRequest) (*user.UserResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)

	if len(md["token"]) > 0 && len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}

	userId := md["user_id"][0]
	err := userDB.UpdateUser(ctx, userId, req.GetUsername(), req.GetEmail())
	if err != nil {
		log.Printf("Error updating user: %v", err)
		return nil, err
	}

	return &user.UserResponse{
		Message: "User information updated successfully",
	}, nil
}
