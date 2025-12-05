'use client';

import { useState, useEffect } from 'react';
import { Customer, Loan, EMIHistory } from '@/src/types/dataEntry';
import { formatDateToDDMMYYYY } from '@/src/utils/dateCalculations';
import { calculateEMICompletion } from '@/src/utils/loanCalculations';

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
  status?: 'paid' | 'partial' | 'missed' | 'advance' | 'due';
  amount?: number;
  loanNumbers?: string[];
}

interface EMIStatusInfo {
  status: 'paid' | 'partial' | 'missed' | 'advance' | 'due';
  amount: number;
  loanNumbers: string[];
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
  const [isLoading, setIsLoading] = useState(false);

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
    }
  }, [customer]);

  // Generate calendar days for selected month
  useEffect(() => {
    if (!customerLoans || customerLoans.length === 0) {
      setCalendarDays([]);
      return;
    }

    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const days: CalendarDay[] = [];

    // Get all EMI due dates for the month
    const emiDueDates = new Set<string>();
    const emiStatusMap = new Map<string, EMIStatusInfo>();

    customerLoans.forEach(loan => {
      if (!loan.nextEmiDate || !loan.loanType || !loan.emiAmount) return;

      // Generate EMI schedule for the month
      const startDate = new Date(loan.emiStartDate || loan.dateApplied);
      const today = new Date();
      const monthStart = new Date(selectedYear, selectedMonth, 1);
      const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);

      // Calculate daily, weekly, or monthly EMI dates
      let currentDate = new Date(startDate);
      
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
            const loanNumber = loan.loanNumber || 'L1';
            
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
              
              emiStatusMap.set(dateKey, {
                status,
                amount: (existing?.amount || 0) + payment.amount,
                loanNumbers: [...(existing?.loanNumbers || []), loanNumber]
              });
            } else {
              // No payment found, mark as due or missed
              const status: EMIStatusInfo['status'] = currentDate < today ? 'missed' : 'due';
              emiStatusMap.set(dateKey, {
                status,
                amount: existing?.amount || 0,
                loanNumbers: [...(existing?.loanNumbers || []), loanNumber]
              });
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (loan.loanType === 'Weekly') {
        // Weekly EMI - every 7 days
        while (currentDate <= monthEnd) {
          if (currentDate >= monthStart && currentDate <= monthEnd) {
            const dateKey = currentDate.toISOString().split('T')[0];
            emiDueDates.add(dateKey);
            
            const payment = loan.emiHistory?.find(p => {
              if (!p.paymentDate) return false;
              const paymentDate = new Date(p.paymentDate);
              return paymentDate.toISOString().split('T')[0] === dateKey;
            });
            
            const existing = emiStatusMap.get(dateKey);
            const loanNumber = loan.loanNumber || 'L1';
            
            if (payment) {
              let status: EMIStatusInfo['status'] = 'due';
              if (payment.status === 'Paid') {
                status = 'paid';
              } else if (payment.status === 'Partial') {
                status = 'partial';
              } else if (payment.status === 'Advance') {
                status = 'advance';
              }
              
              emiStatusMap.set(dateKey, {
                status,
                amount: (existing?.amount || 0) + payment.amount,
                loanNumbers: [...(existing?.loanNumbers || []), loanNumber]
              });
            } else {
              const status: EMIStatusInfo['status'] = currentDate < today ? 'missed' : 'due';
              emiStatusMap.set(dateKey, {
                status,
                amount: existing?.amount || 0,
                loanNumbers: [...(existing?.loanNumbers || []), loanNumber]
              });
            }
          }
          currentDate.setDate(currentDate.getDate() + 7);
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
          const loanNumber = loan.loanNumber || 'L1';
          
          if (payment) {
            let status: EMIStatusInfo['status'] = 'due';
            if (payment.status === 'Paid') {
              status = 'paid';
            } else if (payment.status === 'Partial') {
              status = 'partial';
            } else if (payment.status === 'Advance') {
              status = 'advance';
            }
            
            emiStatusMap.set(dateKey, {
              status,
              amount: (existing?.amount || 0) + payment.amount,
              loanNumbers: [...(existing?.loanNumbers || []), loanNumber]
            });
          } else {
            const status: EMIStatusInfo['status'] = emiDate < today ? 'missed' : 'due';
            emiStatusMap.set(dateKey, {
              status,
              amount: existing?.amount || 0,
              loanNumbers: [...(existing?.loanNumbers || []), loanNumber]
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

      days.push({
        date,
        isEmiDue,
        isWeekend,
        isToday,
        isPast,
        status: emiInfo?.status,
        amount: emiInfo?.amount,
        loanNumbers: emiInfo?.loanNumbers
      });
    }

    setCalendarDays(days);
  }, [selectedMonth, selectedYear, customerLoans]);

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
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partial': return 'Partial';
      case 'advance': return 'Advance';
      case 'missed': return 'Missed';
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
                Customer Number: {customer.customerNumber} • Active Loans: {customerLoans.length}
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
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigateMonth('prev')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ← Previous Month
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {monthNames[selectedMonth]} {selectedYear}
            </h2>
            <button
              onClick={() => navigateMonth('next')}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Next Month →
            </button>
          </div>

          {/* Active Loans Summary */}
          {customerLoans.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Active Loans</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {customerLoans.map((loan, index) => {
                  const completion = calculateEMICompletion(loan);
                  return (
                    <div key={loan._id || index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{loan.loanNumber || `Loan ${index + 1}`}</p>
                          <p className="text-sm text-gray-600">EMI: ₹{loan.emiAmount} ({loan.loanType})</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          loan.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {loan.status}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>Progress</span>
                          <span>{completion.completionPercentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{width: `${Math.min(completion.completionPercentage, 100)}%`}}
                          ></div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        <p>Next EMI: {loan.nextEmiDate ? formatDateToDDMMYYYY(loan.nextEmiDate) : 'N/A'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                    className={`min-h-[100px] p-2 border border-gray-200 ${
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
                        {day.isEmiDue && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full border ${getStatusColor(day.status)}`}>
                            {getStatusText(day.status)}
                          </span>
                        )}
                      </div>

                      {day.isEmiDue && (
                        <div className="mt-auto">
                          <div className="text-xs text-gray-600">
                            <div className="font-medium">EMI Due</div>
                            {day.amount && day.amount > 0 && (
                              <div className="text-green-600">₹{day.amount}</div>
                            )}
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
                <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded mr-2"></div>
                <span className="text-sm text-gray-700">Today</span>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-200">
          <div className="flex justify-between">
            <div className="text-sm text-gray-600">
              Showing EMI schedule for {monthNames[selectedMonth]} {selectedYear}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Close Calendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}