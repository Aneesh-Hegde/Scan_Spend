"use client";
import React, { useState, useRef, useEffect, Suspense } from 'react';
import { Calendar, ChevronLeft, ChevronRight, DollarSign, ArrowDownLeft, ArrowUpRight, X, Edit, Save, Trash2 } from 'lucide-react';
import { ProductServiceClient } from '../grpc_schema/ProductServiceClientPb';
import { GetProductsByUserRequest, Product as GrpcProduct, ProductsList } from '../grpc_schema/product_pb';
import { BalanceServiceClient } from '../grpc_schema/BalanceServiceClientPb';
import { GetTransferRequest, GetTransferResponse, TransferFunds, GetIncomeRequest, GetIncomeResponse, Income } from '../grpc_schema/balance_pb';
import api from '../utils/api';
import { Metadata } from 'grpc-web';
import { Product as typed_product } from '../types/types';
import LuxuryCurrencyLoader from '../components/loading';

// Define typed_transfer for transfer data
interface typed_transfer {
  ID: string;
  description: string;
  from_source: string;
  to_source: string;
  amount: number;
  date: string;
}

// Define typed_income for income data
interface typed_income {
  ID: number; // Changed to string to match income.getIncomeId()
  source: string;
  amountDescription: string;
  amount: number;
  date: string;
};

// Define Tab enum
enum Tab {
  Expense = 'expense',
  Income = 'income',
  Transfer = 'transfer'
}

// Define Transaction interface
interface Transaction {
  id: number;
  date: string;
  type: Tab;
  amount: number;
  source: string;
  amountDescription: string;
  from_source?: string;
  to_source?: string;
}

// Sample data
const sampleTransactions: Transaction[] = [
  { id: 1, date: '2025-04-20', type: Tab.Expense, amount: 45.99, source: 'Grocery Store', amountDescription: 'Groceries' },
  { id: 2, date: '2025-04-20', type: Tab.Expense, amount: 25.50, source: 'Restaurant', amountDescription: 'Dinner' },
  { id: 3, date: '2025-04-20', type: Tab.Income, amount: 1500, source: 'Employer', amountDescription: 'Salary' },
  { id: 4, date: '2025-04-22', type: Tab.Transfer, amount: 500, source: 'Checking', amountDescription: 'To savings', from_source: 'Checking', to_source: 'Savings' },
  { id: 5, date: '2025-04-22', type: Tab.Expense, amount: 65.75, source: 'Gas Station', amountDescription: 'Gas' },
  { id: 6, date: '2025-04-25', type: Tab.Expense, amount: 120, source: 'Utility Company', amountDescription: 'Electric bill' },
  { id: 7, date: '2025-04-26', type: Tab.Transfer, amount: 200, source: 'Savings', amountDescription: 'To investment', from_source: 'Savings', to_source: 'Investment' },
  { id: 8, date: '2025-04-26', type: Tab.Income, amount: 75, source: 'Client', amountDescription: 'Freelance work' },
  { id: 9, date: '2025-04-26', type: Tab.Income, amount: 50, source: 'Retailer', amountDescription: 'Refund' },
];

interface Day {
  day: number | null;
  date: string | null;
  transactions?: Transaction[];
}

interface PopupPosition {
  top: number;
  left: number;
}

const client = new ProductServiceClient("http://localhost:8080");
const balanceClient = new BalanceServiceClient("http://localhost:8080");

