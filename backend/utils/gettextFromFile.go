package utils

import (
	"net/http"
	"strconv"

	"github.com/Aneesh-Hegde/expenseManager/db"
	"github.com/Aneesh-Hegde/expenseManager/redis"
	"github.com/Aneesh-Hegde/expenseManager/states"
	"github.com/labstack/echo/v4"
	"github.com/otiai10/gosseract/v2"
)

func GetText(c echo.Context) error {
	filename := c.Param("file")
	client := gosseract.NewClient()
	defer client.Close()

	// Set the image file for OCR
	err := client.SetImage("uploads/" + filename)
	if err != nil {
		return c.String(http.StatusInternalServerError, "Failed to set image")
	}

	// Check if product data is cached in Redis
	cachedProducts, err := redis.GetCachedProductData(filename)
	if err == nil && cachedProducts != nil {
		// If products are cached, return them from Redis
		return c.JSON(http.StatusOK, map[string]interface{}{"product": cachedProducts})
	}

	// Perform OCR to extract text from the image
	text, err := client.Text()
	if err != nil {
		return c.String(http.StatusInternalServerError, "Failed to extract text")
	}

	// Extract product data from text
	extractedData, err := ExtractProductDataFromText(text)
	if err != nil {
		return c.String(http.StatusInternalServerError, "Failed to extract product data")
	}

	// Initialize variables for storing processed data and total
	var id = 0
	var total = 0.0
	var data []states.Product

	// Process extracted data
	for i := range extractedData {
		id++
		extractedData[i].ID = strconv.Itoa(id)
		extractedData[i].FileName = filename
		total += extractedData[i].Quantity * extractedData[i].Amount
		data = append(data, extractedData[i])
	}

	// Store the extracted product data in the global state (optional)
	states.FilesProduct[filename] = states.AllData{Products: extractedData, Total: total}

	// Cache the product data in Redis for future requests
	err = redis.CacheProductData(filename, data)
	if err != nil {
		return c.String(http.StatusInternalServerError, "Failed to cache products in Redis")
	}

	// Store the extracted product data in the database (optional)
	err = db.StoreProductData(1, filename, data)
	if err != nil {
		return c.String(http.StatusInternalServerError, "Failed to insert products into database")
	}

	// Return the extracted products and total
	return c.JSON(http.StatusOK, map[string]interface{}{"product": data, "total": total})
}
