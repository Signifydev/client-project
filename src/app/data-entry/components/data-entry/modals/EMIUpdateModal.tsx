'use client';

import { useState, useEffect, useMemo } from 'react';
import { Customer, Loan, EMIUpdate as EMIUpdateType } from '@/src/app/data-entry/types/dataEntry';
import { formatDateToDDMMYYYY } from '@/src/app/data-entry/utils/dateCalculations';
import { useEMI } from '@/src/app/data-entry/hooks/useEMI';

interface EMIUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer: Customer | null;
  selectedLoan: Loan | null;
  customers: Customer[];
  currentOperator: { name: string; fullName: string };
  onCustomerSelect?: (customer: Customer | null) => void;
  onLoanSelect?: (loan: Loan | null) => void;
  onSuccess?: () => void;
}

// Helper function to get customer loans from customer object
const getCustomerLoans = (customer: Customer): Loan[] => {
  if (!customer) return [];
  
  const customerWithLoans = customer as any;
  if (customerWithLoans.loans && Array.isArray(customerWithLoans.loans)) {
    return customerWithLoans.loans as Loan[];
  }
  
  if (customerWithLoans.loanNumber || customerWithLoans.amount) {
    return [customerWithLoans as Loan];
  }
  
  return [];
};

// Helper function to calculate number of EMIs based on loan type and date range
const calculateNumberOfEMIs = (
  loanType: string,
  startDate: string,
  endDate: string
): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Set both dates to start of day for accurate calculation
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  if (end < start) return 0;
  
  switch (loanType) {
    case 'Daily':
      // Daily loans: count each day between dates (inclusive)
      const timeDiff = end.getTime() - start.getTime();
      const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      return dayDiff + 1; // +1 to include both start and end dates
      
    case 'Weekly':
      // Weekly loans: count weeks
      const weeksDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
      return weeksDiff + 1;
      
    case 'Monthly':
      // Monthly loans: count months
      const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + 
                         (end.getMonth() - start.getMonth());
      return Math.max(monthsDiff + 1, 1); // At least 1 month
      
    default:
      // Default to daily calculation
      const defaultDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return defaultDiff + 1;
  }
};

// ✅ FIXED: Calculate which installment number this payment is for
const calculateCurrentInstallmentNumber = (loan: Loan): number => {
  if (!loan) return 1;
  
  // If emiPaidCount exists, next payment is emiPaidCount + 1
  return (loan.emiPaidCount || 0) + 1;
};

// ✅ FIXED: Get correct EMI amount for the current installment
const getCorrectEmiAmountForInstallment = (loan: Loan, installmentNumber: number): number => {
  if (!loan || !installmentNumber) return loan?.emiAmount || 0;
  
  console.log('🔍 Custom EMI Check:', {
    loanNumber: loan.loanNumber,
    emiType: loan.emiType,
    totalEmiCount: loan.totalEmiCount,
    installmentNumber: installmentNumber,
    regularEmiAmount: loan.emiAmount,
    customEmiAmount: loan.customEmiAmount,
    isLastInstallment: installmentNumber === loan.totalEmiCount,
    hasCustomEMI: loan.emiType === 'custom' && loan.loanType !== 'Daily'
  });
  
  // Check if this is a custom EMI loan and we're on the last installment
  if (loan.emiType === 'custom' && loan.loanType !== 'Daily') {
    if (installmentNumber === loan.totalEmiCount) {
      // Last installment - use custom amount
      return loan.customEmiAmount || loan.emiAmount || 0;
    } else {
      // Regular installment - use standard amount
      return loan.emiAmount || 0;
    }
  }
  
  // For fixed EMI or daily loans, always use standard amount
  return loan.emiAmount || 0;
};

// ✅ FIXED: Calculate advance payment for custom EMI loans
const calculateAdvancePaymentForCustomEMI = (
  loan: Loan,
  advanceFromDate: string,
  advanceToDate: string
): { emiCount: number; totalAmount: number; breakdown: Array<{ installment: number; amount: number; isCustom: boolean }> } => {
  if (!loan || !advanceFromDate || !advanceToDate) {
    return { emiCount: 0, totalAmount: 0, breakdown: [] };
  }

  // Calculate number of EMIs in the date range
  const emiCount = calculateNumberOfEMIs(loan.loanType, advanceFromDate, advanceToDate);
  
  if (emiCount <= 0) {
    return { emiCount: 0, totalAmount: 0, breakdown: [] };
  }

  // Get current installment number (first installment in the range)
  const startInstallment = calculateCurrentInstallmentNumber(loan);
  const breakdown = [];
  let totalAmount = 0;

  console.log('📅 Advance Payment Calculation for Custom EMI:', {
    loanNumber: loan.loanNumber,
    emiType: loan.emiType,
    totalEmiCount: loan.totalEmiCount,
    startInstallment: startInstallment,
    emiCountInRange: emiCount,
    advanceFromDate: advanceFromDate,
    advanceToDate: advanceToDate
  });

  // Calculate each installment in the range
  for (let i = 0; i < emiCount; i++) {
    const installmentNumber = startInstallment + i;
    
    // Check if this installment exceeds total loan installments
    if (installmentNumber > loan.totalEmiCount) {
      console.log(`⚠️ Installment ${installmentNumber} exceeds total ${loan.totalEmiCount}, stopping calculation`);
      break;
    }

    const amount = getCorrectEmiAmountForInstallment(loan, installmentNumber);
    const isLastInstallment = installmentNumber === loan.totalEmiCount;
    
    breakdown.push({
      installment: installmentNumber,
      amount: amount,
      isCustom: isLastInstallment && loan.emiType === 'custom' && loan.loanType !== 'Daily'
    });
    
    totalAmount += amount;

    console.log(`   Installment ${installmentNumber}: ₹${amount} ${isLastInstallment ? '(LAST - Custom)' : ''}`);
  }

  // Update actual emi count based on valid installments
  const actualEmiCount = breakdown.length;

  console.log('📊 Advance Payment Summary:', {
    totalAmount: totalAmount,
    actualEmiCount: actualEmiCount,
    breakdown: breakdown,
    expectedIfAllRegular: loan.emiAmount ? loan.emiAmount * actualEmiCount : 0
  });

  return {
    emiCount: actualEmiCount,
    totalAmount: totalAmount,
    breakdown: breakdown
  };
};

