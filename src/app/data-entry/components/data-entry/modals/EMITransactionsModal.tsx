'use client';

import { useState, useEffect } from 'react';
import { CustomerDetails, Loan } from '@/src/app/data-entry/types/dataEntry';
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
  onRefresh?: () => void; // Add this for refreshing after edit
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper function to calculate total loan amount for a loan
const calculateTotalLoanAmount = (loan: any): number => {
  // Check if virtual totalLoanAmount exists
  if (loan.totalLoanAmount !== undefined && loan.totalLoanAmount !== null) {
    return loan.totalLoanAmount;
  }
  
  // If not, calculate manually considering custom EMI
  const totalEmiCount = loan.totalEmiCount || loan.loanDays || 0;
  
  if (loan.emiType === 'custom' && loan.loanType !== 'Daily') {
    const regularPeriods = totalEmiCount - 1;
    const lastPeriod = 1;
    const regularAmount = loan.emiAmount * regularPeriods;
    const lastAmount = (loan.customEmiAmount || loan.emiAmount) * lastPeriod;
    return regularAmount + lastAmount;
  }
  
  // For fixed EMI or Daily loans
  return loan.emiAmount * totalEmiCount;
};

export default function EMITransactionsModal({
  isOpen,
  onClose,
  customer,
  transactions,
  onRefresh
}: EMITransactionsModalProps) {
  const [selectedLoan, setSelectedLoan] = useState<string>('all');
  const [filteredTransactions, setFilteredTransactions] = useState<EMITransaction[]>(transactions);
  const [editingTransaction, setEditingTransaction] = useState<EMITransaction | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('Paid');
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string>('');
  
  // Calculate total expected amount for comparison
  const calculateTotalExpectedAmount = () => {
    if (!customer.loans || !Array.isArray(customer.loans)) return 0;
    
    return customer.loans.reduce((total, loan: Loan) => {
      return total + calculateTotalLoanAmount(loan);
    }, 0);
  };

  const totalExpectedAmount = calculateTotalExpectedAmount();
  
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
  
  // Calculate collection percentage
  const collectionPercentage = totalExpectedAmount > 0 
    ? Math.min((totalAmount / totalExpectedAmount) * 100, 100) 
    : 0;
  
  // Handle edit button click
  const handleEditClick = (transaction: EMITransaction) => {
    console.log('Editing transaction:', transaction);
    setEditingTransaction(transaction);
    setEditAmount(transaction.amount.toString());
    setEditStatus(transaction.status);
    setEditError('');
  };

  // Handle edit save
  const handleSaveEdit = async () => {
    if (!editingTransaction) return;
    
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      setEditError('Please enter a valid amount');
      return;
    }
    
    setIsEditing(true);
    setEditError('');
    
    try {
      console.log('Saving edit for transaction:', editingTransaction._id);
      
      const response = await fetch('/api/data-entry/emi-payments/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: editingTransaction._id,
          amount: amount,
          status: editStatus,
          customerId: customer._id,
          customerName: customer.name,
          loanNumber: editingTransaction.loanNumber,
          previousAmount: editingTransaction.amount,
          collectedBy: editingTransaction.collectedBy,
          notes: `Edited from ₹${editingTransaction.amount} to ₹${amount}`
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Transaction updated successfully');
        alert('Transaction updated successfully!');
        
        // Refresh transactions if parent provides onRefresh
        if (onRefresh) {
          onRefresh();
        }
        
        // Close edit mode
        setEditingTransaction(null);
        
        // Refresh the page after a short delay to show updated data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setEditError(result.error || 'Failed to update transaction');
        alert(`Failed to update transaction: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      setEditError(error.message || 'Error updating transaction');
      alert(`Error updating transaction: ${error.message || 'Unknown error'}`);
    } finally {
      setIsEditing(false);
    }
  };

  // Handle edit cancel
  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setEditAmount('');
    setEditStatus('Paid');
    setEditError('');
  };

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

          {/* Edit Modal */}
          {editingTransaction && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[201] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Edit EMI Transaction
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Loan: {editingTransaction.loanNumber} • Date: {formatToDDMMYYYY(editingTransaction.paymentDate)}
                  </p>
                </div>
                
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter amount"
                        step="0.01"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Advance">Advance</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>
                    
                    {editError && (
                      <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                        {editError}
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-600">
                      <p><strong>Previous Amount:</strong> ₹{editingTransaction.amount}</p>
                      <p><strong>New Amount:</strong> ₹{parseFloat(editAmount) || 0}</p>
                      {editingTransaction.amount !== parseFloat(editAmount) && (
                        <p className="text-blue-600">
                          Difference: ₹{(parseFloat(editAmount) - editingTransaction.amount).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={isEditing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isEditing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isEditing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

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
                    Paid By (Operator)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                        {transaction.collectedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => handleEditClick(transaction)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
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
                <p className="text-xs text-blue-600 mt-1 font-medium">
                  💡 Click "Edit" button to modify any transaction amount or status
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