package utils

import (
	"github.com/Aneesh-Hegde/expenseManager/states"
	"github.com/labstack/echo/v4"
	"net/http"
	"strconv"
)

func UpdateProduct(c echo.Context) error {
	filename := c.Param("file")
	id := c.Param("id")
	productname := c.FormValue("product")
	quantity := c.FormValue("quantity")
	amount := c.FormValue("amount")
	category := c.FormValue("category")
	editingData := states.FilesProduct[filename]
	total := states.FilesProduct[filename].Total
	var editedData states.Product

	// Find and update the product
	for _, data := range editingData.Products {
		if data.ID == id {
			data.ProductName = productname
			data.Category = category
			data.Quantity = quantity
			data.Amount = amount
			quantity, _ := strconv.ParseFloat(data.Quantity, 64)
			amount, _ := strconv.ParseFloat(data.Amount, 64)
			total += quantity * amount
			editingData.Total = total
			editedData = data
			break
		}
	}

	// Return the updated product
	return c.JSON(http.StatusOK, editedData)
}
