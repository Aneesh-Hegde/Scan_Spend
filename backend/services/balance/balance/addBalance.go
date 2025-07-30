package balance

import (
	"context"
	"fmt"

	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
	balanceDB "github.com/Aneesh-Hegde/expenseManager/services/balance/db"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func AddBalance(ctx context.Context, req *balance.AddBalanceSourceRequest) (*balance.AddBalanceSourceResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	fmt.Println(md)

	// Forward token if present
	if len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}

	userId := md["user_id"][0]

	// Insert new balance
	balanceID, err := balanceDB.CreateAccountWithIncome(ctx, userId, "Default Cash Account", req.GetBalanceSource(), req.GetInitialAmount())
	if err != nil {
		return nil, err
	}

	// Format balance_amount as a string
	balanceAmount := fmt.Sprintf("$%.2f", req.GetInitialAmount())

	// Create Balance message
	b := &balance.Balance{
		BalanceId:     balanceID,
		BalanceAmount: balanceAmount,
		Balance:       req.GetInitialAmount(),
	}

	return &balance.AddBalanceSourceResponse{
		Balance: b,
	}, nil
}
