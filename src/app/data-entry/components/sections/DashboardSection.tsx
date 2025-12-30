'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { TodayStats, Request } from '@/src/app/data-entry/types/dataEntry';
import { useRequests } from '@/src/app/data-entry/hooks/useRequests';

interface DashboardSectionProps {
  currentUserOffice: string;
  onNavigateToTab: (tab: string) => void;
  onShowAddCustomer: () => void;
  onShowUpdateEMI: () => void;
}

interface RecentActivity {
  type: 'customer_added' | 'emi_paid' | 'loan_created' | 'other';
  description: string;
  time: string;
  customerName: string;
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

// Set display name for StatCard
StatCard.displayName = 'StatCard';

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

// Set display name for QuickActionButton
QuickActionButton.displayName = 'QuickActionButton';

const DashboardSection: React.FC<DashboardSectionProps> = React.memo(({
  currentUserOffice,
  onNavigateToTab,
  onShowAddCustomer,
  onShowUpdateEMI
}) => {
  // Use the requests hook
  const { requests, loading: requestsLoading, refetch: refetchRequests, statistics: requestsStats } = useRequests(currentUserOffice);
  
  const [isLoading, setIsLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<TodayStats>({
    emiCollected: 0,
    newCustomers: 0,
    pendingRequests: 0,
    totalCollection: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setApiErrors([]);
    
    console.log('🔄 Loading dashboard data for office:', currentUserOffice);
    
    try {
      // Fetch requests data
      await refetchRequests();
      
      // Fetch today's statistics - USING CORRECT API ENDPOINTS
      await updateTodayStats();
      
      // Fetch recent activity - USING CORRECT API ENDPOINT
      await fetchRecentActivity();
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setApiErrors(prev => [...prev, 'Failed to load dashboard data']);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserOffice, refetchRequests]);

  // Update today's statistics - FIXED API ENDPOINTS
  const updateTodayStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      console.log('📊 Fetching today stats for date:', today, 'office:', currentUserOffice);
      
      // Build URLs for the APIs we CREATED
      const emiUrl = `/api/data-entry/today-collection?date=${today}&office=${currentUserOffice}`;
      const customersUrl = `/api/data-entry/today-customers?date=${today}&office=${currentUserOffice}`;
      
      console.log('🔗 API URLs:', { emiUrl, customersUrl });
      
      // Fetch both APIs in parallel
      const [emiResponse, customersResponse] = await Promise.all([
        fetch(emiUrl),
        fetch(customersUrl)
      ]);
      
      console.log('📡 API Response Statuses:', {
        emi: emiResponse.status,
        customers: customersResponse.status
      });
      
      // Check for errors
      if (!emiResponse.ok) {
        throw new Error(`EMI API failed: ${emiResponse.status} ${emiResponse.statusText}`);
      }
      
      if (!customersResponse.ok) {
        throw new Error(`Customers API failed: ${customersResponse.status} ${customersResponse.statusText}`);
      }
      
      const emiData = await emiResponse.json();
      const customersData = await customersResponse.json();
      
      console.log('📦 API Data Received:', {
        emiTotal: emiData.total,
        customersCount: customersData.count,
        emiSuccess: emiData.success,
        customersSuccess: customersData.success
      });
      
      if (!emiData.success) {
        throw new Error(`EMI API error: ${emiData.error || 'Unknown error'}`);
      }
      
      if (!customersData.success) {
        throw new Error(`Customers API error: ${customersData.error || 'Unknown error'}`);
      }
      
      // Set the stats from API responses
      setTodayStats({
        emiCollected: emiData.total || 0,
        newCustomers: customersData.count || 0,
        pendingRequests: requestsStats?.pending || 0,
        totalCollection: emiData.total || 0
      });
      
      console.log('✅ Today stats updated:', {
        emiCollected: emiData.total,
        newCustomers: customersData.count,
        pendingRequests: requestsStats?.pending
      });
      
    } catch (error: any) {
      console.error('❌ Error updating today stats:', error);
      setApiErrors(prev => [...prev, `Today stats: ${error.message}`]);
      
      // Set zeros on error but keep pending requests
      setTodayStats({
        emiCollected: 0,
        newCustomers: 0,
        pendingRequests: requestsStats?.pending || 0,
        totalCollection: 0
      });
    }
  }, [currentUserOffice, requestsStats]);

  // Fetch recent activity - FIXED API ENDPOINT
  const fetchRecentActivity = useCallback(async () => {
    try {
      console.log('📈 Fetching recent activity for office:', currentUserOffice);
      
      const response = await fetch(`/api/data-entry/recent-activity?office=${currentUserOffice}&limit=5`);
      
      console.log('📡 Recent Activity API Status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Recent Activity API failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('📦 Recent Activity Data:', {
        success: data.success,
        activityCount: data.activities?.length || 0
      });
      
      if (data.success && data.activities) {
        // Map API response to your component's expected format
        const formattedActivities: RecentActivity[] = data.activities.map((activity: any) => ({
          type: activity.type === 'customer_added' ? 'customer_added' :
                activity.type === 'emi_paid' ? 'emi_paid' :
                activity.type === 'loan_created' ? 'loan_created' : 'other',
          description: activity.description || 'Activity',
          time: activity.time || 'Recently',
          customerName: activity.customerName || 'Customer'
        }));
        
        setRecentActivity(formattedActivities);
        console.log(`✅ Loaded ${formattedActivities.length} recent activities`);
      } else {
        console.warn('⚠️ No recent activities data or API failed');
        setRecentActivity([]);
      }
      
    } catch (error: any) {
      console.error('❌ Error fetching recent activity:', error);
      setApiErrors(prev => [...prev, `Recent activity: ${error.message}`]);
      setRecentActivity([]);
    }
  }, [currentUserOffice]);

