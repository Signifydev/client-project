'use client';

import { useState, useEffect } from 'react';
import { Customer, Loan, EMIHistory } from '@/src/app/data-entry/types/dataEntry';

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
  status: 'paid' | 'partial' | 'missed' | 'advance' | 'due';
  amount: number;
  loanNumbers: string[];
  loanDetails: {
    loanNumber: string;
    amount: number;
    status: 'paid' | 'partial' | 'missed' | 'advance' | 'due';
  }[];
}

// NEW: Generate EMI schedule dates for a loan
const generateEmiSchedule = (loan: Loan, year: number, month: number): Date[] => {
  const schedule: Date[] = [];
  if (!loan.emiStartDate || !loan.loanType) return schedule;
  
  const startDate = new Date(loan.emiStartDate);
  startDate.setHours(0, 0, 0, 0);
  
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  
  let currentDate = new Date(startDate);
  
  // Generate dates up to total EMI count or until we exceed reasonable limit
  const maxDates = 365; // Safety limit
  
  for (let i = 0; i < maxDates; i++) {
    // Skip if before start date
    if (currentDate < startDate) {
      // Move to next EMI date
      switch(loan.loanType) {
        case 'Daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'Weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'Monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
      continue;
    }
    
    // Stop if we've passed total EMI count
    if (loan.totalEmiCount && i >= loan.totalEmiCount) break;
    
    // Add date if within current month
    if (currentDate >= monthStart && currentDate <= monthEnd) {
      schedule.push(new Date(currentDate));
    }
    
    // Stop if we've passed the month
    if (currentDate > monthEnd) break;
    
    // Move to next EMI date based on loan type
    switch(loan.loanType) {
      case 'Daily':
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'Weekly':
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'Monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        // Handle month rollover (e.g., Jan 31 + 1 month = Mar 3 in JS)
        // Adjust to same day of month if possible
        const targetDay = startDate.getDate();
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        currentDate.setDate(Math.min(targetDay, lastDayOfMonth));
        break;
    }
  }
  
  return schedule;
};

export default function EMICalendarModal({
  isOpen,
  onClose,
  customer,
  currentUserOffice
}: EMICalendarModalProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [customerLoans, setCustomerLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [loanOptions, setLoanOptions] = useState<{ value: string; label: string }[]>([
    { value: 'all', label: 'All Loans (Amount Dues Only)' }
  ]);

  // Extract loans from customer
  useEffect(() => {
    if (customer) {
      const loans: Loan[] = [];
      
      if ('loans' in customer && Array.isArray(customer.loans)) {
        loans.push(...customer.loans as Loan[]);
      }
      
      const customerData = customer as any;
      if (customerData.loanNumber || customerData.amount) {
        const fallbackLoan: Loan = {
          _id: customer._id || `fallback_${Date.now()}`,
          customerId: customer._id || '',
          customerName: customer.name,
          customerNumber: customer.customerNumber || '',
          loanNumber: customerData.loanNumber || 'L1',
          amount: customerData.loanAmount || customerData.amount || 0,
          emiAmount: customerData.emiAmount || 0,
          loanType: customerData.loanType || 'Daily',
          dateApplied: customerData.createdAt || new Date().toISOString(),
          emiStartDate: customerData.emiStartDate || customerData.createdAt || new Date().toISOString(),
          loanDays: customerData.loanDays || 30,
          totalEmiCount: customerData.totalEmiCount || 30,
          emiPaidCount: customerData.emiPaidCount || 0,
          lastEmiDate: customerData.lastEmiDate || customerData.createdAt || new Date().toISOString(),
          nextEmiDate: customerData.nextEmiDate || customerData.createdAt || new Date().toISOString(),
          totalPaidAmount: customerData.totalPaidAmount || 0,
          remainingAmount: customerData.remainingAmount || customerData.loanAmount || 0,
          emiHistory: customerData.emiHistory || [],
          status: customerData.status || 'active',
          isRenewed: false,
          renewedLoanNumber: '',
          renewedDate: '',
          originalLoanNumber: ''
        };
        loans.push(fallbackLoan);
      }
      
      const activeLoans = loans.filter(loan => 
        loan.status === 'active' && !loan.isRenewed
      );
      
      setCustomerLoans(activeLoans);
      
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
  }, [customer]);

  // Generate calendar days based on selected loan
  useEffect(() => {
    if (!customerLoans || customerLoans.length === 0) {
      setCalendarDays([]);
      return;
    }

    const loansToShow = selectedLoan === 'all' 
      ? customerLoans 
      : customerLoans.filter(loan => loan.loanNumber === selectedLoan);

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const days: CalendarDay[] = [];

    // For "All Loans" view: Only show total amount due per day
    // For single loan view: Show detailed status
    
    const emiStatusMap = new Map<string, EMIStatusInfo>();

    // Get today's date in IST (UTC+5:30)
    const today = new Date();
    const todayIST = new Date(today.getTime() + (5.5 * 60 * 60 * 1000));
    const todayKey = todayIST.toISOString().split('T')[0];

    loansToShow.forEach(loan => {
      if (!loan.emiStartDate || !loan.loanType || !loan.emiAmount) return;

      // Generate EMI schedule for this loan in the selected month
      const emiSchedule = generateEmiSchedule(loan, selectedYear, selectedMonth);
      
      emiSchedule.forEach(scheduledDate => {
        const dateKey = scheduledDate.toISOString().split('T')[0];
        const existing = emiStatusMap.get(dateKey);
        
        // Check if there's a payment for this scheduled date
        let paymentStatus: 'paid' | 'partial' | 'advance' | 'missed' | 'due' = 'due';
        let paymentAmount = loan.emiAmount;
        
        if (loan.emiHistory && loan.emiHistory.length > 0) {
          // Find payments for this date or advance payments covering this date
          const relevantPayments = loan.emiHistory.filter(payment => {
            if (!payment.paymentDate) return false;
            
            const paymentDate = new Date(payment.paymentDate);
            const paymentDateKey = paymentDate.toISOString().split('T')[0];
            
            // Exact date match
            if (paymentDateKey === dateKey) return true;
            
            // Check if it's an advance payment covering this date
            if (payment.paymentType === 'advance' && payment.advanceFromDate && payment.advanceToDate) {
              const advanceFrom = new Date(payment.advanceFromDate);
              const advanceTo = new Date(payment.advanceToDate);
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
            // No payment found - check if date is in past
            const scheduleDateIST = new Date(scheduledDate.getTime() + (5.5 * 60 * 60 * 1000));
            const scheduleDateKey = scheduleDateIST.toISOString().split('T')[0];
            
            if (scheduleDateKey < todayKey) {
              paymentStatus = 'missed';
            } else {
              paymentStatus = 'due';
            }
          }
        } else {
          // No payment history
          const scheduleDateIST = new Date(scheduledDate.getTime() + (5.5 * 60 * 60 * 1000));
          const scheduleDateKey = scheduleDateIST.toISOString().split('T')[0];
          
          if (scheduleDateKey < todayKey) {
            paymentStatus = 'missed';
          }
        }
        
        const loanDetail = {
          loanNumber: loan.loanNumber || 'L1',
          amount: paymentAmount,
          status: paymentStatus
        };
        
        emiStatusMap.set(dateKey, {
          status: selectedLoan === 'all' ? 'amount-only' : paymentStatus,
          amount: (existing?.amount || 0) + paymentAmount,
          loanNumbers: [...new Set([...(existing?.loanNumbers || []), loan.loanNumber || 'L1'])],
          loanDetails: [...(existing?.loanDetails || []), loanDetail]
        });
      });
    });

    // Generate calendar days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dateIST = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
      const dateKey = dateIST.toISOString().split('T')[0];
      
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isToday = dateKey === todayKey;
      const isPast = dateKey < todayKey;
      
      const emiInfo = emiStatusMap.get(dateKey);
      const isEmiDue = !!emiInfo;

      // For "All Loans" view, show only amount (no status colors)
      const statusForDisplay = selectedLoan === 'all' 
        ? (isEmiDue ? 'amount-only' : undefined)
        : emiInfo?.status;

      days.push({
        date,
        isEmiDue,
        isWeekend,
        isToday,
        isPast,
        status: statusForDisplay,
        amount: emiInfo?.amount,
        loanNumbers: emiInfo?.loanNumbers,
        loanDetails: emiInfo?.loanDetails
      });
    }

    setCalendarDays(days);
  }, [selectedMonth, selectedYear, customerLoans, selectedLoan]);

  const navigateMonth = (direction: 'prev' | 'next') => {
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
      case 'amount-only': return 'Amount Due';
      default: return 'Due';
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                EMI Calendar - {customer.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Customer Number: {customer.customerNumber} • {customerLoans.length} active loan(s)
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="text-2xl">×</span>
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
              
              <div className="mt-2 w-full max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Loan to View:
                </label>
                <select
                  value={selectedLoan}
                  onChange={(e) => setSelectedLoan(e.target.value)}
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
                    ? 'Showing total EMI amount due per day for all loans' 
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
                const isCurrentMonth = day.date.getMonth() === selectedMonth;
                
                return (
                  <div
                    key={index}
                    className={`min-h-[120px] p-2 border border-gray-200 ${
                      !isCurrentMonth ? 'bg-gray-50' : ''
                    } ${
                      day.isToday ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-sm font-medium ${
                          !isCurrentMonth ? 'text-gray-400' :
                          day.isToday ? 'text-blue-600' :
                          day.isWeekend ? 'text-red-600' :
                          'text-gray-900'
                        }`}>
                          {day.date.getDate()}
                        </span>
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
                              <div className="font-medium text-purple-700">Total EMI Due:</div>
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
                              {day.loanDetails && day.loanDetails.length > 0 && (
                                <div className="mt-1">
                                  {day.loanDetails.map((detail, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                      <span className="text-gray-600">{detail.loanNumber}</span>
                                      <span className={`px-1 rounded ${
                                        detail.status === 'paid' ? 'bg-green-100 text-green-800' :
                                        detail.status === 'missed' ? 'bg-red-100 text-red-800' :
                                        detail.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                        detail.status === 'advance' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {detail.status === 'paid' ? 'Paid' : 
                                         detail.status === 'missed' ? 'Missed' : 
                                         detail.status === 'partial' ? 'Partial' : 
                                         detail.status === 'advance' ? 'Advance' : 
                                         'Due'}
                                      </span>
                                    </div>
                                  ))}
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
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded mr-2"></div>
                  <span className="text-sm text-gray-700">Total EMI Amount Due (Sum of all loans)</span>
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
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedLoan === 'all' 
                ? `Showing total EMI amounts due per day for all loans in ${monthNames[selectedMonth]} ${selectedYear}`
                : `Showing EMI schedule for ${selectedLoan} in ${monthNames[selectedMonth]} ${selectedYear}`}
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
  );
}