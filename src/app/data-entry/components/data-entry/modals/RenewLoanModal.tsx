'use client';

import { useState, useEffect } from 'react';
import { RenewLoanData } from '@/src/app/data-entry/types/dataEntry';
import { loanTypes } from '@/src/app/data-entry/utils/constants';
import { useLoans } from '@/src/app/data-entry/hooks/useLoans';

interface RenewLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanData: RenewLoanData;
  onSuccess?: () => void;
}

// Available loan numbers (L1 to L15)
const ALL_LOAN_NUMBERS = Array.from({ length: 15 }, (_, i) => `L${i + 1}`);

export default function RenewLoanModal({
  isOpen,
  onClose,
  loanData,
  onSuccess
}: RenewLoanModalProps) {
  const [formData, setFormData] = useState<RenewLoanData>(loanData);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingExistingLoans, setIsFetchingExistingLoans] = useState(false);
  
  // State for loan number validation
  const [existingLoanNumbers, setExistingLoanNumbers] = useState<string[]>([]);
  const [existingLoanStatus, setExistingLoanStatus] = useState<{[key: string]: string}>({});
  const [loanNumberError, setLoanNumberError] = useState<string>('');
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  
  // State for selected loan number
  const [newLoanNumber, setNewLoanNumber] = useState<string>('');

  const { renewLoan } = useLoans();

  // ==================== FETCH EXISTING LOANS ====================
  
  const fetchExistingLoans = async () => {
    if (!loanData.customerId) return;
    
    setIsFetchingExistingLoans(true);
    try {
      console.log('🔍 Fetching existing loans for customer:', loanData.customerId);
      
      const response = await fetch(`/api/data-entry/loans?customerId=${loanData.customerId}`);
      const data = await response.json();
      
      console.log('📋 API Response for existing loans:', data);
      
      if (data.success && data.data) {
        const loans = data.data;
        console.log('✅ Found existing loans:', loans);
        
        // Extract loan numbers and normalize them
        const numbers = loans.map((loan: any) => {
          const loanNum = loan.loanNumber?.trim().toUpperCase();
          return loanNum;
        }).filter(Boolean);
        
        console.log('📊 Normalized existing loan numbers:', numbers);
        setExistingLoanNumbers(numbers);
        
        // Create status map for each loan number
        const statusMap: {[key: string]: string} = {};
        loans.forEach((loan: any) => {
          const normalizedLoanNumber = loan.loanNumber?.trim().toUpperCase();
          if (normalizedLoanNumber) {
            statusMap[normalizedLoanNumber] = loan.status || 'active';
            if (loan.isRenewed) {
              statusMap[normalizedLoanNumber] = 'renewed';
            }
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
      setExistingLoanNumbers([]);
      setExistingLoanStatus({});
    } finally {
      setIsFetchingExistingLoans(false);
    }
  };

  // ==================== CHECK PENDING REQUESTS ====================
  
  const checkPendingRequests = async () => {
    if (!loanData.customerId) return;
    
    try {
      console.log('🔍 Checking for pending renewal requests...');
      
      const response = await fetch(`/api/data-entry/requests?customerId=${loanData.customerId}&type=Loan Renew&status=Pending`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        console.log('⚠️ Found pending renewal request:', data.data[0]);
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

  // ==================== INITIALIZE MODAL ====================
  
  useEffect(() => {
    if (isOpen) {
      console.log('📱 Modal opened, initializing...');
      
      // Fetch existing loans
      fetchExistingLoans();
      checkPendingRequests();
      
      // Find a suggested loan number (next available)
      const suggestedLoanNumber = findSuggestedLoanNumber();
      setNewLoanNumber(suggestedLoanNumber);
      
      // Update form data with current date defaults
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        renewalDate: today,
        emiStartDate: today
      }));
    }
  }, [isOpen]);

  // ==================== LOAN NUMBER VALIDATION ====================
  
  const validateLoanNumber = (loanNumber: string): string => {
    if (!loanNumber.trim()) {
      return 'Loan number is required for renewal';
    }
    
    // Normalize loan number
    const normalizedLoanNumber = loanNumber.trim().toUpperCase();
    
    // Validate format (L1 to L15)
    const loanNum = normalizedLoanNumber.replace('L', '');
    const loanNumValue = parseInt(loanNum);
    
    if (!normalizedLoanNumber.startsWith('L') || isNaN(loanNumValue) || loanNumValue < 1 || loanNumValue > 15) {
      return 'Loan number must be between L1 and L15';
    }
    
    // Check if it's the same as original loan number
    if (normalizedLoanNumber === loanData.loanNumber.trim().toUpperCase()) {
      return 'Cannot use the same loan number for renewal. Please select a different number.';
    }
    
    // Check if loan number already exists for this customer
    if (existingLoanNumbers.includes(normalizedLoanNumber)) {
      const status = existingLoanStatus[normalizedLoanNumber];
      
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

  // Find a suggested loan number (next available)
  const findSuggestedLoanNumber = (): string => {
    // Get all taken numbers
    const takenNumbers = existingLoanNumbers
      .map(num => {
        const match = num.match(/L(\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0);
    
    // Find first available number (1-15)
    for (let i = 1; i <= 15; i++) {
      if (!takenNumbers.includes(i)) {
        return `L${i}`;
      }
    }
    
    // If all numbers are taken, return empty
    return '';
  };

  // Get loan number status for styling
  const getLoanNumberStatus = (loanNumber: string): string => {
    if (!loanNumber) return 'available';
    
    const normalizedLoanNumber = loanNumber.toUpperCase();
    
    // Check if it's the same as original
    if (normalizedLoanNumber === loanData.loanNumber.trim().toUpperCase()) {
      return 'same-as-original';
    }
    
    // Check if loan number already exists for customer
    if (existingLoanNumbers.includes(normalizedLoanNumber)) {
      const status = existingLoanStatus[normalizedLoanNumber];
      if (status === 'active' || status === 'pending') return 'taken';
      if (status === 'renewed') return 'renewed';
      return 'taken';
    }
    
    return 'available';
  };

  // Get background color based on loan number status
  const getOptionBackgroundColor = (loanNumber: string): string => {
    const status = getLoanNumberStatus(loanNumber);
    
    if (status === 'same-as-original') {
      return 'bg-red-100 text-red-800 border-red-300 line-through';
    } else if (status === 'taken') {
      return 'bg-red-100 text-red-800 border-red-300';
    } else if (status === 'pending') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else if (status === 'renewed') {
      return 'bg-purple-100 text-purple-800 border-purple-300';
    } else {
      return 'bg-green-50 text-green-800 border-green-200';
    }
  };

  // Get status text for display
  const getStatusText = (loanNumber: string): string => {
    const status = getLoanNumberStatus(loanNumber);
    
    if (status === 'same-as-original') return '(Same as original - cannot use)';
    if (status === 'taken') return '(Already Taken)';
    if (status === 'pending') return '(Pending Approval)';
    if (status === 'renewed') return '(Renewed)';
    return '(Available)';
  };

  // ==================== FORM VALIDATION ====================
  
  const validateForm = (): boolean => {
    // Validate loan number
    const loanNumberValidation = validateLoanNumber(newLoanNumber);
    if (loanNumberValidation) {
      setLoanNumberError(loanNumberValidation);
      return false;
    }
    
    // Clear any previous error
    setLoanNumberError('');

    // Validate other fields
    if (!formData.newLoanAmount || parseFloat(formData.newLoanAmount) <= 0) {
      alert('Please enter a valid loan amount');
      return false;
    }

    if (!formData.newEmiAmount || parseFloat(formData.newEmiAmount) <= 0) {
      alert('Please enter a valid EMI amount');
      return false;
    }

    if (!formData.newLoanDays || parseInt(formData.newLoanDays) <= 0) {
      alert('Please enter valid loan days');
      return false;
    }

    if (!formData.renewalDate) {
      alert('Please select a renewal date');
      return false;
    }

    if (!formData.emiStartDate) {
      alert('Please select an EMI start date');
      return false;
    }

    // Validate custom EMI amount if applicable
    if (formData.emiType === 'custom' && formData.newLoanType !== 'Daily') {
      if (!formData.customEmiAmount || parseFloat(formData.customEmiAmount) <= 0) {
        alert('Please enter a valid custom EMI amount for custom EMI type');
        return false;
      }
    }

    return true;
  };

  // ==================== SUBMIT HANDLER ====================
  
  const handleSubmit = async () => {
    // Check for pending request
    if (hasPendingRequest) {
      alert('A pending renewal request already exists for this customer. Please wait for admin approval before submitting another request.');
      return;
    }

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Double-check for pending request
    const hasPending = await checkPendingRequests();
    if (hasPending) {
      alert('A pending renewal request was just detected. Please wait for admin approval before submitting another request.');
      return;
    }

    setIsLoading(true);
    try {
      // Prepare request data with NEW LOAN NUMBER
      const requestData = {
        ...formData,
        newLoanNumber: newLoanNumber.trim().toUpperCase(), // Add the selected loan number
        requestedBy: 'data_entry_operator' // This should come from user context
      };
      
      console.log('📤 Submitting renewal request with data:', requestData);
      
      // Call the API directly
      const response = await fetch('/api/data-entry/renew-loan-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Server returned invalid response');
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Request failed');
      }
      
      console.log('✅ Renewal request submitted:', data);
      
      alert('Loan renewal request submitted successfully! Waiting for admin approval.');
      onSuccess?.();
      onClose();
      
    } catch (error: any) {
      console.error('❌ Error submitting renewal:', error);
      
      // Handle specific error types
      if (error.message.includes('409') || error.message.includes('Conflict') || error.message.includes('pending')) {
        alert(`Cannot submit request: ${error.message}\n\nA pending renewal request may already exist.`);
        setHasPendingRequest(true);
      } else if (error.message.includes('Loan number')) {
        // Loan number validation error from API
        setLoanNumberError(error.message);
        alert(`Loan number error: ${error.message}`);
      } else {
        alert('Error: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== REFRESH EXISTING LOANS ====================
  
  const handleRefreshExistingLoans = () => {
    console.log('🔄 Refreshing existing loans...');
    fetchExistingLoans();
    checkPendingRequests();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      {/* UPDATED: Changed from max-w-2xl to max-w-5xl to match CustomerDetailsModal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-auto max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-8 py-5 border-b border-gray-200 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Renew Loan (Requires Approval)
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Loan: {formData.loanNumber} • Customer: {formData.customerName}
              </p>
              <div className="flex items-center space-x-2 mt-2">
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
              {hasPendingRequest && (
                <p className="text-xs text-yellow-600 mt-1 font-semibold">
                  ⚠️ A pending renewal request already exists for this customer!
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Information Alert */}
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-lg">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Important</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Loan renewal requires admin approval. The renewed loan will be activated only after approval.
                </p>
              </div>
            </div>
          </div>

          {/* Current Loan Information */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Current Loan Details</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Loan Number</p>
                <p className="font-semibold">{formData.loanNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Current Amount</p>
                <p className="font-semibold">₹{parseFloat(formData.newLoanAmount).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Current EMI</p>
                <p className="font-semibold">₹{parseFloat(formData.newEmiAmount).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Current Loan Type</p>
                <p className="font-semibold">{formData.newLoanType}</p>
              </div>
            </div>
          </div>

          {/* NEW: Loan Number Selection Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🔢</span>
              Select Loan Number for Renewed Loan *
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose Available Loan Number
                  <span className="text-red-500 ml-1">(Required)</span>
                </label>
                
                <select
                  className={`w-full px-3 py-2 border ${loanNumberError ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  value={newLoanNumber}
                  onChange={(e) => {
                    setNewLoanNumber(e.target.value);
                    const error = validateLoanNumber(e.target.value);
                    setLoanNumberError(error);
                  }}
                  disabled={isFetchingExistingLoans || hasPendingRequest}
                >
                  <option value="">Select Loan Number (L1 to L15)</option>
                  {ALL_LOAN_NUMBERS.map((loanNum) => {
                    const status = getLoanNumberStatus(loanNum);
                    const isTaken = status === 'taken' || status === 'pending' || status === 'renewed' || status === 'same-as-original';
                    const bgColor = getOptionBackgroundColor(loanNum);
                    const statusText = getStatusText(loanNum);
                    
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
                
                {/* Error message */}
                {loanNumberError && (
                  <p className="text-red-500 text-xs mt-1 flex items-center">
                    <span className="mr-1">❌</span>
                    {loanNumberError}
                  </p>
                )}
                
                {/* Help text */}
                <p className="text-xs text-gray-500 mt-2">
                  Select an available loan number between L1 and L15. Cannot use the same number as the original loan.
                </p>
              </div>
              
              {/* Status legend */}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium text-gray-700">Status Legend:</span>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                  <span className="text-xs text-gray-600">Available</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                  <span className="text-xs text-gray-600">Taken</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
                  <span className="text-xs text-gray-600">Pending</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-1"></div>
                  <span className="text-xs text-gray-600">Renewed</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-1 line-through"></div>
                  <span className="text-xs text-gray-600">Same as Original</span>
                </div>
              </div>
              
              {/* Existing loans info */}
              {existingLoanNumbers.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">Existing Loans for this customer:</p>
                  <div className="flex flex-wrap gap-1">
                    {existingLoanNumbers.map((loanNum, index) => {
                      const status = existingLoanStatus[loanNum] || 'active';
                      const isOriginal = loanNum === formData.loanNumber.trim().toUpperCase();
                      
                      return (
                        <span 
                          key={index} 
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            isOriginal 
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : status === 'active'
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : status === 'renewed'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : 'bg-gray-100 text-gray-800 border border-gray-300'
                          }`}
                        >
                          {loanNum} {isOriginal && '(Original)'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Renewal Form Fields */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Renewal Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Renewal Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.renewalDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, renewalDate: e.target.value }))}
                  disabled={hasPendingRequest}
                />
              </div>

              {/* New Loan Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Loan Amount *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">₹</span>
                  </div>
                  <input
                    type="number"
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.newLoanAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, newLoanAmount: e.target.value }))}
                    min="0"
                    disabled={hasPendingRequest}
                  />
                </div>
              </div>

              {/* New EMI Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New EMI Amount *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">₹</span>
                  </div>
                  <input
                    type="number"
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.newEmiAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, newEmiAmount: e.target.value }))}
                    min="0"
                    disabled={hasPendingRequest}
                  />
                </div>
              </div>

              {/* New Loan Days */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Loan Days *
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.newLoanDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, newLoanDays: e.target.value }))}
                  min="1"
                  disabled={hasPendingRequest}
                />
              </div>

              {/* New Loan Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Loan Type *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.newLoanType}
                  onChange={(e) => setFormData(prev => ({ ...prev, newLoanType: e.target.value }))}
                  disabled={hasPendingRequest}
                >
                  {loanTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* EMI Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  EMI Start Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.emiStartDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, emiStartDate: e.target.value }))}
                  disabled={hasPendingRequest}
                />
              </div>

              {/* EMI Type */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  EMI Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      checked={formData.emiType === 'fixed'}
                      onChange={() => setFormData(prev => ({ ...prev, emiType: 'fixed', customEmiAmount: '' }))}
                      disabled={hasPendingRequest}
                    />
                    <span className="ml-2 text-sm text-gray-700">Fixed EMI</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      checked={formData.emiType === 'custom'}
                      onChange={() => setFormData(prev => ({ ...prev, emiType: 'custom' }))}
                      disabled={hasPendingRequest || formData.newLoanType === 'Daily'}
                    />
                    <span className="ml-2 text-sm text-gray-700">Custom EMI</span>
                  </label>
                </div>
                {formData.newLoanType === 'Daily' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Daily loans only support Fixed EMI type
                  </p>
                )}
              </div>

              {/* Custom EMI Amount */}
              {formData.emiType === 'custom' && formData.newLoanType !== 'Daily' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom EMI Amount *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">₹</span>
                    </div>
                    <input
                      type="number"
                      className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.customEmiAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, customEmiAmount: e.target.value }))}
                      min="0"
                      disabled={hasPendingRequest}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Add any remarks about this renewal..."
                disabled={hasPendingRequest}
              />
            </div>

            {/* Renewal Summary */}
            {formData.newLoanAmount && formData.newEmiAmount && formData.newLoanDays && newLoanNumber && (
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Renewal Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-green-700">New Loan Number</p>
                    <p className="font-semibold text-green-900">{newLoanNumber.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700">New Loan Amount</p>
                    <p className="font-semibold text-green-900">₹{parseFloat(formData.newLoanAmount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700">New EMI Amount</p>
                    <p className="font-semibold text-green-900">₹{parseFloat(formData.newEmiAmount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700">New Loan Days</p>
                    <p className="font-semibold text-green-900">{formData.newLoanDays}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-green-700">New Loan Type</p>
                    <p className="font-semibold text-green-900">{formData.newLoanType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700">Renewal Date</p>
                    <p className="font-semibold text-green-900">
                      {new Date(formData.renewalDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700">Original Loan</p>
                    <p className="font-semibold text-green-900">{formData.loanNumber}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-8 py-5 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Renewing:</span> {formData.loanNumber} →{' '}
                <span className="font-bold text-blue-700">
                  {newLoanNumber || 'Select loan number'}
                </span>
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
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || isFetchingExistingLoans || hasPendingRequest || !newLoanNumber || !!loanNumberError}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block mr-2 animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                    Submitting...
                  </>
                ) : hasPendingRequest ? (
                  'Pending Request Exists'
                ) : (
                  'Submit for Approval'
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Loan renewal requires admin approval before activation.
          </p>
        </div>
      </div>
    </div>
  );
}