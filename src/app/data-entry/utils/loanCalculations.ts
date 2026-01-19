import { Customer, CustomerDetails, Loan, EMIHistory } from '@/src/app/data-entry/types/dataEntry';

// ✅ FIXED: Calculate next scheduled EMI date based on last scheduled EMI date
export const calculateNextScheduledEmiDate = (
  lastScheduledEmiDate: string,
  loanType: string,
  emiStartDate: string
): string => {
  if (!lastScheduledEmiDate) return emiStartDate;
  
  const date = new Date(lastScheduledEmiDate);
  date.setHours(0, 0, 0, 0);
  
  switch(loanType) {
    case 'Daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'Weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'Monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      date.setDate(date.getDate() + 1);
  }
  
  return date.toISOString().split('T')[0];
};

// ✅ FIXED: Calculate last scheduled EMI date based on EMI start and FULL payments count
export const calculateLastScheduledEmiDate = (
  emiStartDate: string,
  loanType: string,
  fullEmisPaid: number // Changed from emiPaidCount to fullEmisPaid for clarity
): string => {
  if (!emiStartDate || fullEmisPaid <= 0) return emiStartDate;
  
  const startDate = new Date(emiStartDate);
  startDate.setHours(0, 0, 0, 0);
  
  const lastScheduledDate = new Date(startDate);
  
  switch(loanType) {
    case 'Daily':
      lastScheduledDate.setDate(startDate.getDate() + (fullEmisPaid - 1));
      break;
    case 'Weekly':
      lastScheduledDate.setDate(startDate.getDate() + ((fullEmisPaid - 1) * 7));
      break;
    case 'Monthly':
      lastScheduledDate.setMonth(startDate.getMonth() + (fullEmisPaid - 1));
      break;
    default:
      lastScheduledDate.setDate(startDate.getDate() + (fullEmisPaid - 1));
  }
  
  return lastScheduledDate.toISOString().split('T')[0];
};

export const calculateEMICompletion = (loan: Loan): {
  completionPercentage: number;
  isCompleted: boolean;
  remainingEmis: number;
  totalPaid: number;
  remainingAmount: number;
  totalLoanAmount: number;
} => {
  const totalEmiCount = loan.totalEmiCount || loan.loanDays || 30;
  const emiPaidCount = loan.emiPaidCount || 0; // This should only count FULL payments
  const totalPaidAmount = loan.totalPaidAmount || 0; // This includes ALL payments (full + partial)
  
  // ✅ FIXED: Calculate total loan amount correctly with null check
  let totalLoanAmount = 0;
  if (loan.emiType === 'custom' && loan.loanType !== 'Daily') {
    const regularPeriods = totalEmiCount - 1;
    const lastPeriod = 1;
    const customEmiAmount = loan.customEmiAmount || 0; // Handle undefined case
    totalLoanAmount = (loan.emiAmount * regularPeriods) + (customEmiAmount * lastPeriod);
  } else {
    totalLoanAmount = loan.emiAmount * totalEmiCount;
  }
  
  // ✅ FIXED: Use emiPaidCount (FULL payments) for completion percentage
  const completionPercentage = totalEmiCount > 0 ? (emiPaidCount / totalEmiCount) * 100 : 0;
  const isCompleted = emiPaidCount >= totalEmiCount;
  const remainingEmis = Math.max(totalEmiCount - emiPaidCount, 0);
  const remainingAmount = Math.max(totalLoanAmount - totalPaidAmount, 0);
  
  return {
    completionPercentage: Math.min(completionPercentage, 100),
    isCompleted,
    remainingEmis,
    totalPaid: totalPaidAmount,
    remainingAmount,
    totalLoanAmount
  };
};

export const calculatePaymentBehavior = (loan: Loan): {
  punctualityScore: number;
  behaviorRating: string;
  totalPayments: number;
  onTimePayments: number;
  latePayments: number;
} => {
  const totalPayments = loan.emiHistory?.length || 0;
  
  if (totalPayments === 0) {
    return {
      punctualityScore: 100,
      behaviorRating: 'EXCELLENT',
      totalPayments: 0,
      onTimePayments: 0,
      latePayments: 0
    };
  }

  const onTimePayments = loan.emiHistory?.filter(payment => {
    if (!payment.paymentDate) return false;
    
    // Calculate the scheduled due date for this payment
    const paymentDate = new Date(payment.paymentDate);
    const dueDate = calculateDueDateForPayment(loan, payment);
    return paymentDate <= dueDate;
  }).length || 0;
  
  const punctualityScore = totalPayments > 0 ? (onTimePayments / totalPayments) * 100 : 100;
  
  let behaviorRating: string;
  if (punctualityScore >= 90) behaviorRating = 'EXCELLENT';
  else if (punctualityScore >= 75) behaviorRating = 'GOOD';
  else if (punctualityScore >= 60) behaviorRating = 'AVERAGE';
  else behaviorRating = 'RISKY';
  
  return {
    punctualityScore,
    behaviorRating,
    totalPayments,
    onTimePayments,
    latePayments: totalPayments - onTimePayments
  };
};

