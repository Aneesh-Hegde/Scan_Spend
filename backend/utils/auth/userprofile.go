package auth

import (
	"context"
	"fmt"
	"log"

	"github.com/Aneesh-Hegde/expenseManager/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"github.com/Aneesh-Hegde/expenseManager/utils/jwt"
)

func UserProfile(ctx context.Context, req *user.GetUserProfileRequest) (*user.UserProfile, error) {
	var userProfile user.UserProfile
	query := `SELECT user_id,username,email FROM users WHERE user_id=$1`
	userId, _ := jwt.ValidateJWT(req.GetUserId())
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
