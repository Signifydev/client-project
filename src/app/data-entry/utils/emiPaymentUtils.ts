import mongoose from 'mongoose';

// ==============================================
// TYPE DEFINITIONS
// ==============================================

interface Loan {
  emiStartDate?: string;
  loanType?: string;
  emiAmount?: number;
  customEmiAmount?: number;
  totalEmiCount?: number;
  loanDays?: number;
  emiType?: string;
  totalLoanAmount?: number;
  amount?: number;
  dateApplied?: string;
  emiPaidCount?: number;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
  cleanedId?: mongoose.Types.ObjectId;
  originalId?: string;
  cleanedIdString?: string;
}

// ==============================================
// DATE UTILITY FUNCTIONS
// ==============================================

/**
 * Get current date as YYYY-MM-DD string
 */
export function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate if string is in YYYY-MM-DD format
 */
export function isValidYYYYMMDD(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false;
  
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(dateString)) return false;
  
  const [year, month, day] = dateString.split('-').map(Number);
  
  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

/**
 * Parse YYYY-MM-DD string to Date object
 */
function parseDateString(dateString: string): Date {
  if (!isValidYYYYMMDD(dateString)) {
    console.error('Invalid date string:', dateString);
    return new Date();
  }
  
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format Date object to YYYY-MM-DD string
 */
export function formatToYYYYMMDD(dateInput: Date | string | null): string {
  if (!dateInput) return '';
  
  try {
    if (typeof dateInput === 'string' && isValidYYYYMMDD(dateInput)) {
      return dateInput;
    }
    
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
      const year = dateInput.getFullYear();
      const month = String(dateInput.getMonth() + 1).padStart(2, '0');
      const day = String(dateInput.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    if (typeof dateInput === 'string') {
      const date = new Date(dateInput);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    return '';
  } catch (error) {
    console.error('Error converting to YYYY-MM-DD:', error);
    return '';
  }
}

/**
 * Format date to DD/MM/YYYY for display
 */
export function formatToDDMMYYYY(dateString: string): string {
  if (!isValidYYYYMMDD(dateString)) return '';
  
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Add days to a date string
 */
export function addDays(dateString: string, days: number): string {
  const date = parseDateString(dateString);
  date.setDate(date.getDate() + days);
  return formatToYYYYMMDD(date);
}

/**
 * Add months to a date string
 */
export function addMonths(dateString: string, months: number): string {
  const date = parseDateString(dateString);
  date.setMonth(date.getMonth() + months);
  return formatToYYYYMMDD(date);
}

// ==============================================
// ID UTILITY FUNCTIONS
// ==============================================

/**
 * Clean ID by removing temp/fallback prefixes
 */
export function cleanId(id: string | null | undefined): string {
  if (!id) return '';
  return id.replace(/(_default|_temp|_new|fallback_)/, '');
}

/**
 * Validate and clean MongoDB ObjectId
 */
export function validateAndCleanObjectId(id: string, fieldName: string = 'ID'): ValidationResult {
  if (!id) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  const cleanedId = cleanId(id);
  
  if (!mongoose.Types.ObjectId.isValid(cleanedId)) {
    return { 
      isValid: false, 
      error: `Invalid ${fieldName} format: ${id} (cleaned to: ${cleanedId})` 
    };
  }

  return { 
    isValid: true, 
    cleanedId: new mongoose.Types.ObjectId(cleanedId),
    originalId: id,
    cleanedIdString: cleanedId
  };
}

// ==============================================
// INSTALLMENT CALCULATION FUNCTIONS
// ==============================================

/**
 * Calculate which installment number this payment is for
 */
export function calculateInstallmentNumber(
  emiStartDate: string | null | undefined, 
  loanType: string | null | undefined, 
  paymentDate: string | null | undefined
): number {
  if (!emiStartDate || !paymentDate || !loanType) return 1;
  
  const startDate = parseDateString(emiStartDate);
  const payDate = parseDateString(paymentDate);
  
  // Calculate days difference
  const timeDiff = payDate.getTime() - startDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  switch(loanType) {
    case 'Daily':
      return Math.max(1, daysDiff + 1);
    case 'Weekly':
      return Math.max(1, Math.floor(daysDiff / 7) + 1);
    case 'Monthly':
      const monthsDiff = (payDate.getFullYear() - startDate.getFullYear()) * 12 + 
                        (payDate.getMonth() - startDate.getMonth());
      return Math.max(1, monthsDiff + 1);
    default:
      return Math.max(1, daysDiff + 1);
  }
}

/**
 * Calculate expected due date for a specific installment
 */
export function calculateExpectedDueDate(
  emiStartDate: string | null | undefined, 
  loanType: string | null | undefined, 
  installmentNumber: number
): string {
  if (!emiStartDate || !installmentNumber || installmentNumber < 1 || !loanType) {
    return emiStartDate || getCurrentDateString();
  }
  
  const startDate = parseDateString(emiStartDate);
  const dueDate = new Date(startDate);
  
  switch(loanType) {
    case 'Daily':
      dueDate.setDate(startDate.getDate() + (installmentNumber - 1));
      break;
    case 'Weekly':
      dueDate.setDate(startDate.getDate() + ((installmentNumber - 1) * 7));
      break;
    case 'Monthly':
      dueDate.setMonth(startDate.getMonth() + (installmentNumber - 1));
      break;
    default:
      dueDate.setDate(startDate.getDate() + (installmentNumber - 1));
  }
  
  return formatToYYYYMMDD(dueDate);
}

/**
 * Generate partial chain ID with installment number
 */
export function generatePartialChainId(
  loanId: string | mongoose.Types.ObjectId, 
  expectedDueDate: string, 
  installmentNumber: number
): string {
  if (!loanId) {
    console.error('❌ CRITICAL: Cannot generate chain ID without loanId');
    throw new Error('Loan ID is required for chain ID generation');
  }
  
  const cleanLoanId = loanId.toString().replace(/[^a-zA-Z0-9]/g, '_').slice(-12);
  const cleanDate = expectedDueDate.replace(/-/g, '');
  return `partial_${cleanLoanId}_${cleanDate}_${installmentNumber}`;
}

// ==============================================
// LOAN SCHEDULE CALCULATION FUNCTIONS
// ==============================================

/**
 * Calculate last scheduled EMI date
 */
export function calculateLastScheduledEmiDate(
  emiStartDate: string | null | undefined, 
  loanType: string | null | undefined, 
  totalEmisPaid: number
): string {
  if (!emiStartDate || !loanType || totalEmisPaid <= 0) return emiStartDate || getCurrentDateString();
  
  if (!isValidYYYYMMDD(emiStartDate)) {
    console.error('Invalid emiStartDate:', emiStartDate);
    return emiStartDate || getCurrentDateString();
  }
  
  const startDate = parseDateString(emiStartDate);
  const lastScheduledDate = new Date(startDate);
  
  switch(loanType) {
    case 'Daily':
      lastScheduledDate.setDate(startDate.getDate() + (totalEmisPaid - 1));
      break;
    case 'Weekly':
      lastScheduledDate.setDate(startDate.getDate() + ((totalEmisPaid - 1) * 7));
      break;
    case 'Monthly':
      lastScheduledDate.setMonth(startDate.getMonth() + (totalEmisPaid - 1));
      break;
    default:
      lastScheduledDate.setDate(startDate.getDate() + (totalEmisPaid - 1));
  }
  
  return formatToYYYYMMDD(lastScheduledDate);
}

/**
 * Calculate next scheduled EMI date
 */
export function calculateNextScheduledEmiDate(
  lastScheduledEmiDate: string | null | undefined, 
  loanType: string | null | undefined, 
  emiStartDate: string | null | undefined, 
  emiPaidCount: number, 
  totalEmiCount: number
): string | null {
  if (emiPaidCount >= totalEmiCount) {
    return null;
  }
  
  if (!lastScheduledEmiDate || !loanType) return emiStartDate || getCurrentDateString();
  
  if (!isValidYYYYMMDD(lastScheduledEmiDate)) {
    console.error('Invalid lastScheduledEmiDate:', lastScheduledEmiDate);
    return emiStartDate || getCurrentDateString();
  }
  
  let nextDate: string;
  
  switch(loanType) {
    case 'Daily':
      nextDate = addDays(lastScheduledEmiDate, 1);
      break;
    case 'Weekly':
      nextDate = addDays(lastScheduledEmiDate, 7);
      break;
    case 'Monthly':
      const date = parseDateString(lastScheduledEmiDate);
      date.setMonth(date.getMonth() + 1);
      nextDate = formatToYYYYMMDD(date);
      break;
    default:
      nextDate = addDays(lastScheduledEmiDate, 1);
  }
  
  return nextDate;
}

// ==============================================
// PAYMENT CALCULATION FUNCTIONS
// ==============================================

/**
 * Calculate correct EMI amount for an installment (considering custom EMI)
 */
export function calculateCorrectEmiAmount(loan: Loan | null, installmentNumber: number): number {
  if (!loan) return 0;
  
  let emiAmount = loan.emiAmount || 0;
  
  // Check for custom EMI in last installment
  if (loan.emiType === 'custom' && loan.loanType !== 'Daily') {
    if (installmentNumber === loan.totalEmiCount) {
      emiAmount = loan.customEmiAmount || loan.emiAmount || 0;
    }
  }
  
  return emiAmount;
}

/**
 * Calculate days between two dates
 */
export function calculateDaysBetween(startDate: string, endDate: string): number {
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
}

// ==============================================
// VALIDATION FUNCTIONS
// ==============================================

/**
 * Validate payment date (must be today or in past)
 */
export function validatePaymentDate(paymentDate: string): boolean {
  const today = getCurrentDateString();
  return paymentDate <= today;
}

/**
 * Validate advance payment dates
 */
export function validateAdvanceDates(advanceFromDate: string, advanceToDate: string): ValidationResult {
  if (!advanceFromDate || !advanceToDate) {
    return { isValid: false, error: 'From date and to date are required' };
  }
  
  if (!isValidYYYYMMDD(advanceFromDate) || !isValidYYYYMMDD(advanceToDate)) {
    return { isValid: false, error: 'Invalid date format. Must be YYYY-MM-DD' };
  }
  
  if (advanceFromDate > advanceToDate) {
    return { isValid: false, error: 'From date cannot be after to date' };
  }
  
  const today = getCurrentDateString();
  if (advanceFromDate < today) {
    return { isValid: false, error: 'Advance payment cannot start from past date' };
  }
  
  return { isValid: true };
}

// ==============================================
// HELPER FUNCTIONS FOR API USE
// ==============================================

/**
 * Format amount for display with currency symbol
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get status color class for UI
 */
export function getStatusColorClass(status: string): string {
  switch (status) {
    case 'Paid':
      return 'bg-green-100 text-green-800';
    case 'Partial':
      return 'bg-yellow-100 text-yellow-800';
    case 'Advance':
      return 'bg-blue-100 text-blue-800';
    case 'Due':
      return 'bg-gray-100 text-gray-800';
    case 'Overdue':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Create a payment reference ID
 */
export function generatePaymentReference(customerId: string | mongoose.Types.ObjectId, paymentDate: string): string {
  const datePart = paymentDate.replace(/-/g, '');
  const customerPart = customerId.toString().slice(-6);
  return `PAY-${datePart}-${customerPart}-${Date.now().toString().slice(-4)}`;
}

/**
 * Calculate suggested remaining amount for a chain (guidance only)
 */
export function calculateSuggestedRemaining(originalEmiAmount: number, totalPaidSoFar: number): number {
  return Math.max(0, originalEmiAmount - totalPaidSoFar);
}

/**
 * Check if a payment should advance the loan schedule
 */
export function shouldAdvanceLoanSchedule(paymentStatus: string, previousStatus: string): boolean {
  // Only advance when payment becomes fully paid
  if (previousStatus === 'Partial' && paymentStatus === 'Paid') {
    return true;
  }
  
  // Don't advance if changing from Paid to Partial
  if (previousStatus === 'Paid' && paymentStatus === 'Partial') {
    return false;
  }
  
  // Default: advance for new paid payments
  return paymentStatus === 'Paid';
}

/**
 * Get next working day (skip weekends)
 */
export function getNextWorkingDay(dateString: string, daysToAdd: number = 1): string {
  const date = parseDateString(dateString);
  let daysAdded = 0;
  
  while (daysAdded < daysToAdd) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
    }
  }
  
  return formatToYYYYMMDD(date);
}

/**
 * Calculate total loan amount including interest
 */
export function calculateTotalLoanAmount(loan: Loan): number {
  if (loan.totalLoanAmount !== undefined && loan.totalLoanAmount !== null) {
    return loan.totalLoanAmount;
  }
  
  const totalEmiCount = loan.totalEmiCount || loan.loanDays || 0;
  
  if (loan.emiType === 'custom' && loan.loanType !== 'Daily') {
    const regularPeriods = totalEmiCount - 1;
    const lastPeriod = 1;
    const regularAmount = (loan.emiAmount || 0) * regularPeriods;
    const lastAmount = (loan.customEmiAmount || loan.emiAmount || 0) * lastPeriod;
    return regularAmount + lastAmount;
  }
  
  return (loan.emiAmount || 0) * totalEmiCount;
}

// ==============================================
// EXPORT ALL UTILITIES
// ==============================================

export default {
  // Date functions
  getCurrentDateString,
  isValidYYYYMMDD,
  formatToYYYYMMDD,
  formatToDDMMYYYY,
  addDays,
  addMonths,
  
  // ID functions
  cleanId,
  validateAndCleanObjectId,
  
  // Installment functions
  calculateInstallmentNumber,
  calculateExpectedDueDate,
  generatePartialChainId,
  
  // Loan schedule functions
  calculateLastScheduledEmiDate,
  calculateNextScheduledEmiDate,
  
  // Payment functions
  calculateCorrectEmiAmount,
  calculateDaysBetween,
  
  // Validation functions
  validatePaymentDate,
  validateAdvanceDates,
  
  // Helper functions
  formatCurrency,
  getStatusColorClass,
  generatePaymentReference,
  calculateSuggestedRemaining,
  shouldAdvanceLoanSchedule,
  getNextWorkingDay,
  calculateTotalLoanAmount
};