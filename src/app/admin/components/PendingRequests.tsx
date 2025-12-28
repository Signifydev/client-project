'use client';

import { useState, useEffect } from 'react';
import { PendingRequest } from '../types';
import Image from 'next/image';

interface PendingRequestsProps {
  requests: PendingRequest[];
  onApprove: (request: any) => void;
  onReject: (request: any) => void;
  onBack: () => void;
}

// Request types from your model
const REQUEST_TYPES = [
  'New Customer',
  'New Loan',
  'Customer Edit',
  'Loan Edit',
  'Loan Renew',
  'Loan Addition',
  'Loan Deletion',
  'EMI Update',
  'EMI Correction',
  'Document Update',
  'Status Change',
  'Other'
] as const;

type RequestType = typeof REQUEST_TYPES[number];

// Helper function to get request type label
const getRequestTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    'New Customer': 'New Customer',
    'New Loan': 'New Loan',
    'Customer Edit': 'Customer Edit',
    'Loan Edit': 'Loan Edit',
    'Loan Renew': 'Loan Renew',
    'Loan Addition': 'Loan Addition',
    'Loan Deletion': 'Loan Deletion',
    'EMI Update': 'EMI Update',
    'EMI Correction': 'EMI Correction',
    'Document Update': 'Document Update',
    'Status Change': 'Status Change',
    'Other': 'Other'
  };
  return typeMap[type] || type;
};

// Helper function to get request type color
const getRequestTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    'New Customer': 'bg-blue-100 text-blue-800',
    'New Loan': 'bg-green-100 text-green-800',
    'Customer Edit': 'bg-purple-100 text-purple-800',
    'Loan Edit': 'bg-yellow-100 text-yellow-800',
    'Loan Renew': 'bg-indigo-100 text-indigo-800',
    'Loan Addition': 'bg-emerald-100 text-emerald-800',
    'Loan Deletion': 'bg-red-100 text-red-800',
    'EMI Update': 'bg-teal-100 text-teal-800',
    'EMI Correction': 'bg-orange-100 text-orange-800',
    'Document Update': 'bg-cyan-100 text-cyan-800',
    'Status Change': 'bg-pink-100 text-pink-800',
    'Other': 'bg-gray-100 text-gray-800'
  };
  return colorMap[type] || 'bg-gray-100 text-gray-800';
};

// Helper function to get request type icon
const getRequestTypeIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    'New Customer': '👤',
    'New Loan': '💰',
    'Customer Edit': '✏️',
    'Loan Edit': '📝',
    'Loan Renew': '🔄',
    'Loan Addition': '➕',
    'Loan Deletion': '🗑️',
    'EMI Update': '📊',
    'EMI Correction': '⚡',
    'Document Update': '📄',
    'Status Change': '🔄',
    'Other': '📋'
  };
  return iconMap[type] || '📋';
};

