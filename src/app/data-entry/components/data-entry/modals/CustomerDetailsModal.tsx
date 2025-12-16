'use client';

import { useState, useEffect } from 'react';
import { Customer, CustomerDetails, Loan, EMIHistory } from '@/src/app/data-entry/types/dataEntry';
import { formatDateToDDMMYYYY } from '@/src/app/data-entry/utils/dateCalculations';
import {
  getAllCustomerLoans,
  calculateEMICompletion,
  calculatePaymentBehavior,
  calculateTotalLoanAmount
} from '@/src/app/data-entry/utils/loanCalculations';
import { useCustomers } from '@/src/app/data-entry/hooks/useCustomers';

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

// Helper function to calculate total loan amount from loans array
const calculateTotalLoanAmountFromLoans = (loans: Loan[]): number => {
  if (!loans || loans.length === 0) return 0;
  
  return loans.reduce((total, loan) => {
    // Use totalLoanAmount if available, otherwise calculate it
    const loanAmount = loan.totalLoanAmount || calculateTotalLoanAmount(loan) || loan.amount || 0;
    return total + loanAmount;
  }, 0);
};

// Helper function to get last payment date from EMI history
const getLastPaymentDate = (loan: Loan): string | null => {
  if (loan.emiHistory && loan.emiHistory.length > 0) {
    // Sort by payment date to get the most recent
    const sortedHistory = [...loan.emiHistory].sort((a, b) => {
      const dateA = new Date(a.paymentDate).getTime();
      const dateB = new Date(b.paymentDate).getTime();
      return dateB - dateA;
    });
    return sortedHistory[0].paymentDate;
  }
  return null;
};

