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

func CreateGoals(ctx context.Context, req *goals.CreateGoalRequest) (*goals.CreateGoalResponse, error) {
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

    deadline, err := time.Parse("2006-01-02", req.Deadline)
    if err != nil {
        return nil, fmt.Errorf("error parsing deadline: %v", err)
    }

    var createdAt time.Time
    if req.CreatedAt != "" {
        createdAt, err = time.Parse(time.RFC3339, req.CreatedAt)
        if err != nil {
            createdAt, err = time.Parse("2006-01-02", req.CreatedAt)
            if err != nil {
                return nil, fmt.Errorf("error parsing createdAt: %v", err)
            }
        }
    } else {
        createdAt = time.Now()
    }

    goalId, err := goalDB.CreateGoal(ctx, userId, req.Name, req.Description, 
        req.TargetAmount, req.CurrentAmount, deadline, createdAt, 
        req.CategoryName, req.Hexacode)
    if err != nil {
        return nil, err
    }

    return &goals.CreateGoalResponse{
        Id:      goalId,
        Message: "Goal created successfully",
    }, nil
}

