"use client"
//TODO:: unique insensitive fileter on category and also make edit work properly
import React, { useState, useEffect, useCallback, Suspense } from "react"
import { Plus, Target, TrendingUp, Calendar, DollarSign, MoreHorizontal, Edit, Trash2, CheckCircle, Palette, List, X, Search } from "lucide-react"

// --- UI Components from shadcn/ui ---
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// --- gRPC Imports ---
import {
  GetGoalRequest,
  GetGoalResponse,
  Goals,
  UpdateGoalRequest,
  UpdateResponse,
  EditGoalRequest,
  EditResponse,
  DeleteGoalRequest,
  DeleteResponse,
  CreateGoalRequest,
  CreateGoalResponse,
  GetGoalTransactionsRequest,  // Add this
  GetGoalTransactionsResponse, // Add this
  GoalTransaction              // Add this
} from '../grpc_schema/goal_pb'; // Adjust path if needed
import { GoalServiceClient } from '../grpc_schema/GoalServiceClientPb'; // Adjust path if needed
import {
  GetBalanceRequest,
  GetBalanceResponse,
  UpdateBalanceRequest,
  UpdateBalanceResponse,
  Balance
} from '../grpc_schema/balance_pb';
import { BalanceServiceClient } from '../grpc_schema/BalanceServiceClientPb';

import api from '../utils/api'; // Assuming this is your configured axios instance
import { Metadata } from 'grpc-web';
import LuxuryCurrencyLoader from "../components/loading"

// --- Interfaces ---
interface Goal {
  id: string
  name: string
  description: string
  targetAmount: number
  currentAmount: number
  category: string // This will store the category ID
  deadline: string
  status: "active" | "completed" | "paused"
  createdAt: string
  hexcode: string // Color for the category
}

interface CustomCategory { // Represents a category structure
  id: string
  name: string
  color: string
}

// --- Default Category Definitions ---
const defaultCategories: Record<string, { name: string; color: string }> = {
  savings: { name: "Savings", color: "#3b82f6" },
  debt: { name: "Debt", color: "#ef4444" },
  investment: { name: "Investment", color: "#10b981" },
  emergency: { name: "Emergency", color: "#f97316" },
  vacation: { name: "Vacation", color: "#8b5cf6" },
  other: { name: "Other", color: "#6b7280" },
}


interface UpdateProgressDialogProps {
  isOpen: boolean;
  goal: Goal | null;
  progressUpdate: {
    amount: string;
    balanceSourceId: string;
  };
  balances: Balance[];
  onClose: () => void;
  onProgressUpdateChange: (updater: (prev: { amount: string; balanceSourceId: string }) => { amount: string; balanceSourceId: string }) => void;
  onSubmit: () => void;
  formatCurrency: (amount: number) => string;
}

