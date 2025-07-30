package db

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"time"

	pb "github.com/Aneesh-Hegde/expenseManager/grpc"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	sharedDB "github.com/Aneesh-Hegde/expenseManager/shared/db"
	"github.com/Aneesh-Hegde/expenseManager/states"
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
	return StoreProductData(ctx, userId, req.GetFilename(), products)
}

func StoreProductData(ctx context.Context, userID int, filename string, products []*pb.Product) (*pb.DBMessage, error) {
	fmt.Printf("Starting StoreProductData: userID=%d, filename=%s, products=%d\n", userID, filename, len(products))
	
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

	fmt.Printf("Categories to process: %v\n", categoryNamesList)

	// Step 2: Query for existing categories using the ANY operator
	categoryQuery := `SELECT category_id, name FROM product_category_service.categories WHERE name = ANY($1)`
	rows, err := sharedDB.GetDB().Query(context.Background(), categoryQuery, categoryNamesList)
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

	fmt.Printf("Existing categories found: %v\n", existingCategories)

	// Step 4: Handle missing categories and insert them if necessary
	missingCategories := []string{}
	for category := range categoryNames {
		if _, exists := existingCategories[category]; !exists {
			missingCategories = append(missingCategories, category)
		}
	}

	fmt.Printf("Missing categories: %v\n", missingCategories)

	if len(missingCategories) > 0 {
		// Insert missing categories
		insertCategoryQuery := `INSERT INTO product_category_service.categories (name) VALUES ($1) RETURNING category_id`
		for _, category := range missingCategories {
			var newCategoryID int
			err := sharedDB.GetDB().QueryRow(context.Background(), insertCategoryQuery, category).Scan(&newCategoryID)
			if err != nil {
				log.Printf("Error inserting missing category: %v", err)
				return nil, err
			}
			existingCategories[category] = newCategoryID
			fmt.Printf("Inserted category '%s' with ID %d\n", category, newCategoryID)
		}
	}

	// Step 5: Begin transaction for inserting products
	fmt.Println("Starting database transaction...")
	tx, err := sharedDB.GetDB().Begin(ctx)
	if err != nil {
		log.Printf("Error starting transaction: %v", err)
		return nil, err
	}
	defer tx.Rollback(context.Background())

	fmt.Println("Transaction started successfully")

	// Step 6: Insert products into the database
	insertProductQuery := `
        INSERT INTO product_category_service.products (user_id, product_name, quantity, price, category_id, file_name, description,date_added)
        VALUES ($1, $2, $3, $4, $5, $6, $7,TO_TIMESTAMP($8,'DD/MM/YYYY')) RETURNING product_id`

	UpdateProductQuery := `
        UPDATE product_category_service.products SET product_name = $1, quantity = $2, price = $3, category_id = $4, file_name = $5, description = $6, date_added = TO_TIMESTAMP($7, 'DD/MM/YYYY')
        WHERE user_id = $8 AND product_id = $9`

	existsQuery := `SELECT COUNT(*) FROM product_category_service.products WHERE user_id = $1 AND product_id = $2 AND file_name = $3`
	var updatedProducts []states.Product
	var message string
	
	for i, product := range products {
		fmt.Printf("Processing product %d/%d: %s\n", i+1, len(products), product.ProductName)
		
		categoryID, exists := existingCategories[product.Category]
		if !exists {
			return nil, fmt.Errorf("category %s not found in existingCategories", product.Category)
		}
		
		var count, productID int
		// Check if product exists
		id, err := strconv.Atoi(product.Id)
		if err != nil {
			return nil, fmt.Errorf("invalid product ID %s: %v", product.Id, err)
		}
		
		fmt.Printf("ProductID: %d, Filename: %s, UserID: %d\n", id, filename, userID)
		fmt.Printf("About to execute query: %s\n", existsQuery)
		fmt.Printf("Query parameters: userID=%d, id=%d, filename=%s\n", userID, id, filename)
		
		// Add timeout context for the query
		queryCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		defer cancel()
		
		fmt.Println("Executing EXISTS query...")
		err = tx.QueryRow(queryCtx, existsQuery, userID, id, filename).Scan(&count)
		if err != nil {
			fmt.Printf("Error in EXISTS query: %v\n", err)
			return nil, fmt.Errorf("error checking product existence: %v", err)
		}
		
		fmt.Printf("EXISTS query completed. Count: %d\n", count)
		
		//TODO:Duplicates in db on update also
		if count > 0 {
			fmt.Println("Reached checkpoint 1 - UPDATE")
			// Product exists, update it
			updateCtx, updateCancel := context.WithTimeout(ctx, 10*time.Second)
			defer updateCancel()
			
			_, err = tx.Exec(updateCtx, UpdateProductQuery,
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
				fmt.Printf("Error in UPDATE: %v\n", err)
				return nil, fmt.Errorf("error updating product %s: %v", product.ProductName, err)
			}
			fmt.Println("UPDATE completed successfully")
			message = "Updated successfully"
		} else {
			fmt.Println("Reached checkpoint 2 - INSERT")
			insertCtx, insertCancel := context.WithTimeout(ctx, 10*time.Second)
			defer insertCancel()
			
			err := tx.QueryRow(insertCtx, insertProductQuery,
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
				fmt.Printf("Error inserting product %s: %v\n", product.ProductName, err)
				return nil, err // Return immediately upon error
			}
			fmt.Printf("INSERT completed successfully. New product ID: %d\n", productID)
			product.Id = strconv.Itoa(productID)
			message = "Uploaded first time successfully"
		}
		
		updatedProducts = append(updatedProducts, states.Product{
			ID:          product.Id,
			ProductName: product.ProductName,
			Quantity:    float64(product.Quantity),
			Amount:      float64(product.Amount),
			Category:    product.Category,
			Date:        product.Date,
		})
		
		// Log the product details to ensure they are correct before insertion
		log.Printf("Processed product: %+v", product)
	}

	// Step 7: Commit the transaction
	fmt.Println("Committing transaction...")
	if err := tx.Commit(context.Background()); err != nil {
		log.Printf("Error committing transaction: %v", err)
		return nil, err
	}
	fmt.Println("Transaction committed successfully")
	fmt.Println("Products updated successfully")
	fmt.Println(updatedProducts)
	
	err = redis.CacheProductData(userID, filename, updatedProducts)
	if err != nil {
		log.Printf("Error caching data: %v", err)
	}
	
	return &pb.DBMessage{Message: message}, nil
}
