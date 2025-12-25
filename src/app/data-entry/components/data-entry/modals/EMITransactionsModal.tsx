'use client';

import { useState, useEffect } from 'react';
import { CustomerDetails } from '@/src/app/data-entry/types/dataEntry';
import { formatToDDMMYYYY } from '@/src/app/data-entry/utils/dateCalculations';

export interface EMITransaction {
  _id: string;
  paymentDate: string;
  amount: number;
  loanNumber: string;
  collectedBy: string;
  status: string;
  paymentMethod?: string;
  notes?: string;
}

interface EMITransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerDetails;
  transactions: EMITransaction[];
}

export default function EMITransactionsModal({
  isOpen,
  onClose,
  customer,
  transactions
}: EMITransactionsModalProps) {
  const [selectedLoan, setSelectedLoan] = useState<string>('all');
  const [filteredTransactions, setFilteredTransactions] = useState<EMITransaction[]>(transactions);
  
  // Get unique loan numbers from transactions
  const loanNumbers = ['all', ...new Set(transactions.map(t => t.loanNumber))];
  
  // Filter transactions based on selected loan
  useEffect(() => {
    if (selectedLoan === 'all') {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(transactions.filter(t => t.loanNumber === selectedLoan));
    }
  }, [selectedLoan, transactions]);
  
  // Calculate statistics
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const paidCount = filteredTransactions.filter(t => t.status === 'Paid' || t.status === 'Advance').length;
  const partialCount = filteredTransactions.filter(t => t.status === 'Partial').length;
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                EMI Transactions - {customer.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Customer Number: {customer.customerNumber} • Total Transactions: {transactions.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 text-2xl"
            >
              ×
            </button>
          </div>
          
          {/* Loan Filter */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Loan:
            </label>
            <div className="flex flex-wrap gap-2">
              {loanNumbers.map(loanNumber => (
                <button
                  key={loanNumber}
                  onClick={() => setSelectedLoan(loanNumber)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedLoan === loanNumber
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {loanNumber === 'all' ? 'All Loans' : loanNumber}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 mb-1">Total Transactions</p>
              <p className="text-2xl font-bold text-blue-900">{filteredTransactions.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 mb-1">Total Amount</p>
              <p className="text-2xl font-bold text-green-900">
                ₹{totalAmount.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600 mb-1">Paid/Advance</p>
              <p className="text-2xl font-bold text-purple-900">{paidCount}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-600 mb-1">Partial</p>
              <p className="text-2xl font-bold text-yellow-900">{partialCount}</p>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sr No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date (DD/MM/YYYY)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loan Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    EMI Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paid By (Operator)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction, index) => (
                    <tr key={transaction._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatToDDMMYYYY(transaction.paymentDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {transaction.loanNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        ₹{transaction.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.status === 'Paid' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                          transaction.status === 'Advance' ? 'bg-blue-100 text-blue-800' :
                          transaction.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.paymentMethod || 'Cash'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.collectedBy}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={transaction.notes}>
                        {transaction.notes || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center">
                      <div className="text-gray-400 text-4xl mb-4">📭</div>
                      <p className="text-gray-500 text-lg font-semibold">No transactions found</p>
                      <p className="text-gray-400 text-sm mt-2">
                        {selectedLoan === 'all' 
                          ? 'No EMI transactions recorded for this customer'
                          : `No transactions found for loan ${selectedLoan}`}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Statistics Footer */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-700">Showing {filteredTransactions.length} of {transactions.length} transactions</p>
                <p className="text-xs text-gray-500 mt-1">
                  Filter: {selectedLoan === 'all' ? 'All Loans' : selectedLoan}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">Total Amount Shown:</p>
                <p className="text-xl font-bold text-green-900">₹{totalAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between">
            <div className="text-sm text-gray-600">
              Last updated: {new Date().toLocaleString()}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}