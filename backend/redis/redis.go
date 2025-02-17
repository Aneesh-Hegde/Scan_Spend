package redis

import (
	"context"
	"encoding/json"
	"log"
	"os"
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

func CacheProductData(filename string, products []states.Product) error {
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

func GetCachedProductData(filename string) ([]states.Product, error) {
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

func CacheRefreshToken(token string,userId int)error{
  err:=RedisClient.Set(context.Background(),"refreshToken"+token,userId,30*24*time.Hour).Err()
  if err!=nil{
    return err
  }
  return nil
}

func GetRefreshToken(token string)(string,error){
  refreshToken,err:=RedisClient.Get(context.Background(),"refreshToken"+token).Result()
  if err!=nil{
    return "",err
  }
  return refreshToken,nil
}
