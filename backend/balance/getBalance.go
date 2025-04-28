package balance

import (
	"context"
	"fmt"
	"strconv"

	"github.com/Aneesh-Hegde/expenseManager/db"
	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func GetBalance(ctx context.Context, req *balance.GetBalanceRequest) ( *balance.GetBalanceResponse,error ){
	md, _ := metadata.FromIncomingContext(ctx)
  fmt.Println(md)
	if len(md["token"][0]) > 0 {
    headers:= metadata.Pairs("token",md["token"][0])
    grpc.SendHeader(ctx,headers)
	}

  userId:=md["user_id"][0]
  query:=`SELECT balance_id, user_id,balance_source, amount FROM balances WHERE user_id = $1`
rows, err := db.DB.Query(ctx,query , userId)
	if err != nil {
		return nil, fmt.Errorf("failed to query balances: %v", err)
	}
	defer rows.Close()

	// Build response with all balances
	var balances []*balance.Balance
	for rows.Next() {
		var balanceID int32
		var dbUserId int
		var balance_source string
		var amount float64
		if err := rows.Scan(&balanceID, &dbUserId,&balance_source, &amount); err != nil {
			return nil, fmt.Errorf( "failed to scan balance: %v", err)
		}

		// Format balance_amount as a string (e.g., "$100.00")
		balanceAmount := fmt.Sprintf("$%.2f", amount)
    userId:=strconv.Itoa(dbUserId)

		// Create Balance message
		b := &balance.Balance{
			BalanceId:    balanceID,
			UserId:       userId,
      BalanceSource: balance_source,
			BalanceAmount: balanceAmount,
			Balance:      amount,
		}
		balances = append(balances, b)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf( "error iterating balances: %v", err)
	}

  return &balance.GetBalanceResponse{
    Balance:balances,
  },nil

}
