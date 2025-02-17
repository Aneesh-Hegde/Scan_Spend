package utils
import(
	"github.com/labstack/echo/v4"
  "fmt"
  "strings"
  "net/http"
  "time"
)
func SetRefreshTokenHandler(c echo.Context) error {
	authHeader := c.Request().Header.Get("Authorization")
	fmt.Println("set token called", c.Request().Header)
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer") {
		return c.JSON(http.StatusUnauthorized, map[string]string{"error": "Authentication header missing"})

	}
	refreshToken := strings.TrimPrefix(authHeader, "Bearer ")
	fmt.Println(refreshToken)
	cookies := &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		HttpOnly: true,
		Secure:   false,
		Path:     "/",
		Expires:  time.Now().Add(24 * 30 * time.Hour),
		SameSite: http.SameSiteLaxMode,
	}
	c.SetCookie(cookies)
	return c.JSON(http.StatusOK, map[string]string{
		"message": "Refresh token set successfully",
	})

}
