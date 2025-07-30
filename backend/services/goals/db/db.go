package db

import (
    "context"
    "fmt"
    "time"
    "strconv"
    sharedDB "github.com/Aneesh-Hegde/expenseManager/shared/db"
    "github.com/jackc/pgx/v4"
)

type GoalResult struct {
    ID           string
    Name         string
    TargetAmount float64
    CurrentAmount float64
    Deadline     time.Time
    Description  *string
    CreatedAt    time.Time
    CategoryID   string
    CategoryName string
    Hexcode      string
}

type GoalTransactionResult struct {
    ID              int32
    GoalID          string
    BalanceID       int32
    Amount          float64
    TransactionType string
    CreatedAt       time.Time
    Notes           string
}

type CategoryResult struct {
    ID        string
    Name      string
    Color     string
    UserID    int32
    IsDefault bool
}

type GoalUpdateData struct {
    CurrentAmount float64
    GoalName      string
}

type BalanceData struct {
    CurrentBalance float64
    Description    string
}

func CreateGoal(ctx context.Context, userID, name, description string, targetAmount, currentAmount float64, deadline time.Time, createdAt time.Time, categoryName, hexcode string) (string, error) {
    userIDInt, err := strconv.ParseInt(userID, 10, 32)
    if err != nil {
        return "", fmt.Errorf("invalid user ID: %v", err)
    }

    tx, err := sharedDB.GetDB().Begin(ctx)
    if err != nil {
        return "", fmt.Errorf("error starting transaction: %v", err)
    }
    
    defer func() {
        if err != nil {
            tx.Rollback(ctx)
        }
    }()

    var categoryID string
    categoryCheckQuery := `
        SELECT id FROM goal_management_service.goal_categories 
        WHERE (name = $1 AND user_id = $2) OR (name = $1 AND is_default = true)
        ORDER BY user_id DESC NULLS LAST
        LIMIT 1`
    
    err = tx.QueryRow(ctx, categoryCheckQuery, categoryName, int32(userIDInt)).Scan(&categoryID)
    if err != nil {
        categoryInsertQuery := `
            INSERT INTO goal_management_service.goal_categories (id, name, color, user_id, is_default, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3, false, $4)
            RETURNING id`
        
        err = tx.QueryRow(ctx, categoryInsertQuery,
            categoryName,
            hexcode,
            int32(userIDInt),
            time.Now()).Scan(&categoryID)
        if err != nil {
            return "", fmt.Errorf("error creating category: %v", err)
        }
    }

    goalInsertQuery := `
        INSERT INTO goal_management_service.goals (id, user_id, name, target_amount, current_amount, deadline, description, created_at, category_id)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`
    
    var goalID string
    err = tx.QueryRow(ctx, goalInsertQuery,
        int32(userIDInt),
        name,
        targetAmount,
        currentAmount,
        deadline,
        description,
        createdAt,
        categoryID,
    ).Scan(&goalID)
    
    if err != nil {
        return "", fmt.Errorf("error creating goal: %v", err)
    }

    err = tx.Commit(ctx)
    if err != nil {
        return "", fmt.Errorf("error committing transaction: %v", err)
    }

    return goalID, nil
}

func GetUserGoals(ctx context.Context, userID string) ([]GoalResult, error) {
    userIDInt, err := strconv.ParseInt(userID, 10, 32)
    if err != nil {
        return nil, fmt.Errorf("invalid user ID: %v", err)
    }

    query := `
        SELECT
            g.id,
            g.name,
            g.target_amount,
            g.current_amount,
            g.deadline,
            g.description,
            g.created_at,
            g.category_id,
            gc.name AS category_name,
            gc.color AS hexcode
        FROM goal_management_service.goals g
        JOIN goal_management_service.goal_categories gc ON g.category_id = gc.id
        WHERE g.user_id = $1
        ORDER BY g.created_at DESC`

    rows, err := sharedDB.GetDB().Query(ctx, query, int32(userIDInt))
    if err != nil {
        return nil, fmt.Errorf("error getting goals for user: %v", err)
    }
    defer rows.Close()

    var goals []GoalResult
    for rows.Next() {
        var goal GoalResult
        err := rows.Scan(
            &goal.ID,
            &goal.Name,
            &goal.TargetAmount,
            &goal.CurrentAmount,
            &goal.Deadline,
            &goal.Description,
            &goal.CreatedAt,
            &goal.CategoryID,
            &goal.CategoryName,
            &goal.Hexcode,
        )
        if err != nil {
            return nil, fmt.Errorf("error scanning goal row: %v", err)
        }
        goals = append(goals, goal)
    }

    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("error iterating goal rows: %v", err)
    }

    return goals, nil
}

