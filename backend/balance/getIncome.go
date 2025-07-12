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
		return nil, fmt.Errorf("failed to query incomes: %v", err)
	}
	defer rows.Close()

	// Build response with all incomes
	var incomes []*balance.Income
	for rows.Next() {
		var incomeId int32
		var dbUserId int32
		var accountId int32
		var balanceSource string
		var amount float64
		var description sql.NullString
		var dateAdded time.Time
		var lastUpdated time.Time

		// Update Scan order to match the SQL function return columns:
		// income_id, user_id, account_id, balance_source, amount, description, date_added, last_updated
		if err := rows.Scan(
			&incomeId,
			&dbUserId,
			&accountId,
			&description,
			&amount,
			&balanceSource,
			&dateAdded,
			&lastUpdated,
		); err != nil {
			fmt.Println(err)
			return nil, fmt.Errorf("failed to scan income: %v", err)
		}

		// Format income_amount as a string (e.g., "$100.00")
		incomeAmount := fmt.Sprintf("$%.2f", amount)

		// Create Income message
		income := &balance.Income{
			IncomeId:     incomeId,
			IncomeSource: balanceSource,  // Now properly using the scanned value
			IncomeAmount: incomeAmount,
			Income:       amount,
			Date:         dateAdded.String(),
		}
		incomes = append(incomes, income)
	}

	fmt.Println("Incomes")
	fmt.Print(incomes)

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating incomes: %v", err)
	}

	return &balance.GetIncomeResponse{
		Income: incomes,
	}, nil
}
