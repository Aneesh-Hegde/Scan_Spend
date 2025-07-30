package balance

import (
	"context"
	"fmt"

	balance "github.com/Aneesh-Hegde/expenseManager/grpc_balance"
	balanceDB "github.com/Aneesh-Hegde/expenseManager/services/balance/db"
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
	transferResults, err := balanceDB.GetUserTransfers(ctx, user_id)
	if err != nil {
		return nil, err
	}

	var transferFunds []*balance.TransferFunds
	for _, result := range transferResults {
		transfer := &balance.TransferFunds{
			TransferId: result.TransferID,
			FromSource: result.FromSource,
			ToSource:   result.ToSource,
			Amount:     result.Amount,
			Date:       result.Date.String(),
		}
		transferFunds = append(transferFunds, transfer)
	}
	fmt.Println(transferFunds, user_id)
	return &balance.GetTransferResponse{
		Transfers: transferFunds,
	}, nil
}
