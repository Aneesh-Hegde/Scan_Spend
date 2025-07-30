package balance

import (
	"context"
	"fmt"
	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
	balanceDB "github.com/Aneesh-Hegde/expenseManager/services/balance/db"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func GetIncome(ctx context.Context, req *balance.GetIncomeRequest) (*balance.GetIncomeResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	fmt.Println(md)
	if len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}
	userId := md["user_id"][0]

	incomeResults, err := balanceDB.GetUserIncomes(ctx, userId)
	if err != nil {
		return nil, err
	}

	// Build response with all incomes
	var incomes []*balance.Income
	for _, result := range incomeResults {
		incomeAmount := fmt.Sprintf("$%.2f", result.Amount)

		income := &balance.Income{
			IncomeId:     result.IncomeID,
			IncomeSource: result.BalanceSource,
			IncomeAmount: incomeAmount,
			Income:       result.Amount,
			Date:         result.DateAdded.String(),
		}
		incomes = append(incomes, income)
	}

	fmt.Println("Incomes")
	fmt.Print(incomes)

	return &balance.GetIncomeResponse{
		Income: incomes,
	}, nil
}
