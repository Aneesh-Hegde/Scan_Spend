package db

import (
	"context"
	"fmt"
	pb "github.com/Aneesh-Hegde/expenseManager/grpc"
	"github.com/Aneesh-Hegde/expenseManager/utils/jwt"
	"log"
)

func SaveProducts(ctx context.Context, req *pb.GetProducts) (*pb.DBMessage, error) {
	products := req.GetProducts()
	userToken := req.GetUserId()
	userId, err := jwt.ValidateJWT(userToken)
	if err != nil {
		log.Print(err)
	}
	fmt.Println(userId, products)
	return StoreProductData(userId, req.GetFilename(), products)
}
