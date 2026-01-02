'use client';

import { useState, useEffect } from 'react';
import { Customer, CustomerDetails, Loan, EMIHistory } from '@/src/app/data-entry/types/dataEntry';
import {
  getAllCustomerLoans,
  calculateEMICompletion,
  calculatePaymentBehavior,
  calculateTotalLoanAmount
} from '@/src/app/data-entry/utils/loanCalculations';
import { useCustomers } from '@/src/app/data-entry/hooks/useCustomers';

// ============================================================================
// IMPORT UPDATED DATE UTILITIES
// ============================================================================
import {
  formatToDDMMYYYY,
  safeFormatDate,
  parseISTDateString,
  convertUTCToIST
} from '@/src/app/data-entry/utils/dateCalculations';

// Import the separated EMITransactionsModal
import EMITransactionsModal, { EMITransaction } from './EMITransactionsModal';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | CustomerDetails;
  onEditCustomer?: (customer: CustomerDetails) => void;
  onEditLoan?: (loan: Loan) => void;
  onRenewLoan?: (loan: Loan) => void;
  onDeleteLoan?: (loan: Loan) => void;
  onViewEMICalendar?: (customer: Customer) => void;
  onAddLoan?: () => void;
  currentUserOffice: string;
}

// Helper function to get all customer loans
const getCustomerLoans = (customer: Customer | CustomerDetails, customerDetails?: CustomerDetails | null): Loan[] => {
  // If we have customerDetails with loans array, use that
  if (customerDetails?.loans && Array.isArray(customerDetails.loans)) {
    return customerDetails.loans;
  }
  
  // Otherwise, try to extract loans from the customer object
  if (customer && 'loans' in customer && Array.isArray(customer.loans)) {
    return customer.loans;
  }
  
  // If customer has loan fields directly (single loan case)
  const singleLoan = customer as any;
  if (singleLoan.loanNumber || singleLoan.amount) {
    return [singleLoan as Loan];
  }
  
  return [];
};

// ============================================================================
// FIXED: Helper function to format dates - handles YYYY-MM-DD strings directly
// ============================================================================
const formatLoanDate = (dateValue: any): string => {
  if (!dateValue) return 'N/A';
  
  // If it's already a Date object (legacy data)
  if (dateValue instanceof Date) {
    return formatToDDMMYYYY(dateValue);
  }
  
  // If it's a string in YYYY-MM-DD format (from API)
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    // Convert YYYY-MM-DD to DD/MM/YYYY directly - NO Date object creation
    const [year, month, day] = dateValue.split('-');
    return `${day}/${month}/${year}`;
  }
  
  // If it's a string in other format
  if (typeof dateValue === 'string') {
    // Try to parse as IST date
    try {
      const dateObj = parseISTDateString(dateValue);
      return formatToDDMMYYYY(dateObj);
    } catch {
      // If parsing fails, try to extract date parts
      const dateMatch = dateValue.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return `${day}/${month}/${year}`;
      }
    }
  }
  
  // Fallback to safeFormatDate for other formats
  return safeFormatDate(dateValue);
};

// Helper function to get EMI type display text
const getEMITypeDisplay = (loan: Loan): string => {
  if (loan.loanType === 'Daily') {
    return 'Fixed EMI';
  }
  
  if (loan.emiType === 'custom' && loan.customEmiAmount) {
    return `Custom EMI (Last: ₹${loan.customEmiAmount.toLocaleString('en-IN')})`;
  }
  
  return 'Fixed EMI';
};

// Helper function to get EMI type badge color
const getEMITypeBadgeClass = (loan: Loan): string => {
  if (loan.loanType === 'Daily') {
    return 'bg-blue-100 text-blue-800 border-blue-300';
  }
  
  if (loan.emiType === 'custom') {
    return 'bg-purple-100 text-purple-800 border-purple-300';
  }
  
  return 'bg-green-100 text-green-800 border-green-300';
};

// ============================================================================
// FIXED: Helper function to calculate total loan amount for a loan
// ============================================================================
const getLoanTotalAmount = (loan: Loan): number => {
  // First try to use loanAmount from loan object
  if (loan.loanAmount) {
    return loan.loanAmount;
  }
  
  // For custom EMI loans - FIXED CALCULATION
  if (loan.emiType === 'custom' && loan.customEmiAmount !== undefined && loan.customEmiAmount !== null) {
    const totalPeriods = loan.loanDays || loan.totalEmiCount || 0;
    const regularEmiCount = Math.max(0, totalPeriods - 1);
    const regularAmount = (loan.emiAmount || 0) * regularEmiCount;
    const totalAmount = regularAmount + (loan.customEmiAmount || 0);
    return totalAmount;
  }
  
  // For fixed EMI loans
  const totalPeriods = loan.loanDays || loan.totalEmiCount || 0;
  return (loan.emiAmount || 0) * totalPeriods;
};

