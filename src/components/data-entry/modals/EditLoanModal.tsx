'use client';

import { useState } from 'react';
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

  const { editLoan } = useLoans();

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">
              Edit Loan Details (Requires Approval)
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Loan: {formData.loanNumber} • Customer: {formData.customerName}
          </p>
        </div>

        <div className="p-6">
          {/* Information Alert */}
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-yellow-400 text-lg">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Important</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  All loan modifications require admin approval. The changes will be applied only after approval.
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Loan Number (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loan Number
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                value={formData.loanNumber}
                readOnly
              />
            </div>

            {/* Customer Information (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                value={`${formData.customerNumber} - ${formData.customerName}`}
                readOnly
              />
            </div>

            {/* Loan Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loan Amount *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">₹</span>
                </div>
                <input
                  type="number"
                  className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  min="0"
                />
              </div>
            </div>

            {/* EMI Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                EMI Amount *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">₹</span>
                </div>
                <input
                  type="number"
                  className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.emiAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, emiAmount: e.target.value }))}
                  min="0"
                />
              </div>
            </div>

            {/* Loan Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loan Type *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.loanType}
                onChange={(e) => setFormData(prev => ({ ...prev, loanType: e.target.value }))}
              >
                {loanTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Loan Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loan Days *
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.loanDays}
                onChange={(e) => setFormData(prev => ({ ...prev, loanDays: e.target.value }))}
                min="1"
              />
            </div>

            {/* Loan Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Loan Date *
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.dateApplied}
                onChange={(e) => setFormData(prev => ({ ...prev, dateApplied: e.target.value }))}
              />
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
                  />
                  <span className="ml-2 text-sm text-gray-700">Fixed EMI</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    checked={formData.emiType === 'custom'}
                    onChange={() => setFormData(prev => ({ ...prev, emiType: 'custom' }))}
                  />
                  <span className="ml-2 text-sm text-gray-700">Custom EMI</span>
                </label>
              </div>
            </div>

            {/* Custom EMI Amount */}
            {formData.emiType === 'custom' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom EMI Amount
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
                  />
                </div>
              </div>
            )}
          </div>

          {/* Original Data Reference */}
          {formData.originalData && (
            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Original Data (For Reference)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-blue-700">Original Amount</p>
                  <p className="font-semibold text-blue-900">₹{formData.originalData.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Original EMI</p>
                  <p className="font-semibold text-blue-900">₹{formData.originalData.emiAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Original Loan Days</p>
                  <p className="font-semibold text-blue-900">{formData.originalData.loanDays}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-700">Original Loan Type</p>
                  <p className="font-semibold text-blue-900">{formData.originalData.loanType}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            All loan modifications require admin approval before they take effect.
          </p>
        </div>
      </div>
    </div>
  );
}