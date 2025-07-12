package goals

import (
	"context"
	"fmt"
	"github.com/Aneesh-Hegde/expenseManager/db"
	goals "github.com/Aneesh-Hegde/expenseManager/grpc_goal"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"time"
)
func GoalTransactions(ctx context.Context, req *goals.GetGoalTransactionsRequest) (*goals.GetGoalTransactionsResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	// Propagate token header if present
	if len(md["token"]) > 0 && len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}
	userId := md["user_id"][0] // Authenticated user ID

	// Validate required input
	if req.GetGoalId() == "" {
		return nil, fmt.Errorf("Goal ID is required")
	}

	// First verify that the goal exists and belongs to the user
	var goalExists bool
	checkGoalQuery := `
		SELECT EXISTS(
			SELECT 1 FROM goals 
			WHERE id = $1 AND user_id = $2
		)`
	
	err := db.DB.QueryRow(ctx, checkGoalQuery, req.GetGoalId(), userId).Scan(&goalExists)
	if err != nil {
		return nil, fmt.Errorf("Failed to verify goal ownership: %w", err)
	}
	
	if !goalExists {
		return nil, fmt.Errorf("Goal with ID '%s' not found or not owned by user", req.GetGoalId())
	}

	// Get all transactions for the goal
	getTransactionsQuery := `
		SELECT 
			gt.id,
			gt.goal_id,
			gt.balance_id,
			gt.amount,
			gt.transaction_type,
			gt.created_at,
			gt.notes
		FROM goal_transactions gt
		INNER JOIN goals g ON gt.goal_id = g.id
		WHERE gt.goal_id = $1 AND g.user_id = $2
		ORDER BY gt.created_at DESC`

	rows, err := db.DB.Query(ctx, getTransactionsQuery, req.GetGoalId(), userId)
	if err != nil {
		return nil, fmt.Errorf("Failed to fetch goal transactions: %w", err)
	}
	defer rows.Close()

	var transactions []*goals.GoalTransaction
	for rows.Next() {
		var transaction goals.GoalTransaction
		var createdAt time.Time

		err := rows.Scan(
			&transaction.Id,
			&transaction.GoalId,
			&transaction.BalanceId,
			&transaction.Amount,
			&transaction.TransactionType,
			&createdAt,
			&transaction.Notes,
		)
		if err != nil {
			return nil, fmt.Errorf("Failed to scan transaction row: %w", err)
		}

		transaction.CreatedAt = createdAt.Format("2006-01-02 15:04:05")
		transactions = append(transactions, &transaction)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("Error iterating transaction rows: %w", err)
	}

	return &goals.GetGoalTransactionsResponse{
		Transactions: transactions,
	}, nil
}
