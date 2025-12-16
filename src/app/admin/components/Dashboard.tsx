'use client';

import { useState } from 'react';
import { DashboardStats } from '../types';
import StatsCards from './StatsCards';
import RecentActivities from './RecentActivities';
import LoanDetailsModal from './modals/LoanDetailsModal';

interface DashboardProps {
  stats: DashboardStats;
  pendingRequestsCount: number;
  onViewCustomers: () => void;
  onViewRequests: () => void;
  onViewTeam: () => void;
  onViewReports: () => void;
  onViewCollection: () => void;
}

export default function Dashboard({
  stats,
  pendingRequestsCount,
  onViewCustomers,
  onViewRequests,
  onViewTeam,
  onViewReports,
  onViewCollection
}: DashboardProps) {
  const [showLoanDetails, setShowLoanDetails] = useState(false);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome to Admin Dashboard</h1>
        <p className="opacity-90">KALA BROTHERS - Manage your loan business efficiently</p>
      </div>

      {/* Stats Cards */}
      <StatsCards
        stats={stats}
        onViewCustomers={onViewCustomers}
        onViewLoanDetails={() => setShowLoanDetails(true)}
        onViewTeam={onViewTeam}
        onViewRequests={onViewRequests}
      />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button 
          onClick={onViewCustomers}
          className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition-colors border border-blue-200"
        >
          <div className="text-blue-600 text-lg mb-2">👥</div>
          <span className="text-sm font-medium text-blue-900">Manage Customers</span>
        </button>
        
        <button 
          onClick={onViewRequests}
          className="p-4 bg-orange-50 rounded-lg text-center hover:bg-orange-100 transition-colors border border-orange-200"
        >
          <div className="text-orange-600 text-lg mb-2">📋</div>
          <span className="text-sm font-medium text-orange-900">Pending Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {pendingRequestsCount}
            </span>
          )}
        </button>
        
        <button 
          onClick={onViewReports}
          className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition-colors border border-purple-200"
        >
          <div className="text-purple-600 text-lg mb-2">📊</div>
          <span className="text-sm font-medium text-purple-900">View Reports</span>
        </button>
        
        <button 
          onClick={onViewTeam}
          className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100 transition-colors border border-green-200"
        >
          <div className="text-green-600 text-lg mb-2">👨‍💼</div>
          <span className="text-sm font-medium text-green-900">Team Management</span>
        </button>
      </div>

      {/* Recent Activities */}
      <RecentActivities />

      {/* Loan Details Modal */}
      {showLoanDetails && (
        <LoanDetailsModal 
          stats={stats}
          onClose={() => setShowLoanDetails(false)}
        />
      )}
    </div>
  );
}