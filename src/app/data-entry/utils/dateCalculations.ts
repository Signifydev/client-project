// utils/dateCalculations.ts
// ENHANCED WITH IST TIMEZONE AND DD/MM/YYYY FORMATTING

// ============================================================================
// TIMEZONE CONSTANTS
// ============================================================================
const IST_OFFSET_MINUTES = 5 * 60 + 30; // 5 hours 30 minutes
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

// ============================================================================
// CORE TIMEZONE CONVERSION FUNCTIONS
// ============================================================================

/**
 * Parse a YYYY-MM-DD string as an IST date (local time in India)
 * This prevents "off by one day" errors when UTC conversion happens
 */
export const parseISTDateString = (dateString: string): Date => {
  if (!dateString) return new Date();
  
  // For YYYY-MM-DD format, parse as local IST date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date as if it's in IST timezone (local)
    const istDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    return istDate;
  }
  
  // For ISO strings or other formats, parse normally then adjust to IST
  const date = new Date(dateString);
  return new Date(date.getTime() + IST_OFFSET_MS);
};

/**
 * Convert an IST Date object to UTC for database storage
 * Removes the IST offset to store as UTC
 */
export const convertISTToUTC = (istDate: Date): Date => {
  return new Date(istDate.getTime() - IST_OFFSET_MS);
};

/**
 * Convert a UTC Date from database to IST for display
 * Adds the IST offset for correct local display
 */
export const convertUTCToIST = (utcDate: Date): Date => {
  return new Date(utcDate.getTime() + IST_OFFSET_MS);
};

/**
 * Get IST date components from a UTC date
 */
export const getISTDateFromUTC = (utcDate: Date): {
  year: number;
  month: number; // 1-12
  day: number;
} => {
  const istDate = convertUTCToIST(utcDate);
  return {
    year: istDate.getFullYear(),
    month: istDate.getMonth() + 1,
    day: istDate.getDate()
  };
};

// ============================================================================
// FORMATTING FUNCTIONS (DD/MM/YYYY STANDARD)
// ============================================================================

/**
 * Format any date to DD/MM/YYYY in IST timezone
 * Main display function for all UI components
 */