// Calculate due date for a specific payment based on EMI schedule
const calculateDueDateForPayment = (loan: Loan, payment: EMIHistory): Date => {
  if (!loan.emiStartDate) return new Date(payment.paymentDate);
  
  const startDate = new Date(loan.emiStartDate);
  startDate.setHours(0, 0, 0, 0);
  
  // Find which EMI number this payment is for
  const paymentDate = new Date(payment.paymentDate);
  const paymentDay = Math.floor((paymentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const dueDate = new Date(startDate);
  
  // Create a mutable copy since setDate/setMonth mutates the date
  const mutableDueDate = new Date(dueDate);
  
  switch(loan.loanType) {
    case 'Daily':
      mutableDueDate.setDate(startDate.getDate() + Math.floor(paymentDay));
      break;
    case 'Weekly':
      const weekNumber = Math.floor(paymentDay / 7);
      mutableDueDate.setDate(startDate.getDate() + (weekNumber * 7));
      break;
    case 'Monthly':
      const monthNumber = Math.floor(paymentDay / 30);
      mutableDueDate.setMonth(startDate.getMonth() + monthNumber);
      break;
    default:
      mutableDueDate.setDate(startDate.getDate() + Math.floor(paymentDay));
  }
  
  return mutableDueDate;
};

export const calculateTotalLoanAmount = (loan: Loan): number => {
  if (loan.emiType === 'custom' && loan.loanType !== 'Daily') {
    const regularPeriods = (loan.totalEmiCount || loan.loanDays || 30) - 1;
    const lastPeriod = 1;
    const customEmiAmount = loan.customEmiAmount || 0; // Handle undefined case
    return (loan.emiAmount * regularPeriods) + (customEmiAmount * lastPeriod);
  }
  return loan.emiAmount * (loan.totalEmiCount || loan.loanDays || 30);
};

// ✅ FIXED: getAllCustomerLoans function with improved logic and TypeScript fixes
export const getAllCustomerLoans = (customer: Customer, customerDetails: CustomerDetails | null): Loan[] => {
  const loans: Loan[] = [];

  if (customerDetails?.loans && Array.isArray(customerDetails.loans)) {
    customerDetails.loans.forEach((loan: Loan, index: number) => {
      if (loan._id && loan._id.length === 24 && /^[0-9a-fA-F]{24}$/.test(loan._id.replace(/_default$/, ''))) {
        const cleanLoanId = loan._id.replace(/_default$/, '');
        
        // ✅ FIXED: Check for FULL payments only (emiPaidCount)
        const hasFullPayments = (loan.emiPaidCount || 0) > 0;
        const hasAnyPayments = hasFullPayments || 
                               (loan.totalPaidAmount || 0) > 0 ||
                               (loan.emiHistory && loan.emiHistory.length > 0);
        
        let nextEmiDate: string;
        
        if (hasFullPayments) {
          // ✅ FIXED: Calculate next EMI date based on FULL payments count only
          const lastScheduledEmiDate = calculateLastScheduledEmiDate(
            loan.emiStartDate || loan.dateApplied,
            loan.loanType,
            loan.emiPaidCount || 0
          );
          
          nextEmiDate = calculateNextScheduledEmiDate(
            lastScheduledEmiDate,
            loan.loanType,
            loan.emiStartDate || loan.dateApplied
          );
        } else {
          // NO FULL EMIs paid - use EMI start date as next EMI date
          nextEmiDate = loan.emiStartDate || loan.dateApplied;
        }
        
        // Use type assertion to handle string literal types
        const loanStatus = loan.status as string;
        let finalStatus = loanStatus || 'active';
        
        if (loan.isRenewed || loanStatus === 'renewed') {
          finalStatus = 'renewed';
        }
        
        // ✅ FIXED: Check if loan is actually completed (only based on FULL payments)
        const isCompleted =
  loan.isCompleted === true ||
  loanStatus === 'completed' ||
  (
    typeof loan.emiPaidCount === 'number' &&
    typeof loan.totalEmiCount === 'number' &&
    loan.emiPaidCount >= loan.totalEmiCount
  );
        
        if (isCompleted) {
          finalStatus = 'completed';
          // For completed loans, nextEmiDate should be empty string, not null
          nextEmiDate = '';
        }
        
        const enhancedLoan: Loan = {
          ...loan,
          _id: cleanLoanId,
          loanNumber: loan.loanNumber || `L${index + 1}`,
          totalEmiCount: loan.totalEmiCount || loan.loanDays || 30,
          emiPaidCount: loan.emiPaidCount || 0,
          // IMPORTANT: Store last scheduled EMI date based on FULL payments
          lastEmiDate: calculateLastScheduledEmiDate(
            loan.emiStartDate || loan.dateApplied,
            loan.loanType,
            loan.emiPaidCount || 0
          ) || loan.dateApplied,
          nextEmiDate: nextEmiDate,
          totalPaidAmount: loan.totalPaidAmount || 0,
          remainingAmount: loan.remainingAmount || loan.amount,
          emiHistory: loan.emiHistory || [],
          status: finalStatus as any, // Type assertion for string literal type
          emiStartDate: loan.emiStartDate || loan.dateApplied,
          isRenewed: loan.isRenewed || false,
          renewedLoanNumber: loan.renewedLoanNumber || '',
          renewedDate: loan.renewedDate || '',
          originalLoanNumber: loan.originalLoanNumber || '',
          // Add completion flag for easy checking (ensure it's boolean, not 0)
          isCompleted: !!isCompleted // Convert to boolean
        };
        
        loans.push(enhancedLoan);
      }
    });
  }
  
  if (loans.length === 0 && (customer.loanAmount || customer.emiAmount) && !customerDetails) {
    const cleanCustomerId = customer._id?.replace?.(/_default$/, '') || customer._id;
    
    const fallbackLoan: Loan = {
      _id: `fallback_${cleanCustomerId}`,
      customerId: cleanCustomerId || '',
      customerName: customer.name,
      customerNumber: customer.customerNumber || `CN${cleanCustomerId}`,
      loanNumber: 'L1',
      amount: customer.loanAmount || 0,
      emiAmount: customer.emiAmount || 0,
      loanType: customer.loanType || 'Daily',
      dateApplied: customer.createdAt || new Date().toISOString(),
      emiStartDate: customer.createdAt || new Date().toISOString(),
      loanDays: 30,
      totalEmiCount: 30,
      emiPaidCount: 0,
      lastEmiDate: customer.createdAt || new Date().toISOString(),
      nextEmiDate: customer.createdAt || new Date().toISOString(),
      totalPaidAmount: 0,
      remainingAmount: customer.loanAmount || 0,
      emiHistory: [],
      status: 'active',
      isFallback: true,
      isRenewed: false,
      renewedLoanNumber: '',
      renewedDate: '',
      originalLoanNumber: '',
      isCompleted: false
    } as Loan;
    loans.push(fallbackLoan);
  }
  
  const sortedLoans = loans.sort((a, b) => {
    const extractLoanNumber = (loanNumber: string): number => {
      if (!loanNumber) return 0;
      const match = loanNumber.match(/L(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };
    
    const aNumber = extractLoanNumber(a.loanNumber);
    const bNumber = extractLoanNumber(b.loanNumber);
    
    return aNumber - bNumber;
  });
  
  return sortedLoans;
};

export const getActiveLoans = (loans: Loan[]): Loan[] => {
  return loans.filter(loan => {
    const status = (loan.status || '').toLowerCase();

    const emiPaid = loan.emiPaidCount || 0;
    const totalEmi = loan.totalEmiCount || loan.loanDays || 0;

    const isCompleted =
      typeof emiPaid === 'number' &&
      typeof totalEmi === 'number' &&
      emiPaid >= totalEmi;

    const isRenewed = loan.isRenewed === true || status === 'renewed';

    const allowedStatus = ['active', 'pending'];

    return (
      allowedStatus.includes(status) &&
      !isCompleted &&
      !isRenewed
    );
  });
};



export const validateLoanBusinessRules = (loanType: string, emiType: string, customEmiAmount?: string): { isValid: boolean; error?: string } => {
  if (loanType === 'Daily' && emiType !== 'fixed') {
    return { isValid: false, error: 'Daily loans only support fixed EMI type' };
  }
  
  if (emiType === 'custom' && loanType !== 'Daily' && (!customEmiAmount || parseFloat(customEmiAmount) <= 0)) {
    return { isValid: false, error: 'Custom EMI amount is required for custom EMI type with Weekly/Monthly loans' };
  }
  
  return { isValid: true };
};

// Helper function to calculate days between two dates
export const calculateDaysLate = (dueDate: Date, paymentDate: Date): number => {
  // Remove time portion for accurate day calculation
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const payment = new Date(paymentDate);
  payment.setHours(0, 0, 0, 0);
  
  const dueDateFixed = due;
  const paymentDateFixed = payment;
  
  const diffTime = paymentDateFixed.getTime() - dueDateFixed.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // If payment is before due date, it's not late (negative or zero days)
  return Math.max(diffDays, 0);
};