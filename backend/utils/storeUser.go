package utils

import (
	"context"
	"time"

	"github.com/Aneesh-Hegde/expenseManager/db"
)

// StoreUser saves a user into the database
func StoreUser(username, email, password string) error {
	query := `INSERT INTO users (username, email, password, created_at) VALUES ($1, $2, $3, $4)`
	_, err := db.DB.Exec(context.Background(), query, username, email, password, time.Now())
	return err
}
