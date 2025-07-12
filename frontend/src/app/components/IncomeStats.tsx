import React from 'react';
import { Wallet, TrendingUp, Calendar } from 'lucide-react';

interface Income {
  id: number;
  source: string;
  amountDescription: string;
  amount: number;
  date: string;
}

interface IncomeStatsProps {
  incomes: Income[];
}

const IncomeStats: React.FC<IncomeStatsProps> = ({ incomes }) => {
  // Helper to format currency (you might want to centralize this in a utils file)
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate total balance
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
  // const uniqueSources = new Set(incomes.map(income => income.source)).size; // Not used in current cards, but useful metric

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {/* Total Balance Card */}
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

      {/* Monthly Change Card */}
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

      {/* Total Gains Card */}
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

      {/* Total Losses Card */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Losses</p>
            <p className="text-2xl font-bold text-red-600">-{formatCurrency(totalLosses)}</p>
          </div>
          <div className="p-3 bg-red-100 rounded-xl">
            <Calendar className="text-red-600" size={24} /> {/* Calendar might not be the best icon here, but keeping consistent with original */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomeStats;
