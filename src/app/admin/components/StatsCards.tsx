'use client';

import { DashboardStats } from '../types';

interface StatsCardsProps {
  stats: DashboardStats;
  onViewCustomers: () => void;
  onViewLoanDetails: () => void;
  onViewTeam: () => void;
  onViewRequests: () => void;
}

export default function StatsCards({
  stats,
  onViewCustomers,
  onViewLoanDetails,
  onViewTeam,
  onViewRequests
}: StatsCardsProps) {
  // Format currency for display
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else {
      return `₹${amount.toLocaleString()}`;
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Loans Card */}
      <div 
        onClick={onViewLoanDetails}
        className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Loans</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.totalLoans?.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Active loans</p>
          </div>
          <div className="bg-indigo-50 p-3 rounded-lg">
            <span className="text-indigo-600 text-xl font-semibold">📊</span>
          </div>
        </div>
      </div>

      {/* Total Loan Amount Card */}
      <div 
        onClick={onViewLoanDetails}
        className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Loan Amount</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {formatCurrency(stats.totalAmount || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Active loans value</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <span className="text-green-600 text-xl font-semibold">💰</span>
          </div>
        </div>
      </div>

      {/* Total Active Customers Card */}
      <div 
        onClick={onViewCustomers}
        className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Active Customers</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.totalCustomers?.toLocaleString() || '0'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Currently active</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <span className="text-blue-600 text-xl font-semibold">👥</span>
          </div>
        </div>
      </div>

      {/* Total Team Members Card */}
      <div 
        onClick={onViewTeam}
        className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Team Members</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {stats.totalTeamMembers || '0'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Active team members</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <span className="text-purple-600 text-xl font-semibold">👨‍💼</span>
          </div>
        </div>
      </div>
    </div>
  );
}