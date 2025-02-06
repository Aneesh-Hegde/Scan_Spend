package auth

import (
	"context"
	"fmt"
	"github.com/Aneesh-Hegde/expenseManager/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"log"
)

func UserProfile(ctx context.Context, req *user.GetUserProfileRequest) (*user.UserProfile, error) {
	var userProfile user.UserProfile
	query := `SELECT user_id,username,email FROM users WHERE user_id=$1`
	err := db.DB.QueryRow(ctx, query, req.GetUserId()).Scan(&userProfile.UserId, &userProfile.Username, &userProfile.Email)
	if err != nil {
		log.Printf("Error fetching user profile: %v", err)
		return nil, fmt.Errorf("could not find user profile: %v", err)
	}

	return &userProfile, nil
}
