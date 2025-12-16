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
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
            <p className="text-xs text-gray-500 mt-1">Currently active customers</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <span className="text-blue-600 text-xl font-semibold">👥</span>
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
              ₹{(stats.totalAmount / 100000).toFixed(1)}L
            </p>
            <p className="text-xs text-gray-500 mt-1">Active loans amount</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <span className="text-green-600 text-xl font-semibold">💰</span>
          </div>
        </div>
      </div>

      {/* Total Team Member Card */}
      <div 
        onClick={onViewTeam}
        className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Team Members</p>
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

      {/* Pending Requests Card */}
      <div 
        onClick={onViewRequests}
        className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Pending Requests</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {stats.pendingRequests}
            </p>
            <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <span className="text-orange-600 text-xl font-semibold">📋</span>
          </div>
        </div>
      </div>
    </div>
  );
}