'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic imports for better performance
const CustomerDetails = dynamic(() => import('@/src/app/admin/components/CustomerDetails'), {
  loading: () => <div>Loading Customer Details...</div>
});

const PendingRequests = dynamic(() => import('@/src/app/admin/components/PendingRequests'), {
  loading: () => <div>Loading Requests...</div>
});

const EnhancedReports = dynamic(() => import('@/src/app/admin/components/EnhancedReports'), {
  loading: () => <div>Loading Reports...</div>
});

const TeamManagement = dynamic(() => import('@/src/app/admin/components/TeamManagement'), {
  loading: () => <div>Loading Team Management...</div>
});

const CollectionView = dynamic(() => import('@/src/app/admin/components/CollectionView'), {
  loading: () => <div>Loading Collection...</div>
});

const Dashboard = dynamic(() => import('@/src/app/admin/components/Dashboard'), {
  loading: () => <div>Loading Dashboard...</div>
});

// Static imports for essential components
import Header from '@/src/app/admin/components/Header';
import Navigation from '@/src/app/admin/components/Navigation';
import Customers from '@/src/app/admin/components/Customers';

// Hooks
import { useDashboardStats } from '@/src/app/admin/hooks/useDashboardStats';
import { useCustomers } from '@/src/app/admin/hooks/useCustomers';
import { usePendingRequests } from '@/src/app/admin/hooks/usePendingRequests';

// Types
import { Customer, Filters } from '@/src/app/admin/types';

