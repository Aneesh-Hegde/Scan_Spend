package db

import (
    "context"
    "fmt"
    "strconv"
    sharedDB "github.com/Aneesh-Hegde/expenseManager/shared/db"
)

func parseUserID(userID string) (int32, error) {
    id, err := strconv.ParseInt(userID, 10, 32)
    if err != nil {
        return 0, fmt.Errorf("invalid user ID: %v", err)
    }
    return int32(id), nil
}

func CreateUser(ctx context.Context, username, email string) (int32, error) {
    var userID int32
    err := sharedDB.GetDB().QueryRow(ctx,
        "INSERT INTO user_service.users (username, email) VALUES ($1, $2) RETURNING user_id",
        username, email).Scan(&userID)
    if err != nil {
        return 0, fmt.Errorf("failed to create user: %v", err)
    }
    return userID, nil
}

func GetUserByEmail(ctx context.Context, email string) (int32, error) {
    var userID int32
    err := sharedDB.GetDB().QueryRow(ctx,
        "SELECT user_id FROM user_service.users WHERE email = $1",
        email).Scan(&userID)
    if err != nil {
        return 0, fmt.Errorf("invalid credentials: %v", err)
    }
    return userID, nil
}

func UpdateUser(ctx context.Context, userID, username, email string) error {
    userIDInt, err := parseUserID(userID)
    if err != nil {
        return err
    }

    _, err = sharedDB.GetDB().Exec(ctx,
        "UPDATE user_service.users SET username = $1, email = $2 WHERE user_id = $3",
        username, email, userIDInt)
    if err != nil {
        return fmt.Errorf("could not update user: %v", err)
    }
    return nil
}

func GetUserProfile(ctx context.Context, userID string) (int32, string, string, error) {
    userIDInt, err := parseUserID(userID)
    if err != nil {
        return 0, "", "", err
    }

    var id int32
    var username, email string
    err = sharedDB.GetDB().QueryRow(ctx,
        "SELECT user_id, username, email FROM user_service.users WHERE user_id = $1",
        userIDInt).Scan(&id, &username, &email)
    if err != nil {
        return 0, "", "", fmt.Errorf("could not find user profile: %v", err)
    }
    return id, username, email, nil
}

func VerifyUser(ctx context.Context, email string) error {
    _, err := sharedDB.GetDB().Exec(ctx,
        "UPDATE user_service.users SET is_verified = TRUE WHERE email = $1",
        email)
    if err != nil {
        return fmt.Errorf("error verifying user: %v", err)
    }
    return nil
}

