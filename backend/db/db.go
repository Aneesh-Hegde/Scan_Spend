package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"

	// "github.com/Aneesh-Hegde/expenseManager/states"
	pb "github.com/Aneesh-Hegde/expenseManager/grpc"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/Aneesh-Hegde/expenseManager/states"
	"github.com/jackc/pgx/v4/pgxpool"
)

var DB *pgxpool.Pool

func InitDB() {
	dbURL := os.Getenv("DB_URL")
	log.Println(dbURL)

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Printf("Unable to parse database URL: %v", err)
	}

	config.MaxConns = 10
	config.MinConns = 2

	DB, err = pgxpool.ConnectConfig(context.Background(), config)
	if err != nil {
		log.Printf("Unable to connect to the database: %v", err)
	}
	log.Println("Successfully connected to the database.")

	currDir, err := os.Getwd()
	if err != nil {
		log.Print(err)
	}
	filepath := fmt.Sprintf("%s/db/tables.sql", currDir)
	sqlBytes, err := os.ReadFile(filepath)
	if err != nil {
		log.Print(err)
	}

	sqlCommand := string(sqlBytes)
	_, err = DB.Exec(context.Background(), sqlCommand)
	if err != nil {
		log.Print(err)
	}

}

func CloseDB() {
	DB.Close()
}

func StoreProductData(ctx context.Context, userID int, filename string, products []*pb.Product) (*pb.DBMessage, error) {
	// Step 1: Collect all unique categories from the products
	categoryNames := make(map[string]bool)
	for _, product := range products {
		categoryNames[product.Category] = true
	}

	// Convert map keys to a slice for the query
	categoryNamesList := make([]string, 0, len(categoryNames))
	for category := range categoryNames {
		categoryNamesList = append(categoryNamesList, category)
	}

	// Step 2: Query for existing categories using the ANY operator
	categoryQuery := `SELECT category_id, name FROM categories WHERE name = ANY($1)`
	rows, err := DB.Query(context.Background(), categoryQuery, categoryNamesList)
	if err != nil {
		log.Printf("Error querying categories: %v", err)
		return nil, err
	}
	defer rows.Close()

	// Step 3: Store the existing categories in a map
	existingCategories := map[string]int{}
	for rows.Next() {
		var categoryID int
		var categoryName string
		if err := rows.Scan(&categoryID, &categoryName); err != nil {
			log.Printf("Error scanning category: %v", err)
			return nil, err
		}
		existingCategories[categoryName] = categoryID
	}

	// Check for any errors during row iteration
	if err := rows.Err(); err != nil {
		log.Printf("Error during rows iteration: %v", err)
		return nil, err
	}

	// Step 4: Handle missing categories and insert them if necessary
	missingCategories := []string{}
	for category := range categoryNames {
		if _, exists := existingCategories[category]; !exists {
			missingCategories = append(missingCategories, category)
		}
	}

	if len(missingCategories) > 0 {
		// Insert missing categories
		insertCategoryQuery := `INSERT INTO categories (name) VALUES ($1) RETURNING category_id`
		for _, category := range missingCategories {
			var newCategoryID int
			err := DB.QueryRow(context.Background(), insertCategoryQuery, category).Scan(&newCategoryID)
			if err != nil {
				log.Printf("Error inserting missing category: %v", err)
				return nil, err
			}
			existingCategories[category] = newCategoryID
		}
	}

	// Step 5: Begin transaction for inserting products
	tx, err := DB.Begin(ctx)
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		return nil, err
	}
	defer tx.Rollback(context.Background())

	// Step 6: Insert products into the database
	insertProductQuery := `
        INSERT INTO products (user_id, product_name, quantity, price, category_id, file_name, description,date_added)
        VALUES ($1, $2, $3, $4, $5, $6, $7,TO_TIMESTAMP($8,'DD/MM/YYYY')) RETURNING product_id`

	UpdateProductQuery := `
        UPDATE products SET name = $1, quantity = $2, price = $3, category_id = $4, file_name = $5, description = $6, date_added = TO_TIMESTAMP($7, 'DD/MM/YYYY')
        WHERE user_id = $8 AND product_id = $9;`

	existsQuery := `SELECT COUNT(*) FROM products WHERE user_id = $1 AND product_id = $2 AND file_name = $3`
	var updatedProducts []states.Product
	var message string
	for _, product := range products {
		categoryID := existingCategories[product.Category]
		var count, productID int
		// Check if product exists
		id, _ := strconv.Atoi(product.Id)
		fmt.Println(id)
		err := tx.QueryRow(ctx, existsQuery, userID, id, filename).Scan(&count)
		if err != nil {
			return nil, fmt.Errorf("error checking product existence: %v", err)
		}
		fmt.Println(count)
		//TODO:Duplicates in db on update also
		if count > 0 {
			// Product exists, update it
			_, err = DB.Exec(ctx, UpdateProductQuery,
				product.ProductName,
				product.Quantity,
				product.Amount,
				categoryID,
				filename,
				"", // Description (if available)
				product.Date,
				userID,
				id,
			)
			if err != nil {
				return nil, fmt.Errorf("error updating product %s: %v", product.ProductName, err)
			}
			message = "Updated successfully"
		} else {
			err := tx.QueryRow(ctx, insertProductQuery,
				userID,
				product.ProductName,
				product.Quantity,
				product.Amount, // Map Amount to Price
				categoryID,
				filename, // File Name as per schema
				"",       // Assuming we don't have description, set it to an empty string or NULL
				product.Date,
			).Scan(&productID)
			if err != nil {
				fmt.Printf("Error inserting product %s: %v", product.ProductName, err)
				return nil, err // Return immediately upon error
			}
			product.Id = strconv.Itoa(productID)
			message = "Uploaded first time successfully"
		}
		updatedProducts = append(updatedProducts, states.Product{ID: product.Id, ProductName: product.ProductName, Quantity: float64(product.Quantity), Amount: float64(product.Amount), Category: product.Category, Date: product.Date})
		// Log the product details to ensure they are correct before insertion
		log.Printf("Inserting product: %+v", product)

		// Inserting product data into the database
	}

	// Step 7: Commit the transaction
	if err := tx.Commit(context.Background()); err != nil {
		log.Printf("Error committing transaction: %v", err)
		return nil, err
	}
	fmt.Println("Products updated successfully")
	fmt.Println(updatedProducts)
	err = redis.CacheProductData(filename, updatedProducts)
	return &pb.DBMessage{Message: message}, nil
}
