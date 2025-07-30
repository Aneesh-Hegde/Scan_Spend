package goals

import (
    "context"
    "fmt"
    "time"
    goalDB "github.com/Aneesh-Hegde/expenseManager/services/goals/db"
    goals "github.com/Aneesh-Hegde/expenseManager/grpc_goal"
    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
)

func EditGoals(ctx context.Context, req *goals.EditGoalRequest) (*goals.EditResponse, error) {
    md, _ := metadata.FromIncomingContext(ctx)

    if len(md["token"]) > 0 && len(md["token"][0]) > 0 {
        headers := metadata.Pairs("token", md["token"][0])
        grpc.SendHeader(ctx, headers)
    }

    userId := md["user_id"][0]
    goal := req.GetGoal()
    
    if goal == nil {
        return nil, fmt.Errorf("Goal data is required for editing")
    }

    if goal.GetName() == "" || goal.GetTargetAmount() <= 0 || goal.GetCategoryId() == "" || goal.GetDeadline() == "" {
        return nil, fmt.Errorf("Goal name, target amount, category, and deadline are required")
    }

    _, err := time.Parse("2006-01-02", goal.GetDeadline())
    if err != nil {
        return nil, fmt.Errorf("Invalid deadline format: %w. Expected 'YYYY-MM-DD'", err)
    }

    // Check category exists
    categoryExists, err := goalDB.CheckCategoryExists(ctx, goal.GetCategoryId(), userId)
    if err != nil {
        return nil, err
    }
    
    if !categoryExists {
        return nil, fmt.Errorf("Invalid or non-existent category ID provided: %s", goal.GetCategoryId())
    }

    if goal.GetId() == "" {
        // Create new goal
        newID, err := goalDB.CreateNewGoal(ctx, userId, goal.GetName(), goal.GetDescription(),
            goal.GetTargetAmount(), goal.GetCurrentAmount(), goal.GetDeadline(), goal.GetCategoryId())
        if err != nil {
            return nil, err
        }

        return &goals.EditResponse{
            Message: fmt.Sprintf("Goal '%s' created successfully.", newID),
        }, nil
    } else {
        // Update existing goal
        updatedID, err := goalDB.UpdateGoal(ctx, goal.GetId(), userId, goal.GetName(), goal.GetDescription(),
            goal.GetTargetAmount(), goal.GetCurrentAmount(), goal.GetDeadline(), goal.GetCategoryId())
        if err != nil {
            return nil, err
        }

        return &goals.EditResponse{
            Message: fmt.Sprintf("Goal '%s' updated successfully.", updatedID),
        }, nil
    }
}

