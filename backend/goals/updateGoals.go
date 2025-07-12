package goals

import (
	"context"
	"fmt"
	"github.com/Aneesh-Hegde/expenseManager/db"
	goals "github.com/Aneesh-Hegde/expenseManager/grpc_goal"
	"github.com/jackc/pgx/v5"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func UpdateGoals(ctx context.Context, req *goals.UpdateGoalRequest) (*goals.UpdateResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	// Propagate token header if present
	if len(md["token"]) > 0 && len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}
	userId := md["user_id"][0] // Authenticated user ID

	// Validate required input
	if req.GetId() == "" {
		return nil, fmt.Errorf("Goal ID is required for updating progress")
	}
	if req.GetAmount() < 0 {
		return nil, fmt.Errorf("Amount cannot be negative")
	}

	// Start a database transaction
	tx, err := db.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("Failed to start transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	// Get current amount and verify goal ownership
	var currentAmount float64
	var goalName string
	getCurrentQuery := `
		SELECT current_amount, name 
		FROM goals 
		WHERE id = $1 AND user_id = $2`
	
	err = tx.QueryRow(ctx, getCurrentQuery, req.GetId(), userId).Scan(&currentAmount, &goalName)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("Goal with ID '%s' not found or not owned by user", req.GetId())
		}
		return nil, fmt.Errorf("Failed to fetch current goal amount: %w", err)
	}

	// Calculate amount difference
	amountDiff := req.GetAmount() - currentAmount

	// Update goal amount
	updateGoalQuery := `
		UPDATE goals
		SET current_amount = $1
		WHERE id = $2 AND user_id = $3
		RETURNING id`
	
	var updatedID string
	err = tx.QueryRow(ctx, updateGoalQuery, req.GetAmount(), req.GetId(), userId).Scan(&updatedID)
	if err != nil {
		return nil, fmt.Errorf("Failed to update goal progress: %w", err)
	}

	// Handle balance transfer if there's an amount difference and balance_id is provided
	if amountDiff != 0 && req.GetBalanceId() != 0 {
		// Verify balance ownership and get current balance
		var currentBalance float64
		var balanceDescription string
		getBalanceQuery := `
			SELECT amount, description 
			FROM incomes 
			WHERE income_id = $1 AND user_id = $2`
		
		err = tx.QueryRow(ctx, getBalanceQuery, req.GetBalanceId(), userId).Scan(&currentBalance, &balanceDescription)
		if err != nil {
			if err == pgx.ErrNoRows {
				return nil, fmt.Errorf("Balance account not found or not owned by user")
			}
			return nil, fmt.Errorf("Failed to fetch balance information: %w", err)
		}

		// Check for sufficient funds if adding money to goal
		if req.GetTransactionType() == "deposit" && currentBalance < amountDiff {
			return nil, fmt.Errorf("Insufficient funds in account '%s'. Available: %.2f, Required: %.2f", 
				balanceDescription, currentBalance, amountDiff)
		}

		// Create goal transaction record
		insertTransactionQuery := `
			INSERT INTO goal_transactions (goal_id, balance_id, amount, transaction_type, notes)
			VALUES ($1, $2, $3, $4, $5)`
		
		notes := req.GetNotes()
		if notes == "" {
			if req.GetTransactionType() == "deposit" {
				notes = fmt.Sprintf("Transfer from %s to goal '%s': %.2f → %.2f", 
					balanceDescription, goalName, currentAmount, req.GetAmount())
			} else {
				notes = fmt.Sprintf("Refund from goal '%s' to %s: %.2f → %.2f", 
					goalName, balanceDescription, currentAmount, req.GetAmount())
			}
		}

		_, err = tx.Exec(ctx, insertTransactionQuery, req.GetId(), req.GetBalanceId(), 
			amountDiff, req.GetTransactionType(), notes)
		if err != nil {
			return nil, fmt.Errorf("Failed to create transaction record: %w", err)
		}

		// Update balance account
		// For deposit to goal: subtract from balance
		// For withdrawal from goal: add to balance
		var balanceChange float64
		if req.GetTransactionType() == "deposit" {
			balanceChange = -amountDiff
		} else {
			balanceChange = amountDiff
		}

		updateBalanceQuery := `
			UPDATE incomes 
			SET amount = amount + $1, last_updated = NOW() 
			WHERE income_id = $2 AND user_id = $3`
		
		_, err = tx.Exec(ctx, updateBalanceQuery, balanceChange, req.GetBalanceId(), userId)
		if err != nil {
			return nil, fmt.Errorf("Failed to update balance account: %w", err)
		}
	}

	// Commit the transaction
	err = tx.Commit(ctx)
	if err != nil {
		return nil, fmt.Errorf("Failed to commit transaction: %w", err)
	}

	// Create success message
	var message string
	if amountDiff == 0 {
		message = fmt.Sprintf("Goal '%s' updated successfully (no amount change)", goalName)
	} else if req.GetBalanceId() == 0 {
		message = fmt.Sprintf("Goal '%s' amount updated to %.2f (no balance transfer)", goalName, req.GetAmount())
	} else {
		if req.GetTransactionType() == "deposit" {
			message = fmt.Sprintf("Goal '%s' updated: %.2f transferred from account", goalName, amountDiff)
		} else {
			message = fmt.Sprintf("Goal '%s' updated: %.2f refunded to account", goalName, -amountDiff)
		}
	}

	return &goals.UpdateResponse{
		Message: message,
	}, nil
}
