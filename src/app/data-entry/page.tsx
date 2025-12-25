/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Import section components with lazy loading
const DashboardSection = lazy(() => import('@/src/app/data-entry/components/sections/DashboardSection'));
const CustomersSection = lazy(() => import('@/src/app/data-entry/components/sections/CustomersSection'));
const EMISection = lazy(() => import('@/src/app/data-entry/components/sections/EMISection'));
const CollectionSection = lazy(() => import('@/src/app/data-entry/components/sections/CollectionSection'));
const RequestsSection = lazy(() => import('@/src/app/data-entry/components/sections/RequestsSection'));

// Import modal components with lazy loading
import AddCustomerModal from '@/src/app/data-entry/components/data-entry/modals/AddCustomerModal';
const EditCustomerModal = lazy(() => import('@/src/app/data-entry/components/data-entry/modals/EditCustomerModal'));
const AddLoanModal = lazy(() => import('@/src/app/data-entry/components/data-entry/modals/AddLoanModal'));
const EditLoanModal = lazy(() => import('@/src/app/data-entry/components/data-entry/modals/EditLoanModal'));
const RenewLoanModal = lazy(() => import('@/src/app/data-entry/components/data-entry/modals/RenewLoanModal'));
const EMIUpdateModal = lazy(() => import('@/src/app/data-entry/components/data-entry/modals/EMIUpdateModal'));
const EMICalendarModal = lazy(() => import('@/src/app/data-entry/components/data-entry/modals/EMICalendarModal'));
const CustomerDetailsModal = lazy(() => import('@/src/app/data-entry/components/data-entry/modals/CustomerDetailsModal'));
const DeleteConfirmationModal = lazy(() => import('@/src/app/data-entry/components/data-entry/modals/DeleteConfirmationModal'));

// Import types
import type {
  Customer,
  Loan,
  CustomerDetails,
  EditCustomerData,
  EditLoanData,
  RenewLoanData
} from '@/src/app/data-entry/types/dataEntry';

// Import cache clearing function
import { clearAllCustomerCache } from '@/src/app/data-entry/hooks/useCustomers';

// Loading fallback component
const SectionLoader = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

const ModalLoader = () => (
  <div className="flex justify-center items-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

export default function DataEntryDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Modal visibility states - allow multiple modals to be open
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showUpdateEMI, setShowUpdateEMI] = useState(false);
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [showEditLoan, setShowEditLoan] = useState(false);
  const [showRenewLoan, setShowRenewLoan] = useState(false);
  const [showEMICalendar, setShowEMICalendar] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Data states for modals
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [editCustomerData, setEditCustomerData] = useState<EditCustomerData | null>(null);
  const [editLoanData, setEditLoanData] = useState<EditLoanData | null>(null);
  const [renewLoanData, setRenewLoanData] = useState<RenewLoanData | null>(null);
  const [deleteLoanData, setDeleteLoanData] = useState<Loan | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerForCalendar, setSelectedCustomerForCalendar] = useState<Customer | null>(null);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);
  
  // Global states
  const [currentUserOffice, setCurrentUserOffice] = useState<string>('Office 1');
  const [currentOperator, setCurrentOperator] = useState<{
    id: string;
    name: string;
    fullName: string;
  }>({
    id: '',
    name: '',
    fullName: ''
  });

  // Refresh key for sections
  const [refreshKey, setRefreshKey] = useState(0);
  const [existingCustomers, setExistingCustomers] = useState<Customer[]>([]);
  const [requestsInitialized, setRequestsInitialized] = useState(false);

  // Function to close specific modal
