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
  // ✅ NEW: Chain fields from updated schema
  partialChainId?: string;
  chainParentId?: string;
  chainChildrenIds?: string[];
  installmentTotalAmount?: number;
  installmentPaidAmount?: number;
  isChainComplete?: boolean;
  chainSequence?: number;
  originalEmiAmount?: number;
}

// ✅ NEW: Chain information interface
interface ChainInfo {
  chainId: string;
  parentPaymentId: string;
  loanId: string;
  loanNumber: string;
  customerId: string;
  customerName: string;
  installmentTotalAmount: number;
  totalPaidAmount: number;
  remainingAmount: number;
  isComplete: boolean;
  paymentCount: number;
  payments: Array<{
    _id: string;
    amount: number;
    status: string;
    paymentDate: string;
    collectedBy: string;
    chainSequence: number;
  }>;
}

// ✅ NEW: Edit options type
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

// ✅ NEW: Format currency for display
const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

// ✅ NEW: Get status color class
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
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string>('');
  
  // ✅ NEW: State for chain information
  const [chainInfo, setChainInfo] = useState<ChainInfo | null>(null);
  const [loadingChain, setLoadingChain] = useState(false);
  
  // ✅ NEW: State for complete partial payment
  const [additionalAmount, setAdditionalAmount] = useState<string>('');
  const [remainingAmount, setRemainingAmount] = useState<number>(0);
  const [chainPayments, setChainPayments] = useState<EMITransaction[]>([]);

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
  
  // ✅ NEW: Fetch chain information for a transaction
  const fetchChainInfo = async (transaction: EMITransaction) => {
    if (!transaction._id && !transaction.partialChainId) return null;
    
    setLoadingChain(true);
    try {
      let url = `/api/data-entry/emi-payments?action=get-chain-info&`;
      
      if (transaction.partialChainId) {
        url += `chainId=${transaction.partialChainId}`;
      } else {
        url += `paymentId=${transaction._id}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chain info: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setChainInfo(result.data);
        setChainPayments(result.data.payments || []);
        
        // Calculate remaining amount for partial payments
        if (transaction.status === 'Partial') {
          setRemainingAmount(result.data.remainingAmount || 0);
        }
        
        return result.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching chain info:', error);
      return null;
    } finally {
      setLoadingChain(false);
    }
  };
  
  // ✅ NEW: Handle edit button click
  const handleEditClick = async (transaction: EMITransaction) => {
    console.log('Editing transaction:', transaction);
    
    // Fetch chain information first
    const chainData = await fetchChainInfo(transaction);
    
    setEditingTransaction(transaction);
    setEditAmount(transaction.amount.toString());
    setEditStatus(transaction.status);
    setEditError('');
    setAdditionalAmount('');
    
    // Determine which edit mode to show based on payment status
    if (transaction.status === 'Partial') {
      // For partial payments, show both options
      setEditMode('edit-amount');
    } else {
      // For paid payments, only show edit amount option
      setEditMode('edit-amount');
    }
    
    // If it's a partial payment, calculate remaining amount
    if (transaction.status === 'Partial' && chainData) {
      setRemainingAmount(chainData.remainingAmount || 0);
      setAdditionalAmount(chainData.remainingAmount?.toString() || '0');
    }
  };

  // ✅ NEW: Handle edit option change
  const handleEditOptionChange = (mode: EditMode) => {
    setEditMode(mode);
    setEditError('');
    
    if (mode === 'complete-partial' && editingTransaction && remainingAmount > 0) {
      setAdditionalAmount(remainingAmount.toString());
    }
  };

  // ✅ NEW: Validate edit form
  const validateEditForm = (): boolean => {
    setEditError('');
    
    if (editMode === 'edit-amount') {
      const amount = parseFloat(editAmount);
      if (isNaN(amount) || amount <= 0) {
        setEditError('Please enter a valid amount (greater than 0)');
        return false;
      }
      
      // If changing from Paid to Partial, we need installment total amount
      if (editingTransaction?.status === 'Paid' && editStatus === 'Partial') {
        if (!chainInfo?.installmentTotalAmount) {
          setEditError('Cannot change to Partial without knowing the full installment amount');
          return false;
        }
      }
    } else if (editMode === 'complete-partial') {
      const amount = parseFloat(additionalAmount);
      if (isNaN(amount) || amount <= 0) {
        setEditError('Please enter a valid additional amount (greater than 0)');
        return false;
      }
      
      if (amount > remainingAmount) {
        setEditError(`Additional amount cannot exceed remaining amount of ${formatCurrency(remainingAmount)}`);
        return false;
      }
    }
    
    return true;
  };

  // ✅ NEW: Handle edit amount (Option 1)
  const handleSaveEditAmount = async () => {
    if (!editingTransaction || !validateEditForm()) return;
    
    setIsEditing(true);
    setEditError('');
    
    try {
      console.log('Saving edited amount for transaction:', editingTransaction._id);
      
      const response = await fetch('/api/data-entry/emi-payments?action=edit-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentId: editingTransaction._id,
          amount: parseFloat(editAmount),
          paymentDate: editingTransaction.paymentDate,
          status: editStatus,
          collectedBy: editingTransaction.collectedBy,
          notes: `Edited: Amount changed from ₹${editingTransaction.amount} to ₹${editAmount}`,
          updateChainTotals: true
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Transaction amount updated successfully');
        alert('Transaction amount updated successfully!');
        
        // Refresh transactions
        if (onRefresh) {
          onRefresh();
        }
        
        // Close edit mode
        setEditingTransaction(null);
        setEditMode('none');
        
        // Refresh the page after a short delay to show updated data
        setTimeout(() => {
          if (onRefresh) onRefresh();
        }, 1000);
      } else {
        setEditError(result.error || 'Failed to update transaction amount');
        alert(`Failed to update transaction: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error updating transaction amount:', error);
      setEditError(error.message || 'Error updating transaction amount');
      alert(`Error updating transaction: ${error.message || 'Unknown error'}`);
    } finally {
      setIsEditing(false);
    }
  };

  // ✅ NEW: Handle complete partial payment (Option 2)
  const handleCompletePartialPayment = async () => {
    if (!editingTransaction || !validateEditForm()) return;
    
    setIsEditing(true);
    setEditError('');
    
    try {
      console.log('Completing partial payment for transaction:', editingTransaction._id);
      
      const response = await fetch('/api/data-entry/emi-payments?action=complete-partial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parentPaymentId: editingTransaction._id,
          additionalAmount: parseFloat(additionalAmount),
          paymentDate: new Date().toISOString().split('T')[0], // Current date
          collectedBy: editingTransaction.collectedBy,
          notes: `Completion payment for partial chain ${editingTransaction.partialChainId}`,
          customerId: customer._id,
          customerName: customer.name,
          loanId: editingTransaction.loanNumber ? undefined : undefined,
          loanNumber: editingTransaction.loanNumber
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Partial payment completed successfully');
        alert(`Partial payment completed successfully! Added ${formatCurrency(parseFloat(additionalAmount))} to payment chain.`);
        
        // Refresh transactions
        if (onRefresh) {
          onRefresh();
        }
        
        // Close edit mode
        setEditingTransaction(null);
        setEditMode('none');
        
        // Refresh the page after a short delay to show updated data
        setTimeout(() => {
          if (onRefresh) onRefresh();
        }, 1000);
      } else {
        setEditError(result.error || 'Failed to complete partial payment');
        alert(`Failed to complete partial payment: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error completing partial payment:', error);
      setEditError(error.message || 'Error completing partial payment');
      alert(`Error completing partial payment: ${error.message || 'Unknown error'}`);
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
    setAdditionalAmount('');
    setEditError('');
    setChainInfo(null);
    setChainPayments([]);
  };

  // ✅ NEW: Render chain payments
  const renderChainPayments = () => {
    if (!chainPayments || chainPayments.length <= 1) return null;
    
    return (
      <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h4 className="font-medium text-purple-800 mb-2">Payment Chain ({chainPayments.length} payments)</h4>
        <div className="space-y-2">
          {chainPayments.sort((a, b) => (a.chainSequence || 1) - (b.chainSequence || 1)).map((payment, index) => (
            <div key={payment._id} className={`flex justify-between items-center p-2 rounded ${
              payment._id === editingTransaction?._id ? 'bg-purple-100' : 'bg-white'
            }`}>
              <div className="flex items-center">
                <div className="w-6 h-6 flex items-center justify-center bg-purple-100 text-purple-800 rounded-full text-xs mr-2">
                  {payment.chainSequence || index + 1}
                </div>
                <div>
                  <span className="text-sm font-medium">{formatCurrency(payment.amount)}</span>
                  <span className={`ml-2 text-xs px-2 py-0.5 rounded ${getStatusColorClass(payment.status)}`}>
                    {payment.status}
                  </span>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {formatToDDMMYYYY(payment.paymentDate)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ✅ NEW: Render edit modal content based on mode
  const renderEditModalContent = () => {
    if (!editingTransaction) return null;
    
    const isPartialPayment = editingTransaction.status === 'Partial';
    const installmentTotal = chainInfo?.installmentTotalAmount || editingTransaction.installmentTotalAmount || editingTransaction.amount;
    const totalPaid = chainInfo?.totalPaidAmount || editingTransaction.installmentPaidAmount || editingTransaction.amount;
    const calculatedRemaining = Math.max(0, installmentTotal - totalPaid);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[201] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit EMI Transaction
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Loan: {editingTransaction.loanNumber} • Date: {formatToDDMMYYYY(editingTransaction.paymentDate)}
            </p>
            <p className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${getStatusColorClass(editingTransaction.status)}`}>
              Current Status: {editingTransaction.status}
            </p>
          </div>
          
          <div className="p-6">
            {/* ✅ NEW: Edit Mode Selection - Only show for Partial payments */}
            {isPartialPayment && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Select Edit Option:</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    editMode === 'edit-amount' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`} onClick={() => handleEditOptionChange('edit-amount')}>
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                        editMode === 'edit-amount' 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {editMode === 'edit-amount' && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Option 1: Edit EMI Amount</p>
                        <p className="text-sm text-gray-600 mt-1">Correct the amount of this payment</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    editMode === 'complete-partial' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`} onClick={() => handleEditOptionChange('complete-partial')}>
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                        editMode === 'complete-partial' 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {editMode === 'complete-partial' && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Option 2: Complete Partial Payment</p>
                        <p className="text-sm text-gray-600 mt-1">Add remaining amount to complete this installment</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {/* Edit Amount Option */}
              {editMode === 'edit-amount' && (
                <>
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
                      min="0"
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
                      disabled={!isPartialPayment} // Only allow status change for partial payments
                    >
                      <option value="Paid">Paid</option>
                      <option value="Partial">Partial</option>
                      <option value="Advance">Advance</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                    {!isPartialPayment && (
                      <p className="text-xs text-gray-500 mt-1">Status cannot be changed for non-partial payments</p>
                    )}
                  </div>
                </>
              )}
              
              {/* Complete Partial Payment Option */}
              {editMode === 'complete-partial' && (
                <>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-blue-700 mb-1">Already Paid</p>
                        <p className="font-bold text-blue-900">
                          {formatCurrency(totalPaid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 mb-1">Installment Total</p>
                        <p className="font-bold text-blue-900">
                          {formatCurrency(installmentTotal)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-sm font-medium text-blue-800">
                        Remaining Amount: {formatCurrency(calculatedRemaining)}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Add Amount (₹)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500">₹</span>
                      </div>
                      <input
                        type="number"
                        value={additionalAmount}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAdditionalAmount(value);
                          
                          // Validate against remaining amount
                          const amount = parseFloat(value);
                          if (!isNaN(amount) && amount > calculatedRemaining) {
                            setEditError(`Cannot exceed remaining amount of ${formatCurrency(calculatedRemaining)}`);
                          } else {
                            setEditError('');
                          }
                        }}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter amount to add"
                        step="0.01"
                        min="0"
                        max={calculatedRemaining}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum: {formatCurrency(calculatedRemaining)}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-green-700 mb-1">New Total Paid</p>
                        <p className="font-bold text-green-900 text-lg">
                          {formatCurrency(totalPaid + (parseFloat(additionalAmount) || 0))}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-green-700 mb-1">New Status</p>
                        <p className="font-bold text-green-900">
                          {(totalPaid + (parseFloat(additionalAmount) || 0)) >= installmentTotal ? 'Paid' : 'Partial'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              {/* Show chain payments if available */}
              {chainPayments.length > 1 && renderChainPayments()}
              
              {/* Error message */}
              {editError && (
                <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                  {editError}
                </div>
              )}
              
              {/* Transaction summary */}
              <div className="text-sm text-gray-600 border-t border-gray-200 pt-4">
                <p><strong>Previous Amount:</strong> {formatCurrency(editingTransaction.amount)}</p>
                {editMode === 'edit-amount' && (
                  <p><strong>New Amount:</strong> {formatCurrency(parseFloat(editAmount) || 0)}</p>
                )}
                {editMode === 'complete-partial' && (
                  <p><strong>Additional Amount:</strong> {formatCurrency(parseFloat(additionalAmount) || 0)}</p>
                )}
                {editMode === 'edit-amount' && editingTransaction.amount !== parseFloat(editAmount) && (
                  <p className="text-blue-600">
                    <strong>Difference:</strong> {formatCurrency((parseFloat(editAmount) - editingTransaction.amount))}
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
                  {formatCurrency(totalAmount)}
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
            {editingTransaction && renderEditModalContent()}

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
                      Collected By
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
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass(transaction.status)}`}>
                            {transaction.status}
                            {transaction.partialChainId && transaction.status === 'Partial' && (
                              <span className="ml-1 text-xs">(Chain)</span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {transaction.collectedBy}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={() => handleEditClick(transaction)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium flex items-center gap-1"
                            disabled={loadingChain}
                          >
                            {loadingChain && editingTransaction?._id === transaction._id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700 mr-1"></div>
                                Loading...
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                                Edit
                              </>
                            )}
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
                    💡 Click "Edit" button to modify any transaction
                    {partialCount > 0 && (
                      <span className="text-yellow-600 ml-2">
                        • {partialCount} partial payment(s) can be completed
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">Total Amount Shown:</p>
                  <p className="text-xl font-bold text-green-900">{formatCurrency(totalAmount)}</p>
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