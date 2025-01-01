package utils

import (
	"github.com/Aneesh-Hegde/expenseManager/states"
	"github.com/labstack/echo/v4"
	"github.com/otiai10/gosseract/v2"
	"net/http"
	"strconv"
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

	// Perform OCR to extract text
	text, err := client.Text()
	if err != nil {
		return c.String(http.StatusInternalServerError, "Failed to extract text")
	}

	// Extract product data from text and calculate total
	extractedData, err := ExtractProductDataFromText(text)
	if err != nil {
		return c.String(http.StatusInternalServerError, "Failed to extract product data")
	}

	var data []map[string]string
	var id = 0
	var total = 0.0

	// Process extracted data
	for i := range extractedData {
		id++
		extractedData[i].ID = strconv.Itoa(id)
		extractedData[i].Name = filename
		quantity, _ := strconv.ParseFloat(extractedData[i].Quantity, 64)
		amount, _ := strconv.ParseFloat(extractedData[i].Amount, 64)
		total += quantity * amount
	}

	// Store the extracted product data and total
	states.FilesProduct[filename] = states.AllData{Products: extractedData, Total: total}

	// Convert extracted data for rendering
	for _, product := range extractedData {
		temp := map[string]string{
			"ProductName": product.ProductName,
			"Quantity":    product.Quantity,
			"Amount":      product.Amount,
			"ID":          product.ID,
			"Filename":    product.Name,
			"Category":    product.Category,
		}
		data = append(data, temp)
	}

	// Return the extracted data and total
	return c.JSON(http.StatusOK, map[string]interface{}{"product": extractedData, "total": total})
}
