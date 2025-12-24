/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Customer, Loan } from '@/src/app/data-entry/types/dataEntry';

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
  }[];
}

interface EMIStatusInfo {
  status: 'paid' | 'partial' | 'missed' | 'advance' | 'due' | 'amount-only';
  amount: number;
  loanNumbers: string[];
  loanDetails: {
    loanNumber: string;
    amount: number;
    status: 'paid' | 'partial' | 'missed' | 'advance' | 'due';
  }[];
}

// Enhanced logging with DD/MM/YYYY formatting
const debugLog = (label: string, data: unknown) => {
  console.log(`📅 [EMICalendar] ${label}:`, data);
};

// ============================================================================
// FIXED: Helper function to parse date strings from API
// ============================================================================
const parseDateFromAPI = (dateValue: any): Date => {
  if (!dateValue) {
    return getTodayIST();
  }
  
  // If it's already a Date object
  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    return dateValue;
  }
  
  // If it's a string in YYYY-MM-DD format (from API)
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    // Parse as IST date directly
    return parseISTDateString(dateValue);
  }
  
  // For other string formats
  if (typeof dateValue === 'string') {
    return parseISTDateString(dateValue);
  }
  
  // Fallback
  return getTodayIST();
};

// ============================================================================
// FIXED: Helper function to compare dates correctly
// ============================================================================
const compareDates = (date1: any, date2: any): number => {
  const d1 = parseDateFromAPI(date1);
  const d2 = parseDateFromAPI(date2);
  
  const date1Key = d1.toISOString().split('T')[0];
  const date2Key = d2.toISOString().split('T')[0];
  
  if (date1Key < date2Key) return -1;
  if (date1Key > date2Key) return 1;
  return 0;
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
  const todayKey = todayIST.toISOString().split('T')[0];
  
  // Previous month days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = new Date(year, month - 1, day);
    const dateIST = convertUTCToIST(date);
    const dateKey = dateIST.toISOString().split('T')[0];
    
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
    const dateKey = dateIST.toISOString().split('T')[0];
    
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
    const dateKey = dateIST.toISOString().split('T')[0];
    
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
    firstDate: formatToDDMMYYYY(calendarDays[0]?.date),
    lastDate: formatToDDMMYYYY(calendarDays[calendarDays.length - 1]?.date),
    gridType: `${Math.ceil(calendarDays.length / 7)} weeks`
  });
  
  return calendarDays;
};

