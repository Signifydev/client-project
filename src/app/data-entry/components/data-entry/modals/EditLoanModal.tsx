'use client';

import { useState, useEffect } from 'react';
import { EditLoanData } from '@/src/app/data-entry/types/dataEntry';
import { useLoans } from '@/src/app/data-entry/hooks/useLoans';

interface EditLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanData: EditLoanData;
  onSuccess?: () => void;
  currentOperator?: { id: string; name: string };
}

// Generate loan number options L1 to L15
const ALL_LOAN_NUMBERS = Array.from({ length: 15 }, (_, i) => `L${i + 1}`);

interface Loan {
  _id: string;
  loanNumber: string;
  status: string;
  customerId: string;
}

export default function EditLoanModal({
  isOpen,
  onClose,
  loanData,
  onSuccess,
  currentOperator
}: EditLoanModalProps) {
  const [formData, setFormData] = useState<EditLoanData>(loanData);
  const [isLoading, setIsLoading] = useState(false);
  const [totalLoanAmount, setTotalLoanAmount] = useState<number>(0);
  const [existingLoans, setExistingLoans] = useState<Loan[]>([]);
  const [isFetchingExistingLoans, setIsFetchingExistingLoans] = useState(false);
  const [loanNumberError, setLoanNumberError] = useState('');

  const { editLoan } = useLoans();

  // Fetch existing loans when modal opens
  useEffect(() => {
    const fetchExistingLoans = async () => {
      if (isOpen && loanData.customerId) {
        setIsFetchingExistingLoans(true);
        try {
          console.log('🔍 Fetching existing loans for customer:', loanData.customerId);
          
          const response = await fetch(`/api/data-entry/loans?customerId=${loanData.customerId}`);
          const data = await response.json();
          
          console.log('📋 API Response for existing loans:', data);
          
          if (data.success && data.data) {
            console.log('✅ Found existing loans:', data.data);
            setExistingLoans(data.data);
          } else {
            console.log('⚠️ No existing loans found or API error');
            setExistingLoans([]);
          }
        } catch (error) {
          console.error('❌ Error fetching existing loans:', error);
          setExistingLoans([]);
        } finally {
          setIsFetchingExistingLoans(false);
        }
      }
    };

    fetchExistingLoans();
  }, [isOpen, loanData.customerId]);

  // Calculate total loan amount (Principal + Interest)
  useEffect(() => {
    calculateTotalLoanAmount();
  }, [formData.emiAmount, formData.loanDays, formData.emiType, formData.customEmiAmount, formData.loanType]);

  const calculateTotalLoanAmount = () => {
    const emiAmount = parseFloat(formData.emiAmount) || 0;
    const loanDays = parseInt(formData.loanDays) || 0;
    const customEmiAmount = parseFloat(formData.customEmiAmount || '0') || 0;
    
    let total = 0;
    
    if (formData.loanType === 'Daily') {
      total = emiAmount * loanDays;
    } else if (formData.loanType === 'Weekly' || formData.loanType === 'Monthly') {
      if (formData.emiType === 'fixed') {
        total = emiAmount * loanDays;
      } else if (formData.emiType === 'custom') {
        const fixedPeriods = loanDays - 1;
        const fixedAmount = emiAmount * fixedPeriods;
        total = fixedAmount + customEmiAmount;
      }
    }
    
    setTotalLoanAmount(total);
  };

  // Loan number validation
  const validateLoanNumber = (loanNumber: string): string => {
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
    
    // Check if this is the current loan number (always allowed)
    const currentLoanNumber = loanData.loanNumber?.trim().toUpperCase();
    if (normalizedLoanNumber === currentLoanNumber) {
      return ''; // Current loan number is always valid
    }
    
    // Check if loan number already exists for this customer (excluding the current loan)
    const isTaken = existingLoans.some(loan => {
      // Skip the current loan being edited
      if (loan._id === loanData.loanId) return false;
      
      const existingLoanNumber = loan.loanNumber?.trim().toUpperCase();
      return existingLoanNumber === normalizedLoanNumber && 
             (loan.status === 'active' || loan.status === 'pending');
    });
    
    if (isTaken) {
      return `Loan number "${normalizedLoanNumber}" is already taken by this customer`;
    }
    
    return '';
  };

  // Get loan number status for styling
  const getLoanNumberStatus = (loanNumber: string): string => {
    if (!loanNumber) return 'available';
    
    const normalizedLoanNumber = loanNumber.toUpperCase();
    const currentLoanNumber = loanData.loanNumber?.trim().toUpperCase();
    
    // Check if it's the current loan number
    if (normalizedLoanNumber === currentLoanNumber) {
      return 'current';
    }
    
    // Check if loan number already exists for customer (excluding current loan)
    const existingLoan = existingLoans.find(loan => {
      if (loan._id === loanData.loanId) return false; // Skip current loan
      
      const existingLoanNumber = loan.loanNumber?.trim().toUpperCase();
      return existingLoanNumber === normalizedLoanNumber;
    });
    
    if (existingLoan) {
      const status = existingLoan.status;
      if (status === 'active' || status === 'pending') return 'taken';
      if (status === 'rejected') return 'rejected';
      if (status === 'renewed') return 'renewed';
      return 'taken';
    }
    
    return 'available';
  };

  // Get background color based on loan number status
  const getOptionBackgroundColor = (loanNumber: string): string => {
    const status = getLoanNumberStatus(loanNumber);
    
    if (status === 'current') {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (status === 'taken') {
      return 'bg-red-100 text-red-800 border-red-300';
    } else if (status === 'pending') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    } else if (status === 'rejected') {
      return 'bg-gray-100 text-gray-500 border-gray-300';
    } else if (status === 'renewed') {
      return 'bg-purple-100 text-purple-800 border-purple-300';
    } else {
      return 'bg-green-50 text-green-800 border-green-200';
    }
  };

  // Get status text for display
  const getStatusText = (loanNumber: string): string => {
    const status = getLoanNumberStatus(loanNumber);
    
    if (status === 'current') return '(Current Loan)';
    if (status === 'taken') return '(Already Taken)';
    if (status === 'pending') return '(Pending Approval)';
    if (status === 'rejected') return '(Previously Rejected)';
    if (status === 'renewed') return '(Renewed)';
    return '(Available)';
  };

  // Handle loan number change
  const handleLoanNumberChange = (loanNumber: string) => {
    const error = validateLoanNumber(loanNumber);
    setLoanNumberError(error);
    setFormData(prev => ({ ...prev, loanNumber }));
  };

  const handleSubmit = async () => {
    // Validate loan number
    const loanNumberError = validateLoanNumber(formData.loanNumber);
    if (loanNumberError) {
      setLoanNumberError(loanNumberError);
      alert(loanNumberError);
      return;
    }

    // Validate required fields
    if (!formData.loanNumber || formData.loanNumber.trim() === '') {
      alert('Please select a loan number');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid principal amount');
      return;
    }

    if (!formData.emiAmount || parseFloat(formData.emiAmount) <= 0) {
      alert('Please enter a valid EMI amount');
      return;
    }

    if (!formData.loanDays || parseInt(formData.loanDays) <= 0) {
      alert('Please enter valid loan days');
      return;
    }

    // For custom EMI type, validate custom EMI amount
    if (formData.emiType === 'custom' && (!formData.customEmiAmount || parseFloat(formData.customEmiAmount) <= 0)) {
      alert('Please enter a valid custom EMI amount for the last period');
      return;
    }

    setIsLoading(true);
    try {
      // Create a properly typed EditLoanData object with all required fields
      const updatedFormData: EditLoanData = {
        loanId: formData.loanId,
        customerId: formData.customerId,
        customerName: formData.customerName,
        customerNumber: formData.customerNumber,
        loanNumber: formData.loanNumber,
        amount: formData.amount, // This is Principal Amount
        emiAmount: formData.emiAmount,
        loanType: formData.loanType,
        dateApplied: formData.dateApplied,
        loanDays: formData.loanDays,
        emiType: formData.emiType,
        customEmiAmount: formData.customEmiAmount,
        emiStartDate: formData.emiStartDate,
        // Ensure originalData has all required properties with proper defaults
        originalData: {
          loanNumber: formData.originalData?.loanNumber || loanData.loanNumber,
          amount: formData.originalData?.amount || parseFloat(loanData.amount) || 0,
          emiAmount: formData.originalData?.emiAmount || parseFloat(loanData.emiAmount) || 0,
          loanType: formData.originalData?.loanType || loanData.loanType,
          dateApplied: formData.originalData?.dateApplied || loanData.dateApplied,
          loanDays: formData.originalData?.loanDays || parseInt(loanData.loanDays) || 0,
          emiType: formData.originalData?.emiType || loanData.emiType || 'fixed',
          customEmiAmount: formData.originalData?.customEmiAmount || 
            (loanData.customEmiAmount ? parseFloat(loanData.customEmiAmount) : null),
          emiStartDate: formData.originalData?.emiStartDate || loanData.emiStartDate || loanData.dateApplied
        }
      };

      await editLoan(updatedFormData, currentOperator);
      
      alert('Loan edit request submitted successfully! Waiting for admin approval.');
      onSuccess?.();
      onClose();
      
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Get period label based on loan type
  const getPeriodLabel = () => {
    switch (formData.loanType) {
      case 'Daily': return 'days';
      case 'Weekly': return 'weeks';
      case 'Monthly': return 'months';
      default: return 'periods';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-auto max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-8 py-5 border-b border-gray-200 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Edit Loan Details
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Customer: {formData.customerName} ({formData.customerNumber})
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-xs text-gray-500">
                  Existing Loans: <span className="font-medium">{existingLoans.length}</span>
                </p>
                <button
                  onClick={() => window.location.reload()}
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
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors p-1"
            >
              <span className="text-3xl">×</span>
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Information Alert */}
          <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-lg">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-semibold text-yellow-800">Important</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  All loan modifications require admin approval. The changes will be applied only after approval.
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields Container */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 mb-8">
            <div className="px-8 py-4 border-b border-gray-200">
              <h4 className="text-lg font-bold text-gray-900">Loan Information</h4>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Loan Number (Dropdown Select) - UPDATED WITH STATUS */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Loan Number *
                  </label>
                  <div className="space-y-2">
                    <select
                      className={`w-full px-4 py-2.5 border ${loanNumberError ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 bg-white`}
                      value={formData.loanNumber}
                      onChange={(e) => handleLoanNumberChange(e.target.value)}
                      disabled={isFetchingExistingLoans}
                    >
                      <option value="">Select Loan Number</option>
                      {ALL_LOAN_NUMBERS.map((loanNum) => {
                        const status = getLoanNumberStatus(loanNum);
                        const isTaken = status === 'taken' || status === 'pending' || status === 'renewed';
                        const isCurrent = status === 'current';
                        const bgColor = getOptionBackgroundColor(loanNum);
                        const statusText = getStatusText(loanNum);
                        
                        return (
                          <option 
                            key={loanNum} 
                            value={loanNum}
                            className={`${bgColor} ${isTaken && !isCurrent ? 'cursor-not-allowed opacity-70' : ''}`}
                            disabled={isTaken && !isCurrent} // Disable taken numbers (but not current)
                          >
                            {loanNum} {statusText}
                          </option>
                        );
                      })}
                    </select>
                    
                    {/* Status legend */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500 mr-2">Status Legend:</span>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
                        <span className="text-xs text-gray-600">Current</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                        <span className="text-xs text-gray-600">Available</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                        <span className="text-xs text-gray-600">Taken</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-purple-500 mr-1"></div>
                        <span className="text-xs text-gray-600">Renewed</span>
                      </div>
                    </div>
                  </div>
                  
                  {loanNumberError && (
                    <p className="text-red-500 text-xs mt-1 flex items-center">
                      <span className="mr-1">❌</span>
                      {loanNumberError}
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1">
                    {isFetchingExistingLoans ? 'Loading loan numbers...' : 'Select from available loan numbers'}
                  </p>
                </div>

                {/* Customer Information (Read-only) */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Customer
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                    value={`${formData.customerNumber} - ${formData.customerName}`}
                    readOnly
                  />
                </div>

                {/* Amount (Principal) - UPDATED LABEL */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Amount (Principal) * {/* UPDATED LABEL */}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-500">₹</span>
                    </div>
                    <input
                      type="number"
                      className="w-full pl-12 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                      min="0"
                      step="0.01"
                      placeholder="Enter principal amount"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Principal amount given to customer
                  </p>
                </div>

                {/* Loan Type (Read-only) */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Loan Type
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                    value={formData.loanType}
                    readOnly
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Loan type cannot be changed once created
                  </p>
                </div>

                {/* Loan Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Loan Date *
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={formData.dateApplied}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateApplied: e.target.value }))}
                  />
                </div>

                {/* EMI Start Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    EMI Start Date *
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={formData.emiStartDate || formData.dateApplied}
                    onChange={(e) => setFormData(prev => ({ ...prev, emiStartDate: e.target.value }))}
                  />
                </div>

                {/* Loan Days */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Number of {getPeriodLabel()} *
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                    value={formData.loanDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, loanDays: e.target.value }))}
                    min="1"
                  />
                </div>

                {/* EMI Amount */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {formData.emiType === 'custom' && formData.loanType !== 'Daily' 
                      ? 'Fixed EMI Amount *' 
                      : 'EMI Amount *'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-500">₹</span>
                    </div>
                    <input
                      type="number"
                      className="w-full pl-12 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      value={formData.emiAmount}
                      onChange={(e) => setFormData(prev => ({ ...prev, emiAmount: e.target.value }))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Total Loan Amount (Auto-calculated, Read-only) */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Total Loan Amount (Principal + Interest)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-500">₹</span>
                    </div>
                    <input
                      type="text"
                      className="w-full pl-12 px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                      value={totalLoanAmount.toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                      readOnly
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    EMI (₹{parseFloat(formData.emiAmount || '0').toLocaleString()}) × {formData.loanDays} {getPeriodLabel()}
                  </p>
                </div>
              </div>

              {/* EMI Collection Type (for Weekly/Monthly loans) */}
              {(formData.loanType === 'Weekly' || formData.loanType === 'Monthly') && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                    <label className="block text-sm font-semibold text-blue-800 mb-3">
                      EMI Collection Type *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.emiType === 'fixed' 
                          ? 'border-blue-500 bg-blue-100' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="flex items-center">
                          <input
                            type="radio"
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                            checked={formData.emiType === 'fixed'}
                            onChange={() => setFormData(prev => ({ 
                              ...prev, 
                              emiType: 'fixed', 
                              customEmiAmount: ''
                            }))}
                          />
                          <div className="ml-3">
                            <span className="text-sm font-medium text-gray-900">Fixed EMI</span>
                            <p className="text-xs text-gray-600 mt-1">
                              Same EMI amount for all periods
                            </p>
                          </div>
                        </div>
                      </label>
                      
                      <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.emiType === 'custom' 
                          ? 'border-blue-500 bg-blue-100' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="flex items-center">
                          <input
                            type="radio"
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                            checked={formData.emiType === 'custom'}
                            onChange={() => setFormData(prev => ({ ...prev, emiType: 'custom' }))}
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

              {/* Custom EMI Amount */}
              {formData.loanType !== 'Daily' && formData.emiType === 'custom' && (
                <div className="mt-6">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Last EMI Amount *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <span className="text-gray-500">₹</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      className="w-full pl-12 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                      value={formData.customEmiAmount || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, customEmiAmount: e.target.value }))}
                      placeholder="Enter last EMI amount"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Amount for the last {formData.loanType.toLowerCase()} period
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Original Data Reference */}
          {formData.originalData && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
              <h4 className="font-semibold text-blue-900 mb-4 text-lg">Original Data (For Reference)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-1">Original Loan Number</p>
                  <p className="font-bold text-blue-900 text-sm">{formData.originalData.loanNumber || loanData.loanNumber}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-1">Original Principal</p>
                  <p className="font-bold text-blue-900 text-sm">₹{formData.originalData.amount.toLocaleString()}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-1">Original EMI</p>
                  <p className="font-bold text-blue-900 text-sm">₹{formData.originalData.emiAmount.toLocaleString()}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-1">Original Loan Days</p>
                  <p className="font-bold text-blue-900 text-sm">{formData.originalData.loanDays}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-1">Original Loan Type</p>
                  <p className="font-bold text-blue-900 text-sm">{formData.originalData.loanType}</p>
                </div>
                {formData.originalData.emiType && (
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-blue-700 mb-1">Original EMI Type</p>
                    <p className="font-bold text-blue-900 text-sm">
                      {formData.originalData.emiType === 'fixed' ? 'Fixed EMI' : 'Custom EMI'}
                    </p>
                  </div>
                )}
                {formData.originalData.customEmiAmount && (
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-blue-700 mb-1">Original Custom EMI</p>
                    <p className="font-bold text-blue-900 text-sm">₹{formData.originalData.customEmiAmount.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white px-8 py-5 border-t border-gray-200">
          <div className="flex justify-between">
            <div className="text-sm text-gray-600 flex items-center">
              <span className="mr-2">⚠️</span>
              <span>All changes require admin approval</span>
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
                disabled={isLoading || !!loanNumberError}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block mr-2 animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></span>
                    Submitting...
                  </>
                ) : (
                  'Submit for Approval'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}