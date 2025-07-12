"use client";
import React, { useState, useEffect } from 'react';
import { DollarSign, Edit, Save, Trash2, X, Plus, TrendingUp, Calendar, Wallet, PieChart } from 'lucide-react';
import { Metadata } from 'grpc-web';
import api from '../utils/api';
import { BalanceServiceClient } from '../grpc_schema/BalanceServiceClientPb';
import { AddIncomeSourceRequest, GetIncomeRequest, GetIncomeResponse, UpdateIncomeRequest } from '../grpc_schema/balance_pb';

const incomeClient = new BalanceServiceClient("http://localhost:8080");

// Updated Income interface based on proto
interface Income {
  id: number;
  source: string;
  amountDescription: string;
  amount: number;
  date: string;
}

const IncomePage: React.FC = () => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [newIncome, setNewIncome] = useState<Income>({ id: 0, source: '', amountDescription: '', amount: 0, date: new Date().toISOString().split('T')[0] });
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  // Calculate total balance (can be negative)
  const totalBalance = incomes.reduce((sum, income) => sum + income.amount, 0);

  // Get recent transactions (last 30 days)
  const recentTransactions = incomes.filter(income => {
    const incomeDate = new Date(income.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return incomeDate >= thirtyDaysAgo;
  });

  // Calculate monthly net change
  const monthlyChange = recentTransactions.reduce((sum, income) => sum + income.amount, 0);

  // Separate gains and losses
  const totalGains = incomes.filter(income => income.amount > 0).reduce((sum, income) => sum + income.amount, 0);
  const totalLosses = Math.abs(incomes.filter(income => income.amount < 0).reduce((sum, income) => sum + income.amount, 0));

  // Get unique income sources count
  const uniqueSources = new Set(incomes.map(income => income.source)).size;

  // Fetch incomes on component mount
  useEffect(() => {
    const fetchIncomes = async () => {
      try {
        setLoading(true);
        setError(null);
        const request = new GetIncomeRequest();
        const response = await api.get("/get-refresh-token", { withCredentials: true });
        if (!response.data || !response.data.refresh_token) {
          throw new Error("Failed to retrieve refresh token");
        }
        const refresh_token = response.data.refresh_token;
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication token not found in localStorage");
        }
        const requestMetadata: Metadata = { authentication: `Bearer ${token}`, refresh_token };

        incomeClient.getIncomes(request, requestMetadata, (err: any, res: GetIncomeResponse) => {
          console.log(res);
          if (err) {
            throw new Error(`Failed to fetch incomes: ${err.message}`);
          }

          const fetchedIncomes: Income[] = res.getIncomeList().map((income: any) => ({
            id: income.getIncomeId(),
            source: income.getIncomeSource(),
            amountDescription: income.getIncomeAmount(),
            amount: Number(income.getIncome()),
            date: income.getDate(),
          }));

          setIncomes(fetchedIncomes);
          setLoading(false);
        });
      } catch (err: any) {
        setError("Failed to fetch incomes: " + err.message);
        setLoading(false);
        console.error(err);
      }
    };

    fetchIncomes();
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

  // Handle input change for add/edit forms
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const targetState = showAddModal ? newIncome : editingIncome;
    const setTargetState = showAddModal ? setNewIncome : setEditingIncome;

    if (!targetState) return;

    if (name === 'amount') {
      setTargetState({ ...targetState, [name]: parseFloat(value) || 0 });
    } else {
      setTargetState({ ...targetState, [name]: value });
    }
  };

  // Add new income
  const handleAddIncome = async () => {
    try {
      const request = new AddIncomeSourceRequest();
      request.setIncomeId(incomes.length + 1);
      request.setIncomeSource(newIncome.source);
      request.setIncomeAmount(newIncome.amountDescription);
      request.setIncome(newIncome.amount);
      request.setDate(newIncome.date);

      const response = await api.get("/get-refresh-token", { withCredentials: true });
      if (!response.data || !response.data.refresh_token) {
        throw new Error("Failed to retrieve refresh token");
      }
      const refresh_token = response.data.refresh_token;
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found in localStorage");
      }
      const requestMetadata: Metadata = { authentication: `Bearer ${token}`, refresh_token };

      incomeClient.addIncomeSource(request, requestMetadata, (err: any) => {
        if (err) {
          throw new Error(`Failed to add income: ${err.message}`);
        }

        setIncomes([...incomes, { ...newIncome, id: incomes.length + 1 }]);
        setShowAddModal(false);
        setNewIncome({ id: 0, source: '', amountDescription: '', amount: 0, date: new Date().toISOString().split('T')[0] });
      });
    } catch (err: any) {
      setError("Failed to add income: " + err.message);
      console.error(err);
    }
  };

  // Edit existing income
  const handleEditIncome = (income: Income) => {
    setEditingIncome({ ...income });
    setShowEditModal(true);
  };

  // Save edited income
  const handleSaveIncome = async () => {
    if (!editingIncome) return;

    try {
      const request = new UpdateIncomeRequest();
      request.setIncomeId(editingIncome.id);
      request.setIncomeSource(editingIncome.source);
      request.setIncomeAmount(editingIncome.amountDescription);
      request.setIncome(editingIncome.amount);
      request.setDate(editingIncome.date);

      const response = await api.get("/get-refresh-token", { withCredentials: true });
      if (!response.data || !response.data.refresh_token) {
        throw new Error("Failed to retrieve refresh token");
      }
      const refresh_token = response.data.refresh_token;
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found in localStorage");
      }
      const requestMetadata: Metadata = { authentication: `Bearer ${token}`, refresh_token };

      incomeClient.updateIncome(request, requestMetadata, (err: any) => {
        if (err) {
          throw new Error(`Failed to update income: ${err.message}`);
        }

        setIncomes(incomes.map(inc => (inc.id === editingIncome.id ? editingIncome : inc)));
        setShowEditModal(false);
        setEditingIncome(null);
      });
    } catch (err: any) {
      setError("Failed to update income: " + err.message);
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
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <Plus size={20} className="mr-2" /> Add Transaction
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Balance</p>
                  <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {totalBalance >= 0 ? '+' : ''}{formatCurrency(totalBalance)}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${totalBalance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <Wallet className={totalBalance >= 0 ? 'text-green-600' : 'text-red-600'} size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Monthly Change</p>
                  <p className={`text-2xl font-bold ${monthlyChange >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {monthlyChange >= 0 ? '+' : ''}{formatCurrency(monthlyChange)}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${monthlyChange >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                  <TrendingUp className={monthlyChange >= 0 ? 'text-blue-600' : 'text-red-600'} size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Gains</p>
                  <p className="text-2xl font-bold text-green-600">+{formatCurrency(totalGains)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <TrendingUp className="text-green-600" size={24} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Losses</p>
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
            <span className="ml-3 text-gray-600">Loading incomes...</span>
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

        {/* Income List */}
        <div className={`${showAddModal || showEditModal ? 'blur-sm' : ''}`}>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
            </div>
            
            <div className="divide-y divide-gray-100">
              {incomes.length === 0 && !loading ? (
                <div className="text-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <DollarSign className="text-gray-400" size={24} />
                  </div>
                  <p className="text-gray-500 text-lg mb-2">No income entries found</p>
                  <p className="text-gray-400">Start by adding your first income source</p>
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

        {/* Add Income Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
            <div className="bg-white rounded-2xl shadow-2xl z-10 w-full max-w-2xl overflow-hidden">
              <div className="flex justify-between items-center border-b p-6 bg-gradient-to-r from-blue-50 to-blue-100">
                <h3 className="text-2xl font-bold text-gray-900">
                  Add New Transaction
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
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
                      onChange={handleInputChange}
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
                      onChange={handleInputChange}
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
                        onChange={handleInputChange}
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
                      onChange={handleInputChange}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 border-t p-6 bg-gray-50">
                <button
                  onClick={() => setShowAddModal(false)}
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
        {showEditModal && editingIncome && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
            <div className="bg-white rounded-2xl shadow-2xl z-10 w-full max-w-2xl overflow-hidden">
              <div className="flex justify-between items-center border-b p-6 bg-gradient-to-r from-green-50 to-green-100">
                <h3 className="text-2xl font-bold text-gray-900">
                  Edit Income Source
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
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
                      onChange={handleInputChange}
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
                      onChange={handleInputChange}
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
                      onChange={handleInputChange}
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
                      onChange={handleInputChange}
                      className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 border-t p-6 bg-gray-50">
                <button
                  onClick={() => setShowEditModal(false)}
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
      </div>
    </div>
  );
};

export default IncomePage;
