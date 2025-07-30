package balance

import (
	"context"
	"fmt"

	balanceDB "github.com/Aneesh-Hegde/expenseManager/services/balance/db"
	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func AddIncome(ctx context.Context, req *balance.AddIncomeSourceRequest) (*balance.AddIncomeSourceResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	fmt.Println(md)

	// Forward token if present
	if len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}

	userId := md["user_id"][0]

	// Insert new balance
incomeID, err := balanceDB.InsertIncome(ctx, userId, req.GetIncomeSource(), req.GetInitialAmount(), "Default Cash Account")
    if err != nil {
        return nil, err
    }

	// Format balance_amount as a string
	balanceAmount := fmt.Sprintf("$%.2f", req.GetInitialAmount())

	// Create Balance message
	b := &balance.Income{
		IncomeId:     incomeID,
		IncomeAmount: balanceAmount,
		Income:       req.GetInitialAmount(),
	}

	return &balance.AddIncomeSourceResponse{
		Income: b,
	}, nil
}
