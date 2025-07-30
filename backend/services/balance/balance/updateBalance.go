package balance

import (
	"context"
	"fmt"

	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
	balanceDB "github.com/Aneesh-Hegde/expenseManager/services/balance/db"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func UpdateBalance(ctx context.Context, req *balance.UpdateBalanceRequest) (*balance.UpdateBalanceResponse, error) {
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
	fmt.Println(req.GetBalanceId())
	balanceID, _, amount, err := balanceDB.UpdateAccountBalance(ctx, req.GetBalanceId(), userId, req.GetAmount())
	if err != nil {
		return nil, err
	}

	balanceAmount := fmt.Sprintf("$%.2f", amount)

	b := &balance.Balance{
		BalanceId:     balanceID,
		BalanceAmount: balanceAmount,
		Balance:       amount,
	}

	return &balance.UpdateBalanceResponse{
		Balance: b,
	}, nil
}
