import { Loan, EMIHistory, CalendarDay } from '@/src/types/dataEntry';

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

// EMI Date calculations
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

export const calculateLastEmiDate = (loan: any): string => {
  if (!loan.emiHistory || loan.emiHistory.length === 0) {
    return loan.emiStartDate || loan.dateApplied;
  }
  
  const sortedPayments = [...loan.emiHistory].sort((a, b) => 
    new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
  );
  
  return sortedPayments[0].paymentDate;
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
  return new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
};

// Calendar generation with IST fixes
export const generateCalendar = (
  month: Date, 
  loans: Loan[], 
  paymentHistory: EMIHistory[], 
  loanFilter: string = 'all'
): CalendarDay[] => {
  const days: CalendarDay[] = [];
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  
  const monthIST = new Date(month.getTime() + (5 * 60 + 30) * 60 * 1000);
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  
  const activeLoans = loans.filter(loan => !loan.isRenewed && loan.status === 'active');
  const filteredLoans = loanFilter === 'all' 
    ? activeLoans 
    : activeLoans.filter(loan => loan._id === loanFilter || loan.loanNumber === loanFilter);

  const processedPaymentIds = new Set();
  const startingDayOfWeek = firstDay.getDay();
  
  // Generate previous month days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, monthIndex, -i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      emiStatus: 'none'
    });
  }
  
  // Generate current month days with IST TIMEZONE HANDLING
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, monthIndex, day);
    const dateIST = new Date(date.getTime() + (5 * 60 + 30) * 60 * 1000);
    const todayIST = getTodayIST();
    
    const isToday = isSameDateIST(date, todayIST);
    const dateStr = dateIST.toISOString().split('T')[0];
    
    let emiStatus: CalendarDay['emiStatus'] = 'none';
    let emiAmount = 0;
    const loanNumbers: string[] = [];
    const datePayments: EMIHistory[] = [];

    // Check each filtered loan for this date
    filteredLoans.forEach(loan => {
      const loanEmiAmount = loan.emiAmount || 0;
      
      // Check if there's a payment for this loan on this date
      const loanPayments = paymentHistory.filter(payment => {
        const paymentDate = new Date(payment.paymentDate);
        const paymentDateIST = new Date(paymentDate.getTime() + (5 * 60 + 30) * 60 * 1000);
        
        const datesMatch = isSameDateIST(paymentDateIST, dateIST);
        
        if (!datesMatch) return false;
        
        const paymentBelongsToLoan = payment.loanId === loan._id || payment.loanNumber === loan.loanNumber;
        
        // For advance payments, also check if this date is within the advance period
        if (payment.paymentType === 'advance' && payment.advanceFromDate && payment.advanceToDate) {
          const advanceFrom = new Date(payment.advanceFromDate);
          const advanceTo = new Date(payment.advanceToDate);
          const advanceFromIST = new Date(advanceFrom.getTime() + (5 * 60 + 30) * 60 * 1000);
          const advanceToIST = new Date(advanceTo.getTime() + (5 * 60 + 30) * 60 * 1000);
          
          return paymentBelongsToLoan && dateIST >= advanceFromIST && dateIST <= advanceToIST;
        }
        
        return paymentBelongsToLoan;
      });

      // Filter out duplicate payments
      const uniqueLoanPayments = loanPayments.filter(payment => {
        if (!payment._id) return true;
        if (processedPaymentIds.has(payment._id)) return false;
        processedPaymentIds.add(payment._id);
        return true;
      });

      // If there are payments for this loan on this date, mark as paid
      if (uniqueLoanPayments.length > 0) {
        emiStatus = 'paid';
        emiAmount += uniqueLoanPayments.reduce((sum: number, payment: EMIHistory) => sum + payment.amount, 0);
        
        if (!loanNumbers.includes(loan.loanNumber)) {
          loanNumbers.push(loan.loanNumber);
        }
        
        datePayments.push(...uniqueLoanPayments);
      } 
      // If no payments, check if this date should have an EMI
      else {
        const loanStartDate = new Date(loan.emiStartDate || loan.dateApplied);
        const loanStartDateIST = new Date(loanStartDate.getTime() + (5 * 60 + 30) * 60 * 1000);
        
        const loanEndDate = new Date(loanStartDate);
        const totalPeriods = loan.totalEmiCount || loan.loanDays || 30;
        
        // Calculate end date based on loan type
        switch(loan.loanType) {
          case 'Daily':
            loanEndDate.setDate(loanEndDate.getDate() + totalPeriods - 1);
            break;
          case 'Weekly':
            loanEndDate.setDate(loanEndDate.getDate() + (totalPeriods * 7) - 1);
            break;
          case 'Monthly':
            loanEndDate.setMonth(loanEndDate.getMonth() + totalPeriods - 1);
            break;
          default:
            loanEndDate.setDate(loanEndDate.getDate() + totalPeriods - 1);
        }

        const loanEndDateIST = new Date(loanEndDate.getTime() + (5 * 60 + 30) * 60 * 1000);

        // Check if current date is within loan period and is an EMI date
        const isWithinLoanPeriod = dateIST >= loanStartDateIST && dateIST <= loanEndDateIST;
        const isEmiDate = isWithinLoanPeriod && isDateInEMISchedule(dateIST, loanStartDateIST, loan.loanType);

        if (isEmiDate) {
          emiAmount += loanEmiAmount;
          
          if (!loanNumbers.includes(loan.loanNumber)) {
            loanNumbers.push(loan.loanNumber);
          }

          // Only set status if not already paid
          if (emiStatus !== 'paid') {
            if (dateIST < todayIST) {
              emiStatus = 'overdue';
            } else if (isSameDateIST(dateIST, todayIST)) {
              emiStatus = 'due';
            } else {
              emiStatus = 'upcoming';
            }
          }
        }
      }
    });

    days.push({
      date,
      isCurrentMonth: true,
      isToday,
      emiStatus,
      emiAmount,
      loanNumbers,
      paymentHistory: datePayments
    });
  }

  // Generate next month days
  const endingDayOfWeek = lastDay.getDay();
  for (let i = 1; i < 7 - endingDayOfWeek; i++) {
    const date = new Date(year, monthIndex + 1, i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      emiStatus: 'none'
    });
  }

  return days;
};

// Helper function to check if a date is in EMI schedule
const isDateInEMISchedule = (date: Date, startDate: Date, loanType: string): boolean => {
  const currentDate = new Date(date);
  currentDate.setHours(0, 0, 0, 0);
  
  const loanStart = new Date(startDate);
  loanStart.setHours(0, 0, 0, 0);

  if (currentDate < loanStart) return false;

  switch(loanType) {
    case 'Daily':
      return true;
    case 'Weekly':
      const diffTime = currentDate.getTime() - loanStart.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays % 7 === 0;
    case 'Monthly':
      return currentDate.getDate() === loanStart.getDate();
    default:
      return true;
  }
};