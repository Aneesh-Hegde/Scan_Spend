package goals

import (
    "context"
    "fmt"
    goalDB "github.com/Aneesh-Hegde/expenseManager/services/goals/db"
    goals "github.com/Aneesh-Hegde/expenseManager/grpc_goal"
    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
)

func DeleteGoals(ctx context.Context, req *goals.DeleteGoalRequest) (*goals.DeleteResponse, error) {
    md, _ := metadata.FromIncomingContext(ctx)

    if len(md["token"]) > 0 && len(md["token"][0]) > 0 {
        headers := metadata.Pairs("token", md["token"][0])
        grpc.SendHeader(ctx, headers)
    }

    userId := md["user_id"][0]

    if req.GetId() == "" {
        return nil, fmt.Errorf("Goal ID is required for deletion")
    }

    deleted, err := goalDB.DeleteGoal(ctx, req.GetId(), userId)
    if err != nil {
        return nil, err
    }

    if !deleted {
        return nil, fmt.Errorf("Goal with ID '%s' not found or not owned by user", req.GetId())
    }

    return &goals.DeleteResponse{
        Message: fmt.Sprintf("Goal '%s' deleted successfully.", req.GetId()),
    }, nil
}

