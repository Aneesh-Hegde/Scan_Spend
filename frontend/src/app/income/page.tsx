"use client";
import React, { useState, useEffect } from 'react';
import { DollarSign, Edit, Save, Trash2, X, Plus } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <DollarSign className="mr-2" />
            Manage Income
          </h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 flex items-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus size={16} className="mr-1" /> Add Income
          </button>
        </div>

        {/* Display Loading/Error States */}
        {loading && <p className="text-gray-500">Loading incomes...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {/* Income List */}
        <div className={`space-y-4 ${showAddModal || showEditModal ? 'blur-sm' : ''}`}>
          {incomes.length === 0 && !loading && (
            <p className="text-gray-500">No income entries found.</p>
          )}
          {incomes.map(income => (
            <div
              key={income.id}
              className="flex items-center p-3 border border-green-100 rounded-lg bg-green-50 text-sm"
            >
              <div className="flex-1">
                <div className="font-medium">{income.source}</div>
                <div className="text-xs text-gray-500">{income.amountDescription}</div>
                <div className="text-xs text-gray-500">
                  {new Date(income.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
              <div className="font-medium text-green-500 mr-3">
                +{formatCurrency(income.amount)}
              </div>
              <button
                onClick={() => handleEditIncome(income)}
                className="p-2 rounded-full hover:bg-green-100"
              >
                <Edit size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Income Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowAddModal(false)}></div>
          <div className="bg-white rounded-lg shadow-xl z-10 w-4/5 max-w-3xl overflow-hidden">
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-xl font-medium">
                Add New Income
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <input
                    type="text"
                    name="source"
                    value={newIncome.source}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Income source"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Description</label>
                  <input
                    type="text"
                    name="amountDescription"
                    value={newIncome.amountDescription}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Amount description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    value={newIncome.amount}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={newIncome.date}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 border-t p-4 bg-gray-50">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIncome}
                className="px-4 py-2 flex items-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                <Save size={16} className="mr-1" /> Add Income
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Income Modal */}
      {showEditModal && editingIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowEditModal(false)}></div>
          <div className="bg-white rounded-lg shadow-xl z-10 w-4/5 max-w-3xl overflow-hidden">
            <div className="flex justify-between items-center border-b p-4">
              <h3 className="text-xl font-medium">
                Edit Income
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <input
                    type="text"
                    name="source"
                    value={editingIncome.source}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Income source"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Description</label>
                  <input
                    type="text"
                    name="amountDescription"
                    value={editingIncome.amountDescription}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Amount description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    value={editingIncome.amount}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={editingIncome.date}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 border-t p-4 bg-gray-50">
              {/* Uncomment if delete functionality is added back */}
              {/* <button
                onClick={handleDeleteIncome}
                className="px-4 py-2 flex items-center rounded-md bg-red-100 text-red-500 hover:bg-red-200"
              >
                <Trash2 size={16} className="mr-1" /> Delete
              </button> */}
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveIncome}
                className="px-4 py-2 flex items-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                <Save size={16} className="mr-1" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomePage;
