package balance

import (
	"context"
	"fmt"

	"github.com/Aneesh-Hegde/expenseManager/db"
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
	var incomeID int32
	err := db.DB.QueryRow(ctx,
		"Select * insert_income($1, $2, $3, $4)",
		userId, req.GetIncomeSource(), req.GetInitialAmount(),"Default Cash Account",
	).Scan(&incomeID)
	if err != nil {
		return nil, fmt.Errorf("failed to add balance: %v", err)
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
