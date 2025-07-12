"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, EyeOff, ArrowUpRight, ArrowDownRight, Wallet, Plus, Calendar, PieChart, Target
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Import gRPC client and protobuf messages
import { ProductServiceClient } from '../grpc_schema/ProductServiceClientPb';
import { GetProductsByUserRequest, Product as GrpcProduct, ProductsList } from '../grpc_schema/product_pb';
import { BalanceServiceClient } from '../grpc_schema/BalanceServiceClientPb';
import { GetTransferRequest, GetTransferResponse, TransferFunds, GetIncomeRequest, GetIncomeResponse, Income, GetBalanceRequest, GetBalanceResponse, Balance } from '../grpc_schema/balance_pb';
import { GoalServiceClient } from '../grpc_schema/GoalServiceClientPb';
import { GetGoalRequest, GetGoalResponse, Goals } from '../grpc_schema/goal_pb';
import api from '../utils/api';
import { Metadata } from 'grpc-web';

// Type definitions
interface typed_transfer {
  ID: string;
  description: string;
  from_source: string;
  to_source: string;
  amount: number;
  date: string;
}

interface typed_income {
  ID: string;
  source: string;
  amountDescription: string;
  amount: number;
  date: string;
}

enum Tab {
  Expense = 'expense',
  Income = 'income',
  Transfer = 'transfer'
}

interface Transaction {
  id: string;
  date: string;
  type: Tab;
  amount: number;
  source: string;
  amountDescription: string;
  from_source?: string;
  to_source?: string;
  category?: string;
}

export interface Product {
  ID: string;
  product_name: string;
  quantity: number;
  amount: number;
  Name: string;
  category: string;
  Date: string;
}

interface Goal {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  createdAt: string;
  category: string;
  status: 'completed' | 'active';
  hexcode: string;
}

interface AccountBalance {
  sourceName: string;
  amount: number;
}

// Initialize gRPC clients
const productClient = new ProductServiceClient("http://localhost:8080");
const balanceClient = new BalanceServiceClient("http://localhost:8080");
const goalsClient = new GoalServiceClient("http://localhost:8080");