export default function EMICalendarModal({
  isOpen,
  onClose,
  customer,
  currentUserOffice
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
      
      setCustomerLoans(activeLoans);
      
      // Create loan options
      const options = [
        { value: 'all', label: 'All Loans (Amount Dues Only)' }
      ];
      
      activeLoans.forEach((loan, index) => {
        options.push({
          value: loan.loanNumber || `L${index + 1}`,
          label: loan.loanNumber || `L${index + 1}`
        });
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
        emiAmount: l.emiAmount
      }))
    });

    // ============================================================================
    // FIXED: Generate proper calendar grid
    // ============================================================================
    const calendarGrid = generateCalendarGrid(selectedYear, selectedMonth);
    
    const emiStatusMap = new Map<string, EMIStatusInfo>();

    // Today's date for comparison
    const todayIST = getTodayIST();
    const todayKey = todayIST.toISOString().split('T')[0];
    const todayFormatted = formatToDDMMYYYY(todayIST.toISOString().split('T')[0]);
    
    debugLog('Today in IST', {
      todayIST: todayIST.toISOString(),
      todayKey,
      todayFormatted
    });

    // Process each loan
    loansToShow.forEach(loan => {
      debugLog(`Processing loan ${loan.loanNumber}`, {
        emiStartDate: loan.emiStartDate,
        formattedEmiStartDate: safeFormatDate(loan.emiStartDate),
        emiStartDateType: typeof loan.emiStartDate,
        loanType: loan.loanType,
        emiAmount: loan.emiAmount
      });

      if (!loan.emiStartDate || !loan.loanType || !loan.emiAmount) {
        debugLog(`Skipping loan - missing data`, loan);
        return;
      }

      // ============================================================================
      // FIXED: Parse emiStartDate correctly from API string
      // ============================================================================
      const parsedEmiStartDate = parseDateFromAPI(loan.emiStartDate);
      
      const emiSchedule = generateEmiSchedule(
        parsedEmiStartDate,
        loan.loanType,
        loan.totalEmiCount || 365,
        selectedYear,
        selectedMonth
      );
      
      debugLog(`Generated schedule for ${loan.loanNumber}`, {
        emiStartDateParsed: parsedEmiStartDate.toISOString(),
        scheduleLength: emiSchedule.length,
        dates: emiSchedule.slice(0, 5).map(date => ({
          date: date.toLocaleDateString('en-IN'),
          formatted: formatToDDMMYYYY(date),
          day: date.getDate()
        }))
      });
      
      emiSchedule.forEach(scheduledDate => {
        // ============================================================================
        // FIXED: Use consistent date formatting
        // ============================================================================
        const dateKey = scheduledDate.toISOString().split('T')[0];
        const formattedDate = formatToDDMMYYYY(scheduledDate);
        
        const existing = emiStatusMap.get(dateKey);
        
        // Determine payment status
        let paymentStatus: 'paid' | 'partial' | 'missed' | 'advance' | 'due' | 'amount-only' = 'due';
        let paymentAmount = loan.emiAmount;
        
        // Check payment history
        if (loan.emiHistory && loan.emiHistory.length > 0) {
          const relevantPayments = loan.emiHistory.filter(payment => {
            if (!payment.paymentDate) return false;
            
            // ============================================================================
            // FIXED: Use parseDateFromAPI for consistent parsing
            // ============================================================================
            const paymentDate = parseDateFromAPI(payment.paymentDate);
            const paymentDateKey = paymentDate.toISOString().split('T')[0];
            
            if (paymentDateKey === dateKey) return true;
            
            if (payment.paymentType === 'advance' && payment.advanceFromDate && payment.advanceToDate) {
              const advanceFrom = parseDateFromAPI(payment.advanceFromDate);
              const advanceTo = parseDateFromAPI(payment.advanceToDate);
              return scheduledDate >= advanceFrom && scheduledDate <= advanceTo;
            }
            
            return false;
          });
          
          if (relevantPayments.length > 0) {
            const totalPaid = relevantPayments.reduce((sum, p) => sum + p.amount, 0);
            
            if (totalPaid >= loan.emiAmount) {
              paymentStatus = relevantPayments.some(p => p.status === 'Advance') ? 'advance' : 'paid';
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
        } else {
          // ============================================================================
          // FIXED: Use compareDates function
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
          status: paymentStatus
        };
        
        emiStatusMap.set(dateKey, {
          status: finalStatus,
          amount: (existing?.amount || 0) + paymentAmount,
          loanNumbers: [...new Set([...(existing?.loanNumbers || []), loan.loanNumber || 'L1'])],
          loanDetails: [...(existing?.loanDetails || []), loanDetail]
        });
      });
    });

    // Update calendar grid with EMI information
    const updatedCalendarDays = calendarGrid.map(day => {
      const dateKey = day.date.toISOString().split('T')[0];
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
          loanDetails: emiInfo.loanDetails
        };
      }
      
      return day;
    });

    setCalendarDays(updatedCalendarDays);
    debugLog('Calendar days set', { 
      daysCount: updatedCalendarDays.length, 
      emiDays: updatedCalendarDays.filter(d => d.isEmiDue).length,
      month: `${selectedMonth + 1}/${selectedYear}`,
      today: todayFormatted,
      firstDay: formatToDDMMYYYY(updatedCalendarDays[0]?.date),
      lastDay: formatToDDMMYYYY(updatedCalendarDays[updatedCalendarDays.length - 1]?.date)
    });
  }, [selectedMonth, selectedYear, customerLoans, selectedLoan, isOpen]);

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
    todayFormatted: formatToDDMMYYYY(getTodayIST()),
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
                  // FIXED: Today's date display in DD/MM/YYYY
                  // ============================================================================ */}
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                    Today: {formatToDDMMYYYY(getTodayIST())}
                  </span>
                </div>
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
                // FIXED: Month dates in DD/MM/YYYY format
                // ============================================================================ */}
                <p className="text-sm text-gray-600 mt-1">
                  {formatToDDMMYYYY(new Date(selectedYear, selectedMonth, 1))} - {formatToDDMMYYYY(new Date(selectedYear, selectedMonth + 1, 0))}
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
                      : `Showing detailed EMI schedule for ${selectedLoan}`}
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
                  const formattedDate = formatToDDMMYYYY(day.date);
                  const dayOfWeek = day.date.getDay();
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] p-2 border border-gray-200 ${
                        !day.isCurrentMonth ? 'bg-gray-50 opacity-60' : ''
                      } ${
                        day.isToday ? 'bg-blue-50' : ''
                      } ${dayOfWeek === 0 || dayOfWeek === 6 ? 'bg-red-50 bg-opacity-30' : ''}`}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <span className={`text-sm font-medium ${
                              !day.isCurrentMonth ? 'text-gray-400' :
                              day.isToday ? 'text-blue-600' :
                              day.isWeekend ? 'text-red-600' :
                              'text-gray-900'
                            }`}>
                              {day.date.getDate()}
                            </span>
                            {/* ============================================================================
                            // FIXED: DD/MM/YYYY date display
                            // ============================================================================ */}
                            <div className="text-xs text-gray-500 mt-0.5">
                              {formattedDate}
                            </div>
                            {!day.isCurrentMonth && (
                              <div className="text-xs text-gray-400">
                                {day.date.getMonth() < selectedMonth ? 'Prev month' : 'Next month'}
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
                                  </div>
                                )}
                              </div>
                            ) : (
                              // Single Loan View: Show detailed status
                              <div className="text-xs">
                                <div className="font-medium text-gray-700">
                                  {getStatusText(day.status)} EMI
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
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded mr-2"></div>
                    <span className="text-sm text-gray-700">Total EMI Amount (Sum of all loans)</span>
                  </div>
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
                  </>
                )}
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded mr-2"></div>
                  <span className="text-sm text-gray-700">Today</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-50 border border-red-200 rounded mr-2"></div>
                  <span className="text-sm text-gray-700">Weekend</span>
                </div>
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
                // FIXED: Date range in DD/MM/YYYY format
                // ============================================================================ */}
                <div className="text-xs text-gray-500 mt-1">
                  Date Range: {formatToDDMMYYYY(new Date(selectedYear, selectedMonth, 1))} - {formatToDDMMYYYY(new Date(selectedYear, selectedMonth + 1, 0))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Calendar: {calendarDays.length} days ({Math.ceil(calendarDays.length / 7)} weeks)
                </div>
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