export const formatToDDMMYYYY = (dateInput: Date | string): string => {
  if (!dateInput) return '';
  
  let date: Date;
  
  if (typeof dateInput === 'string') {
    // Parse string as IST date
    date = parseISTDateString(dateInput);
  } else {
    // Assume Date object, convert to IST
    date = convertUTCToIST(dateInput);
  }
  
  if (isNaN(date.getTime())) return '';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Format date for HTML5 date input (YYYY-MM-DD) in IST timezone
 */
export const formatForDateInput = (dateInput: Date | string): string => {
  if (!dateInput) return '';
  
  let date: Date;
  
  if (typeof dateInput === 'string') {
    date = parseISTDateString(dateInput);
  } else {
    date = convertUTCToIST(dateInput);
  }
  
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Get today's date in IST timezone as YYYY-MM-DD
 */
export const getTodayISTDate = (): string => {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  
  const year = istNow.getFullYear();
  const month = (istNow.getMonth() + 1).toString().padStart(2, '0');
  const day = istNow.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// ============================================================================
// COMPATIBILITY FUNCTIONS (Updated with IST handling)
// ============================================================================

/**
 * Updated: Format date to DD/MM/YYYY with IST conversion
 * @deprecated - Use formatToDDMMYYYY instead
 */
export const formatDateToDDMMYYYY = (dateString: string): string => {
  return formatToDDMMYYYY(dateString);
};

/**
 * Updated: Format date for input with IST conversion
 * @deprecated - Use formatForDateInput instead
 */
export const formatDateForInput = (dateString: string): string => {
  return formatForDateInput(dateString);
};

// ============================================================================
// EMI CALCULATION FUNCTIONS (Updated to use IST dates)
// ============================================================================

/**
 * Calculate next scheduled EMI date (using IST dates)
 */
export const calculateNextScheduledEmiDate = (
  lastScheduledEmiDate: string,
  loanType: string,
  emiStartDate: string
): string => {
  if (!lastScheduledEmiDate) return emiStartDate;
  
  // Parse as IST date
  const date = parseISTDateString(lastScheduledEmiDate);
  
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
  
  // Return as YYYY-MM-DD in IST
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Calculate last scheduled EMI date (using IST dates)
 */
export const calculateLastScheduledEmiDate = (
  emiStartDate: string,
  loanType: string,
  emiPaidCount: number
): string => {
  if (!emiStartDate || emiPaidCount <= 0) return emiStartDate;
  
  const startDate = parseISTDateString(emiStartDate);
  const lastScheduledDate = new Date(startDate);
  
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
  
  // Return as YYYY-MM-DD in IST
  const year = lastScheduledDate.getFullYear();
  const month = (lastScheduledDate.getMonth() + 1).toString().padStart(2, '0');
  const day = lastScheduledDate.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Generate EMI schedule using IST dates - FIXED VERSION
 */
export const generateEmiSchedule = (
  emiStartDate: string,
  loanType: string,
  totalEmiCount: number,
  year: number,
  month: number
): Date[] => {
  const schedule: Date[] = [];
  if (!emiStartDate || !loanType || !totalEmiCount) return schedule;
  
  // Parse start date as IST
  const startDate = parseISTDateString(emiStartDate);
  
  // Create month boundaries in local time (not UTC)
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  
  // Reset times to beginning of day for comparison
  monthStart.setHours(0, 0, 0, 0);
  monthEnd.setHours(23, 59, 59, 999);
  
  // Start from the first installment
  let currentDate = new Date(startDate);
  
  // Generate all installments
  for (let i = 1; i <= totalEmiCount; i++) {
    if (i > 1) {
      // Calculate next installment date based on loan type
      switch(loanType) {
        case 'Daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'Weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'Monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        default:
          currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    // Create a clean date object for this installment
    const installmentDate = new Date(currentDate);
    
    // Check if this installment falls within the requested month
    if (installmentDate >= monthStart && installmentDate <= monthEnd) {
      schedule.push(new Date(installmentDate));
    }
    
    // If we've gone past the end of the month, we can stop
    if (installmentDate > monthEnd) {
      break;
    }
  }
  
  // Debug logging
  console.log('📅 generateEmiSchedule Debug:', {
    emiStartDate,
    loanType,
    totalEmiCount,
    year,
    month: month + 1,
    startDate: startDate.toISOString(),
    monthStart: monthStart.toISOString(),
    monthEnd: monthEnd.toISOString(),
    scheduleLength: schedule.length,
    scheduleDates: schedule.map(d => d.toISOString().split('T')[0])
  });
  
  return schedule;
};

// ============================================================================
// HELPER FUNCTIONS (Updated with IST)
// ============================================================================

export const getTodayIST = (): Date => {
  const now = new Date();
  return new Date(now.getTime() + IST_OFFSET_MS);
};

export const convertToIST = (date: Date): Date => {
  return new Date(date.getTime() + IST_OFFSET_MS);
};

export const getISTDateString = (date: Date): string => {
  const istDate = convertToIST(date);
  const year = istDate.getFullYear();
  const month = (istDate.getMonth() + 1).toString().padStart(2, '0');
  const day = istDate.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ============================================================================
// NEW: Date utility functions for EMI calendar
// ============================================================================

/**
 * Add days to a date string (YYYY-MM-DD format)
 */
export const addDaysToDateString = (dateString: string, days: number): string => {
  const date = parseISTDateString(dateString);
  date.setDate(date.getDate() + days);
  return getISTDateString(date);
};

/**
 * Add weeks to a date string (YYYY-MM-DD format)
 */
export const addWeeksToDateString = (dateString: string, weeks: number): string => {
  const date = parseISTDateString(dateString);
  date.setDate(date.getDate() + (weeks * 7));
  return getISTDateString(date);
};

/**
 * Add months to a date string (YYYY-MM-DD format)
 */
export const addMonthsToDateString = (dateString: string, months: number): string => {
  const date = parseISTDateString(dateString);
  date.setMonth(date.getMonth() + months);
  return getISTDateString(date);
};

/**
 * Generate complete EMI schedule for a loan
 */
export const generateCompleteEMISchedule = (
  emiStartDate: string,
  loanType: string,
  totalInstallments: number,
  standardAmount: number,
  customAmount?: number,
  customInstallmentNumber?: number
): Array<{ installmentNumber: number; dueDate: string; amount: number; isCustom: boolean; formattedDate: string }> => {
  const schedule = [];
  
  for (let i = 1; i <= totalInstallments; i++) {
    let dueDate: Date;
    
    if (loanType === 'Daily') {
      dueDate = parseISTDateString(addDaysToDateString(emiStartDate, i - 1));
    } else if (loanType === 'Weekly') {
      dueDate = parseISTDateString(addWeeksToDateString(emiStartDate, i - 1));
    } else if (loanType === 'Monthly') {
      dueDate = parseISTDateString(addMonthsToDateString(emiStartDate, i - 1));
    } else {
      dueDate = parseISTDateString(addDaysToDateString(emiStartDate, i - 1));
    }
    
    const dueDateStr = getISTDateString(dueDate);
    const formattedDate = formatToDDMMYYYY(dueDateStr);
    
    // Determine amount for this installment
    let amount = standardAmount;
    let isCustom = false;
    
    if (customAmount !== undefined && customInstallmentNumber !== undefined) {
      if (customInstallmentNumber === i) {
        amount = customAmount;
        isCustom = true;
      }
    } else if (customAmount !== undefined && i === totalInstallments) {
      // Default: last installment is custom
      amount = customAmount;
      isCustom = true;
    }
    
    schedule.push({
      installmentNumber: i,
      dueDate: dueDateStr,
      amount,
      isCustom,
      formattedDate
    });
  }
  
  return schedule;
};

// Keep existing functions with minor updates for consistency
export const calculateEmiCount = (fromDate: string, toDate: string, loanType?: string): string => {
  if (!fromDate || !toDate) return '1';
  
  const start = parseISTDateString(fromDate);
  const end = parseISTDateString(toDate);
  
  if (start > end) return '1';
  
  let emiCount = 1;
  
  switch(loanType) {
    case 'Daily':
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      emiCount = Math.max(diffDays, 1);
      break;
    case 'Weekly':
      const diffWeeks = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
      emiCount = Math.max(diffWeeks, 1);
      break;
    case 'Monthly':
      const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + 
                        (end.getMonth() - start.getMonth()) + 1;
      emiCount = Math.max(diffMonths, 1);
      break;
    default:
      const defaultDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      emiCount = Math.max(defaultDiff, 1);
  }
  
  return emiCount.toString();
};

export const calculateTotalAmount = (emiAmount: string | number, emiCount: string | number): string => {
  const amount = typeof emiAmount === 'string' ? parseFloat(emiAmount) || 0 : emiAmount;
  const count = typeof emiCount === 'string' ? parseInt(emiCount) || 1 : emiCount;
  
  const total = amount * count;
  return (Math.round(total * 100) / 100).toString();
};

// ============================================================================
// SAFE FORMATTING FUNCTION (For error-prone contexts)
// ============================================================================

/**
 * Safely format a date to DD/MM/YYYY, returns empty string on error
 * Useful for components where date might be malformed
 */
export const safeFormatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  try {
    return formatToDDMMYYYY(dateString);
  } catch (error) {
    console.warn('Failed to format date:', dateString, error);
    return '';
  }
};

// ============================================================================
// TEST UTILITIES (For development)
// ============================================================================

/**
 * Test function to verify date conversions
 */
export const testDateConversions = (): void => {
  const testDate = '2025-12-10';
  
  console.log('🧪 Testing date conversions for:', testDate);
  console.log('Input (YYYY-MM-DD):', testDate);
  
  const parsedIST = parseISTDateString(testDate);
  console.log('Parsed as IST:', parsedIST.toISOString());
  
  const formattedDDMMYYYY = formatToDDMMYYYY(testDate);
  console.log('Formatted DD/MM/YYYY:', formattedDDMMYYYY);
  
  const forInput = formatForDateInput(testDate);
  console.log('For date input:', forInput);
  
  const toUTC = convertISTToUTC(parsedIST);
  console.log('Converted to UTC:', toUTC.toISOString());
  
  const backToIST = convertUTCToIST(toUTC);
  console.log('Converted back to IST:', backToIST.toISOString());
  console.log('IST date components:', getISTDateFromUTC(toUTC));
  
  // Test weekly schedule generation
  console.log('🧪 Testing Weekly EMI Schedule:');
  const weeklySchedule = generateEmiSchedule('2025-01-01', 'Weekly', 4, 2025, 0); // Jan 2025
  console.log('Weekly Schedule:', weeklySchedule.map(d => d.toISOString().split('T')[0]));
};