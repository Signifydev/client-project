import React, { useState, useEffect } from 'react';
import { Request } from '@/src/types/dataEntry';
import { useRequests } from '@/src/hooks/useRequests';
import { requestTypes } from '@/src/utils/constants';
import { formatDateToDDMMYYYY } from '@/src/utils/dateCalculations';

interface RequestsSectionProps {
  refreshKey?: number;
}

// Inline Error Display Component
const ErrorDisplay = ({ message }: { message: string }) => (
  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <span className="text-red-400 text-lg">⚠️</span>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-red-800">Error</h3>
        <p className="text-sm text-red-700 mt-1">{message}</p>
      </div>
    </div>
  </div>
);

// Inline Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

export default function RequestsSection({ refreshKey }: RequestsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    dateSort: 'newest'
  });
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

  const {
    requests: allRequests,
    loading,
    error,
    refetch
  } = useRequests();

  useEffect(() => {
    refetch();
  }, [refreshKey, refetch]);

  // Filter to show only pending requests initially
  const pendingRequests = allRequests.filter(request => 
    request.status === 'Pending' || request.status === 'pending'
  );

  const filteredRequests = pendingRequests.filter(request => {
    const matchesSearch = searchQuery === '' || 
      request.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.customerNumber && request.customerNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filters.type === '' || request.type === filters.type;
    const matchesStatus = filters.status === '' || 
      (request.status === filters.status || 
       (filters.status === 'Pending' && (request.status === 'Pending' || request.status === 'pending')));
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (filters.dateSort === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
  });

  const handleStatusUpdate = async (requestId: string, status: 'Approved' | 'Rejected') => {
    try {
      const response = await fetch(`/api/data-entry/requests/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          action: status.toLowerCase(),
          status
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update request status');
      }

      const result = await response.json();
      
      if (result.success) {
        alert(`Request ${status.toLowerCase()} successfully!`);
        refetch();
      } else {
        throw new Error(result.error || 'Failed to update request');
      }
    } catch (error: any) {
      console.error('Error updating request:', error);
      alert('Error updating request: ' + error.message);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error.message || 'Failed to load requests'} />;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pending Requests</h2>
            <p className="text-sm text-gray-600 mt-1">
              Customer requests waiting for admin approval
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="Search by customer name or number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Types</option>
                {requestTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <select
                value={filters.dateSort}
                onChange={(e) => setFilters({ ...filters, dateSort: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {sortedRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-gray-400 text-5xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No pending requests
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {pendingRequests.length === 0 
              ? 'All customer requests have been processed.'
              : 'No requests match your search criteria.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedRequests.map((request) => (
            <div key={request._id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                          request.type === 'New Customer' ? 'bg-green-100' :
                          request.type === 'Loan Edit' ? 'bg-blue-100' :
                          request.type === 'Loan Renewal' ? 'bg-yellow-100' :
                          'bg-purple-100'
                        }`}>
                          <span className={`text-lg ${
                            request.type === 'New Customer' ? 'text-green-600' :
                            request.type === 'Loan Edit' ? 'text-blue-600' :
                            request.type === 'Loan Renewal' ? 'text-yellow-600' :
                            'text-purple-600'
                          }`}>
                            {request.type === 'New Customer' ? '👤' :
                             request.type === 'Loan Edit' ? '✏️' :
                             request.type === 'Loan Renewal' ? '🔄' : '💰'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {request.customerName}
                          </h3>
                          {request.customerNumber && (
                            <span className="text-sm px-2 py-1 bg-gray-100 rounded">
                              {request.customerNumber}
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            request.status === 'Pending' || request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.status}
                          </span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            request.type === 'New Customer' ? 'bg-green-50 text-green-700' :
                            request.type === 'Loan Edit' ? 'bg-blue-50 text-blue-700' :
                            'bg-yellow-50 text-yellow-700'
                          }`}>
                            {request.type}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          {request.data?.loanAmount && (
                            <div>
                              <span className="font-medium">Loan Amount:</span> ₹{request.data.loanAmount.toLocaleString()}
                            </div>
                          )}
                          {request.data?.emiAmount && (
                            <div>
                              <span className="font-medium">EMI Amount:</span> ₹{request.data.emiAmount.toLocaleString()}
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Submitted:</span> {formatDateToDDMMYYYY(request.createdAt)}
                          </div>
                        </div>
                        
                        {request.description && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-700">{request.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {(request.status === 'Pending' || request.status === 'pending') && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleStatusUpdate(request._id, 'Approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(request._id, 'Rejected')}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500">
        Showing {sortedRequests.length} of {pendingRequests.length} pending requests
        {allRequests.length > pendingRequests.length && 
          ` (${allRequests.length - pendingRequests.length} processed)`
        }
      </div>
    </div>
  );
}