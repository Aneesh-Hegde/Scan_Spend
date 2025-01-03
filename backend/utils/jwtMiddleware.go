package utils

import (
	"github.com/labstack/echo/v4"
	"net/http"
	"strings"
)

// JWT middleware to authenticate the user on protected routes
func JWTMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		token := c.Request().Header.Get("Authorization")
		if token == "" {
			return c.JSON(http.StatusUnauthorized, map[string]string{"message": "Missing token"})
		}

		// Remove the "Bearer " part of the token if present
		parts := strings.Split(token, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.JSON(http.StatusUnauthorized, map[string]string{"message": "Invalid token format"})
		}

		userID, err := ValidateJWT(parts[1])
		if err != nil {
			return c.JSON(http.StatusUnauthorized, map[string]string{"message": "Invalid or expired token"})
		}

		// Optionally, you can set user ID in context if needed
		c.Set("user_id", userID)

		return next(c)
	}
}