// Helper function to format date
const formatDateTime = (dateString: string): string => {
  if (!dateString) return 'N/A';
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

// Helper function to extract operator info
const getOperatorInfo = (createdBy: string) => {
  if (!createdBy) return { number: 'N/A', name: 'Unknown Operator' };
  
  // Assuming format could be: "OP001 - John Doe" or just operator ID
  const parts = createdBy.split(' - ');
  if (parts.length === 2) {
    return { 
      number: parts[0].trim(), 
      name: parts[1].trim() 
    };
  }
  // If just operator ID, use as number
  return { 
    number: createdBy, 
    name: `Operator ${createdBy}`
  };
};

export default function PendingRequests({ 
  requests, 
  onApprove, 
  onReject, 
  onBack 
}: PendingRequestsProps) {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [filters, setFilters] = useState({
    requestType: '',
    status: '',
    operator: '',
    sortBy: 'newest'
  });

  const handleViewEdit = (request: any) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsViewModalOpen(false);
    setSelectedRequest(null);
  };

  const handleApproveFromModal = () => {
    if (selectedRequest) {
      onApprove(selectedRequest);
      handleCloseModal();
    }
  };

  const handleRejectFromModal = () => {
    if (selectedRequest) {
      onReject(selectedRequest);
      handleCloseModal();
    }
  };

  // Get all unique request types from actual data
  const allRequestTypes = [...new Set(requests.map(r => r.type))];
  
  const filteredAndSortedRequests = requests
    .filter(request => {
      const matchesType = !filters.requestType || request.type === filters.requestType;
      const matchesStatus = !filters.status || request.status === filters.status;
      const matchesOperator = !filters.operator || request.createdBy === filters.operator;
      return matchesType && matchesStatus && matchesOperator;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });

  const requestTypes = [...new Set(requests.map(r => r.type))];
  const operators = [...new Set(requests.map(r => r.createdBy).filter(Boolean))];

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      requestType: '',
      status: '',
      operator: '',
      sortBy: 'newest'
    });
  };

  const formatFieldName = (field: string) => {
    return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const renderFieldValue = (label: string, value: any) => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }
    
    // Handle objects (like documents)
    if (typeof value === 'object' && value !== null) {
      // If it's an array, handle each item
      if (Array.isArray(value)) {
        return (
          <div className="space-y-1">
            {value.map((item, index) => {
              if (typeof item === 'object' && item !== null) {
                // Handle document objects
                if (item.url || item.filename) {
                  return (
                    <div key={index} className="flex items-center space-x-1">
                      <span>📄</span>
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                      >
                        {item.displayName || item.originalName || item.filename || 'Document'}
                      </a>
                    </div>
                  );
                }
                // For other objects, show as JSON string
                return <span key={index} className="text-sm text-gray-600">{JSON.stringify(item)}</span>;
              }
              // For non-object items
              return <span key={index} className="text-sm">{String(item)}</span>;
            })}
          </div>
        );
      }
      
      // Handle single object (like profilePicture)
      if (value.url || value.filename) {
        return (
          <div className="flex items-center space-x-1">
            <span>📄</span>
            <a 
              href={value.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-sm"
            >
              {value.displayName || value.originalName || value.filename || 'Document'}
            </a>
          </div>
        );
      }
      
      // For other single objects, show as JSON string
      return <span className="text-sm text-gray-600">{JSON.stringify(value)}</span>;
    }
    
    if (label.toLowerCase().includes('amount')) {
      return `₹${Number(value).toLocaleString()}`;
    }
    
    if (label.toLowerCase().includes('date') && !isNaN(Date.parse(value))) {
      return new Date(value).toLocaleDateString();
    }
    
    return String(value);
  };

  const getCustomerDetails = (request: any) => {
    // For New Customer requests, data is in step1Data, step2Data, step3Data
    if (request.type === 'New Customer') {
      return {
        ...request.step1Data,
        ...request.step2Data,
        ...request.step3Data
      };
    }
    
    // For other requests, use requestedData or currentData
    return {
      ...request.requestedData,
      ...request.currentData,
      ...request
    };
  };

  const renderCustomerDetails = (request: any) => {
    const customerData = getCustomerDetails(request);
    const operatorInfo = getOperatorInfo(request.createdBy);
    
    // Basic Customer Information
    const basicInfoFields = [
      { 
        label: 'Customer Name', 
        value: customerData.name || request.customerName || 'N/A'
      },
      { 
        label: 'Customer Number', 
        value: customerData.customerNumber || request.customerNumber || 'N/A'
      },
      { 
        label: 'Primary Phone', 
        value: (() => {
          const phoneValue = customerData.phone || request.customerPhone;
          if (Array.isArray(phoneValue)) {
            return phoneValue[0] || 'N/A';
          } else if (typeof phoneValue === 'object') {
            // Handle if phone is somehow an object
            return phoneValue.toString ? phoneValue.toString() : 'N/A';
          }
          return phoneValue || 'N/A';
        })()
      },
      { 
        label: 'Secondary Phone', 
        value: Array.isArray(customerData.phone) && customerData.phone[1] 
          ? customerData.phone[1]
          : customerData.secondaryPhone || 'N/A'
      },
      { 
        label: 'WhatsApp Number', 
        value: customerData.whatsappNumber || 'N/A'
      },
      { 
        label: 'Business Name', 
        value: customerData.businessName || request.businessName || 'N/A'
      },
      { 
        label: 'Area/Location', 
        value: customerData.area || request.area || 'N/A'
      },
      { 
        label: 'Address', 
        value: customerData.address || request.address || 'N/A'
      },
      { 
        label: 'Category', 
        value: customerData.category || 'N/A'
      },
      { 
        label: 'Office Category', 
        value: customerData.officeCategory || 'N/A'
      }
    ];

    // Determine if request is loan-related
    const isLoanRequest = [
      'New Loan', 
      'Loan Edit', 
      'Loan Renew', 
      'Loan Addition', 
      'Loan Deletion',
      'EMI Update',
      'EMI Correction'
    ].includes(request.type);

    // Determine if request is New Customer
    const isNewCustomerRequest = request.type === 'New Customer';

    // Loan Information (if applicable)
    const loanInfoFields = [];
    
    if (isLoanRequest || isNewCustomerRequest) {
      loanInfoFields.push(
        { label: 'Loan Amount', value: customerData.loanAmount || request.loanAmount || 'N/A' },
        { label: 'Loan Type', value: customerData.loanType || request.loanType || 'N/A' },
        { label: 'EMI Amount', value: customerData.emiAmount || request.emiAmount || 'N/A' },
        { label: 'Loan Duration', value: customerData.loanDays ? `${customerData.loanDays} days` : 'N/A' },
        { label: 'Loan Date', value: customerData.loanDate || request.loanDate || 'N/A' },
        { label: 'EMI Start Date', value: customerData.emiStartDate || 'N/A' },
        { label: 'Loan Number', value: customerData.loanNumber || request.loanNumber || 'N/A' }
      );
    }

    // For multiple loans in New Customer request
    const multipleLoans = customerData.multipleLoans || [];
    const loanSelectionType = customerData.loanSelectionType || 'single';

    return (
      <div className="space-y-6">
        {/* Request Information Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{getRequestTypeIcon(request.type)}</span>
                <h3 className="text-xl font-bold text-gray-900">Request Details</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRequestTypeColor(request.type)}`}>
                  {getRequestTypeLabel(request.type)}
                </span>
                <span className="text-gray-600 text-sm">ID: {request._id?.substring(0, 8)}...</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Created At</div>
              <div className="font-semibold text-gray-900">{formatDateTime(request.createdAt)}</div>
            </div>
          </div>
          
          {/* Operator Info */}
          <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-gray-600 font-semibold">{operatorInfo.number?.substring(0, 2) || 'OP'}</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">Created By</div>
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">{operatorInfo.number}</span>
                  <span className="mx-2">-</span>
                  <span>{operatorInfo.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Request Description */}
          {request.description && (
            <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
              <div className="text-sm text-gray-600">Description:</div>
              <div className="font-medium text-gray-900 mt-1">{request.description}</div>
            </div>
          )}
        </div>

        {/* Basic Customer Information */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">Basic Customer Information</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {basicInfoFields.map((field, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">{field.label}</p>
                  <p className="text-base font-semibold text-gray-900">
                    {renderFieldValue(field.label, field.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loan Information - Show for loan-related and New Customer requests */}
        {(isLoanRequest || isNewCustomerRequest) && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isNewCustomerRequest ? 'Loan Setup Information' : 'Loan Information'}
                </h3>
                <span className="text-sm text-gray-600">
                  {loanSelectionType === 'multiple' ? 'Multiple Loans' : 'Single Loan'}
                </span>
              </div>
            </div>
            <div className="p-6">
              {/* Main Loan Information */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-700 mb-3">Loan Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loanInfoFields.map((field, index) => (
                    <div key={index} className="space-y-1">
                      <p className="text-sm font-medium text-gray-600">{field.label}</p>
                      <p className={`text-base font-semibold ${
                        field.label.includes('Amount') ? 'text-green-600' : 'text-gray-900'
                      }`}>
                        {renderFieldValue(field.label, field.value)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Custom EMI Information for New Customer */}
                {isNewCustomerRequest && customerData.emiType === 'custom' && customerData.loanType !== 'Daily' && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-yellow-600 mr-2">⚠️</span>
                      <div>
                        <div className="text-sm font-medium text-yellow-800">Custom EMI Configuration</div>
                        <div className="text-sm text-yellow-700">
                          Custom EMI Amount: ₹{customerData.customEmiAmount?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Loans for New Customer with multiple loans */}
              {isNewCustomerRequest && loanSelectionType === 'multiple' && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-700 mb-3">Multiple Loans Setup</h4>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-blue-600 mr-2">ℹ️</span>
                      <div>
                        <div className="font-medium text-gray-900">Multiple Loans Selected</div>
                        <div className="text-sm text-gray-600">
                          Additional loans can be added after customer approval. Total loan amount: 
                          <span className="font-semibold ml-1">
                            ₹{(customerData.totalLoanAmount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Document Information */}
        {customerData.profilePicture || customerData.fiDocuments && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-purple-50">
              <h3 className="text-lg font-semibold text-gray-900">Document Information</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Picture */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600">Profile Picture</p>
                  <div className="flex items-center space-x-3">
                    {customerData.profilePicture?.url ? (
                      <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-300">
                        <img 
                          src={customerData.profilePicture.url} 
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : customerData.hasProfilePicture ? (
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-300">
                        <span className="text-blue-600 font-semibold">📷</span>
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border-2 border-gray-300">
                        <span className="text-gray-400">No Image</span>
                      </div>
                    )}
                    <div>
                      <p className={`text-sm font-medium ${
                        customerData.profilePicture?.url || customerData.hasProfilePicture 
                          ? 'text-green-600' 
                          : 'text-gray-500'
                      }`}>
                        {customerData.profilePicture?.url || customerData.hasProfilePicture 
                          ? 'Uploaded' 
                          : 'Not Uploaded'}
                      </p>
                      {customerData.profilePicture?.displayName && (
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">
                          {customerData.profilePicture.displayName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* FI Documents */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-600">FI Documents</p>
                  <div className="space-y-2">
                    {/* Shop FI Document */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Shop FI Document</span>
                      <div>
                        {customerData.fiDocuments?.shop ? (
                          typeof customerData.fiDocuments.shop === 'object' ? (
                            <a 
                              href={customerData.fiDocuments.shop.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-sm"
                            >
                              {customerData.fiDocuments.shop.displayName || 'View Document'}
                            </a>
                          ) : (
                            <a 
                              href={customerData.fiDocuments.shop} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-sm"
                            >
                              View Document
                            </a>
                          )
                        ) : customerData.hasFiDocuments?.shop ? (
                          <span className="text-green-600 text-sm">Uploaded</span>
                        ) : (
                          <span className="text-gray-500 text-sm">Not Uploaded</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Home FI Document */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Home FI Document</span>
                      <div>
                        {customerData.fiDocuments?.home ? (
                          typeof customerData.fiDocuments.home === 'object' ? (
                            <a 
                              href={customerData.fiDocuments.home.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-sm"
                            >
                              {customerData.fiDocuments.home.displayName || 'View Document'}
                            </a>
                          ) : (
                            <a 
                              href={customerData.fiDocuments.home} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-sm"
                            >
                              View Document
                            </a>
                          )
                        ) : customerData.hasFiDocuments?.home ? (
                          <span className="text-green-600 text-sm">Uploaded</span>
                        ) : (
                          <span className="text-gray-500 text-sm">Not Uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Login Credentials for New Customer */}
        {isNewCustomerRequest && customerData.loginId && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
              <h3 className="text-lg font-semibold text-gray-900">Login Credentials</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Login ID</p>
                  <p className="text-base font-semibold text-gray-900">{customerData.loginId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Password</p>
                  <p className="text-base font-semibold text-gray-900">••••••••</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Requested Changes for Edit Requests */}
        {request.type === 'Customer Edit' && request.requestedData && (
          <div className="bg-white border border-yellow-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-yellow-200 bg-yellow-50">
              <h3 className="text-lg font-semibold text-yellow-900">Requested Changes</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(request.requestedData).map(([field, newValue]: [string, any]) => (
                  <div key={field} className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-700">{formatFieldName(field)}</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Changed
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Original Value</p>
                        <div className="p-2 bg-gray-50 border border-gray-200 rounded text-gray-700">
                          {renderFieldValue(field, request.currentData?.[field])}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Requested Change</p>
                        <div className="p-2 bg-green-50 border border-green-200 rounded text-green-700 font-semibold">
                          {renderFieldValue(field, newValue)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
          >
            <span className="text-gray-600">← Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pending Requests</h1>
            <p className="text-gray-600">Review and process customer requests</p>
          </div>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          {filteredAndSortedRequests.length} Pending
        </span>
      </div>

      {/* Filters Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Request Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.requestType}
                onChange={(e) => handleFilterChange('requestType', e.target.value)}
              >
                <option value="">All Types</option>
                {REQUEST_TYPES.map(type => (
                  <option key={type} value={type}>
                    {getRequestTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Review">In Review</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>

            {/* Operator Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operator
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.operator}
                onChange={(e) => handleFilterChange('operator', e.target.value)}
              >
                <option value="">All Operators</option>
                {operators.map(operator => {
                  const operatorInfo = getOperatorInfo(operator);
                  return (
                    <option key={operator} value={operator}>
                      {operatorInfo.number} - {operatorInfo.name}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Sort By Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By Date
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.requestType || filters.status || filters.operator || filters.sortBy !== 'newest') && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Active filters:</span>
                {filters.requestType && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getRequestTypeColor(filters.requestType)}`}>
                    {getRequestTypeLabel(filters.requestType)}
                    <button 
                      onClick={() => handleFilterChange('requestType', '')}
                      className="ml-1 hover:opacity-75"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    Status: {filters.status}
                    <button 
                      onClick={() => handleFilterChange('status', '')}
                      className="ml-1 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.operator && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    {getOperatorInfo(filters.operator).number}
                    <button 
                      onClick={() => handleFilterChange('operator', '')}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.sortBy !== 'newest' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                    Sort: {filters.sortBy === 'oldest' ? 'Oldest First' : 'Newest First'}
                    <button 
                      onClick={() => handleFilterChange('sortBy', 'newest')}
                      className="ml-1 text-orange-600 hover:text-orange-800"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6">
          <div className="space-y-4">
            {filteredAndSortedRequests.map((request) => {
              const operatorInfo = getOperatorInfo(request.createdBy);
              const customerData = getCustomerDetails(request);
              
              return (
                <div key={request._id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-start space-x-4">
                      {/* Profile Picture */}
                      <div className="flex-shrink-0">
                        <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-gray-200">
                          {customerData.profilePicture?.url ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <img 
                                src={customerData.profilePicture.url} 
                                alt={request.customerName || 'Customer'}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${
                              getRequestTypeColor(request.type).replace('text-', 'bg-').replace('800', '100')
                            }`}>
                              <span className={`text-xl font-semibold ${
                                getRequestTypeColor(request.type)
                              }`}>
                                {(request.customerName?.charAt(0) || 'C').toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        {/* Customer Name and Number */}
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="text-lg font-bold text-gray-900">
                            {request.customerName || customerData.name || 'Unknown Customer'}
                          </h4>
                          <span className="text-sm font-semibold text-gray-600">
                            #{request.customerNumber || customerData.customerNumber || 'N/A'}
                          </span>
                        </div>
                        
                        {/* Request Type with Icon */}
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm">{getRequestTypeIcon(request.type)}</span>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRequestTypeColor(request.type)}`}>
                            {getRequestTypeLabel(request.type)}
                          </span>
                        </div>
                        
                        {/* Created At and Created By */}
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">Created At:</span>
                            <span>{formatDateTime(request.createdAt)}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium mr-2">Created By:</span>
                            <span className="font-semibold text-gray-800">{operatorInfo.number}</span>
                            <span className="mx-2 text-gray-400">-</span>
                            <span className="text-gray-700">{operatorInfo.name}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 ml-4">
                    <button 
                      onClick={() => handleViewEdit(request)}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        getRequestTypeColor(request.type).replace('bg-', 'bg-').replace('text-', 'text-white').replace('100', '600').replace('800', '600')
                      }`}
                    >
                      View Details
                    </button>
                    
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => onApprove(request)}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex-1"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => onReject(request)}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium flex-1"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredAndSortedRequests.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-300 text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
                <p className="text-gray-600">All requests have been processed.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {isViewModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getRequestTypeIcon(selectedRequest.type)}</span>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {getRequestTypeLabel(selectedRequest.type)} - Details
                  </h2>
                </div>
                <button 
                  onClick={handleCloseModal} 
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>
              
              {/* Customer Details */}
              {renderCustomerDetails(selectedRequest)}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={handleRejectFromModal}
                  className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  Reject Request
                </button>
                <button 
                  onClick={handleApproveFromModal}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
                >
                  Approve Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}