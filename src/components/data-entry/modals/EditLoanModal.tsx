'use client';

import { useState, useEffect } from 'react';
import { EditLoanData } from '@/src/types/dataEntry';
import { loanTypes } from '@/src/utils/constants';
import { useLoans } from '@/src/hooks/useLoans';

interface EditLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanData: EditLoanData;
  onSuccess?: () => void;
}

export default function EditLoanModal({
  isOpen,
  onClose,
  loanData,
  onSuccess
}: EditLoanModalProps) {
  const [formData, setFormData] = useState<EditLoanData>(loanData);
  const [isLoading, setIsLoading] = useState(false);
  const [totalLoanAmount, setTotalLoanAmount] = useState<number>(0);

  const { editLoan } = useLoans();

  // Calculate total loan amount
  useEffect(() => {
    calculateTotalLoanAmount();
  }, [formData.emiAmount, formData.loanDays, formData.emiType, formData.customEmiAmount, formData.loanType]);

  const calculateTotalLoanAmount = () => {
    const emiAmount = parseFloat(formData.emiAmount) || 0;
    const loanDays = parseInt(formData.loanDays) || 0;
    const customEmiAmount = parseFloat(formData.customEmiAmount || '0') || 0;
    
    let total = 0;
    
    if (formData.loanType === 'Daily') {
      // Daily loans: EMI Amount × Loan Days
      total = emiAmount * loanDays;
    } else if (formData.loanType === 'Weekly' || formData.loanType === 'Monthly') {
      if (formData.emiType === 'fixed') {
        // Fixed EMI: EMI Amount × Loan Days
        total = emiAmount * loanDays;
      } else if (formData.emiType === 'custom') {
        // Custom EMI: (Fixed EMI × (Loan Days - 1)) + Custom EMI Amount
        const fixedPeriods = loanDays - 1;
        const fixedAmount = emiAmount * fixedPeriods;
        total = fixedAmount + customEmiAmount;
      }
    }
    
    setTotalLoanAmount(total);
  };

  const handleSubmit = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid loan amount');
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
      await editLoan(formData);
      
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
                Loan: {formData.loanNumber} • Customer: {formData.customerName}
              </p>
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
                {/* Loan Number (Read-only) */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Loan Number
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                    value={formData.loanNumber}
                    readOnly
                  />
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
                    Total Loan Amount
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
                    Auto-calculated based on EMI and periods
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

              {/* Loan Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Loan Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Loan Type</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{formData.loanType}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Periods</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{formData.loanDays} {getPeriodLabel()}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        {formData.emiType === 'custom' ? 'Fixed EMI' : 'EMI Amount'}
                      </p>
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        ₹{(parseFloat(formData.emiAmount) || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    {formData.loanType !== 'Daily' && formData.emiType === 'custom' && (
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Last EMI Amount</p>
                        <p className="text-sm font-bold text-gray-900 mt-1">
                          ₹{(parseFloat(formData.customEmiAmount || '0') || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-600">Calculation:</p>
                        {formData.loanType === 'Daily' ? (
                          <p className="text-xs text-gray-500">
                            ₹{(parseFloat(formData.emiAmount) || 0).toLocaleString()} × {formData.loanDays} days
                          </p>
                        ) : formData.emiType === 'fixed' ? (
                          <p className="text-xs text-gray-500">
                            ₹{(parseFloat(formData.emiAmount) || 0).toLocaleString()} × {formData.loanDays} {getPeriodLabel()}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">
                            (₹{(parseFloat(formData.emiAmount) || 0).toLocaleString()} × {parseInt(formData.loanDays) - 1}) + 
                            ₹{(parseFloat(formData.customEmiAmount || '0') || 0).toLocaleString()}
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
              </div>
            </div>
          </div>

          {/* Original Data Reference */}
          {formData.originalData && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
              <h4 className="font-semibold text-blue-900 mb-4 text-lg">Original Data (For Reference)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-700 mb-1">Original Amount</p>
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
                disabled={isLoading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:bg-gray-400"
              >
                {isLoading ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}