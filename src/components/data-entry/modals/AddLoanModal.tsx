'use client';

import { useState } from 'react';
import { CustomerDetails } from '@/src/types/dataEntry';
import { loanTypes } from '@/src/utils/constants';
import { useLoans } from '@/src/hooks/useLoans';

interface AddLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerDetails: CustomerDetails;
  onSuccess?: () => void;
}

interface NewLoanData {
  loanAmount: string;
  loanDate: string;
  emiStartDate: string;
  emiAmount: string;
  loanType: string;
  loanDays: string;
  emiType: 'fixed' | 'custom';
  customEmiAmount: string;
}

export default function AddLoanModal({
  isOpen,
  onClose,
  customerDetails,
  onSuccess
}: AddLoanModalProps) {
  const [newLoanData, setNewLoanData] = useState<NewLoanData>({
    loanAmount: '',
    loanDate: new Date().toISOString().split('T')[0],
    emiStartDate: new Date().toISOString().split('T')[0],
    emiAmount: '',
    loanType: 'Monthly',
    loanDays: '30',
    emiType: 'fixed',
    customEmiAmount: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const { addLoan } = useLoans();

  // Calculate total loan amount
  const calculateTotalLoanAmount = (): number => {
    const emiAmount = parseFloat(newLoanData.emiAmount) || 0;
    const loanDays = parseFloat(newLoanData.loanDays) || 0;
    const customEmiAmount = parseFloat(newLoanData.customEmiAmount || '0') || 0;
    
    if (newLoanData.loanType === 'Daily') {
      return emiAmount * loanDays;
    } else if (newLoanData.loanType === 'Weekly' || newLoanData.loanType === 'Monthly') {
      if (newLoanData.emiType === 'fixed') {
        return emiAmount * loanDays;
      } else if (newLoanData.emiType === 'custom') {
        const fixedPeriods = loanDays - 1;
        const fixedAmount = emiAmount * fixedPeriods;
        return fixedAmount + customEmiAmount;
      }
    }
    return 0;
  };

  const totalLoanAmount = calculateTotalLoanAmount();
  const periodLabel = newLoanData.loanType === 'Daily' ? 'days' : 
                     newLoanData.loanType === 'Weekly' ? 'weeks' : 'months';
  const emiAmount = parseFloat(newLoanData.emiAmount) || 0;
  const loanDays = parseFloat(newLoanData.loanDays) || 0;
  const customEmiAmount = parseFloat(newLoanData.customEmiAmount || '0') || 0;

  const handleSubmit = async () => {
    const totalAmount = calculateTotalLoanAmount();
    
    if (totalAmount <= 0) {
      alert('Please enter a valid loan amount');
      return;
    }

    if (!newLoanData.emiAmount || parseFloat(newLoanData.emiAmount) <= 0) {
      alert('Please enter a valid EMI amount');
      return;
    }

    if (!newLoanData.loanDays || parseInt(newLoanData.loanDays) <= 0) {
      alert('Please enter valid loan days');
      return;
    }

    setIsLoading(true);
    try {
      const loanData = {
        ...newLoanData,
        customerId: customerDetails._id,
        customerName: customerDetails.name,
        customerNumber: customerDetails.customerNumber,
        loanAmount: totalAmount.toString()  // Use the calculated total
      };
      
      await addLoan(loanData as any);
      
      alert('New loan request submitted successfully! Waiting for admin approval.');
      onSuccess?.();
      onClose();
      
      // Reset form
      setNewLoanData({
        loanAmount: '',  // Keep this as empty string since it's calculated
        loanDate: new Date().toISOString().split('T')[0],
        emiStartDate: new Date().toISOString().split('T')[0],
        emiAmount: '',
        loanType: 'Monthly',
        loanDays: '30',
        emiType: 'fixed',
        customEmiAmount: ''
      });
      
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center p-4 pt-20">
      {/* Increased width to max-w-4xl */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-auto mb-8">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-lg z-10">
          <div className="flex items-center justify-between p-4 md:p-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">➕</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Add New Loan
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Customer: {customerDetails?.customerNumber} • {customerDetails?.name}
                </p>
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
                  This loan addition request requires admin approval. 
                  The loan will only be active after approval.
                </p>
              </div>
            </div>
          </div>

          {/* Loan Details Header */}
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-blue-400 text-lg">💰</span>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">Loan Details</h4>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Loan Type & Loan Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Loan Type *
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={newLoanData.loanType}
                  onChange={(e) => {
                    const newLoanType = e.target.value;
                    setNewLoanData(prev => ({ 
                      ...prev, 
                      loanType: newLoanType,
                      emiType: newLoanType === 'Daily' ? 'fixed' : prev.emiType,
                      customEmiAmount: newLoanType === 'Daily' ? '' : prev.customEmiAmount,
                    }));
                  }}
                >
                  {loanTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Loan Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={newLoanData.loanDate}
                  onChange={(e) => setNewLoanData(prev => ({ ...prev, loanDate: e.target.value }))}
                />
              </div>
            </div>

            {/* EMI Amount & Loan Days */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {newLoanData.emiType === 'custom' && newLoanData.loanType !== 'Daily' 
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
                    value={newLoanData.emiAmount}
                    onChange={(e) => setNewLoanData(prev => ({ ...prev, emiAmount: e.target.value }))}
                    placeholder="Enter EMI amount"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Number of {newLoanData.loanType === 'Daily' ? 'Days' : 
                             newLoanData.loanType === 'Weekly' ? 'Weeks' : 'Months'} *
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={newLoanData.loanDays}
                  onChange={(e) => setNewLoanData(prev => ({ ...prev, loanDays: e.target.value }))}
                  placeholder={`Enter number of ${newLoanData.loanType === 'Daily' ? 'days' : 
                               newLoanData.loanType === 'Weekly' ? 'weeks' : 'months'}`}
                />
              </div>
            </div>

            {/* EMI Start Date & Total Loan Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  EMI Start Date *
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={newLoanData.emiStartDate}
                  onChange={(e) => setNewLoanData(prev => ({ ...prev, emiStartDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Total Loan Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">₹</span>
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                    value={totalLoanAmount.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* EMI Collection Type (for Weekly/Monthly loans) */}
            {(newLoanData.loanType === 'Weekly' || newLoanData.loanType === 'Monthly') && (
              <div className="md:col-span-2">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-blue-800 mb-3">
                    EMI Collection Type *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      newLoanData.emiType === 'fixed' 
                        ? 'border-blue-500 bg-blue-100' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                          checked={newLoanData.emiType === 'fixed'}
                          onChange={() => setNewLoanData(prev => ({ 
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
                      newLoanData.emiType === 'custom' 
                        ? 'border-blue-500 bg-blue-100' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500"
                          checked={newLoanData.emiType === 'custom'}
                          onChange={() => setNewLoanData(prev => ({ ...prev, emiType: 'custom' }))}
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
            {newLoanData.loanType !== 'Daily' && newLoanData.emiType === 'custom' && (
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
                    value={newLoanData.customEmiAmount}
                    onChange={(e) => setNewLoanData(prev => ({ ...prev, customEmiAmount: e.target.value }))}
                    placeholder="Enter last EMI amount"
                  />
                </div>
              </div>
            )}

            {/* Loan Summary */}
            {(newLoanData.emiAmount || newLoanData.loanDays) && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Loan Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Loan Type</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{newLoanData.loanType}</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Periods</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{loanDays} {periodLabel}</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      {newLoanData.emiType === 'custom' ? 'Fixed EMI' : 'EMI Amount'}
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1">₹{emiAmount.toLocaleString('en-IN')}</p>
                  </div>
                  {newLoanData.loanType !== 'Daily' && newLoanData.emiType === 'custom' && (
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Last EMI Amount</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">₹{customEmiAmount.toLocaleString('en-IN')}</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-600">Calculation:</p>
                      {newLoanData.loanType === 'Daily' ? (
                        <p className="text-xs text-gray-500">
                          ₹{emiAmount.toLocaleString()} × {loanDays} days
                        </p>
                      ) : newLoanData.emiType === 'fixed' ? (
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

        {/* Modal Footer - Sticky at bottom */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 rounded-b-lg p-4 md:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              <span className="font-medium">Note:</span> This request requires admin approval
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
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