/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Customer, Loan, EMIScheduleDetails } from '@/src/app/data-entry/types/dataEntry';

// ============================================================================
// IMPORT DATE UTILITIES
// ============================================================================
import {
  generateEmiSchedule,
  formatToDDMMYYYY,
  parseISTDateString,
  convertUTCToIST,
  getTodayISTDate,
  getTodayIST,
  safeFormatDate
} from '@/src/app/data-entry/utils/dateCalculations';

interface EMICalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  currentUserOffice?: string;
  onEditPayment?: (payment: any) => void;
  onDeletePayment?: (payment: any) => void;
}

interface CalendarDay {
  date: Date;
  isEmiDue: boolean;
  isWeekend: boolean;
  isToday: boolean;
  isPast: boolean;
  isCurrentMonth: boolean;
  status?: 'paid' | 'partial' | 'missed' | 'advance' | 'due' | 'amount-only';
  amount?: number;
  loanNumbers?: string[];
  loanDetails?: {
    loanNumber: string;
    amount: number;
    status: 'paid' | 'partial' | 'missed' | 'advance' | 'due';
    isCustomInstallment?: boolean;
    installmentNumber?: number;
  }[];
  paymentDetails?: Array<{
    paymentId?: string;
    paymentDate: string;
    amount: number;
    status: string;
    collectedBy?: string;
    paymentType?: string;
    notes?: string;
    isAdvance?: boolean;
    advanceFromDate?: string;
    advanceToDate?: string;
    advanceEmiCount?: number;
    isPartOfAdvance?: boolean;
    loanNumber?: string;
    displayDate?: string;
    // Add grouped properties
    _isGrouped?: boolean;
    _groupCount?: number;
    _groupTotal?: number;
  }>;
}

interface EMIStatusInfo {
  status: 'paid' | 'partial' | 'missed' | 'advance' | 'due' | 'amount-only';
  amount: number;
  loanNumbers: string[];
  loanDetails: {
    loanNumber: string;
    amount: number;
    status: 'paid' | 'partial' | 'missed' | 'advance' | 'due';
    isCustomInstallment?: boolean;
    installmentNumber?: number;
  }[];
  paymentDetails: any[];
}

// Enhanced logging with DD/MM/YYYY formatting
const debugLog = (label: string, data: unknown) => {
  console.log(`📅 [EMICalendar] ${label}:`, data);
};

// ============================================================================
// NEW: Improved function to calculate installment number for any date
// ============================================================================
const calculateInstallmentNumberForDate = (loan: Loan, targetDate: Date): number | null => {
  if (!loan.emiStartDate || !loan.loanType || !loan.totalEmiCount) {
    return null;
  }
  
  // Parse the EMI start date
  const startDate = parseDateFromAPI(loan.emiStartDate);
  const targetDateParsed = parseDateFromAPI(targetDate);
  
  // For Daily loans
  if (loan.loanType === 'Daily') {
    const daysDiff = Math.floor((targetDateParsed.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const installmentNumber = daysDiff + 1; // Installments start at 1
    return installmentNumber >= 1 && installmentNumber <= loan.totalEmiCount ? installmentNumber : null;
  }
  
  // For Weekly loans
  if (loan.loanType === 'Weekly') {
    const daysDiff = Math.floor((targetDateParsed.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const installmentNumber = Math.floor(daysDiff / 7) + 1;
    return installmentNumber >= 1 && installmentNumber <= loan.totalEmiCount ? installmentNumber : null;
  }
  
  // For Monthly loans - more accurate calculation
  if (loan.loanType === 'Monthly') {
    // Calculate months difference
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const targetYear = targetDateParsed.getFullYear();
    const targetMonth = targetDateParsed.getMonth();
    
    const monthsDiff = (targetYear - startYear) * 12 + (targetMonth - startMonth);
    const installmentNumber = monthsDiff + 1;
    
    return installmentNumber >= 1 && installmentNumber <= loan.totalEmiCount ? installmentNumber : null;
  }
  
  return null;
};

// ============================================================================
// NEW: Function to get EMI amount for a specific date
// ============================================================================
const getEMIAmountForDate = (loan: Loan, date: Date): number => {
  // First, try to use the emiScheduleDetails if available
  if (loan.emiScheduleDetails && loan.emiScheduleDetails.schedule && loan.emiScheduleDetails.schedule.length > 0) {
    const dateKey = getDateAsYYYYMMDD(date);
    const scheduleItem = loan.emiScheduleDetails.schedule.find(
      item => item.dueDate === dateKey
    );
    if (scheduleItem) {
      debugLog(`Found schedule item for date ${dateKey}`, {
        loanNumber: loan.loanNumber,
        date: dateKey,
        amount: scheduleItem.amount,
        isCustom: scheduleItem.isCustom,
        installmentNumber: scheduleItem.installmentNumber
      });
      return scheduleItem.amount;
    }
  }
  
  // If no schedule details, calculate installment number and get amount
  const installmentNumber = calculateInstallmentNumberForDate(loan, date);
  if (installmentNumber) {
    debugLog(`Calculated installment ${installmentNumber} for date`, {
      loanNumber: loan.loanNumber,
      date: getDateAsYYYYMMDD(date),
      installmentNumber,
      emiType: loan.emiType,
      isLastInstallment: installmentNumber === loan.totalEmiCount
    });
    
    // Check if this is the last installment for custom EMI
    if (loan.emiType === 'custom' && loan.loanType !== 'Daily' && installmentNumber === loan.totalEmiCount) {
      debugLog(`Using custom amount for last installment`, {
        loanNumber: loan.loanNumber,
        installmentNumber,
        customAmount: loan.customEmiAmount,
        standardAmount: loan.emiAmount
      });
      return loan.customEmiAmount || loan.emiAmount;
    }
  }
  
  debugLog(`Using standard EMI amount`, {
    loanNumber: loan.loanNumber,
    date: getDateAsYYYYMMDD(date),
    installmentNumber,
    amount: loan.emiAmount
  });
  return loan.emiAmount;
};

// ============================================================================
// NEW: Check if a date is a custom installment
// ============================================================================
const isCustomInstallmentDate = (loan: Loan, date: Date): boolean => {
  // First, try to use the emiScheduleDetails if available
  if (loan.emiScheduleDetails && loan.emiScheduleDetails.schedule && loan.emiScheduleDetails.schedule.length > 0) {
    const dateKey = getDateAsYYYYMMDD(date);
    const scheduleItem = loan.emiScheduleDetails.schedule.find(
      item => item.dueDate === dateKey
    );
    if (scheduleItem) {
      return scheduleItem.isCustom || false;
    }
  }
  
  // If no schedule details, calculate installment number
  const installmentNumber = calculateInstallmentNumberForDate(loan, date);
  if (installmentNumber) {
    // Check if this is the last installment for custom EMI
    return (loan.emiType === 'custom' && 
            loan.loanType !== 'Daily' && 
            installmentNumber === loan.totalEmiCount);
  }
  
  return false;
};

// ============================================================================
// FIXED: Helper function to parse date strings from API - HANDLES ALL FORMATS
// ============================================================================
const parseDateFromAPI = (dateValue: any): Date => {
  if (!dateValue) {
    return getTodayIST();
  }
  
  // If it's already a Date object
  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    return convertUTCToIST(dateValue);
  }
  
  // If it's a string in YYYY-MM-DD format (from API)
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    // Parse as IST date directly
    return parseISTDateString(dateValue);
  }
  
  // If it's a string in ISO format (e.g., "2024-12-10T00:00:00.000Z")
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return convertUTCToIST(date);
      }
    } catch (e) {
      console.error('Error parsing ISO date:', e);
    }
  }
  
  // If it's a string in DD/MM/YYYY format
  if (typeof dateValue === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
    const [day, month, year] = dateValue.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return convertUTCToIST(date);
  }
  
  // For other string formats, try direct parsing
  if (typeof dateValue === 'string') {
    try {
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        return convertUTCToIST(parsed);
      }
    } catch (e) {
      console.error('Error parsing date string:', e);
    }
  }
  
  // If it's a number (timestamp)
  if (typeof dateValue === 'number') {
    return convertUTCToIST(new Date(dateValue));
  }
  
  // Fallback
  console.warn('Unable to parse date, using today:', dateValue);
  return getTodayIST();
};

