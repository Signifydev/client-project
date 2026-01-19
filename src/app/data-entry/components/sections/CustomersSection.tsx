import React, { useState, useEffect, useMemo } from 'react';
import { Customer, CustomerDetails, Filters, CustomersSectionProps, Loan } from '@/src/app/data-entry/types/dataEntry';
import { useCustomers } from '@/src/app/data-entry/hooks/useCustomers';
import { getStatusColor } from '@/src/app/data-entry/utils/constants';
import { loanTypes, customerStatusOptions, officeCategories } from '@/src/app/data-entry/utils/constants';

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

// Sort order type
type SortOrder = 'asc' | 'desc' | 'none';

// Helper function to check if a specific date payment exists
const hasPaymentOnDate = (loan: Loan, dateString: string): boolean => {
  if (!loan || !loan.emiHistory || !Array.isArray(loan.emiHistory)) {
    return false;
  }
  
  return loan.emiHistory.some(payment => 
    payment.paymentDate && payment.paymentDate.split('T')[0] === dateString
  );
};

// Loan Selection Modal Component
const LoanSelectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerDetails;
  onLoanSelect: (loan: Loan) => void;
}> = ({ isOpen, onClose, customer, onLoanSelect }) => {
  if (!isOpen) return null;

  const getPaymentStatus = (loan: Loan) => {
    const today = new Date().toISOString().split('T')[0];
    const todayPayment = (loan.emiHistory || []).find(payment => 
      payment.paymentDate && payment.paymentDate.split('T')[0] === today
    );
    
    return todayPayment ? 'Paid' : 'Unpaid';
  };

  // ✅ CHANGED: Get ALL loans without filtering
  const allLoans = customer.loans || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-auto max-h-[85vh] flex flex-col">
        {/* Header - Fixed height */}
        <div className="flex-shrink-0 bg-white px-8 py-6 border-b border-gray-200 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Select Loan for Payment
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {customer.name} • {customer.customerNumber}
              </p>
              <p className="text-xs text-blue-600 mt-2">
                💡 <strong>Advance payments allowed:</strong> You can make advance payments even if today's EMI is already paid.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* Body - Scrollable content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {allLoans.length > 0 ? (
            <div className="space-y-4">
              {allLoans.map((loan, index) => {
                const paymentStatus = getPaymentStatus(loan);
                const isPaidToday = paymentStatus === 'Paid';
                const loanId = loan._id || `loan-${index}`;
                
                return (
                  <div
                    key={loanId}
                    className={`p-5 border-2 rounded-xl transition-all duration-200 ${
                      isPaidToday 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
                    }`}
                    onClick={() => onLoanSelect(loan)} // ✅ ALWAYS clickable for advance payments
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isPaidToday ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                          }`}>
                            <span className="text-xl">
                              {isPaidToday ? '✓' : '₹'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-semibold text-gray-900 text-lg">
                                {loan.loanNumber || `Loan ${index + 1}`}
                              </p>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                loan.loanType === 'Daily' ? 'bg-blue-100 text-blue-800' :
                                loan.loanType === 'Monthly' ? 'bg-purple-100 text-purple-800' :
                                loan.loanType === 'Weekly' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {loan.loanType || 'Unknown'}
                              </span>
                              {isPaidToday && (
                                <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                                  Paid Today
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                              <div>
                                <p className="text-xs text-gray-500">EMI Amount</p>
                                <p className="font-medium text-gray-900">₹{(loan.emiAmount || 0)?.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Loan Amount</p>
                                <p className="font-medium text-gray-900">₹{(loan.amount || 0)?.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Next EMI Date</p>
                                <p className="font-medium text-gray-900">
                                  {loan.nextEmiDate ? new Date(loan.nextEmiDate).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Paid/Total</p>
                                <p className="font-medium text-gray-900">
                                  {loan.emiPaidCount || 0}/{loan.totalEmiCount || loan.loanDays || 0}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 mb-2">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                loan.status === 'active' ? 'bg-green-100 text-green-800' :
                                loan.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                loan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                loan.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                Status: {loan.status || 'unknown'}
                              </span>
                              {loan.isRenewed && (
                                <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                  Renewed
                                </span>
                              )}
                            </div>
                            
                            {isPaidToday && (
                              <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                                <p className="text-xs text-blue-700 flex items-center">
                                  <span className="mr-1">💡</span>
                                  <strong>Note:</strong> Today's EMI is paid. You can still make advance payments for future dates.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Button - ALWAYS ENABLED for advance payments */}
                      <div className="ml-4">
                        <button
                          onClick={() => onLoanSelect(loan)}
                          className={`px-6 py-3 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg min-w-[120px] ${
                            isPaidToday
                              ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                              : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
                          }`}
                        >
                          {isPaidToday ? 'Pay Advance' : 'Pay Now'}
                        </button>
                        {isPaidToday && (
                          <p className="text-xs text-blue-600 text-center mt-1">
                            (Advance Payment)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-300 text-6xl mb-6">💰</div>
              <h4 className="text-xl font-semibold text-gray-800 mb-3">No Loans Found</h4>
              <p className="text-gray-600 max-w-md mx-auto">
                This customer doesn't have any loans for EMI payment.
              </p>
            </div>
          )}
        </div>

        {/* Footer - Fixed height */}
        <div className="flex-shrink-0 bg-gray-50 px-8 py-6 border-t border-gray-200 rounded-b-lg">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{allLoans.length}</span> loan{allLoans.length !== 1 ? 's' : ''} found
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              {allLoans.length > 0 && (
                <button
                  onClick={() => {
                    if (allLoans.length > 0) {
                      onLoanSelect(allLoans[0]);
                    }
                  }}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {hasPaymentOnDate(allLoans[0], new Date().toISOString().split('T')[0]) 
                    ? 'Pay Advance (First Loan)' 
                    : 'Pay First Loan'}
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            💡 <strong>Tip:</strong> Even if today's EMI is paid, you can make advance payments for future dates.
          </div>
        </div>
      </div>
    </div>
  );
};

// Update the props interface
interface ExtendedCustomersSectionProps extends CustomersSectionProps {
  onAddNewCustomer?: () => void;
  onViewEMICalendar?: (customer: Customer) => void;
}

export default function CustomersSection({
  currentUserOffice,
  onViewCustomerDetails,
  onUpdateEMI,
  onEditCustomer,
  onAddLoan,
  refreshKey,
  onAddNewCustomer,
  onViewEMICalendar
}: ExtendedCustomersSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    customerNumber: '',
    loanType: '',
    status: '',
    officeCategory: ''
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  
  // State for loan selection modal
  const [showLoanSelection, setShowLoanSelection] = useState(false);
  const [selectedCustomerForEMI, setSelectedCustomerForEMI] = useState<CustomerDetails | null>(null);

  // Use customers hook with refreshKey
  const { 
    customers, 
    loading, 
    error, 
    refetch,
    fetchCustomerDetails 
  } = useCustomers(currentUserOffice, refreshKey);

  // Force fetch when component mounts or when switching to this tab
  useEffect(() => {
    console.log('🔄 CustomersSection - Component mounted or refreshKey changed:', refreshKey);
    
    const timer = setTimeout(() => {
      console.log('🚀 Auto-fetching customers...');
      refetch();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [refreshKey, refetch]);

  // Handle Add New Customer button
  const handleAddNewCustomerClick = () => {
    if (onAddNewCustomer) {
      onAddNewCustomer();
    } else {
      alert('Add New Customer functionality will be handled by the parent component');
    }
  };

  // Sort functionality
  const toggleSortOrder = () => {
    setSortOrder(current => {
      if (current === 'none') return 'asc';
      if (current === 'asc') return 'desc';
      return 'none';
    });
  };

  const getSortIcon = () => {
    switch (sortOrder) {
      case 'asc':
        return '↑';
      case 'desc':
        return '↓';
      default:
        return '⇅';
    }
  };

  // Sort and filter customers with numeric sorting
  const sortedAndFilteredCustomers = useMemo(() => {
    const filtered = customers.filter(customer => {
      const matchesSearch = searchQuery === '' || 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.customerNumber && customer.customerNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (customer.businessName && customer.businessName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (customer.area && customer.area.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCustomerNumber = filters.customerNumber === '' || 
        (customer.customerNumber && customer.customerNumber.toLowerCase().includes(filters.customerNumber.toLowerCase()));
      
      const matchesLoanType = filters.loanType === '' || 
        customer.loanType === filters.loanType;
      
      const matchesStatus = filters.status === '' || 
        customer.status === filters.status;

      const matchesOfficeCategory = filters.officeCategory === '' || 
        customer.officeCategory === filters.officeCategory;

      return matchesSearch && matchesCustomerNumber && matchesLoanType && matchesStatus && matchesOfficeCategory;
    });

    // Apply sorting if sortOrder is not 'none'
    if (sortOrder !== 'none') {
      filtered.sort((a, b) => {
        const customerNumberA = a.customerNumber || '';
        const customerNumberB = b.customerNumber || '';
        
        // Extract numeric part from customer numbers
        const extractNumber = (cn: string): number => {
          if (!cn) return 0;
          const numbers = cn.match(/\d+/g);
          if (!numbers || numbers.length === 0) return 0;
          const combinedNumber = numbers.join('');
          return parseInt(combinedNumber, 10) || 0;
        };
        
        const numA = extractNumber(customerNumberA);
        const numB = extractNumber(customerNumberB);
        
        // If both have valid numbers, compare numerically
        if (numA > 0 && numB > 0) {
          return sortOrder === 'asc' ? numA - numB : numB - numA;
        }
        
        // Fallback to string comparison
        if (customerNumberA < customerNumberB) {
          return sortOrder === 'asc' ? -1 : 1;
        }
        if (customerNumberA > customerNumberB) {
          return sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [customers, searchQuery, filters, sortOrder]);

  // FIXED: Now fetches complete customer details with loans before showing View Details
  const handleViewDetails = async (customer: Customer) => {
    try {
      const customerId = customer._id || customer.id;
      if (!customerId) {
        alert('Customer ID not found');
        return;
      }

      console.log('🔍 Fetching customer details for:', customer.name);
      
      const details = await fetchCustomerDetails(customerId);
      if (details) {
        console.log('✅ Customer details fetched, loans count:', details.loans?.length || 0);
        onViewCustomerDetails(details);
      } else {
        alert('Failed to fetch customer details');
      }
    } catch (error: any) {
      console.error('Error fetching customer details:', error);
      alert('Failed to fetch customer details: ' + error.message);
    }
  };

 // ✅ COMPLETELY REMOVED VALIDATION: Handle EMI button click - NO VALIDATION AT ALL
const handleUpdateEMIClick = async (customer: Customer) => {
  try {
    const customerId = customer._id || customer.id;
    if (!customerId) {
      alert('Customer ID not found');
      return;
    }

    console.log('🚀 Starting EMI update process for:', customer.name);
    console.log('📞 Fetching fresh customer details...');
    
    const details = await fetchCustomerDetails(customerId);
    if (details) {
      console.log('✅ Customer details fetched successfully:', details.name);
      
      // ✅ COMPLETELY REMOVED VALIDATION: Use ALL loans regardless of status
      const customerLoans = details.loans || [];
      console.log('📦 Total loans found (no filtering):', customerLoans.length);
      
      // 🚨 DEBUG: Show all loans with their status
      console.log('🔍 ALL LOANS (NO FILTERING):', customerLoans.map(loan => ({
        loanNumber: loan.loanNumber,
        status: loan.status,
        emiPaidCount: loan.emiPaidCount,
        totalEmiCount: loan.totalEmiCount,
        isRenewed: loan.isRenewed,
        isCompleted: (loan.emiPaidCount || 0) >= (loan.totalEmiCount || loan.loanDays || 0)
      })));
      
      if (customerLoans.length === 0) {
        // Only show alert if there are NO loans at all
        alert(`❌ No loans found for ${details.name}. Please add a loan first.`);
        return;
      }
      
      console.log('🎉 Proceeding with EMI payment (NO VALIDATION)...');
      
      if (customerLoans.length === 1) {
        // If only one loan, directly proceed to EMI payment
        console.log('📤 Calling onUpdateEMI with loan:', customerLoans[0].loanNumber);
        onUpdateEMI(details, customerLoans[0]);
      } else {
        // If multiple loans, show selection modal
        console.log('📋 Multiple loans found, showing selection modal');
        setSelectedCustomerForEMI(details);
        setShowLoanSelection(true);
      }
    } else {
      console.error('❌ Failed to fetch customer details');
      alert('Failed to fetch customer loan details');
    }
  } catch (error: any) {
    console.error('❌ Error in handleUpdateEMIClick:', error);
    alert('Failed to fetch customer details: ' + error.message);
  }
};

  // Handle EMI Calendar button click
  const handleViewEMICalendarClick = async (customer: Customer) => {
    try {
      const customerId = customer._id || customer.id;
      if (!customerId) {
        alert('Customer ID not found');
        return;
      }

      console.log('🔍 Fetching customer details for EMI calendar:', customer.name);
      
      const details = await fetchCustomerDetails(customerId);
      if (details) {
        console.log('✅ Customer details fetched for EMI calendar');
        // Call the onViewEMICalendar prop if provided
        if (onViewEMICalendar) {
          onViewEMICalendar(details);
        } else {
          console.warn('onViewEMICalendar prop not provided, showing customer details instead');
          onViewCustomerDetails(details);
        }
      } else {
        alert('Failed to fetch customer details for EMI calendar');
      }
    } catch (error: any) {
      console.error('Error fetching customer details for EMI calendar:', error);
      alert('Failed to fetch customer details: ' + error.message);
    }
  };

  // Handle loan selection from modal
  const handleLoanSelect = (loan: Loan) => {
    if (selectedCustomerForEMI) {
      console.log('✅ Loan selected for payment:', loan.loanNumber);
      onUpdateEMI(selectedCustomerForEMI, loan);
      setShowLoanSelection(false);
      setSelectedCustomerForEMI(null);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error.message || 'Failed to load customers'} />;
  }

  const customersToDisplay = sortedAndFilteredCustomers;

  return (
    <div className="w-full px-4 py-6">
      {/* Loan Selection Modal */}
      {showLoanSelection && selectedCustomerForEMI && (
        <LoanSelectionModal
          isOpen={showLoanSelection}
          onClose={() => {
            console.log('🔒 Closing loan selection modal');
            setShowLoanSelection(false);
            setSelectedCustomerForEMI(null);
          }}
          customer={selectedCustomerForEMI}
          onLoanSelect={handleLoanSelect}
        />
      )}

      <div className="mb-6">
        {/* Header with Add New Customer Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
            <p className="text-sm text-gray-600 mt-1">Manage all customer records and information</p>
          </div>
          
          <button
            onClick={handleAddNewCustomerClick}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            <span>Add New Customer (Requires Admin Approval)</span>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          {/* Wider Search Bar */}
          <div className="relative w-full sm:w-2/3">
            <input
              type="text"
              placeholder="Search by customer name, number, business, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <span className="text-gray-400 text-lg">🔍</span>
            </div>
          </div>
          
          {/* Filter and Sort Buttons */}
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-5 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-sm"
            >
              <span className="font-medium">Filters</span>
              <span className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            <button
              onClick={toggleSortOrder}
              className="px-5 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-sm"
              title={`Sort by Customer Number (${sortOrder === 'asc' ? 'Ascending' : sortOrder === 'desc' ? 'Descending' : 'None'})`}
            >
              <span className="font-medium">Sort</span>
              <span className="text-blue-600 font-bold">{getSortIcon()}</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-4 p-6 bg-gray-50 rounded-xl border border-gray-200 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Number
                </label>
                <input
                  type="text"
                  value={filters.customerNumber}
                  onChange={(e) => setFilters({ ...filters, customerNumber: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter customer number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loan Type
                </label>
                <select
                  value={filters.loanType}
                  onChange={(e) => setFilters({ ...filters, loanType: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  {loanTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  {customerStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Office Category
                </label>
                <select
                  value={filters.officeCategory}
                  onChange={(e) => setFilters({ ...filters, officeCategory: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Offices</option>
                  {officeCategories.map((office) => (
                    <option key={office} value={office}>
                      {office}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setFilters({
                  customerNumber: '',
                  loanType: '',
                  status: '',
                  officeCategory: ''
                })}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-800">{customersToDisplay.length}</span> of <span className="font-semibold text-gray-800">{customers.length}</span> customers
          {sortOrder !== 'none' && (
            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Sorted: {sortOrder === 'asc' ? 'Ascending (CN001 → CN999)' : 'Descending (CN999 → CN001)'}
            </span>
          )}
        </div>
      </div>

      {/* Customers Table */}
      {customersToDisplay.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
          <div className="text-gray-300 text-6xl mb-6">👥</div>
          <h3 className="text-2xl font-semibold text-gray-800 mb-3">
            {customers.length === 0 ? 'No customers found' : 'No matching customers'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg">
            {customers.length === 0 
              ? 'Start by adding your first customer using the button above.'
              : 'Try adjusting your search or filters to find what you\'re looking for.'
            }
          </p>
          {customers.length === 0 && (
            <button
              onClick={handleAddNewCustomerClick}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Add Your First Customer
            </button>
          )}
        </div>
      ) : (
        <div className="w-full bg-white shadow-md rounded-lg border border-gray-200">
          {/* Table Container with Full Width */}
          <div className="w-full overflow-hidden">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-1/6">
                    Customer Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-1/6">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-1/4">
                    Business
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-1/6">
                    Office
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-1/3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {customersToDisplay.map((customer) => {
                  return (
                    <tr 
                      key={customer._id || customer.id} 
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      {/* Customer Number Column */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.customerNumber || 'CN0000'}
                        </div>
                      </td>
                      
                      {/* Name Column */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.name || 'N/A'}
                        </div>
                      </td>
                      
                      {/* Business Column */}
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.businessName || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {customer.area || 'No Area'}
                        </div>
                      </td>
                      
                      {/* Office Column */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.officeCategory || 'Not Assigned'}
                        </div>
                      </td>
                      
                      {/* Actions Column */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {/* Update EMI Button */}
                          <button
                            onClick={() => handleUpdateEMIClick(customer)}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors duration-200"
                          >
                            Update EMI
                          </button>
                          
                          {/* View Details Button */}
                          <button
                            onClick={() => handleViewDetails(customer)}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors duration-200"
                          >
                            View Details
                          </button>
                          
                          {/* EMI Calendar Button */}
                          <button
                            onClick={() => handleViewEMICalendarClick(customer)}
                            className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors duration-200"
                          >
                            EMI Calendar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer */}
          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {customersToDisplay.length} customers
              </div>
              <div className="flex space-x-2">
                <button
                  disabled
                  className="px-3 py-1 text-sm text-gray-400 bg-gray-100 rounded cursor-not-allowed"
                >
                  ← Previous
                </button>
                <button
                  disabled
                  className="px-3 py-1 text-sm text-gray-400 bg-gray-100 rounded cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}