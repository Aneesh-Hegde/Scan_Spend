package balance

import (
	"context"
	"fmt"

	"github.com/Aneesh-Hegde/expenseManager/db"
	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
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
	var balanceID int32
	err := db.DB.QueryRow(ctx,
		"Select create_account_with_income($1, $2, $3, $4)",
		userId, "Default Cash Account", req.GetBalanceSource(), req.GetInitialAmount(),
	).Scan(&balanceID)
	if err != nil {
		return nil, fmt.Errorf("failed to add balance: %v", err)
	}

	// Format balance_amount as a string
	balanceAmount := fmt.Sprintf("$%.2f", req.GetInitialAmount())

	// Create Balance message
	b := &balance.Balance{
		BalanceId:     balanceID,
		UserId:        userId,
		BalanceAmount: balanceAmount,
		Balance:       req.GetInitialAmount(),
	}

	return &balance.AddBalanceSourceResponse{
		Balance: b,
	}, nil
}
