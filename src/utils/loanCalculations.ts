import { Customer, CustomerDetails, Loan, EMIHistory } from '@/src/types/dataEntry';
import { calculateNextEmiDateProperly, calculateLastEmiDate } from './dateCalculations';

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
    
    const paymentDate = new Date(payment.paymentDate);
    // Convert loan.lastEmiDate string to Date object
    const lastEmiDate = new Date(loan.lastEmiDate);
    const dueDate = new Date(calculateNextEmiDateProperly(lastEmiDate, loan.loanType));
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

export const calculateTotalLoanAmount = (loan: Loan): number => {
  return loan.emiAmount * loan.totalEmiCount;
};

export const getAllCustomerLoans = (customer: Customer, customerDetails: CustomerDetails | null): Loan[] => {
  const loans: Loan[] = [];

  // Use loans from customerDetails if available
  if (customerDetails?.loans && Array.isArray(customerDetails.loans)) {
    customerDetails.loans.forEach((loan: any, index: number) => {
      // Only include loans that have valid database IDs
      if (loan._id && loan._id.length === 24 && /^[0-9a-fA-F]{24}$/.test(loan._id.replace(/_default$/, ''))) {
        const cleanLoanId = loan._id.replace(/_default$/, '');
        
        // Check if EMIs have been paid using ALL indicators
        const hasPaidEMIs = (loan.emiPaidCount > 0) || 
                           (loan.totalPaidAmount > 0) ||
                           (loan.emiHistory && loan.emiHistory.length > 0);
        
        let nextEmiDate;
        
        if (hasPaidEMIs) {
          // EMIs HAVE been paid - calculate from lastEmiDate + 1 period
          const actualLastEmiDate = calculateLastEmiDate(loan);
          if (actualLastEmiDate) {
            const lastPaymentDate = new Date(actualLastEmiDate);
            nextEmiDate = calculateNextEmiDateProperly(lastPaymentDate, loan.loanType);
          } else {
            // Fallback: Use emiStartDate and add one period
            const startDate = new Date(loan.emiStartDate || loan.dateApplied);
            nextEmiDate = calculateNextEmiDateProperly(startDate, loan.loanType);
          }
        } else {
          // NO EMIs paid - use EMI start date as next EMI date
          nextEmiDate = loan.emiStartDate || loan.dateApplied;
        }
        
        // Determine loan status - mark renewed loans as inactive
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
          lastEmiDate: loan.lastEmiDate || loan.dateApplied,
          nextEmiDate: nextEmiDate,
          totalPaidAmount: loan.totalPaidAmount || 0,
          remainingAmount: loan.remainingAmount || loan.amount,
          emiHistory: loan.emiHistory || [],
          status: loanStatus,
          emiStartDate: loan.emiStartDate || loan.dateApplied,
          // Add renewal tracking properties
          isRenewed: loan.isRenewed || false,
          renewedLoanNumber: loan.renewedLoanNumber || '',
          renewedDate: loan.renewedDate || '',
          originalLoanNumber: loan.originalLoanNumber || ''
        };
        
        loans.push(enhancedLoan);
      }
    });
  }
  
  // Fallback loan creation - if no loans found in customerDetails, create from customer data
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
  
  // Sort loans by loan number (L1, L2, L3, etc.) in ascending order
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

// Business rule validation for loan types
export const validateLoanBusinessRules = (loanType: string, emiType: string, customEmiAmount?: string): { isValid: boolean; error?: string } => {
  // Daily loans only support fixed EMI
  if (loanType === 'Daily' && emiType !== 'fixed') {
    return { isValid: false, error: 'Daily loans only support fixed EMI type' };
  }
  
  // Custom EMI requires customEmiAmount for Weekly/Monthly loans
  if (emiType === 'custom' && loanType !== 'Daily' && (!customEmiAmount || parseFloat(customEmiAmount) <= 0)) {
    return { isValid: false, error: 'Custom EMI amount is required for custom EMI type with Weekly/Monthly loans' };
  }
  
  return { isValid: true };
};