package db

import (
	"context"
	"log"
	"os"

	"github.com/Aneesh-Hegde/expenseManager/states"
	"github.com/jackc/pgx/v4"
	"github.com/joho/godotenv"
)

var DB *pgx.Conn

func InitDB() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// Initialize PostgreSQL connection
	dbURL := os.Getenv("DB_URL")
	log.Println(dbURL)
	conn, err := pgx.Connect(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	DB = conn
}

func CloseDB() {
	DB.Close(context.Background())
}

func StoreProductData(userID int, filename string, products []states.Product) error {
	// Begin a transaction
	tx, err := DB.Begin(context.Background())
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		return err
	}

	// Ensure transaction is rolled back in case of an error
	defer tx.Rollback(context.Background())

	// Insert each product
	for _, product := range products {
		// Log the product details to ensure they are correct before insertion
		log.Printf("Inserting product: %+v", product)

		// Insert into the database
		_, err := tx.Exec(context.Background(), `
			INSERT INTO products (user_id, product_name, quantity, amount, category, filename) 
			VALUES ($1, $2, $3, $4, $5, $6)`,
			userID, product.ProductName, product.Quantity, product.Amount, product.Category, filename)
		if err != nil {
			log.Printf("Error inserting product %s: %v", product.ProductName, err)
			return err // Return immediately upon error
		}
	}

	// Commit the transaction
	if err := tx.Commit(context.Background()); err != nil {
		log.Printf("Error committing transaction: %v", err)
		return err
	}

	return nil
}