// ============================================================================
// NEW: Function to get EMI amount display text correctly
// ============================================================================
const getEMIAmountDisplay = (loan: Loan): string => {
  if (loan.emiType === 'custom' && loan.customEmiAmount !== undefined && loan.customEmiAmount !== null) {
    const totalPeriods = loan.loanDays || loan.totalEmiCount || 0;
    const regularPeriods = Math.max(0, totalPeriods - 1);
    
    if (regularPeriods > 0) {
      return `₹${(loan.emiAmount || 0).toLocaleString('en-IN')} × ${regularPeriods} weeks + ₹${loan.customEmiAmount.toLocaleString('en-IN')} (final)`;
    } else {
      return `₹${loan.customEmiAmount.toLocaleString('en-IN')} (one-time)`;
    }
  }
  
  // For fixed EMI
  return `₹${(loan.emiAmount || 0).toLocaleString('en-IN')}`;
};

// ============================================================================
// NEW: Function to fetch EMI transactions for a customer
// ============================================================================
const fetchEMITransactions = async (customerId: string): Promise<EMITransaction[]> => {
  try {
    console.log('📥 Fetching EMI transactions for customer:', customerId);
    
    // First try the new API endpoint
    let response = await fetch(`/api/data-entry/emi-payments?customerId=${customerId}&limit=100`);
    
    if (!response.ok) {
      console.log('⚠️ Trying alternative API endpoint...');
      // Try alternative endpoint
      response = await fetch(`/api/emi/payments?customerId=${customerId}&limit=100`);
    }
    
    if (!response.ok) {
      throw new Error(`Failed to fetch EMI transactions: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('📊 EMI transactions API response:', data);
    
    if (data.success && data.data && data.data.payments) {
      return data.data.payments.map((payment: any) => ({
        _id: payment._id,
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        loanNumber: payment.loanNumber || 'N/A',
        collectedBy: payment.collectedBy || 'Unknown',
        status: payment.status || 'Paid',
        paymentMethod: payment.paymentMethod,
        notes: payment.notes
      }));
    } else if (data.success && Array.isArray(data.data)) {
      // Alternative response format
      return data.data.map((payment: any) => ({
        _id: payment._id,
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        loanNumber: payment.loanNumber || 'N/A',
        collectedBy: payment.collectedBy || 'Unknown',
        status: payment.status || 'Paid',
        paymentMethod: payment.paymentMethod,
        notes: payment.notes
      }));
    }
    
    console.log('⚠️ No transactions found in response');
    return [];
  } catch (error) {
    console.error('❌ Error fetching EMI transactions:', error);
    // Return empty array instead of throwing to prevent UI crash
    return [];
  }
};

export default function CustomerDetailsModal({
  isOpen,
  onClose,
  customer,
  onEditCustomer,
  onEditLoan,
  onRenewLoan,
  onDeleteLoan,
  onViewEMICalendar,
  onAddLoan,
  currentUserOffice
}: CustomerDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [customerLoans, setCustomerLoans] = useState<Loan[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // NEW: State for EMI Transactions modal
  const [showEMITransactions, setShowEMITransactions] = useState(false);
  const [emiTransactions, setEmiTransactions] = useState<EMITransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const { fetchCustomerDetails, clearCustomerCache } = useCustomers(currentUserOffice);

  // Load customer details when modal opens
  useEffect(() => {
    if (isOpen && customer) {
      loadCustomerDetails();
    }
  }, [isOpen, customer]);

  // Reset delete state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsDeleting(false);
      setShowEMITransactions(false);
    }
  }, [isOpen]);

  const loadCustomerDetails = async () => {
    setIsLoading(true);
    try {
      const customerId = (customer as CustomerDetails)._id || (customer as Customer)._id;
      
      if (!customerId) {
        console.error('Customer ID not found');
        return;
      }

      // Clear cache first to ensure fresh data
      clearCustomerCache(customerId);
      
      const details = await fetchCustomerDetails(customerId);
      setCustomerDetails(details);
      
      // Get customer loans
      const loans = getCustomerLoans(customer, details);
      setCustomerLoans(loans);
      
      console.log('✅ Customer details loaded:', {
        customerName: details?.name,
        loansCount: loans.length
      });
      
    } catch (error: any) {
      console.error('❌ Error fetching customer details:', error);
      alert('Failed to load customer details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Handle EMI Transactions button click
  const handleEMITransactionsClick = async () => {
  if (!customerDetails) {
    alert('Customer details not loaded. Please wait...');
    return;
  }
  
  setLoadingTransactions(true);
  try {
    // Clear cache before fetching
    clearCustomerCache(customerDetails._id);
    
    const transactions = await fetchEMITransactions(customerDetails._id);
    setEmiTransactions(transactions);
    setShowEMITransactions(true);
    console.log(`✅ Loaded ${transactions.length} EMI transactions`);
  } catch (error) {
    console.error('❌ Error loading EMI transactions:', error);
    alert('Failed to load EMI transactions. Please check the console for details.');
  } finally {
    setLoadingTransactions(false);
  }
};

  // Handle delete loan click
  const handleDeleteLoanClick = (loan: Loan) => {
    console.log('🗑️ Opening delete confirmation for loan:', loan.loanNumber);
    setIsDeleting(true);
    if (onDeleteLoan) {
      onDeleteLoan(loan);
    }
  };

  // Handle refresh after successful operation
  const handleRefreshData = async () => {
    if (customerDetails) {
      await loadCustomerDetails();
    }
  };

  if (!isOpen) return null;

  const displayCustomer = customerDetails || customer;
  const loans = customerLoans.length > 0 ? customerLoans : getCustomerLoans(customer, customerDetails);

  return (
    <>
      {/* BACKDROP - Only show if not deleting */}
      {!isDeleting && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          {/* Modal content */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-auto max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-8 py-5 border-b border-gray-200 z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Customer Details
                  </h3>
                  {displayCustomer && (
                    <p className="text-sm text-gray-500 mt-1">
                      {displayCustomer.customerNumber} • {displayCustomer.name}
                    </p>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleRefreshData}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors flex items-center"
                    title="Refresh customer data"
                  >
                    <span className="mr-2">🔄</span> Refresh
                  </button>
                  {onEditCustomer && displayCustomer && (
                    <button
                      onClick={() => onEditCustomer(displayCustomer as CustomerDetails)}
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
                    >
                      Edit Customer
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 transition-colors p-1"
                  >
                    <span className="text-3xl">×</span>
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading customer details...</p>
              </div>
            ) : displayCustomer ? (
              <div className="p-8">
                {/* Personal Information Card */}
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 mb-6">
                  <div className="px-8 py-4 border-b border-gray-200">
                    <h4 className="text-lg font-bold text-gray-900">Personal Information</h4>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column with Profile and Contact Info */}
                      <div className="space-y-4">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                              <span className="text-blue-600 text-2xl">👤</span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-gray-500 mb-1">Full Name</p>
                            <p className="font-bold text-gray-900 text-base mb-2">{displayCustomer.name}</p>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                displayCustomer.officeCategory === 'Office 1' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {displayCustomer.officeCategory}
                              </span>
                            </div>
                            
                            {/* Phone numbers */}
                            <div className="space-y-2 mt-4">
                              <div>
                                <p className="text-xs font-medium text-gray-500">Primary Phone</p>
                                <p className="font-bold text-gray-900 text-sm">
                                  {Array.isArray(displayCustomer.phone) ? displayCustomer.phone[0] : displayCustomer.phone}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Alternate Phone</p>
                                <p className="font-bold text-gray-900 text-sm">
                                  {Array.isArray(displayCustomer.phone) ? (displayCustomer.phone[1] || 'N/A') : 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">WhatsApp Number</p>
                                <p className="font-bold text-gray-900 text-sm">
                                  {displayCustomer.whatsappNumber || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Customer and Area Info */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Customer Number</p>
                          <p className="font-bold text-gray-900 text-sm">{displayCustomer.customerNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">Area/Location</p>
                          <p className="font-bold text-gray-900 text-sm">{displayCustomer.area || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Information Card */}
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 mb-8">
                  <div className="px-8 py-4 border-b border-gray-200">
                    <h4 className="text-lg font-bold text-gray-900">Business Information</h4>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Business Name</p>
                        <p className="font-bold text-gray-900 text-sm">{displayCustomer.businessName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Area/Location</p>
                        <p className="font-bold text-gray-900 text-sm">{displayCustomer.area || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Business Address</p>
                        <p className="font-bold text-gray-900 text-sm whitespace-pre-line">
                          {displayCustomer.address || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loan Information Section */}
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 mb-8">
                  <div className="px-8 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h4 className="text-lg font-bold text-gray-900">Loan Information</h4>
                    <div className="flex space-x-3">
                      {onAddLoan && (
                        <button
                          onClick={onAddLoan}
                          className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                        >
                          Add New Loan
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-6">
                    {loans.length > 0 ? (
                      <div className="space-y-6">
                        {loans.map((loan: Loan, index: number) => {
                          const completion = calculateEMICompletion(loan);
                          const paymentBehaviorResult = calculatePaymentBehavior(loan);
                          const paymentBehavior = typeof paymentBehaviorResult === 'string' 
                            ? paymentBehaviorResult 
                            : paymentBehaviorResult.behaviorRating;
                          const isRenewed = loan.isRenewed || loan.status === 'renewed';
                          
                          // Calculate remaining amount and EMIs
                          const totalLoanAmount = getLoanTotalAmount(loan);
                          const remainingAmount = Math.max(totalLoanAmount - (completion.totalPaid || 0), 0);
                          const remainingEmis = completion.remainingEmis;
                          const totalEmis = loan.totalEmiCount || loan.loanDays || 30;
                          const paidEmis = loan.emiPaidCount || 0;
                          
                          // Get EMI type display
                          const emiTypeDisplay = getEMITypeDisplay(loan);
                          const emiTypeBadgeClass = getEMITypeBadgeClass(loan);
                          const emiAmountDisplay = getEMIAmountDisplay(loan);
                          
                          // Format dates
                          const formattedNextEmiDate = formatLoanDate(loan.nextEmiDate);

// FIX: Only show last payment date if payments have actually been made
// Check if there are any payments (emiPaidCount > 0 OR totalPaidAmount > 0)
const hasPayments = (loan.emiPaidCount && loan.emiPaidCount > 0) || (loan.totalPaidAmount && loan.totalPaidAmount > 0);
const formattedLastPaymentDate = hasPayments && loan.lastEmiDate ? formatLoanDate(loan.lastEmiDate) : 'N/A';

// Debug log to verify the fix
console.log('🔍 Payment Status Check:', {
  loanNumber: loan.loanNumber,
  emiPaidCount: loan.emiPaidCount,
  totalPaidAmount: loan.totalPaidAmount,
  lastEmiDate: loan.lastEmiDate,
  hasPayments: hasPayments,
  displayValue: formattedLastPaymentDate
});
                          const formattedEmiStartDate = formatLoanDate(loan.emiStartDate);
                          const formattedDateApplied = formatLoanDate(loan.dateApplied);
                          
                          // Debug log for custom EMI loans
                          if (loan.emiType === 'custom') {
                            console.log('🔍 Custom EMI Loan Calculation:', {
                              loanNumber: loan.loanNumber,
                              emiAmount: loan.emiAmount,
                              customEmiAmount: loan.customEmiAmount,
                              loanDays: loan.loanDays,
                              totalEmiCount: loan.totalEmiCount,
                              calculatedTotal: totalLoanAmount,
                              emiAmountDisplay: emiAmountDisplay
                            });
                          }
                          
                          return (
                            <div 
                              key={loan._id || index} 
                              className={`border ${isRenewed ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-xl p-6 hover:shadow-lg transition-all`}
                            >
                              {/* Loan Header */}
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h5 className="font-bold text-gray-900 text-lg mb-2">
                                    {loan.loanNumber || `Loan ${index + 1}`}
                                  </h5>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                      loan.status === 'active' ? 'bg-green-100 text-green-800' :
                                      loan.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                      loan.status === 'defaulted' ? 'bg-red-100 text-red-800' :
                                      loan.status === 'renewed' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {loan.status}
                                    </span>
                                    {isRenewed && (
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
                                        🔄 Renewed → {loan.renewedLoanNumber || 'New Loan'}
                                      </span>
                                    )}
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                      loan.loanType === 'Daily' ? 'bg-blue-100 text-blue-800' :
                                      loan.loanType === 'Weekly' ? 'bg-green-100 text-green-800' :
                                      'bg-purple-100 text-purple-800'
                                    }`}>
                                      {loan.loanType}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold border ${emiTypeBadgeClass}`}>
                                      {emiTypeDisplay}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Loan Dates Summary */}
                              <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">Loan Date</p>
                                    <p className="font-semibold text-gray-900 text-sm">{formattedDateApplied || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">EMI Start Date</p>
                                    <p className="font-semibold text-gray-900 text-sm">{formattedEmiStartDate || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">Last Payment</p>
                                    <p className="font-semibold text-gray-900 text-sm">{formattedLastPaymentDate}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-500 mb-1">Next EMI Date</p>
                                    <p className="font-semibold text-gray-900 text-sm">{formattedNextEmiDate || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Completion Percentage - FIXED: Use actual paid amount */}
                              <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="flex justify-between items-center mb-2">
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700 mb-1">Completion</p>
                                    <p className="font-bold text-xl text-blue-700">
                                      {completion.completionPercentage.toFixed(1)}%
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs font-medium text-gray-600 mb-1">EMI Remaining</p>
                                    <p className="font-semibold text-base text-gray-900">
                                      {remainingEmis} of {totalEmis}
                                    </p>
                                  </div>
                                </div>
                                <div className="w-full bg-blue-100 rounded-full h-2 mb-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                                    style={{width: `${Math.min(completion.completionPercentage, 100)}%`}}
                                  ></div>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <div className="text-gray-600">
                                    <span>Paid: </span>
                                    <span className="font-semibold">
                                      {/* FIXED: Use totalPaid from completion object */}
                                      ₹{(completion.totalPaid || 0).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="text-gray-600">
                                    <span>Remaining: </span>
                                    <span className="font-semibold">
                                      ₹{remainingAmount.toLocaleString()} of ₹{totalLoanAmount.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Loan Stats Grid - FIXED EMI Amount Display */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs font-medium text-gray-500 mb-1">Total Loan Amount</p>
                                  <p className="font-semibold text-gray-900 text-sm">
                                    ₹{totalLoanAmount.toLocaleString()}
                                  </p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs font-medium text-gray-500 mb-1">
                                    {loan.emiType === 'custom' ? 'EMI Structure' : 'EMI Amount'}
                                  </p>
                                  <p className="font-semibold text-gray-900 text-sm">
                                    {emiAmountDisplay}
                                  </p>
                                  {loan.emiType === 'custom' && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Total: ₹{totalLoanAmount.toLocaleString()}
                                    </p>
                                  )}
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs font-medium text-gray-500 mb-1">No. of {loan.loanType === 'Daily' ? 'Days' : loan.loanType === 'Weekly' ? 'Weeks' : 'Months'}</p>
                                  <p className="font-semibold text-gray-900 text-sm">
                                    {loan.totalEmiCount || loan.loanDays || 30}
                                  </p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                  <p className="text-xs font-medium text-gray-500 mb-1">Payment Behavior</p>
                                  <p className="font-semibold text-gray-900 text-sm">
                                    {paymentBehavior || 'N/A'}
                                  </p>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex space-x-2 border-t border-gray-200 pt-4">
                                {onEditLoan && !isRenewed && (
                                  <button
                                    onClick={() => onEditLoan(loan)}
                                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-xs font-medium transition-colors flex-1"
                                  >
                                    Edit
                                  </button>
                                )}
                                {loan.status === 'active' && !isRenewed && onRenewLoan && (
                                  <button
                                    onClick={() => onRenewLoan(loan)}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs font-medium transition-colors flex-1"
                                  >
                                    Renew
                                  </button>
                                )}
                                {onDeleteLoan && !isRenewed && (
                                  <button
                                    onClick={() => handleDeleteLoanClick(loan)}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium transition-colors flex-1"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400 text-4xl mb-4">💰</div>
                        <p className="text-gray-500 text-lg font-semibold">No loans found</p>
                        <p className="text-gray-400 text-sm mt-2">
                          This customer doesn't have any active loans
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="text-red-400 text-4xl mb-4">⚠️</div>
                <p className="text-gray-600 text-lg font-semibold">Failed to load customer details</p>
                <button
                  onClick={onClose}
                  className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Go Back
                </button>
              </div>
            )}

            <div className="sticky bottom-0 bg-white px-8 py-5 border-t border-gray-200">
              <div className="flex justify-between">
                <div className="flex space-x-3">
                  {onViewEMICalendar && (
                    <button
                      onClick={() => onViewEMICalendar(customer as Customer)}
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                    >
                      View EMI Calendar
                    </button>
                  )}
                  {/* EMI Transactions Button - ONLY in footer as requested */}
                  <button
                    onClick={handleEMITransactionsClick}
                    disabled={loadingTransactions}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center"
                  >
                    {loadingTransactions ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                        Loading...
                      </>
                    ) : (
                      'View EMI Transactions'
                    )}
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* NEW: EMI Transactions Modal */}
      {showEMITransactions && customerDetails && (
        <EMITransactionsModal
  isOpen={showEMITransactions}
  onClose={() => setShowEMITransactions(false)}
  customer={customerDetails}
  transactions={emiTransactions}
  onRefresh={handleRefreshData} // ✅ ADD THIS
/>
      )}
    </>
  );
}