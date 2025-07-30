package balance

import (
	"context"
	"fmt"

	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
	balanceDB "github.com/Aneesh-Hegde/expenseManager/services/balance/db"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func GetBalance(ctx context.Context, req *balance.GetBalanceRequest) (*balance.GetBalanceResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	fmt.Println(md)
	if len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}

	userId := md["user_id"][0]
	balanceResults, err := balanceDB.GetUserBalances(ctx, userId)
	if err != nil {
		return nil, err
	}

	// Build response with all balances
	var balances []*balance.Balance
	for _, result := range balanceResults {
		balanceAmount := fmt.Sprintf("$%.2f", result.Amount)

		b := &balance.Balance{
			BalanceId:     result.BalanceID,
			BalanceSource: result.BalanceSource,
			BalanceAmount: balanceAmount,
			Balance:       result.Amount,
		}
		balances = append(balances, b)
	}
	fmt.Println(balances)

	return &balance.GetBalanceResponse{
		Balance: balances,
	}, nil

}
