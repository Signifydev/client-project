'use client';

import { useState, useEffect } from 'react';
import { CustomerDetails, Loan } from '@/src/app/data-entry/types/dataEntry';
import { loanTypes } from '@/src/app/data-entry/utils/constants';

interface AddLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerDetails: CustomerDetails;
  onSuccess?: () => void;
  existingLoans?: Loan[];
  currentOperator: { id: string; name: string }; // ← ADD THIS LINE
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

// Available loan numbers (L1 to L15)
const ALL_LOAN_NUMBERS = Array.from({ length: 15 }, (_, i) => `L${i + 1}`);

export default function AddLoanModal({
  isOpen,
  onClose,
  customerDetails,
  onSuccess,
  existingLoans = [],
  currentOperator // ← ADD THIS LINE
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
  const [isFetchingExistingLoans, setIsFetchingExistingLoans] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);

  // Function to fetch existing loans directly from API
  const fetchExistingLoans = async () => {
    if (!customerDetails?._id) return;
    
    setIsFetchingExistingLoans(true);
    try {
      console.log('🔍 Fetching existing loans for customer:', customerDetails._id);
      
      const response = await fetch(`/api/data-entry/loans?customerId=${customerDetails._id}`);
      const data = await response.json();
      
      console.log('📋 API Response for existing loans:', data);
      
      if (data.success && data.data) {
        const loans = data.data;
        console.log('✅ Found existing loans:', loans);
        
        // Extract loan numbers and normalize them
        const numbers = loans.map((loan: Loan) => {
          // Ensure loan number is in uppercase format
          const loanNum = loan.loanNumber?.trim().toUpperCase();
          console.log(`Loan: ${loan.loanNumber} -> Normalized: ${loanNum}`);
          return loanNum;
        }).filter(Boolean);
        
        console.log('📊 Normalized existing loan numbers:', numbers);
        setExistingLoanNumbers(numbers);
        
        // Create status map for each loan number
        const statusMap: {[key: string]: string} = {};
        loans.forEach((loan: Loan) => {
          const normalizedLoanNumber = loan.loanNumber?.trim().toUpperCase();
          if (normalizedLoanNumber) {
            statusMap[normalizedLoanNumber] = loan.status || 'active';
          }
        });
        setExistingLoanStatus(statusMap);
      } else {
        console.log('⚠️ No existing loans found or API error');
        setExistingLoanNumbers([]);
        setExistingLoanStatus({});
      }
    } catch (error) {
      console.error('❌ Error fetching existing loans:', error);
      // Fallback to props if API fails
      if (existingLoans && existingLoans.length > 0) {
        console.log('🔄 Using existingLoans prop as fallback');
        const numbers = existingLoans.map(loan => loan.loanNumber?.trim().toUpperCase()).filter(Boolean);
        setExistingLoanNumbers(numbers);
        
        const statusMap: {[key: string]: string} = {};
        existingLoans.forEach(loan => {
          const normalizedLoanNumber = loan.loanNumber?.trim().toUpperCase();
          if (normalizedLoanNumber) {
            statusMap[normalizedLoanNumber] = loan.status || 'active';
          }
        });
        setExistingLoanStatus(statusMap);
      } else {
        setExistingLoanNumbers([]);
        setExistingLoanStatus({});
      }
    } finally {
      setIsFetchingExistingLoans(false);
    }
  };

  // Check for pending requests
  const checkPendingRequests = async () => {
    if (!customerDetails?._id) return;
    
    try {
      console.log('🔍 Checking for pending requests for customer:', customerDetails._id);
      
      const response = await fetch(`/api/data-entry/requests?customerId=${customerDetails._id}&type=Loan Addition&status=Pending`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        console.log('⚠️ Found pending loan addition request:', data.data[0]);
        setHasPendingRequest(true);
        return true;
      }
      setHasPendingRequest(false);
      return false;
    } catch (error) {
      console.error('Error checking pending requests:', error);
      return false;
    }
  };

  // Fetch existing loans when modal opens
  useEffect(() => {
    if (isOpen && customerDetails?._id) {
      console.log('📱 Modal opened, fetching existing loans and checking pending requests...');
      fetchExistingLoans();
      checkPendingRequests();
    }
  }, [isOpen, customerDetails?._id]);

  // Also use existingLoans prop as initial data
  useEffect(() => {
    if (existingLoans && existingLoans.length > 0) {
      console.log('📦 Using existingLoans prop:', existingLoans);
      const numbers = existingLoans.map(loan => loan.loanNumber?.trim().toUpperCase()).filter(Boolean);
      console.log('📦 Prop loan numbers:', numbers);
      
      // Only update if we don't have data yet
      if (existingLoanNumbers.length === 0) {
        setExistingLoanNumbers(numbers);
        
        const statusMap: {[key: string]: string} = {};
        existingLoans.forEach(loan => {
          const normalizedLoanNumber = loan.loanNumber?.trim().toUpperCase();
          if (normalizedLoanNumber) {
            statusMap[normalizedLoanNumber] = loan.status || 'active';
          }
        });
        setExistingLoanStatus(statusMap);
      }
    }
  }, [existingLoans]);

  const validateLoanNumber = (loanNumber: string, index: number): string => {
    if (!loanNumber.trim()) {
      return 'Loan number is required';
    }
    
    // Normalize loan number
    const normalizedLoanNumber = loanNumber.trim().toUpperCase();
    
    // Validate format
    const loanNum = normalizedLoanNumber.replace('L', '');
    const loanNumValue = parseInt(loanNum);
    
    if (!normalizedLoanNumber.startsWith('L') || isNaN(loanNumValue) || loanNumValue < 1 || loanNumValue > 15) {
      return 'Loan number must be between L1 and L15';
    }
    
    // Check for duplicates in OTHER new loans being added (not the current one)
    const duplicateInOtherNewLoans = newLoans.some((loan, i) => 
      i !== index && 
      loan.loanNumber.trim().toUpperCase() === normalizedLoanNumber &&
      loan.loanNumber.trim() !== '' // Only check if the other loan has a number
    );
    
    if (duplicateInOtherNewLoans) {
      return 'Duplicate loan number in this request';
    }
    
    // Check if loan number already exists for this customer
    console.log('🔍 Checking loan number:', normalizedLoanNumber);
    console.log('📊 Existing loan numbers:', existingLoanNumbers);
    
    if (existingLoanNumbers.includes(normalizedLoanNumber)) {
      const status = existingLoanStatus[normalizedLoanNumber];
      console.log(`⚠️ Loan ${normalizedLoanNumber} is ${status}`);
      
      if (status === 'active' || status === 'pending') {
        return `Loan number "${normalizedLoanNumber}" is already ${status === 'active' ? 'in use' : 'pending approval'} for this customer`;
      } else if (status === 'renewed') {
        return `Loan number "${normalizedLoanNumber}" has been renewed`;
      } else {
        return `Loan number "${normalizedLoanNumber}" is ${status} for this customer`;
      }
    }
    
    console.log(`✅ Loan number "${normalizedLoanNumber}" is available`);
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
    // Check for pending request first
    if (hasPendingRequest) {
      alert('A pending loan addition request already exists for this customer. Please wait for admin approval before submitting another request.');
      return;
    }

    if (!validateAllLoans()) {
      alert('Please fix all validation errors before submitting');
      return;
    }

    // Double-check for pending request before submitting
    const hasPending = await checkPendingRequests();
    if (hasPending) {
      alert('A pending loan addition request was just detected for this customer. Please wait for admin approval before submitting another request.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🟡 Starting batch loan submission to /api/data-entry/loans/batch');
      
      // Prepare all loans data in an array
      const loans = newLoans.map((loan) => {
        const totalAmount = calculateTotalLoanAmount(loan);
        
        return {
          loanNumber: loan.loanNumber.trim().toUpperCase(),
          loanAmount: totalAmount.toString(),
          amount: loan.amount || totalAmount.toString(),
          emiAmount: loan.emiAmount,
          loanType: loan.loanType,
          dateApplied: loan.loanDate,
          loanDays: loan.loanDays,
          emiStartDate: loan.emiStartDate || loan.loanDate,
          emiType: loan.emiType,
          customEmiAmount: loan.customEmiAmount || null
        };
      });

      console.log('📦 Prepared batch loans data:', loans);

      // Prepare the BATCH request data
      const batchRequestData = {
        customerId: customerDetails._id,
        loans: loans,
        createdBy: currentOperator.id || 'data_entry_operator'
      };

      console.log('📤 Submitting to /api/data-entry/loans/batch:', {
        customer: customerDetails.name,
        loanCount: loans.length,
        loanNumbers: loans.map(l => l.loanNumber)
      });

      // Submit to the batch endpoint
      const response = await fetch('/api/data-entry/loans/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchRequestData),
      });

      const responseText = await response.text();
      console.log('🔍 Response:', {
        status: response.status,
        statusText: response.statusText,
        textPreview: responseText.substring(0, 300)
      });
      
      // Check if response is HTML error page
      if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
        throw new Error(`Server returned HTML error page. Check API route.`);
      }
      
      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // If can't parse JSON, use the raw text
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
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
      
      console.log(`✅ Batch request created for ${loans.length} loans:`, data.data?.requestId);
      
      // Success - show success message
      alert(`${loans.length} loan addition request${loans.length !== 1 ? 's' : ''} submitted successfully in a single batch request! Waiting for admin approval. Request ID: ${data.data?.requestId}`);

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
      setHasPendingRequest(true); // Set pending request flag after successful submission
      
    } catch (error: any) {
      console.error('❌ Error in batch loan submission:', error);
      
      // Special handling for 409 Conflict
      if (error.message.includes('409') || error.message.includes('Conflict') || error.message.includes('pending')) {
        alert(`Cannot submit request: ${error.message}\n\nA pending loan addition request already exists for this customer. Please wait for admin approval.`);
        setHasPendingRequest(true);
      } else {
        alert('Error submitting loans:\n' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get loan number status - FIXED DUPLICATE LOGIC
  const getLoanNumberStatus = (loanNumber: string, currentIndex?: number): string => {
    if (!loanNumber) return 'available';
    
    const normalizedLoanNumber = loanNumber.toUpperCase();
    
    // Check if loan number already exists for customer
    if (existingLoanNumbers.includes(normalizedLoanNumber)) {
      const status = existingLoanStatus[normalizedLoanNumber];
      if (status === 'active' || status === 'pending') return 'taken';
      if (status === 'rejected') return 'rejected';
      if (status === 'renewed') return 'renewed';
      return 'taken';
    }
    
    // Check for duplicates in other new loans (excluding current index)
    if (currentIndex !== undefined) {
      const duplicateInOtherNewLoans = newLoans.some((loan, index) => 
        index !== currentIndex && 
        loan.loanNumber.trim().toUpperCase() === normalizedLoanNumber &&
        loan.loanNumber.trim() !== '' // Only check if the other loan has a number
      );
      
      if (duplicateInOtherNewLoans) {
        return 'duplicate';
      }
    }
    
    return 'available';
  };

  // Get background color based on loan number status
  const getOptionBackgroundColor = (loanNumber: string, currentIndex?: number): string => {
    const status = getLoanNumberStatus(loanNumber, currentIndex);
    
    if (status === 'taken') {
      return 'bg-red-100 text-red-800 border-red-300';
    } else if (status === 'pending') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else if (status === 'rejected') {
      return 'bg-gray-100 text-gray-500 border-gray-300';
    } else if (status === 'renewed') {
      return 'bg-purple-100 text-purple-800 border-purple-300';
    } else if (status === 'duplicate') {
      return 'bg-orange-100 text-orange-800 border-orange-300';
    } else {
      return 'bg-green-50 text-green-800 border-green-200';
    }
  };

  // Get status text for display
  const getStatusText = (loanNumber: string, currentIndex?: number): string => {
    const status = getLoanNumberStatus(loanNumber, currentIndex);
    
    if (status === 'taken') return '(Already Taken)';
    if (status === 'pending') return '(Pending Approval)';
    if (status === 'rejected') return '(Previously Rejected)';
    if (status === 'renewed') return '(Renewed)';
    if (status === 'duplicate') return '(Duplicate in this form)';
    return '(Available)';
  };

  // Refresh existing loans
  const handleRefreshExistingLoans = () => {
    console.log('🔄 Refreshing existing loans...');
    fetchExistingLoans();
    checkPendingRequests();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl mx-auto my-8 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-20">
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
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-xs text-gray-500">
                    Existing Loans: <span className="font-medium">{existingLoanNumbers.length}</span>
                  </p>
                  <button
                    onClick={handleRefreshExistingLoans}
                    disabled={isFetchingExistingLoans}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                    title="Refresh existing loans"
                  >
                    {isFetchingExistingLoans ? (
                      <span className="inline-block mr-1 animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-600"></span>
                    ) : (
                      <span className="mr-1">🔄</span>
                    )}
                    Refresh
                  </button>
                </div>
                {existingLoanNumbers.length > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    ❌ Taken numbers: {existingLoanNumbers.join(', ')}
                  </p>
                )}
                {hasPendingRequest && (
                  <p className="text-xs text-yellow-600 mt-1 font-semibold">
                    ⚠️ A pending loan addition request already exists for this customer!
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 bg-transparent hover:bg-gray-100 hover:text-gray-900 rounded-lg text-sm p-1.5"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          
          {/* Pending Request Warning */}
          {hasPendingRequest && (
            <div className="mb-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-yellow-500 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-bold text-yellow-800">Pending Request Exists</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    A loan addition request is already pending approval for this customer. 
                    You cannot submit another request until the existing one is approved or rejected.
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Please check the "Requests" tab for status updates.
                  </p>
                </div>
              </div>
            </div>
          )}


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
                    {/* Loan Number Section - FIXED: Pass current index to avoid self-duplicate detection */}
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
                          disabled={isFetchingExistingLoans || hasPendingRequest}
                        >
                          <option value="">Select Loan Number</option>
                          {ALL_LOAN_NUMBERS.map((loanNum) => {
                            const status = getLoanNumberStatus(loanNum, index);
                            const isTaken = status === 'taken' || status === 'pending' || status === 'renewed';
                            const bgColor = getOptionBackgroundColor(loanNum, index);
                            const statusText = getStatusText(loanNum, index);
                            
                            return (
                              <option 
                                key={loanNum} 
                                value={loanNum}
                                className={`${bgColor} ${isTaken ? 'cursor-not-allowed opacity-70' : ''}`}
                                disabled={isTaken || hasPendingRequest}
                              >
                                {loanNum} {statusText}
                              </option>
                            );
                          })}
                        </select>
                        
                        {/* First loan indicator */}
                        {loan.loanNumber === 'L1' && getLoanNumberStatus('L1', index) === 'available' && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                            <p className="text-sm text-blue-700 flex items-center">
                              <span className="mr-2">ℹ️</span>
                              This is the first loan for the customer. Loan number should be L1.
                            </p>
                          </div>
                        )}
                        
                        {/* Already taken warning */}
                        {loan.loanNumber && getLoanNumberStatus(loan.loanNumber, index) === 'taken' && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-2">
                            <p className="text-sm text-red-700 flex items-center">
                              <span className="mr-2">❌</span>
                              Loan number "{loan.loanNumber.toUpperCase()}" is already taken by this customer!
                            </p>
                          </div>
                        )}
                        
                        {/* Duplicate warning */}
                        {loan.loanNumber && getLoanNumberStatus(loan.loanNumber, index) === 'duplicate' && (
                          <div className="bg-orange-50 border border-orange-200 rounded-md p-2">
                            <p className="text-sm text-orange-700 flex items-center">
                              <span className="mr-2">⚠️</span>
                              Loan number "{loan.loanNumber.toUpperCase()}" is used in another loan in this form!
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Error message */}
                      {loanNumberErrors[index] && (
                        <p className="text-red-500 text-xs mt-1 flex items-center">
                          <span className="mr-1">❌</span>
                          {loanNumberErrors[index]}
                        </p>
                      )}
                      
                      {/* Status legend */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-500 mr-2">Status Legend:</span>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                          <span className="text-xs text-gray-600">Available</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                          <span className="text-xs text-gray-600">Taken</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></div>
                          <span className="text-xs text-gray-600">Pending</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-purple-500 mr-1"></div>
                          <span className="text-xs text-gray-600">Renewed</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-orange-500 mr-1"></div>
                          <span className="text-xs text-gray-600">Duplicate</span>
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
                            disabled={hasPendingRequest}
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
                            disabled={hasPendingRequest}
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
                            disabled={hasPendingRequest}
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
                              disabled={hasPendingRequest}
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
                              disabled={hasPendingRequest}
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
                            disabled={hasPendingRequest}
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
                                disabled={hasPendingRequest}
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
                                  disabled={hasPendingRequest}
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
                                  disabled={hasPendingRequest}
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
                disabled={newLoans.length >= 5 || hasPendingRequest}
                className="px-4 py-2 bg-blue-50 text-blue-700 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors duration-200"
              >
                <span className="mr-2">➕</span>
                Add Another Loan (Max 5)
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer - Sticky at bottom */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 z-20 p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">
                <span className="font-medium">Note:</span> All requests require admin approval
              </p>
              <p className="text-sm font-medium text-gray-700 mt-1">
                New Loans to Add: <span className="text-blue-600">{newLoans.length}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Existing Loans: <span className="font-medium">{existingLoanNumbers.length}</span>
                {existingLoanNumbers.length > 0 && (
                  <span className="text-red-600 ml-2">(Taken: {existingLoanNumbers.join(', ')})</span>
                )}
              </p>
              {hasPendingRequest && (
                <p className="text-xs text-yellow-600 mt-1 font-semibold">
                  ⚠️ Cannot submit - Pending request exists!
                </p>
              )}
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
                disabled={isLoading || Object.keys(loanNumberErrors).length > 0 || isFetchingExistingLoans || hasPendingRequest}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block mr-2 animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></span>
                    Submitting {newLoans.length} loan{newLoans.length !== 1 ? 's' : ''}...
                  </>
                ) : hasPendingRequest ? (
                  'Pending Request Exists'
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