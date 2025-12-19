// utils/dateCalculations.ts

// Date formatting utilities
export const formatDateToDDMMYYYY = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

export const formatDateForInput = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Calculate next scheduled EMI date (based on schedule, not payment date)
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
      // For Daily loans, next scheduled EMI is always next calendar day
      date.setDate(date.getDate() + 1);
      break;
    case 'Weekly':
      // For Weekly loans, next scheduled EMI is exactly 7 days after last scheduled EMI
      // NOT 7 days after payment date
      date.setDate(date.getDate() + 7);
      break;
    case 'Monthly':
      // For Monthly loans, same day next month
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      date.setDate(date.getDate() + 1);
  }
  
  return date.toISOString().split('T')[0];
};

// Calculate last scheduled EMI date (based on schedule)
export const calculateLastScheduledEmiDate = (
  emiStartDate: string,
  loanType: string,
  emiPaidCount: number
): string => {
  if (!emiStartDate || emiPaidCount <= 0) return emiStartDate;
  
  const startDate = new Date(emiStartDate);
  startDate.setHours(0, 0, 0, 0);
  
  const lastScheduledDate = new Date(startDate); // FIXED: let → const
  
  switch(loanType) {
    case 'Daily':
      // For Daily loans, last scheduled EMI is startDate + (emiPaidCount - 1) days
      lastScheduledDate.setDate(startDate.getDate() + (emiPaidCount - 1));
      break;
    case 'Weekly':
      // For Weekly loans, last scheduled EMI is startDate + ((emiPaidCount - 1) * 7) days
      lastScheduledDate.setDate(startDate.getDate() + ((emiPaidCount - 1) * 7));
      break;
    case 'Monthly':
      // For Monthly loans, last scheduled EMI is startDate + (emiPaidCount - 1) months
      lastScheduledDate.setMonth(startDate.getMonth() + (emiPaidCount - 1));
      break;
    default:
      lastScheduledDate.setDate(startDate.getDate() + (emiPaidCount - 1));
  }
  
  return lastScheduledDate.toISOString().split('T')[0];
};