const closeModal = useCallback((modalName: string) => {
  switch (modalName) {
    case 'addCustomer':
      setShowAddCustomer(false);
      break;
    case 'updateEMI':
      setShowUpdateEMI(false);
      break;
    case 'addLoan':
      setShowAddLoanModal(false);
      break;
    case 'customerDetails':
      setShowCustomerDetails(false);
      setCustomerDetails(null);
      setSelectedCustomer(null);
      break;
    case 'editCustomer':
      setShowEditCustomer(false);
      break;
    case 'editLoan':
      setShowEditLoan(false);
      break;
    case 'renewLoan':
      setShowRenewLoan(false);
      break;
    case 'emiCalendar':
      setShowEMICalendar(false);
      setSelectedCustomerForCalendar(null);
      break;
    case 'deleteConfirmation':
      // Only close delete confirmation, not customer details
      setShowDeleteConfirmation(false);
      setDeleteLoanData(null);
      break;
  }
}, []);

  // Function to close all modals
  const closeAllModals = useCallback(() => {
    setShowAddCustomer(false);
    setShowUpdateEMI(false);
    setShowAddLoanModal(false);
    setShowCustomerDetails(false);
    setShowEditCustomer(false);
    setShowEditLoan(false);
    setShowRenewLoan(false);
    setShowEMICalendar(false);
    setShowDeleteConfirmation(false);
    
    // Clear modal data
    setCustomerDetails(null);
    setEditCustomerData(null);
    setEditLoanData(null);
    setRenewLoanData(null);
    setDeleteLoanData(null);
    setSelectedCustomer(null);
    setSelectedCustomerForCalendar(null);
    setSelectedLoanForPayment(null);
  }, []);

  // Initialize user
  useEffect(() => {
    const initializeUser = () => {
      const userData = localStorage.getItem('currentUser');
      
      if (userData) {
        try {
          const currentUser = JSON.parse(userData);
          const officeCategory = 
            currentUser.officeCategory || 
            currentUser.office || 
            currentUser.officeName || 
            'Office 1';
          
          setCurrentUserOffice(officeCategory);
          
          const operatorId = 
            currentUser.username || 
            currentUser.userId || 
            currentUser.id || 
            'operator_1';
          
          const operatorName = 
            currentUser.name || 
            currentUser.fullName || 
            currentUser.displayName || 
            'Operator';
          
          const operatorFullName = `${operatorId} - ${operatorName} (Data Entry Operator)`;
          
          setCurrentOperator({
            id: operatorId,
            name: operatorName,
            fullName: operatorFullName
          });
          
        } catch (error) {
          console.error('Error parsing user data:', error);
          setCurrentUserOffice('Office 1');
          setCurrentOperator({
            id: 'operator_1',
            name: 'Operator',
            fullName: 'operator_1 - Operator (Data Entry Operator)'
          });
        }
      } else {
        console.warn('No user data found in localStorage');
        setCurrentUserOffice('Office 1');
        setCurrentOperator({
          id: 'operator_1',
          name: 'Operator',
          fullName: 'operator_1 - Operator (Data Entry Operator)'
        });
      }
    };

    initializeUser();
    
    window.addEventListener('storage', initializeUser);
    
    return () => {
      window.removeEventListener('storage', initializeUser);
    };
  }, [router]);

  // Fetch existing customers when add customer modal opens
  useEffect(() => {
    const fetchExistingCustomers = async () => {
      if (showAddCustomer) {
        try {
          console.log('📥 Fetching existing customers for validation...');
          const response = await fetch('/api/data-entry/customers');
          const data = await response.json();
          if (data.success) {
            console.log(`✅ Found ${data.data.length} existing customers`);
            setExistingCustomers(data.data);
          }
        } catch (error) {
          console.error('❌ Error fetching existing customers:', error);
        }
      }
    };
    
    fetchExistingCustomers();
  }, [showAddCustomer]);

  // Handle tab change - FIXED to load requests immediately
  const handleTabChange = useCallback((tabId: string) => {
    console.log('📑 Changing tab to:', tabId);
    setActiveTab(tabId);
    
    // When switching to requests tab, refresh data
    if (tabId === 'requests') {
      console.log('🔄 Force refreshing requests data...');
      setRefreshKey(prev => prev + 1);
      setRequestsInitialized(true);
    }
    
    closeAllModals();
  }, [closeAllModals]);

  // Handler functions - memoized with useCallback
  const handleViewCustomerDetails = useCallback(async (customer: Customer | CustomerDetails) => {
  console.log('👁️ Viewing customer details:', customer.name);
  
  // Clear any existing customer details first
  setCustomerDetails(null);
  setSelectedCustomer(null);
  
  // Set the customer and open modal
  setCustomerDetails(customer as CustomerDetails);
  setShowCustomerDetails(true);
  
  // Force a small delay to ensure state is updated
  await new Promise(resolve => setTimeout(resolve, 50));
}, []);

  const handleEditCustomer = useCallback((customer: CustomerDetails) => {
    console.log('✏️ Editing customer:', customer.name);
    
    const phoneArray = Array.isArray(customer.phone) ? customer.phone : [customer.phone || ''];
    
    setEditCustomerData({
      name: customer.name,
      phone: phoneArray,
      whatsappNumber: customer.whatsappNumber || '',
      businessName: customer.businessName,
      area: customer.area,
      customerNumber: customer.customerNumber,
      loanAmount: customer.loanAmount ? customer.loanAmount.toString() : '0',
      emiAmount: customer.emiAmount ? customer.emiAmount.toString() : '0',
      loanType: customer.loanType || 'Daily',
      address: customer.address || '',
      customerId: customer._id,
      category: customer.category || 'A',
      officeCategory: customer.officeCategory || 'Office 1'
    });
    
    // Open edit modal without closing customer details
    setShowEditCustomer(true);
  }, []);

  const handleEditLoan = useCallback((loan: Loan) => {
  console.log('✏️ Editing loan:', loan.loanNumber);
  
  setEditLoanData({
    loanId: loan._id,
    customerId: loan.customerId,
    customerName: loan.customerName,
    customerNumber: loan.customerNumber,
    loanNumber: loan.loanNumber,
    amount: loan.amount.toString(),
    emiAmount: loan.emiAmount.toString(),
    loanType: loan.loanType,
    dateApplied: loan.dateApplied.split('T')[0],
    loanDays: loan.loanDays.toString(),
    emiType: loan.emiType || 'fixed',
    customEmiAmount: loan.customEmiAmount?.toString() || '',
    emiStartDate: loan.emiStartDate?.split('T')[0] || loan.dateApplied.split('T')[0],
    originalData: {
      amount: loan.amount,
      emiAmount: loan.emiAmount,
      loanType: loan.loanType,
      dateApplied: loan.dateApplied,
      loanDays: loan.loanDays,
      emiType: loan.emiType || 'fixed',
      customEmiAmount: loan.customEmiAmount || null,
      emiStartDate: loan.emiStartDate || loan.dateApplied,
      loanNumber: loan.loanNumber // ← ADD THIS LINE
    }
  });
  
  setShowEditLoan(true);
}, []);

  const handleRenewLoan = useCallback((loan: Loan) => {
    console.log('🔄 Renewing loan:', loan.loanNumber);
    
    setRenewLoanData({
      loanId: loan._id,
      customerId: loan.customerId,
      customerName: loan.customerName,
      customerNumber: loan.customerNumber,
      loanNumber: loan.loanNumber,
      renewalDate: new Date().toISOString().split('T')[0],
      newLoanAmount: loan.amount.toString(),
      newEmiAmount: loan.emiAmount.toString(),
      newLoanDays: loan.loanDays.toString(),
      newLoanType: loan.loanType,
      remarks: `Renewal of loan ${loan.loanNumber}`,
      emiStartDate: new Date().toISOString().split('T')[0],
      emiType: 'fixed',
      customEmiAmount: ''
    });
    
    // Open renew modal without closing customer details
    setShowRenewLoan(true);
  }, []);

  const handleDeleteLoan = useCallback((loan: Loan) => {
  console.log('🗑️ Deleting loan:', loan.loanNumber);
  setDeleteLoanData(loan);
  
  // Open delete confirmation without closing customer details
  setShowDeleteConfirmation(true);
  
  // IMPORTANT: Don't close customer details modal
  // Keep showCustomerDetails as true
}, []);

  const handleUpdateEMI = useCallback((customer: Customer, loan?: Loan) => {
    console.log('💰 Updating EMI for customer:', customer.name);
    
    setSelectedCustomer(customer);
    setSelectedLoanForPayment(loan || null);
    
    // Open update EMI modal without closing customer details
    setShowUpdateEMI(true);
  }, []);

  const handleViewEMICalendar = useCallback((customer: Customer) => {
    console.log('📅 Viewing EMI calendar for customer:', customer.name);
    
    setSelectedCustomerForCalendar(customer);
    
    // Open EMI calendar
    setShowEMICalendar(true);
  }, []);

  const handleAddLoan = useCallback(async (customer: CustomerDetails) => {
  console.log('➕ Adding loan for customer:', customer.name);
  
  // Fetch existing loans for this customer
  try {
    const response = await fetch(`/api/data-entry/loans?customerId=${customer._id}`);
    const data = await response.json();
    
    if (data.success) {
      setCustomerDetails({
        ...customer,
        existingLoans: data.data // Pass existing loans to modal
      });
    } else {
      setCustomerDetails(customer);
    }
  } catch (error) {
    console.error('Error fetching existing loans:', error);
    setCustomerDetails(customer);
  }
  
  // Open add loan modal
  setShowAddLoanModal(true);
}, []);

  const handleRefresh = useCallback(() => {
    console.log('🔄 Refreshing data...');
    setRefreshKey(prev => prev + 1);
  }, []);

  const handleLogout = useCallback(() => {
    console.log('🚪 Logging out...');
    localStorage.removeItem('currentUser');
    router.push('/auth');
  }, [router]);

  // Update the handleShowAddCustomer function
  const handleShowAddCustomer = useCallback((customerData?: any) => {
    console.log('➕ Showing add customer modal', customerData);
    setShowAddCustomer(true);
    if (customerData) {
      setCustomerDetails(customerData);
    }
  }, []);

  const handleShowUpdateEMI = useCallback(() => {
    console.log('💰 Showing update EMI modal');
    setShowUpdateEMI(true);
  }, []);

  const handleNotificationToggle = useCallback(() => {
    console.log('🔔 Toggling notifications');
    setShowNotifications(prev => !prev);
  }, []);

  // NEW: Handle Add New Customer from Customers section
  const handleShowAddCustomerFromCustomers = useCallback(() => {
    console.log('➕ Showing add customer modal from Customers section');
    setShowAddCustomer(true);
  }, []);

  