// ============================================================================
// FIXED: Helper function to compare dates correctly
// ============================================================================
const compareDates = (date1: any, date2: any): number => {
  const d1 = parseDateFromAPI(date1);
  const d2 = parseDateFromAPI(date2);
  
  const date1Key = getDateAsYYYYMMDD(d1);
  const date2Key = getDateAsYYYYMMDD(d2);
  
  if (date1Key < date2Key) return -1;
  if (date1Key > date2Key) return 1;
  return 0;
};

// ============================================================================
// FIXED: Helper function to format Date to DD/MM/YYYY string
// ============================================================================
const formatDateToDDMMYYYY = (date: Date): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

// ============================================================================
// FIXED: Helper function to get date as YYYY-MM-DD string
// ============================================================================
const getDateAsYYYYMMDD = (date: Date): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// ============================================================================
// NEW: Function to generate proper calendar grid
// ============================================================================
const generateCalendarGrid = (year: number, month: number): CalendarDay[] => {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0-6
  
  // Days in the month
  const daysInMonth = lastDayOfMonth.getDate();
  
  // Days from previous month to show
  const daysFromPrevMonth = firstDayOfWeek;
  
  // Calculate total days needed (6 weeks * 7 days = 42 cells)
  const totalCells = 42;
  
  const calendarDays: CalendarDay[] = [];
  const todayIST = getTodayIST();
  const todayKey = getDateAsYYYYMMDD(todayIST);
  
  // Previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = new Date(year, month - 1, day);
    const dateIST = convertUTCToIST(date);
    const dateKey = getDateAsYYYYMMDD(dateIST);
    
    calendarDays.push({
      date: dateIST,
      isEmiDue: false,
      isWeekend: dateIST.getDay() === 0 || dateIST.getDay() === 6,
      isToday: dateKey === todayKey,
      isPast: compareDates(dateIST, todayIST) < 0,
      isCurrentMonth: false,
    });
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateIST = convertUTCToIST(date);
    const dateKey = getDateAsYYYYMMDD(dateIST);
    
    calendarDays.push({
      date: dateIST,
      isEmiDue: false, // Will be set later
      isWeekend: dateIST.getDay() === 0 || dateIST.getDay() === 6,
      isToday: dateKey === todayKey,
      isPast: compareDates(dateIST, todayIST) < 0,
      isCurrentMonth: true,
    });
  }
  
  // Next month days to fill the grid
  const remainingCells = totalCells - calendarDays.length;
  for (let day = 1; day <= remainingCells; day++) {
    const date = new Date(year, month + 1, day);
    const dateIST = convertUTCToIST(date);
    const dateKey = getDateAsYYYYMMDD(dateIST);
    
    calendarDays.push({
      date: dateIST,
      isEmiDue: false,
      isWeekend: dateIST.getDay() === 0 || dateIST.getDay() === 6,
      isToday: dateKey === todayKey,
      isPast: compareDates(dateIST, todayIST) < 0,
      isCurrentMonth: false,
    });
  }
  
  debugLog('Calendar grid generated', {
    year,
    month: month + 1,
    firstDayOfWeek,
    daysInMonth,
    daysFromPrevMonth,
    totalDays: calendarDays.length,
    firstDate: formatDateToDDMMYYYY(calendarDays[0]?.date),
    lastDate: formatDateToDDMMYYYY(calendarDays[calendarDays.length - 1]?.date),
    gridType: `${Math.ceil(calendarDays.length / 7)} weeks`
  });
  
  return calendarDays;
};

// ============================================================================
// Helper to debug emiHistory
// ============================================================================
const debugEMIHistory = (loan: Loan) => {
  if (!loan.emiHistory || loan.emiHistory.length === 0) {
    debugLog(`No EMI history for loan ${loan.loanNumber}`, {});
    return;
  }
  
  debugLog(`EMI History for ${loan.loanNumber}`, {
    count: loan.emiHistory.length,
    payments: loan.emiHistory.map((p: any, idx: number) => ({
      index: idx,
      paymentDate: p.paymentDate,
      paymentDateType: typeof p.paymentDate,
      isDate: p.paymentDate instanceof Date,
      parsedDate: p.paymentDate ? parseDateFromAPI(p.paymentDate).toISOString() : 'N/A',
      amount: p.amount,
      status: p.status,
      paymentType: p.paymentType,
      _id: p._id,
      isAdvance: p.isAdvance,
      advanceFromDate: p.advanceFromDate,
      advanceToDate: p.advanceToDate,
      notes: p.notes
    }))
  });
};