const FinanceDashboard = () => {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  // Helper to get authentication metadata for gRPC calls
  const getRequestMetadata = useCallback(async (): Promise<Metadata> => {
    try {
      const response = await api.get("/get-refresh-token", { withCredentials: true });
      if (!response.data || !response.data.refresh_token) {
        throw new Error("Failed to retrieve refresh token.");
      }
      const refreshToken = response.data.refresh_token;
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found in localStorage.");
      }
      return { authentication: `Bearer ${token}`, refresh_token: refreshToken };
    } catch (err: any) {
      console.error("Error getting request metadata:", err);
      throw new Error("Authentication error: Could not get tokens.");
    }
  }, []);

  // Helper to normalize date to YYYY-MM-DD
  const normalizeDate = (dateStr: string | undefined): string => {
    if (!dateStr) {
      return new Date().toISOString().split('T')[0];
    }
    const cleanedDateStr = dateStr.replace(/\.\d+\s/, ' ').replace(/\s\w+$/, '');
    const date = new Date(cleanedDateStr);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date format: ${dateStr}, falling back to current date`);
      return new Date().toISOString().split('T')[0];
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // gRPC Data Fetching Logic for Transactions
  const fetchTransactions = useCallback(async () => {
    let products: Product[] = [];
    let transfers: typed_transfer[] = [];
    let incomes: typed_income[] = [];
    const meta = await getRequestMetadata();

    try {
      const productRequest = new GetProductsByUserRequest();
      products = await new Promise<Product[]>((resolve, reject) => {
        productClient.getProductsByUser(productRequest, meta, (err: any, res: ProductsList) => {
          if (err) {
            reject(new Error(`Failed to fetch products: ${err.message}`));
            return;
          }
          let i = 1;
          const fetchedProducts: Product[] = res.getProductsList().map((product: GrpcProduct) => ({
            ID: `${i++}`,
            product_name: product.getProductName(),
            quantity: Number(product.getQuantity()),
            amount: Number(product.getAmount()),
            Name: product.getProductName(),
            category: product.getCategory(),
            Date: product.getDate(),
          }));
          resolve(fetchedProducts);
        });
      });
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setError(prev => prev ? prev + `; ${err.message}` : err.message);
    }

    try {
      const transferRequest = new GetTransferRequest();
      transfers = await new Promise<typed_transfer[]>((resolve, reject) => {
        balanceClient.getTransfer(transferRequest, meta, (err: any, res: GetTransferResponse) => {
          if (err) {
            reject(new Error(`Failed to fetch transfers: ${err.message}`));
            return;
          }
          const fetchedTransfers: typed_transfer[] = res.getTransfersList().map((transfer: TransferFunds) => ({
            ID: String(transfer.getTransferId()),
            description: `To ${transfer.getToSource()}`,
            amount: Number(transfer.getAmount()),
            from_source: transfer.getFromSource(),
            to_source: transfer.getToSource(),
            date: transfer.getDate(),
          }));
          resolve(fetchedTransfers);
        });
      });
    } catch (err: any) {
      console.error("Error fetching transfers:", err);
      setError(prev => prev ? prev + `; ${err.message}` : err.message);
    }

    try {
      const incomeRequest = new GetIncomeRequest();
      incomes = await new Promise<typed_income[]>((resolve, reject) => {
        balanceClient.getIncomes(incomeRequest, meta, (err: any, res: GetIncomeResponse) => {
          if (err) {
            reject(new Error(`Failed to fetch incomes: ${err.message}`));
            return;
          }
          const fetchedIncomes: typed_income[] = res.getIncomeList().map((income: Income) => ({
            ID: String(income.getIncomeId()),
            source: income.getIncomeSource() || 'Unknown',
            amountDescription: income.getIncomeSource() || 'Unknown',
            amount: income.getIncome(),
            date: income.getDate() || new Date().toISOString(),
          }));
          resolve(fetchedIncomes);
        });
      });
    } catch (err: any) {
      console.error("Error fetching incomes:", err);
      setError(prev => prev ? prev + `; ${err.message}` : err.message);
    }

    const allTransactions: Transaction[] = [
      ...products.map((p): Transaction => ({
        id: p.ID,
        date: normalizeDate(p.Date),
        type: Tab.Expense,
        amount: p.amount * p.quantity,
        source: p.product_name || p.Name || 'Unknown',
        amountDescription: p.product_name || p.Name || 'Product',
        category: p.category,
      })),
      ...transfers.map((t): Transaction => ({
        id: t.ID,
        date: normalizeDate(t.date),
        type: Tab.Transfer,
        amount: t.amount,
        source: t.from_source || 'Transfer',
        amountDescription: t.description,
        from_source: t.from_source,
        to_source: t.to_source,
      })),
      ...incomes.map((i): Transaction => ({
        id: i.ID,
        date: normalizeDate(i.date),
        type: Tab.Income,
        amount: i.amount,
        source: i.source || 'Income',
        amountDescription: i.amountDescription,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setTransactions(allTransactions);
  }, [getRequestMetadata]);

  // gRPC Data Fetching Logic for Goals
  const fetchGoals = useCallback(async () => {
    try {
      const meta = await getRequestMetadata();
      const request = new GetGoalRequest();
      goalsClient.getGoals(request, meta, (err, res: GetGoalResponse | null) => {
        if (err) {
          setError(prev => prev ? prev + `; Failed to fetch goals: ${err.message}` : `Failed to fetch goals: ${err.message}`);
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
            hexcode: g.getHexcode() || "#8b5cf6"
          }));
          setGoals(fetchedGoals);
        }
      });
    } catch (err: any) {
      setError(prev => prev ? prev + `; ${err.message}` : err.message);
    }
  }, [getRequestMetadata]);

  // gRPC Data Fetching Logic for Account Balances
  const fetchAccountBalances = useCallback(async () => {
    try {
      const meta = await getRequestMetadata();
      const request = new GetBalanceRequest();
      balanceClient.getBalances(request, meta, (err, res: GetBalanceResponse | null) => {
        if (err) {
          setError(prev => prev ? prev + `; Failed to fetch account balances: ${err.message}` : `Failed to fetch account balances: ${err.message}`);
          return;
        }
        if (res) {
          const fetchedBalances: AccountBalance[] = res.getBalanceList().map((b: Balance) => ({
            sourceName: b.getBalanceSource(),
            amount: b.getBalance(),
          }));
          setAccountBalances(fetchedBalances);
        }
      });
    } catch (err: any) {
      setError(prev => prev ? prev + `; ${err.message}` : err.message);
    }
  }, [getRequestMetadata]);

  // Fetch all data on component mount
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchTransactions(),
        fetchGoals(),
        fetchAccountBalances()
      ]);
      setLoading(false);
    };

    loadAllData();
  }, [fetchTransactions, fetchGoals, fetchAccountBalances]);

  // Calculate financial metrics
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthTransactions = transactions.filter(t => t.date.startsWith(currentMonth));

  const totalIncome = currentMonthTransactions
    .filter(t => t.type === Tab.Income)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = currentMonthTransactions
    .filter(t => t.type === Tab.Expense)
    .reduce((sum, t) => sum + t.amount, 0);

  const currentMonthNetBalance = totalIncome - totalExpenses;
  const totalCurrentBalanceAcrossAccounts = accountBalances.reduce((sum, account) => sum + account.amount, 0);

  // Calculate savings rate
  const savingsRate = totalIncome > 0 ? ((currentMonthNetBalance / totalIncome) * 100).toFixed(1) : '0.0';

  // Trend Data Calculation
  const trendDataMap: Record<string, { income: number; expenses: number }> = {};

  transactions.forEach(t => {
    const month = t.date.slice(0, 7);
    if (!trendDataMap[month]) {
      trendDataMap[month] = { income: 0, expenses: 0 };
    }
    if (t.type === Tab.Income) {
      trendDataMap[month].income += t.amount;
    } else if (t.type === Tab.Expense) {
      trendDataMap[month].expenses += t.amount;
    }
  });

  const trendData = Object.keys(trendDataMap)
    .sort()
    .map(month => ({
      month: new Date(month + '-01').toLocaleString('default', { month: 'short' }),
      income: trendDataMap[month].income,
      expenses: trendDataMap[month].expenses,
    }));

  // Category Data for Bar Chart
  const categoryDataMap: Record<string, number> = {};

  transactions
    .filter(t => t.type === Tab.Expense && t.category)
    .forEach(t => {
      if (t.category) {
        categoryDataMap[t.category] = (categoryDataMap[t.category] || 0) + t.amount;
      }
    });

  const categoryData = Object.keys(categoryDataMap)
    .map(category => ({
      category,
      amount: categoryDataMap[category],
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5); // Limit to top 5 categories

  const formatExactNumber = (amount: number): string => {
    return `₹${Math.round(amount)}`;
  };

  const getProgressPercentage = (current: number, target: number): number => {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <svg className="animate-spin h-10 w-10 text-slate-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-slate-700">Loading your financial data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-red-600 font-semibold p-6 bg-white rounded-lg shadow-md border border-red-300">
          <p className="mb-2">Error loading data:</p>
          <p>{error}</p>
          <p className="mt-4 text-sm text-slate-500">Please try refreshing the page or contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-full mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Wallet className="h-6 w-6 text-slate-700" />
              <div>
                <h1 className="text-lg font-bold text-slate-900">Financial Dashboard</h1>
                <p className="text-xs text-slate-500">
                  {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={() => setShowBalance(!showBalance)} className="text-slate-600">
                {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-full mx-auto px-6 py-6">
        {/* Key Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="md:col-span-2 bg-blue-600 text-white p-4 rounded-lg">
            <p className="text-blue-200 text-sm">Total Balance</p>
            <p className="text-2xl font-bold">
              {showBalance ? formatExactNumber(totalCurrentBalanceAcrossAccounts) : "••••••"}
            </p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <p className="text-emerald-700 text-sm">Income</p>
            <p className="text-lg font-semibold text-emerald-800">
              {showBalance ? formatExactNumber(totalIncome) : "••••"}
            </p>
          </div>
          <div className="bg-rose-50 p-4 rounded-lg border border-rose-200">
            <p className="text-rose-700 text-sm">Expenses</p>
            <p className="text-lg font-semibold text-rose-800">
              {showBalance ? formatExactNumber(totalExpenses) : "••••"}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-blue-700 text-sm">Balance</p>
            <p className="text-lg font-semibold text-blue-800">
              {showBalance ? formatExactNumber(currentMonthNetBalance) : "••••"}
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <p className="text-purple-700 text-sm">Savings Rate</p>
            <p className="text-lg font-bold text-purple-800">{savingsRate}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content - 3 columns */}
          <div className="lg:col-span-3 space-y-6">
            {/* Account Balances & Goals & Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Account Balances - Compact */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Accounts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {accountBalances.length > 0 ? (
                    accountBalances.map((account, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">{account.sourceName}</span>
                        <span
                          className={`font-semibold text-sm ${account.amount < 0 ? "text-rose-600" : "text-slate-900"}`}
                        >
                          {showBalance ? formatExactNumber(account.amount) : "••••"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No accounts found.</p>
                  )}
                </CardContent>
              </Card>

              {/* Goals - Compact */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex justify-between">
                    Goals
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => router.push("/goal")}>
                      View All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {goals.slice(0, 3).map((goal) => {
                    const progress = getProgressPercentage(goal.currentAmount, goal.targetAmount);
                    return (
                      <div key={goal.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">{goal.name}</span>
                          <span className="text-slate-900 font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    );
                  })}
                  {goals.length === 0 && (
                    <p className="text-sm text-slate-500">No goals set yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { name: "Calendar", icon: Calendar, path: "/calendar" },
                    { name: "Summary", icon: PieChart, path: "/summary" },
                    { name: "Budget", icon: Target, path: "/budget" },
                  ].map((link) => (
                    <Button
                      key={link.name}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-sm"
                      onClick={() => router.push(link.path)}
                    >
                      <link.icon className="h-4 w-4 mr-2" />
                      {link.name}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Income vs Expenses Trend */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Monthly Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis tickFormatter={(value) => `₹${value}`} className="text-xs" />
                        <Tooltip formatter={(value: number) => formatExactNumber(value)} />
                        <Line type="monotone" dataKey="income" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="expenses" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Expense Categories */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Expense Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="category" className="text-xs" />
                        <YAxis tickFormatter={(value) => `₹${value}`} className="text-xs" />
                        <Tooltip formatter={(value: number) => formatExactNumber(value)} />
                        <Bar dataKey="amount" fill="#6366f1" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Transactions Sidebar - 1 column */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {transactions.slice(0, 8).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <div
                          className={`p-1.5 rounded-lg flex-shrink-0 ${
                            transaction.type === Tab.Income ? "bg-emerald-100" :
                            transaction.type === Tab.Expense ? "bg-rose-100" : "bg-blue-100"
                          }`}
                        >
                          {transaction.type === Tab.Income ? (
                            <ArrowDownRight className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3 text-rose-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-slate-900 truncate">{transaction.source}</p>
                          <p className="text-xs text-slate-500">{transaction.date}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p
                          className={`font-semibold text-sm ${
                            transaction.type === Tab.Income ? "text-emerald-600" :
                            transaction.type === Tab.Expense ? "text-rose-600" : "text-blue-600"
                          }`}
                        >
                          {transaction.type === Tab.Income ? "+" : "-"}
                          {showBalance ? formatExactNumber(transaction.amount) : "••••"}
                        </p>
                      </div>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-2">No transactions found.</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
                  View All Transactions
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
