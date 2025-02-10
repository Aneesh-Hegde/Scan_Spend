package data

import (
	"context"
	"fmt"
	"log"

	"github.com/Aneesh-Hegde/expenseManager/db"
	files "github.com/Aneesh-Hegde/expenseManager/grpc_file"
	"github.com/Aneesh-Hegde/expenseManager/utils/jwt"
)

func GetFiles(ctx context.Context, req *files.GetFileByUser) (*files.FileList, error) {
	token := req.GetToken()
	userId, err := jwt.ValidateJWT(token)
	fmt.Println(userId)
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	log.Println(userId)
	dbquery := `SELECT DISTINCT file_name FROM products WHERE user_id=$1`
	rows, err := db.DB.Query(context.Background(), dbquery, userId)
	if err != nil {
		log.Fatal(err)
		return nil, err
	}
	defer rows.Close()
	allfiles := &files.FileList{}
	for rows.Next() {
		var fileName string
		if err := rows.Scan(&fileName); err != nil {
			return nil, err
		}
		file := files.File{Filename: fileName}
		allfiles.Allfiles = append(allfiles.Allfiles, &file)
	}
	return allfiles, nil
}
