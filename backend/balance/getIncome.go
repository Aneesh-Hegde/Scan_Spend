package balance

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/Aneesh-Hegde/expenseManager/db"
	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
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
	query := `SELECT * FROM get_user_incomes($1)`
	rows, err := db.DB.Query(ctx, query, userId)
	if err != nil {
		return nil, fmt.Errorf("failed to query balances: %v", err)
	}
	defer rows.Close()

	// Build response with all balances
	var balances []*balance.Income
	for rows.Next() {
		var incomeId int32
		var dbUserId int32
		var accountId int32
		var amount float64
		var description sql.NullString
		var dateAdded time.Time
		var lastUpdated time.Time
		var balanceSource string

		if err := rows.Scan(&incomeId, &dbUserId, &accountId, &amount, &description, &dateAdded, &lastUpdated, &balanceSource); err != nil {
			fmt.Println(err)
			return nil, fmt.Errorf("failed to scan income: %v", err)
		}

		// Format balance_amount as a string (e.g., "$100.00")
		balanceAmount := fmt.Sprintf("$%.2f", amount)

		// Create Balance message
		b := &balance.Income{
			IncomeId:     incomeId,
			IncomeSource: balanceSource,
			IncomeAmount: balanceAmount,
			Income:       amount,
			Date:         dateAdded.String(),
		}
		balances = append(balances, b)
	}
	fmt.Println("Balances")
	fmt.Print(balances)

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating balances: %v", err)
	}

	return &balance.GetIncomeResponse{
		Income: balances,
	}, nil

}