// Data fetching component
const DataFetcher: React.FC<{
  children: (data: {
    transactions: Transaction[];
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    loading: boolean;
    errors: { products: string | null; transfers: string | null; incomes: string | null };
  }) => React.ReactElement;
}> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(sampleTransactions);
  const [loading, setLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<{
    products: string | null;
    transfers: string | null;
    incomes: string | null;
  }>({ products: null, transfers: null, incomes: null });
  const [isClient, setIsClient] = useState(false);

  // Normalize date to YYYY-MM-DD format
  const normalizeDate = (dateStr: string | undefined): string => {
    if (!dateStr) {
      return new Date(2025, 4, 9).toISOString().split('T')[0]; // Fixed date for consistency
    }

    // Handle format: "2025-05-15 18:00:35.604787 +0530 IST"
    const cleanedDateStr = dateStr.replace(/\.\d+\s/, ' ').replace(/\s\w+$/, '');
    const date = new Date(cleanedDateStr);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date format: ${dateStr}, falling back to default date`);
      return new Date(2025, 4, 9).toISOString().split('T')[0];
    }

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Fetch products
  const getProducts = async (): Promise<typed_product[]> => {
    if (typeof window === 'undefined') return []; // Skip on server
    const request = new GetProductsByUserRequest();
    const response = await api.get("/get-refresh-token", { withCredentials: true });
    if (!response.data || !response.data.refresh_token) {
      throw new Error("Failed to retrieve refresh token for products");
    }
    const refresh_token = response.data.refresh_token;
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication token not found in localStorage for products");
    }
    const requestMetadata: Metadata = { authentication: `Bearer ${token}`, refresh_token };

    return new Promise((resolve, reject) => {
      client.getProductsByUser(request, requestMetadata, (err: any, res: ProductsList) => {
        if (err) {
          reject(new Error(`Failed to fetch products: ${err.message}`));
          return;
        }

        const products: typed_product[] = res.getProductsList().map((product: GrpcProduct, index: number) => {
          const amount = Number(product.getAmount());
          const quantity = Number(product.getQuantity());
          if (isNaN(amount) || isNaN(quantity)) {
            throw new Error(`Invalid amount or quantity for product: ${product.getProductName()}`);
          }
          return {
            ID: `prod_${index}`, // Deterministic ID
            product_name: product.getProductName(),
            quantity,
            amount,
            Name: product.getProductName(),
            category: product.getCategory(),
            Date: product.getDate(),
          };
        });

        resolve(products);
      });
    });
  };

  // Fetch transfers
  const getTransfers = async (): Promise<typed_transfer[]> => {
    if (typeof window === 'undefined') return []; // Skip on server
    const request = new GetTransferRequest();
    const response = await api.get("/get-refresh-token", { withCredentials: true });
    if (!response.data || !response.data.refresh_token) {
      throw new Error("Failed to retrieve refresh token for transfers");
    }
    const refresh_token = response.data.refresh_token;
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication token not found in localStorage for transfers");
    }
    const requestMetadata: Metadata = { authentication: `Bearer ${token}`, refresh_token };

    return new Promise((resolve, reject) => {
      balanceClient.getTransfer(request, requestMetadata, (err: any, res: GetTransferResponse) => {
        console.log(res)
        if (err) {
          reject(new Error(`Failed to fetch transfers: ${err.message}`));
          return;
        }

        const transfers: typed_transfer[] = res.getTransfersList().map((transfer: TransferFunds) => {
          const amount = Number(transfer.getAmount());
          if (isNaN(amount)) {
            throw new Error(`Invalid amount for transfer: ${transfer.getTransferId()}`);
          }
          return {
            ID: `${transfer.getTransferId()}`,
            description: `To ${transfer.getToSource()}`,
            amount,
            from_source: transfer.getFromSource(),
            to_source: transfer.getToSource(),
            date: transfer.getDate(),
          };
        });

        resolve(transfers);
      });
    });
  };

  // Fetch incomes
  const getIncomes = async (): Promise<typed_income[]> => {
    if (typeof window === 'undefined') return [];
    const request = new GetIncomeRequest();
    const response = await api.get("/get-refresh-token", { withCredentials: true });
    if (!response.data || !response.data.refresh_token) {
      throw new Error("Failed to retrieve refresh token for incomes");
    }
    const refresh_token = response.data.refresh_token;
    const token = localStorage.getItem("token");
    if (!token) {
      throw new Error("Authentication token not found in localStorage for incomes");
    }
    const requestMetadata: Metadata = { authentication: `Bearer ${token}`, refresh_token };

    return new Promise((resolve, reject) => {
      balanceClient.getIncomes(request, requestMetadata, (err: any, res: GetIncomeResponse) => {
        if (err) {
          console.error("Error fetching incomes:", err);
          reject(new Error(`Failed to fetch incomes: ${err.message}`));
          return;
        }

        console.log(res);

        const incomes: typed_income[] = res.getIncomeList().map((income: Income) => {
          const amount = Number(income.getIncome());
          if (isNaN(amount)) {
            throw new Error(`Invalid amount for income: ${income.getIncomeId()}`);
          }
          return {
            ID: income.getIncomeId(),
            source: income.getIncomeSource() || 'Unknown',
            amountDescription: income.getIncomeSource() || 'Unknown',
            amount,
            date: income.getDate() || new Date().toISOString(),
          };
        });

        resolve(incomes);
      });
    });
  };

  useEffect(() => {
    setIsClient(true); // Mark as client-side
    let isMounted = true;

    const fetchData = async () => {
      try {
        // Fetch products (expenses)
        const products = await getProducts();
        const productTransactions: Transaction[] = products.map((product, index) => ({
          id: sampleTransactions.length + index + 1,
          date: normalizeDate(product.Date),
          type: Tab.Expense,
          amount: Number(((product.amount ?? 0) * (product.quantity ?? 1)).toFixed(2)),
          source: product.product_name ?? product.Name ?? 'Unknown Product',
          amountDescription: product.product_name ?? product.Name ?? 'Unknown Product',
        }));

        // Fetch transfers
        const transfers = await getTransfers();
        const transferTransactions: Transaction[] = transfers.map((transfer, index) => ({
          id: sampleTransactions.length + productTransactions.length + index + 1,
          date: normalizeDate(transfer.date),
          type: Tab.Transfer,
          amount: transfer.amount,
          source: transfer.from_source,
          amountDescription: transfer.description,
          from_source: transfer.from_source,
          to_source: transfer.to_source,
        }));

        // Fetch incomes
        const incomes = await getIncomes();
        const incomeTransactions: Transaction[] = incomes.map((income, index) => ({
          id: sampleTransactions.length + productTransactions.length + transferTransactions.length + index + 1,
          date: normalizeDate(income.date),
          type: Tab.Income,
          amount: income.amount,
          source: income.source,
          amountDescription: income.amountDescription,
        }));

        if (isMounted) {
          setTransactions((prev) => [
            ...prev,
            ...productTransactions,
            ...transferTransactions,
            ...incomeTransactions,
          ]);
          setErrors({ products: null, transfers: null, incomes: null });
        }
      } catch (err: any) {
        if (isMounted) {
          const errorMessage = err.message || 'Unknown error';
          if (errorMessage.includes('products')) {
            setErrors((prev) => ({ ...prev, products: 'Failed to fetch products: ' + errorMessage }));
          } else if (errorMessage.includes('transfers')) {
            setErrors((prev) => ({ ...prev, transfers: 'Failed to fetch transfers: ' + errorMessage }));
          } else if (errorMessage.includes('incomes')) {
            setErrors((prev) => ({ ...prev, incomes: 'Failed to fetch incomes: ' + errorMessage }));
          } else {
            setErrors({
              products: 'Failed to fetch products: ' + errorMessage,
              transfers: 'Failed to fetch transfers: ' + errorMessage,
              incomes: 'Failed to fetch incomes: ' + errorMessage,
            });
          }
          console.error(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (isClient) {
      fetchData();
    }

    return () => {
      isMounted = false;
    };
  }, [isClient]);

  return children({ transactions, setTransactions, loading, errors });
};

// Main FinancialCalendar component
const CalendarContent: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [showMonthPicker, setShowMonthPicker] = useState<boolean>(false);
  const [showYearPicker, setShowYearPicker] = useState<boolean>(false);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node) && !showEditModal) {
        setShowPopup(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEditModal]);

  // Calendar navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToMonth = (month: number, year: number) => {
    setCurrentDate(new Date(year, month, 1));
    setShowMonthPicker(false);
    setShowYearPicker(false);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate transaction totals by type for a day
  const getTransactionTotals = (transactions: Transaction[]) => {
    const totals: { [key in Tab]: number } = {
      [Tab.Expense]: 0,
      [Tab.Income]: 0,
      [Tab.Transfer]: 0,
    };

    const counts: { [key in Tab]: number } = {
      [Tab.Expense]: 0,
      [Tab.Income]: 0,
      [Tab.Transfer]: 0,
    };

    transactions.forEach((transaction) => {
      totals[transaction.type] += transaction.amount;
      counts[transaction.type]++;
    });

    return { totals, counts };
  };

  // Render transaction amounts by type
  const renderTransactionAmounts = (transactions: Transaction[]) => {
    const { totals, counts } = getTransactionTotals(transactions);

    return (
      <div className="flex flex-col gap-1 mt-1 text-xs">
        {totals[Tab.Expense] > 0 && (
          <div className="flex items-center text-red-500">
            <span className="font-medium">-{formatCurrency(totals[Tab.Expense])}</span>
            {counts[Tab.Expense] > 1 && <span className="ml-1 text-gray-500">({counts[Tab.Expense]})</span>}
          </div>
        )}
        {totals[Tab.Income] > 0 && (
          <div className="flex items-center text-green-500">
            <span className="font-medium">+{formatCurrency(totals[Tab.Income])}</span>
            {counts[Tab.Income] > 1 && <span className="ml-1 text-gray-500">({counts[Tab.Income]})</span>}
          </div>
        )}
        {totals[Tab.Transfer] > 0 && (
          <div className="flex items-center text-blue-500">
            <span className="font-medium">↔{formatCurrency(totals[Tab.Transfer])}</span>
            {counts[Tab.Transfer] > 1 && <span className="ml-1 text-gray-500">({counts[Tab.Transfer]})</span>}
          </div>
        )}
      </div>
    );
  };

  // Group transactions by type for the details panel
  const groupTransactionsByType = (transactions: Transaction[]): { [key in Tab]: Transaction[] } => {
    const grouped: { [key in Tab]: Transaction[] } = {
      [Tab.Expense]: [],
      [Tab.Income]: [],
      [Tab.Transfer]: [],
    };

    transactions.forEach((transaction) => {
      grouped[transaction.type].push(transaction);
    });

    return grouped;
  };

  return (
    <DataFetcher>
      {({ transactions, setTransactions, loading, errors }) => {
        // Generate calendar days
        const generateCalendarDays = (): Day[] => {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();

          const firstDayOfMonth = new Date(year, month, 1).getDay();
          const daysInMonth = new Date(year, month + 1, 0).getDate();

          const transactionsByDate = transactions.reduce((acc, transaction) => {
            if (!acc[transaction.date]) {
              acc[transaction.date] = [];
            }
            acc[transaction.date].push(transaction);
            return acc;
          }, {} as Record<string, Transaction[]>);

          const days: Day[] = [];

          for (let i = 0; i < firstDayOfMonth; i++) {
            days.push({ day: null, date: null });
          }

          for (let i = 1; i <= daysInMonth; i++) {
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({
              day: i,
              date,
              transactions: transactionsByDate[date] || [],
            });
          }

          return days;
        };

        // Get transactions for selected date
        const getSelectedDateTransactions = (): Transaction[] => {
          if (!selectedDate) return [];
          return transactions.filter((t) => t.date === selectedDate);
        };

        // Handle day click
        const handleDayClick = (day: Day, event: React.MouseEvent<HTMLDivElement>) => {
          if (!day.day) return;
          setSelectedDate(day.date);
          setShowPopup(true);
        };

        // Handle edit transaction
        const handleEditTransaction = (transaction: Transaction) => {
          setEditingTransaction({ ...transaction });
          setShowEditModal(true);
          setShowPopup(false);
        };

        // Handle save transaction
        const handleSaveTransaction = () => {
          if (editingTransaction) {
            setTransactions(transactions.map((t) =>
              t.id === editingTransaction.id ? editingTransaction : t
            ));
            setShowEditModal(false);
            setEditingTransaction(null);
          }
        };

        // Handle delete transaction
        const handleDeleteTransaction = () => {
          if (editingTransaction) {
            setTransactions(transactions.filter((t) => t.id !== editingTransaction.id));
            setShowEditModal(false);
            setEditingTransaction(null);
          }
        };

        // Handle input change
        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
          const { name, value } = e.target;

          if (!editingTransaction) return;

          if (name === 'amount') {
            setEditingTransaction({
              ...editingTransaction,
              [name]: parseFloat(value) || 0,
            });
          } else if (name === 'type') {
            setEditingTransaction({
              ...editingTransaction,
              [name]: value as Tab,
            });
          } else {
            setEditingTransaction({
              ...editingTransaction,
              [name]: value,
            });
          }
        };

        // Handle tab change
        const handleTabChange = (tab: Tab) => {
          if (!editingTransaction) return;
          setEditingTransaction({
            ...editingTransaction,
            type: tab,
            ...(tab !== Tab.Transfer ? { from_source: undefined, to_source: undefined } : {}),
          });
        };

        const days = generateCalendarDays();
        const selectedTransactions = getSelectedDateTransactions();
        const groupedTransactions = groupTransactionsByType(selectedTransactions);

        return (
          <div className="max-w-4xl mx-auto p-4">
            <div className="mb-8 relative">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold flex items-center">
                  <Calendar className="mr-2" />
                  Financial Calendar
                </h2>
                <div className="flex items-center gap-2">
                  <button onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-100">
                    <ChevronLeft />
                  </button>

                  {/* Month/Year selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMonthPicker(!showMonthPicker)}
                      className="mx-2 text-lg font-medium hover:bg-gray-100 px-3 py-1 rounded-md"
                    >
                      {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </button>

                    {/* Month Picker Dropdown */}
                    {showMonthPicker && (
                      <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4 min-w-64">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">Select Month & Year</h4>
                          <button
                            onClick={() => setShowMonthPicker(false)}
                            className="p-1 rounded-full hover:bg-gray-100"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* Year selector */}
                        <div className="mb-3">
                          <select
                            value={currentDate.getFullYear()}
                            onChange={(e) => goToMonth(currentDate.getMonth(), parseInt(e.target.value))}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                          >
                            {years.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>

                        {/* Month grid */}
                        <div className="grid grid-cols-3 gap-2">
                          {months.map((month, index) => (
                            <button
                              key={month}
                              onClick={() => goToMonth(index, currentDate.getFullYear())}
                              className={`p-2 text-sm rounded-md hover:bg-blue-100 ${currentDate.getMonth() === index ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                                }`}
                            >
                              {month.slice(0, 3)}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={goToToday}
                          className="w-full mt-3 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                        >
                          Go to Today
                        </button>
                      </div>
                    )}
                  </div>

                  <button onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-100">
                    <ChevronRight />
                  </button>

                  {/* Today button */}
                  <button
                    onClick={goToToday}
                    className="ml-2 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Today
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="flex items-center gap-6 mb-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 text-red-500 mr-1">-</div>
                <span>Expense</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 text-green-500 mr-1">+</div>
                <span>Income</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 text-blue-500 mr-1">↔</div>
                <span>Transfer</span>
              </div>
            </div>

            {/* Display Loading/Error States */}
            {loading && <LuxuryCurrencyLoader />}
            {errors.products && <p className="text-red-500">{errors.products}</p>}
            {errors.transfers && <p className="text-red-500">{errors.transfers}</p>}
            {errors.incomes && <p className="text-red-500">{errors.incomes}</p>}

            {/* Calendar Grid */}
            <div className={`grid grid-cols-7 gap-2 ${showPopup || showEditModal ? 'blur-sm' : ''}`}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center font-medium py-2">{day}</div>
              ))}

              {days.map((day, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-2 min-h-24 ${!day.day ? 'bg-gray-50' : 'cursor-pointer hover:bg-gray-50'} ${day.date === selectedDate ? 'border-2 border-blue-500' : 'hover:border-blue-200'
                    }`}
                  onClick={(e) => day.day && handleDayClick(day, e)}
                >
                  {day.day && (
                    <>
                      <div className="font-medium">{day.day}</div>
                      {day.transactions && day.transactions.length > 0 && renderTransactionAmounts(day.transactions)}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Transaction Modal */}
            {showPopup && selectedDate && !showEditModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowPopup(false)}></div>
                <div ref={popupRef} className="bg-white rounded-lg shadow-xl z-10 w-4/5 max-w-3xl overflow-hidden">
                  <div className="flex justify-between items-center border-b p-4">
                    <h3 className="text-xl font-medium">
                      {new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </h3>
                    <button onClick={() => setShowPopup(false)} className="p-1 rounded-full hover:bg-gray-100">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {selectedTransactions.length === 0 ? (
                      <p className="text-gray-500 pt-2 pb-4">No transactions for this date.</p>
                    ) : (
                      <div className="space-y-6 pb-4">
                        {/* Expenses */}
                        {groupedTransactions[Tab.Expense].length > 0 && (
                          <div>
                            <h4 className="text-red-500 font-medium mb-4 flex items-center text-sm">
                              <ArrowUpRight className="mr-1" size={16} />
                              Expenses - Total: {formatCurrency(groupedTransactions[Tab.Expense].reduce((sum, t) => sum + t.amount, 0))}
                            </h4>
                            <div className="space-y-4">
                              {groupedTransactions[Tab.Expense].map((transaction) => (
                                <div key={transaction.id} className="flex items-center p-3 border border-red-100 rounded-lg bg-red-50 text-sm">
                                  <div className="flex-1">
                                    <div className="font-medium">{transaction.source}</div>
                                    <div className="text-xs text-gray-500">{transaction.amountDescription}</div>
                                  </div>
                                  <div className="font-medium text-red-500 mr-3">-{formatCurrency(transaction.amount)}</div>
                                  <button onClick={() => handleEditTransaction(transaction)} className="p-2 rounded-full hover:bg-red-100">
                                    <Edit size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Income */}
                        {groupedTransactions[Tab.Income].length > 0 && (
                          <div>
                            <h4 className="text-green-500 font-medium mb-4 flex items-center text-sm">
                              <ArrowDownLeft className="mr-1" size={16} />
                              Income - Total: {formatCurrency(groupedTransactions[Tab.Income].reduce((sum, t) => sum + t.amount, 0))}
                            </h4>
                            <div className="space-y-4">
                              {groupedTransactions[Tab.Income].map((transaction) => (
                                <div key={transaction.id} className="flex items-center p-3 border border-green-100 rounded-lg bg-green-50 text-sm">
                                  <div className="flex-1">
                                    <div className="font-medium">{transaction.source}</div>
                                    <div className="text-xs text-gray-500">{transaction.amountDescription}</div>
                                  </div>
                                  <div className="font-medium text-green-500 mr-3">+{formatCurrency(transaction.amount)}</div>
                                  <button onClick={() => handleEditTransaction(transaction)} className="p-2 rounded-full hover:bg-green-100">
                                    <Edit size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Transfers */}
                        {groupedTransactions[Tab.Transfer].length > 0 && (
                          <div>
                            <h4 className="text-blue-500 font-medium mb-4 flex items-center text-sm">
                              <DollarSign className="mr-1" size={16} />
                              Transfers - Total: {formatCurrency(groupedTransactions[Tab.Transfer].reduce((sum, t) => sum + t.amount, 0))}
                            </h4>
                            <div className="space-y-4">
                              {groupedTransactions[Tab.Transfer].map((transaction) => (
                                <div key={transaction.id} className="flex items-center p-3 border border-blue-100 rounded-lg bg-blue-50 text-sm">
                                  <div className="flex-1">
                                    <div className="font-medium">{transaction.source}</div>
                                    <div className="text-xs text-gray-500">
                                      {transaction.from_source} → {transaction.to_source}
                                    </div>
                                    <div className="text-xs text-gray-500">{transaction.amountDescription}</div>
                                  </div>
                                  <div className="font-medium text-blue-500 mr-3">↔{formatCurrency(transaction.amount)}</div>
                                  <button onClick={() => handleEditTransaction(transaction)} className="p-2 rounded-full hover:bg-blue-100">
                                    <Edit size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingTransaction && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowEditModal(false)}></div>
                <div className="bg-white rounded-lg shadow-xl z-10 w-4/5 max-w-3xl overflow-hidden">
                  <div className="flex justify-between items-center border-b p-4">
                    <h3 className="text-xl font-medium">Edit Transaction</h3>
                    <button onClick={() => setShowEditModal(false)} className="p-1 rounded-full hover:bg-gray-100">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="border-b">
                    <div className="flex">
                      <button
                        onClick={() => handleTabChange(Tab.Expense)}
                        className={`px-4 py-2 font-medium text-sm border-b-2 ${editingTransaction.type === Tab.Expense ? 'border-red-500 text-red-500' : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                      >
                        Expense
                      </button>
                      <button
                        onClick={() => handleTabChange(Tab.Income)}
                        className={`px-4 py-2 font-medium text-sm border-b-2 ${editingTransaction.type === Tab.Income ? 'border-green-500 text-green-500' : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                      >
                        Income
                      </button>
                      <button
                        onClick={() => handleTabChange(Tab.Transfer)}
                        className={`px-4 py-2 font-medium text-sm border-b-2 ${editingTransaction.type === Tab.Transfer ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                      >
                        Transfer
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                        <input
                          type="text"
                          name="source"
                          value={editingTransaction.source}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Transaction source"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount Description</label>
                        <input
                          type="text"
                          name="amountDescription"
                          value={editingTransaction.amountDescription}
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
                          value={editingTransaction.amount}
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
                          value={editingTransaction.date}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {editingTransaction.type === Tab.Transfer && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">From Source</label>
                            <input
                              type="text"
                              name="from_source"
                              value={editingTransaction.from_source || ''}
                              onChange={handleInputChange}
                              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="From source"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To Source</label>
                            <input
                              type="text"
                              name="to_source"
                              value={editingTransaction.to_source || ''}
                              onChange={handleInputChange}
                              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="To source"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-3 border-t p-4 bg-gray-50">
                    <button
                      onClick={handleDeleteTransaction}
                      className="px-4 py-2 flex items-center rounded-md bg-red-100 text-red-500 hover:bg-red-200"
                    >
                      <Trash2 size={16} className="mr-1" /> Delete
                    </button>
                    <button onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-100">
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveTransaction}
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
}}
    </DataFetcher >
  );
};

const FinancialCalendar: React.FC = () => {
  return (
    <Suspense fallback={<LuxuryCurrencyLoader />}>
      <CalendarContent />
    </Suspense>
  );
};

export default FinancialCalendar;
