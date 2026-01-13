'use client';

import { useState, useEffect } from 'react';
import { CustomerDetails, Loan } from '@/src/app/data-entry/types/dataEntry';
import { formatToDDMMYYYY } from '@/src/app/data-entry/utils/dateCalculations';

// ✅ UPDATED: Simplified EMITransaction interface
export interface EMITransaction {
  _id: string;
  paymentDate: string;
  amount: number;
  loanNumber: string;
  collectedBy: string;
  status: string;
  paymentMethod?: string;
  notes?: string;
  
  // ✅ NEW: Simplified partial fields
  isPartial?: boolean;
  fullEmiAmount?: number;
  partialRemainingAmount?: number;
  loanId?: string;
  customerId?: string;
  customerName?: string;
}

// ✅ UPDATED: Simplified PartialInfo interface
interface PartialInfo {
  paymentId: string;
  loanId: string;
  loanNumber: string;
  existingAmount: number;
  fullEmiAmount: number;
  remainingAmount: number;
  paymentDate: string;
}

type EditMode = 'none' | 'edit-amount' | 'complete-partial';

interface EMITransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerDetails;
  transactions: EMITransaction[];
  onRefresh?: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

const getStatusColorClass = (status: string): string => {
  switch (status) {
    case 'Paid':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'Partial':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Advance':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Due':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'Overdue':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
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
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('Paid');
  const [editDate, setEditDate] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string>('');
  
  const [partialInfo, setPartialInfo] = useState<PartialInfo | null>(null);
  const [loadingPartial, setLoadingPartial] = useState(false);
  
  const [additionalAmount, setAdditionalAmount] = useState<string>('');
  const [completionDate, setCompletionDate] = useState<string>('');
  const [partialPayments, setPartialPayments] = useState<EMITransaction[]>([]);

  // Get unique loan numbers
  const loanNumbers = ['all', ...new Set(transactions.map(t => t.loanNumber))];
  
  // Filter transactions
  useEffect(() => {
    if (selectedLoan === 'all') {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(transactions.filter(t => t.loanNumber === selectedLoan));
    }
  }, [selectedLoan, transactions]);
  
  // Statistics
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const paidCount = filteredTransactions.filter(t => t.status === 'Paid' || t.status === 'Advance').length;
  const partialCount = filteredTransactions.filter(t => t.status === 'Partial').length;
  
  // ✅ UPDATED: Fetch partial info using SIMPLIFIED model
  const fetchPartialInfo = async (transaction: EMITransaction): Promise<PartialInfo | null> => {
    if (!transaction._id || transaction.status !== 'Partial') {
      return null;
    }
    
    console.log('🔍 Fetching partial info for:', transaction._id);
    
    setLoadingPartial(true);
    try {
      // ✅ SIMPLIFIED: Just check if this is a partial payment
      if (transaction.isPartial) {
        const info: PartialInfo = {
          paymentId: transaction._id,
          loanId: transaction.loanId || '',
          loanNumber: transaction.loanNumber,
          existingAmount: transaction.amount,
          fullEmiAmount: transaction.fullEmiAmount || transaction.amount,
          remainingAmount: transaction.partialRemainingAmount || 
                         (transaction.fullEmiAmount ? transaction.fullEmiAmount - transaction.amount : 0),
          paymentDate: transaction.paymentDate
        };
        
        setPartialInfo(info);
        
        // Also fetch other partial payments for this loan on same date
        if (transaction.loanId) {
          const response = await fetch(
            `/api/data-entry/emi-payments?loanId=${transaction.loanId}&date=${transaction.paymentDate}&partialOnly=true`
          );
          
          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setPartialPayments(result.data || []);
            }
          }
        }
        
        return info;
      }
      
      return null;
    } catch (error) {
      console.error('🔍 ERROR fetching partial info:', error);
      return null;
    } finally {
      setLoadingPartial(false);
    }
  };
  
  // ✅ UPDATED: Handle edit button click (SIMPLIFIED)
  const handleEditClick = async (transaction: EMITransaction) => {
    console.log('🔄 Editing transaction:', transaction);
    
    setEditingTransaction(transaction);
    setEditAmount(transaction.amount.toString());
    setEditStatus(transaction.status);
    setEditDate(transaction.paymentDate.split('T')[0]);
    setEditError('');
    setAdditionalAmount('');
    setPartialInfo(null);
    setPartialPayments([]);
    
    // For partial payments, fetch info
    if (transaction.status === 'Partial') {
      const info = await fetchPartialInfo(transaction);
      
      // Set additional amount to remaining if available
      if (info) {
        setAdditionalAmount(info.remainingAmount.toString());
      }
      
      // Default to complete-partial mode for partial payments
      setEditMode('complete-partial');
    } else {
      setEditMode('edit-amount');
    }
    
    // Set completion date to today as default
    const today = new Date().toISOString().split('T')[0];
    setCompletionDate(today);
  };

  // ✅ UPDATED: Validate edit form (SIMPLIFIED)
  const validateEditForm = (): boolean => {
    setEditError('');
    
    if (editMode === 'edit-amount') {
      const amount = parseFloat(editAmount);
      if (isNaN(amount) || amount <= 0) {
        setEditError('Please enter a valid amount (greater than 0)');
        return false;
      }
    } else if (editMode === 'complete-partial') {
      const amount = parseFloat(additionalAmount);
      if (isNaN(amount) || amount <= 0) {
        setEditError('Please enter a valid additional amount (greater than 0)');
        return false;
      }
      
      if (!completionDate) {
        setEditError('Please select a completion date');
        return false;
      }
    }
    
    return true;
  };

  // ✅ UPDATED: Handle edit amount (SIMPLIFIED)
  const handleSaveEditAmount = async () => {
    if (!editingTransaction || !validateEditForm()) return;
    
    setIsEditing(true);
    setEditError('');
    
    try {
      console.log('💾 Saving edited transaction:', editingTransaction._id);
      
      // ✅ SIMPLIFIED: Use PATCH endpoint
      const response = await fetch(`/api/data-entry/emi-payments/${editingTransaction._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(editAmount),
          status: editStatus,
          paymentDate: editDate || editingTransaction.paymentDate,
          collectedBy: editingTransaction.collectedBy,
          notes: `Edited via transactions modal`
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Transaction updated successfully:', result.data);
        
        alert(`✅ Transaction updated successfully!
• New Amount: ${formatCurrency(parseFloat(editAmount))}
• Status: ${editStatus}`);
        
        // Refresh transactions
        if (onRefresh) {
          onRefresh();
        }
        
        // Close edit mode
        handleCancelEdit();
        
      } else {
        const errorMsg = result.error || 'Failed to update transaction';
        setEditError(errorMsg);
        alert(`❌ Failed to update transaction: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      setEditError(error.message || 'Error updating transaction');
      alert(`❌ Error updating transaction: ${error.message || 'Unknown error'}`);
    } finally {
      setIsEditing(false);
    }
  };

  // ✅ UPDATED: Handle complete partial payment (SIMPLIFIED)
  const handleCompletePartialPayment = async () => {
    if (!editingTransaction || !validateEditForm()) return;
    
    // Check if we have partial info
    if (!partialInfo && editingTransaction.status === 'Partial') {
      // Try to get partial info from the transaction itself
      const remaining = editingTransaction.partialRemainingAmount || 
                       (editingTransaction.fullEmiAmount ? editingTransaction.fullEmiAmount - editingTransaction.amount : 0);
      
      if (remaining <= 0) {
        setEditError('This partial payment is already complete');
        return;
      }
    }
    
    setIsEditing(true);
    setEditError('');
    
    try {
      console.log('🔨 Completing partial payment:', editingTransaction._id);
      
      // ✅ SIMPLIFIED: Use completion endpoint
      const response = await fetch(`/api/data-entry/emi-payments/${editingTransaction._id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          additionalAmount: parseFloat(additionalAmount),
          paymentDate: completionDate,
          collectedBy: editingTransaction.collectedBy || 'Operator',
          notes: `Partial completion via transactions modal`
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Partial payment completed successfully:', result.data);
        
        const newTotal = editingTransaction.amount + parseFloat(additionalAmount);
        const fullAmount = editingTransaction.fullEmiAmount || newTotal;
        const isComplete = newTotal >= fullAmount;
        
        alert(`✅ Partial payment completed!
• Added: ${formatCurrency(parseFloat(additionalAmount))}
• New Total: ${formatCurrency(newTotal)}
• Status: ${isComplete ? 'Fully Paid' : 'Still Partial'}
• Completion Date: ${formatToDDMMYYYY(completionDate)}`);
        
        // Refresh transactions
        if (onRefresh) {
          onRefresh();
        }
        
        // Close edit mode
        handleCancelEdit();
        
      } else {
        const errorMsg = result.error || 'Failed to complete partial payment';
        setEditError(errorMsg);
        alert(`❌ Failed to complete partial payment: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Error completing partial payment:', error);
      
      // If endpoint doesn't exist, try alternative
      if (error.message.includes('Failed to fetch') || error.message.includes('404')) {
        setEditError('Completion endpoint not available. Please update the payment manually.');
        alert('⚠️ Completion feature not configured. Please edit the payment amount instead.');
        setEditMode('edit-amount');
      } else {
        setEditError(error.message || 'Error completing partial payment');
        alert(`❌ Error: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsEditing(false);
    }
  };

  // Handle edit save based on selected mode
  const handleSaveEdit = () => {
    if (editMode === 'edit-amount') {
      handleSaveEditAmount();
    } else if (editMode === 'complete-partial') {
      handleCompletePartialPayment();
    }
  };

  // Handle edit cancel
  const handleCancelEdit = () => {
    setEditingTransaction(null);
    setEditMode('none');
    setEditAmount('');
    setEditStatus('Paid');
    setEditDate('');
    setAdditionalAmount('');
    setCompletionDate('');
    setEditError('');
    setPartialInfo(null);
    setPartialPayments([]);
  };

  // ✅ UPDATED: Render edit modal content (SIMPLIFIED)
  const renderEditModalContent = () => {
    if (!editingTransaction) return null;
    
    const isPartialPayment = editingTransaction.status === 'Partial';
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate amounts
    const existingAmount = editingTransaction.amount;
    const fullEmiAmount = editingTransaction.fullEmiAmount || 
                         partialInfo?.fullEmiAmount || 
                         editingTransaction.amount;
    
    const remainingAmount = partialInfo?.remainingAmount || 
                          (editingTransaction.partialRemainingAmount || 
                          (fullEmiAmount - existingAmount));
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[201] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">
              {isPartialPayment ? 'Complete Partial Payment' : 'Edit Payment'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Loan: {editingTransaction.loanNumber} • Customer: {customer.name}
            </p>
            <div className="flex items-center mt-2">
              <span className={`text-xs px-2 py-1 rounded ${getStatusColorClass(editingTransaction.status)}`}>
                Current Status: {editingTransaction.status}
              </span>
              <span className="ml-3 text-xs text-gray-600">
                Date: {formatToDDMMYYYY(editingTransaction.paymentDate)}
              </span>
            </div>
          </div>
          
          <div className="p-6">
            {/* Edit Mode Selection for Partial Payments */}
            {isPartialPayment && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Select Action:</h4>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setEditMode('complete-partial')}
                    className={`px-4 py-3 rounded-lg flex-1 border-2 ${
                      editMode === 'complete-partial'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Complete Payment</div>
                    <div className="text-xs mt-1">Add amount to existing partial</div>
                  </button>
                  
                  <button
                    onClick={() => setEditMode('edit-amount')}
                    className={`px-4 py-3 rounded-lg flex-1 border-2 ${
                      editMode === 'edit-amount'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">Edit Details</div>
                    <div className="text-xs mt-1">Change amount, status, or date</div>
                  </button>
                </div>
              </div>
            )}
            
            {/* Complete Partial Payment Form */}
            {editMode === 'complete-partial' && isPartialPayment && (
              <div className="space-y-6">
                {/* Current Status Card */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-yellow-700 mb-1">Already Paid</p>
                      <p className="font-bold text-yellow-900 text-lg">
                        {formatCurrency(existingAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-yellow-700 mb-1">Full EMI Amount</p>
                      <p className="font-bold text-gray-900 text-lg">
                        {formatCurrency(fullEmiAmount)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-yellow-200">
                    <p className="text-xs text-yellow-700 mb-1">Remaining to Complete</p>
                    <p className="font-bold text-green-900 text-xl">
                      {formatCurrency(remainingAmount)}
                    </p>
                  </div>
                </div>
                
                {/* Completion Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount to Add (₹)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">₹</span>
                      </div>
                      <input
                        type="number"
                        value={additionalAmount}
                        onChange={(e) => {
                          setAdditionalAmount(e.target.value);
                          setEditError('');
                        }}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Enter amount"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Suggested: {formatCurrency(remainingAmount)}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Completion Date
                    </label>
                    <input
                      type="date"
                      value={completionDate}
                      onChange={(e) => setCompletionDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      max={today}
                    />
                  </div>
                </div>
                
                {/* Preview */}
                {additionalAmount && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-green-700 mb-1">New Total</p>
                        <p className="font-bold text-green-900 text-2xl">
                          {formatCurrency(existingAmount + parseFloat(additionalAmount))}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {formatToDDMMYYYY(completionDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-green-700 mb-1">Status After</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          (existingAmount + parseFloat(additionalAmount)) >= fullEmiAmount
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {(existingAmount + parseFloat(additionalAmount)) >= fullEmiAmount
                            ? 'Complete ✓'
                            : 'Still Partial'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Edit Amount Form */}
            {editMode === 'edit-amount' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (₹)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">₹</span>
                      </div>
                      <input
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter amount"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                      <option value="Advance">Advance</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    max={today}
                  />
                </div>
              </div>
            )}
            
            {/* Error message */}
            {editError && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center text-red-700">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">{editError}</span>
                </div>
              </div>
            )}
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
              className={`px-4 py-2 rounded-md text-white font-medium flex items-center ${
                editMode === 'complete-partial'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              } disabled:opacity-50`}
            >
              {isEditing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editMode === 'complete-partial' ? 'Completing...' : 'Saving...'}
                </>
              ) : (
                editMode === 'complete-partial' ? 'Complete Payment' : 'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;
  
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[200] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  EMI Transactions - {customer.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Customer: {customer.customerNumber} • Transactions: {transactions.length}
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
                    className={`px-3 py-1.5 rounded-md text-sm ${
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
            {/* Edit Modal */}
            {editingTransaction && renderEditModalContent()}

            {/* Transactions Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Collected By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map((transaction, index) => (
                      <tr key={transaction._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatToDDMMYYYY(transaction.paymentDate)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {transaction.loanNumber}
                          {transaction.isPartial && (
                            <span className="ml-2 text-xs text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded">
                              Partial
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {formatCurrency(transaction.amount)}
                          {transaction.isPartial && transaction.fullEmiAmount && (
                            <div className="text-xs text-gray-500">
                              of {formatCurrency(transaction.fullEmiAmount)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {transaction.collectedBy}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleEditClick(transaction)}
                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium flex items-center gap-1"
                            disabled={loadingPartial}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing {filteredTransactions.length} transactions • 
                    <span className="text-green-600 font-medium ml-2">
                      Total: {formatCurrency(totalAmount)}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {partialCount > 0 && (
                      <span className="text-yellow-600">
                        {partialCount} partial payment(s) can be completed
                      </span>
                    )}
                  </p>
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
    </>
  );
}