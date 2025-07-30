package jwt

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
)

func GenerateRefreshToken() (string, error) {
	tokenBytes := make([]byte, 32)
	_, err := rand.Read(tokenBytes)
	if err != nil {
		return "", fmt.Errorf("failed to generate refresh token: %v", err)
	}
	return base64.URLEncoding.EncodeToString(tokenBytes), nil
}

