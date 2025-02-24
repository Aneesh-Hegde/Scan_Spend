package auth

import (
	"context"
	"fmt"
	"log"

	"github.com/Aneesh-Hegde/expenseManager/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func UpdateUser(ctx context.Context, req *user.UpdateUserRequest) (*user.UserResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	if len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)

	}
	userId := md["user_id"][0]
	query := `UPDATE users SET username = $1, email = $2 WHERE user_id = $3`
	_, err := db.DB.Exec(ctx, query, req.GetUsername(), req.GetEmail(), userId)
	if err != nil {
		log.Printf("Error updating user: %v", err)
		return nil, fmt.Errorf("could not update user: %v", err)
	}

	// Update user information in the database

	return &user.UserResponse{
		Message: "User information updated successfully",
	}, nil
}