func DeleteGoal(ctx context.Context, goalID, userID string) (bool, error) {
    userIDInt, err := strconv.ParseInt(userID, 10, 32)
    if err != nil {
        return false, fmt.Errorf("invalid user ID: %v", err)
    }

    cmdTag, err := sharedDB.GetDB().Exec(ctx, 
        "DELETE FROM goal_management_service.goals WHERE id = $1 AND user_id = $2", 
        goalID, int32(userIDInt))
    if err != nil {
        return false, fmt.Errorf("failed to delete goal: %w", err)
    }
    
    return cmdTag.RowsAffected() > 0, nil
}

func CreateNewGoal(ctx context.Context, userID, name, description string, targetAmount, currentAmount float64, deadline, categoryID string) (string, error) {
    userIDInt, err := strconv.ParseInt(userID, 10, 32)
    if err != nil {
        return "", fmt.Errorf("invalid user ID: %v", err)
    }

    query := `
        INSERT INTO goal_management_service.goals (id, user_id, name, description, target_amount, current_amount, deadline, created_at, category_id)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`

    var newID string
    err = sharedDB.GetDB().QueryRow(ctx, query,
        int32(userIDInt),
        name,
        description,
        targetAmount,
        currentAmount,
        deadline,
        time.Now(),
        categoryID,
    ).Scan(&newID)
    
    if err != nil {
        return "", fmt.Errorf("failed to create new goal: %w", err)
    }

    return newID, nil
}

func UpdateGoal(ctx context.Context, goalID, userID, name, description string, targetAmount, currentAmount float64, deadline, categoryID string) (string, error) {
    userIDInt, err := strconv.ParseInt(userID, 10, 32)
    if err != nil {
        return "", fmt.Errorf("invalid user ID: %v", err)
    }

    query := `
        UPDATE goal_management_service.goals
        SET
            name = $1,
            description = $2,
            target_amount = $3,
            current_amount = $4,
            deadline = $5,
            category_id = $6
        WHERE id = $7 AND user_id = $8
        RETURNING id`

    var updatedID string
    err = sharedDB.GetDB().QueryRow(ctx, query,
        name,
        description,
        targetAmount,
        currentAmount,
        deadline,
        categoryID,
        goalID,
        int32(userIDInt),
    ).Scan(&updatedID)
    
    if err != nil {
        if err == pgx.ErrNoRows {
            return "", fmt.Errorf("goal with ID '%s' not found or not owned by user", goalID)
        }
        return "", fmt.Errorf("failed to update goal: %w", err)
    }

    return updatedID, nil
}

func CheckCategoryExists(ctx context.Context, categoryID, userID string) (bool, error) {
    userIDInt, err := strconv.ParseInt(userID, 10, 32)
    if err != nil {
        return false, fmt.Errorf("invalid user ID: %v", err)
    }

    var count int
    err = sharedDB.GetDB().QueryRow(ctx,
        "SELECT COUNT(*) FROM goal_management_service.goal_categories WHERE id = $1 AND (user_id IS NULL OR user_id = $2)",
        categoryID, int32(userIDInt)).Scan(&count)
    if err != nil {
        return false, fmt.Errorf("error checking category existence: %w", err)
    }
    return count > 0, nil
}