// ============================================================================
// NEW: Helper to debug EMI schedule details
// ============================================================================
const debugEMIScheduleDetails = (loan: Loan) => {
  if (!loan.emiScheduleDetails) {
    debugLog(`No EMI schedule details for loan ${loan.loanNumber}`, {
      emiType: loan.emiType,
      hasCustomEmi: loan.emiType === 'custom',
      customAmount: loan.customEmiAmount,
      loanType: loan.loanType,
      totalInstallments: loan.totalEmiCount
    });
    return;
  }
  
  const details = loan.emiScheduleDetails;
  debugLog(`EMI Schedule Details for ${loan.loanNumber}`, {
    emiType: details.emiType,
    customEmiAmount: details.customEmiAmount,
    totalInstallments: details.totalInstallments,
    customInstallmentNumber: details.customInstallmentNumber,
    standardAmount: details.standardAmount,
    customAmount: details.customAmount,
    scheduleLength: details.schedule?.length || 0,
    scheduleSample: details.schedule?.slice(0, 5).map(item => ({
      installment: item.installmentNumber,
      dueDate: item.dueDate,
      amount: item.amount,
      isCustom: item.isCustom
    })),
    customInstallments: details.schedule?.filter(item => item.isCustom).map(item => ({
      installment: item.installmentNumber,
      amount: item.amount,
      dueDate: item.dueDate
    }))
  });
};

// ============================================================================
// NEW: Function to get all payment dates from a loan (scheduled + actual)
// ============================================================================
const getAllPaymentDatesForLoan = (loan: Loan): Set<string> => {
  const allPaymentDates = new Set<string>();
  
  // Add scheduled EMI dates
  if (loan.emiStartDate && loan.loanType && loan.totalEmiCount) {
    const parsedEmiStartDate = parseDateFromAPI(loan.emiStartDate);
    const emiStartDateStr = getDateAsYYYYMMDD(parsedEmiStartDate);
    
    const emiSchedule = generateEmiSchedule(
      emiStartDateStr,
      loan.loanType,
      loan.totalEmiCount,
      parsedEmiStartDate.getFullYear(),
      parsedEmiStartDate.getMonth()
    );
    
    emiSchedule.forEach(date => {
      allPaymentDates.add(getDateAsYYYYMMDD(date));
    });
  }
  
  // Add actual payment dates from emiHistory
  if (loan.emiHistory && loan.emiHistory.length > 0) {
    loan.emiHistory.forEach((payment: any) => {
      const paymentDate = parseDateFromAPI(payment.paymentDate);
      const paymentDateKey = getDateAsYYYYMMDD(paymentDate);
      allPaymentDates.add(paymentDateKey);
      
      // Also add dates from advance payments - BUT ONLY SCHEDULED DATES
      if (payment.paymentType === 'advance' && payment.advanceFromDate && payment.advanceToDate) {
        const advanceFrom = parseDateFromAPI(payment.advanceFromDate);
        const advanceTo = parseDateFromAPI(payment.advanceToDate);
        
        // FIXED: Only add scheduled EMI dates within the advance range
        if (loan.emiStartDate && loan.loanType && loan.totalEmiCount) {
          const parsedEmiStartDate = parseDateFromAPI(loan.emiStartDate);
          const emiStartDateStr = getDateAsYYYYMMDD(parsedEmiStartDate);
          
          const emiSchedule = generateEmiSchedule(
            emiStartDateStr,
            loan.loanType,
            loan.totalEmiCount,
            parsedEmiStartDate.getFullYear(),
            parsedEmiStartDate.getMonth()
          );
          
          emiSchedule.forEach(date => {
            const dateKey = getDateAsYYYYMMDD(date);
            // Only add if date is within advance range
            if (date >= advanceFrom && date <= advanceTo) {
              allPaymentDates.add(dateKey);
            }
          });
        }
      }
    });
  }
  
  debugLog(`All payment dates for loan ${loan.loanNumber}`, {
    totalDates: allPaymentDates.size,
    dates: Array.from(allPaymentDates).slice(0, 10)
  });
  
  return allPaymentDates;
};

