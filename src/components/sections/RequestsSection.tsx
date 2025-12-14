// RequestsSection.tsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { Request } from '@/src/types/dataEntry';
import { useRequests } from '@/src/hooks/useRequests';

interface RequestsSectionProps {
  refreshKey?: number;
  currentUserOffice?: string;
  currentOperatorId?: string;
  currentOperatorName?: string;
  onRefresh?: () => void;
}

// Extended Request interface to include the properties we need
interface ExtendedRequest extends Omit<Request, 'createdBy' | 'formattedDate'> {
  createdBy?: string;
  formattedDate?: string;
  submittedBy?: string;
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

// Request Details Component for dropdown
const RequestDetails = ({ request }: { request: ExtendedRequest }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderRequestData = () => {
    switch (request.type) {
      case 'New Customer':
        const step1Data = request.data?.step1Data || {};
        const step2Data = request.data?.step2Data || {};
        const step3Data = request.data?.step3Data || {};
        
        return (
          <div className="space-y-4">
            {/* Customer Details */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Customer Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-sm text-gray-600">Name:</span>
                  <p className="font-medium">{step1Data.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Customer Number:</span>
                  <p className="font-medium">{step1Data.customerNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Phone:</span>
                  <p className="font-medium">{(Array.isArray(step1Data.phone) ? step1Data.phone.join(', ') : step1Data.phone) || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">WhatsApp:</span>
                  <p className="font-medium">{step1Data.whatsappNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Business Name:</span>
                  <p className="font-medium">{step1Data.businessName || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Area:</span>
                  <p className="font-medium">{step1Data.area || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Address:</span>
                  <p className="font-medium">{step1Data.address || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Category:</span>
                  <p className="font-medium">{step1Data.category || 'A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Office:</span>
                  <p className="font-medium">{step1Data.officeCategory || 'Office 1'}</p>
                </div>
              </div>
            </div>

            {/* Loan Details */}
            {step2Data.loanSelectionType === 'single' && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Loan Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-sm text-gray-600">Loan Type:</span>
                    <p className="font-medium">{step2Data.loanType || 'Daily'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Loan Number:</span>
                    <p className="font-medium">{step2Data.loanNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Loan Amount:</span>
                    <p className="font-medium">₹{step2Data.loanAmount?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">EMI Amount:</span>
                    <p className="font-medium">₹{step2Data.emiAmount?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Loan Days:</span>
                    <p className="font-medium">{step2Data.loanDays || '0'} days</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">EMI Type:</span>
                    <p className="font-medium">{step2Data.emiType || 'fixed'}</p>
                  </div>
                  {step2Data.emiType === 'custom' && step2Data.customEmiAmount && (
                    <div>
                      <span className="text-sm text-gray-600">Custom EMI:</span>
                      <p className="font-medium">₹{step2Data.customEmiAmount?.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Login Details */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">Login Credentials</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <span className="text-sm text-gray-600">Login ID:</span>
                  <p className="font-medium">{step3Data.loginId || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Password:</span>
                  <p className="font-medium">••••••••</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'New Loan':
      case 'Loan Addition':
        return (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">Loan Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <span className="text-sm text-gray-600">Customer:</span>
                <p className="font-medium">{request.customerName}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Loan Number:</span>
                <p className="font-medium">{request.data?.loanNumber || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Loan Amount:</span>
                <p className="font-medium">₹{request.data?.loanAmount?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">EMI Amount:</span>
                <p className="font-medium">₹{request.data?.emiAmount?.toLocaleString() || '0'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Loan Type:</span>
                <p className="font-medium">{request.data?.loanType || 'Daily'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Loan Days:</span>
                <p className="font-medium">{request.data?.loanDays || '0'} days</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">EMI Type:</span>
                <p className="font-medium">{request.data?.emiType || 'fixed'}</p>
              </div>
              {request.data?.emiType === 'custom' && request.data?.customEmiAmount && (
                <div>
                      <span className="text-sm text-gray-600">Custom EMI:</span>
                      <p className="font-medium">₹{request.data?.customEmiAmount?.toLocaleString()}</p>
                    </div>
              )}
            </div>
          </div>
        );

      case 'Loan Edit':
      case 'Loan Renew':
        return (
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-800 mb-2">Loan Update Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Data */}
              <div>
                <h5 className="font-medium text-gray-700 mb-2">Original Data</h5>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Loan Amount: </span>
                    <span>₹{request.data?.originalData?.amount?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">EMI Amount: </span>
                    <span>₹{request.data?.originalData?.emiAmount?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Loan Type: </span>
                    <span>{request.data?.originalData?.loanType || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Loan Days: </span>
                    <span>{request.data?.originalData?.loanDays || 'N/A'} days</span>
                  </div>
                </div>
              </div>
              
              {/* Requested Changes */}
              <div>
                <h5 className="font-medium text-gray-700 mb-2">Requested Changes</h5>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">New Loan Amount: </span>
                    <span className="font-medium">₹{request.data?.loanAmount?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">New EMI Amount: </span>
                    <span className="font-medium">₹{request.data?.emiAmount?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">New Loan Type: </span>
                    <span className="font-medium">{request.data?.loanType || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">New Loan Days: </span>
                    <span className="font-medium">{request.data?.loanDays || 'N/A'} days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'Customer Edit':
        return (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Customer Update Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(request.data || {}).map(([key, value]) => (
                <div key={key}>
                  <span className="text-sm text-gray-600">{formatKey(key)}: </span>
                  <span className="font-medium">
                    {Array.isArray(value) ? value.join(', ') : String(value || 'N/A')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'Loan Deletion':
        return (
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="font-semibold text-red-800 mb-2">Loan Deletion Request</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-sm text-gray-600">Customer:</span>
                <p className="font-medium">{request.customerName}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Customer Number:</span>
                <p className="font-medium">{request.customerNumber}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Loan Number:</span>
                <p className="font-medium">{request.data?.loanNumber || 'N/A'}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Requested By:</span>
                <p className="font-medium">{request.data?.requestedBy || request.createdBy || 'N/A'}</p>
              </div>
            </div>
            {request.data?.remarks && (
              <div className="mt-3 p-3 bg-red-100 rounded">
                <span className="text-sm font-medium">Remarks:</span>
                <p className="text-sm mt-1">{request.data.remarks}</p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 mb-2">Request Data</h4>
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(request.data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <span className="font-medium text-gray-700">
          {isExpanded ? 'Hide Details' : 'View Request Details'}
        </span>
        <span className="transform transition-transform">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>
      
      {isExpanded && (
        <div className="mt-3 animate-fade-in">
          {renderRequestData()}
        </div>
      )}
    </div>
  );
};

// Helper function to format keys
const formatKey = (key: string): string => {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ');
};

// Helper function to format date
const formatDateToDDMMYYYY = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return dateString;
  }
};

// Main component
export default function RequestsSection({ 
  refreshKey, 
  currentUserOffice,
  currentOperatorId,
  currentOperatorName,
  onRefresh 
}: RequestsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    dateSort: 'newest'
  });
  const [selectedRequest, setSelectedRequest] = useState<ExtendedRequest | null>(null);

  const {
    requests: allRequests,
    loading,
    error,
    refetch
  } = useRequests(currentUserOffice, currentOperatorId);

  // Cast requests to ExtendedRequest type
  const extendedRequests = allRequests as ExtendedRequest[];

  // Auto-refresh when tab is switched to
  useEffect(() => {
    refetch();
  }, [refreshKey, refetch]);

  // Filter based on status
  const filteredRequests = extendedRequests.filter(request => {
    const matchesSearch = searchQuery === '' || 
      request.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.customerNumber && request.customerNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (request.data?.loanNumber && request.data.loanNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (request.type && request.type.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filters.type === '' || request.type === filters.type;
    const matchesStatus = filters.status === '' || 
      (request.status.toLowerCase() === filters.status.toLowerCase());
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (filters.dateSort === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
  });

  const handleManualRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
    refetch();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'in review':
        return 'bg-blue-100 text-blue-800';
      case 'on hold':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'New Customer':
        return 'bg-green-50 text-green-700';
      case 'Customer Edit':
        return 'bg-blue-50 text-blue-700';
      case 'New Loan':
      case 'Loan Addition':
        return 'bg-purple-50 text-purple-700';
      case 'Loan Edit':
        return 'bg-yellow-50 text-yellow-700';
      case 'Loan Renew':
        return 'bg-orange-50 text-orange-700';
      case 'Loan Deletion':
        return 'bg-red-50 text-red-700';
      case 'EMI Update':
        return 'bg-indigo-50 text-indigo-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'New Customer':
        return '👤';
      case 'Customer Edit':
        return '✏️';
      case 'New Loan':
      case 'Loan Addition':
        return '💰';
      case 'Loan Edit':
        return '📝';
      case 'Loan Renew':
        return '🔄';
      case 'Loan Deletion':
        return '🗑️';
      case 'EMI Update':
        return '💳';
      default:
        return '📄';
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
            <h2 className="text-2xl font-bold text-gray-900">My Requests</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review your submitted requests - Only shows requests created by you ({currentOperatorName || 'Current User'})
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Total Requests: {allRequests.length} | Pending: {allRequests.filter(r => r.status === 'Pending').length}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="text"
                placeholder="Search by customer, loan, or type..."
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
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Types</option>
                <option value="New Customer">New Customer</option>
                <option value="Customer Edit">Customer Edit</option>
                <option value="New Loan">New Loan</option>
                <option value="Loan Addition">Loan Addition</option>
                <option value="Loan Edit">Loan Edit</option>
                <option value="Loan Renew">Loan Renew</option>
                <option value="Loan Deletion">Loan Deletion</option>
                <option value="EMI Update">EMI Update</option>
                <option value="Other">Other</option>
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="In Review">In Review</option>
                <option value="On Hold">On Hold</option>
              </select>
              <select
                value={filters.dateSort}
                onChange={(e) => setFilters({ ...filters, dateSort: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <button
                onClick={handleManualRefresh}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {sortedRequests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="text-gray-400 text-5xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No requests found
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {allRequests.length === 0 
              ? `You haven't submitted any requests yet.`
              : 'No requests match your search criteria.'
            }
          </p>
          {currentOperatorName && (
            <p className="text-sm text-gray-400 mt-2">
              Showing only requests created by: {currentOperatorName}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedRequests.map((request) => (
            <div key={request._id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                          getTypeColor(request.type).replace('text-', 'bg-').replace('50', '100')
                        }`}>
                          <span className="text-lg">
                            {getTypeIcon(request.type)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        {/* Customer Number and Name */}
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Customer No:</span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-semibold">
                              {request.customerNumber || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">Customer:</span>
                            <span className="text-lg font-medium text-gray-900">
                              {request.customerName}
                            </span>
                          </div>
                        </div>
                        
                        {/* Status and Type */}
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getTypeColor(request.type)}`}>
                            {request.type}
                          </span>
                        </div>
                        
                        {/* Submitted Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                          <div>
                            <span className="font-medium">Submitted:</span> {request.formattedDate || formatDateToDDMMYYYY(request.createdAt)}
                          </div>
                          <div>
                            <span className="font-medium">Submitted By:</span> {request.createdBy || currentOperatorName || 'You'}
                          </div>
                          {request.data?.loanNumber && (
                            <div>
                              <span className="font-medium">Loan Number:</span> {request.data.loanNumber}
                            </div>
                          )}
                          {request.data?.loanAmount && (
                            <div>
                              <span className="font-medium">Loan Amount:</span> ₹{request.data.loanAmount?.toLocaleString() || '0'}
                            </div>
                          )}
                        </div>
                        
                        {request.description && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-700">{request.description}</p>
                          </div>
                        )}
                        
                        {/* Request Details Dropdown */}
                        <RequestDetails request={request} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Removed action buttons since data entry operators can only view */}
                  <div className="text-sm text-gray-500 italic">
                    Awaiting admin approval
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500 flex flex-col sm:flex-row justify-between items-center gap-2">
        <div>
          Showing {sortedRequests.length} of {allRequests.length} total requests
          {currentOperatorName && ` (created by ${currentOperatorName})`}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Pending: {allRequests.filter(r => r.status === 'Pending').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Approved: {allRequests.filter(r => r.status === 'Approved').length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Rejected: {allRequests.filter(r => r.status === 'Rejected').length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}