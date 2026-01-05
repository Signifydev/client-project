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
  partialChainId?: string;
  chainParentId?: string;
  chainChildrenIds?: string[];
  installmentTotalAmount?: number;
  installmentPaidAmount?: number;
  isChainComplete?: boolean;
  chainSequence?: number;
  originalEmiAmount?: number;
  loanId?: string;
}

// ✅ UPDATED: Chain information interface with suggestedRemaining
interface ChainInfo {
  chainId: string;
  parentPaymentId: string;
  loanId: string;
  loanNumber: string;
  customerId: string;
  customerName: string;
  installmentTotalAmount: number;
  originalEmiAmount?: number;
  totalPaidAmount: number;
  suggestedRemaining: number; // ✅ CHANGED: From remainingAmount to suggestedRemaining
  isComplete: boolean;
  paymentCount: number;
  payments: Array<{
    _id: string;
    amount: number;
    status: string;
    paymentDate: string;
    collectedBy: string;
    chainSequence: number;
    originalEmiAmount?: number;
  }>;
  loanInfo?: { // ✅ NEW: Added loan info for reference
    loanNumber: string;
    emiAmount: number;
    loanType: string;
    totalEmiCount: number;
    emiPaidCount: number;
  };
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

const calculateTotalLoanAmount = (loan: any): number => {
  if (loan.totalLoanAmount !== undefined && loan.totalLoanAmount !== null) {
    return loan.totalLoanAmount;
  }
  
  const totalEmiCount = loan.totalEmiCount || loan.loanDays || 0;
  
  if (loan.emiType === 'custom' && loan.loanType !== 'Daily') {
    const regularPeriods = totalEmiCount - 1;
    const lastPeriod = 1;
    const regularAmount = loan.emiAmount * regularPeriods;
    const lastAmount = (loan.customEmiAmount || loan.emiAmount) * lastPeriod;
    return regularAmount + lastAmount;
  }
  
  return loan.emiAmount * totalEmiCount;
};

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
  const [editDate, setEditDate] = useState<string>(''); // ✅ NEW: For editing payment date
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string>('');
  
  const [chainInfo, setChainInfo] = useState<ChainInfo | null>(null);
  const [loadingChain, setLoadingChain] = useState(false);
  
  const [additionalAmount, setAdditionalAmount] = useState<string>('');
  const [completionDate, setCompletionDate] = useState<string>(''); // ✅ NEW: For completion date
  const [chainPayments, setChainPayments] = useState<EMITransaction[]>([]);

  // Calculate total expected amount
  const calculateTotalExpectedAmount = () => {
    if (!customer.loans || !Array.isArray(customer.loans)) return 0;
    
    return customer.loans.reduce((total, loan: Loan) => {
      return total + calculateTotalLoanAmount(loan);
    }, 0);
  };

  const totalExpectedAmount = calculateTotalExpectedAmount();
  
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
  
  const collectionPercentage = totalExpectedAmount > 0 
    ? Math.min((totalAmount / totalExpectedAmount) * 100, 100) 
    : 0;
  
