'use client';

import { useState, useEffect } from 'react';
import { CustomerDetails, Loan } from '@/src/app/data-entry/types/dataEntry';

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
  loanNumber: string;
}

interface LastEMIPayment {
  paymentDate: string;
  amount: number;
  status: string;
  loanNumber: string;
}

// ✅ INDUSTRIAL STANDARD: Create a stable date utility
const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ✅ FIXED: Show ALL loans including overdue - only filter out truly completed or renewed
const getAvailableLoans = (loans: Loan[]): Loan[] => {
  return loans.filter((loan: Loan) => {
    const emiPaid = loan.emiPaidCount || 0;
    const totalEmi = loan.totalEmiCount || loan.loanDays || 0;
    const isCompleted = emiPaid >= totalEmi;
    const loanStatus = (loan.status || '').toLowerCase();
    
    const shouldExclude = 
      isCompleted || 
      loan.isRenewed || 
      loanStatus === 'completed';
    
    return !shouldExclude;
  });
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
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
  
  // Last EMI paid date state
  const [lastEMIPayment, setLastEMIPayment] = useState<LastEMIPayment | null>(null);
  const [isLoadingLastPayment, setIsLoadingLastPayment] = useState(false);

  // ✅ SIMPLIFIED: Use available loans function
  const availableLoans = getAvailableLoans(loans);

  // ✅ FIXED: Initialize form only once when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = getTodayDate();
      
      // ✅ Initialize dates only if they're empty
      if (!paymentDate) {
        setPaymentDate(today);
      }
      
      // ✅ Only set loan if not already selected
      if (!selectedLoan && availableLoans.length > 0) {
        setSelectedLoan(availableLoans[0]);
        setMessage(null);
      } else if (availableLoans.length === 0 && loans.length > 0) {
        setSelectedLoan(null);
        setMessage({
          type: 'info',
          text: 'All loans are either completed or renewed. Please add a new loan.'
        });
      }
      
      // Get current user for collectedBy
      try {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
          const user = JSON.parse(userData);
          const operatorName = user.name || user.username || 'Operator';
          setCollectedBy(operatorName);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setCollectedBy('Operator');
      }
    }
  }, [isOpen]);

  // ✅ FIXED: Handle loan selection changes separately
  useEffect(() => {
    if (isOpen && !selectedLoan && availableLoans.length > 0) {
      setSelectedLoan(availableLoans[0]);
    }
  }, [availableLoans, isOpen, selectedLoan]);

  // Check for existing partial when loan or date changes
  useEffect(() => {
    const checkPartial = async () => {
      if (!selectedLoan || !paymentDate || paymentType !== 'partial') return;
      
      try {
        const formattedDate = paymentDate;
        const response = await fetch(
          `/api/data-entry/emi-payments?loanId=${selectedLoan._id}&date=${formattedDate}`
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            const partial = result.data.find((p: any) => p.status === 'Partial');
            if (partial) {
              setExistingPartial({
                _id: partial._id,
                amount: partial.amount,
                fullEmiAmount: partial.originalEmiAmount || selectedLoan.emiAmount,
                remainingAmount: partial.partialRemainingAmount || 
                               ((partial.originalEmiAmount || selectedLoan.emiAmount) - partial.amount),
                paymentDate: partial.paymentDate,
                loanNumber: partial.loanNumber
              });
              
              // Auto-fill completion amount
              setCompletionAmount((partial.partialRemainingAmount || 
                ((partial.originalEmiAmount || selectedLoan.emiAmount) - partial.amount)).toString());
            } else {
              setExistingPartial(null);
            }
          } else {
            setExistingPartial(null);
          }
        }
      } catch (error) {
        console.error('Error checking partial:', error);
        setExistingPartial(null);
      }
    };

    checkPartial();
  }, [selectedLoan, paymentDate, paymentType]);

  // Fetch last EMI payment when loan is selected
  useEffect(() => {
    const fetchLastEMIPayment = async () => {
      if (!selectedLoan || !isOpen) {
        setLastEMIPayment(null);
        return;
      }

      setIsLoadingLastPayment(true);
      try {
        const response = await fetch(
          `/api/data-entry/emi-payments?loanId=${selectedLoan._id}&limit=1&sort=desc`
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            const lastPayment = result.data[0];
            setLastEMIPayment({
              paymentDate: lastPayment.paymentDate,
              amount: lastPayment.amount,
              status: lastPayment.status,
              loanNumber: selectedLoan.loanNumber
            });
          } else {
            setLastEMIPayment(null);
          }
        } else {
          setLastEMIPayment(null);
        }
      } catch (error) {
        console.error('Error fetching last EMI payment:', error);
        setLastEMIPayment(null);
      } finally {
        setIsLoadingLastPayment(false);
      }
    };

    fetchLastEMIPayment();
  }, [selectedLoan, isOpen]);

  // Calculate EMI amount for selected loan
  const emiAmount = selectedLoan?.emiAmount || 0;

  // ✅ FIXED: Reset form properly
  const resetForm = () => {
    const today = getTodayDate();
    
    if (availableLoans.length > 0) {
      setSelectedLoan(availableLoans[0]);
    } else {
      setSelectedLoan(null);
    }
    
    setPaymentType('single');
    setAmount('');
    setPaymentDate(today);
    setCollectedBy('');
    setNotes('');
    setMessage(null);
    setExistingPartial(null);
    setShowCompletionModal(false);
    setCompletionAmount('');
    setLastEMIPayment(null);
  };

  // ✅ FIXED: Handle form submission with proper partial payment handling
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

    // Check if customer exists before using
    if (!customer || !customer._id) {
      setMessage({ type: 'error', text: 'Customer information not available' });
      setIsSubmitting(false);
      return;
    }

    // 🚨 CRITICAL FIX: Handle partial payments correctly
    if (paymentType === 'partial' || paymentAmount < emiAmount) {
      // If there's an existing partial, show completion modal
      if (existingPartial) {
        setCompletionAmount(paymentAmount.toString());
        setShowCompletionModal(true);
        setIsSubmitting(false);
        return;
      }
      
      // For new partial payments, use specialized logic
      return await handlePartialPayment(paymentAmount);
    }

    // ✅ For full payments, continue with existing logic
    // Prepare payment data for full payment
    const paymentData: any = {
      loanId: selectedLoan._id,
      customerId: customer._id,
      customerName: customer.name,
      loanNumber: selectedLoan.loanNumber,
      amount: paymentAmount,
      paymentDate: paymentDate,
      collectedBy: collectedBy || 'Operator',
      notes: notes,
      paymentType: 'single',
      paymentMethod: 'Cash'
    };

    try {
      console.log('📤 Submitting payment:', paymentData);
      
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
          text: `✅ Payment recorded successfully!`
        });
        
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
        
        setTimeout(() => {
          resetForm();
          onClose();
        }, 1500);
      } else {
        // Handle specific error cases
        if (result.error === 'PARTIAL_PAYMENT_EXISTS') {
          setExistingPartial({
            _id: result.data?.partialPaymentId || '',
            amount: result.data?.paidAmount || 0,
            fullEmiAmount: result.data?.originalEmiAmount || emiAmount,
            remainingAmount: result.data?.remainingAmount || (emiAmount - paymentAmount),
            paymentDate: paymentDate,
            loanNumber: selectedLoan.loanNumber
          });
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

  // 🚨 CRITICAL: Handle partial payment creation
  const handlePartialPayment = async (paymentAmount: number) => {
    if (!selectedLoan || !customer) {
      setMessage({ type: 'error', text: 'Loan or customer information not available' });
      setIsSubmitting(false);
      return;
    }

    // ✅ FIXED: Use correct partial payment structure
    const partialPaymentData = {
      loanId: selectedLoan._id,
      amount: paymentAmount,
      paymentDate: paymentDate,
      collectedBy: collectedBy || 'Operator',
      customerName: customer.name,
      notes: notes || `Partial payment: ₹${paymentAmount} of ₹${emiAmount}`,
      paymentType: 'single', // Let API determine if it's partial
      paymentMethod: 'Cash'
    };

    console.log('📤 Sending partial payment data:', partialPaymentData);

    try {
      const response = await fetch('/api/data-entry/emi-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(partialPaymentData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const isPartial = result.data?.payment?.status === 'Partial';
        const messageText = isPartial 
          ? `✅ Partial payment recorded! ₹${paymentAmount} (Remaining: ₹${emiAmount - paymentAmount})`
          : `✅ Payment recorded successfully!`;
        
        setMessage({
          type: 'success',
          text: messageText
        });
        
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
        
        setTimeout(() => {
          resetForm();
          onClose();
        }, 1500);
      } else {
        // Handle specific error from API
        if (result.error === 'PARTIAL_PAYMENT_EXISTS') {
          setExistingPartial({
            _id: result.data?.partialPaymentId || '',
            amount: result.data?.paidAmount || 0,
            fullEmiAmount: result.data?.originalEmiAmount || emiAmount,
            remainingAmount: result.data?.remainingAmount || (emiAmount - paymentAmount),
            paymentDate: paymentDate,
            loanNumber: selectedLoan.loanNumber
          });
          setShowCompletionModal(true);
        } else {
          setMessage({
            type: 'error',
            text: `❌ Failed to record payment: ${result.error || result.message || 'Unknown error'}`
          });
        }
      }
    } catch (error: any) {
      console.error('Error creating partial payment:', error);
      setMessage({
        type: 'error',
        text: `❌ Network Error: ${error.message || 'Failed to connect to server'}`
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

    const additionalAmount = parseFloat(completionAmount);
    if (isNaN(additionalAmount) || additionalAmount <= 0) {
      setMessage({
        type: 'error',
        text: 'Please enter a valid amount'
      });
      setIsCompleting(false);
      return;
    }

    try {
      // ✅ FIXED: Use correct completion endpoint structure
      const completionData = {
        partialPaymentId: existingPartial._id,
        additionalAmount: additionalAmount,
        paymentDate: paymentDate,
        collectedBy: collectedBy || 'Operator',
        paymentType: 'partial_completion',
        notes: notes || `Completion payment for ${customer?.name || 'Customer'}`
      };

      console.log('📤 Completing partial payment:', completionData);
      
      const response = await fetch('/api/data-entry/emi-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completionData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const newTotal = existingPartial.amount + additionalAmount;
        const isComplete = result.data?.isNowFullyPaid || (newTotal >= existingPartial.fullEmiAmount);
        
        setMessage({
          type: 'success',
          text: `✅ Partial payment completed! Total: ₹${newTotal} ${isComplete ? '(Fully Paid, EMI count incremented)' : '(Still Partial)'}`
        });
        
        if (onPaymentSuccess) {
          onPaymentSuccess();
        }
        
        setShowCompletionModal(false);
        setExistingPartial(null);
        setCompletionAmount('');
        
        setTimeout(() => {
          resetForm();
          onClose();
        }, 1500);
      } else {
        setMessage({
          type: 'error',
          text: `❌ Failed to complete: ${result.error || result.message}`
        });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: `❌ Error: ${error.message || 'Network error'}`
      });
    } finally {
      setIsCompleting(false);
    }
  };

  // Handle payment type change
  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentType(type);
    setMessage(null);
    
    // Reset amount when switching types
    if (type === 'single' && selectedLoan) {
      setAmount(emiAmount.toString());
    } else {
      setAmount('');
    }
    
    // Clear existing partial when changing type
    if (type !== 'partial') {
      setExistingPartial(null);
    }
  };

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
            {/* Loan Selection */}
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

            {/* Loan Information with Last EMI Paid Date */}
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
                
                {/* Existing Partial Warning */}
                {existingPartial && paymentType === 'partial' && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="flex items-center text-yellow-700">
                      <span className="mr-2">⚠️</span>
                      <span className="text-sm">
                        Partial payment exists (₹{existingPartial.amount} paid, ₹{existingPartial.remainingAmount} remaining)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCompletionModal(true)}
                      className="mt-2 text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200"
                    >
                      Complete this partial
                    </button>
                  </div>
                )}
                
                {/* Last EMI Paid Date Information */}
                <div className="mt-3 p-3 bg-white border border-blue-100 rounded">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700 mb-1">Last EMI Paid Date</p>
                      {isLoadingLastPayment ? (
                        <p className="text-sm text-gray-500">Loading...</p>
                      ) : lastEMIPayment ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-blue-900">
                            {formatDate(lastEMIPayment.paymentDate)}
                          </span>
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                            ₹{lastEMIPayment.amount}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({lastEMIPayment.status})
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No EMI payments recorded yet</p>
                      )}
                    </div>
                    {lastEMIPayment && (
                      <div className="text-xs text-gray-500">
                        Loan: {lastEMIPayment.loanNumber}
                      </div>
                    )}
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
                  onClick={() => handlePaymentTypeChange('single')}
                  className={`py-3 rounded-lg border-2 text-center ${
                    paymentType === 'single'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Full EMI</div>
                  <div className="text-xs mt-1">Pay full amount</div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange('partial')}
                  className={`py-3 rounded-lg border-2 text-center ${
                    paymentType === 'partial'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Partial</div>
                  <div className="text-xs mt-1">Pay less than EMI</div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange('advance')}
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

            {/* Payment Amount */}
            {paymentType !== 'advance' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹) *
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
                    placeholder={paymentType === 'partial' ? 'Enter partial amount' : 'Enter amount'}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                {selectedLoan && (
                  <p className="text-xs text-gray-500 mt-2">
                    {paymentType === 'partial' ? (
                      <>
                        Full EMI amount: ₹{emiAmount}
                        {parseFloat(amount) < emiAmount && parseFloat(amount) > 0 && (
                          <span className="text-yellow-600 ml-2">
                            Remaining: ₹{emiAmount - parseFloat(amount)}
                          </span>
                        )}
                      </>
                    ) : (
                      `Full EMI amount: ₹${emiAmount}`
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Payment Date */}
            {paymentType !== 'advance' && (
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
                />
                <p className="text-xs text-gray-500 mt-2">
                  Select any date - past (old EMIs), present (today), or future (advance payments)
                </p>
              </div>
            )}

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
                      placeholder={`Enter amount (max: ₹${existingPartial.remainingAmount})`}
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