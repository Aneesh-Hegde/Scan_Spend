package auth

import (
	"context"
	"fmt"
	"log"
	"strconv"

	"github.com/Aneesh-Hegde/expenseManager/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func UserProfile(ctx context.Context, req *user.GetUserProfileRequest) (*user.UserProfile, error) {
	var userProfile user.UserProfile
	md, _ := metadata.FromIncomingContext(ctx)
	query := `SELECT user_id,username,email FROM users WHERE user_id=$1`
	userId, _ := strconv.Atoi(md["user_id"][0])
	if len(md["token"][0]) > 0 {

		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}
	var id int32
	var username string
	var email string
	err := db.DB.QueryRow(ctx, query, userId).Scan(&id, &username, &email)
	if err != nil {
		log.Printf("Error fetching user profile: %v", err)
		return nil, fmt.Errorf("could not find user profile: %v", err)
	}
	userProfile.UserId = id
	userProfile.Username = username
	userProfile.Email = email

	return &userProfile, nil
}
