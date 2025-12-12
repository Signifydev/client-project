'use client';

import { useState, useEffect } from 'react';
import { CustomerDetails, Loan } from '@/src/types/dataEntry';
import { loanTypes } from '@/src/utils/constants';

interface AddLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerDetails: CustomerDetails;
  onSuccess?: () => void;
  existingLoans?: Loan[];
}

interface NewLoanData {
  loanNumber: string;
  loanAmount: string;
  loanDate: string;
  emiStartDate: string;
  emiAmount: string;
  loanType: string;
  loanDays: string;
  emiType: 'fixed' | 'custom';
  customEmiAmount: string;
  amount: string;
}

// Available loan numbers (LN1 to LN15)
const ALL_LOAN_NUMBERS = Array.from({ length: 15 }, (_, i) => `LN${i + 1}`);

export default function AddLoanModal({
  isOpen,
  onClose,
  customerDetails,
  onSuccess,
  existingLoans = []
}: AddLoanModalProps) {
  const [newLoans, setNewLoans] = useState<NewLoanData[]>([{
    loanNumber: '',
    loanAmount: '',
    amount: '',
    loanDate: new Date().toISOString().split('T')[0],
    emiStartDate: new Date().toISOString().split('T')[0],
    emiAmount: '',
    loanType: 'Monthly',
    loanDays: '30',
    emiType: 'fixed',
    customEmiAmount: ''
  }]);

  const [existingLoanNumbers, setExistingLoanNumbers] = useState<string[]>([]);
  const [existingLoanStatus, setExistingLoanStatus] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loanNumberErrors, setLoanNumberErrors] = useState<{[key: number]: string}>({});

  useEffect(() => {
    if (existingLoans && existingLoans.length > 0) {
      const numbers = existingLoans.map(loan => loan.loanNumber);
      setExistingLoanNumbers(numbers);
      
      // Create status map for each loan number
      const statusMap: {[key: string]: string} = {};
      existingLoans.forEach(loan => {
        statusMap[loan.loanNumber] = loan.status || 'active';
      });
      setExistingLoanStatus(statusMap);
    }
  }, [existingLoans]);

  const validateLoanNumber = (loanNumber: string, index: number): string => {
    if (!loanNumber.trim()) {
      return 'Loan number is required';
    }
    
    const loanNum = loanNumber.replace('LN', '');
    const loanNumValue = parseInt(loanNum);
    if (!loanNumber.startsWith('LN') || isNaN(loanNumValue) || loanNumValue < 1 || loanNumValue > 15) {
      return 'Loan number must be between LN1 and LN15';
    }
    
    const duplicateInNewLoans = newLoans.some((loan, i) => 
      i !== index && loan.loanNumber.trim().toUpperCase() === loanNumber.trim().toUpperCase()
    );
    
    if (duplicateInNewLoans) {
      return 'Duplicate loan number in this request';
    }
    
    if (existingLoanNumbers.includes(loanNumber.trim().toUpperCase())) {
      const status = existingLoanStatus[loanNumber];
      return `Loan number already ${status === 'active' ? 'in use' : status} for this customer`;
    }
    
    return '';
  };

  const addNewLoanEntry = () => {
    setNewLoans(prev => [...prev, {
      loanNumber: '',
      loanAmount: '',
      amount: '',
      loanDate: new Date().toISOString().split('T')[0],
      emiStartDate: new Date().toISOString().split('T')[0],
      emiAmount: '',
      loanType: 'Monthly',
      loanDays: '30',
      emiType: 'fixed',
      customEmiAmount: ''
    }]);
  };

  const removeLoanEntry = (index: number) => {
    if (newLoans.length > 1) {
      const updatedLoans = [...newLoans];
      updatedLoans.splice(index, 1);
      setNewLoans(updatedLoans);
      
      const updatedErrors = { ...loanNumberErrors };
      delete updatedErrors[index];
      setLoanNumberErrors(updatedErrors);
    }
  };

  const updateLoanData = (index: number, field: keyof NewLoanData, value: string) => {
    const updatedLoans = [...newLoans];
    
    if (field === 'loanType') {
      if (value === 'Daily') {
        updatedLoans[index] = { 
          ...updatedLoans[index], 
          [field]: value,
          emiType: 'fixed',
          customEmiAmount: ''
        };
      } else {
        updatedLoans[index] = { ...updatedLoans[index], [field]: value };
      }
    } 
    else if (field === 'emiType') {
      updatedLoans[index] = { 
        ...updatedLoans[index], 
        [field]: value as 'fixed' | 'custom',
        customEmiAmount: value === 'fixed' ? '' : updatedLoans[index].customEmiAmount
      };
    } 
    else {
      updatedLoans[index] = { ...updatedLoans[index], [field]: value };
    }
    
    setNewLoans(updatedLoans);
    
    if (field === 'loanNumber') {
      const error = validateLoanNumber(value, index);
      const updatedErrors = { ...loanNumberErrors };
      if (error) {
        updatedErrors[index] = error;
      } else {
        delete updatedErrors[index];
      }
      setLoanNumberErrors(updatedErrors);
    }
  };

  const handleEmiTypeChange = (index: number, emiType: 'fixed' | 'custom') => {
    const updatedLoans = [...newLoans];
    updatedLoans[index] = { 
      ...updatedLoans[index], 
      emiType,
      customEmiAmount: emiType === 'fixed' ? '' : updatedLoans[index].customEmiAmount
    };
    setNewLoans(updatedLoans);
  };

  const calculateTotalLoanAmount = (loan: NewLoanData): number => {
    const emiAmount = parseFloat(loan.emiAmount) || 0;
    const loanDays = parseFloat(loan.loanDays) || 0;
    const customEmiAmount = parseFloat(loan.customEmiAmount || '0') || 0;
    
    if (loan.loanType === 'Daily') {
      return emiAmount * loanDays;
    } else if (loan.loanType === 'Weekly' || loan.loanType === 'Monthly') {
      if (loan.emiType === 'fixed') {
        return emiAmount * loanDays;
      } else if (loan.emiType === 'custom') {
        const fixedPeriods = loanDays - 1;
        const fixedAmount = emiAmount * fixedPeriods;
        return fixedAmount + customEmiAmount;
      }
    }
    return 0;
  };

  const validateAllLoans = (): boolean => {
    const errors: {[key: number]: string} = {};
    let hasError = false;

    newLoans.forEach((loan, index) => {
      const loanNumberError = validateLoanNumber(loan.loanNumber, index);
      if (loanNumberError) {
        errors[index] = loanNumberError;
        hasError = true;
      }

      if (!loan.amount || parseFloat(loan.amount) <= 0) {
        hasError = true;
        if (!errors[index]) errors[index] = 'Amount (principal) is required and must be greater than 0';
      }

      if (!loan.emiAmount || parseFloat(loan.emiAmount) <= 0) {
        hasError = true;
        if (!errors[index]) errors[index] = 'EMI amount is required and must be greater than 0';
      }
      
      if (!loan.loanDays || parseInt(loan.loanDays) <= 0) {
        hasError = true;
        if (!errors[index]) errors[index] = 'Loan days is required and must be greater than 0';
      }
      
      if (loan.loanType !== 'Daily' && loan.emiType === 'custom' && 
          (!loan.customEmiAmount || parseFloat(loan.customEmiAmount) <= 0)) {
        hasError = true;
        if (!errors[index]) errors[index] = 'Custom EMI amount is required for custom EMI type';
      }
    });

    setLoanNumberErrors(errors);
    return !hasError;
  };

  const handleSubmit = async () => {
  if (!validateAllLoans()) {
    alert('Please fix all validation errors before submitting');
    return;
  }

  setIsLoading(true);
  try {
    console.log('🟡 Starting loan submission to /api/admin/approve-request');
    
    // For each loan, create a "Loan Addition" request
    const submissionPromises = newLoans.map(async (loan, index) => {
      const totalAmount = calculateTotalLoanAmount(loan);
      
      // Prepare the request data - NO 'action' field means CREATE request
      const requestData = {
        // IMPORTANT: No 'action' field = This is a CREATE request
        type: 'Loan Addition',
        customerId: customerDetails._id,
        customerName: customerDetails.name,
        customerNumber: customerDetails.customerNumber,
        customerPhone: customerDetails.phone?.[0] || '',
        requestedData: {
          loanNumber: loan.loanNumber.trim().toUpperCase(),
          loanAmount: totalAmount.toString(),
          amount: loan.amount || totalAmount.toString(),
          emiAmount: loan.emiAmount,
          loanType: loan.loanType,
          dateApplied: loan.loanDate,
          loanDays: loan.loanDays,
          emiStartDate: loan.emiStartDate,
          emiType: loan.emiType,
          customEmiAmount: loan.customEmiAmount || null,
          customerId: customerDetails._id
        },
        createdBy: 'data_entry_operator'
      };

      console.log(`🟡 Creating Loan Addition request for ${loan.loanNumber}`);
      
      try {
        // Submit to the SINGLE endpoint
        const response = await fetch('/api/admin/approve-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        const responseText = await response.text();
        console.log(`🔍 Response for ${loan.loanNumber}:`, {
          status: response.status,
          statusText: response.statusText,
          textPreview: responseText.substring(0, 300)
        });
        
        // Check if response is HTML error page
        if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
          throw new Error(`Server returned HTML error page. Check API route.`);
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ JSON parse error:', parseError);
          console.error('Raw response:', responseText);
          throw new Error(`Invalid JSON response from server`);
        }
        
        if (!data.success) {
          throw new Error(data.error || `Request creation failed`);
        }
        
        console.log(`✅ Request created for ${loan.loanNumber}:`, data.data?.requestId);
        return { success: true, data, loanNumber: loan.loanNumber };
        
      } catch (error: any) {
        console.error(`❌ Error creating request for ${loan.loanNumber}:`, error);
        throw new Error(`Loan ${loan.loanNumber}: ${error.message}`);
      }
    });

    // Wait for all submissions
    const results = await Promise.allSettled(submissionPromises);
    
    // Type guard functions
    const isFulfilled = <T,>(
      result: PromiseSettledResult<T>
    ): result is PromiseFulfilledResult<T> => result.status === 'fulfilled';
    
    const isRejected = <T,>(
      result: PromiseSettledResult<T>
    ): result is PromiseRejectedResult => result.status === 'rejected';
    
    // Check results with proper typing
    const successful = results.filter(isFulfilled).filter(r => r.value?.success);
    const failed = results.filter(isRejected);
    
    console.log('📊 Final submission results:', {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      successfulLoans: successful.map(r => r.value?.loanNumber),
      failedErrors: failed.map(r => r.reason?.message)
    });

    if (failed.length > 0) {
      const errors = failed.map(f => f.reason?.message || 'Unknown error');
      
      if (successful.length === 0) {
        // All failed
        throw new Error(`Failed to submit all loans:\n${errors.join('\n')}`);
      } else {
        // Some succeeded
        const successLoanNumbers = successful.map(s => s.value?.loanNumber).filter(Boolean);
        alert(`${successful.length} loan(s) submitted, ${failed.length} failed.\n\nSuccessful: ${successLoanNumbers.join(', ')}\nFailed: ${errors.join('; ')}`);
      }
    } else {
      // All successful
      alert(`${newLoans.length} loan addition request${newLoans.length !== 1 ? 's' : ''} submitted successfully! Waiting for admin approval.`);
    }

    // Success - close modal and refresh
    onSuccess?.();
    onClose();
    
    // Reset form
    setNewLoans([{
      loanNumber: '',
      loanAmount: '',
      amount: '',
      loanDate: new Date().toISOString().split('T')[0],
      emiStartDate: new Date().toISOString().split('T')[0],
      emiAmount: '',
      loanType: 'Monthly',
      loanDays: '30',
      emiType: 'fixed',
      customEmiAmount: ''
    }]);
    setLoanNumberErrors({});
    
  } catch (error: any) {
    console.error('❌ Error in handleSubmit:', error);
    alert('Error submitting loans:\n' + error.message);
  } finally {
    setIsLoading(false);
  }
};

  // Helper function to get loan number status
  const getLoanNumberStatus = (loanNumber: string): string => {
    if (existingLoanNumbers.includes(loanNumber)) {
      const status = existingLoanStatus[loanNumber];
      if (status === 'active') return 'taken';
      if (status === 'pending_approval' || status === 'Pending') return 'pending';
      if (status === 'rejected' || status === 'Rejected') return 'rejected';
      return 'taken';
    }
    return 'available';
  };

  // Get background color based on loan number status
  const getOptionBackgroundColor = (loanNumber: string): string => {
    const status = getLoanNumberStatus(loanNumber);
    
    if (status === 'taken') {
      return 'bg-red-100 text-red-800 border-red-300';
    } else if (status === 'pending') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else if (status === 'rejected') {
      return 'bg-gray-100 text-gray-500 border-gray-300';
    } else {
      return 'bg-green-50 text-green-800 border-green-200';
    }
  };

  // Get status text for display
  const getStatusText = (loanNumber: string): string => {
    const status = getLoanNumberStatus(loanNumber);
    
    if (status === 'taken') return '(Already Taken)';
    if (status === 'pending') return '(Pending Approval)';
    if (status === 'rejected') return '(Previously Rejected)';
    return '(Available)';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center p-4 pt-20">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl mx-auto mb-8">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-lg z-10">
          <div className="flex items-center justify-between p-4 md:p-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">➕</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage Loans for {customerDetails.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Customer: {customerDetails?.customerNumber}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 bg-transparent hover:bg-gray-100 hover:text-gray-900 rounded-lg text-sm p-1.5"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org2000/svg">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="p-4 md:p-6 max-h-[calc(80vh-150px)] overflow-y-auto">
          
          {/* Warning Alert */}
          <div className="mb-6 bg-yellow-50 border border-yellow-100 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-yellow-500 text-lg">⚠️</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">Important Notice</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  All loan addition requests require admin approval. 
                  Loans will only be active after approval.
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  <strong>Note:</strong> Loan numbers with different colors indicate their status.
                </p>
                <div className="flex flex-wrap gap-3 mt-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-xs text-gray-700">Available</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                    <span className="text-xs text-gray-700">Already Taken</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                    <span className="text-xs text-gray-700">Pending Approval</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
                    <span className="text-xs text-gray-700">Previously Rejected</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Add New Loan Forms Container */}
          <div className="space-y-6">
            {newLoans.map((loan, index) => {
              const totalLoanAmount = calculateTotalLoanAmount(loan);
              const periodLabel = loan.loanType === 'Daily' ? 'days' : 
                                 loan.loanType === 'Weekly' ? 'weeks' : 'months';
              const emiAmount = parseFloat(loan.emiAmount) || 0;
              const loanDays = parseFloat(loan.loanDays) || 0;
              const customEmiAmount = parseFloat(loan.customEmiAmount || '0') || 0;

              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center">
                      <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full mr-3">
                        New Loan #{index + 1}
                      </span>
                      {newLoans.length > 1 && (
                        <button
                          onClick={() => removeLoanEntry(index)}
                          className="text-red-600 hover:text-red-800 text-sm flex items-center"
                        >
                          <span className="mr-1">🗑️</span>
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-700">
                      Total: <span className="text-green-600">₹{totalLoanAmount.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}</span>
                    </div>
                  </div>

                  {/* Form Fields - Two Column Layout */}
                  <div className="space-y-6">
                    {/* Loan Number Section - UPDATED with colored options */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Loan Number *
                        <span className="text-red-500 ml-1">(Required)</span>
                      </label>
                      <div className="space-y-2">
                        <select
                          className={`w-full px-3 py-2 border ${loanNumberErrors[index] ? 'border-red-500' : 'border-gray-300'} rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                          value={loan.loanNumber}
                          onChange={(e) => updateLoanData(index, 'loanNumber', e.target.value)}
                        >
                          <option value="">Select Loan Number</option>
                          {ALL_LOAN_NUMBERS.map((loanNum) => {
                            const status = getLoanNumberStatus(loanNum);
                            const bgColor = getOptionBackgroundColor(loanNum);
                            const statusText = getStatusText(loanNum);
                            
                            return (
                              <option 
                                key={loanNum} 
                                value={loanNum}
                                className={`${bgColor} ${status === 'taken' ? 'cursor-not-allowed opacity-70' : ''}`}
                                disabled={status === 'taken'}
                              >
                                {loanNum} {statusText} {loanNum === 'LN1' && status === 'available' ? '(First loan)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        {loan.loanNumber === 'LN1' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                            <p className="text-sm text-blue-700 flex items-center">
                              <span className="mr-2">ℹ️</span>
                              This is the first loan for the customer. Loan number should be LN1.
                            </p>
                          </div>
                        )}
                      </div>
                      {loanNumberErrors[index] && (
                        <p className="text-red-500 text-xs mt-1">{loanNumberErrors[index]}</p>
                      )}
                      <div className="mt-2 flex items-center">
                        <span className="text-xs text-gray-500 mr-2">Status Legend:</span>
                        <div className="flex items-center mr-3">
                          <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                          <span className="text-xs text-gray-600">Available</span>
                        </div>
                        <div className="flex items-center mr-3">
                          <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                          <span className="text-xs text-gray-600">Taken</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></div>
                          <span className="text-xs text-gray-600">Pending</span>
                        </div>
                      </div>
                    </div>

                    {/* Two Column Grid for Form Fields */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Left Column */}
                      <div className="space-y-4">
                        {/* Loan Type */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Loan Type *
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={loan.loanType}
                            onChange={(e) => updateLoanData(index, 'loanType', e.target.value)}
                          >
                            {loanTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>

                        {/* Loan Date */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Loan Date *
                          </label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={loan.loanDate}
                            onChange={(e) => updateLoanData(index, 'loanDate', e.target.value)}
                          />
                        </div>

                        {/* EMI Start Date */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            EMI Start Date *
                          </label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={loan.emiStartDate}
                            onChange={(e) => updateLoanData(index, 'emiStartDate', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        {/* Amount (Principal) */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Amount (Principal) *
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500">₹</span>
                            </div>
                            <input
                              type="number"
                              min="1"
                              className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={loan.amount}
                              onChange={(e) => {
                                updateLoanData(index, 'amount', e.target.value);
                              }}
                              placeholder="Enter principal amount"
                            />
                          </div>
                        </div>

                        {/* EMI Amount */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {loan.emiType === 'custom' && loan.loanType !== 'Daily' 
                              ? 'Fixed EMI Amount *' 
                              : 'EMI Amount *'}
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <span className="text-gray-500">₹</span>
                            </div>
                            <input
                              type="number"
                              min="1"
                              className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={loan.emiAmount}
                              onChange={(e) => updateLoanData(index, 'emiAmount', e.target.value)}
                              placeholder="Enter EMI amount"
                            />
                          </div>
                        </div>

                        {/* Number of Days/Weeks/Months */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Number of {periodLabel} *
                          </label>
                          <input
                            type="number"
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={loan.loanDays}
                            onChange={(e) => updateLoanData(index, 'loanDays', e.target.value)}
                            placeholder={`Enter number of ${periodLabel}`}
                          />
                        </div>

                        {/* Custom EMI Amount (Right Column, Full Width) */}
                        {loan.loanType !== 'Daily' && loan.emiType === 'custom' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Last EMI Amount *
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500">₹</span>
                              </div>
                              <input
                                type="number"
                                min="1"
                                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                value={loan.customEmiAmount}
                                onChange={(e) => updateLoanData(index, 'customEmiAmount', e.target.value)}
                                placeholder="Enter last EMI amount"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* EMI Collection Type - Full Width Below the Two Columns */}
                    {(loan.loanType === 'Weekly' || loan.loanType === 'Monthly') && (
                      <div className="mt-6">
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                          <label className="block text-sm font-semibold text-blue-800 mb-3">
                            EMI Collection Type *
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Fixed EMI Option */}
                            <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              loan.emiType === 'fixed' 
                                ? 'border-blue-500 bg-blue-100' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}>
                              <div className="flex items-center">
                                <input
                                  type="radio"
                                  name={`emiType-${index}`}
                                  className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                                  checked={loan.emiType === 'fixed'}
                                  onChange={() => handleEmiTypeChange(index, 'fixed')}
                                />
                                <div className="ml-3">
                                  <span className="text-sm font-medium text-gray-900">Fixed EMI</span>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Same EMI amount for all periods
                                  </p>
                                </div>
                              </div>
                            </label>
                            
                            {/* Custom EMI Option */}
                            <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              loan.emiType === 'custom' 
                                ? 'border-blue-500 bg-blue-100' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}>
                              <div className="flex items-center">
                                <input
                                  type="radio"
                                  name={`emiType-${index}`}
                                  className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                                  checked={loan.emiType === 'custom'}
                                  onChange={() => handleEmiTypeChange(index, 'custom')}
                                />
                                <div className="ml-3">
                                  <span className="text-sm font-medium text-gray-900">Custom EMI</span>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Different last EMI amount
                                  </p>
                                </div>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Loan Summary */}
                    {(loan.emiAmount || loan.loanDays) && (
                      <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Loan #{index + 1} Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-gray-50 p-3 rounded border border-gray-200">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Loan Type</p>
                            <p className="text-sm font-bold text-gray-900 mt-1">{loan.loanType}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded border border-gray-200">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">Periods</p>
                            <p className="text-sm font-bold text-gray-900 mt-1">{loanDays} {periodLabel}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded border border-gray-200">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                              {loan.emiType === 'custom' ? 'Fixed EMI' : 'EMI Amount'}
                            </p>
                            <p className="text-sm font-bold text-gray-900 mt-1">₹{emiAmount.toLocaleString('en-IN')}</p>
                          </div>
                          {loan.loanType !== 'Daily' && loan.emiType === 'custom' && (
                            <div className="bg-gray-50 p-3 rounded border border-gray-200">
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Last EMI Amount</p>
                              <p className="text-sm font-bold text-gray-900 mt-1">₹{customEmiAmount.toLocaleString('en-IN')}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-gray-600">Calculation:</p>
                              {loan.loanType === 'Daily' ? (
                                <p className="text-xs text-gray-500">
                                  ₹{emiAmount.toLocaleString()} × {loanDays} days
                                </p>
                              ) : loan.emiType === 'fixed' ? (
                                <p className="text-xs text-gray-500">
                                  ₹{emiAmount.toLocaleString()} × {loanDays} {periodLabel}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-500">
                                  (₹{emiAmount.toLocaleString()} × {loanDays - 1}) + ₹{customEmiAmount.toLocaleString()}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Total Loan Amount</p>
                              <p className="text-lg font-bold text-green-600">
                                ₹{totalLoanAmount.toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add Another Loan Button */}
            <div className="flex justify-center">
              <button
                onClick={addNewLoanEntry}
                className="px-4 py-2 bg-blue-50 text-blue-700 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-100 flex items-center transition-colors duration-200"
              >
                <span className="mr-2">➕</span>
                Add Another Loan
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer - Sticky at bottom */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 rounded-b-lg p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                <span className="font-medium">Note:</span> All requests require admin approval
              </p>
              <p className="text-sm font-medium text-gray-700 mt-1">
                New Loans to Add: <span className="text-blue-600">{newLoans.length}</span>
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || Object.keys(loanNumberErrors).length > 0}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block mr-2 animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></span>
                    Submitting {newLoans.length} loan{newLoans.length !== 1 ? 's' : ''}...
                  </>
                ) : (
                  `Submit ${newLoans.length} Loan${newLoans.length !== 1 ? 's' : ''} for Approval`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}