package goals

import (
    "context"
    "fmt"
    goalDB "github.com/Aneesh-Hegde/expenseManager/services/goals/db"
    goals "github.com/Aneesh-Hegde/expenseManager/grpc_goal"
    "google.golang.org/grpc"
    "google.golang.org/grpc/metadata"
)

func UpdateGoals(ctx context.Context, req *goals.UpdateGoalRequest) (*goals.UpdateResponse, error) {
    md, _ := metadata.FromIncomingContext(ctx)

    if len(md["token"]) > 0 && len(md["token"][0]) > 0 {
        headers := metadata.Pairs("token", md["token"][0])
        grpc.SendHeader(ctx, headers)
    }

    userId := md["user_id"][0]

    if req.GetId() == "" {
        return nil, fmt.Errorf("Goal ID is required for updating progress")
    }

    if req.GetAmount() < 0 {
        return nil, fmt.Errorf("Amount cannot be negative")
    }

    // Get current goal data
    goalData, err := goalDB.GetGoalUpdateData(ctx, req.GetId(), userId)
    if err != nil {
        return nil, err
    }

    amountDiff := req.GetAmount() - goalData.CurrentAmount

    // Handle balance transfer if there's an amount difference and balance_id is provided
    if amountDiff != 0 && req.GetBalanceId() != 0 {
        // Get balance data
        balanceData, err := goalDB.GetBalanceData(ctx, req.GetBalanceId(), userId)
        if err != nil {
            return nil, err
        }

        // Check for sufficient funds if adding money to goal
        if req.GetTransactionType() == "deposit" && balanceData.CurrentBalance < amountDiff {
            return nil, fmt.Errorf("Insufficient funds in account '%s'. Available: %.2f, Required: %.2f",
                balanceData.Description, balanceData.CurrentBalance, amountDiff)
        }

        notes := req.GetNotes()
        if notes == "" {
            if req.GetTransactionType() == "deposit" {
                notes = fmt.Sprintf("Transfer from %s to goal '%s': %.2f → %.2f",
                    balanceData.Description, goalData.GoalName, goalData.CurrentAmount, req.GetAmount())
            } else {
                notes = fmt.Sprintf("Refund from goal '%s' to %s: %.2f → %.2f",
                    goalData.GoalName, balanceData.Description, goalData.CurrentAmount, req.GetAmount())
            }
        }

        // Execute the complete transaction
        err = goalDB.ExecuteGoalUpdateTransaction(ctx, req.GetId(), userId, req.GetAmount(), 
            req.GetBalanceId(), req.GetTransactionType(), notes, amountDiff)
        if err != nil {
            return nil, err
        }
    } else {
        // Just update the goal amount
        err = goalDB.UpdateGoalAmount(ctx, req.GetId(), userId, req.GetAmount())
        if err != nil {
            return nil, err
        }
    }

    // Create success message
    var message string
    if amountDiff == 0 {
        message = fmt.Sprintf("Goal '%s' updated successfully (no amount change)", goalData.GoalName)
    } else if req.GetBalanceId() == 0 {
        message = fmt.Sprintf("Goal '%s' amount updated to %.2f (no balance transfer)", goalData.GoalName, req.GetAmount())
    } else {
        if req.GetTransactionType() == "deposit" {
            message = fmt.Sprintf("Goal '%s' updated: %.2f transferred from account", goalData.GoalName, amountDiff)
        } else {
            message = fmt.Sprintf("Goal '%s' updated: %.2f refunded to account", goalData.GoalName, -amountDiff)
        }
    }

    return &goals.UpdateResponse{
        Message: message,
    }, nil
}