  // Initial data load
  useEffect(() => {
    console.log('🚀 DashboardSection mounted, loading data...');
    loadDashboardData();
    
    // Set up auto-refresh every 2 minutes
    const intervalId = setInterval(() => {
      console.log('⏰ Auto-refreshing dashboard data...');
      loadDashboardData();
    }, 120000);
    
    return () => {
      console.log('🧹 Cleaning up dashboard interval');
      clearInterval(intervalId);
    };
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
    console.log('🔄 Manual dashboard refresh');
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

  // Filter only pending requests for display
  const pendingRequests = useMemo(() => {
    return requests.filter(request => request.status === 'pending' || request.status === 'Pending');
  }, [requests]);

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
          
          {/* Display API errors if any */}
          {apiErrors.length > 0 && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 font-medium">API Errors:</p>
              <ul className="text-xs text-red-500 list-disc list-inside">
                {apiErrors.slice(0, 3).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
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
              <p className="text-sm text-gray-500 mt-1">Activities will appear here</p>
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
          ) : pendingRequests && pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {pendingRequests.slice(0, 5).map((request: Request) => (
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
              
              {pendingRequests.length > 5 && (
                <button
                  onClick={handleViewRequests}
                  className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  View All Requests ({pendingRequests.length})
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
      
      {/* Debug Info - Remove in production */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <details className="text-sm">
          <summary className="font-medium text-gray-700 cursor-pointer">Debug Information</summary>
          <div className="mt-2 space-y-2 text-xs">
            <p><strong>Office:</strong> {currentUserOffice}</p>
            <p><strong>Today Stats:</strong> EMI: ₹{todayStats.emiCollected}, Customers: {todayStats.newCustomers}</p>
            <p><strong>API Errors:</strong> {apiErrors.length}</p>
            <p><strong>Recent Activities:</strong> {recentActivity.length}</p>
            <p><strong>Pending Requests:</strong> {pendingRequests.length}</p>
            <button 
              onClick={() => {
                console.log('📊 Full Dashboard State:', {
                  todayStats,
                  recentActivity,
                  apiErrors,
                  pendingRequests: pendingRequests.length
                });
                alert('Check browser console for full state');
              }}
              className="px-2 py-1 bg-gray-200 rounded text-xs"
            >
              Log Full State
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Improved memoization comparison
  return (
    prevProps.currentUserOffice === nextProps.currentUserOffice &&
    prevProps.onNavigateToTab === nextProps.onNavigateToTab &&
    prevProps.onShowAddCustomer === nextProps.onShowAddCustomer &&
    prevProps.onShowUpdateEMI === nextProps.onShowUpdateEMI
  );
});

// Set display name for DashboardSection
DashboardSection.displayName = 'DashboardSection';

export default DashboardSection;