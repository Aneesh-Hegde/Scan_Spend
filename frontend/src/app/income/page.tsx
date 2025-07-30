
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { DollarSign, Edit, Save, X, Plus, TrendingUp, Calendar, Wallet } from 'lucide-react';
import { Metadata } from 'grpc-web';
import api from '../utils/api'; // Assuming this correctly handles Axios for refresh token
import { BalanceServiceClient } from '../grpc_schema/BalanceServiceClientPb';
import {
  AddIncomeSourceRequest, GetIncomeRequest, GetIncomeResponse, UpdateIncomeRequest, Income as ProtoIncome,
  GetBalanceRequest, GetBalanceResponse, Balance as ProtoBalance, UpdateBalanceRequest, AddBalanceSourceRequest
} from '../grpc_schema/balance_pb'; // Renamed Income and Balance to ProtoIncome/ProtoBalance to avoid naming conflicts

const balanceClient = new BalanceServiceClient("http://localhost:8080"); // Renamed client variable for clarity

// Updated Income interface based on proto
interface Income {
  id: number;
  source: string; // Corresponds to income_source in proto
  amountDescription: string; // Corresponds to income_amount in proto
  amount: number; // Corresponds to income in proto
  date: string;
}

// Balance interface based on proto
interface Balance {
  id: number; // Corresponds to balance_id in proto
  source: string; // Corresponds to balance_source in proto
  amountDescription: string; // Corresponds to balance_amount in proto (might be general description of balance)
  balance: number; // Corresponds to balance in proto
}

