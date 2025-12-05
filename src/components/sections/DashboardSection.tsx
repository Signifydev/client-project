'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { TodayStats } from '@/src/types/dataEntry';
import { useRequests } from '@/src/hooks/useRequests';

interface DashboardSectionProps {
  currentUserOffice: string;
  onNavigateToTab: (tab: string) => void;
  onShowAddCustomer: () => void;
  onShowUpdateEMI: () => void;
}

// Dashboard Statistics Card Component
const StatCard: React.FC<{
  title: string;
  value: number | string;
  color: string;
  icon: string;
  onClick?: () => void;
}> = React.memo(({ title, value, color, icon, onClick }) => (
  <div 
    className={`bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow duration-200 ${onClick ? 'hover:scale-[1.02] transition-transform duration-200' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className={`text-2xl font-bold mt-2 ${color}`}>{value}</p>
      </div>
      <div className="text-3xl">{icon}</div>
    </div>
  </div>
));

// Quick Action Button Component
const QuickActionButton: React.FC<{
  icon: string;
  label: string;
  description: string;
  color: string;
  onClick: () => void;
}> = React.memo(({ icon, label, description, color, onClick }) => (
  <button
    onClick={onClick}
    className={`${color} text-white p-4 rounded-lg shadow hover:shadow-lg transition-all duration-200 flex flex-col items-center text-center w-full`}
  >
    <div className="text-2xl mb-2">{icon}</div>
    <div className="font-medium">{label}</div>
    <div className="text-sm opacity-90 mt-1">{description}</div>
  </button>
));

const DashboardSection: React.FC<DashboardSectionProps> = React.memo(({
  currentUserOffice,
  onNavigateToTab,
  onShowAddCustomer,
  onShowUpdateEMI
}) => {
  // Use the requests hook - this provides refetch, not fetchRequests
  const { requests, loading: requestsLoading, refetch: refetchRequests, statistics: requestsStats } = useRequests(currentUserOffice);
  
  const [isLoading, setIsLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<TodayStats>({
    emiCollected: 0,
    newCustomers: 0,
    pendingRequests: 0,
    totalCollection: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch requests data
      await refetchRequests();
      
      // Fetch today's statistics
      await updateTodayStats();
      
      // Fetch recent activity
      await fetchRecentActivity();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserOffice, refetchRequests]);

  // Update today's statistics
  const updateTodayStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch EMI collection for today
      const emiResponse = await fetch(`/api/data-entry/today-collection?date=${today}&office=${currentUserOffice}`);
      const emiData = await emiResponse.json();
      
      // Fetch new customers for today
      const customersResponse = await fetch(`/api/data-entry/today-customers?date=${today}&office=${currentUserOffice}`);
      const customersData = await customersResponse.json();
      
      setTodayStats({
        emiCollected: emiData.total || 0,
        newCustomers: customersData.count || 0,
        pendingRequests: requestsStats?.pending || 0,
        totalCollection: emiData.total || 0
      });
    } catch (error) {
      console.error('Error updating today stats:', error);
    }
  }, [currentUserOffice, requestsStats]);

  // Fetch recent activity
  const fetchRecentActivity = useCallback(async () => {
    try {
      const response = await fetch(`/api/data-entry/recent-activity?office=${currentUserOffice}&limit=5`);
      const data = await response.json();
      
      if (data.success) {
        setRecentActivity(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    }
  }, [currentUserOffice]);

  // Initial data load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Memoized handlers
  const handleViewCustomers = useCallback(() => {
    onNavigateToTab('customers');
  }, [onNavigateToTab]);

  const handleViewEMI = useCallback(() => {
    onNavigateToTab('emi');
  }, [onNavigateToTab]);

  const handleViewRequests = useCallback(() => {
    onNavigateToTab('requests');
  }, [onNavigateToTab]);

  const handleViewCollection = useCallback(() => {
    onNavigateToTab('collection');
  }, [onNavigateToTab]);

  const handleRefreshDashboard = useCallback(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Memoized statistics cards data
  const statCards = useMemo(() => [
    {
      title: 'EMI Collected Today',
      value: `₹${todayStats.emiCollected.toLocaleString()}`,
      color: 'text-green-600',
      icon: '💰',
      onClick: handleViewCollection
    },
    {
      title: 'New Customers Today',
      value: todayStats.newCustomers.toString(),
      color: 'text-blue-600',
      icon: '👥',
      onClick: handleViewCustomers
    },
    {
      title: 'Pending Requests',
      value: todayStats.pendingRequests.toString(),
      color: 'text-orange-600',
      icon: '📋',
      onClick: handleViewRequests
    },
    {
      title: 'Total Collection',
      value: `₹${todayStats.totalCollection.toLocaleString()}`,
      color: 'text-purple-600',
      icon: '📊',
      onClick: handleViewCollection
    }
  ], [todayStats, handleViewCollection, handleViewCustomers, handleViewRequests]);

  // Memoized quick actions
  const quickActions = useMemo(() => [
    {
      icon: '➕',
      label: 'Add Customer',
      description: 'Register new customer',
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: onShowAddCustomer
    },
    {
      icon: '💳',
      label: 'Record EMI',
      description: 'Update payment status',
      color: 'bg-green-500 hover:bg-green-600',
      onClick: onShowUpdateEMI
    },
    {
      icon: '👁️',
      label: 'View Customers',
      description: 'Browse all customers',
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: handleViewCustomers
    },
    {
      icon: '📅',
      label: 'EMI Calendar',
      description: 'View payment schedule',
      color: 'bg-orange-500 hover:bg-orange-600',
      onClick: handleViewEMI
    }
  ], [onShowAddCustomer, onShowUpdateEMI, handleViewCustomers, handleViewEMI]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-section">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-gray-600">Welcome to your data entry dashboard</p>
        </div>
        <button
          onClick={handleRefreshDashboard}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <StatCard
            key={index}
            title={card.title}
            value={card.value}
            color={card.color}
            icon={card.icon}
            onClick={card.onClick}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <QuickActionButton
              key={index}
              icon={action.icon}
              label={action.label}
              description={action.description}
              color={action.color}
              onClick={action.onClick}
            />
          ))}
        </div>
      </div>

      {/* Recent Activity & Pending Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded transition-colors duration-200">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'customer_added' ? 'bg-green-100 text-green-600' :
                      activity.type === 'emi_paid' ? 'bg-blue-100 text-blue-600' :
                      activity.type === 'loan_created' ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {activity.type === 'customer_added' ? '👤' :
                       activity.type === 'emi_paid' ? '💰' :
                       activity.type === 'loan_created' ? '📝' : '📌'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{activity.description}</p>
                      <p className="text-sm text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{activity.customerName}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-gray-600">No recent activity</p>
            </div>
          )}
        </div>

        {/* Pending Requests */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Pending Requests</h3>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
              {requestsStats?.pending || 0} pending
            </span>
          </div>
          
          {requestsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-600">Loading requests...</p>
            </div>
          ) : requests && requests.length > 0 ? (
            <div className="space-y-4">
              {requests.slice(0, 5).map((request) => (
                <div key={request._id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{request.customerName || 'Unnamed Customer'}</p>
                      <p className="text-sm text-gray-500">{request.type}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{request.description || 'No description provided'}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(request.createdAt).toLocaleDateString()} • {request.customerNumber || 'No customer number'}
                  </p>
                </div>
              ))}
              
              {requests.length > 5 && (
                <button
                  onClick={handleViewRequests}
                  className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  View All Requests ({requests.length})
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-gray-600">No pending requests</p>
              <p className="text-sm text-gray-500 mt-1">You're all caught up!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Memoize the entire section
  return (
    prevProps.currentUserOffice === nextProps.currentUserOffice
  );
});

export default DashboardSection;