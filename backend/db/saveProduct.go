package db

import (
	"context"
	"fmt"
	"strconv"

	// "log"

	pb "github.com/Aneesh-Hegde/expenseManager/grpc"
	// "github.com/Aneesh-Hegde/expenseManager/utils/jwt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
)

func SaveProducts(ctx context.Context, req *pb.GetProducts) (*pb.DBMessage, error) {
	md, _ := metadata.FromIncomingContext(ctx)
	products := req.GetProducts()
	// userToken := req.GetUserId()
	// userId, err := jwt.ValidateJWT(userToken)
	accessToken := md.Get("token")
	if len(accessToken) > 0 {
		header := metadata.Pairs("accessToken", accessToken[0])
		grpc.SendHeader(ctx, header)
	}
	userId, _ := strconv.Atoi(md["user_id"][0])
	fmt.Println(userId, products)
	return StoreProductData(userId, req.GetFilename(), products)
}