const PortfolioDashboardPage: React.FC = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]); // New state for account balances
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showAddTransactionModal, setShowAddTransactionModal] = useState<boolean>(false);
  const [showEditIncomeModal, setShowEditIncomeModal] = useState<boolean>(false);
  const [showAdjustBalanceModal, setShowAdjustBalanceModal] = useState<boolean>(false); // New modal for adjusting balance
  const [showAddAccountModal, setShowAddAccountModal] = useState<boolean>(false); // New modal for adding balance accounts

  // Form data state
  const [newIncome, setNewIncome] = useState<Income>({ id: 0, source: '', amountDescription: '', amount: 0, date: new Date().toISOString().split('T')[0] });
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [adjustingBalance, setAdjustingBalance] = useState<Balance | null>(null); // State for the balance being adjusted
  const [newAccount, setNewAccount] = useState({ source: '', initialAmount: 0 }); // State for new balance account

  // --- Calculations for Dashboard Cards ---
  // Total Balance across all accounts
  const totalBalance = balances.reduce((sum, bal) => sum + bal.balance, 0);

  // Get recent transactions (last 30 days) from incomes
  const recentTransactions = incomes.filter(income => {
    const incomeDate = new Date(income.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return incomeDate >= thirtyDaysAgo;
  });

  // Calculate monthly net change from recent transactions (incomes)
  const monthlyChange = recentTransactions.reduce((sum, income) => sum + income.amount, 0);

  // Separate gains and losses from incomes (transactions)
  const totalGains = incomes.filter(income => income.amount > 0).reduce((sum, income) => sum + income.amount, 0);
  const totalLosses = Math.abs(incomes.filter(income => income.amount < 0).reduce((sum, income) => sum + income.amount, 0));

  // Get unique income sources count
  const uniqueSources = new Set(incomes.map(income => income.source)).size;

  // --- Utility Functions ---
  const getAuthMetadata = useCallback(async (): Promise<Metadata> => {
    try {
      const response = await api.get("/get-refresh-token", { withCredentials: true });
      if (!response.data || !response.data.refresh_token) {
        throw new Error("Failed to retrieve refresh token");
      }
      const refreshToken = response.data.refresh_token;
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found in localStorage");
      }
      const metadata: Metadata = { authentication: `Bearer ${token}`, refresh_token: refreshToken };
      return metadata;
    } catch (err: any) {
      setError("Authentication error: " + err.message);
      console.error("Auth metadata error:", err);
      throw err; // Re-throw to propagate the error
    }
  }, []);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handle input change for add/edit forms (unified)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, stateSetter: React.Dispatch<React.SetStateAction<any>>) => {
    const { name, value } = e.target;
    stateSetter((prevState: any) => {
      if (!prevState) return null; // Should not happen if used correctly
      if (name === 'amount' || name === 'initialAmount' || name === 'balance') { // 'balance' for adjust balance
        return { ...prevState, [name]: parseFloat(value) || 0 };
      } else {
        return { ...prevState, [name]: value };
      }
    });
  };

  // --- Data Fetching ---
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        const metadata = await getAuthMetadata();

        // Fetch Incomes
        const incomeRequest = new GetIncomeRequest();
        balanceClient.getIncomes(incomeRequest, metadata, (err: any, res: GetIncomeResponse) => {
          if (err) {
            setError(`Failed to fetch incomes: ${err.message}`);
            console.error("GetIncomes error:", err);
            return;
          }
          const fetchedIncomes: Income[] = res.getIncomeList().map((income: ProtoIncome) => ({
            id: income.getIncomeId(),
            source: income.getIncomeSource(),
            amountDescription: income.getIncomeAmount(),
            amount: income.getIncome(),
            date: income.getDate(),
          }));
          setIncomes(fetchedIncomes);
        });

        // Fetch Balances
        const balanceRequest = new GetBalanceRequest();
        balanceClient.getBalances(balanceRequest, metadata, (err: any, res: GetBalanceResponse) => {
          if (err) {
            setError(`Failed to fetch balances: ${err.message}`);
            console.error("GetBalances error:", err);
            return;
          }
          const fetchedBalances: Balance[] = res.getBalanceList().map((balance: ProtoBalance) => ({
            id: balance.getBalanceId(),
            source: balance.getBalanceSource(),
            amountDescription: balance.getBalanceAmount(),
            balance: balance.getBalance(),
          }));
          setBalances(fetchedBalances);
        });

      } catch (err: any) {
        setError("Failed to initialize data: " + err.message);
        console.error("Initial data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [getAuthMetadata]); // Rerun if getAuthMetadata changes (though it's memoized)

  // --- CRUD Operations ---

  // Add new Income (Transaction)
  const handleAddIncome = async () => {
    setError(null);
    try {
      const metadata = await getAuthMetadata();
      const request = new AddIncomeSourceRequest();
      request.setIncomeSource(newIncome.source);
      // NOTE: amountDescription and date cannot be sent via AddIncomeSourceRequest
      // as per current proto definition. Only income_source and initial_amount are available.
      request.setInitialAmount(newIncome.amount); // Mapping UI 'amount' to proto 'initial_amount'

      balanceClient.addIncomeSource(request, metadata, (err: any) => {
        if (err) {
          setError(`Failed to add income: ${err.message}`);
          console.error("AddIncomeSource error:", err);
          return;
        }
        setShowAddTransactionModal(false);
        setNewIncome({ id: 0, source: '', amountDescription: '', amount: 0, date: new Date().toISOString().split('T')[0] });
        // Re-fetch all data to ensure balances are updated
        const fetchAllData = async () => {
          setLoading(true);
          try {
            const metadata = await getAuthMetadata();
            const incomeRequest = new GetIncomeRequest();
            balanceClient.getIncomes(incomeRequest, metadata, (err: any, res: GetIncomeResponse) => {
              if (err) {
                setError(`Failed to re-fetch incomes: ${err.message}`);
                console.error("Re-fetch GetIncomes error:", err);
                return;
              }
              setIncomes(res.getIncomeList().map((income: ProtoIncome) => ({
                id: income.getIncomeId(), source: income.getIncomeSource(), amountDescription: income.getIncomeAmount(), amount: income.getIncome(), date: income.getDate(),
              })));
            });

            const balanceRequest = new GetBalanceRequest();
            balanceClient.getBalances(balanceRequest, metadata, (err: any, res: GetBalanceResponse) => {
              if (err) {
                setError(`Failed to re-fetch balances: ${err.message}`);
                console.error("Re-fetch GetBalances error:", err);
                return;
              }
              setBalances(res.getBalanceList().map((balance: ProtoBalance) => ({
                id: balance.getBalanceId(), source: balance.getBalanceSource(), amountDescription: balance.getBalanceAmount(), balance: balance.getBalance(),
              })));
            });
          } catch (fetchErr: any) {
            setError("Error re-fetching data after add income: " + fetchErr.message);
          } finally {
            setLoading(false);
          }
        };
        fetchAllData();
      });
    } catch (err: any) {
      setError("Failed to add income: " + err.message);
      console.error(err);
    }
  };

  // Edit existing income (transaction)
  const handleEditIncome = (income: Income) => {
    setEditingIncome({ ...income });
    setShowEditIncomeModal(true);
  };

  // Save edited income (transaction)
  const handleSaveIncome = async () => {
    if (!editingIncome) return;
    setError(null);
    try {
      const metadata = await getAuthMetadata();
      const request = new UpdateIncomeRequest();
      request.setIncomeId(editingIncome.id);
      // NOTE: source, amountDescription, and date cannot be sent via UpdateIncomeRequest
      // as per current proto definition. Only income_id and amount are available.
      request.setAmount(editingIncome.amount); // Mapping UI 'amount' to proto 'amount'

      balanceClient.updateIncome(request, metadata, (err: any) => {
        if (err) {
          setError(`Failed to update income: ${err.message}`);
          console.error("UpdateIncome error:", err);
          return;
        }
        setShowEditIncomeModal(false);
        setEditingIncome(null);
        // Re-fetch all data to ensure balances are updated
        const fetchAllData = async () => {
          setLoading(true);
          try {
            const metadata = await getAuthMetadata();
            const incomeRequest = new GetIncomeRequest();
            balanceClient.getIncomes(incomeRequest, metadata, (err: any, res: GetIncomeResponse) => {
              if (err) {
                setError(`Failed to re-fetch incomes: ${err.message}`);
                console.error("Re-fetch GetIncomes error:", err);
                return;
              }
              setIncomes(res.getIncomeList().map((income: ProtoIncome) => ({
                id: income.getIncomeId(), source: income.getIncomeSource(), amountDescription: income.getIncomeAmount(), amount: income.getIncome(), date: income.getDate(),
              })));
            });

            const balanceRequest = new GetBalanceRequest();
            balanceClient.getBalances(balanceRequest, metadata, (err: any, res: GetBalanceResponse) => {
              if (err) {
                setError(`Failed to re-fetch balances: ${err.message}`);
                console.error("Re-fetch GetBalances error:", err);
                return;
              }
              setBalances(res.getBalanceList().map((balance: ProtoBalance) => ({
                id: balance.getBalanceId(), source: balance.getBalanceSource(), amountDescription: balance.getBalanceAmount(), balance: balance.getBalance(),
              })));
            });
          } catch (fetchErr: any) {
            setError("Error re-fetching data after update income: " + fetchErr.message);
          } finally {
            setLoading(false);
          }
        };
        fetchAllData();
      });
    } catch (err: any) {
      setError("Failed to update income: " + err.message);
      console.error(err);
    }
  };

  // Add new Balance Source (Account)
  const handleAddBalanceSource = async () => {
    setError(null);
    try {
      const metadata = await getAuthMetadata();
      const request = new AddBalanceSourceRequest();
      request.setBalanceSource(newAccount.source);
      request.setInitialAmount(newAccount.initialAmount);

      balanceClient.addBalanceSource(request, metadata, (err: any) => {
        if (err) {
          setError(`Failed to add account: ${err.message}`);
          console.error("AddBalanceSource error:", err);
          return;
        }
        setShowAddAccountModal(false);
        setNewAccount({ source: '', initialAmount: 0 });
        // Re-fetch balances to show the new account
        const fetchBalances = async () => {
          setLoading(true);
          try {
            const metadata = await getAuthMetadata();
            const balanceRequest = new GetBalanceRequest();
            balanceClient.getBalances(balanceRequest, metadata, (err: any, res: GetBalanceResponse) => {
              if (err) {
                setError(`Failed to re-fetch balances: ${err.message}`);
                console.error("Re-fetch GetBalances error:", err);
                return;
              }
              setBalances(res.getBalanceList().map((balance: ProtoBalance) => ({
                id: balance.getBalanceId(), source: balance.getBalanceSource(), amountDescription: balance.getBalanceAmount(), balance: balance.getBalance(),
              })));
            });
          } catch (fetchErr: any) {
            setError("Error re-fetching balances after add account: " + fetchErr.message);
          } finally {
            setLoading(false);
          }
        };
        fetchBalances();
      });
    } catch (err: any) {
      setError("Failed to add account: " + err.message);
      console.error(err);
    }
  };


  // Adjust Balance of an existing source (Account)
  const handleAdjustBalance = async () => {
    if (!adjustingBalance) return;
    setError(null);
    try {
      const metadata = await getAuthMetadata();
      const request = new UpdateBalanceRequest();
      request.setBalanceId(adjustingBalance.id);
      request.setAmount(adjustingBalance.balance); // The new total amount for the balance source

      balanceClient.updateBalance(request, metadata, (err: any) => {
        if (err) {
          setError(`Failed to adjust balance: ${err.message}`);
          console.error("UpdateBalance error:", err);
          return;
        }
        setShowAdjustBalanceModal(false);
        setAdjustingBalance(null);
        // Re-fetch balances to reflect the change
        const fetchBalances = async () => {
          setLoading(true);
          try {
            const metadata = await getAuthMetadata();
            const balanceRequest = new GetBalanceRequest();
            balanceClient.getBalances(balanceRequest, metadata, (err: any, res: GetBalanceResponse) => {
              if (err) {
                setError(`Failed to re-fetch balances: ${err.message}`);
                console.error("Re-fetch GetBalances error:", err);
                return;
              }
              setBalances(res.getBalanceList().map((balance: ProtoBalance) => ({
                id: balance.getBalanceId(), source: balance.getBalanceSource(), amountDescription: balance.getBalanceAmount(), balance: balance.getBalance(),
              })));
            });
          } catch (fetchErr: any) {
            setError("Error re-fetching balances after adjustment: " + fetchErr.message);
          } finally {
            setLoading(false);
          }
        };
        fetchBalances();
      });
    } catch (err: any) {
      setError("Failed to adjust balance: " + err.message);
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center mb-2">
                <div className="p-3 bg-gradient-to-r from-green-400 to-blue-500 rounded-xl mr-4">
                  <DollarSign className="text-white" size={32} />
                </div>
                Portfolio Dashboard
              </h1>
              <p className="text-gray-600">Track your investments, income, and financial portfolio</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowAddTransactionModal(true)}
                className="px-6 py-3 flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Plus size={20} className="mr-2" /> Add Transaction
              </button>
              <button
                onClick={() => setShowAddAccountModal(true)}
                className="px-6 py-3 flex items-center rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Plus size={20} className="mr-2" /> Add Account
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Total Balance from Balances state */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Portfolio Balance</p>
                  <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalBalance >= 0 ? '+' : ''}{formatCurrency(totalBalance)}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${totalBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Wallet className={totalBalance >= 0 ? 'text-green-600' : 'text-red-600'} size={24} />
                </div>
              </div>
            </div>

            {/* Monthly Change (from Income transactions) */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Monthly Transaction Change</p>
                  <p className={`text-2xl font-bold ${monthlyChange >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {monthlyChange >= 0 ? '+' : ''}{formatCurrency(monthlyChange)}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${monthlyChange >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                  <TrendingUp className={monthlyChange >= 0 ? 'text-blue-600' : 'text-red-600'} size={24} />
                </div>
              </div>
            </div>

            {/* Total Gains (from Income transactions) */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Gains (Transactions)</p>
                  <p className="text-2xl font-bold text-green-600">+{formatCurrency(totalGains)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <TrendingUp className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            {/* Total Losses (from Income transactions) */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Losses (Transactions)</p>
                  <p className="text-2xl font-bold text-red-600">-{formatCurrency(totalLosses)}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <Calendar className="text-red-600" size={24} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Display Loading/Error States */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading data...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 flex items-center">
              <X className="mr-2" size={16} />
              {error}
            </p>
          </div>
        )}

        {/* --- Account Balances Section --- */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center mb-4">
            <Wallet size={28} className="mr-2 text-indigo-600" /> Your Accounts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {balances.length === 0 && !loading ? (
              <p className="col-span-full text-center text-gray-500 py-8">No accounts found. Click "Add Account" to get started!</p>
            ) : (
              balances.map(account => (
                <div key={account.id} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-gray-900 truncate">{account.source}</h3>
                    {/* Assuming amountDescription might categorize the account, or just be a general description */}
                    <span className="text-sm text-gray-500">{account.amountDescription}</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">Current Balance:</p>
                  <p className={`text-3xl font-bold ${account.balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                    {formatCurrency(account.balance)}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => { setAdjustingBalance({ ...account }); setShowAdjustBalanceModal(true); }}
                      className="px-4 py-2 text-sm rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                    >
                      Adjust Balance
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- Income/Transaction History Section --- */}
        <div className={`${showAddTransactionModal || showEditIncomeModal || showAdjustBalanceModal || showAddAccountModal ? 'blur-sm' : ''}`}>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Transaction History</h3>
            </div>

            <div className="divide-y divide-gray-100">
              {incomes.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <DollarSign className="text-gray-400" size={24} />
                  </div>
                  <p className="text-gray-500 text-lg mb-2">No transaction entries found</p>
                  <p className="text-gray-400">Start by adding your first transaction</p>
                </div>
              ) : (
                incomes.map((income, index) => (
                  <div
                    key={income.id}
                    className="flex items-center p-6 hover:bg-gray-50 transition-colors duration-200 group"
                  >
                    <div className="flex-shrink-0 mr-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        income.amount >= 0
                          ? 'bg-gradient-to-r from-green-400 to-green-500'
                          : 'bg-gradient-to-r from-red-400 to-red-500'
                      }`}>
                        <span className="text-white font-bold text-lg">
                          {income.source.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 truncate">
                            {income.source}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {income.amountDescription}
                          </p>
                          <div className="flex items-center mt-2 text-xs text-gray-500">
                            <Calendar size={12} className="mr-1" />
                            {new Date(income.date).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${
                              income.amount >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {income.amount >= 0 ? '+' : ''}{formatCurrency(income.amount)}
                            </div>
                            <div className={`text-xs ${
                              income.amount >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {income.amount >= 0 ? 'Gain' : 'Loss'}
                            </div>
                          </div>

                          <button
                            onClick={() => handleEditIncome(income)}
                            className="p-2 rounded-lg hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* --- Modals --- */}
        {/* Add Transaction Modal */}
        {showAddTransactionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowAddTransactionModal(false)}></div>
            <div className="bg-white rounded-2xl shadow-2xl z-10 w-full max-w-2xl overflow-hidden">
              <div className="flex justify-between items-center border-b p-6 bg-gradient-to-r from-blue-50 to-blue-100">
                <h3 className="text-2xl font-bold text-gray-900">
                  Add New Transaction
                </h3>
                <button
                  onClick={() => setShowAddTransactionModal(false)}
                  className="p-2 rounded-full hover:bg-white/50 transition-colors duration-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Source/Investment</label>
                    <input
                      type="text"
                      name="source"
                      value={newIncome.source}
                      onChange={(e) => handleInputChange(e, setNewIncome)}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g., Salary, Tesla Stock, Bitcoin, Freelance"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      name="amountDescription"
                      value={newIncome.amountDescription}
                      onChange={(e) => handleInputChange(e, setNewIncome)}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Brief description (e.g., Monthly salary, Crypto loss, Stock gain)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        name="amount"
                        value={newIncome.amount}
                        onChange={(e) => handleInputChange(e, setNewIncome)}
                        className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter positive for gains, negative for losses"
                      />
                      <div className="absolute right-4 top-4 text-sm text-gray-500">
                        {newIncome.amount >= 0 ? '📈 Gain' : '📉 Loss'}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Use positive numbers for gains/income, negative numbers for losses
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      name="date"
                      value={newIncome.date}
                      onChange={(e) => handleInputChange(e, setNewIncome)}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 border-t p-6 bg-gray-50">
                <button
                  onClick={() => setShowAddTransactionModal(false)}
                  className="px-6 py-3 rounded-xl border border-gray-300 hover:bg-gray-100 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddIncome}
                  className="px-6 py-3 flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Save size={16} className="mr-2" /> Add Transaction
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Income Modal */}
        {showEditIncomeModal && editingIncome && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowEditIncomeModal(false)}></div>
            <div className="bg-white rounded-2xl shadow-2xl z-10 w-full max-w-2xl overflow-hidden">
              <div className="flex justify-between items-center border-b p-6 bg-gradient-to-r from-green-50 to-green-100">
                <h3 className="text-2xl font-bold text-gray-900">
                  Edit Income Source
                </h3>
                <button
                  onClick={() => setShowEditIncomeModal(false)}
                  className="p-2 rounded-full hover:bg-white/50 transition-colors duration-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Income Source</label>
                    <input
                      type="text"
                      name="source"
                      value={editingIncome.source}
                      onChange={(e) => handleInputChange(e, setEditingIncome)}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g., Salary, Freelance, Investment"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      name="amountDescription"
                      value={editingIncome.amountDescription}
                      onChange={(e) => handleInputChange(e, setEditingIncome)}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      placeholder="Brief description of this income"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      name="amount"
                      value={editingIncome.amount}
                      onChange={(e) => handleInputChange(e, setEditingIncome)}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      name="date"
                      value={editingIncome.date}
                      onChange={(e) => handleInputChange(e, setEditingIncome)}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 border-t p-6 bg-gray-50">
                <button
                  onClick={() => setShowEditIncomeModal(false)}
                  className="px-6 py-3 rounded-xl border border-gray-300 hover:bg-gray-100 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveIncome}
                  className="px-6 py-3 flex items-center rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Save size={16} className="mr-2" /> Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Adjust Balance Modal */}
        {showAdjustBalanceModal && adjustingBalance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowAdjustBalanceModal(false)}></div>
            <div className="bg-white rounded-2xl shadow-2xl z-10 w-full max-w-2xl overflow-hidden">
              <div className="flex justify-between items-center border-b p-6 bg-gradient-to-r from-blue-50 to-blue-100">
                <h3 className="text-2xl font-bold text-gray-900">
                  Adjust Balance for {adjustingBalance.source}
                </h3>
                <button
                  onClick={() => setShowAdjustBalanceModal(false)}
                  className="p-2 rounded-full hover:bg-white/50 transition-colors duration-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Current Balance</label>
                    <input
                      type="text"
                      value={formatCurrency(balances.find(b => b.id === adjustingBalance.id)?.balance || 0)}
                      disabled
                      className="w-full p-4 border border-gray-300 rounded-xl bg-gray-100 text-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">New Balance</label>
                    <input
                      type="number"
                      step="0.01"
                      name="balance"
                      value={adjustingBalance.balance}
                      onChange={(e) => handleInputChange(e, setAdjustingBalance)}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter new total balance"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 border-t p-6 bg-gray-50">
                <button
                  onClick={() => setShowAdjustBalanceModal(false)}
                  className="px-6 py-3 rounded-xl border border-gray-300 hover:bg-gray-100 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustBalance}
                  className="px-6 py-3 flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Save size={16} className="mr-2" /> Save Adjustment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Account Modal */}
        {showAddAccountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowAddAccountModal(false)}></div>
            <div className="bg-white rounded-2xl shadow-2xl z-10 w-full max-w-2xl overflow-hidden">
              <div className="flex justify-between items-center border-b p-6 bg-gradient-to-r from-purple-50 to-purple-100">
                <h3 className="text-2xl font-bold text-gray-900">
                  Add New Account
                </h3>
                <button
                  onClick={() => setShowAddAccountModal(false)}
                  className="p-2 rounded-full hover:bg-white/50 transition-colors duration-200"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Account Name (Source)</label>
                    <input
                      type="text"
                      name="source"
                      value={newAccount.source}
                      onChange={(e) => handleInputChange(e, setNewAccount)}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g., Checking Account, Crypto Wallet, Stock Portfolio"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Initial Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      name="initialAmount"
                      value={newAccount.initialAmount}
                      onChange={(e) => handleInputChange(e, setNewAccount)}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g., 1000.00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 border-t p-6 bg-gray-50">
                <button
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-6 py-3 rounded-xl border border-gray-300 hover:bg-gray-100 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBalanceSource}
                  className="px-6 py-3 flex items-center rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Save size={16} className="mr-2" /> Add Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioDashboardPage;

