package goals

import (
	"context"
	"fmt"

	"github.com/Aneesh-Hegde/expenseManager/db"
	goals "github.com/Aneesh-Hegde/expenseManager/grpc_goal"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)
func DeleteGoals(ctx context.Context, req *goals.DeleteGoalRequest) (*goals.DeleteResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	// Propagate token header if present
	if len(md["token"]) > 0 && len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}

	userId := md["user_id"][0] // Authenticated user ID

	// Validate required input
	if req.GetId() == "" {
		return nil, fmt.Errorf("Goal ID is required for deletion")
	}

	// SQL query to delete the specified goal.
	// We include `userId` in the WHERE clause to prevent users from deleting goals they don't own.
	cmdTag, err := db.DB.Exec(ctx, "DELETE FROM goals WHERE id = $1 AND user_id = $2", req.GetId(), userId)
	if err != nil {
		// Catch any database errors during the delete operation
		return nil, fmt.Errorf("Failed to delete goal: %w", err)
	}

	if cmdTag.RowsAffected() == 0 {
		// If no rows were affected, the goal wasn't found or wasn't owned by the user.
		return nil, fmt.Errorf("Goal with ID '%s' not found or not owned by user", req.GetId())
	}

	// Return a success message upon successful deletion.
	return &goals.DeleteResponse{
		Message: fmt.Sprintf("Goal '%s' deleted successfully.", req.GetId()),
	}, nil
}
