package jwt

import (
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

type Claims struct {
	UserID int `json:"user_id"`
	jwt.RegisteredClaims
}

func GenerateJWT(userID int) (string, error) {
	secretKey := os.Getenv("JWT_SECRET_KEY")
	if secretKey == "" {
		log.Print("JWT secret key not set")
	}
	expirationTime := time.Now().Add(30 * time.Minute)
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			Issuer:    "CELEBI",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secretKey))
	if err != nil {
		return "", err
	}
	return tokenString, nil
}

func ValidateJWT(tokenStr string) (int, error) {
	secretKey := os.Getenv("JWT_SECRET_KEY")
	if secretKey == "" {
		log.Print("JWT secretKey not set")
	}

	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secretKey), nil
	})
	if err != nil {
		var ve *jwt.ValidationError
		if errors.As(err, &ve) {
			switch {
			case ve.Errors&jwt.ValidationErrorExpired != 0:
				return 0, errors.New("token expired")
			case ve.Errors&jwt.ValidationErrorSignatureInvalid != 0:
				return 0, fmt.Errorf("invalid signature (tampered token)")
			case ve.Errors&jwt.ValidationErrorMalformed != 0:
				return 0, fmt.Errorf("malformed token (wrong format)")
			case ve.Errors&jwt.ValidationErrorClaimsInvalid != 0:
				return 0, fmt.Errorf("invalid token claims")
			default:
				return 0, fmt.Errorf("invalid token: %v", err)
			}
		}
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return 0, jwt.NewValidationError("invalid token", jwt.ValidationErrorClaimsInvalid)
	}
	return claims.UserID, nil
}
