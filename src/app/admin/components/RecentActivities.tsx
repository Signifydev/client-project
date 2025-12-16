'use client';

import { useState, useEffect } from 'react';

export default function RecentActivities() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [timeFilter, setTimeFilter] = useState('24h');

  const fetchActivities = async (filter = '24h', showAll = false) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/recent-activities?filter=${filter}&showAll=${showAll}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setActivities(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(timeFilter, showAllActivities);
  }, [timeFilter, showAllActivities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'customer': return '👤';
      case 'loan': return '💰';
      case 'emi': return '📊';
      case 'team': return '👥';
      case 'login': return '🔐';
      case 'approval': return '✅';
      case 'rejection': return '❌';
      default: return '📝';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'customer': return 'bg-blue-100 text-blue-800';
      case 'loan': return 'bg-green-100 text-green-800';
      case 'emi': return 'bg-purple-100 text-purple-800';
      case 'team': return 'bg-orange-100 text-orange-800';
      case 'login': return 'bg-gray-100 text-gray-800';
      case 'approval': return 'bg-green-100 text-green-800';
      case 'rejection': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityDate = new Date(timestamp);
    const diff = now.getTime() - activityDate.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const handleTimeFilterChange = (filter: string) => {
    setTimeFilter(filter);
  };

  const handleViewAllClick = () => {
    setShowAllActivities(true);
  };

  const handleBackToRecent = () => {
    setShowAllActivities(false);
    setTimeFilter('24h');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {showAllActivities ? 'All Activities' : 'Recent Activities'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {showAllActivities 
                ? 'Complete activity log from all team members' 
                : 'Latest actions from all team members'
              }
            </p>
          </div>
          
          {showAllActivities && (
            <button 
              onClick={handleBackToRecent}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Recent
            </button>
          )}
        </div>

        {/* Time Filter */}
        {showAllActivities && (
          <div className="flex space-x-2 mt-4">
            {[
              { value: '24h', label: '24 Hours' },
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
              { value: 'all', label: 'All Time' }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleTimeFilterChange(filter.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium ${
                  timeFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-6">
        {loading ? (
          <div className="text-center py-4">
            <div className="text-gray-400 text-2xl mb-2">⏳</div>
            <p className="text-gray-600">Loading activities...</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activities.map((activity) => (
              <div key={activity._id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm">
                  <span className={getActivityIcon(activity.type)}></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.userName || activity.user}</span> {activity.action}{' '}
                      {activity.target && (
                        <span className="font-medium text-blue-600">{activity.target}</span>
                      )}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActivityColor(activity.type)}`}>
                      {activity.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {activity.role && `Role: ${activity.role} • `}
                      {getTimeAgo(activity.timestamp)}
                    </p>
                    {activity.details && (
                      <p className="text-xs text-gray-400">{activity.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {activities.length === 0 && (
              <div className="text-center py-4">
                <div className="text-gray-400 text-2xl mb-2">📝</div>
                <p className="text-gray-600">No activities found</p>
                <p className="text-sm text-gray-500 mt-1">Activities will appear here when team members perform actions.</p>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 flex justify-between items-center">
          {!showAllActivities && (
            <button 
              onClick={handleViewAllClick}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All Activities →
            </button>
          )}
          
          <button 
            onClick={() => fetchActivities(timeFilter, showAllActivities)}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}