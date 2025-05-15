package balance

import (
	"context"
	"fmt"
	"time"

	"github.com/Aneesh-Hegde/expenseManager/db"
	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func GetTransfer(ctx context.Context, req *balance.GetTransferRequest) (*balance.GetTransferResponse, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	if len(md["token"][0]) > 0 {
		headers := metadata.Pairs("token", md["token"][0])
		grpc.SendHeader(ctx, headers)
	}

	user_id := md["user_id"][0]
	rows, err := db.DB.Query(ctx, "Select * from get_user_transfers($1)", user_id)
	if err != nil {
		return nil, fmt.Errorf("Error retriving transfers of user %v", err)
	}
  var transferFunds []*balance.TransferFunds
	for rows.Next() {
		var transfer_id int32
		var from_db_user_id int32
		var from_source string
		var to_source string
		var amount float64
    var date time.Time
    if err:=rows.Scan(&transfer_id,&from_db_user_id,&from_source,&to_source,&amount,&date); err!=nil{
		return nil, fmt.Errorf("error scanning transfer row: %v", err)
    }
    transfer :=&balance.TransferFunds{
      TransferId: transfer_id,
      FromSource: from_source,
      ToSource: to_source,
      Amount: amount,
      Date: date.String(),
    }
    transferFunds=append(transferFunds,transfer)
	}
  fmt.Println(transferFunds,user_id)
  return &balance.GetTransferResponse{
    Transfers: transferFunds,
  },nil
}
