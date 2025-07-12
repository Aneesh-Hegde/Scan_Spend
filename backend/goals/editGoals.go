package goals

import (
	"context"
	"fmt"
	"github.com/Aneesh-Hegde/expenseManager/db"
	goals "github.com/Aneesh-Hegde/expenseManager/grpc_goal"
	"github.com/jackc/pgx/v5"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"time"
)

func EditGoals(ctx context.Context, req *goals.EditGoalRequest) (*goals.EditResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	// Propagate token header if present
	if len(md["token"]) > 0 && len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}

	userId := md["user_id"][0] // Authenticated user ID

	goal := req.GetGoal() // Get the Goal object from the request
	if goal == nil {
		return nil, fmt.Errorf("Goal data is required for editing")
	}

	// Validate essential fields for any goal (new or existing)
	if goal.GetName() == "" || goal.GetTargetAmount() <= 0 || goal.GetCategoryId() == "" || goal.GetDeadline() == "" {
		return nil, fmt.Errorf("Goal name, target amount, category, and deadline are required")
	}

	// Validate deadline format (assuming "YYYY-MM-DD")
	_, err := time.Parse("2006-01-02", goal.GetDeadline())
	if err != nil {
		return nil, fmt.Errorf("Invalid deadline format: %w. Expected 'YYYY-MM-DD'", err)
	}

	// Crucial: Verify that the provided category_id actually exists in the categories table.
	var categoryCount int
	err = db.DB.QueryRow(ctx,
		"SELECT COUNT(*) FROM goal_categories WHERE id = $1 AND (user_id IS NULL OR user_id = $2)",
		goal.GetCategoryId(), userId).Scan(&categoryCount)
	if err != nil {
		return nil, fmt.Errorf("Error checking category existence: %w", err)
	}
	if categoryCount == 0 {
		return nil, fmt.Errorf("Invalid or non-existent category ID provided: %s", goal.GetCategoryId())
	}

	// If goal.GetId() is empty, it's a new goal (INSERT operation)
	if goal.GetId() == "" {
		query := `
            INSERT INTO goals (user_id, name, description, target_amount, current_amount, deadline, created_at, category_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id; -- Return the ID of the newly created goal
        `
		var newID string
		err := db.DB.QueryRow(
			ctx,
			query,
			userId, // The user owning this goal
			goal.GetName(),
			goal.GetDescription(), // Can be an empty string if not provided
			goal.GetTargetAmount(),
			goal.GetCurrentAmount(), // Typically 0 for new goals, but allows frontend to set
			goal.GetDeadline(),
			time.Now(), // Set creation timestamp to current time
			goal.GetCategoryId(),
		).Scan(&newID)
		if err != nil {
			return nil, fmt.Errorf("Failed to create new goal: %w", err)
		}
		return &goals.EditResponse{
			Message: fmt.Sprintf("Goal '%s' created successfully.", newID),
		}, nil

	} else {
		// If goal.GetId() is provided, it's an existing goal (UPDATE operation)
		query := `
            UPDATE goals
            SET
                name = $1,
                description = $2,
                target_amount = $3,
                current_amount = $4, -- Allows updating current amount during a full edit
                deadline = $5,
                category_id = $6
            WHERE id = $7 AND user_id = $8 -- Ensure only the owner can update
            RETURNING id; -- Return the ID of the updated goal
        `
		var updatedID string
		err := db.DB.QueryRow(
			ctx,
			query,
			goal.GetName(),
			goal.GetDescription(),
			goal.GetTargetAmount(),
			goal.GetCurrentAmount(),
			goal.GetDeadline(),
			goal.GetCategoryId(),
			goal.GetId(), // The ID of the goal to update
			userId,       // Ensure ownership
		).Scan(&updatedID)
		if err != nil {
			if err == pgx.ErrNoRows {
				// If no row was found/updated, it means the goal ID was incorrect or not owned by the user.
				return nil, fmt.Errorf("Goal with ID '%s' not found or not owned by user", goal.GetId())
			}
			// Catch other database errors
			return nil, fmt.Errorf("Failed to update goal: %w", err)
		}
		return &goals.EditResponse{
			Message: fmt.Sprintf("Goal '%s' updated successfully.", updatedID),
		}, nil
	}
}