func CheckGoalOwnership(ctx context.Context, goalID, userID string) (bool, error) {
    userIDInt, err := strconv.ParseInt(userID, 10, 32)
    if err != nil {
        return false, fmt.Errorf("invalid user ID: %v", err)
    }

    var exists bool
    checkGoalQuery := `
        SELECT EXISTS(
            SELECT 1 FROM goal_management_service.goals
            WHERE id = $1 AND user_id = $2
        )`
    
    err = sharedDB.GetDB().QueryRow(ctx, checkGoalQuery, goalID, int32(userIDInt)).Scan(&exists)
    if err != nil {
        return false, fmt.Errorf("failed to verify goal ownership: %w", err)
    }
    
    return exists, nil
}

func GetGoalTransactions(ctx context.Context, goalID, userID string) ([]GoalTransactionResult, error) {
    userIDInt, err := strconv.ParseInt(userID, 10, 32)
    if err != nil {
        return nil, fmt.Errorf("invalid user ID: %v", err)
    }

    getTransactionsQuery := `
        SELECT
            gt.id,
            gt.goal_id,
            gt.balance_id,
            gt.amount,
            gt.transaction_type,
            gt.created_at,
            gt.notes
        FROM goal_management_service.goal_transactions gt
        INNER JOIN goal_management_service.goals g ON gt.goal_id = g.id
        WHERE gt.goal_id = $1 AND g.user_id = $2
        ORDER BY gt.created_at DESC`

    rows, err := sharedDB.GetDB().Query(ctx, getTransactionsQuery, goalID, int32(userIDInt))
    if err != nil {
        return nil, fmt.Errorf("failed to fetch goal transactions: %w", err)
    }
    defer rows.Close()

    var transactions []GoalTransactionResult
    for rows.Next() {
        var transaction GoalTransactionResult
        err := rows.Scan(
            &transaction.ID,
            &transaction.GoalID,
            &transaction.BalanceID,
            &transaction.Amount,
            &transaction.TransactionType,
            &transaction.CreatedAt,
            &transaction.Notes,
        )
        if err != nil {
            return nil, fmt.Errorf("failed to scan transaction row: %w", err)
        }
        transactions = append(transactions, transaction)
    }

    if err = rows.Err(); err != nil {
        return nil, fmt.Errorf("error iterating transaction rows: %w", err)
    }

    return transactions, nil
}

func GetGoalUpdateData(ctx context.Context, goalID, userID string) (*GoalUpdateData, error) {
    userIDInt, err := strconv.ParseInt(userID, 10, 32)
    if err != nil {
        return nil, fmt.Errorf("invalid user ID: %v", err)
    }

    var data GoalUpdateData
    getCurrentQuery := `
        SELECT current_amount, name
        FROM goal_management_service.goals
        WHERE id = $1 AND user_id = $2`
    
    err = sharedDB.GetDB().QueryRow(ctx, getCurrentQuery, goalID, int32(userIDInt)).Scan(&data.CurrentAmount, &data.GoalName)
    if err != nil {
        if err == pgx.ErrNoRows {
            return nil, fmt.Errorf("goal with ID '%s' not found or not owned by user", goalID)
        }
        return nil, fmt.Errorf("failed to fetch current goal amount: %w", err)
    }
    
    return &data, nil
}

func UpdateGoalAmount(ctx context.Context, goalID, userID string, amount float64) error {
    userIDInt, err := strconv.ParseInt(userID, 10, 32)
    if err != nil {
        return fmt.Errorf("invalid user ID: %v", err)
    }

    updateGoalQuery := `
        UPDATE goal_management_service.goals
        SET current_amount = $1
        WHERE id = $2 AND user_id = $3`

    _, err = sharedDB.GetDB().Exec(ctx, updateGoalQuery, amount, goalID, int32(userIDInt))
    if err != nil {
        return fmt.Errorf("failed to update goal progress: %w", err)
    }
    
    return nil
}