// OLD FUNCTION (Keep for backward compatibility - but use the new ones)
export const calculateNextEmiDate = (currentDate: string, loanType: string): string => {
  const date = new Date(currentDate);
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

export const calculateNextEmiDateProperly = (lastDate: Date, loanType: string): string => {
  const nextDate = new Date(lastDate);
  
  switch(loanType) {
    case 'Daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'Weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'Monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    default:
      nextDate.setDate(nextDate.getDate() + 1);
  }
  
  return nextDate.toISOString().split('T')[0];
};

// EMI Count and Amount calculations
export const calculateEmiCount = (fromDate: string, toDate: string, loanType?: string): string => {
  if (!fromDate || !toDate) return '1';
  
  const start = new Date(fromDate);
  const end = new Date(toDate);
  
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

// IST Timezone utilities
export const isSameDateIST = (date1: Date, date2: Date): boolean => {
  const istDate1 = new Date(date1.getTime() + (5 * 60 + 30) * 60 * 1000);
  const istDate2 = new Date(date2.getTime() + (5 * 60 + 30) * 60 * 1000);
  
  return istDate1.getFullYear() === istDate2.getFullYear() &&
         istDate1.getMonth() === istDate2.getMonth() &&
         istDate1.getDate() === istDate2.getDate();
};

export const getTodayIST = (): Date => {
  const now = new Date();
  return new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
};

export const convertToIST = (date: Date): Date => {
  return new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
};

export const getISTDateString = (date: Date): string => {
  const istDate = convertToIST(date);
  return istDate.toISOString().split('T')[0];
};

// Calculate days between two dates (IST)
export const daysBetweenIST = (date1: Date, date2: Date): number => {
  const istDate1 = convertToIST(date1);
  const istDate2 = convertToIST(date2);
  
  // Set both to start of day
  istDate1.setHours(0, 0, 0, 0);
  istDate2.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(istDate2.getTime() - istDate1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// Check if date is weekend
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// Generate EMI schedule for a loan
export const generateEmiSchedule = (
  emiStartDate: string,
  loanType: string,
  totalEmiCount: number,
  year: number,
  month: number
): Date[] => {
  const schedule: Date[] = [];
  if (!emiStartDate || !loanType || !totalEmiCount) return schedule;
  
  const startDate = new Date(emiStartDate);
  startDate.setHours(0, 0, 0, 0);
  
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  
  const currentDate = new Date(startDate); // FIXED: let → const
  
  // Create a mutable copy for iteration
  const mutableDate = new Date(currentDate);
  
  // Generate dates up to total EMI count
  for (let i = 0; i < totalEmiCount; i++) {
    if (i > 0) {
      // Move to next EMI date based on loan type
      switch(loanType) {
        case 'Daily':
          mutableDate.setDate(mutableDate.getDate() + 1);
          break;
        case 'Weekly':
          mutableDate.setDate(mutableDate.getDate() + 7);
          break;
        case 'Monthly':
          mutableDate.setMonth(mutableDate.getMonth() + 1);
          break;
        default:
          mutableDate.setDate(mutableDate.getDate() + 1);
      }
    }
    
    // Check if within current month
    if (mutableDate >= monthStart && mutableDate <= monthEnd) {
      schedule.push(new Date(mutableDate));
    }
    
    // Stop if we've passed the month
    if (mutableDate > monthEnd) break;
  }
  
  return schedule;
};

// Check if a specific date is an EMI date for a loan
export const isEmiDate = (
  date: Date,
  emiStartDate: string,
  _loanType: string, // FIXED: Added underscore prefix to indicate intentional non-use
  totalEmiCount: number
): boolean => {
  if (!emiStartDate || !_loanType) return false;
  
  const startDate = new Date(emiStartDate);
  startDate.setHours(0, 0, 0, 0);
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  // Check if date is within loan period
  const lastEmiDate = calculateLastScheduledEmiDate(emiStartDate, _loanType, totalEmiCount);
  const lastDate = new Date(lastEmiDate);
  
  if (checkDate < startDate || checkDate > lastDate) {
    return false;
  }
  
  // Check if date matches EMI schedule
  switch(_loanType) {
    case 'Daily':
      // For Daily loans, every day is an EMI date
      return true;
    case 'Weekly':
      // For Weekly loans, check if it's exactly 7-day intervals from start
      const daysFromStart = Math.floor((checkDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysFromStart % 7 === 0;
    case 'Monthly':
      // For Monthly loans, check if same day of month
      return checkDate.getDate() === startDate.getDate();
    default:
      return true;
  }
};

// Get next EMI date from today (for display purposes)
export const getNextEmiDateFromToday = (
  emiStartDate: string,
  loanType: string,
  emiPaidCount: number,
  totalEmiCount: number
): string => {
  if (emiPaidCount >= totalEmiCount) {
    return 'Loan Completed';
  }
  
  const lastScheduledEmiDate = calculateLastScheduledEmiDate(
    emiStartDate,
    loanType,
    emiPaidCount
  );
  
  return calculateNextScheduledEmiDate(
    lastScheduledEmiDate,
    loanType,
    emiStartDate
  );
};

// Check if payment is overdue
export const isPaymentOverdue = (
  emiDate: string,
  loanType: string
): boolean => {
  const emiDueDate = new Date(emiDate);
  const todayIST = getTodayIST();
  
  return emiDueDate < todayIST;
};

// Calculate number of overdue EMIs
export const calculateOverdueEmis = (
  emiStartDate: string,
  loanType: string,
  emiPaidCount: number,
  totalEmiCount: number
): number => {
  if (emiPaidCount >= totalEmiCount) return 0;
  
  const todayIST = getTodayIST();
  const startDate = new Date(emiStartDate);
  
  let overdueCount = 0;
  const currentDate = new Date(startDate); // FIXED: let → const
  
  // Create a mutable copy for iteration
  const mutableDate = new Date(currentDate);
  
  // Check each scheduled EMI date up to today
  for (let i = 0; i < totalEmiCount; i++) {
    if (i > 0) {
      switch(loanType) {
        case 'Daily':
          mutableDate.setDate(mutableDate.getDate() + 1);
          break;
        case 'Weekly':
          mutableDate.setDate(mutableDate.getDate() + 7);
          break;
        case 'Monthly':
          mutableDate.setMonth(mutableDate.getMonth() + 1);
          break;
      }
    }
    
    // Stop if we've passed today or checked all EMIs
    if (mutableDate > todayIST || i >= emiPaidCount) break;
    
    // Count as overdue if EMI is due and not paid yet (i >= emiPaidCount)
    if (mutableDate < todayIST && i >= emiPaidCount) {
      overdueCount++;
    }
  }
  
  return overdueCount;
};