package models

import "time"

type User struct {
	UserID       int       `json:"user_id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"password_hash"`
	CreatedAt    time.Time `json:"created_at"`
}

type Category struct {
	CategoryID int    `json:"category_id"`
	Name       string `json:"name"`
}

type Product struct {
	ProductID   int       `json:"product_id"`
	UserID      int       `json:"user_id"`
	CategoryID  int       `json:"category_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Price       float64   `json:"price"`
	DateAdded   time.Time `json:"date_added"`
}

type Expense struct {
	ExpenseID   int       `json:"expense_id"`
	UserID      int       `json:"user_id"`
	ProductID   int       `json:"product_id"`
	Quantity    int       `json:"quantity"`
	ExpenseDate time.Time `json:"expense_date"`
	Total       float64   `json:"total"`
}

type Transaction struct {
	TransactionID int       `json:"transaction_id"`
	UserID        int       `json:"user_id"`
	ExpenseID     int       `json:"expense_id"`
	PaymentMethod string    `json:"payment_method"`
	PaymentDate   time.Time `json:"payment_date"`
}