// Helper function to safely format dates
const safeFormatDate = (date: any): string => {
  if (!date) return 'N/A';
  
  // If it's already a string, return it as is or try to format
  if (typeof date === 'string') {
    return formatDateToDDMMYYYY(date);
  }
  
  // If it's a Date object, convert to string first
  if (date instanceof Date) {
    return formatDateToDDMMYYYY(date.toISOString());
  }
  
  // For any other type, try to convert to string
  try {
    return formatDateToDDMMYYYY(String(date));
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
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

// Helper function to calculate total loan amount for a loan
const getLoanTotalAmount = (loan: Loan): number => {
  // First try to use totalLoanAmount from loan object
  if (loan.totalLoanAmount) {
    return loan.totalLoanAmount;
  }
  
  // Calculate based on loan type and EMI type
  if (loan.loanType === 'Daily') {
    return (loan.emiAmount || 0) * (loan.loanDays || 0);
  } else if (loan.loanType === 'Weekly' || loan.loanType === 'Monthly') {
    if (loan.emiType === 'custom' && loan.customEmiAmount) {
      const fixedPeriods = (loan.loanDays || 0) - 1;
      const fixedAmount = (loan.emiAmount || 0) * fixedPeriods;
      return fixedAmount + loan.customEmiAmount;
    } else {
      return (loan.emiAmount || 0) * (loan.loanDays || 0);
    }
  }
  
  // Fallback to amount field
  return loan.amount || 0;
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

  const { fetchCustomerDetails } = useCustomers(currentUserOffice);

  // Load customer details when modal opens
  useEffect(() => {
    if (isOpen && customer) {
      loadCustomerDetails();
    }
  }, [isOpen, customer]);

  const loadCustomerDetails = async () => {
    setIsLoading(true);
    try {
      const customerId = (customer as CustomerDetails)._id || (customer as Customer)._id;
      
      if (!customerId) {
        console.error('Customer ID not found');
        return;
      }

      const details = await fetchCustomerDetails(customerId);
      setCustomerDetails(details);
      
      // Get customer loans
      const loans = getCustomerLoans(customer, details);
      setCustomerLoans(loans);
    } catch (error: any) {
      console.error('Error fetching customer details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const displayCustomer = customerDetails || customer;
  const loans = customerLoans.length > 0 ? customerLoans : getCustomerLoans(customer, customerDetails);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      {/* Increased width from max-w-4xl to max-w-5xl and adjusted overall width */}
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
            {/* Personal Information Card - UPDATED: Business Name removed */}
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
                        
                        {/* Phone numbers positioned right below the name and category */}
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

                  {/* Right Column - Customer and Area Info - UPDATED: Business Name removed */}
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

            {/* Business Information Card - UPDATED: Business Name added as first field */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 mb-8">
              <div className="px-8 py-4 border-b border-gray-200">
                <h4 className="text-lg font-bold text-gray-900">Business Information</h4>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Business Name Column - ADDED as first field */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Business Name</p>
                    <p className="font-bold text-gray-900 text-sm">{displayCustomer.businessName || 'N/A'}</p>
                  </div>

                  {/* Area/Location Column */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Area/Location</p>
                    <p className="font-bold text-gray-900 text-sm">{displayCustomer.area || 'N/A'}</p>
                  </div>

                  {/* Address Column */}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Business Address</p>
                    <p className="font-bold text-gray-900 text-sm whitespace-pre-line">
                      {displayCustomer.address || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Loan Information Section - UPDATED: Added EMI type display */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 mb-8">
              <div className="px-8 py-4 border-b border-gray-200 flex justify-between items-center">
                <h4 className="text-lg font-bold text-gray-900">Loan Information</h4>
                {onAddLoan && (
                  <button
                    onClick={onAddLoan}
                    className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                  >
                    Add New Loan (Requires Approval)
                  </button>
                )}
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
                      const lastPaymentDate = getLastPaymentDate(loan);
                      
                      // Calculate remaining amount and EMIs
                      const totalLoanAmount = getLoanTotalAmount(loan); // Use helper function
                      const remainingAmount = Math.round(totalLoanAmount * (1 - completion.completionPercentage/100));
                      const remainingEmis = completion.remainingEmis;
                      const totalEmis = loan.totalEmiCount || loan.loanDays || 30;
                      const paidEmis = loan.emiPaidCount || 0;
                      
                      // Get EMI type display
                      const emiTypeDisplay = getEMITypeDisplay(loan);
                      const emiTypeBadgeClass = getEMITypeBadgeClass(loan);
                      
                      return (
                        <div key={loan._id || index} className="border border-gray-300 rounded-xl p-6 hover:shadow-lg transition-all">
                          {/* Loan Header - UPDATED: Added EMI type badge */}
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
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {loan.status}
                                </span>
                                {isRenewed && (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                                    Renewed
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                  loan.loanType === 'Daily' ? 'bg-blue-100 text-blue-800' :
                                  loan.loanType === 'Weekly' ? 'bg-green-100 text-green-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {loan.loanType}
                                </span>
                                {/* EMI Type Badge - NEW */}
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold border ${emiTypeBadgeClass}`}>
                                  {emiTypeDisplay}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Completion Percentage - UPDATED: Use total loan amount */}
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
                                <span className="font-semibold">₹{Math.round(totalLoanAmount * (completion.completionPercentage/100))}</span>
                              </div>
                              <div className="text-gray-600">
                                <span>Remaining: </span>
                                <span className="font-semibold">₹{remainingAmount} of ₹{totalLoanAmount.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Loan Stats Grid - UPDATED: Show total loan amount */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-500 mb-1">Total Loan Amount</p>
                              <p className="font-semibold text-gray-900 text-sm">
                                ₹{totalLoanAmount.toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-500 mb-1">EMI Amount</p>
                              <p className="font-semibold text-gray-900 text-sm">
                                ₹{(loan.emiAmount || 0).toLocaleString()}
                              </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-500 mb-1">No. of {loan.loanType === 'Daily' ? 'Days' : loan.loanType === 'Weekly' ? 'Weeks' : 'Months'}</p>
                              <p className="font-semibold text-gray-900 text-sm">
                                {loan.totalEmiCount || loan.loanDays || 30}
                              </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-500 mb-1">Next EMI Date</p>
                              <p className="font-semibold text-gray-900 text-sm">
                                {loan.nextEmiDate ? safeFormatDate(loan.nextEmiDate) : 'N/A'}
                              </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <p className="text-xs font-medium text-gray-500 mb-1">Last Payment Date</p>
                              <p className="font-semibold text-gray-900 text-sm">
                                {lastPaymentDate ? safeFormatDate(lastPaymentDate) : 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Loan Details Section - Show Principal vs Total */}
                          <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Principal Amount</p>
                                <p className="font-semibold text-gray-900 text-sm">
                                  ₹{(loan.amount || 0).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Total Loan Amount</p>
                                <p className="font-semibold text-green-700 text-sm">
                                  ₹{totalLoanAmount.toLocaleString()}
                                </p>
                                {loan.amount !== totalLoanAmount && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    (Includes interest/charges)
                                  </p>
                                )}
                              </div>
                            </div>
                            {/* Show calculation breakdown for custom EMI */}
                            {loan.emiType === 'custom' && loan.customEmiAmount && loan.loanType !== 'Daily' && (
                              <div className="mt-3 pt-3 border-t border-gray-300">
                                <p className="text-xs font-medium text-gray-700 mb-1">Calculation Breakdown:</p>
                                <div className="text-xs text-gray-600">
                                  <div className="flex justify-between">
                                    <span>Fixed EMI ({loan.loanDays - 1} periods × ₹{loan.emiAmount}):</span>
                                    <span>₹{(loan.emiAmount * (loan.loanDays - 1)).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Last EMI (Custom amount):</span>
                                    <span>₹{loan.customEmiAmount.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold mt-1">
                                    <span>Total:</span>
                                    <span>₹{totalLoanAmount.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* View EMI History Button - Placed above actions */}
                          {loan.emiHistory && loan.emiHistory.length > 0 && (
                            <div className="mb-6">
                              <details className="group">
                                <summary className="flex justify-between items-center cursor-pointer list-none text-sm font-semibold text-blue-700 hover:text-blue-800 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                  <span>View EMI History ({loan.emiHistory.length} payments)</span>
                                  <span className="transition-transform group-open:rotate-180 text-xs">▼</span>
                                </summary>
                                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Amount</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Collected By</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {loan.emiHistory.slice(0, 5).map((payment: EMIHistory, idx: number) => (
                                        <tr key={idx}>
                                          <td className="px-3 py-2 text-xs">{safeFormatDate(payment.paymentDate)}</td>
                                          <td className="px-3 py-2 text-xs font-medium">₹{payment.amount}</td>
                                          <td className="px-3 py-2 text-xs">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                              payment.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                              payment.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                                              payment.status === 'Advance' ? 'bg-blue-100 text-blue-800' :
                                              'bg-gray-100 text-gray-800'
                                            }`}>
                                              {payment.status}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-xs">{payment.collectedBy}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {loan.emiHistory.length > 5 && (
                                    <div className="px-3 py-2 bg-gray-50 text-center">
                                      <p className="text-xs text-gray-500">
                                        Showing 5 of {loan.emiHistory.length} payments
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </details>
                            </div>
                          )}

                          {/* Action Buttons - Moved to bottom after View EMI History */}
                          <div className="flex space-x-2 border-t border-gray-200 pt-4">
                            {onEditLoan && (
                              <button
                                onClick={() => onEditLoan(loan)}
                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-xs font-medium transition-colors flex-1"
                                disabled={isRenewed}
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
                            {onDeleteLoan && (
                              <button
                                onClick={() => onDeleteLoan(loan)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs font-medium transition-colors flex-1"
                                disabled={isRenewed}
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
            {onViewEMICalendar && (
              <button
                onClick={() => onViewEMICalendar(customer as Customer)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
              >
                View EMI Calendar
              </button>
            )}
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
  );
}