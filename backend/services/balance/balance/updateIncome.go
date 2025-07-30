package balance

import (
	"context"
	"fmt"

	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
	balanceDB "github.com/Aneesh-Hegde/expenseManager/services/balance/db"
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
	incomeID, _, amount, err := balanceDB.UpdateIncome(ctx, req.GetIncomeId(), userId, req.GetAmount())
	if err != nil {
		return nil, err
	}

	balanceAmount := fmt.Sprintf("$%.2f", amount)

	b := &balance.Income{
		IncomeId:     incomeID,
		IncomeAmount: balanceAmount,
		Income:       amount,
	}
	return &balance.UpdateIncomeResponse{
		Income: b,
	}, nil
}