const handleModalSuccess = useCallback((keepCustomerDetailsOpen = false) => {
  console.log('✅ Modal action successful, refreshing data...');
  
  // 🚨 CRITICAL FIX: Clear all customer cache to force fresh data
  clearAllCustomerCache();
  
  // Refresh data
  handleRefresh(); // This should already exist
  
  // Only close all modals if we're not keeping customer details open
  if (!keepCustomerDetailsOpen) {
    closeAllModals();
  } else {
    // Only close specific modals, keep customer details open
    setShowAddCustomer(false);
    setShowUpdateEMI(false);
    setShowAddLoanModal(false);
    setShowEditCustomer(false);
    setShowEditLoan(false);
    setShowRenewLoan(false);
    setShowEMICalendar(false);
    setShowDeleteConfirmation(false);
    // Don't close customer details
  }
  
  // If customer details modal was open, refresh that specific customer
  if (customerDetails) {
    const fetchUpdatedCustomer = async () => {
      try {
        // Use cache-busting URL to ensure fresh data
        const response = await fetch(`/api/data-entry/customers/${customerDetails._id}?t=${Date.now()}`);
        const data = await response.json();
        if (data.success) {
          setCustomerDetails(data.data);
          console.log('✅ Updated customer details loaded');
        }
      } catch (error) {
        console.error('Error fetching updated customer:', error);
      }
    };
    fetchUpdatedCustomer();
  }
}, [handleRefresh, closeAllModals, customerDetails]);

  // Function to handle actual loan deletion after confirmation - UPDATED WITH CORRECT API
  // Function to handle actual loan deletion after confirmation