const UpdateProgressDialog: React.FC<UpdateProgressDialogProps> = ({
  isOpen,
  goal,
  progressUpdate,
  balances,
  onClose,
  onProgressUpdateChange,
  onSubmit,
  formatCurrency
}) => {
  const currentAmount: number = goal?.currentAmount || 0;
  const newAmount: number = progressUpdate.amount ? Number.parseFloat(progressUpdate.amount) : 0;
  const amountDifference: number = newAmount - currentAmount;
  const isAddingMoney: boolean = amountDifference > 0;
  const isReducingMoney: boolean = amountDifference < 0;

  return (
    <Dialog open={isOpen} onOpenChange={(isOpen: boolean) => {
      if (!isOpen) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Progress for "{goal?.name}"</DialogTitle>
          <DialogDescription>
            Current: {formatCurrency(goal?.currentAmount || 0)} |
            Target: {formatCurrency(goal?.targetAmount || 0)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="newAmount">New Total Saved Amount</Label>
            <Input
              id="newAmount"
              type="number"
              min="0"
              step="0.01"
              value={progressUpdate.amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onProgressUpdateChange(prev => ({ ...prev, amount: e.target.value }))}
              placeholder={`Current: ${currentAmount}`}
            />
          </div>

          {/* Always show balance selection for any amount change */}
          {progressUpdate.amount && amountDifference !== 0 && (
            <>
              <div className="grid gap-2">
                <Label>
                  {isAddingMoney ? "Transfer from Account" : "Refund to Account"}
                </Label>
                <Select
                  value={progressUpdate.balanceSourceId}
                  onValueChange={(value: string) => onProgressUpdateChange(prev => ({ ...prev, balanceSourceId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select account to ${isAddingMoney ? 'transfer from' : 'refund to'}...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {balances.map((balance: Balance) => (
                      <SelectItem key={balance.getBalanceId()} value={balance.getBalanceId().toString()}>
                        <div className="flex justify-between items-center w-full">
                          <span>{balance.getBalanceSource()}</span>
                          <span className="text-muted-foreground ml-2">
                            {formatCurrency(balance.getBalance())}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction preview */}
              <div className={`text-sm p-3 rounded-lg border ${isAddingMoney
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                }`}>
                <div className="font-medium mb-1">
                  {isAddingMoney ? '💸 Money Transfer' : '💰 Money Refund'}
                </div>
                <div className="space-y-1 text-xs">
                  <div>New Total: <span className="font-medium">{formatCurrency(newAmount)}</span></div>
                  <div>Goal: <span className="font-medium">{formatCurrency(currentAmount)} → {formatCurrency(newAmount)}</span></div>
                  {progressUpdate.balanceSourceId && (
                    <div>Account: <span className="font-medium">
                      {balances.find((b: Balance) => b.getBalanceId().toString() === progressUpdate.balanceSourceId)?.getBalanceSource()}
                    </span></div>
                  )}
                </div>
              </div>

              {/* Insufficient funds warning */}
              {isAddingMoney && progressUpdate.balanceSourceId && (
                (() => {
                  const selectedBalance: Balance | undefined = balances.find((b: Balance) => b.getBalanceId().toString() === progressUpdate.balanceSourceId);
                  if (selectedBalance && selectedBalance.getBalance() < amountDifference) {
                    return (
                      <div className="text-sm p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300">
                        ⚠️ Insufficient funds! Available: {formatCurrency(selectedBalance.getBalance())}
                      </div>
                    );
                  }
                  return null;
                })()
              )}
            </>
          )}

          {progressUpdate.amount && amountDifference === 0 && (
            <div className="text-sm text-muted-foreground p-2 bg-gray-50 dark:bg-gray-900/20 rounded">
              No change in amount - no transfer needed
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={progressUpdate.amount !== "" && amountDifference !== 0 && !progressUpdate.balanceSourceId}
          >
            {amountDifference === 0 ? 'Update' : isAddingMoney ? 'Transfer & Update' : 'Refund & Update'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TransactionHistoryDialog: React.FC<{
  isOpen: boolean;
  goalId: string | null;
  transactions: GoalTransaction[];
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  balances: Balance[];
  goals: Goal[]; // Add this prop
}> = ({ isOpen, goalId, transactions, onClose, formatCurrency, formatDate, balances, goals }) => {
  const getBalanceSourceName = (balanceId: number) => {
    const balance = balances.find((b: Balance) => b.getBalanceId() === balanceId);
    return balance ? balance.getBalanceSource() : `Balance ID: ${balanceId}`;
  };

  // ADD THIS CODE BLOCK HERE:
  // Calculate total deposits and withdrawals
  const transactionSummary = React.useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        const amount = Math.abs(transaction.getAmount());
        if (transaction.getTransactionType() === 'deposit') {
          acc.totalDeposits += amount;
          acc.depositCount += 1;
        } else if (transaction.getTransactionType() === 'withdrawal') {
          acc.totalWithdrawals += amount;
          acc.withdrawalCount += 1;
        }
        return acc;
      },
      {
        totalDeposits: 0,
        totalWithdrawals: 0,
        depositCount: 0,
        withdrawalCount: 0,
      }
    );
  }, [transactions]);

  const netFlow = transactionSummary.totalDeposits - transactionSummary.totalWithdrawals;

  const goal = goals.find((g: Goal) => g.id === goalId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Transaction History</DialogTitle>
          <DialogDescription>
            {goal ? `Transaction history for "${goal.name}"` : 'Goal transaction history'}
          </DialogDescription>
        </DialogHeader>

        {/* ADD THIS SUMMARY SECTION RIGHT HERE, BEFORE THE TRANSACTION LIST: */}
        {transactions.length > 0 && (
          <div className="border-b pb-4 mb-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Transaction Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Deposits */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-green-600 dark:text-green-400">💰</span>
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Total Deposits</span>
                </div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(transactionSummary.totalDeposits)}
                </div>
                <div className="text-xs text-green-600/70 dark:text-green-400/70">
                  {transactionSummary.depositCount} transaction{transactionSummary.depositCount !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Total Withdrawals */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-600 dark:text-red-400">💸</span>
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">Total Withdrawals</span>
                </div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(transactionSummary.totalWithdrawals)}
                </div>
                <div className="text-xs text-red-600/70 dark:text-red-400/70">
                  {transactionSummary.withdrawalCount} transaction{transactionSummary.withdrawalCount !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Net Flow */}
              <div className={`border rounded-lg p-3 ${netFlow >= 0
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{netFlow >= 0 ? '📈' : '📉'}</span>
                  <span className={`text-sm font-medium ${netFlow >= 0
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-orange-700 dark:text-orange-300'
                    }`}>
                    Net Flow
                  </span>
                </div>
                <div className={`text-lg font-bold ${netFlow >= 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-orange-600 dark:text-orange-400'
                  }`}>
                  {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}
                </div>
                <div className={`text-xs ${netFlow >= 0
                  ? 'text-blue-600/70 dark:text-blue-400/70'
                  : 'text-orange-600/70 dark:text-orange-400/70'
                  }`}>
                  {netFlow >= 0 ? 'Net positive' : 'Net negative'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found for this goal.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction: GoalTransaction) => (
                <div
                  key={transaction.getId()}
                  className={`p-4 rounded-lg border ${transaction.getTransactionType() === 'deposit'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {transaction.getTransactionType() === 'deposit' ? '💰' : '💸'}
                        </span>
                        <span className="font-medium">
                          {transaction.getTransactionType() === 'deposit' ? 'Deposit' : 'Withdrawal'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getBalanceSourceName(transaction.getBalanceId())}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {transaction.getNotes() || 'No notes provided'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.getCreatedAt())}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${transaction.getTransactionType() === 'deposit'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                        }`}>
                        {transaction.getTransactionType() === 'deposit' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.getAmount()))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface AllGoalsTransactionHistoryDialogProps {
  isOpen: boolean;
  goals: Goal[];
  balances: Balance[];
  allDisplayCategories: CustomCategory[];
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  fetchGoalTransactions: (goalId: string) => Promise<GoalTransaction[]>;
}

const AllGoalsTransactionHistoryDialog: React.FC<AllGoalsTransactionHistoryDialogProps> = ({
  isOpen,
  goals,
  balances,
  allDisplayCategories,
  onClose,
  formatCurrency,
  formatDate,
  fetchGoalTransactions
}) => {
  const [allTransactions, setAllTransactions] = useState<GoalTransaction[]>([]);
  const [filteredGoalId, setFilteredGoalId] = useState<string>("all");
  const [filteredCategoryId, setFilteredCategoryId] = useState<string>("all");
  const [filteredBalanceId, setFilteredBalanceId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Fetch transactions for all goals when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const fetchAll = async () => {
        try {
          const transactionsPromises = goals.map((goal: Goal) => fetchGoalTransactions(goal.id));
          const transactionsArrays = await Promise.all(transactionsPromises);
          const flattened = transactionsArrays.flat();
          // Sort by date, newest first
          flattened.sort((a, b) => new Date(b.getCreatedAt()).getTime() - new Date(a.getCreatedAt()).getTime());
          setAllTransactions(flattened);
        } catch (err) {
          console.error("Error fetching all transactions:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchAll();
    }
  }, [isOpen, goals, fetchGoalTransactions]);

  // Calculate summary
  const transactionSummary = React.useMemo(() => {
    return allTransactions.reduce(
      (acc, transaction) => {
        const amount = transaction.getAmount();
        if (transaction.getTransactionType() === 'deposit') {
          acc.totalDeposits += amount;
          acc.depositCount += 1;
        } else if (transaction.getTransactionType() === 'withdrawal') {
          acc.totalWithdrawals += amount;
          acc.withdrawalCount += 1;
        }
        return acc;
      },
      { totalDeposits: 0, totalWithdrawals: 0, depositCount: 0, withdrawalCount: 0 }
    );
  }, [allTransactions]);

  const netFlow = transactionSummary.totalDeposits + transactionSummary.totalWithdrawals;

  // Filter transactions based on goal, category, balance, and search term
  const filteredTransactions = React.useMemo(() => {
    return allTransactions.filter((tx: GoalTransaction) => {
      const goal = goals.find((g: Goal) => g.id === tx.getGoalId());
      const matchesGoal = filteredGoalId === "all" || tx.getGoalId() === filteredGoalId;
      const matchesCategory = filteredCategoryId === "all" || (goal && goal.category === filteredCategoryId);
      const matchesBalance = filteredBalanceId === "all" || tx.getBalanceId().toString() === filteredBalanceId;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        (goal?.name.toLowerCase().includes(searchLower)) ||
        (tx.getNotes()?.toLowerCase().includes(searchLower) ?? false)
      );
      return matchesGoal && matchesCategory && matchesBalance && matchesSearch;
    });
  }, [allTransactions, filteredGoalId, filteredCategoryId, filteredBalanceId, searchTerm, goals]);

  const getBalanceSourceName = (balanceId: number) => {
    const balance = balances.find((b: Balance) => b.getBalanceId() === balanceId);
    return balance ? balance.getBalanceSource() : `Balance ${balanceId}`;
  };

  const getGoalName = (goalId: string) => {
    const goal = goals.find((g: Goal) => g.id === goalId);
    return goal ? goal.name : `Goal ${goalId}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>All Goal Transactions</DialogTitle>
          <DialogDescription>View and filter transaction history across all goals.</DialogDescription>
        </DialogHeader>

        {/* Filter and Search Options */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Select
              value={filteredGoalId}
              onValueChange={setFilteredGoalId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by Goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Goals</SelectItem>
                {goals.map((goal: Goal) => (
                  <SelectItem key={goal.id} value={goal.id}>{goal.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={filteredCategoryId}
              onValueChange={setFilteredCategoryId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allDisplayCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      ></span>
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Select
              value={filteredBalanceId}
              onValueChange={setFilteredBalanceId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {balances.map((balance: Balance) => (
                  <SelectItem key={balance.getBalanceId()} value={balance.getBalanceId().toString()}>
                    {balance.getBalanceSource()} ({formatCurrency(balance.getBalance())})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search by goal or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Summary Section */}
        {allTransactions.length > 0 && (
          <div className="border-b pb-4 mb-4">
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Transaction Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-green-600 dark:text-green-400">💰</span>
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Total Deposits</span>
                </div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(transactionSummary.totalDeposits)}
                </div>
                <div className="text-xs text-green-700/70 dark:text-green-400/70">
                  {transactionSummary.depositCount} transaction{transactionSummary.depositCount !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red-600 dark:text-red-400">💸</span>
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">Total Withdrawals</span>
                </div>
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(transactionSummary.totalWithdrawals)}
                </div>
                <div className="text-xs text-red-700/70 dark:text-red-400/70">
                  {transactionSummary.withdrawalCount} transaction{transactionSummary.withdrawalCount !== 1 ? 's' : ''}
                </div>
              </div>
              <div className={`border rounded-lg p-3 ${netFlow >= 0
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{netFlow >= 0 ? '📈' : '📉'}</span>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Net Flow</span>
                </div>
                <div className={`text-lg font-bold ${netFlow >= 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-orange-600 dark:text-orange-400'
                }`}>
                  {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}
                </div>
                <div className="text-xs text-blue-700/70 dark:text-blue-400/70">
                  {netFlow >= 0 ? 'Net positive' : 'Net negative'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction: GoalTransaction) => (
                <div
                  key={transaction.getId()}
                  className={`p-4 rounded-lg border ${
                    transaction.getTransactionType() === 'deposit'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">
                          {transaction.getTransactionType() === 'deposit' ? '💰' : '💸'}
                        </span>
                        <span className="font-medium">
                          {transaction.getTransactionType() === 'deposit' ? 'Deposit' : 'Withdrawal'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getBalanceSourceName(transaction.getBalanceId())}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {getGoalName(transaction.getGoalId())}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {transaction.getNotes() || 'No notes provided'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.getCreatedAt())}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${
                        transaction.getTransactionType() === 'deposit'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.getTransactionType() === 'deposit' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.getAmount()))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  // customCategories state for categories added via "Add Category" button or synced from goals
  const [localCustomCategories, setLocalCustomCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogState, setDialogState] = useState<{
    addOrEditCustomCategory: CustomCategory | boolean;
    addGoal: boolean;
    editGoal: Goal | null;
    updateProgress: Goal | null;
    transactionHistory: string | null; // Add this for goal ID
  }>({
    addGoal: false,
    addOrEditCustomCategory: false,
    editGoal: null,
    updateProgress: null,
    transactionHistory: null // Add this
  });

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // State for the "Add Goal" dialog, including inline new category creation
  const [newGoalForm, setNewGoalForm] = useState({
    name: "",
    description: "",
    targetAmount: "",
    selectedCategoryId: "", // For existing category
    newCategoryName: "",    // For new category being defined inline
    newCategoryColor: "#808080", // Default color for new category color picker
    deadline: "",
    isCreatingNewCategory: false // Toggle for inline category creation UI
  });

  const [customCategoryForm, setCustomCategoryForm] = useState({ name: "", color: "#3b82f6" }); // For the separate "Add/Edit Custom Category" dialog
  const [editGoalData, setEditGoalData] = useState<Partial<Goal>>({});
  const [balances, setBalances] = useState<Balance[]>([]);
  const [selectedBalanceSource, setSelectedBalanceSource] = useState<string>("");

  // Add balance source to progress update state
  const [progressUpdate, setProgressUpdate] = useState({
    amount: "",
    balanceSourceId: ""
  });

  const [showAllTransactionHistory, setShowAllTransactionHistory] = useState<boolean>(false);


  const goalsClient = React.useMemo(() => new GoalServiceClient(process.env.NEXT_PUBLIC_GRPC_API_URL || "http://localhost:8080"), []);
  const balanceClient = React.useMemo(() => new BalanceServiceClient(process.env.NEXT_PUBLIC_GRPC_API_URL || "http://localhost:8080"), []);

  const getRequestMetadata = useCallback(async (): Promise<Metadata> => {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Authentication token not found. Please log in.");
    try {
      const response = await api.get("/get-refresh-token", { withCredentials: true });
      const refreshToken = response.data?.refresh_token;
      if (!refreshToken) throw new Error("Failed to retrieve refresh token.");
      return { authentication: `Bearer ${token}`, refresh_token: refreshToken };
    } catch (err: any) {
      console.error("Failed to get refresh token:", err);
      throw new Error(`Could not retrieve refresh token: ${err.message || 'Unknown error'}`);
    }
  }, []);
  const fetchBalances = useCallback(async () => {
    try {
      const meta = await getRequestMetadata();
      const request = new GetBalanceRequest();

      balanceClient.getBalances(request, meta, (err, res: GetBalanceResponse | null) => {
        if (err) {
          console.error("Failed to fetch balances:", err);
          return;
        }
        if (res) {
          setBalances(res.getBalanceList());
        }
      });
    } catch (err: any) {
      console.error("Error fetching balances:", err);
    }
  }, [getRequestMetadata, balanceClient]);

  // Combine default and local custom categories for selection - UPDATED for case-sensitive uniqueness
  const allDisplayCategories = React.useMemo(() => {
    const combinedCategories = [
      ...Object.entries(defaultCategories).map(([id, val]) => ({ id, ...val })),
      ...localCustomCategories
    ];

    // Keep categories that have different names (case-sensitive) OR same name but different hex codes
    const uniqueCategories = combinedCategories.reduce((acc, current) => {
      const duplicateCategory = acc.find(cat =>
        cat.name === current.name && // Case-sensitive name comparison
        cat.color.toLowerCase() === current.color.toLowerCase()
      );

      // Only add if no exact duplicate (same name AND same color) exists
      if (!duplicateCategory) {
        acc.push(current);
      }

      return acc;
    }, [] as CustomCategory[]);

    return uniqueCategories;
  }, [localCustomCategories]);

  const getCategoryInfo = useCallback((categoryId: string): CustomCategory => {
    // Direct ID match (case-sensitive)
    const directMatch = allDisplayCategories.find(c => c.id === categoryId);
    if (directMatch) {
      return directMatch;
    }

    // Default fallback
    return { name: "Other", color: "#6b7280", id: "other" };
  }, [allDisplayCategories]);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meta = await getRequestMetadata();
      const request = new GetGoalRequest();
      goalsClient.getGoals(request, meta, (err, res: GetGoalResponse | null) => {
        if (err) {
          setError(`Failed to fetch goals: ${err.message}`);
          setLoading(false);
          return;
        }
        if (res) {
          const fetchedGoals: Goal[] = res.getGoalsList().map((g: Goals) => ({
            id: g.getId(),
            name: g.getName(),
            description: g.getDescription(),
            targetAmount: g.getTargetamount(),
            currentAmount: g.getCurrentamount(),
            deadline: g.getDeadline(),
            createdAt: g.getCreatedat(),
            category: g.getCategoryId() || 'other',
            status: g.getCurrentamount() >= g.getTargetamount() ? 'completed' : 'active',
            hexcode: g.getHexcode() || "#6b7280" // Use goal's hexacode, fallback to default
          }));
          setGoals(fetchedGoals);

          // Update localCustomCategories with new categories from goals - UPDATED for case-sensitive uniqueness
          const newCategories: CustomCategory[] = [];
          fetchedGoals.forEach(goal => {
            const categoryId = goal.category;
            const categoryName = res.getGoalsList().find(g => g.getId() === goal.id)?.getCategoryName();
            if (categoryId && categoryName && !defaultCategories[categoryId]) {
              // Check if category already exists (case-sensitive name and color comparison)
              const existingCategory = localCustomCategories.find(c =>
                c.id === categoryId ||
                (c.name === categoryName && c.color.toLowerCase() === (goal.hexcode || "#6b7280").toLowerCase())
              );

              if (!existingCategory) {
                newCategories.push({
                  id: categoryId,
                  name: categoryName,
                  color: goal.hexcode || "#6b7280"
                });
              }
            }
          });
          if (newCategories.length > 0) {
            setLocalCustomCategories(prev => [...prev, ...newCategories]);
          }
        }
        setLoading(false);
      });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [getRequestMetadata, goalsClient, localCustomCategories]);

  useEffect(() => {
    fetchGoals();
    fetchBalances();
  }, [fetchGoals, fetchBalances]);

  const resetNewGoalForm = () => {
    setNewGoalForm({
      name: "",
      description: "",
      targetAmount: "",
      selectedCategoryId: "",
      newCategoryName: "",
      newCategoryColor: "#808080",
      deadline: "",
      isCreatingNewCategory: false
    });
  };

  const handleCreateGoal = async () => {
    const { name, targetAmount, deadline, description, selectedCategoryId, newCategoryName, newCategoryColor, isCreatingNewCategory } = newGoalForm;

    // Validation
    if (!name.trim() || !targetAmount || !deadline) {
      setError("Goal Name, Target Amount, and Deadline are required.");
      return;
    }

    // Prepare the CreateGoalRequest
    const request = new CreateGoalRequest();
    request.setName(name.trim());
    request.setDescription(description.trim());
    request.setTargetamount(Number.parseFloat(targetAmount));
    request.setCurrentamount(0);
    request.setDeadline(deadline);
    request.setCreatedat(new Date().toISOString());

    // Handle category: either existing or new
    if (isCreatingNewCategory) {
      if (!newCategoryName.trim()) {
        setError("New Category Name is required when creating a new category.");
        return;
      }
      request.setCategoryId(""); // Empty ID signals backend to create a new category
      request.setCategoryName(newCategoryName.trim());
      request.setHexacode(newCategoryColor);

      // Optimistically add the new category
      const optimisticCategoryId = `temp-${Date.now()}-${newCategoryName.replace(/\s+/g, "-")}`;
      setLocalCustomCategories(prev => [
        ...prev,
        {
          id: optimisticCategoryId,
          name: newCategoryName.trim(),
          color: newCategoryColor
        }
      ]);
    } else if (selectedCategoryId) {
      const categoryInfo = getCategoryInfo(selectedCategoryId);
      request.setCategoryId(selectedCategoryId);
      request.setCategoryName(categoryInfo.name);
      request.setHexacode(categoryInfo.color);
    } else {
      setError("Please select an existing category or define a new one for the goal.");
      return;
    }

    try {
      const meta = await getRequestMetadata();
      goalsClient.createGoals(request, meta, (err, res: CreateGoalResponse | null) => {
        if (err) {
          setError(`Error creating goal: ${err.message}`);
          if (isCreatingNewCategory) {
            setLocalCustomCategories(prev => prev.filter(c => !c.id.startsWith('temp-')));
          }
          return;
        }
        if (res) {
          fetchGoals();
          setDialogState(prev => ({ ...prev, addGoal: false }));
          resetNewGoalForm();
        } else {
          setError("No response received from server after creating goal.");
          if (isCreatingNewCategory) {
            setLocalCustomCategories(prev => prev.filter(c => !c.id.startsWith('temp-')));
          }
        }
      });
    } catch (err: any) {
      setError(err.message);
      if (isCreatingNewCategory) {
        setLocalCustomCategories(prev => prev.filter(c => !c.id.startsWith('temp-')));
      }
    }
  };

  const handleEditGoal = async () => {
    if (!dialogState.editGoal || !editGoalData) {
      setError("No goal selected for editing or no data to update.");
      return;
    }
    const { id, currentAmount, createdAt } = dialogState.editGoal;
    const goalData = new Goals();
    goalData.setId(id);
    goalData.setName(editGoalData.name || dialogState.editGoal.name);
    goalData.setDescription(editGoalData.description || dialogState.editGoal.description);
    goalData.setTargetamount(Number(editGoalData.targetAmount !== undefined ? editGoalData.targetAmount : dialogState.editGoal.targetAmount));
    goalData.setDeadline(editGoalData.deadline || dialogState.editGoal.deadline);

    const categoryToSet = editGoalData.category || dialogState.editGoal.category;
    const categoryInfo = getCategoryInfo(categoryToSet);
    goalData.setCategoryId(categoryToSet);
    goalData.setCategoryName(categoryInfo.name);
    // goalData.setHexacode(editGoalData.hexcode || categoryInfo.color); // Use updated hexcode if provided

    goalData.setCurrentamount(currentAmount);
    goalData.setCreatedat(createdAt);

    const request = new EditGoalRequest();
    request.setGoal(goalData);

    try {
      const meta = await getRequestMetadata();
      goalsClient.editGoals(request, meta, (err, res: EditResponse | null) => {
        if (err) {
          setError(`Error updating goal: ${err.message}`);
          return;
        }
        fetchGoals();
        setDialogState(prev => ({ ...prev, editGoal: null }));
        setEditGoalData({});
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateProgressWithBalanceDeduction = async (): Promise<void> => {
    if (!dialogState.updateProgress || progressUpdate.amount === "") {
      setError("No goal selected or amount not provided for progress update.");
      return;
    }

    const newTotalAmount: number = Number.parseFloat(progressUpdate.amount);
    if (isNaN(newTotalAmount) || newTotalAmount < 0) {
      setError("Invalid amount. Please enter a valid positive number.");
      return;
    }

    // Always require balance source selection for any amount change
    if (!progressUpdate.balanceSourceId) {
      setError("Please select which account to transfer money from/to.");
      return;
    }

    const currentAmount: number = dialogState.updateProgress.currentAmount;
    const amountDifference: number = newTotalAmount - currentAmount;

    // Skip if no change
    if (amountDifference === 0) {
      setError("No change in amount detected.");
      return;
    }

    // Find the selected balance
    const selectedBalance: Balance | undefined = balances.find(
      (b: Balance) => b.getBalanceId().toString() === progressUpdate.balanceSourceId
    );
    if (!selectedBalance) {
      setError("Selected balance source not found.");
      return;
    }

    // Check funds only when deducting from balance (adding to goal)
    if (amountDifference > 0 && selectedBalance.getBalance() < amountDifference) {
      setError(
        `Insufficient funds. Available: ${formatCurrency(selectedBalance.getBalance())}, Required: ${formatCurrency(amountDifference)}`
      );
      return;
    }

    try {
      const meta: Metadata = await getRequestMetadata();

      // Update goal progress with transaction details
      const goalUpdateRequest = new UpdateGoalRequest();
      goalUpdateRequest.setId(dialogState.updateProgress.id);
      goalUpdateRequest.setAmount(newTotalAmount);
      goalUpdateRequest.setBalanceId(selectedBalance.getBalanceId()); // Add balance ID
      goalUpdateRequest.setTransactionType(amountDifference > 0 ? "deposit" : "withdrawal"); // Add transaction type
      goalUpdateRequest.setNotes(`Goal progress update: ${amountDifference > 0 ? 'Added' : 'Removed'} ${formatCurrency(Math.abs(amountDifference))}`); // Add notes

      goalsClient.updateGoals(goalUpdateRequest, meta, (err, res: UpdateResponse | null) => {
        if (err) {
          setError(`Error updating goal progress: ${err.message}`);
          return;
        }

        // Refresh both goals and balances (backend should handle balance update)
        fetchGoals();
        fetchBalances();
        setDialogState((prev: any) => ({ ...prev, updateProgress: null }));
        setProgressUpdate({ amount: "", balanceSourceId: "" });
        setError(null);
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Add new function to fetch goal transactions
  const fetchGoalTransactions = useCallback(async (goalId: string) => {
    try {
      const meta = await getRequestMetadata();
      const request = new GetGoalTransactionsRequest();
      request.setGoalId(goalId);

      return new Promise<GoalTransaction[]>((resolve, reject) => {
        goalsClient.getGoalTransactions(request, meta, (err, res: GetGoalTransactionsResponse | null) => {
          if (err) {
            reject(err);
            return;
          }
          if (res) {
            resolve(res.getTransactionsList());
          } else {
            resolve([]);
          }
        });
      });
    } catch (err: any) {
      console.error("Error fetching goal transactions:", err);
      throw err;
    }
  }, [getRequestMetadata, goalsClient]);

  // Add state for transaction history
  const [selectedGoalTransactions, setSelectedGoalTransactions] = useState<GoalTransaction[]>([]);
  const [showTransactionHistory, setShowTransactionHistory] = useState<string | null>(null);

  // Add function to show transaction history
  const handleShowTransactionHistory = async (goalId: string) => {
    try {
      setLoading(true);
      const transactions = await fetchGoalTransactions(goalId);
      setSelectedGoalTransactions(transactions);
      setShowTransactionHistory(goalId);
      setLoading(false);
    } catch (err: any) {
      setError(`Failed to fetch transaction history: ${err.message}`);
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    const request = new DeleteGoalRequest();
    request.setId(goalId);
    try {
      const meta = await getRequestMetadata();
      goalsClient.deleteGoals(request, meta, (err, res: DeleteResponse | null) => {
        if (err) {
          setError(`Error deleting goal: ${err.message}`);
        } else {
          fetchGoals();
        }
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveLocalCustomCategory = () => {
    if (customCategoryForm.name.trim()) {
      const { addOrEditCustomCategory } = dialogState;
      if (typeof addOrEditCustomCategory === 'object' && addOrEditCustomCategory.id) {
        setLocalCustomCategories(prev => prev.map(cat => cat.id === addOrEditCustomCategory.id ? { ...cat, ...customCategoryForm } : cat));
      } else {
        const categoryId = `localcustom-${Date.now()}-${customCategoryForm.name.replace(/\s+/g, "-")}`;
        // Case-sensitive duplicate check with hexcode consideration
        if (allDisplayCategories.some(cat =>
          cat.name === customCategoryForm.name &&
          cat.color.toLowerCase() === customCategoryForm.color.toLowerCase()
        )) {
          setError("A category with this exact name and color already exists.");
          return;
        }
        setLocalCustomCategories(prev => [...prev, { id: categoryId, ...customCategoryForm }]);
      }
      setCustomCategoryForm({ name: "", color: "#3b82f6" });
      setDialogState(prev => ({ ...prev, addOrEditCustomCategory: false }));
      setError(null);
    } else {
      setError("Category name cannot be empty.");
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: 'UTC' });
  };
  const getProgressPercentage = (current: number, target: number) => target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const getDaysUntilDeadline = (deadline: string) => {
    if (!deadline) return 0;
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline); deadlineDate.setUTCHours(0, 0, 0, 0);
    return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // UPDATED: Case-sensitive filtering with hexcode consideration
  const filteredGoals = React.useMemo(() => {
    if (selectedCategoryFilter === "all") {
      return goals;
    }

    return goals.filter(goal => {
      const goalCategoryId = goal.category;
      const goalHexcode = goal.hexcode;

      // Direct ID match (primary method)
      if (goalCategoryId === selectedCategoryFilter) {
        return true;
      }

      // Secondary match: Compare by name and hexcode (case-sensitive)
      const selectedCategory = getCategoryInfo(selectedCategoryFilter);
      const goalCategory = getCategoryInfo(goalCategoryId);

      // Case-sensitive name match AND hexcode match
      return (
        selectedCategory.name === goalCategory.name &&
        selectedCategory.color.toLowerCase() === (goalHexcode || goalCategory.color).toLowerCase()
      );
    });
  }, [goals, selectedCategoryFilter, getCategoryInfo]);

  const activeGoals = goals.filter(g => g.status === "active");
  const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = getProgressPercentage(totalSaved, totalTarget);


  return (
    <Suspense fallback={<LuxuryCurrencyLoader />}>
      <div className="container mx-auto p-6 space-y-6">
        {error && <div className="mb-4 p-4 text-center text-red-700 bg-red-100 border border-red-400 rounded-md">Error: {error} <Button variant="ghost" size="sm" onClick={() => setError(null)}>Dismiss</Button></div>}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Goals</h1>
            <p className="text-muted-foreground">Track your progress towards achieving your financial objectives</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAllTransactionHistory(true)}>
              <List className="w-4 h-4 mr-2" /> View All Transactions
            </Button>
            <Button onClick={() => { resetNewGoalForm(); setDialogState(prev => ({ ...prev, addGoal: true })) }}>
              <Plus className="w-4 h-4 mr-2" /> Add Goal
            </Button>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeGoals.length}</div>
              <p className="text-xs text-muted-foreground">{goals.filter(g => g.status === 'completed').length} completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Target (Active)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalTarget)}</div>
              <p className="text-xs text-muted-foreground">Across all active goals</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Saved (All)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSaved)}</div>
              <p className="text-xs text-muted-foreground">Across all goals</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Progress (Active)</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallProgress.toFixed(1)}%</div>
              <Progress value={overallProgress} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <Button
            variant={selectedCategoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategoryFilter("all")}
          >
            All Goals
          </Button>
          {allDisplayCategories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategoryFilter === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategoryFilter(cat.id)}
            >
              <span
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: cat.color }}
              ></span>
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Goals Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGoals.map((goal) => {
            const progress = getProgressPercentage(goal.currentAmount, goal.targetAmount);
            const daysLeft = getDaysUntilDeadline(goal.deadline);
            const isCompleted = goal.status === 'completed' || progress >= 100;
            const isOverdue = daysLeft < 0 && !isCompleted;
            const categoryInfo = getCategoryInfo(goal.category);
            return (
              <Card key={goal.id} className={`flex flex-col ${isCompleted ? "bg-green-50/30 dark:bg-green-900/10 border-green-500/50" : isOverdue ? "bg-red-50/30 dark:bg-red-900/10 border-red-500/50" : ""}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1.5 flex-1">
                      <CardTitle className="text-lg">{goal.name}</CardTitle>
                      <CardDescription className="text-sm line-clamp-2 h-10">{goal.description || "No description."}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleShowTransactionHistory(goal.id)}>
                          <List className="w-4 h-4 mr-2" />
                          Transaction History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const deadlineForInput = goal.deadline ? new Date(goal.deadline).toISOString().split('T')[0] : "";
                          setEditGoalData({
                            name: goal.name,
                            description: goal.description,
                            targetAmount: goal.targetAmount,
                            category: goal.category,
                            deadline: deadlineForInput,
                            hexcode: goal.hexcode
                          });
                          setDialogState(p => ({ ...p, editGoal: goal }));
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Goal
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="text-red-600 focus:text-red-500 dark:focus:text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Goal
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 pt-2 flex-wrap">
                    <Badge variant="secondary" className="text-white" style={{ backgroundColor: goal.hexcode || categoryInfo.color }}>{categoryInfo.name}</Badge>
                    {isCompleted && <Badge variant="default" className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white">Completed</Badge>}
                    {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow flex flex-col justify-end">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Progress</span><span className="font-medium">{progress.toFixed(1)}%</span></div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground"><span>{formatCurrency(goal.currentAmount)}</span><span>{formatCurrency(goal.targetAmount)}</span></div>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="w-4 h-4" /><span>{formatDate(goal.deadline)}</span></div>
                    {!isCompleted && <span className={`font-medium ${isOverdue ? "text-red-500" : daysLeft < 7 ? "text-orange-500" : "text-muted-foreground"}`}>
                      {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`}
                    </span>}
                  </div>
                  {!isCompleted && <Button className="w-full mt-2" variant="outline" onClick={() => {
                    setProgressUpdate({ amount: String(goal.currentAmount), balanceSourceId: "" });
                    setDialogState(p => ({ ...p, updateProgress: goal }))
                  }}>Update Progress</Button>}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredGoals.length === 0 && !loading && (
          <div className="text-center py-16 col-span-full">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Goals Found</h3>
            <p className="text-muted-foreground mb-4">{selectedCategoryFilter === "all" ? "Click 'Add Goal' to create your first one." : `No goals found in the ${getCategoryInfo(selectedCategoryFilter)?.name || 'selected'} category.`}</p>
          </div>
        )}

        {/* --- DIALOGS --- */}

        {/* Add Goal Dialog */}
        <Dialog open={dialogState.addGoal} onOpenChange={(isOpen) => { setDialogState(prev => ({ ...prev, addGoal: isOpen })); if (!isOpen) resetNewGoalForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Goal</DialogTitle>
              <DialogDescription>Create a new financial goal. You can select an existing category or define a new one.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label htmlFor="add-name">Goal Name</Label><Input id="add-name" placeholder="e.g., Emergency Fund" value={newGoalForm.name} onChange={(e) => setNewGoalForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="grid gap-2"><Label htmlFor="add-description">Description (Optional)</Label><Textarea id="add-description" placeholder="Describe your goal" value={newGoalForm.description} onChange={(e) => setNewGoalForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid gap-2"><Label htmlFor="add-target">Target Amount</Label><Input id="add-target" type="number" placeholder="1000.00" value={newGoalForm.targetAmount} onChange={(e) => setNewGoalForm(p => ({ ...p, targetAmount: e.target.value }))} /></div>
              <div className="grid gap-2"><Label htmlFor="add-deadline">Target Date</Label><Input id="add-deadline" type="date" value={newGoalForm.deadline} onChange={(e) => setNewGoalForm(p => ({ ...p, deadline: e.target.value }))} min={new Date().toISOString().split("T")[0]} /></div>

              {/* Category Section: Select or Create New */}
              <div className="grid gap-2 border p-3 rounded-md">
                {newGoalForm.isCreatingNewCategory ? (
                  <>
                    <Label className="font-semibold">Define New Category</Label>
                    <div className="grid gap-2"><Label htmlFor="new-cat-name">New Category Name</Label><Input id="new-cat-name" value={newGoalForm.newCategoryName} onChange={e => setNewGoalForm(p => ({ ...p, newCategoryName: e.target.value }))} placeholder="e.g., Dream Car Fund" /></div>
                    <div className="grid gap-2"><Label htmlFor="new-cat-color">New Category Color</Label><Input id="new-cat-color" type="color" value={newGoalForm.newCategoryColor} onChange={e => setNewGoalForm(p => ({ ...p, newCategoryColor: e.target.value }))} className="w-full h-10 p-1" /></div>
                    <Button variant="outline" size="sm" onClick={() => setNewGoalForm(p => ({ ...p, isCreatingNewCategory: false, newCategoryName: '', newCategoryColor: '#808080' }))}><List className="w-4 h-4 mr-2" />Select Existing Category</Button>
                  </>
                ) : (
                  <>
                    <Label className="font-semibold">Category</Label>
                    <Select value={newGoalForm.selectedCategoryId} onValueChange={(val) => setNewGoalForm(p => ({ ...p, selectedCategoryId: val }))}>
                      <SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger>
                      <SelectContent>{allDisplayCategories.map(c => <SelectItem key={c.id} value={c.id}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />{c.name}</div></SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => setNewGoalForm(p => ({ ...p, isCreatingNewCategory: true, selectedCategoryId: '' }))}><Palette className="w-4 h-4 mr-2" />Create New Category</Button>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDialogState(p => ({ ...p, addGoal: false })); resetNewGoalForm(); }}>Cancel</Button>
              <Button onClick={handleCreateGoal}>Create Goal</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Goal Dialog */}
        <Dialog open={!!dialogState.editGoal} onOpenChange={(isOpen) => { if (!isOpen) { setDialogState(prev => ({ ...prev, editGoal: null })); setEditGoalData({}); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Goal</DialogTitle>
              <DialogDescription>Make changes to your existing goal "{dialogState.editGoal?.name}".</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label htmlFor="edit-name">Goal Name</Label><Input id="edit-name" value={editGoalData?.name || ''} onChange={(e) => setEditGoalData(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="grid gap-2"><Label htmlFor="edit-description">Description</Label><Textarea id="edit-description" value={editGoalData?.description || ''} onChange={(e) => setEditGoalData(p => ({ ...p, description: e.target.value }))} /></div>
              <div className="grid gap-2"><Label htmlFor="edit-target">Target Amount</Label><Input id="edit-target" type="number" value={editGoalData?.targetAmount || ''} onChange={(e) => setEditGoalData(p => ({ ...p, targetAmount: Number(e.target.value) }))} /></div>
              <div className="grid gap-2"><Label htmlFor="edit-deadline">Target Date</Label><Input id="edit-deadline" type="date" value={editGoalData?.deadline || ''} onChange={(e) => setEditGoalData(p => ({ ...p, deadline: e.target.value }))} min={new Date().toISOString().split("T")[0]} /></div>
              <div className="grid gap-2"><Label>Category</Label>
                <Select value={editGoalData?.category} onValueChange={(val) => {
                  const categoryInfo = getCategoryInfo(val);
                  setEditGoalData(p => ({ ...p, category: val, hexcode: categoryInfo.color }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select a category..." /></SelectTrigger>
                  <SelectContent>{allDisplayCategories.map(c => <SelectItem key={c.id} value={c.id}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />{c.name}</div></SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDialogState(p => ({ ...p, editGoal: null })); setEditGoalData({}) }}>Cancel</Button>
              <Button onClick={handleEditGoal}>Save Changes</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Custom Category Dialog */}
        <Dialog open={!!dialogState.addOrEditCustomCategory} onOpenChange={(isOpen) => { if (!isOpen) { setDialogState(p => ({ ...p, addOrEditCustomCategory: false })); setCustomCategoryForm({ name: "", color: "#3b82f6" }); } }}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader><DialogTitle>{typeof dialogState.addOrEditCustomCategory === 'object' ? 'Edit Custom Category' : 'Add Custom Category (Local)'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label htmlFor="custom-cat-name">Category Name</Label><Input id="custom-cat-name" value={customCategoryForm.name} onChange={(e) => setCustomCategoryForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g., Hobbies" /></div>
              <div className="grid gap-2"><Label htmlFor="custom-cat-color">Color</Label><Input id="custom-cat-color" type="color" value={customCategoryForm.color} onChange={(e) => setCustomCategoryForm(p => ({ ...p, color: e.target.value }))} className="w-full h-10 p-1" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDialogState(p => ({ ...p, addOrEditCustomCategory: false })); setCustomCategoryForm({ name: "", color: "#3b82f6" }); }}>Cancel</Button>
              <Button onClick={handleSaveLocalCustomCategory}>Save Category</Button>
            </div>
            <DialogDescription className="text-xs pt-2">Note: This manages a local list of custom categories for display. For categories to be saved permanently on the server, they should be created alongside a goal or via a dedicated server-side category management feature.</DialogDescription>
          </DialogContent>
        </Dialog>

        {/* Update Progress Dialog */}
        {/* <Dialog open={!!dialogState.updateProgress} onOpenChange={(isOpen) => { if (!isOpen) { setDialogState(p => ({ ...p, updateProgress: null })); setProgressUpdate({ amount: "" }); } }}> */}
        {/*   <DialogContent className="sm:max-w-sm"> */}
        {/*     <DialogHeader> */}
        {/*       <DialogTitle>Update Progress for "{dialogState.updateProgress?.name}"</DialogTitle> */}
        {/*       <DialogDescription>Current Target: {formatCurrency(dialogState.updateProgress?.targetAmount || 0)}. Update the total amount saved.</DialogDescription> */}
        {/*     </DialogHeader> */}
        {/*     <div className="grid gap-4 py-4"> */}
        {/*       <div className="grid gap-2"> */}
        {/*         <Label htmlFor="currentAmount">New Saved Amount</Label> */}
        {/*         <Input id="currentAmount" type="number" value={progressUpdate.amount} onChange={(e) => setProgressUpdate({ amount: e.target.value })} placeholder={`Current: ${formatCurrency(dialogState.updateProgress?.currentAmount || 0)}`} /> */}
        {/*       </div> */}
        {/*     </div> */}
        {/*     <div className="flex justify-end gap-2"> */}
        {/*       <Button variant="outline" onClick={() => { setDialogState(p => ({ ...p, updateProgress: null })); setProgressUpdate({ amount: "" }); }}>Cancel</Button> */}
        {/*       <Button onClick={handleUpdateProgress}>Update</Button> */}
        {/*     </div> */}
        {/*   </DialogContent> */}
        {/* </Dialog> */}
        <UpdateProgressDialog
          isOpen={dialogState.updateProgress !== null}
          goal={dialogState.updateProgress}
          progressUpdate={progressUpdate}
          balances={balances}
          onClose={() => {
            setDialogState(p => ({ ...p, updateProgress: null }));
            setProgressUpdate({ amount: "", balanceSourceId: "" });
          }}
          onProgressUpdateChange={setProgressUpdate}
          onSubmit={handleUpdateProgressWithBalanceDeduction}
          formatCurrency={formatCurrency}
        />
<AllGoalsTransactionHistoryDialog
  isOpen={showAllTransactionHistory}
  goals={goals}
  balances={balances}
  allDisplayCategories={allDisplayCategories}
  onClose={() => setShowAllTransactionHistory(false)}
  formatCurrency={formatCurrency}
  formatDate={formatDate}
  fetchGoalTransactions={fetchGoalTransactions}
/>
      </div>
    </Suspense>
  )
}
