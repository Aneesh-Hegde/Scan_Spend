package balance

import (
	"context"
	"fmt"

	"github.com/Aneesh-Hegde/expenseManager/db"
	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func UpdateIncome(ctx context.Context, req *balance.UpdateIncomeRequest) (*balance.UpdateIncomeResponse, error) {
	// Extract metadata from context
	md, _ := metadata.FromIncomingContext(ctx)
	fmt.Println(md)

	// Forward token if present
	if len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}

	// Extract userId from metadata
	userId := md["user_id"][0]

  fmt.Println(req.GetAmount())
	// Update balance
	var incomeID int32
	var dbUserId int
	var amount float64
err := db.DB.QueryRow(ctx,
	"SELECT * FROM update_income($1, $2, $3)",
	req.GetIncomeId(), userId, req.GetAmount(),
).Scan(&incomeID, &dbUserId, &amount)
if err != nil {
	return nil, fmt.Errorf("failed to update balance: %v", err)
}

	// Format balance_amount as a string
	balanceAmount := fmt.Sprintf("$%.2f", amount)

	// Create Balance message
	b := &balance.Income{
		IncomeId:     incomeID,
		IncomeAmount: balanceAmount,
		Income:       amount,
	}

	return &balance.UpdateIncomeResponse{
		Income: b,
	}, nil
}
