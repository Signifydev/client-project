'use client';

import { useState, useEffect } from 'react';
import { CustomerDetails, Loan } from '@/src/app/data-entry/types/dataEntry';
import { formatToDDMMYYYY } from '@/src/app/data-entry/utils/dateCalculations';

interface EMIUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerDetails | null;
  loans: Loan[];
  onPaymentSuccess?: () => void;
}

type PaymentType = 'single' | 'partial' | 'advance';

interface PartialPayment {
  _id: string;
  amount: number;
  fullEmiAmount: number;
  remainingAmount: number;
  paymentDate: string;
}

// ✅ REMOVED ALL VALIDATION: Show ALL loans except truly completed ones
const getAvailableLoans = (loans: Loan[]): Loan[] => {
  console.log('🔍 Available loans:', loans.length);
  return loans.filter((loan: Loan) => {
    // Only filter out loans where ALL EMIs are paid (truly completed)
    const emiPaid = loan.emiPaidCount || 0;
    const totalEmi = loan.totalEmiCount || loan.loanDays || 0;
    const isCompleted = emiPaid >= totalEmi;
    
    console.log('🔍 Loan check:', {
      loanNumber: loan.loanNumber,
      status: loan.status,
      emiPaidCount: emiPaid,
      totalEmiCount: totalEmi,
      isCompleted: isCompleted,
      isRenewed: loan.isRenewed
    });
    
    // Allow ALL loans except:
    // 1. Truly completed loans (all EMIs paid)
    // 2. Renewed loans (they have a new loan)
    return !isCompleted && !loan.isRenewed;
  });
};

