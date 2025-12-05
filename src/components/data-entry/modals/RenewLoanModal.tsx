'use client';

import { useState } from 'react';
import { RenewLoanData } from '@/src/types/dataEntry';
import { loanTypes } from '@/src/utils/constants';
import { useLoans } from '@/src/hooks/useLoans';

interface RenewLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanData: RenewLoanData;
  onSuccess?: () => void;
}

export default function RenewLoanModal({
  isOpen,
  onClose,
  loanData,
  onSuccess
}: RenewLoanModalProps) {
  const [formData, setFormData] = useState<RenewLoanData>(loanData);
  const [isLoading, setIsLoading] = useState(false);

  const { renewLoan } = useLoans();

  const handleSubmit = async () => {
    if (!formData.newLoanAmount || parseFloat(formData.newLoanAmount) <= 0) {
      alert('Please enter a valid loan amount');
      return;
    }

    if (!formData.newEmiAmount || parseFloat(formData.newEmiAmount) <= 0) {
      alert('Please enter a valid EMI amount');
      return;
    }

    if (!formData.newLoanDays || parseInt(formData.newLoanDays) <= 0) {
      alert('Please enter valid loan days');
      return;
    }

    setIsLoading(true);
    try {
      await renewLoan(formData);
      
      alert('Loan renewal request submitted successfully! Waiting for admin approval.');
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
              Renew Loan (Requires Approval)
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
              />
            </div>

            {/* Renewal Summary */}
            {formData.newLoanAmount && formData.newEmiAmount && formData.newLoanDays && (
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Renewal Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <div>
                    <p className="text-xs text-green-700">New Loan Type</p>
                    <p className="font-semibold text-green-900">{formData.newLoanType}</p>
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Renewal Date: {new Date(formData.renewalDate).toLocaleDateString('en-IN')}
                </p>
              </div>
            )}
          </div>
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
            Loan renewal requires admin approval before activation.
          </p>
        </div>
      </div>
    </div>
  );
}