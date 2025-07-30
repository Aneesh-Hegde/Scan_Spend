package db

import (
	"context"
	"database/sql"
	"fmt"
	sharedDB "github.com/Aneesh-Hegde/expenseManager/shared/db"
	"strconv"
	"time"
)

// CreateAccountWithIncome creates a new account with initial income
func CreateAccountWithIncome(ctx context.Context, userID, accountName, source string, amount float64) (int32, error) {
	var balanceID int32
	err := sharedDB.GetDB().QueryRow(ctx,
		"SELECT account_income_service.create_account_with_income($1, $2, $3, $4)",
		userID, accountName, source, amount,
	).Scan(&balanceID)
	if err != nil {
		return 0, fmt.Errorf("failed to create account: %v", err)
	}
	return balanceID, nil
}

// InsertIncome inserts new income record
func InsertIncome(ctx context.Context, userID, source string, amount float64, accountName string) (int32, error) {
	var incomeID int32
	err := sharedDB.GetDB().QueryRow(ctx,
		"SELECT account_income_service.insert_income($1, $2, $3, $4)",
		userID, source, amount, accountName,
	).Scan(&incomeID)
	if err != nil {
		return 0, fmt.Errorf("failed to insert income: %v", err)
	}
	return incomeID, nil
}

// BalanceResult represents a balance record
type BalanceResult struct {
	BalanceID     int32
	UserID        int
	BalanceSource string
	Amount        float64
}

// GetUserBalances retrieves all balances for a user
func GetUserBalances(ctx context.Context, userID string) ([]BalanceResult, error) {
	fmt.Printf("%T\n", userID)
	rows, err := sharedDB.GetDB().Query(ctx,
		"SELECT * FROM account_income_service.get_user_balances($1)",
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query balances: %v", err)
	}
	defer rows.Close()

	var balances []BalanceResult
	for rows.Next() {
		var balance BalanceResult
		if err := rows.Scan(&balance.BalanceID, &balance.UserID, &balance.BalanceSource, &balance.Amount); err != nil {
			return nil, fmt.Errorf("failed to scan balance: %v", err)
		}
		balances = append(balances, balance)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating balances: %v", err)
	}

	return balances, nil
}

// IncomeResult represents an income record
type IncomeResult struct {
	IncomeID      int32
	UserID        int32
	AccountID     int32
	BalanceSource string
	Amount        float64
	Description   sql.NullString
	DateAdded     time.Time
	LastUpdated   time.Time
}

// GetUserIncomes retrieves all incomes for a user
func GetUserIncomes(ctx context.Context, userID string) ([]IncomeResult, error) {
	rows, err := sharedDB.GetDB().Query(ctx,
		"SELECT * FROM account_income_service.get_user_incomes($1)",
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query incomes: %v", err)
	}
	defer rows.Close()

	var incomes []IncomeResult
	for rows.Next() {
		var income IncomeResult
		if err := rows.Scan(
			&income.IncomeID,
			&income.UserID,
			&income.AccountID,
			&income.Description,
			&income.Amount,
			&income.BalanceSource,
			&income.DateAdded,
			&income.LastUpdated,
		); err != nil {
			return nil, fmt.Errorf("failed to scan income: %v", err)
		}
		incomes = append(incomes, income)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating incomes: %v", err)
	}

	return incomes, nil
}

// TransferResult represents a transfer record
type TransferResult struct {
	TransferID int32
	UserID     int32
	FromSource string
	ToSource   string
	Amount     float64
	Date       time.Time
}

// GetUserTransfers retrieves all transfers for a user
func GetUserTransfers(ctx context.Context, userID string) ([]TransferResult, error) {
	rows, err := sharedDB.GetDB().Query(ctx,
		"SELECT * FROM transfer_service.get_user_transfers($1)",
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to query transfers: %v", err)
	}
	defer rows.Close()

	var transfers []TransferResult
	for rows.Next() {
		var transfer TransferResult
		if err := rows.Scan(
			&transfer.TransferID,
			&transfer.UserID,
			&transfer.FromSource,
			&transfer.ToSource,
			&transfer.Amount,
			&transfer.Date,
		); err != nil {
			return nil, fmt.Errorf("failed to scan transfer: %v", err)
		}
		transfers = append(transfers, transfer)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating transfers: %v", err)
	}

	return transfers, nil
}

// UpdateAccountBalance updates balance for an account
func UpdateAccountBalance(ctx context.Context, balanceID int32, userID string, amount float64) (int32, int, float64, error) {
	var resultBalanceID int32
	var dbUserID int
	var resultAmount float64

	userIDInt, err := strconv.ParseInt(userID, 10, 32)
	err = sharedDB.GetDB().QueryRow(ctx,
		"SELECT * FROM account_income_service.update_account_balance($1, $2, $3)",
		balanceID, int32(userIDInt), amount,
	).Scan(&resultBalanceID, &dbUserID, &resultAmount)

	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to update balance: %v", err)
	}

	return resultBalanceID, dbUserID, resultAmount, nil
}

// UpdateIncome updates an income record
func UpdateIncome(ctx context.Context, incomeID int32, userID string, amount float64) (int32, int, float64, error) {
	var resultIncomeID int32
	var dbUserID int
	var resultAmount float64
	fmt.Println(incomeID,userID,amount)

	userIDInt, err := strconv.ParseInt(userID, 10, 32)
	err = sharedDB.GetDB().QueryRow(ctx,
		"SELECT * FROM account_income_service.update_income($1, $2, $3)",
		incomeID, int32(userIDInt), amount,
	).Scan(&resultIncomeID, &dbUserID, &resultAmount)

	if err != nil {
		return 0, 0, 0, fmt.Errorf("failed to update income: %v", err)
	}

	return resultIncomeID, dbUserID, resultAmount, nil
}