export default function EMIUpdateModal({
  isOpen,
  onClose,
  customer,
  loans,
  onPaymentSuccess
}: EMIUpdateModalProps) {
  // Main form state
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('single');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [collectedBy, setCollectedBy] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  
  // Partial payment completion state
  const [existingPartial, setExistingPartial] = useState<PartialPayment | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionAmount, setCompletionAmount] = useState<string>('');
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Advance payment state
  const [advanceStartDate, setAdvanceStartDate] = useState<string>('');
  const [advanceEndDate, setAdvanceEndDate] = useState<string>('');
  const [advanceEmiCount, setAdvanceEmiCount] = useState<number>(0);
  const [advanceTotalAmount, setAdvanceTotalAmount] = useState<number>(0);

  // ✅ SIMPLIFIED: Use available loans function
  const availableLoans = getAvailableLoans(loans);

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      setPaymentDate(today);
      setAdvanceStartDate(today);
      setAdvanceEndDate(today);
      
      if (availableLoans.length > 0) {
        setSelectedLoan(availableLoans[0]);
        setMessage(null);
      } else if (loans.length > 0) {
        setSelectedLoan(null);
        setMessage({
          type: 'info',
          text: 'All loans are either completed or renewed. Please add a new loan.'
        });
      }
    }
  }, [isOpen, availableLoans, loans.length]);

  // Calculate EMI amount for selected loan
  const emiAmount = selectedLoan?.emiAmount || 0;

  // Reset form
  const resetForm = () => {
    if (availableLoans.length > 0) {
      setSelectedLoan(availableLoans[0]);
    } else {
      setSelectedLoan(null);
    }
    
    setPaymentType('single');
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setCollectedBy('');
    setNotes('');
    setMessage(null);
    setExistingPartial(null);
    setShowCompletionModal(false);
    setCompletionAmount('');
  };

  // Check for existing partial payment
  const checkForExistingPartial = async (): Promise<PartialPayment | null> => {
    if (!selectedLoan || !paymentDate || parseFloat(amount) >= emiAmount) {
      return null;
    }

    try {
      const formattedDate = new Date(paymentDate).toISOString().split('T')[0];
      
      const response = await fetch(
        `/api/data-entry/emi-payments?loanId=${selectedLoan._id}&date=${formattedDate}&partialOnly=true`
      );

      if (!response.ok) throw new Error('Failed to check partials');

      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        const partial = result.data[0];
        return {
          _id: partial._id,
          amount: partial.amount,
          fullEmiAmount: partial.fullEmiAmount || emiAmount,
          remainingAmount: partial.partialRemainingAmount || 
                          (partial.fullEmiAmount ? partial.fullEmiAmount - partial.amount : emiAmount - partial.amount),
          paymentDate: partial.paymentDate
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error checking partial:', error);
      return null;
    }
  };

  // Handle form submission - ✅ REMOVED STATUS VALIDATION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    if (!selectedLoan) {
      setMessage({ type: 'error', text: 'Please select a loan' });
      setIsSubmitting(false);
      return;
    }

    if (!paymentDate) {
      setMessage({ type: 'error', text: 'Please select a payment date' });
      setIsSubmitting(false);
      return;
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      setIsSubmitting(false);
      return;
    }

    // 🚨 SMART DETECTION: Check for existing partial payment
    if (paymentType === 'single' && paymentAmount < emiAmount) {
      const existing = await checkForExistingPartial();
      
      if (existing) {
        setExistingPartial(existing);
        setCompletionAmount(paymentAmount.toString());
        
        // Auto-suggest completion
        const shouldComplete = window.confirm(
          `Found existing partial payment of ₹${existing.amount}.\n\n` +
          `Do you want to complete it with ₹${paymentAmount}?\n` +
          `This will make the total ₹${existing.amount + paymentAmount} out of ₹${existing.fullEmiAmount}`
        );
        
        if (shouldComplete) {
          setShowCompletionModal(true);
          setIsSubmitting(false);
          return;
        } else {
          // User doesn't want to complete, maybe they want new partial
          setMessage({
            type: 'warning',
            text: `There's already a partial payment (₹${existing.amount}). Creating another partial payment for the same date is not recommended.`
          });
          // Continue with payment creation (will fail with duplicate error from API)
        }
      }
    }

    // ✅ Check if customer exists before using
    if (!customer || !customer._id) {
      setMessage({ type: 'error', text: 'Customer information not available' });
      setIsSubmitting(false);
      return;
    }

    // ✅ Partial payments don't increment emiPaidCount
    const isPartialPayment = paymentType === 'partial' || paymentAmount < emiAmount;

    // Prepare payment data
    const paymentData: any = {
      loanId: selectedLoan._id,
      customerId: customer._id,
      customerName: customer.name,
      loanNumber: selectedLoan.loanNumber,
      amount: paymentAmount,
      paymentDate: paymentDate,
      collectedBy: collectedBy || 'Operator',
      notes: notes,
      paymentType: paymentType,
      isPartialPayment: isPartialPayment,
      doesNotIncrementCount: isPartialPayment
    };

    // Set status based on payment type
    if (paymentType === 'single') {
      paymentData.status = paymentAmount >= emiAmount ? 'Paid' : 'Partial';
      if (paymentAmount < emiAmount) {
        paymentData.isPartial = true;
        paymentData.fullEmiAmount = emiAmount;
        paymentData.partialRemainingAmount = emiAmount - paymentAmount;
      }
    } else if (paymentType === 'partial') {
      paymentData.status = 'Partial';
      paymentData.isPartial = true;
      paymentData.fullEmiAmount = emiAmount;
      paymentData.partialRemainingAmount = emiAmount - paymentAmount;
    } else if (paymentType === 'advance') {
      paymentData.status = 'Advance';
    }

    try {
      const response = await fetch('/api/data-entry/emi-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage({
          type: 'success',
          text: `✅ Payment recorded successfully! ${result.message}`
        });
        
        // Call success callback
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
        
        // Reset form after delay
        setTimeout(() => {
          resetForm();
          onClose();
        }, 1500);
      } else {
        // Handle specific errors
        if (result.error === 'PARTIAL_EXISTS') {
          setExistingPartial(result.existingPartial);
          setShowCompletionModal(true);
        } else if (result.error === 'DUPLICATE_PAYMENT') {
          setMessage({
            type: 'error',
            text: `❌ ${result.message}`
          });
        } else {
          setMessage({
            type: 'error',
            text: `❌ Error: ${result.error || 'Failed to record payment'}`
          });
        }
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ Error: ${error.message || 'Network error'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle partial completion
  const handleCompletePartial = async () => {
    if (!existingPartial || !completionAmount) return;
    
    setIsCompleting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/data-entry/emi-payments/${existingPartial._id}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          additionalAmount: parseFloat(completionAmount),
          paymentDate: paymentDate,
          collectedBy: collectedBy || 'Operator',
          notes: `Completion payment for ${customer?.name || 'Customer'}`
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const newTotal = existingPartial.amount + parseFloat(completionAmount);
        const isComplete = newTotal >= existingPartial.fullEmiAmount;
        
        setMessage({
          type: 'success',
          text: `✅ Partial payment completed! Total: ₹${newTotal} ${isComplete ? '(Fully Paid)' : ''}`
        });
        
        // Call success callback
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
        
        // Close modals and reset
        setShowCompletionModal(false);
        setExistingPartial(null);
        setCompletionAmount('');
        
        // Close main modal after delay
        setTimeout(() => {
          resetForm();
          onClose();
        }, 1500);
      } else {
        setMessage({
          type: 'error',
          text: `❌ Failed to complete: ${result.error}`
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ Error: ${error.message}`
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Calculate advance payment details
  const calculateAdvancePayments = () => {
    if (!selectedLoan || !advanceStartDate || !advanceEndDate) return;
    
    const start = new Date(advanceStartDate);
    const end = new Date(advanceEndDate);
    
    if (start > end) {
      setMessage({ type: 'error', text: 'Start date must be before end date' });
      return;
    }
    
    // Calculate number of EMIs between dates based on loan frequency
    let emiCount = 0;
    const frequency = selectedLoan.loanType || 'Monthly';
    
    if (frequency === 'Daily') {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      emiCount = diffDays + 1; // Inclusive
    } else if (frequency === 'Weekly') {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
      emiCount = diffWeeks + 1;
    } else { // Monthly
      const startYear = start.getFullYear();
      const startMonth = start.getMonth();
      const endYear = end.getFullYear();
      const endMonth = end.getMonth();
      
      emiCount = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    }
    
    setAdvanceEmiCount(emiCount);
    setAdvanceTotalAmount(emiCount * emiAmount);
    setAmount((emiCount * emiAmount).toString());
  };

  // Handle advance date changes
  useEffect(() => {
    if (paymentType === 'advance' && advanceStartDate && advanceEndDate) {
      calculateAdvancePayments();
    }
  }, [advanceStartDate, advanceEndDate, paymentType]);

  // Don't render if modal is not open
  if (!isOpen) return null;

  // ✅ SIMPLIFIED: Check for ANY available loans
  const hasAvailableLoans = availableLoans.length > 0;
  
  if (!hasAvailableLoans) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              No Loans Available
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="text-center py-8">
            <div className="text-gray-300 text-5xl mb-4">💰</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              {loans.length === 0 ? 'No Loans Found' : 'All Loans Completed'}
            </h4>
            <p className="text-gray-600 mb-4">
              {customer 
                ? `${customer.name} has ${loans.length === 0 ? 'no loans' : 'all loans completed or renewed'}.`
                : 'No loans available for payment.'}
            </p>
            
            <div className="mt-6">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Payment Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Record EMI Payment
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Customer: {customer?.name} ({customer?.customerNumber})
                </p>
                <p className="text-xs text-green-600 mt-2">
                  ✅ {availableLoans.length} loan{availableLoans.length !== 1 ? 's' : ''} available for payment
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Loan Selection - Show ALL available loans */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Loan *
              </label>
              <select
                value={selectedLoan?._id || ''}
                onChange={(e) => {
                  const loan = availableLoans.find(l => l._id === e.target.value);
                  setSelectedLoan(loan || null);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a loan</option>
                {availableLoans.map((loan) => (
                  <option key={loan._id} value={loan._id}>
                    {loan.loanNumber} - ₹{loan.emiAmount} {loan.loanType} 
                    ({loan.emiPaidCount || 0}/{loan.totalEmiCount || loan.loanDays || 0} EMIs)
                  </option>
                ))}
              </select>
            </div>

            {/* Loan Information */}
            {selectedLoan && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-blue-700 mb-1">Loan Number</p>
                    <p className="font-bold text-blue-900">{selectedLoan.loanNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 mb-1">EMI Amount</p>
                    <p className="font-bold text-blue-900">₹{selectedLoan.emiAmount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 mb-1">Paid/Total EMIs</p>
                    <p className="font-bold text-blue-900">
                      {selectedLoan.emiPaidCount || 0}/{selectedLoan.totalEmiCount || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 mb-1">Status</p>
                    <p className="font-bold">
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800 border border-green-300">
                        {selectedLoan.status || 'Active'}
                      </span>
                    </p>
                  </div>
                </div>
                
                {/* Loan Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-blue-700">Progress</span>
                    <span className="text-blue-900">
                      {selectedLoan.totalEmiCount ? 
                        Math.round(((selectedLoan.emiPaidCount || 0) / selectedLoan.totalEmiCount) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-blue-100">
                    <div 
                      className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                      style={{ 
                        width: `${selectedLoan.totalEmiCount ? 
                          Math.min(((selectedLoan.emiPaidCount || 0) / selectedLoan.totalEmiCount) * 100, 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Payment Type *
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentType('single')}
                  className={`py-3 rounded-lg border-2 text-center ${
                    paymentType === 'single'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Single EMI</div>
                  <div className="text-xs mt-1">One payment</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('partial')}
                  className={`py-3 rounded-lg border-2 text-center ${
                    paymentType === 'partial'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Partial</div>
                  <div className="text-xs mt-1">Less than EMI</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('advance')}
                  className={`py-3 rounded-lg border-2 text-center ${
                    paymentType === 'advance'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Advance</div>
                  <div className="text-xs mt-1">Multiple EMIs</div>
                </button>
              </div>
            </div>

            {/* Advance Payment Fields */}
            {paymentType === 'advance' && selectedLoan && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
                <h4 className="font-medium text-green-900">Advance Payment Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={advanceStartDate}
                      onChange={(e) => setAdvanceStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={advanceEndDate}
                      onChange={(e) => setAdvanceEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                </div>
                {advanceEmiCount > 0 && (
                  <div className="p-3 bg-white border border-green-300 rounded">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">EMI Count</p>
                        <p className="font-bold text-gray-900">{advanceEmiCount} EMIs</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="font-bold text-green-900 text-xl">₹{advanceTotalAmount}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {paymentType === 'advance' ? 'Total Amount' : 'Amount (₹)'} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">₹</span>
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={paymentType === 'advance' ? 'Auto-calculated' : 'Enter amount'}
                  step="0.01"
                  min="0"
                  required
                  readOnly={paymentType === 'advance'}
                />
              </div>
              {selectedLoan && paymentType !== 'advance' && (
                <p className="text-xs text-gray-500 mt-2">
                  Full EMI amount: ₹{emiAmount}
                  {parseFloat(amount) < emiAmount && parseFloat(amount) > 0 && (
                    <span className="text-yellow-600 ml-2">
                      Remaining: ₹{emiAmount - parseFloat(amount)}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Collected By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Collected By
              </label>
              <input
                type="text"
                value={collectedBy}
                onChange={(e) => setCollectedBy(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Operator name"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>

            {/* Message Display */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
                message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
                message.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
                'bg-blue-50 border border-blue-200 text-blue-700'
              }`}>
                <div className="flex items-center">
                  {message.type === 'success' && '✅ '}
                  {message.type === 'error' && '❌ '}
                  {message.type === 'warning' && '⚠️ '}
                  {message.type === 'info' && 'ℹ️ '}
                  <span>{message.text}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  'Record Payment'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Partial Completion Modal */}
      {showCompletionModal && existingPartial && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">
                Complete Partial Payment
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Customer: {customer?.name}
              </p>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="font-medium text-yellow-800 mb-3">Existing Partial Payment</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Already Paid:</span>
                    <span className="font-bold">₹{existingPartial.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Full EMI Amount:</span>
                    <span className="font-bold">₹{existingPartial.fullEmiAmount}</span>
                  </div>
                  <div className="flex justify-between border-t border-yellow-300 pt-2 mt-2">
                    <span className="font-medium">Remaining:</span>
                    <span className="font-bold text-green-700">₹{existingPartial.remainingAmount}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
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
                      value={completionAmount}
                      onChange={(e) => setCompletionAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter amount"
                      step="0.01"
                      min="0"
                      max={existingPartial.remainingAmount}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Maximum: ₹{existingPartial.remainingAmount}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Completion Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                {/* New Total Preview */}
                {completionAmount && parseFloat(completionAmount) > 0 && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-green-700 mb-1">New Total</p>
                        <p className="font-bold text-green-900 text-2xl">
                          ₹{existingPartial.amount + parseFloat(completionAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-green-700 mb-1">Status After</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          (existingPartial.amount + parseFloat(completionAmount)) >= existingPartial.fullEmiAmount
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {(existingPartial.amount + parseFloat(completionAmount)) >= existingPartial.fullEmiAmount
                            ? 'Complete ✓'
                            : 'Still Partial'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCompletionModal(false);
                  setExistingPartial(null);
                  setCompletionAmount('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isCompleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompletePartial}
                disabled={isCompleting || !completionAmount || parseFloat(completionAmount) <= 0}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {isCompleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Completing...
                  </>
                ) : (
                  'Complete Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}