const handleConfirmDeleteLoan = useCallback(async () => {
  if (!deleteLoanData) {
    console.error('❌ No loan data to delete');
    return;
  }

  console.log('🔍 Current Operator:', currentOperator);
  console.log('🔍 Delete Loan Data:', deleteLoanData);

  try {
    console.log('🗑️ Submitting loan deletion request for:', deleteLoanData.loanNumber);
    
    const requestBody = {
      loanId: deleteLoanData._id,
      customerId: deleteLoanData.customerId,
      customerName: deleteLoanData.customerName,
      customerNumber: deleteLoanData.customerNumber,
      loanNumber: deleteLoanData.loanNumber,
      requestedBy: currentOperator.id || 'data_entry_operator'
    };
    
    console.log('📦 Request Body:', requestBody);
    
    const response = await fetch('/api/data-entry/delete-loan-request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📊 Response Status:', response.status);
    
    const responseData = await response.json();
    console.log('📊 Response Data:', responseData);

    if (response.ok && responseData.success) {
      console.log('✅ Loan deletion request submitted successfully');
      alert('Loan deletion request submitted successfully! Waiting for admin approval.');
      
      // 🚨 Clear cache for this customer
      if (customerDetails) {
        clearAllCustomerCache();
      }
      
      // Only close delete confirmation modal, keep customer details open
      setShowDeleteConfirmation(false);
      setDeleteLoanData(null);
      
      // Refresh data but keep customer details open
      handleRefresh();
      
      // Refresh customer details
      if (customerDetails) {
        const fetchUpdatedCustomer = async () => {
          try {
            const response = await fetch(`/api/data-entry/customers/${customerDetails._id}?t=${Date.now()}`);
            const data = await response.json();
            if (data.success) {
              setCustomerDetails(data.data);
              console.log('✅ Updated customer details loaded');
            }
          } catch (error) {
            console.error('Error fetching updated customer:', error);
          }
        };
        fetchUpdatedCustomer();
      }
      
    } else {
      console.error('❌ Failed to submit delete request:', responseData.error);
      alert(`Failed to submit delete request: ${responseData.error || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.error('❌ Error submitting delete request:', error);
    alert(`Error submitting delete request: ${error.message || 'Unknown error'}`);
  }
}, [deleteLoanData, currentOperator, handleRefresh, customerDetails]);

  // Render current tab with Suspense - FIXED requests section props
  const renderCurrentTab = useCallback(() => {
    console.log('🎨 Rendering tab:', activeTab);
    
    switch (activeTab) {
      case 'dashboard':
        return (
          <Suspense fallback={<SectionLoader />}>
            <DashboardSection
              currentUserOffice={currentUserOffice}
              onNavigateToTab={handleTabChange}
              onShowAddCustomer={handleShowAddCustomer}
              onShowUpdateEMI={handleShowUpdateEMI}
            />
          </Suspense>
        );
      case 'customers':
        return (
          <Suspense fallback={<SectionLoader />}>
            <CustomersSection
              currentUserOffice={currentUserOffice || 'all'}
              onViewCustomerDetails={handleViewCustomerDetails}
              onUpdateEMI={handleUpdateEMI}
              onEditCustomer={handleEditCustomer}
              onAddLoan={handleAddLoan}
              refreshKey={refreshKey}
              onAddNewCustomer={handleShowAddCustomerFromCustomers}
              onViewEMICalendar={handleViewEMICalendar}
            />
          </Suspense>
        );
      case 'emi':
        return (
          <Suspense fallback={<SectionLoader />}>
            <EMISection
              currentUserOffice={currentUserOffice}
              currentOperator={currentOperator}
              onShowUpdateEMI={handleUpdateEMI}
              onShowEMICalendar={handleViewEMICalendar}
              refreshKey={refreshKey}
            />
          </Suspense>
        );
      case 'collection':
        return (
          <Suspense fallback={<SectionLoader />}>
            <CollectionSection
              refreshKey={refreshKey}
              currentUserOffice={currentUserOffice}
              currentOperator={currentOperator}
              onShowUpdateEMI={handleShowUpdateEMI}
            />
          </Suspense>
        );
      case 'requests':
        return (
          <Suspense fallback={<SectionLoader />}>
            <RequestsSection
              refreshKey={refreshKey}
              currentUserOffice={currentUserOffice}
              currentOperatorId={currentOperator.id} // Pass operator ID to filter requests
              currentOperatorName={currentOperator.name}
              onRefresh={handleRefresh}
            />
          </Suspense>
        );
      default:
        return (
          <div className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-700">Tab not found</h2>
            <p className="text-gray-500 mt-2">Please select a valid tab</p>
          </div>
        );
    }
  }, [
    activeTab,
    currentUserOffice,
    currentOperator,
    refreshKey,
    handleTabChange,
    handleShowAddCustomer,
    handleShowUpdateEMI,
    handleViewCustomerDetails,
    handleUpdateEMI,
    handleEditCustomer,
    handleAddLoan,
    handleViewEMICalendar,
    handleShowAddCustomerFromCustomers,
    handleRefresh
  ]);

  // Function to render tab-specific header
  const renderTabHeader = () => {
    if (activeTab === 'dashboard') {
      // Simple header for Dashboard only
      return null;
    } else {
      // Full header for other tabs
      return (
        <div className="mb-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 capitalize">
              {activeTab} Management
            </h2>
            <p className="text-sm text-gray-600">
              {activeTab === 'customers' ? 'Manage customer records and information' :
              activeTab === 'emi' ? 'Handle EMI payments and schedules' :
              activeTab === 'collection' ? 'Track collections and payments' :
              activeTab === 'requests' ? 'Review your submitted requests' :
              'Overview of data entry operations'}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center"
          >
            <span className="mr-1">🔄</span> Refresh
          </button>
        </div>
      );
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
      
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
  <h1 className="text-2xl font-bold text-gray-900">Data Entry Dashboard</h1>
  <span className="ml-4 text-lg font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg">
    {currentUserOffice}
  </span>
</div>
            <div className="flex items-center space-x-4">
              <div className="text-gray-700 bg-gray-100 px-3 py-1 rounded-md">
                <span className="font-medium">Operator:</span> {currentOperator.name}
              </div>
              
              {/* Notification Bell */}
              <div className="relative notification-container">
                <button
                  onClick={handleNotificationToggle}
                  className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors duration-200"
                >
                  <span className="text-2xl">🔔</span>
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
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
                      <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">📭</div>
                        <p className="text-gray-600">No new notifications</p>
                        <p className="text-sm text-gray-500 mt-1">You're all caught up!</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
  {[
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'customers', label: 'Customers' },
    { id: 'emi', label: 'EMI' },
    { id: 'collection', label: 'Collection' },
    { id: 'requests', label: 'Requests' }
  ].map((tab) => (
    <button
      key={tab.id}
      onClick={() => handleTabChange(tab.id)}
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
        <div className="px-4 py-3 sm:px-0">
          {renderTabHeader()}
          {renderCurrentTab()}
        </div>
      </main>

      {/* Modal Components with Suspense */}
      {/* Note: Z-index values ensure proper stacking order */}
      {/* Lower z-index values = further back, higher = closer to front */}
      
      {/* Customer Details Modal */}
      {showCustomerDetails && (customerDetails || selectedCustomer) && (
        <div className="z-[100]">
          <Suspense fallback={<ModalLoader />}>
            <CustomerDetailsModal
              isOpen={showCustomerDetails}
              onClose={() => closeModal('customerDetails')}
              customer={customerDetails || selectedCustomer!}
              onEditCustomer={handleEditCustomer}
              onEditLoan={handleEditLoan}
              onRenewLoan={handleRenewLoan}
              onDeleteLoan={handleDeleteLoan}
              onViewEMICalendar={handleViewEMICalendar}
              onAddLoan={() => {
                if (customerDetails) {
                  handleAddLoan(customerDetails);
                }
              }}
              currentUserOffice={currentUserOffice}
            />
          </Suspense>
        </div>
      )}

 {/* Add Customer Modal */}
{showAddCustomer && (
  <div className="z-[110]">
    <Suspense fallback={<ModalLoader />}>
      <AddCustomerModal
        isOpen={showAddCustomer}
        onClose={() => closeModal('addCustomer')}
        onSuccess={handleModalSuccess}
        currentUserOffice={currentUserOffice}
        existingCustomers={existingCustomers}
        currentOperator={currentOperator} // ← ADD THIS LINE
      />
    </Suspense>
  </div>
)}

{/* Edit Customer Modal */}
{showEditCustomer && editCustomerData && (
  <div className="z-[120]">
    <Suspense fallback={<ModalLoader />}>
      <EditCustomerModal
        isOpen={showEditCustomer}
        onClose={() => closeModal('editCustomer')}
        customerData={editCustomerData}
        onSuccess={handleModalSuccess}
        currentUserOffice={currentUserOffice}
        currentOperator={currentOperator} // ← ADD THIS LINE
      />
    </Suspense>
  </div>
)}

{/* Add Loan Modal */}
{showAddLoanModal && customerDetails && (
  <div className="z-[130]">
    <Suspense fallback={<ModalLoader />}>
      <AddLoanModal
        isOpen={showAddLoanModal}
        onClose={() => closeModal('addLoan')}
        customerDetails={customerDetails}
        onSuccess={handleModalSuccess}
        currentOperator={currentOperator} // ← ADD THIS LINE
      />
    </Suspense>
  </div>
)}

{/* Edit Loan Modal */}
{showEditLoan && editLoanData && (
  <div className="z-[140]">
    <Suspense fallback={<ModalLoader />}>
      <EditLoanModal
        isOpen={showEditLoan}
        onClose={() => closeModal('editLoan')}
        loanData={editLoanData}
        onSuccess={handleModalSuccess}
        currentOperator={currentOperator} // ← ALREADY EXISTS, KEEP IT
      />
    </Suspense>
  </div>
)}

{/* Renew Loan Modal */}
{showRenewLoan && renewLoanData && (
  <div className="z-[150]">
    <Suspense fallback={<ModalLoader />}>
      <RenewLoanModal
        isOpen={showRenewLoan}
        onClose={() => closeModal('renewLoan')}
        loanData={renewLoanData}
        onSuccess={handleModalSuccess}
        currentOperator={currentOperator} // ← ADD THIS LINE
      />
    </Suspense>
  </div>
)}

      {/* Update EMI Modal */}
      {showUpdateEMI && (
        <div className="z-[160]">
          <Suspense fallback={<ModalLoader />}>
            <EMIUpdateModal
              isOpen={showUpdateEMI}
              onClose={() => closeModal('updateEMI')}
              selectedCustomer={selectedCustomer}
              selectedLoan={selectedLoanForPayment}
              currentOperator={currentOperator}
              onSuccess={handleModalSuccess}
              customers={[]}
            />
          </Suspense>
        </div>
      )}

      {/* EMI Calendar Modal */}
      {showEMICalendar && selectedCustomerForCalendar && (
        <div className="z-[170]">
          <Suspense fallback={<ModalLoader />}>
            <EMICalendarModal
              isOpen={showEMICalendar}
              onClose={() => closeModal('emiCalendar')}
              customer={selectedCustomerForCalendar}
              currentUserOffice={currentUserOffice}
            />
          </Suspense>
        </div>
      )}

      {/* Delete Confirmation Modal - HIGHEST PRIORITY (FIXED) */}
      {showDeleteConfirmation && deleteLoanData && (
  <div className="z-[9999]"> {/* Use highest z-index */}
    <Suspense fallback={<ModalLoader />}>
      <DeleteConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => closeModal('deleteConfirmation')}
        onConfirm={() => {
          handleConfirmDeleteLoan(); // This handles the API call
          // After delete is confirmed, don't close customer details
          // We'll handle the modal closing in handleConfirmDeleteLoan
        }}
        title="Delete Loan"
        message={`Are you sure you want to delete loan ${deleteLoanData.loanNumber}? This action cannot be undone.`}
      />
    </Suspense>
  </div>
)}

      {/* Debug overlay - remove in production */}
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white text-xs p-2 rounded-md z-50 hidden md:block">
        <div>Office: {currentUserOffice}</div>
        <div>Operator: {currentOperator.name}</div>
        <div>Tab: {activeTab}</div>
        <div>Modals: {[
          showCustomerDetails && 'Customer Details',
          showAddCustomer && 'Add Customer',
          showEditCustomer && 'Edit Customer',
          showAddLoanModal && 'Add Loan',
          showEditLoan && 'Edit Loan',
          showRenewLoan && 'Renew Loan',
          showUpdateEMI && 'Update EMI',
          showEMICalendar && 'EMI Calendar',
          showDeleteConfirmation && 'Delete Confirmation'
        ].filter(Boolean).join(', ')}</div>
        <div className="text-green-400">🟢 Connected</div>
      </div>
    </div>
  );
}