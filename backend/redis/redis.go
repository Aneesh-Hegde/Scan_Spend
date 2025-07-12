package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/Aneesh-Hegde/expenseManager/states"
	"github.com/go-redis/redis/v8"
)

var RedisClient *redis.Client

func InitRedis() {
	redisAddr := os.Getenv("REDIS_ADDR")
	redisPassword := os.Getenv("REDIS_PASSWORD")
	RedisClient = redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: redisPassword,
		DB:       0,
	})
	_, err := RedisClient.Ping(context.Background()).Result()
	if err != nil {
		log.Printf("Error in connecting to Redis %v", err)
	}
}

func CloseRedis() {
	RedisClient.Close()
}

// CacheProductData stores product data with user-specific key
func CacheProductData(userId int, filename string, products []states.Product) error {
	cachedData, err := json.Marshal(products)
	if err != nil {
		return fmt.Errorf("failed to marshal product data: %w", err)
	}
	
	// Create user-specific key: user:{userId}:file:{filename}:products
	key := fmt.Sprintf("user:%d:file:%s:products", userId, filename)
	
	err = RedisClient.Set(context.Background(), key, cachedData, 1*time.Hour).Err()
	if err != nil {
		return fmt.Errorf("failed to cache product data: %w", err)
	}
	
	log.Printf("Successfully cached product data for user %d, filename: %s", userId, filename)
	return nil
}

// GetCachedProductData retrieves product data with user-specific key
func GetCachedProductData(userId int, filename string) ([]states.Product, error) {
	// Create user-specific key: user:{userId}:file:{filename}:products
	key := fmt.Sprintf("user:%d:file:%s:products", userId, filename)
	
	cachedProducts, err := RedisClient.Get(context.Background(), key).Result()
	if err == redis.Nil {
		return nil, fmt.Errorf("no cached data found for user %d, filename: %s", userId, filename)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get cached data: %w", err)
	}

	var products []states.Product
	err = json.Unmarshal([]byte(cachedProducts), &products)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal cached data: %w", err)
	}
	
	log.Printf("Successfully retrieved cached product data for user %d, filename: %s", userId, filename)
	return products, nil
}

// DeleteCachedProductData removes cached product data for a specific user and filename
func DeleteCachedProductData(userId int, filename string) error {
	key := fmt.Sprintf("user:%d:file:%s:products", userId, filename)
	
	err := RedisClient.Del(context.Background(), key).Err()
	if err != nil {
		return fmt.Errorf("failed to delete cached data: %w", err)
	}
	
	log.Printf("Successfully deleted cached product data for user %d, filename: %s", userId, filename)
	return nil
}

// GetAllUserCachedFiles returns all cached filenames for a specific user
func GetAllUserCachedFiles(userId int) ([]string, error) {
	pattern := fmt.Sprintf("user:%d:file:*:products", userId)
	
	keys, err := RedisClient.Keys(context.Background(), pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get user cached files: %w", err)
	}
	
	var filenames []string
	for _, key := range keys {
		// Extract filename from key: user:{userId}:file:{filename}:products
		parts := strings.Split(key, ":")
		if len(parts) >= 4 {
			filename := parts[3] // filename is at index 3
			filenames = append(filenames, filename)
		}
	}
	
	log.Printf("Found %d cached files for user %d", len(filenames), userId)
	return filenames, nil
}

// DeleteAllUserCachedData removes all cached product data for a specific user
func DeleteAllUserCachedData(userId int) error {
	pattern := fmt.Sprintf("user:%d:file:*:products", userId)
	
	keys, err := RedisClient.Keys(context.Background(), pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to get user keys for deletion: %w", err)
	}
	
	if len(keys) == 0 {
		log.Printf("No cached data found for user %d", userId)
		return nil
	}
	
	err = RedisClient.Del(context.Background(), keys...).Err()
	if err != nil {
		return fmt.Errorf("failed to delete user cached data: %w", err)
	}
	
	log.Printf("Successfully deleted %d cached entries for user %d", len(keys), userId)
	return nil
}

// Legacy function - kept for backward compatibility but now requires userId
// Deprecated: Use CacheProductData with userId instead
func CacheProductDataLegacy(filename string, products []states.Product) error {
	log.Printf("Warning: Using legacy CacheProductData function. Please update to use user-specific caching.")
	cachedData, err := json.Marshal(products)
	if err != nil {
		return err
	}
	err = RedisClient.Set(context.Background(), "file:"+filename+":products", cachedData, 1*time.Hour).Err()
	if err != nil {
		return err
	}
	return nil
}

// Legacy function - kept for backward compatibility but now requires userId  
// Deprecated: Use GetCachedProductData with userId instead
func GetCachedProductDataLegacy(filename string) ([]states.Product, error) {
	log.Printf("Warning: Using legacy GetCachedProductData function. Please update to use user-specific caching.")
	cachedProducts, err := RedisClient.Get(context.Background(), "file:"+filename+":products").Result()
	if err == redis.Nil {
		return nil, err
	}
	if err != nil {
		return nil, err
	}

	var products []states.Product
	err = json.Unmarshal([]byte(cachedProducts), &products)
	if err != nil {
		return nil, err
	}
	return products, nil
}

// CacheRefreshToken stores refresh token with user association
func CacheRefreshToken(token string, userId int) error {
	err := RedisClient.Set(context.Background(), "refreshToken:"+token, userId, 30*24*time.Hour).Err()
	if err != nil {
		return fmt.Errorf("failed to cache refresh token: %w", err)
	}
	return nil
}

// GetRefreshToken retrieves the user ID associated with a refresh token
func GetRefreshToken(token string) (string, error) {
	refreshToken, err := RedisClient.Get(context.Background(), "refreshToken:"+token).Result()
	if err != nil {
		return "", fmt.Errorf("failed to get refresh token: %w", err)
	}
	return refreshToken, nil
}

// DeleteRefreshToken removes a refresh token from cache
func DeleteRefreshToken(token string) error {
	err := RedisClient.Del(context.Background(), "refreshToken:"+token).Err()
	if err != nil {
		return fmt.Errorf("failed to delete refresh token: %w", err)
	}
	return nil
}

// GetUserStats returns statistics about cached data for a user
func GetUserStats(userId int) (map[string]interface{}, error) {
	pattern := fmt.Sprintf("user:%d:file:*:products", userId)
	
	keys, err := RedisClient.Keys(context.Background(), pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get user stats: %w", err)
	}
	
	stats := map[string]interface{}{
		"user_id":           userId,
		"total_cached_files": len(keys),
		"cached_files":      []string{},
	}
	
	var filenames []string
	for _, key := range keys {
		parts := strings.Split(key, ":")
		if len(parts) >= 4 {
			filename := parts[3]
			filenames = append(filenames, filename)
		}
	}
	
	stats["cached_files"] = filenames
	return stats, nil
}
