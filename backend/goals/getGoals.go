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

func GetGoals(ctx context.Context, req *goals.GetGoalRequest) (*goals.GetGoalResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	fmt.Println(md)
	
	// Safe metadata access
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
	
	// Direct query instead of stored procedure
	query := `
		SELECT
			g.id,
			g.name,
			g.target_amount,
			g.current_amount,
			g.deadline,
			g.description,
			g.created_at,
			g.category_id,
			gc.name AS category_name,
			gc.color AS hexcode
		FROM goals g
		JOIN goal_categories gc ON g.category_id = gc.id
		WHERE g.user_id = $1
		ORDER BY g.created_at DESC`
	
	rows, err := db.DB.Query(ctx, query, userId)
	if err != nil {
		return nil, fmt.Errorf("Error in getting goals for user: %v", err)
	}
	defer rows.Close()
	
	var userGoals []*goals.Goals
	for rows.Next() {
		var id string
		var name string
		var targetAmount float64
		var currentAmount float64
		var deadline time.Time
		var description *string
		var createdAt time.Time
		var category_id string
		var category_name string
		var hexcode string
		
		err := rows.Scan(
			&id,
			&name,
			&targetAmount,
			&currentAmount,
			&deadline,
			&description,
			&createdAt,
			&category_id,
			&category_name,
			&hexcode,
		)
		if err != nil {
			return nil, fmt.Errorf("Error in scanning row for getting goals: %v", err)
		}
		
		// Handle description safely
		desc := ""
		if description != nil {
			desc = *description
		}
		
		goal := &goals.Goals{
			Id:           id,
			Name:         name,
			TargetAmount: targetAmount,
			CurrentAmount: currentAmount,
			Deadline:     deadline.Format("2006-01-02"),
			Description:  desc,
			CreatedAt:    createdAt.Format("2006-01-02"),
			CategoryId:   category_id,
			CategoryName: category_name,
			Hexcode:      hexcode,
		}
		userGoals = append(userGoals, goal)
	}
	
	return &goals.GetGoalResponse{
		Goals: userGoals,
	}, nil
}
