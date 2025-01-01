package utils

import (
	"github.com/Aneesh-Hegde/expenseManager/states"
	"github.com/labstack/echo/v4"
	"net/http"
	"strconv"
)

func EditProduct(c echo.Context) error {
	filename := c.Param("file")
	id := c.Param("id")
	editingData := states.FilesProduct[filename]
	total := states.FilesProduct[filename].Total
	var editProduct states.Product

	// Find the product to edit
	for _, data := range editingData.Products {
		if data.ID == id {
			editProduct = data
			quantity, _ := strconv.ParseFloat(data.Quantity, 64)
			amount, _ := strconv.ParseFloat(data.Amount, 64)
			total -= quantity * amount
			editingData.Total = total
			break
		}
	}

	// Return the product to edit
	return c.JSON(http.StatusOK, map[string]states.Product{"product": editProduct})
}
