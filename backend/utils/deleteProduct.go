package utils

import (
	"github.com/Aneesh-Hegde/expenseManager/states"
	"github.com/labstack/echo/v4"
	"net/http"
	"strconv"
)

func DeleteProduct(c echo.Context) error {
	filename := c.Param("file")
	id := c.Param("id")
	editingData := states.FilesProduct[filename]
	total := states.FilesProduct[filename].Total

	// Find and delete the product
	for i, data := range editingData.Products {
		if data.ID == id {
			quantity, _ := strconv.ParseFloat(data.Quantity, 64)
			amount, _ := strconv.ParseFloat(data.Amount, 64)
			total -= quantity * amount
			editingData.Products = append(editingData.Products[:i], editingData.Products[i+1:]...)
			editingData.Total = total
			states.FilesProduct[filename] = editingData
			break
		}
	}

	return c.String(http.StatusOK, "Product deleted")
}
