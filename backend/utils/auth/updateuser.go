package auth

import (
	"context"
	"fmt"
	"github.com/Aneesh-Hegde/expenseManager/db"
	user "github.com/Aneesh-Hegde/expenseManager/user_grpc"
	"github.com/Aneesh-Hegde/expenseManager/utils/jwt"
	"log"
)

func UpdateUser(ctx context.Context, req *user.UpdateUserRequest) (*user.UserResponse, error) {
	// Hash the new password if it's provided
	var hashedPassword string
	userId, err := jwt.ValidateJWT(req.GetUserId())
	if err != nil {
		log.Printf("Error translating userId: %v", err)
		return nil, fmt.Errorf("could not hash password: %v", err)
	}
	if req.GetPassword() != "" {
		var err error
		hashedPassword, err = jwt.HashPassword(req.GetPassword())
		if err != nil {
			log.Printf("Error hashing password: %v", err)
			return nil, fmt.Errorf("could not hash password: %v", err)
		}
		query := `UPDATE users SET username = $1, email = $2, password_hash = $3 WHERE user_id = $4`
		_, err = db.DB.Exec(ctx, query, req.GetUsername(), req.GetEmail(), hashedPassword, userId)
		if err != nil {
			log.Printf("Error updating user: %v", err)
			return nil, fmt.Errorf("could not update user: %v", err)
		}
	} else {

		query := `UPDATE users SET username = $1, email = $2 WHERE user_id = $3`
		_, err := db.DB.Exec(ctx, query, req.GetUsername(), req.GetEmail(), userId)
		if err != nil {
			log.Printf("Error updating user: %v", err)
			return nil, fmt.Errorf("could not update user: %v", err)
		}
	}

	// Update user information in the database

	return &user.UserResponse{
		Message: "User information updated successfully",
	}, nil
}