func GetBalanceData(ctx context.Context, balanceID int32, userID string) (*BalanceData, error) {
    userIDInt, err := strconv.ParseInt(userID, 10, 32)
    if err != nil {
        return nil, fmt.Errorf("invalid user ID: %v", err)
    }

    var data BalanceData
    getBalanceQuery := `
        SELECT amount, description
        FROM account_income_service.incomes
        WHERE income_id = $1 AND user_id = $2`
    
    err = sharedDB.GetDB().QueryRow(ctx, getBalanceQuery, balanceID, int32(userIDInt)).Scan(&data.CurrentBalance, &data.Description)
    if err != nil {
        if err == pgx.ErrNoRows {
            return nil, fmt.Errorf("balance account not found or not owned by user")
        }
        return nil, fmt.Errorf("failed to fetch balance information: %w", err)
    }
    
    return &data, nil
}

func CreateGoalTransaction(ctx context.Context, goalID string, balanceID int32, amount float64, transactionType, notes string) error {
    insertTransactionQuery := `
        INSERT INTO goal_management_service.goal_transactions (goal_id, balance_id, amount, transaction_type, notes)
        VALUES ($1, $2, $3, $4, $5)`
    
    _, err := sharedDB.GetDB().Exec(ctx, insertTransactionQuery, goalID, balanceID, amount, transactionType, notes)
    if err != nil {
        return fmt.Errorf("failed to create transaction record: %w", err)
    }
    
    return nil
}

func UpdateBalanceAccount(ctx context.Context, balanceID int32, userID string, balanceChange float64) error {
    userIDInt, err := strconv.ParseInt(userID, 10, 32)
    if err != nil {
        return fmt.Errorf("invalid user ID: %v", err)
    }

    updateBalanceQuery := `
        UPDATE account_income_service.incomes
        SET amount = amount + $1, last_updated = NOW()
        WHERE income_id = $2 AND user_id = $3`
    
    _, err = sharedDB.GetDB().Exec(ctx, updateBalanceQuery, balanceChange, balanceID, int32(userIDInt))
    if err != nil {
        return fmt.Errorf("failed to update balance account: %w", err)
    }
    
    return nil
}

func ExecuteGoalUpdateTransaction(ctx context.Context, goalID, userID string, amount float64, balanceID int32, transactionType, notes string, amountDiff float64) error {
    userIDInt, err := strconv.ParseInt(userID, 10, 32)
    if err != nil {
        return fmt.Errorf("invalid user ID: %v", err)
    }

    tx, err := sharedDB.GetDB().Begin(ctx)
    if err != nil {
        return fmt.Errorf("failed to start transaction: %w", err)
    }
    defer tx.Rollback(ctx)

    _, err = tx.Exec(ctx, `
        UPDATE goal_management_service.goals
        SET current_amount = $1
        WHERE id = $2 AND user_id = $3`, amount, goalID, int32(userIDInt))
    if err != nil {
        return fmt.Errorf("failed to update goal progress: %w", err)
    }

    if amountDiff != 0 && balanceID != 0 {
        _, err = tx.Exec(ctx, `
            INSERT INTO goal_management_service.goal_transactions (goal_id, balance_id, amount, transaction_type, notes)
            VALUES ($1, $2, $3, $4, $5)`, goalID, balanceID, amountDiff, transactionType, notes)
        if err != nil {
            return fmt.Errorf("failed to create transaction record: %w", err)
        }

        var balanceChange float64
        if transactionType == "deposit" {
            balanceChange = -amountDiff
        } else {
            balanceChange = amountDiff
        }

        _, err = tx.Exec(ctx, `
            UPDATE account_income_service.incomes
            SET amount = amount + $1, last_updated = NOW()
            WHERE income_id = $2 AND user_id = $3`, balanceChange, balanceID, int32(userIDInt))
        if err != nil {
            return fmt.Errorf("failed to update balance account: %w", err)
        }
    }

    return tx.Commit(ctx)
}

