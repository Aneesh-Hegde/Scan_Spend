package goals

import (
    "context"
    "fmt"
    goalDB "github.com/Aneesh-Hegde/expenseManager/services/goals/db"
    goals "github.com/Aneesh-Hegde/expenseManager/grpc_goal"
    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
)

func GoalTransactions(ctx context.Context, req *goals.GetGoalTransactionsRequest) (*goals.GetGoalTransactionsResponse, error) {
    md, _ := metadata.FromIncomingContext(ctx)

    if len(md["token"]) > 0 && len(md["token"][0]) > 0 {
        headers := metadata.Pairs("token", md["token"][0])
        grpc.SendHeader(ctx, headers)
    }

    userId := md["user_id"][0]

    if req.GetGoalId() == "" {
        return nil, fmt.Errorf("Goal ID is required")
    }

    // Verify goal ownership
    goalExists, err := goalDB.CheckGoalOwnership(ctx, req.GetGoalId(), userId)
    if err != nil {
        return nil, err
    }

    if !goalExists {
        return nil, fmt.Errorf("Goal with ID '%s' not found or not owned by user", req.GetGoalId())
    }

    // Get transactions
    transactionResults, err := goalDB.GetGoalTransactions(ctx, req.GetGoalId(), userId)
    if err != nil {
        return nil, err
    }

    var transactions []*goals.GoalTransaction
    for _, result := range transactionResults {
        transaction := &goals.GoalTransaction{
            Id:              result.ID,
            GoalId:          result.GoalID,
            BalanceId:       result.BalanceID,
            Amount:          result.Amount,
            TransactionType: result.TransactionType,
            CreatedAt:       result.CreatedAt.Format("2006-01-02 15:04:05"),
            Notes:           result.Notes,
        }
        transactions = append(transactions, transaction)
    }

    return &goals.GetGoalTransactionsResponse{
        Transactions: transactions,
    }, nil
}