// ============================================================================
// NEW: Function to get payment details for a specific date
// ============================================================================
const getPaymentDetailsForDate = (loan: Loan, date: Date): any[] => {
  const paymentDetails: any[] = [];
  const dateKey = getDateAsYYYYMMDD(date);
  
  if (loan.emiHistory && loan.emiHistory.length > 0) {
    // Group payments by advance payment ID (for advance payments) or regular ID
    const paymentGroups = new Map<string, any[]>();
    
    // First pass: Group payments
    loan.emiHistory.forEach((payment: any) => {
      const paymentDate = parseDateFromAPI(payment.paymentDate);
      const paymentDateKey = getDateAsYYYYMMDD(paymentDate);
      
      // For advance payments, group by advance payment ID
      if (payment.paymentType === 'advance' && payment.advanceFromDate && payment.advanceToDate) {
        const advanceFrom = parseDateFromAPI(payment.advanceFromDate);
        const advanceTo = parseDateFromAPI(payment.advanceToDate);
        
        // Check if current date is within advance range
        if (date >= advanceFrom && date <= advanceTo) {
          // For advance payments, check if this date is a scheduled EMI date
          if (loan.emiStartDate && loan.loanType && loan.totalEmiCount) {
            const parsedEmiStartDate = parseDateFromAPI(loan.emiStartDate);
            const emiStartDateStr = getDateAsYYYYMMDD(parsedEmiStartDate);
            
            // Get all scheduled dates
            const emiSchedule = generateEmiSchedule(
              emiStartDateStr,
              loan.loanType,
              loan.totalEmiCount,
              date.getFullYear(),
              date.getMonth()
            );
            
            // Check if this date is in the schedule
            const isScheduledDate = emiSchedule.some(scheduledDate => 
              getDateAsYYYYMMDD(scheduledDate) === dateKey
            );
            
            if (isScheduledDate) {
              // Use advance payment ID as group key
              const groupKey = `advance_${payment._id}`;
              if (!paymentGroups.has(groupKey)) {
                paymentGroups.set(groupKey, []);
              }
              paymentGroups.get(groupKey)!.push(payment);
            }
          }
        }
      } else {
        // For regular payments, check exact date match
        if (paymentDateKey === dateKey) {
          const groupKey = `regular_${payment._id}`;
          if (!paymentGroups.has(groupKey)) {
            paymentGroups.set(groupKey, []);
          }
          paymentGroups.get(groupKey)!.push(payment);
        }
      }
    });
    
    // Second pass: Create consolidated payment details from groups
    paymentGroups.forEach((payments, groupKey) => {
      if (payments.length === 0) return;
      
      // Take the first payment as representative
      const firstPayment = payments[0];
      
      // For advance payments, show consolidated information
      if (groupKey.startsWith('advance_')) {
        // Calculate total amount for this advance payment group
        const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        
        paymentDetails.push({
          paymentId: firstPayment._id,
          paymentDate: firstPayment.paymentDate,
          amount: firstPayment.amount, // Per EMI amount
          status: firstPayment.status,
          collectedBy: firstPayment.collectedBy,
          paymentType: firstPayment.paymentType,
          notes: firstPayment.notes,
          isAdvance: true,
          advanceFromDate: firstPayment.advanceFromDate,
          advanceToDate: firstPayment.advanceToDate,
          advanceEmiCount: firstPayment.advanceEmiCount || payments.length,
          isPartOfAdvance: true,
          loanNumber: loan.loanNumber,
          displayDate: dateKey,
          // Add group info for debugging
          _isGrouped: true,
          _groupCount: payments.length,
          _groupTotal: totalAmount
        });
      } else {
        // For regular payments, just add as-is
        paymentDetails.push({
          paymentId: firstPayment._id,
          paymentDate: firstPayment.paymentDate,
          amount: firstPayment.amount,
          status: firstPayment.status,
          collectedBy: firstPayment.collectedBy,
          paymentType: firstPayment.paymentType,
          notes: firstPayment.notes,
          isAdvance: false,
          loanNumber: loan.loanNumber,
          displayDate: dateKey
        });
      }
    });
  }
  
  // DEBUG: Log payment details for this date
  if (paymentDetails.length > 0) {
    debugLog(`Payment details for ${dateKey}`, {
      date: dateKey,
      paymentCount: paymentDetails.length,
      payments: paymentDetails.map(p => ({
        id: p.paymentId,
        amount: p.amount,
        type: p.paymentType,
        isAdvance: p.isAdvance,
        advanceFrom: p.advanceFromDate,
        advanceTo: p.advanceToDate,
        displayDate: p.displayDate,
        paymentDate: p.paymentDate,
        isGrouped: p._isGrouped,
        groupCount: p._groupCount,
        groupTotal: p._groupTotal
      }))
    });
  }
  
  return paymentDetails;
};
export default function EMICalendarModal({
  isOpen,
  onClose,
  customer,
  currentUserOffice,
  onEditPayment,
  onDeletePayment
}: EMICalendarModalProps) {
  // Debug: Log when component renders
  useEffect(() => {
    debugLog('Component mounted', {
      isOpen,
      customerName: customer?.name,
      customerId: customer?._id,
      timestamp: new Date().toISOString(),
      todayIST: getTodayISTDate()
    });
    
    return () => {
      debugLog('Component unmounting', { customerName: customer?.name });
    };
  }, [isOpen, customer]);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [customerLoans, setCustomerLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<string>('all');
  const [loanOptions, setLoanOptions] = useState<{ value: string; label: string }[]>([
    { value: 'all', label: 'All Loans (Amount Dues Only)' }
  ]);
  const [isProcessingEdit, setIsProcessingEdit] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  // Extract loans from customer
  useEffect(() => {
    if (customer && isOpen) {
      debugLog('Extracting loans', {
        customerName: customer.name,
        hasLoansProp: 'loans' in customer,
        loansCount: ('loans' in customer && Array.isArray(customer.loans)) ? customer.loans.length : 0
      });
      
      const loans: Loan[] = [];
      
      // Try to get loans from customer object
      if ('loans' in customer && Array.isArray(customer.loans)) {
        debugLog('Found loans array', customer.loans);
        loans.push(...(customer.loans as Loan[]));
      }
      
      // If no loans array, create fallback from customer data
      if (loans.length === 0) {
        debugLog('Creating fallback loan', customer);
        const customerData = customer as any;
        
        if (customerData.loanNumber || customerData.loanAmount || customerData.emiAmount) {
          const fallbackLoan: Loan = {
            _id: customer._id || `fallback_${Date.now()}`,
            customerId: customer._id || '',
            customerName: customer.name,
            customerNumber: customer.customerNumber || '',
            loanNumber: customerData.loanNumber || 'L1',
            amount: customerData.loanAmount || customerData.amount || 0,
            emiAmount: customerData.emiAmount || 0,
            loanType: customerData.loanType || 'Daily',
            dateApplied: customerData.createdAt || getTodayISTDate(),
            emiStartDate: customerData.emiStartDate || customerData.createdAt || getTodayISTDate(),
            loanDays: customerData.loanDays || 30,
            totalEmiCount: customerData.totalEmiCount || 30,
            emiPaidCount: customerData.emiPaidCount || 0,
            lastEmiDate: customerData.lastEmiDate || customerData.createdAt || getTodayISTDate(),
            nextEmiDate: customerData.nextEmiDate || customerData.createdAt || getTodayISTDate(),
            totalPaidAmount: customerData.totalPaidAmount || 0,
            remainingAmount: customerData.remainingAmount || customerData.loanAmount || 0,
            emiHistory: customerData.emiHistory || [],
            emiType: customerData.emiType || 'fixed',
            customEmiAmount: customerData.customEmiAmount || null,
            emiScheduleDetails: customerData.emiScheduleDetails || null,
            status: 'active',
            isRenewed: false,
            renewedLoanNumber: '',
            renewedDate: '',
            originalLoanNumber: ''
          };
          loans.push(fallbackLoan);
        }
      }
      
      // Filter active loans
      const activeLoans = loans.filter(loan => 
        (loan.status === 'active' || !loan.status) && !loan.isRenewed
      );
      
      debugLog('Active loans', {
        total: loans.length,
        active: activeLoans.length,
        loanNumbers: activeLoans.map(l => l.loanNumber),
        emiStartDates: activeLoans.map(l => ({
          raw: l.emiStartDate,
          formatted: safeFormatDate(l.emiStartDate),
          type: typeof l.emiStartDate
        }))
      });
      
      // Debug EMI schedule details for each loan
      activeLoans.forEach(loan => {
        debugEMIScheduleDetails(loan);
      });
      
      setCustomerLoans(activeLoans);
      
      // Create loan options
      const options = [
        { value: 'all', label: 'All Loans (Amount Dues Only)' }
      ];
      
      activeLoans.forEach((loan, index) => {
        const label = `${loan.loanNumber || `L${index + 1}`}`;
        if (loan.emiType === 'custom' && loan.loanType !== 'Daily') {
          options.push({
            value: loan.loanNumber || `L${index + 1}`,
            label: `${label} ⭐ (Custom EMI - ₹${loan.emiAmount}/₹${loan.customEmiAmount})`
          });
        } else {
          options.push({
            value: loan.loanNumber || `L${index + 1}`,
            label: label
          });
        }
      });
      
      setLoanOptions(options);
    }
  }, [customer, isOpen]);

  // Generate calendar days based on selected loan
  useEffect(() => {
    if (!isOpen) return;
    
    debugLog('Generating calendar', {
      selectedMonth,
      selectedYear,
      selectedLoan,
      customerLoansCount: customerLoans.length
    });
    
    if (!customerLoans || customerLoans.length === 0) {
      debugLog('No customer loans', []);
      setCalendarDays([]);
      return;
    }

    const loansToShow = selectedLoan === 'all' 
      ? customerLoans 
      : customerLoans.filter(loan => loan.loanNumber === selectedLoan);

    debugLog('Loans to show', {
      count: loansToShow.length,
      loans: loansToShow.map(l => ({
        loanNumber: l.loanNumber,
        emiStartDate: l.emiStartDate,
        formattedEmiStartDate: safeFormatDate(l.emiStartDate),
        emiStartDateType: typeof l.emiStartDate,
        loanType: l.loanType,
        emiAmount: l.emiAmount,
        emiType: l.emiType,
        customEmiAmount: l.customEmiAmount,
        totalEmiCount: l.totalEmiCount,
        hasScheduleDetails: !!l.emiScheduleDetails,
        isWeeklyCustom: l.loanType === 'Weekly' && l.emiType === 'custom'
      }))
    });

    // ============================================================================
    // FIXED: Generate proper calendar grid
    // ============================================================================
    const calendarGrid = generateCalendarGrid(selectedYear, selectedMonth);
    
    const emiStatusMap = new Map<string, EMIStatusInfo>();

    // Today's date for comparison
    const todayIST = getTodayIST();
    const todayKey = getDateAsYYYYMMDD(todayIST);
    const todayFormatted = formatDateToDDMMYYYY(todayIST);
    
    debugLog('Today in IST', {
      todayIST: todayIST.toISOString(),
      todayKey,
      todayFormatted
    });

    // Process each loan
    loansToShow.forEach(loan => {
      // Debug EMI history for this loan
      debugEMIHistory(loan);
      debugEMIScheduleDetails(loan);
      
      debugLog(`Processing loan ${loan.loanNumber}`, {
        emiStartDate: loan.emiStartDate,
        formattedEmiStartDate: safeFormatDate(loan.emiStartDate),
        emiStartDateType: typeof loan.emiStartDate,
        loanType: loan.loanType,
        emiAmount: loan.emiAmount,
        emiType: loan.emiType,
        customEmiAmount: loan.customEmiAmount,
        totalEmiCount: loan.totalEmiCount,
        loanDays: loan.loanDays,
        hasScheduleDetails: !!loan.emiScheduleDetails,
        isWeeklyCustom: loan.loanType === 'Weekly' && loan.emiType === 'custom'
      });

      // ============================================================================
      // FIXED: Get ALL payment dates (scheduled + actual)
      // ============================================================================
      const allPaymentDates = getAllPaymentDatesForLoan(loan);
      
      // Now process ALL dates (scheduled + actual payments)
      Array.from(allPaymentDates).forEach(dateKey => {
        const scheduledDate = parseDateFromAPI(dateKey);
        const formattedDate = formatDateToDDMMYYYY(scheduledDate);
        
        const existing = emiStatusMap.get(dateKey);
        
        // ============================================================================
        // FIXED: Get correct EMI amount for this specific date
        // ============================================================================
        const expectedEMIAmount = getEMIAmountForDate(loan, scheduledDate);
        const isCustomInstallmentFlag = isCustomInstallmentDate(loan, scheduledDate);
        const installmentNumber = calculateInstallmentNumberForDate(loan, scheduledDate);
        
        debugLog(`EMI Amount for date ${formattedDate}`, {
          loanNumber: loan.loanNumber,
          date: formattedDate,
          dateKey,
          expectedAmount: expectedEMIAmount,
          isCustom: isCustomInstallmentFlag,
          installmentNumber,
          standardEmiAmount: loan.emiAmount,
          customEmiAmount: loan.customEmiAmount,
          loanType: loan.loanType,
          emiType: loan.emiType
        });
        
        // ============================================================================
        // FIXED: Get payment details for this date
        // ============================================================================
        const paymentDetails = getPaymentDetailsForDate(loan, scheduledDate);
        
        // Determine payment status
        let paymentStatus: 'paid' | 'partial' | 'missed' | 'advance' | 'due' | 'amount-only' = 'due';
        let paymentAmount = expectedEMIAmount;
        
        // Check payment history
        if (paymentDetails.length > 0) {
          const totalPaid = paymentDetails.reduce((sum, p) => sum + p.amount, 0);
          
          if (totalPaid >= expectedEMIAmount) {
            paymentStatus = paymentDetails.some(p => p.status === 'Advance' || p.isAdvance) ? 'advance' : 'paid';
          } else if (totalPaid > 0) {
            paymentStatus = 'partial';
            paymentAmount = totalPaid;
          }
        } else {
          // ============================================================================
          // FIXED: Use compareDates function for consistent comparison
          // ============================================================================
          const comparison = compareDates(scheduledDate, todayIST);
          if (comparison < 0) {
            paymentStatus = 'missed';
          }
        }
        
        // For "All Loans" view, use 'amount-only' status
        const finalStatus = selectedLoan === 'all' ? 'amount-only' : paymentStatus;
        
        const loanDetail = {
          loanNumber: loan.loanNumber || 'L1',
          amount: paymentAmount,
          status: paymentStatus,
          isCustomInstallment: isCustomInstallmentFlag,
          installmentNumber: installmentNumber || undefined
        };
        
        emiStatusMap.set(dateKey, {
          status: finalStatus,
          amount: (existing?.amount || 0) + paymentAmount,
          loanNumbers: [...new Set([...(existing?.loanNumbers || []), loan.loanNumber || 'L1'])],
          loanDetails: [...(existing?.loanDetails || []), loanDetail],
          paymentDetails: [...(existing?.paymentDetails || []), ...paymentDetails]
        });
      });
    });

    // Update calendar grid with EMI information
    const updatedCalendarDays = calendarGrid.map(day => {
      const dateKey = getDateAsYYYYMMDD(day.date);
      const emiInfo = emiStatusMap.get(dateKey);
      
      if (emiInfo) {
        const statusForDisplay = selectedLoan === 'all' 
          ? 'amount-only'
          : emiInfo.status;
        
        return {
          ...day,
          isEmiDue: true,
          status: statusForDisplay,
          amount: emiInfo.amount,
          loanNumbers: emiInfo.loanNumbers,
          loanDetails: emiInfo.loanDetails,
          paymentDetails: emiInfo.paymentDetails
        };
      }
      
      return day;
    });

    setCalendarDays(updatedCalendarDays);
    
    // Log details about custom EMI loans
    const customEMILoans = loansToShow.filter(loan => 
      loan.emiType === 'custom' && loan.loanType !== 'Daily'
    );
    
    customEMILoans.forEach(loan => {
      const customInstallments = updatedCalendarDays.filter(day => 
        day.loanDetails?.some(ld => 
          ld.loanNumber === loan.loanNumber && ld.isCustomInstallment
        )
      );
      
      debugLog(`Custom EMI Loan Summary: ${loan.loanNumber}`, {
        loanType: loan.loanType,
        emiAmount: loan.emiAmount,
        customEmiAmount: loan.customEmiAmount,
        totalInstallments: loan.totalEmiCount,
        customInstallmentsFound: customInstallments.length,
        customDates: customInstallments.map(day => ({
          date: formatDateToDDMMYYYY(day.date),
          amount: day.amount,
          installmentNumber: day.loanDetails?.find(ld => ld.loanNumber === loan.loanNumber)?.installmentNumber
        }))
      });
    });
    
    debugLog('Calendar days set', { 
      daysCount: updatedCalendarDays.length, 
      emiDays: updatedCalendarDays.filter(d => d.isEmiDue).length,
      month: `${selectedMonth + 1}/${selectedYear}`,
      today: todayFormatted,
      firstDay: formatDateToDDMMYYYY(updatedCalendarDays[0]?.date),
      lastDay: formatDateToDDMMYYYY(updatedCalendarDays[updatedCalendarDays.length - 1]?.date),
      customEMICount: updatedCalendarDays.filter(d => 
        d.loanDetails?.some(ld => ld.isCustomInstallment)
      ).length,
      daysWithOffSchedulePayments: updatedCalendarDays.filter(d => 
        d.paymentDetails && d.paymentDetails.length > 0
      ).length
    });
  }, [selectedMonth, selectedYear, customerLoans, selectedLoan, isOpen]);

  // ============================================================================
  // NEW: Handle Edit Payment
  // ============================================================================
  const handleEditPayment = async (payment: any) => {
    if (isProcessingEdit) return;
    
    setIsProcessingEdit(true);
    try {
      debugLog('Editing payment', payment);
      
      if (onEditPayment) {
        onEditPayment(payment);
      } else {
        // Fallback: Show edit modal or form
        const newAmount = prompt(`Edit payment amount for ${formatDateToDDMMYYYY(parseDateFromAPI(payment.paymentDate))}:\nCurrent: ₹${payment.amount}\nEnter new amount:`, payment.amount.toString());
        
        if (newAmount && parseFloat(newAmount) > 0) {
          const response = await fetch(`/api/data-entry/emi-payments?id=${payment.paymentId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: parseFloat(newAmount),
              paymentDate: payment.paymentDate,
              status: payment.status,
              notes: `Edited from ₹${payment.amount} to ₹${newAmount}`,
              collectedBy: payment.collectedBy || 'Data Entry Operator'
            }),
          });
          
          if (response.ok) {
            alert('Payment updated successfully!');
            // Refresh the calendar
            setTimeout(() => {
              // This would ideally trigger a refresh in parent component
              window.location.reload();
            }, 500);
          } else {
            alert('Failed to update payment');
          }
        }
      }
    } catch (error) {
      console.error('Error editing payment:', error);
      alert('Error editing payment');
    } finally {
      setIsProcessingEdit(false);
    }
  };

  // ============================================================================
  // NEW: Handle Delete Payment
  // ============================================================================
  const handleDeletePayment = async (payment: any) => {
    if (isProcessingDelete) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this payment?\n\nDate: ${formatDateToDDMMYYYY(parseDateFromAPI(payment.paymentDate))}\nAmount: ₹${payment.amount}\nStatus: ${payment.status}`
    );
    
    if (!confirmDelete) return;
    
    setIsProcessingDelete(true);
    try {
      debugLog('Deleting payment', payment);
      
      if (onDeletePayment) {
        onDeletePayment(payment);
      } else {
        const response = await fetch(`/api/data-entry/emi-payments?id=${payment.paymentId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          alert('Payment deleted successfully!');
          // Refresh the calendar
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } else {
          const errorData = await response.json();
          alert(`Failed to delete payment: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Error deleting payment');
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    debugLog('Navigating month', { 
      direction,
      currentMonth: `${selectedMonth + 1}/${selectedYear}`,
      currentMonthName: monthNames[selectedMonth]
    });
    
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
    
    // Log new month info
    setTimeout(() => {
      debugLog('Month changed to', {
        month: `${selectedMonth + 1}/${selectedYear}`,
        monthName: monthNames[selectedMonth]
      });
    }, 100);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-300';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'advance': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'missed': return 'bg-red-100 text-red-800 border-red-300';
      case 'amount-only': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partial': return 'Partial';
      case 'advance': return 'Advance';
      case 'missed': return 'Missed';
      case 'amount-only': return 'Amount';
      default: return 'Due';
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!isOpen) {
    debugLog('Modal not open - returning null', { isOpen });
    return null;
  }

  debugLog('Rendering modal', {
    customerName: customer?.name,
    calendarDays: calendarDays.length,
    selectedLoan,
    selectedMonth: monthNames[selectedMonth],
    selectedYear,
    todayFormatted: formatDateToDDMMYYYY(getTodayIST()),
    customerLoansCount: customerLoans.length
  });

  return (
    <div className="fixed inset-0 z-[1002]">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      ></div>
      
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 z-10">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  EMI Calendar - {customer?.name || 'Customer'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Customer Number: {customer?.customerNumber || 'N/A'} • {customerLoans.length} active loan(s)
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-xs text-gray-400">
                    {monthNames[selectedMonth]} {selectedYear} • Selected: {selectedLoan === 'all' ? 'All Loans' : selectedLoan}
                  </p>
                  {/* ============================================================================
                  // FIXED: Today's date display in DD/MM/YYYY using Date object
                  // ============================================================================ */}
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                    Today: {formatDateToDDMMYYYY(getTodayIST())}
                  </span>
                </div>
                {/* ============================================================================
                // NEW: Custom EMI indicator
                // ============================================================================ */}
                {selectedLoan !== 'all' && customerLoans.find(l => l.loanNumber === selectedLoan)?.emiType === 'custom' && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                      ⭐ Custom EMI Loan • Last installment has different amount
                    </span>
                  </div>
                )}
                {/* ============================================================================
                // NEW: Edit/Delete feature indicator
                // ============================================================================ */}
                {selectedLoan !== 'all' && (
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      ✏️ Edit/Delete available for individual payments
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Month Navigation and Loan Selection */}
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
              <button
                onClick={() => navigateMonth('prev')}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                ← Previous Month
              </button>
              
              <div className="flex flex-col items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {monthNames[selectedMonth]} {selectedYear}
                </h2>
                
                {/* ============================================================================
                // FIXED: Month dates in DD/MM/YYYY format using Date objects
                // ============================================================================ */}
                <p className="text-sm text-gray-600 mt-1">
                  {formatDateToDDMMYYYY(new Date(selectedYear, selectedMonth, 1))} - {formatDateToDDMMYYYY(new Date(selectedYear, selectedMonth + 1, 0))}
                </p>
                
                <div className="mt-2 w-full max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Loan to View:
                  </label>
                  <select
                    value={selectedLoan}
                    onChange={(e) => {
                      debugLog('Loan selection changed', { selectedLoan: e.target.value });
                      setSelectedLoan(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                  >
                    {loanOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedLoan === 'all' 
                      ? 'Showing total EMI amount per day for all loans' 
                      : `Showing detailed EMI schedule for ${selectedLoan} (with edit/delete)`}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => navigateMonth('next')}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                Next Month →
              </button>
            </div>

            {/* Calendar */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                {dayNames.map(day => (
                  <div key={day} className="p-3 text-center text-sm font-medium text-gray-700">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, index) => {
                  const formattedDate = formatDateToDDMMYYYY(day.date);
                  const dayOfWeek = day.date.getDay();
                  const hasCustomInstallments = day.loanDetails?.some(ld => ld.isCustomInstallment);
                  const customInstallmentDetails = day.loanDetails?.filter(ld => ld.isCustomInstallment);
                  const hasOffSchedulePayments = day.paymentDetails && day.paymentDetails.length > 0;
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] p-2 border border-gray-200 ${
                        !day.isCurrentMonth ? 'bg-gray-50 opacity-60' : ''
                      } ${
                        day.isToday ? 'bg-blue-50' : ''
                      } 
                      ${
                        hasCustomInstallments ? 'bg-purple-50 border-purple-300' : ''
                      } ${
                        hasOffSchedulePayments ? 'bg-yellow-50 border-yellow-300' : ''
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <span className={`text-sm font-medium ${
                              !day.isCurrentMonth ? 'text-gray-400' :
                              day.isToday ? 'text-blue-600' :
                              // REMOVED: Weekend red text color
                              // day.isWeekend ? 'text-red-600' :
                              hasCustomInstallments ? 'text-purple-600' :
                              hasOffSchedulePayments ? 'text-yellow-700' :
                              'text-gray-900'
                            }`}>
                              {day.date.getDate()}
                            </span>
                            {/* ============================================================================
                            // FIXED: DD/MM/YYYY date display using Date object
                            // ============================================================================ */}
                            <div className="text-xs text-gray-500 mt-0.5">
                              {formattedDate}
                            </div>
                            {!day.isCurrentMonth && (
                              <div className="text-xs text-gray-400">
                                {day.date.getMonth() < selectedMonth ? 'Prev month' : 'Next month'}
                              </div>
                            )}
                            {hasCustomInstallments && (
                              <div className="text-xs text-purple-600 font-medium mt-0.5">
                                ⭐ Custom Installment
                                {customInstallmentDetails?.[0]?.installmentNumber && (
                                  <span className="text-purple-400 ml-1">
                                    (#{customInstallmentDetails[0].installmentNumber})
                                  </span>
                                )}
                              </div>
                            )}
                            {hasOffSchedulePayments && (
                              <div className="text-xs text-yellow-700 font-medium mt-0.5">
                                💰 Actual Payment
                              </div>
                            )}
                          </div>
                          {day.isEmiDue && day.status && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full border ${getStatusColor(day.status)}`}>
                              {getStatusText(day.status)}
                            </span>
                          )}
                        </div>

                        {day.isEmiDue && (
                          <div className="mt-auto space-y-1">
                            {selectedLoan === 'all' ? (
                              // All Loans View: Show only total amount
                              <div className="text-xs">
                                <div className="font-medium text-purple-700">Total EMI Amount:</div>
                                <div className="text-purple-600 font-bold">₹{day.amount?.toLocaleString() || '0'}</div>
                                {day.loanNumbers && day.loanNumbers.length > 0 && (
                                  <div className="text-gray-500 text-xs mt-1">
                                    <div>Loans: {day.loanNumbers.slice(0, 2).join(', ')}</div>
                                    {day.loanNumbers.length > 2 && (
                                      <div className="text-gray-400">+{day.loanNumbers.length - 2} more</div>
                                    )}
                                    {hasCustomInstallments && (
                                      <div className="text-purple-600 text-xs mt-0.5">
                                        Includes custom EMI
                                      </div>
                                    )}
                                    {hasOffSchedulePayments && (
                                      <div className="text-yellow-600 text-xs mt-0.5">
                                        Includes off-schedule payment
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Single Loan View: Show detailed status
                              <div className="text-xs">
                                <div className="font-medium text-gray-700 flex items-center gap-1">
                                  {getStatusText(day.status)} EMI
                                  {hasCustomInstallments && (
                                    <span className="text-purple-600">⭐</span>
                                  )}
                                  {hasOffSchedulePayments && (
                                    <span className="text-yellow-600">💰</span>
                                  )}
                                </div>
                                <div className={`font-bold ${
                                  day.status === 'paid' ? 'text-green-600' :
                                  day.status === 'missed' ? 'text-red-600' :
                                  day.status === 'partial' ? 'text-yellow-600' :
                                  day.status === 'advance' ? 'text-blue-600' :
                                  'text-gray-600'
                                }`}>
                                  ₹{day.amount?.toLocaleString() || '0'}
                                </div>
                                
                                {/* Show payment details if available */}
                                {day.paymentDetails && day.paymentDetails.length > 0 && (
  <div className="text-gray-600 text-xs mt-0.5">
    {day.paymentDetails.some(p => p._isGrouped) 
      ? `${day.paymentDetails.length} advance payment(s)` 
      : `${day.paymentDetails.length} payment(s)`} on this date
  </div>
)}
                                
                                {hasCustomInstallments && (
                                  <div className="text-purple-600 text-xs mt-0.5">
                                    Custom amount (last installment)
                                  </div>
                                )}
                                {customInstallmentDetails?.[0]?.installmentNumber && (
                                  <div className="text-gray-500 text-xs">
                                    Installment #{customInstallmentDetails[0].installmentNumber}
                                  </div>
                                )}
                                
                                {/* ============================================================================
                                // NEW: Edit/Delete buttons for payments
                                // ============================================================================ */}
                                {selectedLoan !== 'all' && day.paymentDetails && day.paymentDetails.length > 0 && (
  <div className="mt-2 flex flex-col gap-1">
    {day.paymentDetails.slice(0, 2).map((payment: any, idx: number) => (
      <div key={`${payment.paymentId}_${idx}`} className="flex items-center justify-between gap-1">
        <div className="text-xs text-gray-600 truncate">
          {payment.isAdvance ? 'Advance' : 'Payment'}: ₹{payment.amount}
          {payment._isGrouped && (
            <span className="text-[10px] text-gray-400 ml-1">
              ({payment._groupCount} of {payment.advanceEmiCount})
            </span>
          )}
        </div>
        <div className="flex gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditPayment(payment);
            }}
            disabled={isProcessingEdit}
            className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ✏️
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeletePayment(payment);
            }}
            disabled={isProcessingDelete}
            className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🗑️
          </button>
        </div>
      </div>
    ))}
    {day.paymentDetails.length > 2 && (
      <div className="text-[10px] text-gray-400 text-center">
        +{day.paymentDetails.length - 2} more payments
      </div>
    )}
  </div>
)}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Legend</h4>
              <div className="flex flex-wrap gap-3">
                {selectedLoan === 'all' ? (
                  <>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Total EMI Amount (Sum of all loans)</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-purple-50 border border-purple-300 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Day with Custom EMI</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-yellow-50 border border-yellow-300 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Day with Off-Schedule Payment</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Paid</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Partial</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Advance</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Missed</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Due</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-purple-50 border border-purple-300 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Custom Installment</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-yellow-50 border border-yellow-300 rounded mr-2"></div>
                      <span className="text-sm text-gray-700">Off-Schedule Payment</span>
                    </div>
                  </>
                )}
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded mr-2"></div>
                  <span className="text-sm text-gray-700">Today</span>
                </div>
                {/* REMOVED: Weekend legend entry */}
                {/* <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-50 border border-red-200 rounded mr-2"></div>
                  <span className="text-sm text-gray-700">Weekend</span>
                </div> */}
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-100 border border-gray-300 opacity-60 rounded mr-2"></div>
                  <span className="text-sm text-gray-700">Other Month</span>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedLoan === 'all' 
                  ? `Showing total EMI amounts per day for all loans in ${monthNames[selectedMonth]} ${selectedYear}`
                  : `Showing EMI schedule for ${selectedLoan} in ${monthNames[selectedMonth]} ${selectedYear}`}
                {/* ============================================================================
                // FIXED: Date range in DD/MM/YYYY format using Date objects
                // ============================================================================ */}
                <div className="text-xs text-gray-500 mt-1">
                  Date Range: {formatDateToDDMMYYYY(new Date(selectedYear, selectedMonth, 1))} - {formatDateToDDMMYYYY(new Date(selectedYear, selectedMonth + 1, 0))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Calendar: {calendarDays.length} days ({Math.ceil(calendarDays.length / 7)} weeks)
                </div>
                {/* ============================================================================
                // NEW: Custom EMI summary
                // ============================================================================ */}
                {selectedLoan !== 'all' && customerLoans.find(l => l.loanNumber === selectedLoan)?.emiType === 'custom' && (
                  <div className="text-xs text-purple-600 mt-1 font-medium">
                    ⭐ This loan has custom EMI: Last installment shows custom amount
                  </div>
                )}
                {/* ============================================================================
                // NEW: Edit/Delete instructions
                // ============================================================================ */}
                {selectedLoan !== 'all' && (
                  <div className="text-xs text-green-600 mt-1 font-medium">
                    ✏️ Click edit/delete buttons on payment days to modify payment records
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Close Calendar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}