export default function AdminPage() {
  const router = useRouter();
  
  // State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({
    customerNumber: '',
    loanType: '',
    status: '',
    officeCategory: '',
    category: ''
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showNotifications, setShowNotifications] = useState(false);

  // Custom hooks for data fetching
  const { 
    stats: dashboardStats, 
    loading: statsLoading, 
    fetchData: fetchDashboardData 
  } = useDashboardStats();
  
  const { 
    customers, 
    loading: customersLoading, 
    fetchData: fetchCustomers 
  } = useCustomers();
  
  const { 
    requests: pendingRequests, 
    loading: requestsLoading, 
    fetchData: fetchPendingRequests 
  } = usePendingRequests();

  // Memoized filtered customers
  const filteredAndSortedCustomers = useMemo(() => {
    return customers
      .filter((customer: Customer) => {
        const matchesSearch = searchTerm === '' || 
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.customerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone.includes(searchTerm);

        const matchesCustomerNumber = filters.customerNumber === '' || 
          customer.customerNumber.toLowerCase().includes(filters.customerNumber.toLowerCase());
        
        const matchesLoanType = filters.loanType === '' || 
          customer.loanType === filters.loanType;
        
        const matchesStatus = filters.status === '' || 
          customer.status === filters.status;

        const matchesOfficeCategory = filters.officeCategory === '' || 
          customer.officeCategory === filters.officeCategory;

        const matchesCategory = filters.category === '' || 
          customer.category === filters.category;

        return matchesSearch && matchesCustomerNumber && matchesLoanType && matchesStatus && matchesOfficeCategory && matchesCategory;
      })
      .sort((a: Customer, b: Customer) => {
        if (sortOrder === 'asc') {
          return a.customerNumber.localeCompare(b.customerNumber);
        }
        return b.customerNumber.localeCompare(a.customerNumber);
      });
  }, [customers, searchTerm, filters, sortOrder]);

  // Fetch data on tab change
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchDashboardData(),
        fetchCustomers(),
        fetchPendingRequests()
      ]);
    };
    loadData();
  }, [activeTab, fetchDashboardData, fetchCustomers, fetchPendingRequests]);

  // Event handlers
  const handleLogout = useCallback(() => {
    router.push('/auth');
  }, [router]);

  const handleNotificationToggle = useCallback(() => {
    console.log('🔔 Toggling notifications');
    setShowNotifications(prev => !prev);
  }, []);

  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      customerNumber: '',
      loanType: '',
      status: '',
      officeCategory: '',
      category: ''
    });
    setSearchTerm('');
    setSortOrder('asc');
  }, []);

  const handleSortToggle = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  const handleViewCustomerDetails = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setSelectedCustomer(null);
  }, []);

  const handleDeleteCustomer = useCallback(async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const response = await fetch('/api/admin/customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });

      if (response.ok) {
        alert('Customer deleted successfully!');
        fetchCustomers();
        fetchDashboardData();
        setSelectedCustomer(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete customer');
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }, [fetchCustomers, fetchDashboardData]);

  const handleApproveRequest = useCallback(async (request: any) => {
    try {
      const response = await fetch('/api/admin/approve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request._id, action: 'approve' }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        alert('Request approved successfully!');
        await Promise.all([fetchDashboardData(), fetchCustomers(), fetchPendingRequests()]);
      } else {
        alert(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }, [fetchDashboardData, fetchCustomers, fetchPendingRequests]);

  const handleRejectRequest = useCallback(async (request: any) => {
    try {
      const response = await fetch('/api/admin/approve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request._id,
          action: 'reject',
          reason: 'Rejected by admin'
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert('Request rejected successfully!');
        await Promise.all([fetchDashboardData(), fetchPendingRequests()]);
      } else {
        alert(`Error: ${data.error || data.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }, [fetchDashboardData, fetchPendingRequests]);

  // Function to clean request data before passing to component
const cleanRequestData = useCallback((request: any) => {
  if (!request) return request;
  
  // Create a deep copy
  const cleaned = JSON.parse(JSON.stringify(request));
  
  console.log('🔍 Cleaning request data:', {
    type: cleaned.type,
    hasStep1Data: !!cleaned.step1Data,
    hasRequestedData: !!cleaned.requestedData
  });
  
  // Helper function to clean document objects
  const cleanDocumentObject = (doc: any): any => {
    if (!doc || typeof doc !== 'object') return doc;
    
    // If it's a document object (has filename, url, etc.)
    if (doc.filename || doc.url) {
      // Return a simple string representation for document objects
      const cleanedDoc = {
        filename: doc.filename || '',
        url: doc.url || '',
        originalName: doc.originalName || doc.filename || '',
        uploadedAt: doc.uploadedAt instanceof Date 
          ? doc.uploadedAt.toISOString() 
          : typeof doc.uploadedAt === 'string' 
            ? doc.uploadedAt 
            : '',
        // Simple string representation for display
        displayName: doc.originalName || doc.filename || 'Document'
      };
      return cleanedDoc;
    }
    
    // For other objects, ensure Date fields are strings
    const cleanedObj = { ...doc };
    Object.keys(cleanedObj).forEach(key => {
      if (cleanedObj[key] instanceof Date) {
        cleanedObj[key] = cleanedObj[key].toISOString();
      }
    });
    return cleanedObj;
  };
  
  // SPECIAL HANDLING FOR NEW CUSTOMER REQUESTS
  if (cleaned.type === 'New Customer') {
    console.log('🔄 Processing New Customer request');
    
    // Clean step1Data if it exists
    if (cleaned.step1Data) {
      console.log('📝 Cleaning step1Data');
      
      // Clean profilePicture
      if (cleaned.step1Data.profilePicture) {
        console.log('🖼️ Cleaning profilePicture');
        cleaned.step1Data.profilePicture = cleanDocumentObject(cleaned.step1Data.profilePicture);
      }
      
      // Clean fiDocuments
      if (cleaned.step1Data.fiDocuments) {
        console.log('📄 Cleaning fiDocuments');
        if (cleaned.step1Data.fiDocuments.shop) {
          cleaned.step1Data.fiDocuments.shop = cleanDocumentObject(cleaned.step1Data.fiDocuments.shop);
        }
        if (cleaned.step1Data.fiDocuments.home) {
          cleaned.step1Data.fiDocuments.home = cleanDocumentObject(cleaned.step1Data.fiDocuments.home);
        }
      }
      
      // Ensure phone is an array
      if (!Array.isArray(cleaned.step1Data.phone)) {
        cleaned.step1Data.phone = [cleaned.step1Data.phone || ''];
      }
      
      // Convert any remaining Date objects to strings
      Object.keys(cleaned.step1Data).forEach(key => {
        const value = cleaned.step1Data[key];
        if (value instanceof Date) {
          cleaned.step1Data[key] = value.toISOString();
        }
      });
    }
    
    // Clean step2Data for loan information
    if (cleaned.step2Data) {
      console.log('💰 Cleaning step2Data');
      
      // Convert Date objects to strings
      if (cleaned.step2Data.loanDate instanceof Date) {
        cleaned.step2Data.loanDate = cleaned.step2Data.loanDate.toISOString();
      }
      if (cleaned.step2Data.emiStartDate instanceof Date) {
        cleaned.step2Data.emiStartDate = cleaned.step2Data.emiStartDate.toISOString();
      }
      
      // Ensure loanDateInput and emiStartDateInput exist
      if (!cleaned.step2Data.loanDateInput && cleaned.step2Data.loanDate) {
        cleaned.step2Data.loanDateInput = cleaned.step2Data.loanDate.split('T')[0];
      }
      if (!cleaned.step2Data.emiStartDateInput && cleaned.step2Data.emiStartDate) {
        cleaned.step2Data.emiStartDateInput = cleaned.step2Data.emiStartDate.split('T')[0];
      }
      
      // Ensure numeric fields are numbers
      const numericFields = ['amount', 'loanAmount', 'emiAmount', 'loanDays', 'customEmiAmount', 'totalLoanAmount'];
      numericFields.forEach(field => {
        if (cleaned.step2Data[field] !== undefined) {
          cleaned.step2Data[field] = Number(cleaned.step2Data[field]) || 0;
        }
      });
    }
    
    // Clean step3Data for login credentials
    if (cleaned.step3Data) {
      console.log('🔐 Cleaning step3Data');
      // Ensure all fields are strings
      const stringFields = ['loginId', 'password', 'confirmPassword'];
      stringFields.forEach(field => {
        if (cleaned.step3Data[field] !== undefined) {
          cleaned.step3Data[field] = String(cleaned.step3Data[field] || '');
        }
      });
    }
    
    // Also clean requestedData if it exists (for backward compatibility)
    if (cleaned.requestedData) {
      console.log('📋 Cleaning requestedData for New Customer');
      // Copy data from step1Data, step2Data, step3Data into requestedData
      cleaned.requestedData = {
        ...cleaned.step1Data,
        ...cleaned.step2Data,
        ...cleaned.step3Data,
        type: 'New Customer',
        customerName: cleaned.customerName,
        customerNumber: cleaned.customerNumber || (cleaned.step1Data?.customerNumber || ''),
        loanType: cleaned.step2Data?.loanType || '',
        loanNumber: cleaned.step2Data?.loanNumber || '',
        loanSelectionType: cleaned.step2Data?.loanSelectionType || 'single'
      };
    }
    
  } else {
    // For other request types (Loan Addition, etc.)
    if (cleaned.requestedData) {
      console.log('📋 Cleaning requestedData for other request types');
      
      // Clean any document objects in requestedData
      if (cleaned.requestedData.profilePicture) {
        cleaned.requestedData.profilePicture = cleanDocumentObject(cleaned.requestedData.profilePicture);
      }
      
      if (cleaned.requestedData.fiDocuments) {
        if (cleaned.requestedData.fiDocuments.shop) {
          cleaned.requestedData.fiDocuments.shop = cleanDocumentObject(cleaned.requestedData.fiDocuments.shop);
        }
        if (cleaned.requestedData.fiDocuments.home) {
          cleaned.requestedData.fiDocuments.home = cleanDocumentObject(cleaned.requestedData.fiDocuments.home);
        }
      }
    }
  }
  
  // Clean other nested objects (for all request types)
  const cleanNestedObjects = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const cleanedObj = { ...obj };
    
    Object.keys(cleanedObj).forEach(key => {
      const value = cleanedObj[key];
      
      // Convert Date objects to strings
      if (value instanceof Date) {
        cleanedObj[key] = value.toISOString();
      }
      // Clean document objects
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (value.filename || value.url) {
          cleanedObj[key] = cleanDocumentObject(value);
        } else {
          cleanedObj[key] = cleanNestedObjects(value);
        }
      }
    });
    
    return cleanedObj;
  };
  
  // Apply cleaning to all data fields
  if (cleaned.step1Data && cleaned.type !== 'New Customer') {
    cleaned.step1Data = cleanNestedObjects(cleaned.step1Data);
  }
  if (cleaned.step2Data && cleaned.type !== 'New Customer') {
    cleaned.step2Data = cleanNestedObjects(cleaned.step2Data);
  }
  if (cleaned.step3Data && cleaned.type !== 'New Customer') {
    cleaned.step3Data = cleanNestedObjects(cleaned.step3Data);
  }
  if (cleaned.requestedData && cleaned.type !== 'New Customer') {
    cleaned.requestedData = cleanNestedObjects(cleaned.requestedData);
  }
  if (cleaned.currentData) {
    cleaned.currentData = cleanNestedObjects(cleaned.currentData);
  }
  
  // Convert main Date fields to strings
  const dateFields = ['createdAt', 'updatedAt', 'reviewedAt', 'approvedAt', 'rejectedAt', 'completedAt'];
  dateFields.forEach(field => {
    if (cleaned[field] && cleaned[field] instanceof Date) {
      cleaned[field] = cleaned[field].toISOString();
    }
  });
  
  // Replace the addSafeDisplay function with this safer version:
const addSafeDisplay = (obj: any, path: string = ''): void => {
  if (!obj || typeof obj !== 'object' || obj instanceof Date) return;
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    const currentPath = path ? `${path}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Skip Date objects
      if (value instanceof Date) {
        return;
      }
      
      // Add a safe display string for objects
      if (!value.safeDisplay) {
        if (value.filename || value.url) {
          value.safeDisplay = value.originalName || value.filename || 'Document';
        } else {
          value.safeDisplay = `[${currentPath}]`;
        }
      }
      addSafeDisplay(value, currentPath);
    }
  });
};
  
  // Apply safe display to all nested objects
  addSafeDisplay(cleaned);
  
  console.log('✅ Request cleaned successfully');
  return cleaned;
}, []);

  // Get cleaned requests
  const cleanedPendingRequests = useMemo(() => {
    return pendingRequests.map(cleanRequestData);
  }, [pendingRequests, cleanRequestData]);

  // Loading state
  const loading = statsLoading || customersLoading || requestsLoading;

  // Render main content based on active tab
  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (selectedCustomer) {
      return (
        <CustomerDetails 
          customer={selectedCustomer} 
          onBack={handleBackToDashboard}
          onDelete={handleDeleteCustomer}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            stats={dashboardStats}
            pendingRequestsCount={pendingRequests.length}
            onViewCustomers={() => setActiveTab('customers')}
            onViewRequests={() => setActiveTab('requests')}
            onViewTeam={() => setActiveTab('team')}
            onViewReports={() => setActiveTab('reports')}
            onViewCollection={() => setActiveTab('collection')}
          />
        );
      case 'customers':
        return (
          <Customers
            customers={customers}
            filteredAndSortedCustomers={filteredAndSortedCustomers}
            searchTerm={searchTerm}
            filters={filters}
            sortOrder={sortOrder}
            onSearchChange={setSearchTerm}
            onFilterChange={handleFilterChange}
            onSortToggle={handleSortToggle}
            onClearFilters={handleClearFilters}
            onViewCustomerDetails={handleViewCustomerDetails}
          />
        );
      case 'requests':
        return (
          <PendingRequests
            requests={cleanedPendingRequests}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            onBack={() => setActiveTab('dashboard')}
          />
        );
      case 'reports':
        return <EnhancedReports onBack={() => setActiveTab('dashboard')} />;
      case 'team':
        return <TeamManagement onBack={() => setActiveTab('dashboard')} />;
      case 'collection':
        return <CollectionView onBack={() => setActiveTab('dashboard')} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
      
      <Header onLogout={handleLogout} />
      
      {/* Navigation with matching Data Entry styling */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'customers', label: 'Customers' },
              { id: 'collection', label: 'Collection' },
              { id: 'requests', label: 'Requests' },
              { id: 'reports', label: 'Reports' },
              { id: 'team', label: 'Team' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-5 px-2 border-b-2 font-semibold text-base transition-colors duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Add Notification Bell to main content header */}
        <div className="mb-6 flex justify-between items-center px-4 sm:px-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 capitalize">
              {activeTab === 'dashboard' ? 'Admin Dashboard' : 
               activeTab === 'customers' ? 'Customers Management' :
               activeTab === 'requests' ? 'Pending Requests' :
               activeTab === 'reports' ? 'Enhanced Reports' :
               activeTab === 'team' ? 'Team Management' :
               activeTab === 'collection' ? 'Collection View' :
               'Admin Panel'}
            </h2>
            <p className="text-sm text-gray-600">
              {activeTab === 'dashboard' ? 'Overview of system operations and statistics' :
               activeTab === 'customers' ? 'Manage all customer records and information' :
               activeTab === 'requests' ? 'Review and approve pending requests' :
               activeTab === 'reports' ? 'Generate and view detailed reports' :
               activeTab === 'team' ? 'Manage team members and permissions' :
               activeTab === 'collection' ? 'Monitor collections and payments' :
               'Administrative controls and settings'}
            </p>
          </div>
          
          {/* Notification Bell */}
          <div className="relative notification-container">
            <button
              onClick={handleNotificationToggle}
              className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors duration-200"
            >
              <span className="text-2xl">🔔</span>
              {pendingRequests.length > 0 && (
                <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-fade-in">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">Notifications</h3>
                    <button className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200">
                      Mark all as read
                    </button>
                  </div>
                  
                  {pendingRequests.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {pendingRequests.slice(0, 5).map((request: any) => (
                        <div key={request._id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {request.type === 'delete_loan' ? 'Loan Deletion Request' :
                                 request.type === 'edit_loan' ? 'Loan Edit Request' :
                                 request.type}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                Customer: {request.customerName}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Requested by: {request.requestedBy}
                              </p>
                            </div>
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              Pending
                            </span>
                          </div>
                          <div className="mt-2 flex space-x-2">
                            <button
                              onClick={() => {
                                handleApproveRequest(request);
                                setShowNotifications(false);
                              }}
                              className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                handleRejectRequest(request);
                                setShowNotifications(false);
                              }}
                              className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                      {pendingRequests.length > 5 && (
                        <div className="text-center pt-2 border-t border-gray-200">
                          <button
                            onClick={() => {
                              setActiveTab('requests');
                              setShowNotifications(false);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            View all {pendingRequests.length} requests →
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-4">📭</div>
                      <p className="text-gray-600">No new notifications</p>
                      <p className="text-sm text-gray-500 mt-1">You're all caught up!</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {renderMainContent()}
      </main>
    </div>
  );
}