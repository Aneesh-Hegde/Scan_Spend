package goals

import (
	"context"
	"fmt"
	"time"

	"github.com/Aneesh-Hegde/expenseManager/db"
	goals "github.com/Aneesh-Hegde/expenseManager/grpc_goal"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func CreateGoals(ctx context.Context, req *goals.CreateGoalRequest) (*goals.CreateGoalResponse, error) {
	// Extract metadata (token and user_id)
	md, _ := metadata.FromIncomingContext(ctx)
	fmt.Println(md)
	
	// Safe metadata access with bounds checking
	var userId string
	if userIds, ok := md["user_id"]; ok && len(userIds) > 0 {
		userId = userIds[0]
	} else {
		return nil, fmt.Errorf("user_id not found in metadata")
	}
	
	if tokens, ok := md["token"]; ok && len(tokens) > 0 && tokens[0] != "" {
		headers := metadata.Pairs("token", tokens[0])
		grpc.SendHeader(ctx, headers)
	}

	// Parse the deadline string to time.Time
	deadline, err := time.Parse("2006-01-02", req.Deadline)
	if err != nil {
		return nil, fmt.Errorf("Error parsing deadline: %v", err)
	}

	// Parse the createdAt string to time.Time (if provided, otherwise use current time)
	var createdAt time.Time
	if req.CreatedAt != "" {
		// Try parsing ISO 8601 format first (2025-05-30T18:06:01.589Z)
		createdAt, err = time.Parse(time.RFC3339, req.CreatedAt)
		if err != nil {
			// Fallback to simple date format (2006-01-02)
			createdAt, err = time.Parse("2006-01-02", req.CreatedAt)
			if err != nil {
				return nil, fmt.Errorf("Error parsing createdAt: %v", err)
			}
		}
	} else {
		createdAt = time.Now()
	}

	// Start a transaction
	tx, err := db.DB.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("Error starting transaction: %v", err)
	}
	
	// Better transaction handling
	defer func() {
		if err != nil {
			tx.Rollback(ctx)
		}
	}()

	var categoryId string

	// Check if category exists for the user or is a default category
	categoryCheckQuery := `
		SELECT id FROM goal_categories 
		WHERE (name = $1 AND user_id = $2) OR (name = $1 AND is_default = true)
		ORDER BY user_id DESC NULLS LAST
		LIMIT 1`
	
	err = tx.QueryRow(ctx, categoryCheckQuery, req.CategoryName, userId).Scan(&categoryId)
	
	if err != nil {
		// Category doesn't exist, create a new one for the user
		categoryInsertQuery := `
			INSERT INTO goal_categories (id, name, color, user_id, is_default, created_at)
			VALUES (gen_random_uuid(), $1, $2, $3, false, $4)
			RETURNING id`
		
		err = tx.QueryRow(ctx, categoryInsertQuery, 
			req.CategoryName, 
			req.Hexacode, 
			userId, 
			time.Now()).Scan(&categoryId)
		
		if err != nil {
			return nil, fmt.Errorf("Error creating category: %v", err)
		}
	}

	// Insert the new goal
	goalInsertQuery := `
		INSERT INTO goals (id, user_id, name, target_amount, current_amount, deadline, description, created_at, category_id)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id`

	var goalId string
	err = tx.QueryRow(ctx, goalInsertQuery,
		userId,
		req.Name,
		req.TargetAmount,
		req.CurrentAmount,
		deadline,
		req.Description,
		createdAt,
		categoryId,
	).Scan(&goalId)

	if err != nil {
		return nil, fmt.Errorf("Error creating goal: %v", err)
	}

	// Commit the transaction
	err = tx.Commit(ctx)
	if err != nil {
		return nil, fmt.Errorf("Error committing transaction: %v", err)
	}

	return &goals.CreateGoalResponse{
		Id:      goalId,
		Message: "Goal created successfully",
	}, nil
}
