import { Customer, CustomerDetails, Loan, EMIHistory } from '@/src/app/data-entry/types/dataEntry';

// NEW: Calculate next scheduled EMI date based on last scheduled EMI date
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

// NEW: Calculate last scheduled EMI date based on EMI start and count paid
export const calculateLastScheduledEmiDate = (
  emiStartDate: string,
  loanType: string,
  emiPaidCount: number
): string => {
  if (!emiStartDate || emiPaidCount <= 0) return emiStartDate;
  
  const startDate = new Date(emiStartDate);
  startDate.setHours(0, 0, 0, 0);
  
  let lastScheduledDate = new Date(startDate);
  
  switch(loanType) {
    case 'Daily':
      lastScheduledDate.setDate(startDate.getDate() + (emiPaidCount - 1));
      break;
    case 'Weekly':
      lastScheduledDate.setDate(startDate.getDate() + ((emiPaidCount - 1) * 7));
      break;
    case 'Monthly':
      lastScheduledDate.setMonth(startDate.getMonth() + (emiPaidCount - 1));
      break;
    default:
      lastScheduledDate.setDate(startDate.getDate() + (emiPaidCount - 1));
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
  const emiPaidCount = loan.emiPaidCount || 0;
  const totalPaidAmount = loan.totalPaidAmount || 0;
  
  const totalLoanAmount = loan.emiAmount * totalEmiCount;
  
  const completionPercentage = (emiPaidCount / totalEmiCount) * 100;
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

// NEW: Calculate due date for a specific payment based on EMI schedule
const calculateDueDateForPayment = (loan: Loan, payment: EMIHistory): Date => {
  if (!loan.emiStartDate) return new Date(payment.paymentDate);
  
  const startDate = new Date(loan.emiStartDate);
  startDate.setHours(0, 0, 0, 0);
  
  // Find which EMI number this payment is for
  const paymentDate = new Date(payment.paymentDate);
  const paymentDay = Math.floor((paymentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  let dueDate = new Date(startDate);
  
  switch(loan.loanType) {
    case 'Daily':
      dueDate.setDate(startDate.getDate() + Math.floor(paymentDay));
      break;
    case 'Weekly':
      const weekNumber = Math.floor(paymentDay / 7);
      dueDate.setDate(startDate.getDate() + (weekNumber * 7));
      break;
    case 'Monthly':
      const monthNumber = Math.floor(paymentDay / 30);
      dueDate.setMonth(startDate.getMonth() + monthNumber);
      break;
    default:
      dueDate.setDate(startDate.getDate() + Math.floor(paymentDay));
  }
  
  return dueDate;
};

export const calculateTotalLoanAmount = (loan: Loan): number => {
  return loan.emiAmount * loan.totalEmiCount;
};

export const getAllCustomerLoans = (customer: Customer, customerDetails: CustomerDetails | null): Loan[] => {
  const loans: Loan[] = [];

  if (customerDetails?.loans && Array.isArray(customerDetails.loans)) {
    customerDetails.loans.forEach((loan: any, index: number) => {
      if (loan._id && loan._id.length === 24 && /^[0-9a-fA-F]{24}$/.test(loan._id.replace(/_default$/, ''))) {
        const cleanLoanId = loan._id.replace(/_default$/, '');
        
        const hasPaidEMIs = (loan.emiPaidCount > 0) || 
                           (loan.totalPaidAmount > 0) ||
                           (loan.emiHistory && loan.emiHistory.length > 0);
        
        let nextEmiDate;
        
        if (hasPaidEMIs) {
          // CRITICAL FIX: Calculate next EMI date based on schedule, not payment date
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
          // NO EMIs paid - use EMI start date as next EMI date
          nextEmiDate = loan.emiStartDate || loan.dateApplied;
        }
        
        let loanStatus = loan.status || 'active';
        if (loan.isRenewed || loan.status === 'renewed') {
          loanStatus = 'renewed';
        }
        
        const enhancedLoan: Loan = {
          ...loan,
          _id: cleanLoanId,
          loanNumber: loan.loanNumber || `L${index + 1}`,
          totalEmiCount: loan.totalEmiCount || loan.loanDays || 30,
          emiPaidCount: loan.emiPaidCount || 0,
          // IMPORTANT: Store last scheduled EMI date, not last payment date
          lastEmiDate: calculateLastScheduledEmiDate(
            loan.emiStartDate || loan.dateApplied,
            loan.loanType,
            loan.emiPaidCount || 0
          ) || loan.dateApplied,
          nextEmiDate: nextEmiDate,
          totalPaidAmount: loan.totalPaidAmount || 0,
          remainingAmount: loan.remainingAmount || loan.amount,
          emiHistory: loan.emiHistory || [],
          status: loanStatus,
          emiStartDate: loan.emiStartDate || loan.dateApplied,
          isRenewed: loan.isRenewed || false,
          renewedLoanNumber: loan.renewedLoanNumber || '',
          renewedDate: loan.renewedDate || '',
          originalLoanNumber: loan.originalLoanNumber || ''
        };
        
        loans.push(enhancedLoan);
      }
    });
  }
  
  if (loans.length === 0 && (customer.loanAmount || customer.emiAmount) && !customerDetails) {
    const cleanCustomerId = customer._id?.replace?.(/_default$/, '') || customer._id;
    
    const fallbackLoan: Loan = {
      _id: `fallback_${cleanCustomerId}`,
      customerId: cleanCustomerId,
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
      status: customer.status || 'active',
      isFallback: true,
      isRenewed: false,
      renewedLoanNumber: '',
      renewedDate: '',
      originalLoanNumber: ''
    };
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
    const isRenewed = loan.isRenewed || loan.status === 'renewed';
    const isCompleted = loan.status === 'completed';
    return !isRenewed && !isCompleted && loan.status === 'active';
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