export default function EMIUpdateModal({
  isOpen,
  onClose,
  selectedCustomer,
  selectedLoan,
  customers,
  currentOperator,
  onCustomerSelect,
  onLoanSelect,
  onSuccess
}: EMIUpdateModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [emiUpdate, setEmiUpdate] = useState<EMIUpdateType & { installmentNumber?: number }>({
    customerId: '',
    customerName: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    status: 'Paid',
    collectedBy: currentOperator.name || 'Operator',
    paymentType: 'single',
    installmentNumber: 1
  });
  const [customerLoans, setCustomerLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  
  // State for advance payment
  const [advanceFromDate, setAdvanceFromDate] = useState('');
  const [advanceToDate, setAdvanceToDate] = useState('');
  const [numberOfEmis, setNumberOfEmis] = useState<number>(0);
  const [totalAdvanceAmount, setTotalAdvanceAmount] = useState<number>(0);
  const [advanceBreakdown, setAdvanceBreakdown] = useState<Array<{installment: number; amount: number; isCustom: boolean}>>([]);

  // Get the updateEMI function from useEMI hook
  const emiHook = useEMI(currentOperator.name);
  
  // ✅ FIXED: Create our own updateEMI function with originalEmiAmount and installmentNumber
  const updateEMI = async (emiData: EMIUpdateType & { installmentNumber?: number }) => {
    try {
      // ✅ CRITICAL FIX: Get the correct EMI amount for this installment
      const currentInstallment = calculateCurrentInstallmentNumber(selectedLoan!);
      const correctEmiAmount = getCorrectEmiAmountForInstallment(selectedLoan!, currentInstallment);
      
      console.log('📤 Sending to API with correct EMI amount and installment number:', {
        ...emiData,
        operatorName: currentOperator.name,
        officeCategory: selectedCustomer?.officeCategory || 'Office 1',
        advanceFromDate: emiData.paymentType === 'advance' ? advanceFromDate : undefined,
        advanceToDate: emiData.paymentType === 'advance' ? advanceToDate : undefined,
        advanceEmiCount: emiData.paymentType === 'advance' ? numberOfEmis.toString() : undefined,
        // ✅ FIXED: Send total amount for advance payments
        amount: emiData.paymentType === 'advance' ? totalAdvanceAmount.toString() : emiData.amount,
        // ✅ CRITICAL FIX: Send original EMI amount for ALL payments
        originalEmiAmount: correctEmiAmount,
        // ✅ NEW: Send installment number to API
        installmentNumber: emiData.installmentNumber || currentInstallment
      });

      const response = await fetch('/api/data-entry/emi-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...emiData,
          operatorName: currentOperator.name,
          officeCategory: selectedCustomer?.officeCategory || 'Office 1',
          advanceFromDate: emiData.paymentType === 'advance' ? advanceFromDate : undefined,
          advanceToDate: emiData.paymentType === 'advance' ? advanceToDate : undefined,
          advanceEmiCount: emiData.paymentType === 'advance' ? numberOfEmis.toString() : undefined,
          // ✅ CRITICAL FIX: Send total amount for advance payments
          amount: emiData.paymentType === 'advance' ? totalAdvanceAmount.toString() : emiData.amount,
          // ✅ Also send advanceTotalAmount explicitly
          advanceTotalAmount: emiData.paymentType === 'advance' ? totalAdvanceAmount.toString() : undefined,
          // ✅ CRITICAL FIX: Send original EMI amount (full EMI amount)
          originalEmiAmount: correctEmiAmount,
          // ✅ NEW: Send installment number to API
          installmentNumber: emiData.installmentNumber || currentInstallment
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update EMI');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating EMI:', error);
      throw error;
    }
  };

  // Update EMI update when selected customer or loan changes
  useEffect(() => {
    if (selectedCustomer) {
      setEmiUpdate(prev => ({
        ...prev,
        customerId: selectedCustomer._id || '',
        customerName: selectedCustomer.name,
        customerNumber: selectedCustomer.customerNumber,
        collectedBy: currentOperator.fullName || currentOperator.name
      }));
      
      // Load customer loans
      loadCustomerLoans(selectedCustomer);
    }
  }, [selectedCustomer, currentOperator]);

  useEffect(() => {
    if (selectedLoan && selectedCustomer) {
      // ✅ FIXED: Calculate which installment we're paying
      const currentInstallment = calculateCurrentInstallmentNumber(selectedLoan);
      // ✅ FIXED: Get correct amount for this installment
      const correctEmiAmount = getCorrectEmiAmountForInstallment(selectedLoan, currentInstallment);
      
      console.log('🎯 Setting correct EMI amount:', {
        loanNumber: selectedLoan.loanNumber,
        emiType: selectedLoan.emiType,
        totalInstallments: selectedLoan.totalEmiCount,
        currentInstallment: currentInstallment,
        previousEmiPaidCount: selectedLoan.emiPaidCount || 0,
        standardEmiAmount: selectedLoan.emiAmount,
        customEmiAmount: selectedLoan.customEmiAmount,
        correctAmountForThisInstallment: correctEmiAmount,
        isLastInstallment: currentInstallment === selectedLoan.totalEmiCount,
      });
      
      setEmiUpdate(prev => ({
        ...prev,
        loanId: selectedLoan._id || '',
        loanNumber: selectedLoan.loanNumber,
        amount: correctEmiAmount.toString(), // ✅ Use CORRECT full EMI amount as default
        paymentDate: new Date().toISOString().split('T')[0],
        installmentNumber: currentInstallment, // ✅ Store installment number
        // ✅ NEW: Store the full EMI amount for reference
        _fullEmiAmount: correctEmiAmount.toString() // This won't be sent to API, just for UI
      }));
      
      // Set default advance dates (today to today+7 days)
      const today = new Date();
      const defaultEndDate = new Date(today);
      defaultEndDate.setDate(defaultEndDate.getDate() + 7);
      
      setAdvanceFromDate(today.toISOString().split('T')[0]);
      setAdvanceToDate(defaultEndDate.toISOString().split('T')[0]);
    }
  }, [selectedLoan, selectedCustomer]);

  // Calculate advance payment when dates change
  useEffect(() => {
    if (emiUpdate.paymentType === 'advance' && selectedLoan && advanceFromDate && advanceToDate) {
      calculateAdvancePayment();
    }
  }, [advanceFromDate, advanceToDate, emiUpdate.paymentType, selectedLoan]);

  const loadCustomerLoans = async (customer: Customer) => {
    setLoadingCustomer(true);
    try {
      const loans = getCustomerLoans(customer);
      const activeLoans = loans.filter(loan => 
        loan.status === 'active' && !loan.isRenewed
      );
      setCustomerLoans(activeLoans);
    } catch (error) {
      console.error('Error loading customer loans:', error);
    } finally {
      setLoadingCustomer(false);
    }
  };

  const calculateAdvancePayment = () => {
    if (!selectedLoan || !advanceFromDate || !advanceToDate) return;

    const startDate = new Date(advanceFromDate);
    const endDate = new Date(advanceToDate);
    
    // Check if end date is before start date
    if (endDate < startDate) {
      setNumberOfEmis(0);
      setTotalAdvanceAmount(0);
      setAdvanceBreakdown([]);
      return;
    }

    // ✅ FIXED: Use correct calculation for custom EMI loans
    if (selectedLoan.emiType === 'custom' && selectedLoan.loanType !== 'Daily') {
      const result = calculateAdvancePaymentForCustomEMI(selectedLoan, advanceFromDate, advanceToDate);
      
      setNumberOfEmis(result.emiCount);
      setTotalAdvanceAmount(result.totalAmount);
      setAdvanceBreakdown(result.breakdown);
      
      // ✅ FIXED: Update emiUpdate with the CORRECT total amount
      setEmiUpdate(prev => ({
        ...prev,
        amount: selectedLoan.emiAmount?.toString() || '0', // Keep standard amount for display
        totalAmount: result.totalAmount.toString(), // Store CORRECT total amount
        numberOfEmis: result.emiCount.toString()
      }));
    } else {
      // For fixed EMI or daily loans, use simple calculation
      const emiCount = calculateNumberOfEMIs(selectedLoan.loanType, advanceFromDate, advanceToDate);
      setNumberOfEmis(emiCount);
      
      // Calculate total amount
      const emiAmount = selectedLoan.emiAmount || 0;
      const totalAmount = emiAmount * emiCount;
      setTotalAdvanceAmount(totalAmount);
      setAdvanceBreakdown([]); // No breakdown needed for fixed EMI
      
      // Update emiUpdate with the TOTAL amount for advance payments
      setEmiUpdate(prev => ({
        ...prev,
        amount: emiAmount.toString(), // Keep single EMI amount for display
        totalAmount: totalAmount.toString(), // Store total amount separately
        numberOfEmis: emiCount.toString()
      }));
    }
  };

  const handleCustomerSearch = (customer: Customer) => {
    onCustomerSelect?.(customer);
    setSearchQuery('');
  };

  const getLoanPaymentStatus = (loan: Loan) => {
    const today = new Date().toISOString().split('T')[0];
    const todayPayment = (loan.emiHistory || []).find(payment => 
      payment.paymentDate.split('T')[0] === today
    );
    
    if (todayPayment) {
      return {
        status: todayPayment.status,
        amount: todayPayment.amount,
        date: todayPayment.paymentDate
      };
    }
    
    return {
      status: 'Unpaid',
      amount: 0,
      date: today
    };
  };

  const handleSubmit = async () => {
    if (emiUpdate.paymentType === 'single') {
      // Single payment validation
      if (!emiUpdate.amount || parseFloat(emiUpdate.amount) <= 0) {
        alert('Please enter a valid amount');
        return;
      }
      
      // ✅ NEW: Validate partial payment amount
      if (emiUpdate.status === 'Partial') {
        const currentInstallment = calculateCurrentInstallmentNumber(selectedLoan!);
        const fullEmiAmount = getCorrectEmiAmountForInstallment(selectedLoan!, currentInstallment);
        const partialAmount = parseFloat(emiUpdate.amount);
        
        if (partialAmount >= fullEmiAmount) {
          alert(`Partial payment (₹${partialAmount}) should be less than full EMI amount (₹${fullEmiAmount}). Please change status to "Paid" or reduce amount.`);
          return;
        }
        
        if (partialAmount <= 0) {
          alert('Partial payment amount must be greater than 0');
          return;
        }
        
        console.log('✅ Partial payment validation passed:', {
          partialAmount,
          fullEmiAmount,
          remaining: fullEmiAmount - partialAmount
        });
      }
    } else {
      // Advance payment validation
      if (!advanceFromDate || !advanceToDate) {
        alert('Please select both from and to dates for advance payment');
        return;
      }

      const startDate = new Date(advanceFromDate);
      const endDate = new Date(advanceToDate);
      
      if (endDate < startDate) {
        alert('End date cannot be before start date');
        return;
      }

      if (numberOfEmis <= 0) {
        alert('Invalid date range. Please select valid dates');
        return;
      }

      // Check if start date is before loan start date
      const loanStartDate = selectedLoan?.emiStartDate ? 
        new Date(selectedLoan.emiStartDate) : 
        (selectedLoan?.dateApplied ? new Date(selectedLoan.dateApplied) : null);
      
      if (loanStartDate && startDate < loanStartDate) {
        alert(`Start date cannot be before loan start date: ${formatDateToDDMMYYYY(loanStartDate.toISOString())}`);
        return;
      }
    }

    if (!emiUpdate.loanId) {
      alert('Please select a loan');
      return;
    }

    setIsLoading(true);
    try {
      // ✅ FIXED: Calculate correct EMI amount and installment number
      const currentInstallment = calculateCurrentInstallmentNumber(selectedLoan!);
      const correctEmiAmount = getCorrectEmiAmountForInstallment(selectedLoan!, currentInstallment);
      
      // ✅ FIXED: Prepare correct data for API with installmentNumber
      const paymentData = {
        ...emiUpdate,
        advanceFromDate: emiUpdate.paymentType === 'advance' ? advanceFromDate : undefined,
        advanceToDate: emiUpdate.paymentType === 'advance' ? advanceToDate : undefined,
        advanceEmiCount: emiUpdate.paymentType === 'advance' ? numberOfEmis.toString() : undefined,
        advanceTotalAmount: emiUpdate.paymentType === 'advance' ? totalAdvanceAmount.toString() : undefined,
        // ✅ For advance payments, send the TOTAL amount, not single EMI amount
        amount: emiUpdate.paymentType === 'advance' ? totalAdvanceAmount.toString() : emiUpdate.amount,
        // ✅ CRITICAL FIX: Send original EMI amount (full amount)
        originalEmiAmount: correctEmiAmount,
        // ✅ NEW: Send installment number to API
        installmentNumber: emiUpdate.installmentNumber || currentInstallment
      };

      console.log('📤 Submitting payment WITH installmentNumber:', {
        paymentType: emiUpdate.paymentType,
        amountSent: paymentData.amount,
        installmentNumber: paymentData.installmentNumber,
        originalEmiAmount: correctEmiAmount,
        totalAdvanceAmount,
        emiCount: numberOfEmis,
        perEmiAmount: selectedLoan?.emiAmount,
        customEmiDetails: selectedLoan?.emiType === 'custom' ? {
          isCustom: true,
          regularAmount: selectedLoan.emiAmount,
          customAmount: selectedLoan.customEmiAmount,
          currentInstallment: calculateCurrentInstallmentNumber(selectedLoan!),
          totalInstallments: selectedLoan.totalEmiCount,
          advanceBreakdown: advanceBreakdown
        } : null
      });

      await updateEMI(paymentData);
      
      // ✅ FIXED: Show different messages for partial vs full payments
      let message = '';
      if (emiUpdate.paymentType === 'advance') {
        message = `${numberOfEmis} Advance EMI payments recorded successfully for period ${formatDateToDDMMYYYY(advanceFromDate)} to ${formatDateToDDMMYYYY(advanceToDate)}! Total: ₹${totalAdvanceAmount}`;
      } else if (emiUpdate.status === 'Partial') {
        const fullEmiAmount = correctEmiAmount;
        const partialAmount = parseFloat(emiUpdate.amount);
        const remainingAmount = fullEmiAmount - partialAmount;
        message = `Partial payment of ₹${partialAmount} recorded successfully for installment ${currentInstallment}. Remaining amount: ₹${remainingAmount}. Next EMI date will NOT advance until full payment is made.`;
      } else {
        message = `EMI payment of ₹${correctEmiAmount} for installment ${currentInstallment} recorded successfully!`;
      }
      
      alert(message);
      onSuccess?.();
      onClose();
      
      // Reset form
      setEmiUpdate({
        customerId: '',
        customerName: '',
        paymentDate: new Date().toISOString().split('T')[0],
        amount: '',
        status: 'Paid',
        collectedBy: currentOperator.name || 'Operator',
        paymentType: 'single',
        installmentNumber: 1
      });
      setAdvanceFromDate('');
      setAdvanceToDate('');
      setNumberOfEmis(0);
      setTotalAdvanceAmount(0);
      setAdvanceBreakdown([]);
      
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      alert('Error: ' + (error.message || 'Failed to record payment'));
    } finally {
      setIsLoading(false);
    }
  };

  // Use useMemo for filtered customers to ensure proper type inference
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return [] as Customer[];
    
    const query = searchQuery.toLowerCase();
    return customers.filter((customer): customer is Customer => {
      const nameMatch = customer.name.toLowerCase().includes(query);
      const numberMatch = customer.customerNumber?.toLowerCase().includes(query) || false;
      return nameMatch || numberMatch;
    });
  }, [customers, searchQuery]);

  // Helper function to get loan ID safely
  const getLoanId = (loan: Loan): string => {
    return loan._id || `loan-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Helper function to get customer ID safely
  const getCustomerId = (customer: Customer): string => {
    return customer._id || `customer-${Math.random().toString(36).substr(2, 9)}`;
  };

  // ✅ FIXED: Helper to display EMI breakdown for custom loans
  const renderEMIBreakdown = () => {
    if (!selectedLoan || selectedLoan.emiType !== 'custom' || selectedLoan.loanType === 'Daily') {
      return null;
    }
    
    const currentInstallment = calculateCurrentInstallmentNumber(selectedLoan);
    const isLastInstallment = currentInstallment === selectedLoan.totalEmiCount;
    const regularAmount = selectedLoan.emiAmount || 0;
    const customAmount = selectedLoan.customEmiAmount || regularAmount;
    const paidCount = selectedLoan.emiPaidCount || 0;
    const remainingCount = (selectedLoan.totalEmiCount || 0) - paidCount;
    
    // ✅ NEW: Show full EMI amount vs partial payment
    const currentFullEmiAmount = getCorrectEmiAmountForInstallment(selectedLoan, currentInstallment);
    const isPartialPayment = emiUpdate.status === 'Partial';
    const partialAmount = parseFloat(emiUpdate.amount) || 0;
    const remainingAmount = currentFullEmiAmount - partialAmount;
    
    return (
      <div className="mt-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-xl">
        <h4 className="font-medium text-purple-900 text-lg mb-2">Custom EMI Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-3 rounded-lg border border-purple-100">
            <p className="text-xs text-purple-700 mb-1">Regular EMI (Weeks 1-{selectedLoan.totalEmiCount - 1})</p>
            <p className="font-semibold text-purple-900">₹{regularAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-purple-100">
            <p className="text-xs text-purple-700 mb-1">Last EMI (Week {selectedLoan.totalEmiCount})</p>
            <p className="font-semibold text-purple-900">₹{customAmount.toLocaleString()}</p>
          </div>
          <div className={`p-3 rounded-lg border ${isLastInstallment ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-purple-100'}`}>
            <p className="text-xs text-purple-700 mb-1">Current Payment</p>
            <p className="font-bold text-lg">
              Week {currentInstallment} of {selectedLoan.totalEmiCount}
              {isLastInstallment && <span className="ml-2 text-yellow-700">(Last EMI)</span>}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Paid: {paidCount}, Remaining: {remainingCount}
            </p>
          </div>
          <div className={`p-3 rounded-lg border ${
            isPartialPayment ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'
          }`}>
            <p className="text-xs text-gray-700 mb-1">
              {isPartialPayment ? 'Partial Payment' : 'Full EMI'}
            </p>
            <p className="font-bold text-lg">
              {isPartialPayment 
                ? `₹${partialAmount.toLocaleString()} / ₹${currentFullEmiAmount.toLocaleString()}`
                : `₹${currentFullEmiAmount.toLocaleString()}`}
            </p>
            {isPartialPayment && (
              <p className="text-sm text-yellow-700 mt-1">
                Remaining: ₹{remainingAmount.toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-purple-100">
          <p className="text-sm text-purple-800">
            {isLastInstallment 
              ? `✅ This is the LAST installment. Full EMI amount is ₹${customAmount.toLocaleString()} (custom amount)`
              : `✅ This is a regular installment. Full EMI amount is ₹${regularAmount.toLocaleString()}`}
          </p>
          {isPartialPayment && (
            <p className="text-sm text-yellow-800 mt-1">
              ⚠️ Partial payment: Next EMI date will remain as {emiUpdate.paymentDate} until full payment is made.
            </p>
          )}
        </div>
      </div>
    );
  };

  // ✅ FIXED: Helper to display advance payment breakdown
  const renderAdvanceBreakdown = () => {
    if (advanceBreakdown.length === 0 || emiUpdate.paymentType !== 'advance') {
      return null;
    }

    return (
      <div className="mt-6 bg-purple-50 border-2 border-purple-200 rounded-xl p-5">
        <h4 className="font-medium text-purple-900 text-lg mb-3">Advance Payment Breakdown</h4>
        <div className="space-y-3">
          {advanceBreakdown.map((item, index) => (
            <div key={index} className={`flex justify-between items-center p-3 rounded-lg ${
              item.isCustom ? 'bg-yellow-50 border border-yellow-200' : 'bg-white border border-purple-100'
            }`}>
              <div className="flex items-center">
                <div className={`w-8 h-8 flex items-center justify-center rounded-full mr-3 ${
                  item.isCustom ? 'bg-yellow-100 text-yellow-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {item.installment}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    Installment {item.installment}
                    {item.isCustom && <span className="ml-2 text-yellow-700 text-sm">(LAST - Custom)</span>}
                  </p>
                  <p className="text-xs text-gray-600">
                    {item.isCustom ? 'Custom Amount' : 'Regular Amount'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">₹{item.amount.toLocaleString()}</p>
                <p className="text-xs text-gray-500">
                  {index + 1} of {advanceBreakdown.length}
                </p>
              </div>
            </div>
          ))}
          
          <div className="mt-4 pt-4 border-t border-purple-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Total Advance Amount</p>
                <p className="font-bold text-green-900 text-2xl">₹{totalAdvanceAmount.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {advanceBreakdown.length} installments
                </p>
                <p className="text-xs text-gray-500">
                  Includes {advanceBreakdown.filter(i => i.isCustom).length} custom installment(s)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-auto max-h-[85vh] flex flex-col">
          {/* Header - Fixed height */}
          <div className="flex-shrink-0 bg-white px-8 py-6 border-b border-gray-200 rounded-t-lg">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">
                {selectedLoan ? 'Pay EMI for Specific Loan' : 'Update EMI Payment'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
              >
                <span className="text-2xl">×</span>
              </button>
            </div>
          </div>

          {/* Body - Scrollable content */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {/* Search Customer */}
            {!selectedCustomer && (
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Search Customer *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full px-4 py-3 pl-12 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search by customer name or customer number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400">🔍</span>
                  </div>
                </div>
                
                {/* Search Results */}
                {searchQuery && (
                  <div className="mt-3 bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                    {filteredCustomers
                      .slice(0, 10)
                      .map(customer => {
                        const customerId = getCustomerId(customer);
                        return (
                          <div
                            key={customerId}
                            className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                            onClick={() => handleCustomerSearch(customer)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium text-gray-900">{customer.name}</p>
                                <p className="text-sm text-gray-600 mt-1">{customer.customerNumber}</p>
                              </div>
                              <div className="text-sm text-gray-500">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${
                                  customer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {customer.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    }
                    {filteredCustomers.length === 0 && (
                      <div className="p-6 text-center text-gray-500">
                        No customers found
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selected Customer Info */}
            {selectedCustomer && (
              <div className="mb-8">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-blue-900 text-lg">Selected Customer</h4>
                      <p className="text-blue-800 font-semibold mt-1">{selectedCustomer.name}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-sm text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                          {selectedCustomer.customerNumber}
                        </span>
                        <span className={`text-sm px-3 py-1 rounded-full ${
                          selectedCustomer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedCustomer.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Loan Info */}
            {selectedLoan && (
              <div className="mb-8">
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-green-900 text-lg">Selected Loan</h4>
                      <p className="text-green-800 font-semibold text-xl mt-1 mb-4">{selectedLoan.loanNumber}</p>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-green-100">
                          <p className="text-xs text-green-700 mb-1">Full EMI Amount</p>
                          <p className="font-semibold text-green-900 text-lg">
                            ₹{selectedLoan.emiAmount || 0}
                            {selectedLoan.emiType === 'custom' && selectedLoan.loanType !== 'Daily' && (
                              <span className="text-xs text-purple-600 ml-2">(Regular)</span>
                            )}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-green-100">
                          <p className="text-xs text-green-700 mb-1">Loan Amount</p>
                          <p className="font-semibold text-green-900 text-lg">₹{selectedLoan.amount?.toLocaleString() || 0}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-green-100">
                          <p className="text-xs text-green-700 mb-1">Loan Type</p>
                          <p className="font-semibold text-green-900 text-lg">{selectedLoan.loanType}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-green-100">
                          <p className="text-xs text-green-700 mb-1">Next EMI Date</p>
                          <p className="font-semibold text-green-900 text-lg">
                            {selectedLoan.nextEmiDate ? formatDateToDDMMYYYY(selectedLoan.nextEmiDate) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      {/* ✅ Show EMI Type Badge */}
                      <div className="mt-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                          selectedLoan.emiType === 'custom' 
                            ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                          {selectedLoan.emiType === 'custom' ? 'Custom EMI' : 'Fixed EMI'}
                          {selectedLoan.emiType === 'custom' && selectedLoan.customEmiAmount && (
                            <span className="ml-2">(Last: ₹{selectedLoan.customEmiAmount})</span>
                          )}
                        </span>
                        <span className="ml-3 text-sm text-gray-600">
                          Paid: {selectedLoan.emiPaidCount || 0} of {selectedLoan.totalEmiCount || 0}
                        </span>
                      </div>
                      
                      {/* ✅ Show Current Installment Info */}
                      <div className="mt-4 p-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-700 mb-1">Current Installment</p>
                            <p className="font-bold text-gray-900 text-lg">
                              #{calculateCurrentInstallmentNumber(selectedLoan)} of {selectedLoan.totalEmiCount}
                              {calculateCurrentInstallmentNumber(selectedLoan) === selectedLoan.totalEmiCount && (
                                <span className="ml-2 text-yellow-700">(LAST Installment)</span>
                              )}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-700 mb-1">Full EMI Due</p>
                            <p className="font-bold text-green-900 text-lg">
                              ₹{getCorrectEmiAmountForInstallment(selectedLoan, calculateCurrentInstallmentNumber(selectedLoan)).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* ✅ Show Custom EMI Breakdown */}
                      {selectedLoan.emiType === 'custom' && selectedLoan.loanType !== 'Daily' && renderEMIBreakdown()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Form */}
            {selectedCustomer && selectedLoan && (
              <div className="space-y-8">
                {/* Payment Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Type *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      emiUpdate.paymentType === 'single' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setEmiUpdate(prev => ({ 
                        ...prev, 
                        paymentType: 'single',
                        status: 'Paid' // Reset to Paid for single payment
                      }));
                    }}>
                      <div className="flex items-center">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                          emiUpdate.paymentType === 'single' 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-gray-300'
                        }`}>
                          {emiUpdate.paymentType === 'single' && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Single EMI</p>
                          <p className="text-sm text-gray-600 mt-1">Pay for a single day's EMI</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      emiUpdate.paymentType === 'advance' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setEmiUpdate(prev => ({ 
                        ...prev, 
                        paymentType: 'advance',
                        status: 'Advance' // Set to Advance for advance payment
                      }));
                    }}>
                      <div className="flex items-center">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                          emiUpdate.paymentType === 'advance' 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-gray-300'
                        }`}>
                          {emiUpdate.paymentType === 'advance' && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Advance EMI Payment</p>
                          <p className="text-sm text-gray-600 mt-1">Pay for multiple EMIs in advance</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Single EMI Payment Details */}
                {emiUpdate.paymentType === 'single' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Payment Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Payment Date *
                      </label>
                      <input
                        type="date"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={emiUpdate.paymentDate}
                        onChange={(e) => setEmiUpdate(prev => ({ ...prev, paymentDate: e.target.value }))}
                      />
                    </div>

                    {/* Payment Amount - Auto-filled with CORRECT loan EMI amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Payment Amount *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <span className="text-gray-500 text-lg">₹</span>
                        </div>
                        <input
                          type="number"
                          className={`w-full pl-12 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            emiUpdate.status === 'Paid' ? 'bg-gray-50' : 'bg-white'
                          }`}
                          value={emiUpdate.amount}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setEmiUpdate(prev => ({ ...prev, amount: newValue }));
                            
                            // ✅ NEW: Validate partial amount doesn't exceed full EMI
                            if (emiUpdate.status === 'Partial' && newValue) {
                              const currentInstallment = calculateCurrentInstallmentNumber(selectedLoan);
                              const fullEmiAmount = getCorrectEmiAmountForInstallment(selectedLoan, currentInstallment);
                              const partialAmount = parseFloat(newValue);
                              
                              if (partialAmount >= fullEmiAmount) {
                                alert(`Partial payment cannot be equal to or greater than full EMI amount (₹${fullEmiAmount})`);
                                setEmiUpdate(prev => ({ 
                                  ...prev, 
                                  amount: fullEmiAmount.toString(),
                                  status: 'Paid' // Auto-change to Paid
                                }));
                              }
                            }
                          }}
                          placeholder="Enter amount"
                          min="0"
                        />
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          {selectedLoan.emiType === 'custom' && selectedLoan.loanType !== 'Daily' 
                            ? `Installment ${calculateCurrentInstallmentNumber(selectedLoan)} of ${selectedLoan.totalEmiCount}: Full EMI is ₹${getCorrectEmiAmountForInstallment(selectedLoan, calculateCurrentInstallmentNumber(selectedLoan)).toLocaleString()}`
                            : `Full EMI Amount: ₹${selectedLoan.emiAmount || 0}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {emiUpdate.status === 'Paid' 
                            ? '✅ Full payment - Next EMI date will advance'
                            : '⚠️ Partial payment - Next EMI date will NOT advance'}
                        </p>
                      </div>
                    </div>

                    {/* Payment Status - Only Paid and Partial for Single EMI */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Payment Status *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Paid', 'Partial'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => {
                              // ✅ FIXED: When changing status, get correct amount for current installment
                              const currentInstallment = calculateCurrentInstallmentNumber(selectedLoan);
                              const correctAmount = getCorrectEmiAmountForInstallment(selectedLoan, currentInstallment);
                              
                              setEmiUpdate(prev => ({ 
                                ...prev, 
                                status: status as 'Paid' | 'Partial',
                                // Auto-fill correct full amount for Paid, keep current for Partial
                                amount: status === 'Paid' ? correctAmount.toString() : prev.amount
                              }));
                            }}
                            className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                              emiUpdate.status === status
                                ? status === 'Paid' 
                                  ? 'border-green-500 bg-green-50 text-green-700'
                                  : 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                : 'border-gray-200 text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              {status}
                              {status === 'Partial' && (
                                <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                                  ⚠️ Date won't advance
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Partial payments keep the next EMI date unchanged until full payment is made.
                      </p>
                    </div>

                    {/* Collected By - Auto-filled */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Collected By *
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                        value={emiUpdate.collectedBy || currentOperator.fullName}
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Automatically set to logged-in operator
                      </p>
                    </div>
                  </div>
                )}

                {/* Advance EMI Payment Details */}
                {emiUpdate.paymentType === 'advance' && (
                  <div className="space-y-8">
                    {/* Simple Date Range Selection */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                      <h4 className="font-medium text-blue-900 text-lg mb-4">Advance Payment Date Range</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            From Date *
                          </label>
                          <input
                            type="date"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={advanceFromDate}
                            onChange={(e) => setAdvanceFromDate(e.target.value)}
                            min={selectedLoan.emiStartDate || selectedLoan.dateApplied.split('T')[0]}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            To Date *
                          </label>
                          <input
                            type="date"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={advanceToDate}
                            onChange={(e) => setAdvanceToDate(e.target.value)}
                            min={advanceFromDate}
                          />
                        </div>
                      </div>
                      
                      {/* Calculation Results */}
                      {(advanceFromDate && advanceToDate) && (
                        <div className="mt-6 bg-white p-5 rounded-lg border border-blue-100">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">Loan Type</p>
                              <p className="font-semibold text-gray-900 text-lg">{selectedLoan.loanType}</p>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">Number of EMIs</p>
                              <p className="font-semibold text-blue-900 text-xl">
                                {numberOfEmis > 0 ? numberOfEmis : 'Calculating...'}
                              </p>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">Full EMI Amount</p>
                              <p className="font-semibold text-green-900 text-xl">
                                {selectedLoan.emiType === 'custom' && selectedLoan.loanType !== 'Daily'
                                  ? `₹${selectedLoan.emiAmount || 0} (Regular)`
                                  : `₹${selectedLoan.emiAmount || 0}`}
                              </p>
                            </div>
                          </div>
                          
                          {numberOfEmis > 0 && (
                            <>
                              <div className="mt-4 pt-4 border-t border-blue-100">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="text-sm text-gray-600">Total Advance Amount</p>
                                    <p className="font-bold text-green-900 text-2xl">₹{totalAdvanceAmount.toLocaleString()}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-gray-600">
                                      {advanceBreakdown.length > 0 
                                        ? `${advanceBreakdown.length} installments (Custom EMI)`
                                        : `${numberOfEmis} × ₹${selectedLoan.emiAmount || 0}`}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Period: {formatDateToDDMMYYYY(advanceFromDate)} to {formatDateToDDMMYYYY(advanceToDate)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* ✅ Show warning if calculation might be different */}
                              {selectedLoan.emiType === 'custom' && selectedLoan.loanType !== 'Daily' && (
                                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <p className="text-sm text-yellow-800">
                                    ⚠️ Custom EMI detected: Last installment has different amount (₹{selectedLoan.customEmiAmount || selectedLoan.emiAmount || 0})
                                  </p>
                                  <p className="text-xs text-yellow-700 mt-1">
                                    Total calculated based on actual installment amounts in selected period.
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                          
                          {numberOfEmis === 0 && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <p className="text-sm text-yellow-800">
                                ⚠️ Please select valid dates to calculate advance payment
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* ✅ Show Advance Payment Breakdown for Custom EMI */}
                      {renderAdvanceBreakdown()}
                    </div>

                    {/* Collected By - Auto-filled */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Collected By *
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                        value={emiUpdate.collectedBy || currentOperator.fullName}
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Automatically set to logged-in operator
                      </p>
                    </div>

                    {/* Remarks for Advance Payment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Remarks (Optional)
                      </label>
                      <textarea
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Add any remarks for this advance payment..."
                        onChange={(e) => setEmiUpdate(prev => ({ ...prev, remarks: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No Loans Message */}
            {selectedCustomer && customerLoans.length === 0 && !loadingCustomer && (
              <div className="text-center py-10 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                <div className="text-yellow-500 text-5xl mb-6">💰</div>
                <p className="text-yellow-800 font-medium text-lg">No active loans found</p>
                <p className="text-yellow-600 text-sm mt-2">
                  This customer doesn't have any active loans for EMI payment
                </p>
              </div>
            )}

            {/* Loading State */}
            {loadingCustomer && (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4 font-medium">Loading loan details...</p>
              </div>
            )}
          </div>

          {/* Footer - Fixed height */}
          <div className="flex-shrink-0 bg-gray-50 px-8 py-6 border-t border-gray-200 rounded-b-lg">
            <div className="flex justify-end space-x-4">
              <button
                onClick={onClose}
                className="px-8 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !selectedLoan || 
                  (emiUpdate.paymentType === 'single' && !emiUpdate.amount) ||
                  (emiUpdate.paymentType === 'advance' && (!advanceFromDate || !advanceToDate || numberOfEmis <= 0))}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
              >
                {isLoading 
                  ? 'Processing...' 
                  : emiUpdate.paymentType === 'advance' 
                    ? `Record ${numberOfEmis} Advance Payments (₹${totalAdvanceAmount})`
                    : emiUpdate.status === 'Partial'
                      ? `Record Partial Payment (₹${emiUpdate.amount})`
                      : `Record Full Payment (₹${emiUpdate.amount})`}
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-4">
              {emiUpdate.paymentType === 'advance' 
                ? `Advance payment will create ${numberOfEmis} individual payment records for installments ${emiUpdate.installmentNumber || calculateCurrentInstallmentNumber(selectedLoan!)} to ${(emiUpdate.installmentNumber || calculateCurrentInstallmentNumber(selectedLoan!)) + numberOfEmis - 1}.`
                : emiUpdate.status === 'Partial'
                  ? `Partial payments for installment ${emiUpdate.installmentNumber || calculateCurrentInstallmentNumber(selectedLoan!)} will keep the next EMI date unchanged until full payment is made.`
                  : `EMI payment for installment ${emiUpdate.installmentNumber || calculateCurrentInstallmentNumber(selectedLoan!)} will be recorded immediately.`}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}