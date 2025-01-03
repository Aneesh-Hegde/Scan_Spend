package utils

import (
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func Login(c echo.Context) error {
	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"message": "Invalid request payload"})
	}
	fmt.Print(req.Username, req.Password)
	// Replace with actual authentication logic
	if req.Username != "admin" || req.Password != "password" {
		return c.JSON(http.StatusUnauthorized, map[string]string{"message": "Invalid credentials"})
	}

	token, err := GenerateJWT("123") // Replace "123" with the user ID from the database
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "Failed to generate token"})
	}
	fmt.Println(token)
	return c.JSON(http.StatusOK, map[string]string{"token": token})
}
