import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface Income {
  id: number; // Will be handled by parent/service
  source: string;
  amountDescription: string;
  amount: number;
  date: string;
}

interface AddIncomeModalProps {
  show: boolean;
  onClose: () => void;
  onAddIncome: (income: Omit<Income, 'id'>) => Promise<void>; // Expects the partial income data
}

const AddIncomeModal: React.FC<AddIncomeModalProps> = ({ show, onClose, onAddIncome }) => {
  const [incomeData, setIncomeData] = useState<Omit<Income, 'id'>>({
    source: '',
    amountDescription: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!show) {
      setIncomeData({
        source: '',
        amountDescription: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0]
      });
    }
  }, [show]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      // Ensure amount is parsed correctly, handling the '$855.00"' format if coming from an input
      // Assuming type="number" input, value is already a string of a number or empty
      setIncomeData({ ...incomeData, [name]: parseFloat(value) || 0 });
    } else {
      setIncomeData({ ...incomeData, [name]: value });
    }
  };

  const handleSubmit = async () => {
    // Validation logic here
    if (!incomeData.source || !incomeData.amountDescription || isNaN(incomeData.amount)) {
        alert("Please fill all required fields correctly.");
        return;
    }
    await onAddIncome(incomeData); // Call the parent's add function
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-2xl z-10 w-full max-w-2xl overflow-hidden">
        <div className="flex justify-between items-center border-b p-6 bg-gradient-to-r from-blue-50 to-blue-100">
          <h3 className="text-2xl font-bold text-gray-900">Add New Transaction</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/50 transition-colors duration-200">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            {/* Input fields for source, description, amount, date */}
            {/* ... (as per your original code) ... */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  value={incomeData.amount}
                  onChange={handleInputChange}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter positive for gains, negative for losses"
                />
                <div className="absolute right-4 top-4 text-sm text-gray-500">
                  {incomeData.amount >= 0 ? '📈 Gain' : '📉 Loss'}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use positive numbers for gains/income, negative numbers for losses
              </p>
            </div>
            {/* ... other inputs ... */}
          </div>
        </div>
        <div className="flex justify-end items-center gap-4 border-t p-6 bg-gray-50">
          <button onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-300 hover:bg-gray-100 transition-colors duration-200">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-6 py-3 flex items-center rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200">
            <Save size={16} className="mr-2" /> Add Transaction
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddIncomeModal;
