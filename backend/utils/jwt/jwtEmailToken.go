package jwt

import (
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v4"
	// "github.com/joho/godotenv"
)

type EmailClaims struct {
	Email string
	// Username string
	jwt.RegisteredClaims
}

func GenerateEmailToken(email, username string) (string, error) {
	// err := godotenv.Load(".env")
	secretkey := os.Getenv("JWT_SECRET_KEY")
	if secretkey == "" {
		log.Fatal("No secretkey found")
	}
	expirationTime := time.Now().Add(5 * time.Minute)
	claims := &EmailClaims{
		Email: email,
		// Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			Issuer:    "CELEBI",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secretkey))
	if err != nil {
		log.Fatal(err)
		return "", err
	}
	return tokenString, nil
}

func ValidateEmailToken(tokenstr string) (string, error) {
	secretkey := os.Getenv("JWT_SECRET_KEY")
	if secretkey == "" {
		log.Fatal("No secretkey found")
	}
	token, err := jwt.ParseWithClaims(tokenstr, &EmailClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secretkey), nil
	})
	if err != nil {
		log.Fatal(err)
		return "", err
	}
	claims, ok := token.Claims.(*EmailClaims)
	if !ok || !token.Valid {
		log.Fatal("Invalid token")
		return "", jwt.NewValidationError("invalid token", jwt.ValidationErrorClaimsInvalid)
	}
	return claims.Email, nil

}
