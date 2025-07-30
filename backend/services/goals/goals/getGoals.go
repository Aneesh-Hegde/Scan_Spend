package goals

import (
    "context"
    "fmt"
    goalDB "github.com/Aneesh-Hegde/expenseManager/services/goals/db"
    goals "github.com/Aneesh-Hegde/expenseManager/grpc_goal"
    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
)

func GetGoals(ctx context.Context, req *goals.GetGoalRequest) (*goals.GetGoalResponse, error) {
    md, _ := metadata.FromIncomingContext(ctx)
    fmt.Println(md)

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

    goalResults, err := goalDB.GetUserGoals(ctx, userId)
    if err != nil {
        return nil, err
    }

    var userGoals []*goals.Goals
    for _, result := range goalResults {
        desc := ""
        if result.Description != nil {
            desc = *result.Description
        }

        goal := &goals.Goals{
            Id:           result.ID,
            Name:         result.Name,
            TargetAmount: result.TargetAmount,
            CurrentAmount: result.CurrentAmount,
            Deadline:     result.Deadline.Format("2006-01-02"),
            Description:  desc,
            CreatedAt:    result.CreatedAt.Format("2006-01-02"),
            CategoryId:   result.CategoryID,
            CategoryName: result.CategoryName,
            Hexcode:      result.Hexcode,
        }
        userGoals = append(userGoals, goal)
    }

    return &goals.GetGoalResponse{
        Goals: userGoals,
    }, nil
}

