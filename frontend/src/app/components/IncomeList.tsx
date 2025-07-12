import React from 'react';
import { DollarSign, Edit, Calendar } from 'lucide-react';

interface Income {
  id: number;
  source: string;
  amountDescription: string;
  amount: number;
  date: string;
}

interface IncomeListProps {
  incomes: Income[];
  onEdit: (income: Income) => void;
}

const IncomeList: React.FC<IncomeListProps> = ({ incomes, onEdit }) => {
  // Helper to format currency (you might want to centralize this in a utils file)
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
      </div>
      
      <div className="divide-y divide-gray-100">
        {incomes.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <DollarSign className="text-gray-400" size={24} />
            </div>
            <p className="text-gray-500 text-lg mb-2">No income entries found</p>
            <p className="text-gray-400">Start by adding your first income source</p>
          </div>
        ) : (
          incomes.map((income) => (
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
                      onClick={() => onEdit(income)}
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
  );
};

export default IncomeList;