  // ✅ UPDATED: Fetch chain info using new API endpoint
  const fetchChainInfo = async (transaction: EMITransaction) => {
    if (!transaction._id) return null;
    
    console.log('🔗 Fetching chain info for transaction:', transaction._id);
    
    setLoadingChain(true);
    try {
      // ✅ UPDATED: Use new API endpoint
      const response = await fetch(`/api/data-entry/emi-payments/chain/payment?paymentId=${transaction._id}`);
      
      console.log('🔗 API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chain info: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log('🔗 Chain info result:', {
        success: result.success,
        hasData: !!result.data,
        data: result.data
      });
      
      if (result.success && result.data) {
        setChainInfo(result.data);
        setChainPayments(result.data.payments || []);
        
        // ✅ CHANGED: Use suggestedRemaining (guidance only)
        const suggestedRemaining = result.data.suggestedRemaining || 0;
        
        console.log('🔗 Chain amounts:', {
          fullEmiAmount: result.data.originalEmiAmount || result.data.installmentTotalAmount,
          totalPaid: result.data.totalPaidAmount,
          suggestedRemaining: suggestedRemaining
        });
        
        return result.data;
      } else {
        console.log('🔗 No chain data returned');
        return null;
      }
    } catch (error) {
      console.error('🔗 ERROR fetching chain info:', error);
      return null;
    } finally {
      setLoadingChain(false);
    }
  };
  
  // ✅ UPDATED: Handle edit button click
  const handleEditClick = async (transaction: EMITransaction) => {
    console.log('🔄 Editing transaction:', transaction);
    
    const chainData = await fetchChainInfo(transaction);
    
    setEditingTransaction(transaction);
    setEditAmount(transaction.amount.toString());
    setEditStatus(transaction.status);
    setEditDate(transaction.paymentDate); // ✅ NEW: Set current date
    setEditError('');
    setAdditionalAmount('');
    
    // ✅ NEW: Set completion date to tomorrow as default
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setCompletionDate(tomorrow.toISOString().split('T')[0]);
    
    // For partial payments, show both options
    if (transaction.status === 'Partial') {
      setEditMode('edit-amount');
    } else {
      setEditMode('edit-amount');
    }
    
    // If partial payment, set additional amount to suggested remaining
    if (transaction.status === 'Partial' && chainData) {
      const suggestedRemaining = chainData.suggestedRemaining || 0;
      setAdditionalAmount(suggestedRemaining.toString());
    }
  };

  // ✅ UPDATED: Handle edit option change
  const handleEditOptionChange = (mode: EditMode) => {
    setEditMode(mode);
    setEditError('');
    
    if (mode === 'complete-partial' && editingTransaction && chainInfo) {
      const suggestedRemaining = chainInfo.suggestedRemaining || 0;
      setAdditionalAmount(suggestedRemaining.toString());
    }
  };

  // ✅ UPDATED: Validate edit form with MANUAL CONTROL
  const validateEditForm = (): boolean => {
    setEditError('');
    
    if (editMode === 'edit-amount') {
      const amount = parseFloat(editAmount);
      if (isNaN(amount) || amount <= 0) {
        setEditError('Please enter a valid amount (greater than 0)');
        return false;
      }
      
      // ✅ REMOVED: No validation against full EMI amount
      // Users can enter ANY valid amount
      
    } else if (editMode === 'complete-partial') {
      const amount = parseFloat(additionalAmount);
      if (isNaN(amount) || amount <= 0) {
        setEditError('Please enter a valid additional amount (greater than 0)');
        return false;
      }
      
      // ✅ REMOVED: No validation against remaining amount
      // Users can enter ANY valid amount
      
      // Validate completion date
      if (!completionDate) {
        setEditError('Please select a completion date');
        return false;
      }
    }
    
    return true;
  };

  // ✅ UPDATED: Handle edit amount (Option 1) with new API endpoint
  const handleSaveEditAmount = async () => {
    if (!editingTransaction || !validateEditForm()) return;
    
    setIsEditing(true);
    setEditError('');
    
    try {
      console.log('💾 Saving edited amount for transaction:', editingTransaction._id);
      
      // ✅ UPDATED: Use new PUT endpoint
      const response = await fetch(`/api/data-entry/emi-payments/${editingTransaction._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(editAmount),
          status: editStatus,
          paymentDate: editDate || editingTransaction.paymentDate,
          collectedBy: editingTransaction.collectedBy,
          notes: `Edited: Amount changed from ₹${editingTransaction.amount} to ₹${editAmount}`,
          updateChainTotals: true
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Transaction amount updated successfully:', result.data);
        
        // ✅ NEW: Show success message with details
        alert(`✅ Transaction updated successfully!
• New Amount: ${formatCurrency(parseFloat(editAmount))}
• Status: ${editStatus}
• Chain Updated: ${result.data.chainUpdated ? 'Yes' : 'No'}
• Loan Stats Updated: ${result.data.loanStatsUpdated ? 'Yes' : 'No'}`);
        
        // Refresh transactions
        if (onRefresh) {
          onRefresh();
        }
        
        // Close edit mode
        setEditingTransaction(null);
        setEditMode('none');
        
        // Refresh after delay
        setTimeout(() => {
          if (onRefresh) onRefresh();
        }, 1000);
      } else {
        const errorMsg = result.error || 'Failed to update transaction amount';
        setEditError(errorMsg);
        alert(`❌ Failed to update transaction: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Error updating transaction amount:', error);
      setEditError(error.message || 'Error updating transaction amount');
      alert(`❌ Error updating transaction: ${error.message || 'Unknown error'}`);
    } finally {
      setIsEditing(false);
    }
  };

  // ✅ UPDATED: Handle complete partial payment (Option 2) with new API endpoint
  const handleCompletePartialPayment = async () => {
    if (!editingTransaction || !validateEditForm()) return;
    
    setIsEditing(true);
    setEditError('');
    
    try {
      console.log('🔨 Completing partial payment for transaction:', editingTransaction._id);
      
      // ✅ UPDATED: Use new POST complete endpoint
      const response = await fetch(`/api/data-entry/emi-payments/${editingTransaction._id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          additionalAmount: parseFloat(additionalAmount),
          paymentDate: completionDate, // ✅ Use custom completion date
          collectedBy: editingTransaction.collectedBy,
          notes: `Completion payment for partial chain ${editingTransaction.partialChainId || 'N/A'}`,
          // ✅ NOTE: customerId, customerName, loanId, loanNumber are NOT needed in new API
        }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Partial payment completed successfully:', result.data);
        
        // ✅ NEW: Show detailed success message
        alert(`✅ Partial payment completed successfully!
• Added Amount: ${formatCurrency(parseFloat(additionalAmount))}
• Completion Date: ${formatToDDMMYYYY(completionDate)}
• New Total Paid: ${formatCurrency(result.data.totalPaid)}
• Chain Complete: ${result.data.isChainComplete ? 'Yes' : 'No'}
• Remaining After: ${formatCurrency(result.data.remainingAfter)}
• Loan Updated: ${result.data.loanUpdated ? 'Yes' : 'No'}`);
        
        // Refresh transactions
        if (onRefresh) {
          onRefresh();
        }
        
        // Close edit mode
        setEditingTransaction(null);
        setEditMode('none');
        
        // Refresh after delay
        setTimeout(() => {
          if (onRefresh) onRefresh();
        }, 1000);
      } else {
        const errorMsg = result.error || 'Failed to complete partial payment';
        setEditError(errorMsg);
        alert(`❌ Failed to complete partial payment: ${errorMsg}`);
      }
    } catch (error: any) {
      console.error('Error completing partial payment:', error);
      setEditError(error.message || 'Error completing partial payment');
      alert(`❌ Error completing partial payment: ${error.message || 'Unknown error'}`);
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
    setChainInfo(null);
    setChainPayments([]);
  };

  // ✅ UPDATED: Render edit modal content with MANUAL CONTROL
  const renderEditModalContent = () => {
    if (!editingTransaction) return null;
    
    const isPartialPayment = editingTransaction.status === 'Partial';
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate amounts for reference
    const fullEmiAmount = chainInfo?.originalEmiAmount || 
                         editingTransaction.originalEmiAmount || 
                         chainInfo?.installmentTotalAmount || 
                         editingTransaction.installmentTotalAmount || 
                         editingTransaction.amount;
    
    const totalPaid = chainInfo?.totalPaidAmount || 
                     editingTransaction.installmentPaidAmount || 
                     editingTransaction.amount;
    
    const suggestedRemaining = chainInfo?.suggestedRemaining || Math.max(0, fullEmiAmount - totalPaid);
    
    const actualChainPaymentCount = chainPayments.length || 1;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[201] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          <div className="px-8 py-5 border-b border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900">
              Edit EMI Transaction
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Loan: {editingTransaction.loanNumber} • Customer: {customer.name}
            </p>
            <div className="flex items-center mt-2">
              <p className={`text-sm px-3 py-1 rounded-full ${getStatusColorClass(editingTransaction.status)}`}>
                Current Status: {editingTransaction.status}
              </p>
              <p className="ml-3 text-sm text-gray-600">
                Date: {formatToDDMMYYYY(editingTransaction.paymentDate)}
              </p>
              <p className="ml-3 text-sm text-gray-600">
                Chain: {actualChainPaymentCount} payment{actualChainPaymentCount !== 1 ? 's' : ''}
              </p>
            </div>
            
            {/* ✅ NEW: Manual Control Notice */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <span className="text-blue-600 mr-2">ℹ️</span>
                <div>
                  <p className="font-medium text-blue-800">Manual Control Enabled</p>
                  <p className="text-sm text-blue-600">
                    You can enter any valid amount. The system will not restrict you based on remaining balance.
                    {editMode === 'complete-partial' && ' You can also set any future date for completion.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            {/* Edit Mode Selection */}
            {isPartialPayment && (
              <div className="mb-8">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Select Edit Option:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                    editMode === 'edit-amount' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`} onClick={() => handleEditOptionChange('edit-amount')}>
                    <div className="flex items-start">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 mt-1 ${
                        editMode === 'edit-amount' 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {editMode === 'edit-amount' && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">Option 1: Edit Payment</p>
                        <p className="text-gray-600 mt-2">Edit amount, status, or date of this payment</p>
                        <ul className="text-sm text-gray-500 mt-3 space-y-1">
                          <li>• Change payment amount (any value)</li>
                          <li>• Update payment status</li>
                          <li>• Adjust payment date</li>
                          <li>• No validation against remaining</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                    editMode === 'complete-partial' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`} onClick={() => handleEditOptionChange('complete-partial')}>
                    <div className="flex items-start">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 mt-1 ${
                        editMode === 'complete-partial' 
                          ? 'border-blue-500 bg-blue-500' 
                          : 'border-gray-300'
                      }`}>
                        {editMode === 'complete-partial' && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">Option 2: Complete Payment</p>
                        <p className="text-gray-600 mt-2">Add completion payment to partial chain</p>
                        <ul className="text-sm text-gray-500 mt-3 space-y-1">
                          <li>• Add any additional amount</li>
                          <li>• Set custom completion date</li>
                          <li>• Creates separate transaction</li>
                          <li>• Shows both in history</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-8">
              {/* Edit Amount Option */}
              {editMode === 'edit-amount' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount (₹)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-lg">₹</span>
                        </div>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                          placeholder="Enter any amount"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Enter any positive amount</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      >
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Advance">Advance</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                        max={today}
                      />
                    </div>
                  </div>
                  
                  {/* Reference Information */}
                  <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Full EMI Amount (Reference)</p>
                        <p className="font-bold text-gray-900 text-xl">
                          {formatCurrency(fullEmiAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Current Amount</p>
                        <p className="font-bold text-blue-900 text-xl">
                          {formatCurrency(editingTransaction.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <p className="text-sm font-medium text-gray-700">Effect on Loan Schedule:</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {editStatus === 'Partial' 
                          ? '⚠️ Partial payments keep the next EMI date unchanged until full payment'
                          : '✅ Full payments advance the next EMI date to next period'}
                      </p>
                    </div>
                  </div>
                </>
              )}
              
              {/* Complete Partial Payment Option */}
              {editMode === 'complete-partial' && (
                <>
                  <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-5 rounded-lg border border-blue-100">
                        <p className="text-sm text-blue-700 mb-2">Already Paid</p>
                        <p className="font-bold text-blue-900 text-2xl">
                          {formatCurrency(totalPaid)}
                        </p>
                      </div>
                      <div className="bg-white p-5 rounded-lg border border-blue-100">
                        <p className="text-sm text-blue-700 mb-2">EMI Amount (Reference)</p>
                        <p className="font-bold text-blue-900 text-2xl">
                          {formatCurrency(fullEmiAmount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Full installment amount</p>
                      </div>
                      <div className="bg-white p-5 rounded-lg border border-blue-100">
                        <p className="text-sm text-blue-700 mb-2">Suggested Remaining</p>
                        <p className="font-bold text-purple-900 text-2xl">
                          {formatCurrency(suggestedRemaining)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Guidance only</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add Amount (₹)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-lg">₹</span>
                        </div>
                        <input
                          type="number"
                          value={additionalAmount}
                          onChange={(e) => {
                            setAdditionalAmount(e.target.value);
                            setEditError(''); // Clear error on change
                          }}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                          placeholder="Enter any amount"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        You can enter any amount. Suggested: {formatCurrency(suggestedRemaining)}
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
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                        min={today}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Set when this completion payment was collected
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-green-700 mb-2">New Total Paid</p>
                        <p className="font-bold text-green-900 text-3xl">
                          {formatCurrency(totalPaid + (parseFloat(additionalAmount) || 0))}
                        </p>
                        <p className="text-sm text-green-600 mt-1">
                          Completion on: {completionDate ? formatToDDMMYYYY(completionDate) : 'Select date'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-green-700 mb-2">Chain Status After</p>
                        <p className={`font-bold text-lg px-4 py-2 rounded-full ${
                          (totalPaid + (parseFloat(additionalAmount) || 0)) >= fullEmiAmount 
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        }`}>
                          {(totalPaid + (parseFloat(additionalAmount) || 0)) >= fullEmiAmount ? 'Complete' : 'Still Partial'}
                        </p>
                      </div>
                    </div>
                    {(totalPaid + (parseFloat(additionalAmount) || 0)) >= fullEmiAmount && (
                      <p className="text-sm text-green-700 mt-3">
                        ✅ This will create a new payment on {formatToDDMMYYYY(completionDate)} and advance the next EMI date
                      </p>
                    )}
                    {(totalPaid + (parseFloat(additionalAmount) || 0)) < fullEmiAmount && (
                      <p className="text-sm text-yellow-700 mt-3">
                        ⚠️ Chain will remain partial. You can add more payments later.
                      </p>
                    )}
                  </div>
                </>
              )}
              
              {/* Show chain payments if available */}
              {chainPayments.length > 0 && (
                <div className="mt-8 p-6 bg-purple-50 border-2 border-purple-200 rounded-xl">
                  <h4 className="font-bold text-purple-900 text-lg mb-4">
                    Payment Chain ({chainPayments.length} payment{chainPayments.length !== 1 ? 's' : ''})
                  </h4>
                  <div className="space-y-3">
                    {chainPayments
                      .sort((a, b) => (a.chainSequence || 1) - (b.chainSequence || 1))
                      .map((payment, index) => (
                        <div key={payment._id} className={`flex justify-between items-center p-4 rounded-lg ${
                          payment._id === editingTransaction?._id 
                            ? 'bg-purple-100 border-2 border-purple-300' 
                            : 'bg-white border border-purple-100'
                        }`}>
                          <div className="flex items-center">
                            <div className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-800 rounded-full text-sm font-bold mr-4">
                              {payment.chainSequence || index + 1}
                            </div>
                            <div>
                              <div className="flex items-center">
                                <span className="font-bold text-gray-900 text-lg">{formatCurrency(payment.amount)}</span>
                                <span className={`ml-3 text-sm px-3 py-1 rounded-full ${getStatusColorClass(payment.status)}`}>
                                  {payment.status}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {formatToDDMMYYYY(payment.paymentDate)} • {payment.collectedBy}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {payment._id === editingTransaction?._id && (
                              <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                                Currently Editing
                              </span>
                            )}
                          </div>
                        </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Chain Total Paid</p>
                        <p className="font-bold text-purple-900 text-xl">
                          {formatCurrency(chainInfo?.totalPaidAmount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Full EMI Amount</p>
                        <p className="font-bold text-gray-900 text-xl">
                          {formatCurrency(fullEmiAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Loan Info Reference */}
              {chainInfo?.loanInfo && (
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <h5 className="font-medium text-blue-900 mb-3">Loan Information (Reference)</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-blue-700 mb-1">Loan Number</p>
                      <p className="font-bold text-blue-900">{chainInfo.loanInfo.loanNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 mb-1">Loan Type</p>
                      <p className="font-bold text-blue-900">{chainInfo.loanInfo.loanType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 mb-1">EMI Amount</p>
                      <p className="font-bold text-blue-900">{formatCurrency(chainInfo.loanInfo.emiAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 mb-1">Payments Made</p>
                      <p className="font-bold text-blue-900">{chainInfo.loanInfo.emiPaidCount}/{chainInfo.loanInfo.totalEmiCount}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error message */}
              {editError && (
                <div className="text-red-700 text-sm bg-red-50 p-4 rounded-xl border-2 border-red-200">
                  <div className="flex items-center">
                    <span className="text-red-500 mr-2">⚠️</span>
                    {editError}
                  </div>
                </div>
              )}
              
              {/* Transaction summary */}
              <div className="p-6 bg-gray-50 border-2 border-gray-200 rounded-xl">
                <h5 className="font-medium text-gray-900 mb-4">Transaction Summary</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Previous Amount</p>
                    <p className="font-bold text-gray-900 text-lg">{formatCurrency(editingTransaction.amount)}</p>
                  </div>
                  {editMode === 'edit-amount' && (
                    <div>
                      <p className="text-sm text-gray-600">New Amount</p>
                      <p className="font-bold text-green-900 text-lg">{formatCurrency(parseFloat(editAmount) || 0)}</p>
                    </div>
                  )}
                  {editMode === 'complete-partial' && (
                    <div>
                      <p className="text-sm text-gray-600">Additional Amount</p>
                      <p className="font-bold text-green-900 text-lg">{formatCurrency(parseFloat(additionalAmount) || 0)}</p>
                    </div>
                  )}
                  {editMode === 'edit-amount' && editingTransaction.amount !== parseFloat(editAmount) && (
                    <div>
                      <p className="text-sm text-gray-600">Difference</p>
                      <p className={`font-bold text-lg ${
                        (parseFloat(editAmount) - editingTransaction.amount) >= 0 
                          ? 'text-green-900' 
                          : 'text-red-900'
                      }`}>
                        {formatCurrency((parseFloat(editAmount) - editingTransaction.amount))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-8 py-6 border-t border-gray-200 flex justify-end space-x-4">
            <button
              onClick={handleCancelEdit}
              className="px-8 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
              disabled={isEditing}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isEditing}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
            >
              {isEditing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
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
                          {transaction.partialChainId && transaction.status === 'Partial' && (
                            <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                              Chain
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          <div className="flex flex-col">
                            <span>{formatCurrency(transaction.amount)}</span>
                            {transaction.status === 'Partial' && transaction.originalEmiAmount && (
                              <span className="text-xs text-gray-500">
                                Full EMI: {formatCurrency(transaction.originalEmiAmount)}
                              </span>
                            )}
                          </div>
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