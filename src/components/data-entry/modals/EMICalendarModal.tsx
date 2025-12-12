'use client';

import { useState, useEffect } from 'react';
import { Customer, Loan, EMIHistory } from '@/src/types/dataEntry';

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
  const [selectedLoan, setSelectedLoan] = useState<string>('all'); // 'all', 'L1', 'L2', etc.
  const [isLoading, setIsLoading] = useState(false);
  const [loanOptions, setLoanOptions] = useState<{ value: string; label: string }[]>([
    { value: 'all', label: 'All Loans (Amount Dues Only)' }
  ]);

  // Extract loans from customer
  useEffect(() => {
    if (customer) {
      const loans: Loan[] = [];
      
      // If customer has loans array
      if ('loans' in customer && Array.isArray(customer.loans)) {
        loans.push(...customer.loans as Loan[]);
      }
      
      // If customer has loan properties directly (treat as fallback loan)
      const customerData = customer as any;
      if (customerData.loanNumber || customerData.amount) {
        // Create a loan object from customer data
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
      
      // Filter for active loans only
      const activeLoans = loans.filter(loan => 
        loan.status === 'active' && !loan.isRenewed
      );
      
      setCustomerLoans(activeLoans);
      
      // Generate loan options for dropdown
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

    // Filter loans based on selection
    const loansToShow = selectedLoan === 'all' 
      ? customerLoans 
      : customerLoans.filter(loan => loan.loanNumber === selectedLoan);

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const days: CalendarDay[] = [];

    // Get all EMI due dates for the month
    const emiDueDates = new Set<string>();
    const emiStatusMap = new Map<string, EMIStatusInfo>();

    loansToShow.forEach(loan => {
      if (!loan.nextEmiDate || !loan.loanType || !loan.emiAmount) return;

      // Generate EMI schedule for the month
      const startDate = new Date(loan.emiStartDate || loan.dateApplied);
      const today = new Date();
      const monthStart = new Date(selectedYear, selectedMonth, 1);
      const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);

      // Calculate daily, weekly, or monthly EMI dates
      const currentDate = new Date(startDate);
      const loanNumber = loan.loanNumber || 'L1';
      
      if (loan.loanType === 'Daily') {
        // Daily EMI - every day
        while (currentDate <= monthEnd) {
          if (currentDate >= monthStart && currentDate <= monthEnd) {
            const dateKey = currentDate.toISOString().split('T')[0];
            emiDueDates.add(dateKey);
            
            // Check if payment was made for this date
            const payment = loan.emiHistory?.find(p => {
              if (!p.paymentDate) return false;
              const paymentDate = new Date(p.paymentDate);
              return paymentDate.toISOString().split('T')[0] === dateKey;
            });
            
            const existing = emiStatusMap.get(dateKey);
            
            if (payment) {
              // Determine status from payment
              let status: EMIStatusInfo['status'] = 'due';
              if (payment.status === 'Paid') {
                status = 'paid';
              } else if (payment.status === 'Partial') {
                status = 'partial';
              } else if (payment.status === 'Advance') {
                status = 'advance';
              }
              
              const loanDetail = {
                loanNumber,
                amount: payment.amount,
                status
              };
              
              emiStatusMap.set(dateKey, {
                status,
                amount: (existing?.amount || 0) + payment.amount,
                loanNumbers: [...(existing?.loanNumbers || []), loanNumber],
                loanDetails: [...(existing?.loanDetails || []), loanDetail]
              });
            } else {
              // No payment found, mark as due or missed
              const status: EMIStatusInfo['status'] = currentDate < today ? 'missed' : 'due';
              const loanDetail = {
                loanNumber,
                amount: loan.emiAmount,
                status
              };
              
              emiStatusMap.set(dateKey, {
                status,
                amount: existing?.amount || loan.emiAmount,
                loanNumbers: [...(existing?.loanNumbers || []), loanNumber],
                loanDetails: [...(existing?.loanDetails || []), loanDetail]
              });
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (loan.loanType === 'Weekly') {
        // Weekly EMI - every 7 days
        const weeklyDate = new Date(startDate);
        while (weeklyDate <= monthEnd) {
          if (weeklyDate >= monthStart && weeklyDate <= monthEnd) {
            const dateKey = weeklyDate.toISOString().split('T')[0];
            emiDueDates.add(dateKey);
            
            const payment = loan.emiHistory?.find(p => {
              if (!p.paymentDate) return false;
              const paymentDate = new Date(p.paymentDate);
              return paymentDate.toISOString().split('T')[0] === dateKey;
            });
            
            const existing = emiStatusMap.get(dateKey);
            
            if (payment) {
              let status: EMIStatusInfo['status'] = 'due';
              if (payment.status === 'Paid') {
                status = 'paid';
              } else if (payment.status === 'Partial') {
                status = 'partial';
              } else if (payment.status === 'Advance') {
                status = 'advance';
              }
              
              const loanDetail = {
                loanNumber,
                amount: payment.amount,
                status
              };
              
              emiStatusMap.set(dateKey, {
                status,
                amount: (existing?.amount || 0) + payment.amount,
                loanNumbers: [...(existing?.loanNumbers || []), loanNumber],
                loanDetails: [...(existing?.loanDetails || []), loanDetail]
              });
            } else {
              const status: EMIStatusInfo['status'] = weeklyDate < today ? 'missed' : 'due';
              const loanDetail = {
                loanNumber,
                amount: loan.emiAmount,
                status
              };
              
              emiStatusMap.set(dateKey, {
                status,
                amount: existing?.amount || loan.emiAmount,
                loanNumbers: [...(existing?.loanNumbers || []), loanNumber],
                loanDetails: [...(existing?.loanDetails || []), loanDetail]
              });
            }
          }
          weeklyDate.setDate(weeklyDate.getDate() + 7);
        }
      } else if (loan.loanType === 'Monthly') {
        // Monthly EMI - same day each month
        const emiDay = startDate.getDate();
        
        // Check if this month has the EMI day
        const emiDate = new Date(selectedYear, selectedMonth, Math.min(emiDay, daysInMonth));
        if (emiDate >= monthStart && emiDate <= monthEnd) {
          const dateKey = emiDate.toISOString().split('T')[0];
          emiDueDates.add(dateKey);
          
          const payment = loan.emiHistory?.find(p => {
            if (!p.paymentDate) return false;
            const paymentDate = new Date(p.paymentDate);
            return paymentDate.toISOString().split('T')[0] === dateKey;
          });
          
          const existing = emiStatusMap.get(dateKey);
          
          if (payment) {
            let status: EMIStatusInfo['status'] = 'due';
            if (payment.status === 'Paid') {
              status = 'paid';
            } else if (payment.status === 'Partial') {
              status = 'partial';
            } else if (payment.status === 'Advance') {
              status = 'advance';
            }
            
            const loanDetail = {
              loanNumber,
              amount: payment.amount,
              status
            };
            
            emiStatusMap.set(dateKey, {
              status,
              amount: (existing?.amount || 0) + payment.amount,
              loanNumbers: [...(existing?.loanNumbers || []), loanNumber],
              loanDetails: [...(existing?.loanDetails || []), loanDetail]
            });
          } else {
            const status: EMIStatusInfo['status'] = emiDate < today ? 'missed' : 'due';
            const loanDetail = {
              loanNumber,
              amount: loan.emiAmount,
              status
            };
            
            emiStatusMap.set(dateKey, {
              status,
              amount: existing?.amount || loan.emiAmount,
              loanNumbers: [...(existing?.loanNumbers || []), loanNumber],
              loanDetails: [...(existing?.loanDetails || []), loanDetail]
            });
          }
        }
      }
    });

    // Generate calendar days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dateKey = date.toISOString().split('T')[0];
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < today;
      const isEmiDue = emiDueDates.has(dateKey);
      
      const emiInfo = emiStatusMap.get(dateKey);

      // For "All Loans" view, show only amount dues without status colors
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
              
              {/* Loan Selection Dropdown */}
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
                    ? 'Showing total amount dues for all loans' 
                    : `Showing detailed EMI history for ${selectedLoan}`}
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
                            // All Loans View: Show only amount
                            <div className="text-xs">
                              <div className="font-medium text-purple-700">Total Due:</div>
                              <div className="text-purple-600 font-bold">₹{day.amount?.toLocaleString() || '0'}</div>
                              {day.loanNumbers && day.loanNumbers.length > 0 && (
                                <div className="text-gray-500 text-xs mt-1">
                                  {day.loanNumbers.slice(0, 2).map(loanNo => (
                                    <div key={loanNo} className="truncate">{loanNo}</div>
                                  ))}
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
                                EMI {getStatusText(day.status)}
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
                                    <div key={idx} className="flex justify-between items-center">
                                      <span className="text-gray-600">{detail.loanNumber}</span>
                                      <span className={`px-1 rounded text-xs ${
                                        detail.status === 'paid' ? 'bg-green-100 text-green-800' :
                                        detail.status === 'missed' ? 'bg-red-100 text-red-800' :
                                        detail.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                        detail.status === 'advance' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {detail.status === 'paid' ? '✓' : 
                                         detail.status === 'missed' ? '✗' : 
                                         detail.status === 'partial' ? '~' : 
                                         detail.status === 'advance' ? '↑' : 
                                         '●'}
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

          {/* Legend - Dynamic based on selection */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Legend</h4>
            <div className="flex flex-wrap gap-3">
              {selectedLoan === 'all' ? (
                // Legend for All Loans view
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded mr-2"></div>
                  <span className="text-sm text-gray-700">Amount Due (Total from all loans)</span>
                </div>
              ) : (
                // Legend for Single Loan view
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
                ? `Showing total amount dues for all loans in ${monthNames[selectedMonth]} ${selectedYear}`
                : `Showing EMI history for ${selectedLoan} in ${monthNames[selectedMonth]} ${selectedYear}`}
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