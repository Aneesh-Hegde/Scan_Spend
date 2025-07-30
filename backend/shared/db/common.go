package db

import (
    "context"
    "log"
    "sync"
    "time"
    "github.com/Aneesh-Hegde/expenseManager/config"
    "github.com/jackc/pgx/v4/pgxpool"
)

var (
    DB   *pgxpool.Pool
    mu   sync.RWMutex
    // Removed sync.Once - this was preventing reconnections
)

// GetDB returns database pool, recreating it if unhealthy
func GetDB() *pgxpool.Pool {
    // Fast path: read lock for existing healthy pool
    mu.RLock()
    pool := DB
    mu.RUnlock()
    
    // Check if pool needs recreation
    if pool == nil || !isPoolHealthy(pool) {
        // Slow path: write lock for pool recreation
        mu.Lock()
        // Double-check after acquiring write lock
        if DB == nil || !isPoolHealthy(DB) {
            log.Println("Database pool unhealthy or nil, reinitializing...")
            InitDB()
        }
        pool = DB
        mu.Unlock()
    }
    
    return pool
}

// InitDB creates new database connection pool
func InitDB() {
    dbURL := config.GetDatabaseURL()
    log.Printf("Connecting to database: %s", dbURL)
    
    poolConfig, err := pgxpool.ParseConfig(dbURL)
    if err != nil {
        log.Fatalf("Unable to parse database URL: %v", err)
    }
    
    // Optimized settings for microservices
    poolConfig.MaxConns = 10
    poolConfig.MinConns = 2
    poolConfig.MaxConnLifetime = time.Minute * 30  // Shorter lifetime prevents stale connections
    poolConfig.MaxConnIdleTime = time.Minute * 10  // Aggressive idle timeout
    poolConfig.HealthCheckPeriod = time.Minute * 5 // Automatic health checks
    
    // Connection timeout to prevent hanging
    poolConfig.ConnConfig.ConnectTimeout = time.Second * 10
    
    newDB, err := pgxpool.ConnectConfig(context.Background(), poolConfig)
    if err != nil {
        log.Fatalf("Unable to connect to the database: %v", err)
    }
    
    // Test new connection
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    if err := newDB.Ping(ctx); err != nil {
        newDB.Close()
        log.Fatalf("Unable to ping database: %v", err)
    }
    
    // Replace old pool atomically
    if DB != nil {
        DB.Close()
        log.Println("Closed old database connection.")
    }
    
    DB = newDB
    log.Println("Successfully connected to the database.")
}

// CloseDB closes the database connection pool
func CloseDB() {
    mu.Lock()
    defer mu.Unlock()
    
    if DB != nil {
        DB.Close()
        DB = nil
        log.Println("Database connection closed.")
    }
}

// isPoolHealthy checks if database pool is working
func isPoolHealthy(pool *pgxpool.Pool) bool {
    if pool == nil {
        return false
    }
    
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel()
    
    return pool.Ping(ctx) == nil
}

// GetDBWithTimeout returns database pool with a default timeout context
// Use this in your handlers if you want consistent timeouts
func GetDBWithTimeout(timeout time.Duration) (*pgxpool.Pool, context.Context, context.CancelFunc) {
    pool := GetDB()
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    return pool, ctx, cancel
}
