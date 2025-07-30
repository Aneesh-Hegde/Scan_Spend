package utils
import(
	"github.com/labstack/echo/v4"
  "fmt"
  "net/http"
)
func GetRefreshTokenHandler(c echo.Context) error {
	cookie, err := c.Cookie("refresh_token")
	if err != nil {
		// Handle error (e.g., cookie not found)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "refresh token cookie not found"})
	}

	// Use the cookie's value
	refreshToken := cookie.Value
	fmt.Println("Retrieved refresh token:", refreshToken)

	return c.JSON(http.StatusOK, map[string]string{"refresh_token": refreshToken})
}
