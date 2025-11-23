/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Interfaces for TypeScript
interface Customer {
  _id: string;
  id?: string;
  name: string;
  phone: string[];
  businessName: string;
  area: string;
  customerNumber?: string;
  loanAmount?: number;
  emiAmount?: number;
  loanType?: string;
  status?: string;
  userId?: string;
  email?: string;
  address?: string;
  businessType?: string;
  isActive?: boolean;
  createdAt?: string;
  profilePicture?: string;
  fiDocuments?: {
    shop?: string;
    home?: string;
  };
  category?: string;
  officeCategory?: string;
  whatsappNumber?: string;
}

interface Loan {
  _id: string;
  customerId: string;
  customerName: string;
  customerNumber: string;
  loanNumber: string;
  amount: number;
  emiAmount: number;
  loanType: string;
  dateApplied: string;
  emiStartDate?: string; // ADD THIS LINE
  loanDays: number;
  status?: string;
  createdBy?: string;
  createdAt?: string;
  totalEmiCount: number;
  emiPaidCount: number;
  lastEmiDate: string;
  nextEmiDate: string;
  totalPaidAmount: number;
  remainingAmount: number;
  emiHistory: EMIHistory[];
  isFallback?: boolean; 
}

interface EMIHistory {
  _id?: string;
  paymentDate: string;
  amount: number;
  status: string;
  collectedBy: string;
  notes?: string;
  createdAt?: string;
  customerNumber?: string;
  loanNumber?: string;
  loanId?: string;
  // Add these for advance payments
  paymentType?: 'single' | 'advance';
  isAdvancePayment?: boolean;
  advanceFromDate?: string;
  advanceToDate?: string;
  advanceEmiCount?: number;
  advanceTotalAmount?: number;
  // Add these for edit/delete functionality
  customerId?: string;
  customerName?: string;
}

interface CustomerDetails {
  _id: string;
  name: string;
  phone: string[];
  businessName: string;
  area: string;
  customerNumber: string;
  loanAmount: number;
  emiAmount: number;
  loanType: string;
  address: string;
  status: string;
  email?: string;
  businessType?: string;
  createdAt?: string;
  profilePicture?: string;
  fiDocuments?: {
    shop?: string;
    home?: string;
  };
  category?: string;
  officeCategory?: string;
  loans?: Loan[];
  whatsappNumber?: string;
}

interface Request {
  _id: string;
  type: string;
  customerName: string;
  status: string;
  createdAt: string;
  data?: any;
  description?: string;
  customerNumber?: string;
  loanNumber?: string;
}

interface TodayStats {
  emiCollected: number;
  newCustomers: number;
  pendingRequests: number;
  totalCollection: number;
}

interface NewCustomerStep1 {
  name: string;
  phone: string[];
  whatsappNumber: string;
  businessName: string;
  area: string;
  customerNumber: string;
  address: string;
  category: string;
  officeCategory: string;
  profilePicture: File | null;
  fiDocuments: {
    shop: File | null;
    home: File | null;
  };
  // Add index signature to fix TypeScript error
  [key: string]: any;
}

interface NewCustomerStep2 {
  loanDate: string;
  emiStartDate: string;
  loanAmount: string;
  emiAmount: string;
  loanDays: string;
  loanType: string;
  emiType: 'fixed' | 'custom';
  customEmiAmount?: string;
  // Add index signature to fix TypeScript error
  [key: string]: any;
}

interface NewCustomerStep3 {
  loginId: string;
  password: string;
  confirmPassword: string;
  // Add index signature to fix TypeScript error
  [key: string]: any;
}

interface Filters {
  status: string;
  officeCategory: string;
}

interface RenewLoanData {
  loanId: string;
  customerId: string;
  customerName: string;
  customerNumber: string;
  loanNumber: string;
  renewalDate: string;
  newLoanAmount: string;
  newEmiAmount: string;
  newLoanDays: string;
  newLoanType: string;
  remarks: string;
  // Add these new fields to match Add Loan structure
  emiStartDate: string;
  emiType: 'fixed' | 'custom';
  customEmiAmount?: string;
}

interface EMIUpdate {
  customerId: string;
  customerName: string;
  paymentDate: string;
  amount: string;
  status: string;
  collectedBy: string;
  loanId?: string;
  customerNumber?: string;
  loanNumber?: string;
  notes?: string;
  // Add these new fields for advance EMI
  paymentType: 'single' | 'advance';
  advanceFromDate?: string;
  advanceToDate?: string;
  advanceEmiCount?: string;
  advanceTotalAmount?: string;
}

interface EditCustomerData {
  name: string;
  phone: string[];
  whatsappNumber: string;
  businessName: string;
  area: string;
  customerNumber: string;
  loanAmount: string;
  emiAmount: string;
  loanType: string;
  address: string;
  customerId: string;
  category: string;
  officeCategory: string;
}

interface EditLoanData {
  loanId: string;
  customerId: string;
  customerName: string;
  customerNumber: string;
  loanNumber: string;
  amount: string;
  emiAmount: string;
  loanType: string;
  dateApplied: string;
  loanDays: string;
  originalData?: {
    amount: number;
    emiAmount: number;
    loanType: string;
    dateApplied: string;
    loanDays: number;
  };
}

interface Filters {
  customerNumber: string;
  loanType: string;
  status: string;
  officeCategory: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  emiStatus?: 'paid' | 'due' | 'overdue' | 'partial' | 'upcoming' | 'none';
  emiAmount?: number;
  loanNumbers?: string[];
  paymentHistory?: EMIHistory[]; // Make sure this is included
}

interface EMICalendarData {
  customerId: string;
  customerName: string;
  loans: Loan[];
  paymentHistory: EMIHistory[];
}

const formatDateToDDMMYYYY = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

const formatDateForInput = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export default function DataEntryDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showUpdateEMI, setShowUpdateEMI] = useState(false);
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newLoanData, setNewLoanData] = useState({
  loanAmount: '',
  loanDate: new Date().toISOString().split('T')[0],
  emiStartDate: new Date().toISOString().split('T')[0],
  emiAmount: '',
  loanType: 'Monthly',
  loanDays: '30',
  emiType: 'fixed' as 'fixed' | 'custom',
  customEmiAmount: ''
});
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [showEditLoan, setShowEditLoan] = useState(false);
  const [showRenewLoan, setShowRenewLoan] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [editCustomerData, setEditCustomerData] = useState<EditCustomerData>({
    name: '',
    phone: [''],
    whatsappNumber: '',
    businessName: '',
    area: '',
    customerNumber: '',
    loanAmount: '',
    emiAmount: '',
    loanType: 'Daily',
    address: '',
    customerId: '',
    category: 'A',
    officeCategory: 'Office 1'
  });
    const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectionData, setCollectionData] = useState<{
    date: string;
    customers: Array<{
      customerId: string;
      customerNumber: string;
      customerName: string;
      totalCollection: number;
      officeCategory: string;
      loans: Array<{
        loanNumber: string;
        emiAmount: number;
        collectedAmount: number;
      }>;
    }>;
    summary: {
      totalCollection: number;
      office1Collection: number;
      office2Collection: number;
      totalCustomers: number;
    };
  } | null>(null);
  const [isLoadingCollection, setIsLoadingCollection] = useState(false);
  const [editLoanData, setEditLoanData] = useState<EditLoanData>({
    loanId: '',
    customerId: '',
    customerName: '',
    customerNumber: '',
    loanNumber: '',
    amount: '',
    emiAmount: '',
    loanType: 'Daily',
    dateApplied: new Date().toISOString().split('T')[0],
    loanDays: '',
  });

  const [requestFilters, setRequestFilters] = useState({
    type: 'all',
    dateSort: 'latest',
    status: 'all'
  });

  const [renewLoanData, setRenewLoanData] = useState<RenewLoanData>({
  loanId: '',
  customerId: '',
  customerName: '',
  customerNumber: '',
  loanNumber: '',
  renewalDate: new Date().toISOString().split('T')[0],
  newLoanAmount: '',
  newEmiAmount: '',
  newLoanDays: '',
  newLoanType: 'Monthly',
  remarks: '',
  // Add new fields
  emiStartDate: new Date().toISOString().split('T')[0],
  emiType: 'fixed',
  customEmiAmount: ''
});
  
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    customerNumber: '',
    loanType: '',
    status: '',
    officeCategory: ''
  });
  
  const [todayStats, setTodayStats] = useState<TodayStats>({
    emiCollected: 0,
    newCustomers: 0,
    pendingRequests: 0,
    totalCollection: 0
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<NewCustomerStep1>({
  name: '',
  phone: ['', ''],
  whatsappNumber: '',
  businessName: '',
  area: '',
  customerNumber: '',
  address: '',
  category: 'A', // Default value
  officeCategory: 'Office 1', // Default value
  profilePicture: null,
  fiDocuments: {
    shop: null,
    home: null
  }
});
  const [step2Data, setStep2Data] = useState<NewCustomerStep2>({
    loanDate: new Date().toISOString().split('T')[0],
    emiStartDate: new Date().toISOString().split('T')[0],
    loanAmount: '',
    emiAmount: '',
    loanDays: '',
    loanType: 'Daily',
    emiType: 'fixed',
    customEmiAmount: '',
  });
  const [step3Data, setStep3Data] = useState<NewCustomerStep3>({
    loginId: '',
    password: '',
    confirmPassword: ''
  });
  const [step1Errors, setStep1Errors] = useState<{[key: string]: string}>({});
  const [step2Errors, setStep2Errors] = useState<{[key: string]: string}>({});
  const [step3Errors, setStep3Errors] = useState<{[key: string]: string}>({});

  const [emiUpdate, setEmiUpdate] = useState<EMIUpdate>({
  customerId: '',
  customerName: '',
  paymentDate: new Date().toISOString().split('T')[0],
  amount: '',
  status: 'Paid',
  collectedBy: 'Operator 1',
  paymentType: 'single' // Add this default
});

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);

  const [showEMICalendar, setShowEMICalendar] = useState(false);
  const [calendarData, setCalendarData] = useState<EMICalendarData | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [showDatePaymentHistory, setShowDatePaymentHistory] = useState(false);
  const [editingPayment, setEditingPayment] = useState<EMIHistory | null>(null);
const [editStatus, setEditStatus] = useState('Paid');
const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
const [deletingPayment, setDeletingPayment] = useState<EMIHistory | null>(null);
const [showDeleteConfirmationModal, setShowDeleteConfirmationModal] = useState(false);
const [emiSearchQuery, setEmiSearchQuery] = useState('');
const [emiSortOrder, setEmiSortOrder] = useState<'asc' | 'desc'>('asc');
const [customerSortOrder, setCustomerSortOrder] = useState<'asc' | 'desc'>('asc');
const [selectedCustomerForEMI, setSelectedCustomerForEMI] = useState<Customer | null>(null);
  const [calendarFilter, setCalendarFilter] = useState<{
    emiStatus: 'all' | 'paid' | 'due' | 'overdue' | 'partial' | 'upcoming';
    loanFilter: 'all' | string;
  }>({
    emiStatus: 'all',
    loanFilter: 'all'
  });

  // Add these state variables with your other useState declarations
const [editingFields, setEditingFields] = useState<{[key: string]: boolean}>({});
const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
const [editAmount, setEditAmount] = useState('');
const [editDate, setEditDate] = useState('');

  const calculateEMICompletion = (loan: Loan) => {
  // Use actual values from the loan object
  const totalEmiCount = loan.totalEmiCount || loan.loanDays || 30;
  const emiPaidCount = loan.emiPaidCount || 0;
  const totalPaidAmount = loan.totalPaidAmount || 0;
  
  // Calculate total loan amount (EMI amount × total EMI count)
  const totalLoanAmount = loan.emiAmount * totalEmiCount;
  
  const completionPercentage = (emiPaidCount / totalEmiCount) * 100;
  const isCompleted = emiPaidCount >= totalEmiCount;
  const remainingEmis = Math.max(totalEmiCount - emiPaidCount, 0);
  
  // Calculate remaining amount based on total loan amount
  const remainingAmount = Math.max(totalLoanAmount - totalPaidAmount, 0);
  
  return {
    completionPercentage: Math.min(completionPercentage, 100), // Cap at 100%
    isCompleted,
    remainingEmis,
    totalPaid: totalPaidAmount,
    remainingAmount,
    totalLoanAmount // Return total loan amount for display
  };
};

const calculatePaymentBehavior = (loan: Loan) => {
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
    const dueDate = new Date(calculateNextEmiDate(loan.lastEmiDate, loan.loanType));
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

  const calculateTotalLoanAmount = (loan: Loan): number => {
    return loan.emiAmount * loan.totalEmiCount;
  };

  // Helper function to calculate EMI count based on dates and loan type
const calculateEmiCount = (fromDate: string, toDate: string, loanType?: string): string => {
  if (!fromDate || !toDate) return '1';
  
  const start = new Date(fromDate);
  const end = new Date(toDate);
  
  if (start > end) return '1';
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  switch(loanType) {
    case 'Daily':
      return Math.max(diffDays + 1, 1).toString();
    case 'Weekly':
      return Math.max(Math.ceil((diffDays + 1) / 7), 1).toString();
    case 'Monthly':
      // Approximate month calculation
      const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      return Math.max(months + 1, 1).toString();
    default:
      return Math.max(diffDays + 1, 1).toString();
  }
};

// Helper function to calculate total amount with proper type handling
const calculateTotalAmount = (emiAmount: string | number, emiCount: string | number): string => {
  const amount = typeof emiAmount === 'string' ? parseFloat(emiAmount) || 0 : emiAmount;
  const count = typeof emiCount === 'string' ? parseInt(emiCount) || 1 : emiCount;
  return (amount * count).toFixed(2);
};



  // Fix the calculateNextEmiDate function
const calculateNextEmiDate = (currentDate: string, loanType: string): string => {
  const date = new Date(currentDate);
  
  // Ensure we're working with the correct date (remove time component)
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

// Fix the calendar generation logic in generateCalendar function
// Fix the calendar generation logic in generateCalendar function
const generateCalendar = (month: Date, loans: Loan[], paymentHistory: EMIHistory[], loanFilter: string = 'all'): CalendarDay[] => {
  const days: CalendarDay[] = [];
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  
  const filteredLoans = loanFilter === 'all' 
    ? loans 
    : loans.filter(loan => loan._id === loanFilter || loan.loanNumber === loanFilter);
  
  const filteredPaymentHistory = loanFilter === 'all'
    ? paymentHistory
    : paymentHistory.filter(payment => 
        payment.loanId === loanFilter || payment.loanNumber === loanFilter
      );

  console.log('📅 Calendar Debug:', {
    month: month.toISOString(),
    loansCount: filteredLoans.length,
    paymentHistoryCount: filteredPaymentHistory.length,
    loanFilter
  });

  // Create a comprehensive map of ALL payments for quick lookup
  const paymentMap: { [key: string]: { 
    payments: EMIHistory[]; 
    totalAmount: number; 
    loanNumbers: string[] 
  } } = {};
  
  filteredPaymentHistory.forEach(payment => {
    const paymentDate = new Date(payment.paymentDate);
    // Fix: Use proper date comparison without time component
    paymentDate.setHours(0, 0, 0, 0);
    
    if (paymentDate.getMonth() === monthIndex && paymentDate.getFullYear() === year) {
      const dateStr = paymentDate.toISOString().split('T')[0];
      
      if (!paymentMap[dateStr]) {
        paymentMap[dateStr] = { 
          payments: [], 
          totalAmount: 0, 
          loanNumbers: [] 
        };
      }
      
      paymentMap[dateStr].payments.push(payment);
      
      // FIX: For advance payments, use the actual payment amount, not divided amount
      if (payment.paymentType === 'advance' && payment.advanceEmiCount && payment.advanceEmiCount > 1) {
        // For advance payments, show the total amount on the payment date
        paymentMap[dateStr].totalAmount += payment.amount;
      } else {
        // For single payments, use the normal amount
        paymentMap[dateStr].totalAmount += payment.amount;
      }
      
      if (payment.loanNumber && !paymentMap[dateStr].loanNumbers.includes(payment.loanNumber)) {
        paymentMap[dateStr].loanNumbers.push(payment.loanNumber);
      }
    }

    // FIX: Handle advance payments - mark all dates in the advance period as paid
if (payment.paymentType === 'advance' && payment.advanceFromDate && payment.advanceToDate) {
  const fromDate = new Date(payment.advanceFromDate);
  const toDate = new Date(payment.advanceToDate);
  
  const currentDate = new Date(fromDate); // Use const since we modify the same object
  while (currentDate <= toDate) {
    if (currentDate.getMonth() === monthIndex && currentDate.getFullYear() === year) {
      const advanceDateStr = currentDate.toISOString().split('T')[0];
      
      if (!paymentMap[advanceDateStr]) {
        paymentMap[advanceDateStr] = { 
          payments: [], 
          totalAmount: 0, 
          loanNumbers: [] 
        };
      }
      
      // Only add the payment record once to avoid duplicates
      if (!paymentMap[advanceDateStr].payments.some(p => p._id === payment._id)) {
        paymentMap[advanceDateStr].payments.push(payment);
      }
      
      // For each day in advance period, show the individual EMI amount, not divided total
      const individualEmiAmount = payment.advanceEmiCount && payment.advanceEmiCount > 0 
        ? payment.amount / payment.advanceEmiCount 
        : payment.amount;
      
      paymentMap[advanceDateStr].totalAmount += individualEmiAmount;
      
      if (payment.loanNumber && !paymentMap[advanceDateStr].loanNumbers.includes(payment.loanNumber)) {
        paymentMap[advanceDateStr].loanNumbers.push(payment.loanNumber);
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1); // Modify the existing object
    
    // Break if we've processed too many days (safety check)
    if (currentDate > toDate) break;
  }
}
  });

  // Generate calendar grid for previous month days
  const startingDayOfWeek = firstDay.getDay();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, monthIndex, -i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: false,
      emiStatus: 'none'
    });
  }
  
  // Generate days for current month - FIXED DATE HANDLING
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, monthIndex, day);
    date.setHours(0, 0, 0, 0); // Normalize time component
    
    const isToday = date.toDateString() === new Date().toDateString();
    const dateStr = date.toISOString().split('T')[0];
    
    let emiStatus: CalendarDay['emiStatus'] = 'none';
    let emiAmount = 0;
    const loanNumbers: string[] = [];
    const datePayments: EMIHistory[] = [];

    // PRIORITY 1: Check if there are ACTUAL PAYMENTS for this date
    const paymentInfo = paymentMap[dateStr];
    if (paymentInfo && paymentInfo.payments.length > 0) {
      console.log(`✅ Found payments for ${dateStr}:`, paymentInfo);
      emiStatus = 'paid';
      emiAmount = paymentInfo.totalAmount;
      loanNumbers.push(...paymentInfo.loanNumbers);
      datePayments.push(...paymentInfo.payments);
    } 
    // PRIORITY 2: Check if there are due EMIs (only if no payments exist)
    else {
      let hasDueEMI = false;
      let totalDueAmount = 0;
      const dueLoanNumbers: string[] = [];

      filteredLoans.forEach(loan => {
        if (loan.emiPaidCount >= loan.totalEmiCount) return;

        const startDate = new Date(loan.emiStartDate || loan.dateApplied);
        startDate.setHours(0, 0, 0, 0); // Normalize start date
        const loanType = loan.loanType;

        console.log(`🔍 Checking loan ${loan.loanNumber} from ${startDate.toISOString()}`);

// Generate EMI schedule for this loan - FIXED LOGIC
const currentDate = new Date(startDate); // Use const since we modify the same object

for (let i = 0; i < loan.totalEmiCount; i++) {
  const emiDate = new Date(currentDate);
  emiDate.setHours(0, 0, 0, 0);
  const emiDateStr = emiDate.toISOString().split('T')[0];
  
  // Check if this EMI date matches the current calendar date
  if (emiDateStr === dateStr) {
    console.log(`📅 Due EMI found for ${dateStr}: Loan ${loan.loanNumber}, EMI ${i + 1}`);
    hasDueEMI = true;
    totalDueAmount += loan.emiAmount;
    dueLoanNumbers.push(loan.loanNumber);
    break;
  }

  // Calculate next EMI date by modifying the currentDate object
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
  currentDate.setHours(0, 0, 0, 0);

  // Stop if we've gone beyond the current month
  if (currentDate.getMonth() > monthIndex || currentDate.getFullYear() > year) {
    break;
  }
}
      });

      if (hasDueEMI) {
        emiAmount = totalDueAmount;
        loanNumbers.push(...dueLoanNumbers);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const calendarDate = new Date(date);
        calendarDate.setHours(0, 0, 0, 0);
        
        if (calendarDate < today) {
          emiStatus = 'overdue';
          console.log(`⚠️ Overdue EMI for ${dateStr}`);
        } else if (calendarDate.getTime() === today.getTime()) {
          emiStatus = 'due';
          console.log(`📅 Due EMI for ${dateStr}`);
        } else {
          emiStatus = 'upcoming';
          console.log(`🔔 Upcoming EMI for ${dateStr}`);
        }
      } else {
        console.log(`➖ No EMI activity for ${dateStr}`);
      }
    }

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

  const getStatusColor = (status: CalendarDay['emiStatus']) => {
  switch (status) {
    case 'paid': 
      return 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200';
    case 'due': 
      return 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200';
    case 'overdue': 
      return 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200';
    case 'partial': 
      return 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200';
    case 'upcoming': 
      return 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200';
    default: 
      return 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100';
  }
};

  const getStatusIcon = (status: CalendarDay['emiStatus']) => {
    switch (status) {
      case 'paid': return '✅';
      case 'due': return '📅';
      case 'overdue': return '⚠️';
      case 'partial': return '💰';
      case 'upcoming': return '🔔';
      default: return '';
    }
  };

  const handleViewEMICalendar = async (customer: Customer) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/data-entry/customers/${customer._id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const customerDetails = data.data;
          const displayLoans = getAllCustomerLoans(customer, customerDetails);
          
          setCalendarData({
            customerId: customer._id,
            customerName: customer.name,
            loans: displayLoans,
            paymentHistory: displayLoans.flatMap(loan => loan.emiHistory || [])
          });

          setCalendarFilter({
            emiStatus: 'all',
            loanFilter: 'all'
          });
          
          setShowEMICalendar(true);
        }
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
      const displayLoans = getAllCustomerLoans(customer, null);
      setCalendarData({
        customerId: customer._id,
        customerName: customer.name,
        loans: displayLoans,
        paymentHistory: []
      });
      setCalendarFilter({
        emiStatus: 'all',
        loanFilter: 'all'
      });
      setShowEMICalendar(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalendarDateClick = (day: CalendarDay) => {
  if (day.paymentHistory && day.paymentHistory.length > 0) {
    setSelectedCalendarDate(day.date);
    setShowDatePaymentHistory(true);
  } else if (day.emiStatus === 'due' || day.emiStatus === 'overdue') {
    const dueLoans = calendarData?.loans.filter(loan => 
      loan.nextEmiDate === day.date.toISOString().split('T')[0]
    );
    
    if (dueLoans && dueLoans.length > 0 && selectedCustomer) {
      setSelectedLoanForPayment(dueLoans[0]);
      setEmiUpdate(prev => ({
        ...prev,
        customerId: selectedCustomer._id || '',
        customerName: selectedCustomer.name || '',
        loanId: dueLoans[0]._id,
        customerNumber: dueLoans[0].customerNumber,
        loanNumber: dueLoans[0].loanNumber,
        amount: dueLoans[0].emiAmount.toString(),
        paymentDate: day.date.toISOString().split('T')[0]
      }));
      setShowPaymentForm(true);
      setShowEMICalendar(false);
    }
  }
};


  const handleEditPastEMI = (payment: EMIHistory) => {
  const editRequest = {
    type: 'EMI Correction',
    customerId: calendarData?.customerId,
    customerName: calendarData?.customerName,
    originalPayment: payment,
    requestedChanges: {
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      status: payment.status
    },
    reason: 'Data correction required'
  };
  
  submitEditRequest(editRequest);
  alert('EMI correction request submitted for admin approval');
  setShowDatePaymentHistory(false);
};

  const submitEditRequest = async (requestData: any) => {
    try {
      const response = await fetch('/api/data-entry/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...requestData,
          status: 'Pending',
          createdBy: 'data_entry_operator_1',
          createdByRole: 'data_entry'
        }),
      });
      
      if (response.ok) {
        fetchPendingRequests();
      }
    } catch (error) {
      console.error('Error submitting edit request:', error);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchQuery === '' || 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.customerNumber && customer.customerNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCustomerNumber = filters.customerNumber === '' || 
      (customer.customerNumber && customer.customerNumber.toLowerCase().includes(filters.customerNumber.toLowerCase()));
    
    const matchesLoanType = filters.loanType === '' || 
      customer.loanType === filters.loanType;
    
    const matchesStatus = filters.status === '' || 
      customer.status === filters.status;

    const matchesOfficeCategory = filters.officeCategory === '' || 
      customer.officeCategory === filters.officeCategory;

    return matchesSearch && matchesCustomerNumber && matchesLoanType && matchesStatus && matchesOfficeCategory;
  });

  const getAllCustomerLoans = (customer: Customer, customerDetails: CustomerDetails | null): Loan[] => {
  const loans: Loan[] = [];
  
  console.log('🔄 getAllCustomerLoans called with:', {
    customer: {
      id: customer._id,
      name: customer.name
    },
    customerDetails: customerDetails ? {
      loans: customerDetails.loans,
      loansCount: customerDetails.loans?.length
    } : 'null'
  });

  // Use loans from customerDetails if available
  if (customerDetails?.loans && Array.isArray(customerDetails.loans)) {
    console.log(`📊 Processing ${customerDetails.loans.length} loans from customerDetails`);
    
    customerDetails.loans.forEach((loan: any, index) => {
      // Only include loans that have valid database IDs
      if (loan._id && loan._id.length === 24 && /^[0-9a-fA-F]{24}$/.test(loan._id.replace(/_default$/, ''))) {
        const cleanLoanId = loan._id.replace(/_default$/, '');
        
        // CRITICAL DEBUG: Check what's actually in the database
        console.log(`🚨 DEBUG Loan ${loan.loanNumber}:`, {
          // Database fields
          nextEmiDate: loan.nextEmiDate,
          emiStartDate: loan.emiStartDate,
          lastEmiDate: loan.lastEmiDate,
          dateApplied: loan.dateApplied,
          
          // Payment indicators
          emiPaidCount: loan.emiPaidCount,
          totalPaidAmount: loan.totalPaidAmount,
          emiHistoryCount: loan.emiHistory?.length || 0,
          
          // Loan details
          loanType: loan.loanType,
          amount: loan.amount,
          emiAmount: loan.emiAmount
        });

        // SIMPLE FIX: Always calculate next EMI date based on actual data
        let nextEmiDate;
        
        // Check if EMIs have been paid using ALL indicators
        const hasPaidEMIs = (loan.emiPaidCount > 0) || 
                           (loan.totalPaidAmount > 0) ||
                           (loan.emiHistory && loan.emiHistory.length > 0);
        
        console.log(`🔍 Loan ${loan.loanNumber} Payment Status:`, {
          hasPaidEMIs,
          emiPaidCount: loan.emiPaidCount,
          totalPaidAmount: loan.totalPaidAmount,
          emiHistoryCount: loan.emiHistory?.length || 0
        });

        if (hasPaidEMIs) {
          // EMIs HAVE been paid - calculate from lastEmiDate
          if (loan.lastEmiDate && loan.lastEmiDate !== loan.dateApplied) {
            nextEmiDate = calculateNextEmiDate(loan.lastEmiDate, loan.loanType);
            console.log(`💰 Loan ${loan.loanNumber}: EMIs PAID, calculating from lastEmiDate:`, {
              lastEmiDate: loan.lastEmiDate,
              calculatedNextEmiDate: nextEmiDate
            });
          } else {
            // Fallback: Use emiStartDate and add one period
            nextEmiDate = calculateNextEmiDate(loan.emiStartDate || loan.dateApplied, loan.loanType);
            console.log(`⚠️ Loan ${loan.loanNumber}: EMIs PAID but no valid lastEmiDate, calculating from emiStartDate:`, {
              emiStartDate: loan.emiStartDate,
              calculatedNextEmiDate: nextEmiDate
            });
          }
        } else {
          // NO EMIs paid - use EMI start date
          nextEmiDate = loan.emiStartDate || loan.dateApplied;
          console.log(`🆕 Loan ${loan.loanNumber}: NO EMIs paid, using emiStartDate:`, nextEmiDate);
        }
        
        const enhancedLoan: Loan = {
          ...loan,
          _id: cleanLoanId,
          loanNumber: loan.loanNumber || `L${index + 1}`,
          totalEmiCount: loan.totalEmiCount || loan.loanDays || 30,
          emiPaidCount: loan.emiPaidCount || 0,
          lastEmiDate: loan.lastEmiDate || loan.dateApplied,
          nextEmiDate: nextEmiDate, // Use our calculated date
          totalPaidAmount: loan.totalPaidAmount || 0,
          remainingAmount: loan.remainingAmount || loan.amount,
          emiHistory: loan.emiHistory || [],
          status: loan.status || 'active',
          emiStartDate: loan.emiStartDate || loan.dateApplied
        };
        
        loans.push(enhancedLoan);
      } else {
        console.log(`⚠️ Skipping loan ${index + 1} - invalid or temporary ID:`, loan._id);
      }
    });
  }
  
  // Fallback loan creation
  if (loans.length === 0 && customer.loanAmount && !customerDetails) {
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
      isFallback: true
    };
    loans.push(fallbackLoan);
  }
  
  return loans;
};
  const validateStep1 = () => {
    const errors: {[key: string]: string} = {};
    
    if (!step1Data.name.trim()) {
      errors.name = 'Customer name is required';
    }
    
    // Only validate primary phone (index 0)
    if (!step1Data.phone[0] || !/^\d{10}$/.test(step1Data.phone[0])) {
      errors.phone = 'Valid primary phone number is required (10 digits)';
    }

    // Validate secondary phone if provided
    if (step1Data.phone[1] && !/^\d{10}$/.test(step1Data.phone[1])) {
      errors.phone = 'Secondary phone number must be a valid 10-digit number';
    }

    if (step1Data.whatsappNumber && !/^\d{10}$/.test(step1Data.whatsappNumber)) {
      errors.whatsappNumber = 'WhatsApp number must be a valid 10-digit number';
    }
    
    if (!step1Data.businessName.trim()) {
      errors.businessName = 'Business name is required';
    }
    
    if (!step1Data.area.trim()) {
      errors.area = 'Area is required';
    }
    
    if (!step1Data.customerNumber.trim()) {
      errors.customerNumber = 'Customer number is required';
    }
    
    if (!step1Data.address.trim()) {
      errors.address = 'Address is required';
    }

    if (!step1Data.category) {
      errors.category = 'Category is required';
    }
    
    if (!step1Data.officeCategory) {
      errors.officeCategory = 'Office category is required';
    }
    
    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors: {[key: string]: string} = {};
    
    if (!step2Data.loanDate) {
      errors.loanDate = 'Loan date is required';
    }
    
    if (!step2Data.emiStartDate) {
      errors.emiStartDate = 'EMI starting date is required';
    } else if (new Date(step2Data.emiStartDate) < new Date(step2Data.loanDate)) {
      errors.emiStartDate = 'EMI start date cannot be before loan date';
    }
    
    const loanAmount = Number(step2Data.loanAmount);
    if (!step2Data.loanAmount || isNaN(loanAmount) || loanAmount <= 0) {
      errors.loanAmount = 'Valid loan amount is required';
    }
    
    const emiAmount = Number(step2Data.emiAmount);
    if (!step2Data.emiAmount || isNaN(emiAmount) || emiAmount <= 0) {
      errors.emiAmount = 'Valid EMI amount is required';
    }
    
    const loanDays = Number(step2Data.loanDays);
    if (!step2Data.loanDays || isNaN(loanDays) || loanDays <= 0) {
      errors.loanDays = 'Valid number of days is required';
    }
    
    if (!step2Data.loanType) {
      errors.loanType = 'Loan type is required';
    }
    
    setStep2Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!step3Data.loginId.trim()) {
      errors.loginId = 'Login ID is required';
    }
    
    if (!step3Data.password) {
      errors.password = 'Password is required';
    } else if (step3Data.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (step3Data.password !== step3Data.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setStep3Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStep1Next = (): void => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleStep2Next = (): void => {
    if (validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleStep2Back = (): void => {
    setCurrentStep(1);
  };

  const handleStep3Back = (): void => {
    setCurrentStep(2);
  };

  const handleFileUpload = (field: string, file: File | null, documentType?: 'shop' | 'home'): void => {
    if (field === 'profilePicture') {
      if (file && !file.type.startsWith('image/')) {
        alert('Please upload an image file (PNG, JPEG, etc.) for profile picture');
        return;
      }
      setStep1Data(prev => ({ ...prev, profilePicture: file }));
    } else if (field === 'fiDocuments' && documentType) {
      if (file && file.type !== 'application/pdf') {
        alert('Please upload a PDF file for FI documents');
        return;
      }
      setStep1Data(prev => ({
        ...prev,
        fiDocuments: {
          ...prev.fiDocuments,
          [documentType]: file
        }
      }));
    }
  };

  const generateLoginId = (): void => {
    const namePart = step1Data.name.replace(/\s+/g, '').toLowerCase().substring(0, 4);
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const loginId = `${namePart}${randomPart}`;
    setStep3Data(prev => ({ ...prev, loginId }));
  };

  const generatePassword = (): void => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setStep3Data(prev => ({ ...prev, password, confirmPassword: password }));
  };

  const resetCustomerForm = (): void => {
  setCurrentStep(1);
  setStep1Data({
    name: '',
    phone: ['', ''],
    whatsappNumber: '',
    businessName: '',
    area: '',
    customerNumber: '',
    address: '',
    category: '',
    officeCategory: '',
    profilePicture: null,
    fiDocuments: {
      shop: null,
      home: null
    }
  });
  setStep2Data({
    loanDate: new Date().toISOString().split('T')[0],
    emiStartDate: new Date().toISOString().split('T')[0],
    loanAmount: '',
    emiAmount: '',
    loanDays: '',
    loanType: 'Daily',
    emiType: 'fixed', // Make sure this has a default value
    customEmiAmount: ''
  });
  setStep3Data({
    loginId: '',
    password: '',
    confirmPassword: ''
  });
  setStep1Errors({});
  setStep2Errors({});
  setStep3Errors({});
};

  const fetchDashboardData = async () => {
    try {
      const statsResponse = await fetch('/api/data-entry/dashboard/stats');
      if (!statsResponse.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsResponse.json();
      setTodayStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers...');
      const response = await fetch('/api/data-entry/customers');
      if (response.ok) {
        const data = await response.json();
        console.log('Customers API response:', data);
        if (data.success) {
          setCustomers(data.data || []);
          console.log('Customers loaded:', data.data?.length || 0);
        }
      } else {
        console.error('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      console.log('🟡 Fetching pending requests...');
      const response = await fetch('/api/data-entry/requests');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🔵 Requests API Response:', data);
      
      if (data.success && data.data && Array.isArray(data.data.requests)) {
        console.log(`✅ Setting ${data.data.requests.length} requests`);
        setPendingRequests(data.data.requests);
      } else {
        console.warn('⚠️ No requests array found in response, setting empty array');
        setPendingRequests([]);
      }
      
    } catch (error) {
      console.error('❌ Error fetching requests:', error);
      setPendingRequests([]);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    if (activeTab === 'customers') fetchCustomers();
    if (activeTab === 'requests') fetchPendingRequests();
    if (activeTab === 'collection') fetchCollectionData(collectionDate);
  }, [activeTab]);

  useEffect(() => {
    if (showUpdateEMI) {
      console.log('EMI modal opened, fetching customers...');
      fetchCustomers();
    }
  }, [showUpdateEMI]);

  const handleViewDetails = async (customer: Customer) => {
    try {
      console.log('🔍 handleViewDetails called with customer:', customer);
      setIsLoading(true);
      
      const customerId = customer._id || customer.id;
      console.log('📋 Customer ID to fetch:', customerId);
      
      if (!customerId) {
        alert('Customer ID not found');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/data-entry/customers/${customerId}`);
      console.log('🌐 API Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('⚠️ Customer not found in API, using basic data');
          console.log('📊 Customer loan data from props:', {
            loanAmount: customer.loanAmount,
            emiAmount: customer.emiAmount,
            loanType: customer.loanType,
            status: customer.status
          });
          
          const customerDetailsData: CustomerDetails = {
            _id: customer._id,
            name: customer.name,
            phone: customer.phone,
            businessName: customer.businessName,
            area: customer.area,
            customerNumber: customer.customerNumber || 'N/A',
            loanAmount: customer.loanAmount || 0,
            emiAmount: customer.emiAmount || 0,
            loanType: customer.loanType || 'Daily',
            address: customer.address || '',
            status: customer.status || 'active',
            email: customer.email,
            businessType: customer.businessType,
            category: customer.category || 'A',
            officeCategory: customer.officeCategory || 'Office 1',
            createdAt: customer.createdAt,
            whatsappNumber: customer.whatsappNumber || '',
            loans: []
          };
          
          setCustomerDetails(customerDetailsData);
          setShowCustomerDetails(true);
          setIsLoading(false);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 API Response data:', data);
      
      if (data.success) {
        console.log('✅ Customer details fetched successfully:', data.data);
        console.log('📊 Loans array from API:', data.data.loans);
        console.log('🔍 Customer loan properties:', {
          loanAmount: data.data.loanAmount,
          emiAmount: data.data.emiAmount,
          loanType: data.data.loanType
        });
        
        // Ensure loans array exists
        const customerData = {
          ...data.data,
          loans: data.data.loans || []
        };
        setCustomerDetails(customerData);
        setShowCustomerDetails(true);
      } else {
        console.error('❌ API returned success:false', data.error);
        alert('Failed to fetch customer details: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('💥 Error in handleViewDetails:', error);
      console.log('📊 Customer loan data from props (error case):', {
        loanAmount: customer.loanAmount,
        emiAmount: customer.emiAmount,
        loanType: customer.loanType
      });
      
      const customerDetailsData: CustomerDetails = {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        businessName: customer.businessName,
        area: customer.area,
        customerNumber: customer.customerNumber || 'N/A',
        loanAmount: customer.loanAmount || 0,
        emiAmount: customer.emiAmount || 0,
        loanType: customer.loanType || 'Daily',
        address: customer.address || '',
        status: customer.status || 'active',
        email: customer.email,
        businessType: customer.businessType,
        category: customer.category || 'A',
        officeCategory: customer.officeCategory || 'Office 1',
        createdAt: customer.createdAt,
        loans: []
      };
      
      setCustomerDetails(customerDetailsData);
      setShowCustomerDetails(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCustomer = (customer: CustomerDetails) => {
  const phoneArray = Array.isArray(customer.phone) ? customer.phone : [customer.phone || ''];
  
  setEditCustomerData({
    name: customer.name,
    phone: phoneArray,
    whatsappNumber: customer.whatsappNumber || '',
    businessName: customer.businessName,
    area: customer.area,
    customerNumber: customer.customerNumber,
    loanAmount: customer.loanAmount ? customer.loanAmount.toString() : '0',
    emiAmount: customer.emiAmount ? customer.emiAmount.toString() : '0',
    loanType: customer.loanType || 'Daily',
    address: customer.address || '',
    customerId: customer._id,
    category: customer.category || 'A',
    officeCategory: customer.officeCategory || 'Office 1'
  });
  setShowEditCustomer(true);
  setShowCustomerDetails(false);
};

  const handleEditLoan = (loan: Loan) => {
    setEditLoanData({
      loanId: loan._id,
      customerId: loan.customerId,
      customerName: loan.customerName,
      customerNumber: loan.customerNumber,
      loanNumber: loan.loanNumber,
      amount: loan.amount.toString(),
      emiAmount: loan.emiAmount.toString(),
      loanType: loan.loanType,
      dateApplied: loan.dateApplied.split('T')[0],
      loanDays: loan.loanDays.toString(),
      originalData: {
        amount: loan.amount,
        emiAmount: loan.emiAmount,
        loanType: loan.loanType,
        dateApplied: loan.dateApplied,
        loanDays: loan.loanDays
      }
    });
    setShowEditLoan(true);
  };

  const handleRenewLoan = (loan: Loan) => {
  setRenewLoanData({
    loanId: loan._id,
    customerId: loan.customerId,
    customerName: loan.customerName,
    customerNumber: loan.customerNumber,
    loanNumber: loan.loanNumber,
    renewalDate: new Date().toISOString().split('T')[0],
    newLoanAmount: loan.amount.toString(),
    newEmiAmount: loan.emiAmount.toString(),
    newLoanDays: loan.loanDays.toString(),
    newLoanType: loan.loanType,
    remarks: `Renewal of loan ${loan.loanNumber}`,
    // Add new fields with default values
    emiStartDate: new Date().toISOString().split('T')[0],
    emiType: 'fixed',
    customEmiAmount: ''
  });
  setShowRenewLoan(true);
};

  const handleSaveEditLoan = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Starting edit loan request...');
      console.log('📦 Edit loan data:', editLoanData);

      if (!editLoanData.amount || !editLoanData.emiAmount || !editLoanData.loanDays) {
        alert('Please fill all required fields');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/data-entry/edit-loan-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'Loan Edit',
          customerId: editLoanData.customerId,
          customerName: editLoanData.customerName,
          customerNumber: editLoanData.customerNumber,
          loanId: editLoanData.loanId,
          loanNumber: editLoanData.loanNumber,
          requestedData: {
            amount: Number(editLoanData.amount),
            emiAmount: Number(editLoanData.emiAmount),
            loanType: editLoanData.loanType,
            loanDays: Number(editLoanData.loanDays),
            dateApplied: editLoanData.dateApplied,
            originalData: editLoanData.originalData
          },
          description: `Loan edit request for ${editLoanData.customerName} - Customer ${editLoanData.customerNumber}`,
          status: 'Pending',
          createdBy: 'data_entry_operator_1',
          createdByRole: 'data_entry'
        }),
      });

      console.log('📡 Response status:', response.status);

      const data = await response.json();
      console.log('✅ Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to submit edit request');
      }

      alert(data.message || 'Loan edit request submitted successfully! Waiting for admin approval.');
      setShowEditLoan(false);
      setEditLoanData({
        loanId: '',
        customerId: '',
        customerName: '',
        customerNumber: '',
        loanNumber: '',
        amount: '',
        emiAmount: '',
        loanType: 'Daily',
        dateApplied: new Date().toISOString().split('T')[0],
        loanDays: '',
      });
      
      if (activeTab === 'requests') fetchPendingRequests();
      
    } catch (error: any) {
      console.error('💥 Error in handleSaveEditLoan:', error);
      alert('Error: ' + error.message + '\n\nPlease make sure the API route is created at /api/data-entry/edit-loan-request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRenewLoan = async () => {
  setIsLoading(true);
  try {
    console.log('🔄 Starting renew loan request...');
    console.log('📦 Renew loan data:', renewLoanData);

    if (!renewLoanData.newLoanAmount || !renewLoanData.newEmiAmount || !renewLoanData.newLoanDays) {
      alert('Please fill all required fields');
      setIsLoading(false);
      return;
    }

    const apiUrl = '/api/data-entry/renew-loan-request';
    console.log('🌐 Calling API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...renewLoanData,
        newLoanAmount: Number(renewLoanData.newLoanAmount),
        newEmiAmount: Number(renewLoanData.newEmiAmount),
        newLoanDays: Number(renewLoanData.newLoanDays),
        emiStartDate: renewLoanData.emiStartDate,
        emiType: renewLoanData.emiType,
        customEmiAmount: renewLoanData.customEmiAmount ? Number(renewLoanData.customEmiAmount) : null,
        requestedBy: 'data_entry_operator_1',
        requestType: 'renew_loan'
      }),
    });

    // ... rest of the function remains the same
    console.log('📡 Response status:', response.status);

    const responseText = await response.text();
    console.log('📄 Raw response:', responseText);

    if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
      console.error('❌ Server returned HTML instead of JSON. Likely a 404 error.');
      throw new Error('API endpoint not found. Please check the server.');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError);
      throw new Error('Server returned invalid JSON. Response: ' + responseText.substring(0, 200));
    }

    console.log('✅ Parsed response data:', data);
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    alert('Loan renewal request submitted successfully! A new loan will be added after admin approval.');
    setShowRenewLoan(false);
    setRenewLoanData({
      loanId: '',
      customerId: '',
      customerName: '',
      customerNumber: '',
      loanNumber: '',
      renewalDate: new Date().toISOString().split('T')[0],
      newLoanAmount: '',
      newEmiAmount: '',
      newLoanDays: '',
      newLoanType: 'Monthly',
      remarks: '',
      emiStartDate: new Date().toISOString().split('T')[0],
      emiType: 'fixed',
      customEmiAmount: ''
    });
    
    if (activeTab === 'requests') fetchPendingRequests();
  } catch (error: any) {
    console.error('💥 Error in handleSaveRenewLoan:', error);
    alert('Error: ' + error.message);
  } finally {
    setIsLoading(false);
  }
};

  const handleDeleteLoan = async (loan: Loan) => {
    if (!confirm(`Are you sure you want to request deletion of Loan ${loan.loanNumber}? This action requires admin approval.`)) {
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 Starting delete loan request...');
      console.log('📦 Delete loan data:', loan);

      const apiUrl = '/api/data-entry/delete-loan-request';
      console.log('🌐 Calling API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loanId: loan._id,
          customerId: loan.customerId,
          customerName: loan.customerName,
          customerNumber: loan.customerNumber,
          loanNumber: loan.loanNumber,
          requestedBy: 'data_entry_operator_1',
          requestType: 'delete_loan'
        }),
      });

      console.log('📡 Response status:', response.status);

      const responseText = await response.text();
      console.log('📄 Raw response:', responseText);

      if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
        console.error('❌ Server returned HTML instead of JSON. Likely a 404 error.');
        throw new Error('API endpoint not found. Please check the server.');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        throw new Error('Server returned invalid JSON. Response: ' + responseText.substring(0, 200));
      }

      console.log('✅ Parsed response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      alert('Loan deletion request submitted successfully! Waiting for admin approval.');
      
      if (activeTab === 'requests') fetchPendingRequests();
    } catch (error: any) {
      console.error('💥 Error in handleDeleteLoan:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewLoan = async () => {
  if (!customerDetails) return;

  setIsLoading(true);
  try {
    // Enhanced validation for all required fields
    const missingFields: string[] = [];
    if (!newLoanData.loanDate) missingFields.push('loanDate');
    if (!newLoanData.emiStartDate) missingFields.push('emiStartDate');
    if (!newLoanData.loanAmount) missingFields.push('loanAmount');
    if (!newLoanData.emiAmount) missingFields.push('emiAmount');
    if (!newLoanData.loanDays) missingFields.push('loanDays');
    if (!newLoanData.loanType) missingFields.push('loanType');
    if (!newLoanData.emiType) missingFields.push('emiType');

    if (missingFields.length > 0) {
      alert(`Please fill all required fields. Missing: ${missingFields.join(', ')}`);
      setIsLoading(false);
      return;
    }

    // Validate numbers are positive
    const invalidNumbers: string[] = [];
    const loanAmountNum = parseFloat(newLoanData.loanAmount);
    const emiAmountNum = parseFloat(newLoanData.emiAmount);
    const loanDaysNum = parseFloat(newLoanData.loanDays);

    if (isNaN(loanAmountNum) || loanAmountNum <= 0) invalidNumbers.push('loanAmount');
    if (isNaN(emiAmountNum) || emiAmountNum <= 0) invalidNumbers.push('emiAmount');
    if (isNaN(loanDaysNum) || loanDaysNum <= 0) invalidNumbers.push('loanDays');

    if (invalidNumbers.length > 0) {
      alert(`Please enter valid positive numbers for: ${invalidNumbers.join(', ')}`);
      setIsLoading(false);
      return;
    }

    // Validate custom EMI
    if (newLoanData.emiType === 'custom' && newLoanData.loanType !== 'Daily') {
      if (!newLoanData.customEmiAmount || parseFloat(newLoanData.customEmiAmount) <= 0) {
        alert('Custom EMI amount is required for custom EMI type with Weekly/Monthly loans');
        setIsLoading(false);
        return;
      }
    }

    // Validate dates
    if (new Date(newLoanData.emiStartDate) < new Date(newLoanData.loanDate)) {
      alert('EMI start date cannot be before loan date');
      setIsLoading(false);
      return;
    }

    console.log('🟡 Creating enhanced loan addition request for:', customerDetails.name);
    console.log('📦 Loan data being submitted:', newLoanData);

    const requestResponse = await fetch('/api/data-entry/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'Loan Addition',
        customerId: customerDetails._id,
        customerName: customerDetails.name,
        customerNumber: customerDetails.customerNumber,
        loanNumber: `L${(customerDetails.loans?.length || 0) + 1}`,
        requestedData: {
          // Enhanced loan data matching Step 2 structure
          loanAmount: Number(newLoanData.loanAmount),
          emiAmount: Number(newLoanData.emiAmount),
          loanType: newLoanData.loanType,
          loanDays: Number(newLoanData.loanDays),
          loanDate: newLoanData.loanDate,
          emiStartDate: newLoanData.emiStartDate,
          emiType: newLoanData.emiType,
          customEmiAmount: newLoanData.customEmiAmount ? Number(newLoanData.customEmiAmount) : null,
          customerId: customerDetails._id,
          customerName: customerDetails.name,
          customerNumber: customerDetails.customerNumber,
          createdBy: 'data_entry_operator_1',
          requestType: 'loan_addition'
        },
        description: `Additional ${newLoanData.loanType} loan request for ${customerDetails.name} - Customer: ${customerDetails.customerNumber}`,
        priority: 'Medium',
        status: 'Pending',
        createdBy: 'data_entry_operator_1',
        createdByRole: 'data_entry',
        requiresCustomerNotification: false,
        estimatedImpact: 'Medium'
      }),
    });

    console.log('📡 Request response status:', requestResponse.status);

    const responseText = await requestResponse.text();
    console.log('📄 Raw response:', responseText);

    let requestData;
    try {
      requestData = JSON.parse(responseText);
    } catch (parseError: any) {
      console.error('Failed to parse response as JSON:', parseError);
      throw new Error('Server returned invalid JSON response');
    }

    if (!requestResponse.ok) {
      throw new Error(requestData.error || `HTTP error! status: ${requestResponse.status}`);
    }

    if (!requestData.success) {
      throw new Error(requestData.error || 'Failed to create loan addition request');
    }

    console.log('✅ Loan addition request created successfully:', requestData.data);

    alert('Loan addition request submitted successfully! Waiting for admin approval.');
    
    // Reset form and close modal
    setShowAddLoanModal(false);
    setNewLoanData({
      loanAmount: '',
      loanDate: new Date().toISOString().split('T')[0],
      emiStartDate: new Date().toISOString().split('T')[0],
      emiAmount: '',
      loanType: 'Monthly',
      loanDays: '30',
      emiType: 'fixed',
      customEmiAmount: ''
    });
    
    // Refresh requests if on requests tab
    if (activeTab === 'requests') {
      fetchPendingRequests();
    }

    // Close customer details modal
    setShowCustomerDetails(false);
    
  } catch (error: any) {
    console.error('❌ Error adding new loan:', error);
    alert('Error: ' + error.message);
  } finally {
    setIsLoading(false);
  }
};

  const handleSaveEditCustomer = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Starting edit customer request...');
      console.log('📦 Edit data:', editCustomerData);

      if (!editCustomerData.name || !editCustomerData.phone || !editCustomerData.area || !editCustomerData.customerNumber) {
        alert('Please fill all required fields');
        setIsLoading(false);
        return;
      }

      const apiUrl = '/api/data-entry/edit-customer-request';
      console.log('🌐 Calling API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editCustomerData,
          whatsappNumber: editCustomerData.whatsappNumber || '',
          loanAmount: Number(editCustomerData.loanAmount),
          emiAmount: Number(editCustomerData.emiAmount),
          requestedBy: 'data_entry_operator_1'
        }),
      });

      console.log('📡 Response status:', response.status);

      const responseText = await response.text();
      console.log('📄 Raw response:', responseText);

      if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
        console.error('❌ Server returned HTML instead of JSON. Likely a 404 error.');
        throw new Error('API endpoint not found. Please check the server.');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        throw new Error('Server returned invalid JSON. Response: ' + responseText.substring(0, 200));
      }

      console.log('✅ Parsed response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      alert('Edit request submitted successfully! Waiting for admin approval.');
      setShowEditCustomer(false);
      setEditCustomerData({
        name: '',
        phone: [''],
        whatsappNumber: '',
        businessName: '',
        area: '',
        customerNumber: '',
        loanAmount: '',
        emiAmount: '',
        loanType: 'Daily',
        address: '',
        customerId: '',
        category: 'A',
        officeCategory: 'Office 1'
      });
      
      if (activeTab === 'requests') fetchPendingRequests();
    } catch (error: any) {
      console.error('💥 Error in handleSaveEditCustomer:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCollectionData = async (date: string) => {
  setIsLoadingCollection(true);
  try {
    console.log('🔄 Fetching collection data for date:', date);
    
    // First, try to fetch from our API
    const response = await fetch(`/api/data-entry/collection?date=${date}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Collection API response:', data);
      
      if (data.success && data.data) {
        setCollectionData(data.data);
        return;
      }
    }
    
    // If API fails or returns no data, generate from existing customers and EMI history
    console.log('📋 Generating collection data from existing customers and EMI history');
    await generateCollectionDataFromEMIHistory(date);
    
  } catch (error) {
    console.error('❌ Error fetching collection data:', error);
    // Fallback to generating data from existing EMI history
    await generateCollectionDataFromEMIHistory(date);
  } finally {
    setIsLoadingCollection(false);
  }
};

const generateCollectionDataFromEMIHistory = async (date: string) => {
  console.log('🔍 Generating collection data for:', date);
  
  const collectionCustomers = [];
  let totalCollection = 0;
  let office1Collection = 0;
  let office2Collection = 0;

  // Loop through all customers and their loans to find EMI payments for the date
  for (const customer of customers) {
    const customerLoans = getAllCustomerLoans(customer, null);
    let customerTotalCollection = 0;
    const loanDetails: { loanNumber: string; emiAmount: number; collectedAmount: number }[] = [];
    
    // Check each loan for EMI payments on the selected date
    for (const loan of customerLoans) {
      let loanCollectedAmount = 0;
      
      if (loan.emiHistory && Array.isArray(loan.emiHistory)) {
        const datePayments = loan.emiHistory.filter(
          payment => payment.paymentDate === date
        );
        
        if (datePayments.length > 0) {
          loanCollectedAmount = datePayments.reduce((sum, payment) => sum + payment.amount, 0);
          customerTotalCollection += loanCollectedAmount;
          
          console.log(`💰 Payment found for ${customer.name}:`, {
            loanNumber: loan.loanNumber,
            paymentDate: date,
            amount: loanCollectedAmount,
            payments: datePayments
          });
        }
      }
      
      // Include loan details
      loanDetails.push({
        loanNumber: loan.loanNumber || 'N/A',
        emiAmount: loan.emiAmount || 0,
        collectedAmount: loanCollectedAmount
      });
    }
    
    // Only include customers who made payments on this date
    if (customerTotalCollection > 0) {
      collectionCustomers.push({
        customerId: customer._id,
        customerNumber: customer.customerNumber || `CN${customer._id}`,
        customerName: customer.name,
        totalCollection: customerTotalCollection,
        officeCategory: customer.officeCategory || 'Office 1',
        loans: loanDetails.filter(loan => loan.collectedAmount > 0) // Only include loans with collections
      });
      
      totalCollection += customerTotalCollection;
      
      if (customer.officeCategory === 'Office 1') {
        office1Collection += customerTotalCollection;
      } else if (customer.officeCategory === 'Office 2') {
        office2Collection += customerTotalCollection;
      }
      
      console.log(`✅ Added customer ${customer.name} to collection: ₹${customerTotalCollection}`);
    }
  }

  console.log('📊 Final collection data:', {
    date,
    customers: collectionCustomers,
    summary: {
      totalCollection,
      office1Collection,
      office2Collection,
      totalCustomers: collectionCustomers.length
    }
  });

  setCollectionData({
    date: date,
    customers: collectionCustomers,
    summary: {
      totalCollection,
      office1Collection,
      office2Collection,
      totalCustomers: collectionCustomers.length
    }
  });
};

const debugEMIPayments = () => {
  console.log('🔍 DEBUG: Checking all EMI payments across all customers');
  
  let totalPayments = 0;
  
  customers.forEach(customer => {
    const customerLoans = getAllCustomerLoans(customer, null);
    let customerPayments = 0;
    
    customerLoans.forEach(loan => {
      if (loan.emiHistory && loan.emiHistory.length > 0) {
        console.log(`📊 Customer: ${customer.name}, Loan: ${loan.loanNumber}`);
        console.log('EMI History:', loan.emiHistory);
        customerPayments += loan.emiHistory.length;
      }
    });
    
    if (customerPayments > 0) {
      console.log(`✅ ${customer.name} has ${customerPayments} EMI payments`);
      totalPayments += customerPayments;
    }
  });
  
  console.log(`📈 Total EMI payments across all customers: ${totalPayments}`);
  
  // Also check for today's payments specifically
  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Checking payments for today (${today}):`);
  
  customers.forEach(customer => {
    const customerLoans = getAllCustomerLoans(customer, null);
    customerLoans.forEach(loan => {
      if (loan.emiHistory) {
        const todayPayments = loan.emiHistory.filter(p => p.paymentDate === today);
        if (todayPayments.length > 0) {
          console.log(`💰 TODAY: ${customer.name} - ${loan.loanNumber}:`, todayPayments);
        }
      }
    });
  });
};

  const handleAddCustomer = async () => {
  if (!validateStep3()) return;

  // Enhanced validation for all required fields
  const missingFields: string[] = [];
  
  // Step 1 validation
  if (!step1Data.name?.trim()) missingFields.push('name');
  if (!step1Data.phone?.[0]?.trim()) missingFields.push('primary phone');
  if (!step1Data.businessName?.trim()) missingFields.push('businessName');
  if (!step1Data.area?.trim()) missingFields.push('area');
  if (!step1Data.customerNumber?.trim()) missingFields.push('customerNumber');
  if (!step1Data.address?.trim()) missingFields.push('address');
  if (!step1Data.category?.trim()) missingFields.push('category');
  if (!step1Data.officeCategory?.trim()) missingFields.push('officeCategory');

  if (missingFields.length > 0) {
    alert(`Please fill all required fields. Missing: ${missingFields.join(', ')}`);
    setCurrentStep(1);
    return;
  }

  // Validate phone numbers
  const validPhones = step1Data.phone.filter(p => p?.trim() !== '');
  if (validPhones.length === 0) {
    alert('Please provide at least one phone number');
    setCurrentStep(1);
    return;
  }

  for (const phone of validPhones) {
    if (!/^\d{10}$/.test(phone)) {
      alert('Please ensure all phone numbers are valid 10-digit numbers');
      setCurrentStep(1);
      return;
    }
  }

  // Validate Step 2 data
  const step2MissingFields: string[] = [];
  if (!step2Data.loanDate) step2MissingFields.push('loanDate');
  if (!step2Data.emiStartDate) step2MissingFields.push('emiStartDate');
  if (!step2Data.loanAmount) step2MissingFields.push('loanAmount');
  if (!step2Data.emiAmount) step2MissingFields.push('emiAmount');
  if (!step2Data.loanDays) step2MissingFields.push('loanDays');
  if (!step2Data.loanType) step2MissingFields.push('loanType');
  if (!step2Data.emiType) step2MissingFields.push('emiType');

  if (step2MissingFields.length > 0) {
    alert(`Please fill all loan details. Missing: ${step2MissingFields.join(', ')}`);
    setCurrentStep(2);
    return;
  }

  setIsLoading(true);
  try {
    console.log('🟡 Starting customer submission...');

    const formData = new FormData();
    
    // Step 1: Customer Basic Details - FIXED
    formData.append('name', step1Data.name.trim());
    
    // Add phone numbers properly
    step1Data.phone.forEach((phone, index) => {
      if (phone && phone.trim()) {
        formData.append(`phone[${index}]`, phone.trim());
      }
    });
    
    // Add WhatsApp number (can be empty)
    formData.append('whatsappNumber', step1Data.whatsappNumber ? step1Data.whatsappNumber.trim() : '');
    
    formData.append('businessName', step1Data.businessName.trim());
    formData.append('area', step1Data.area.trim());
    
    // Ensure customer number has CN prefix
    const customerNumber = step1Data.customerNumber.startsWith('CN') 
      ? step1Data.customerNumber 
      : `CN${step1Data.customerNumber}`;
    formData.append('customerNumber', customerNumber.trim());
    
    formData.append('address', step1Data.address.trim());
    formData.append('category', step1Data.category);
    formData.append('officeCategory', step1Data.officeCategory);
    
    // Step 2: Loan Details
    formData.append('loanDate', step2Data.loanDate);
    formData.append('emiStartDate', step2Data.emiStartDate);
    formData.append('loanAmount', step2Data.loanAmount.toString());
    formData.append('emiAmount', step2Data.emiAmount.toString());
    formData.append('loanDays', step2Data.loanDays.toString());
    formData.append('loanType', step2Data.loanType);
    formData.append('emiType', step2Data.emiType);
    
    // Custom EMI amount - only append if it exists
    if (step2Data.customEmiAmount) {
      formData.append('customEmiAmount', step2Data.customEmiAmount.toString());
    }
    
    // Step 3: Login Credentials
    formData.append('loginId', step3Data.loginId.trim());
    formData.append('password', step3Data.password);
    formData.append('confirmPassword', step3Data.confirmPassword);
    formData.append('createdBy', 'data_entry_operator_1');

    // File Uploads - FIXED: Use the correct field names
    if (step1Data.profilePicture) {
      formData.append('profilePicture', step1Data.profilePicture);
      console.log('📷 Profile picture added:', step1Data.profilePicture.name);
    }
    if (step1Data.fiDocuments?.shop) {
      formData.append('fiDocumentShop', step1Data.fiDocuments.shop);
      console.log('📄 Shop FI document added:', step1Data.fiDocuments.shop.name);
    }
    if (step1Data.fiDocuments?.home) {
      formData.append('fiDocumentHome', step1Data.fiDocuments.home);
      console.log('📄 Home FI document added:', step1Data.fiDocuments.home.name);
    }

    // DEBUG: Log all form data
    console.log('📤 FormData contents:');
    for (const [key, value] of formData.entries()) {
      if (key.includes('password')) {
        console.log(`  ${key}: *** (hidden)`);
      } else if (value instanceof File) {
        console.log(`  ${key}: File - ${value.name}`);
      } else {
        console.log(`  ${key}:`, value);
      }
    }

    console.log('🟡 Sending customer data to API...');
    const response = await fetch('/api/data-entry/customers', {
      method: 'POST',
      body: formData,
    });

    const responseText = await response.text();
    console.log('📄 Raw API response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError);
      throw new Error('Server returned invalid response');
    }

    if (!response.ok) {
      console.error('❌ API error response:', data);
      
      if (response.status === 409) {
        if (data.field === 'phone') {
          throw new Error('Customer with this phone number already exists');
        } else if (data.field === 'customerNumber') {
          throw new Error('Customer number already exists. Please use a unique customer number');
        } else if (data.field === 'loginId') {
          throw new Error('Login ID already exists. Please use a unique login ID');
        } else {
          throw new Error('A pending request already exists for this customer');
        }
      }
      
      if (data.error) {
        throw new Error(data.error);
      } else if (data.message) {
        throw new Error(data.message);
      } else {
        throw new Error(`Failed to submit customer request: ${response.status} ${response.statusText}`);
      }
    }

    console.log('✅ API response success:', data);

    alert(data.message || 'Customer request submitted successfully! Waiting for admin approval.');
    setShowAddCustomer(false);
    resetCustomerForm();
    
    fetchDashboardData();
    if (activeTab === 'requests') fetchPendingRequests();
    
  } catch (error: any) {
    console.error('❌ Error submitting customer:', error);
    alert('Error: ' + (error.message || 'Unknown error occurred'));
  } finally {
    setIsLoading(false);
  }
};

    const handleUpdateEMI = async () => {
  if (!selectedCustomer || !selectedLoanForPayment) {
    alert('Please select a customer and loan first');
    return;
  }

  setIsLoading(true);
  try {
    console.log('🟡 Starting EMI update for customer:', selectedCustomer.name);
    console.log('📦 Selected loan for payment:', selectedLoanForPayment);
    console.log('📋 EMI update data:', emiUpdate);
    
    // Validation for single payment
    if (emiUpdate.paymentType === 'single' && (!emiUpdate.amount || !emiUpdate.paymentDate)) {
      alert('Please fill all required fields for single payment');
      setIsLoading(false);
      return;
    }

    // Validation for advance payment
    if (emiUpdate.paymentType === 'advance' && (!emiUpdate.amount || !emiUpdate.advanceFromDate || !emiUpdate.advanceToDate)) {
      alert('Please fill all required fields for advance payment');
      setIsLoading(false);
      return;
    }

    // Enhanced frontend duplicate check before API call
    const checkExistingPayments = async () => {
      if (emiUpdate.paymentType === 'single') {
        // Check if payment already exists for this date
        if (selectedLoanForPayment?.emiHistory) {
          const existingPayment = selectedLoanForPayment.emiHistory.find(
            (payment: EMIHistory) => {
              const paymentDateStr = new Date(payment.paymentDate).toISOString().split('T')[0];
              const emiDateStr = new Date(emiUpdate.paymentDate).toISOString().split('T')[0];
              return paymentDateStr === emiDateStr;
            }
          );
          
          if (existingPayment) {
            alert(`EMI payment for ${emiUpdate.paymentDate} already exists. Please use a different date or edit the existing payment.`);
            return true;
          }
        }
      } else if (emiUpdate.paymentType === 'advance') {
        // Check advance period against existing payments
        if (selectedLoanForPayment?.emiHistory && emiUpdate.advanceFromDate && emiUpdate.advanceToDate) {
          const fromDate = new Date(emiUpdate.advanceFromDate);
          const toDate = new Date(emiUpdate.advanceToDate);
          
          const conflictingPayments = selectedLoanForPayment.emiHistory.filter(
            (payment: EMIHistory) => {
              const paymentDate = new Date(payment.paymentDate);
              return paymentDate >= fromDate && paymentDate <= toDate;
            }
          );
          
          if (conflictingPayments.length > 0) {
            const conflictingDates = conflictingPayments.map(p => 
              new Date(p.paymentDate).toISOString().split('T')[0]
            );
            
            alert(`Advance payment period conflicts with existing payments on: ${conflictingDates.join(', ')}`);
            return true;
          }
        }
      }
      return false;
    };

    // Run the duplicate check
    const hasDuplicate = await checkExistingPayments();
    if (hasDuplicate) {
      setIsLoading(false);
      return;
    }

    // For advance payments, set status to 'Advance'
    const finalStatus = emiUpdate.paymentType === 'advance' ? 'Advance' : emiUpdate.status;
    const finalAmount = emiUpdate.paymentType === 'advance' 
  ? emiUpdate.advanceTotalAmount || calculateTotalAmount(emiUpdate.amount, emiUpdate.advanceEmiCount || '1')
  : emiUpdate.amount;
    // Validate that we're not duplicating payment for the same date (for single payments)
    if (emiUpdate.paymentType === 'single') {
      const paymentDate = new Date(emiUpdate.paymentDate).toISOString().split('T')[0];
      const existingPayment = selectedLoanForPayment.emiHistory?.find(
        (payment: EMIHistory) => payment.paymentDate === paymentDate
      );

      if (existingPayment) {
        alert(`EMI payment for ${paymentDate} already exists. Please use a different date or edit the existing payment.`);
        setIsLoading(false);
        return;
      }
    }

    // FIX: Clean the customerId and loanId to remove any suffixes like "_default"
    const cleanCustomerId = selectedCustomer._id?.replace?.(/_default$/, '') || selectedCustomer._id;
    
    // For loanId, we need to be more careful - it might be a temporary ID
    const cleanLoanId = selectedLoanForPayment._id?.replace?.(/_default$/, '') || selectedLoanForPayment._id;
    
    console.log('🔧 Cleaned IDs:', {
      originalCustomerId: selectedCustomer._id,
      cleanCustomerId,
      originalLoanId: selectedLoanForPayment._id,
      cleanLoanId,
      customerNumber: selectedCustomer.customerNumber,
      loanNumber: selectedLoanForPayment.loanNumber
    });

    // Enhanced EMI payment data with fallback options
    const emiPaymentData: any = {
      customerId: cleanCustomerId,
      customerName: selectedCustomer.name,
      customerNumber: selectedCustomer.customerNumber,
      paymentDate: emiUpdate.paymentType === 'single' ? emiUpdate.paymentDate : emiUpdate.advanceFromDate,
      amount: Number(finalAmount),
      status: finalStatus,
      collectedBy: emiUpdate.collectedBy,
      paymentMethod: 'Cash',
      paymentType: emiUpdate.paymentType,
      notes: emiUpdate.notes || `EMI payment recorded for ${selectedCustomer.name} - Customer ${selectedCustomer.customerNumber}`
    };

    // Add advance payment details if applicable
    if (emiUpdate.paymentType === 'advance') {
      emiPaymentData.advanceFromDate = emiUpdate.advanceFromDate;
      emiPaymentData.advanceToDate = emiUpdate.advanceToDate;
      emiPaymentData.advanceEmiCount = parseInt(emiUpdate.advanceEmiCount || '1');
      emiPaymentData.advanceTotalAmount = Number(finalAmount);
      emiPaymentData.notes = `Advance EMI payment for ${emiUpdate.advanceEmiCount || '1'} periods (${emiUpdate.advanceFromDate} to ${emiUpdate.advanceToDate})${emiUpdate.notes ? ` - ${emiUpdate.notes}` : ''}`;
    }

    // Only include loanId if it's a valid MongoDB-like ID
    // If the loanId looks like a temporary ID, let the backend auto-find the loan
    if (cleanLoanId && cleanLoanId.length === 24 && /^[0-9a-fA-F]{24}$/.test(cleanLoanId)) {
      emiPaymentData.loanId = cleanLoanId;
      emiPaymentData.loanNumber = selectedLoanForPayment.loanNumber;
      console.log('✅ Using valid loan ID:', cleanLoanId);
    } else {
      console.log('⚠️ Loan ID appears to be temporary, letting backend auto-find loan');
      // Don't include loanId - backend will auto-find the customer's loan
      emiPaymentData.loanNumber = selectedLoanForPayment.loanNumber;
    }

    console.log('📦 Sending EMI payment data:', emiPaymentData);

    const response = await fetch('/api/data-entry/emi-payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emiPaymentData),
    });

    const responseText = await response.text();
    console.log('📄 Raw API response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError);
      throw new Error('Server returned invalid response');
    }

    if (!response.ok) {
      console.error('❌ API error response:', data);
      
      if (response.status === 409) {
        throw new Error('EMI payment for this date already exists');
      } else if (response.status === 404) {
        // Enhanced loan not found error handling
        if (data.error?.includes('Loan not found') || data.error?.includes('No loan found')) {
          throw new Error(`Loan not found for customer. Please ensure the customer has an approved loan in the system. ${data.error}`);
        }
        throw new Error(data.error || 'Loan not found. Please refresh and try again.');
      } else if (response.status === 400) {
        throw new Error(data.error || 'Invalid loan data provided');
      } else {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to update EMI');
    }

    const successMessage = emiUpdate.paymentType === 'advance' 
      ? `Advance EMI payment of ₹${finalAmount} recorded successfully for ${emiUpdate.advanceEmiCount} periods!`
      : `EMI payment of ₹${finalAmount} recorded successfully!`;

    alert(successMessage);
    
    // Refresh customer data to reflect changes
    if (selectedCustomer._id) {
      await refreshCustomerData(selectedCustomer._id);
      await fetchCustomers(); // Refresh the customers list
    }
    
    setShowPaymentForm(false);
    setSelectedLoanForPayment(null);
    setShowUpdateEMI(false);
    setSelectedCustomer(null);
    setSearchQuery('');
    setFilters({
      customerNumber: '',
      loanType: '',
      status: '',
      officeCategory: ''
    });
    setShowFilters(false);
    setEmiUpdate({
      customerId: '',
      customerName: '',
      paymentDate: new Date().toISOString().split('T')[0],
      amount: '',
      status: 'Paid',
      collectedBy: 'Operator 1',
      paymentType: 'single'
    });
    
    fetchDashboardData();
    
    } catch (error: any) {
    console.error('💥 Error updating EMI:', error);
    
    // Enhanced error messages for duplicate payments
    if (error.message.includes('already exists') || error.message.includes('conflicts with existing payments')) {
      alert(`❌ Payment Conflict: ${error.message}\n\nPlease choose a different date or edit the existing payment.`);
    } else if (error.message.includes('Loan not found')) {
      alert(`❌ Loan Issue: ${error.message}\n\nPlease ensure:\n• The customer has an approved loan\n• The loan exists in the system\n• Contact admin if this persists`);
    } else {
      alert('Error: ' + error.message);
    }
  }
  finally {
    setIsLoading(false);
  }
};

const handleEditEMIPayment = async (payment: EMIHistory, newAmount: number, newDate?: string) => {
  if (!payment._id) {
    alert('Cannot edit payment: Payment ID not found');
    return;
  }

  if (!confirm(`Are you sure you want to edit this EMI payment from ₹${payment.amount} to ₹${newAmount}?`)) {
    return;
  }

  setIsLoading(true);
  try {
    const response = await fetch(`/api/data-entry/emi-payments?id=${payment._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: newAmount,
        paymentDate: newDate || payment.paymentDate,
        status: payment.status, // Include status in the update
        notes: `Payment edited from ₹${payment.amount} to ₹${newAmount}${payment.notes ? ` - Original notes: ${payment.notes}` : ''}`
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update payment');
    }

    alert('EMI payment updated successfully!');
    
    // Refresh the calendar data
    if (calendarData) {
      const updatedResponse = await fetch(`/api/data-entry/customers/${calendarData.customerId}`);
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        if (updatedData.success) {
          const customerDetails = updatedData.data;
          const displayLoans = getAllCustomerLoans(customerDetails, customerDetails);
          
          setCalendarData({
            ...calendarData,
            loans: displayLoans,
            paymentHistory: displayLoans.flatMap(loan => loan.emiHistory || [])
          });
        }
      }
    }
    
    setShowDatePaymentHistory(false);
    
  } catch (error: any) {
    console.error('Error editing EMI payment:', error);
    alert('Error: ' + error.message);
  } finally {
    setIsLoading(false);
  }
};

const testPaymentAPI = async () => {
  // First, let's check if we can get the payment
  const testPaymentId = editingPayment?._id;
  if (!testPaymentId) {
    console.log('❌ No payment ID available');
    return;
  }

  console.log('🧪 Testing API with payment ID:', testPaymentId);
  
  try {
    // Test GET request first
    const getResponse = await fetch(`/api/data-entry/emi-payments?customerId=${calendarData?.customerId}`);
    const getData = await getResponse.json();
    console.log('📊 Available payments:', getData);
    
    // Check if our payment exists
    const paymentExists = getData.data?.payments?.find((p: any) => p._id === testPaymentId);
    console.log('🔍 Payment exists in GET response:', paymentExists);
    
  } catch (error) {
    console.error('❌ API test failed:', error);
  }
};

const handleEditPayment = (payment: EMIHistory, date: Date) => {
  console.log('🟡 handleEditPayment called with:', {
    paymentId: payment._id,
    paymentDate: payment.paymentDate,
    amount: payment.amount,
    date: date
  });
  
  setSelectedCalendarDate(date);
  setEditingPayment(payment);
  setEditAmount(payment.amount.toString());
  setEditStatus(payment.status);
  setEditDate(payment.paymentDate); // Make sure editDate is set
  setShowEditPaymentModal(true);
};

const handleDeletePayment = async (payment: EMIHistory, date: Date) => {
  setSelectedCalendarDate(date);
  setDeletingPayment(payment);
  setShowDeleteConfirmationModal(true);
};

const refreshCustomerData = async (customerId: string) => {
  try {
    console.log('🔄 Refreshing customer data for:', customerId);
    
    const response = await fetch(`/api/data-entry/customers/${customerId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log('✅ Customer data refreshed successfully');
        
        // Update customer details if the modal is open
        if (showCustomerDetails && customerDetails && customerDetails._id === customerId) {
          setCustomerDetails(data.data);
        }
        
        // Update selected customer if it's the same customer
        if (selectedCustomer && selectedCustomer._id === customerId) {
          setSelectedCustomer(data.data);
        }
        
        return data.data;
      }
    }
  } catch (error) {
    console.error('❌ Error refreshing customer data:', error);
  }
  return null;
};

  const handleSearchCustomer = (customer: Customer) => {
  console.log('🔍 Customer selected for EMI:', customer);
  
  // FIX: Clean the customer ID
  const cleanCustomerId = customer._id?.replace?.(/_default$/, '') || customer._id;
  
  setSelectedCustomer(customer);
  setEmiUpdate(prev => ({
    ...prev,
    customerId: cleanCustomerId || '',
    customerName: customer.name,
    customerNumber: customer.customerNumber,
    paymentDate: new Date().toISOString().split('T')[0]
  }));
  
  setSearchQuery('');
};

  const handlePayNow = (loan: Loan) => {
  console.log('💰 Pay Now clicked for loan:', loan);
  console.log('📋 Loan details:', {
    id: loan._id,
    loanNumber: loan.loanNumber,
    customerId: loan.customerId,
    customerNumber: loan.customerNumber,
    amount: loan.amount,
    emiAmount: loan.emiAmount,
    isFallback: loan.isFallback
  });
  
  if (!loan._id) {
    console.error('❌ No loan ID found for loan:', loan);
    alert('Error: Loan ID not found. Please refresh and try again.');
    return;
  }

  if (!selectedCustomer?._id) {
    console.error('❌ No customer selected');
    alert('Error: No customer selected. Please select a customer first.');
    return;
  }

  // Check if this is a fallback loan (may not exist in database)
  if ((loan as any).isFallback) {
    const confirmProceed = confirm(
      '⚠️ This loan appears to be a system-generated fallback loan and may not exist in the database.\n\n' +
      'The system will attempt to find the customer\'s actual loan, but if no loan is found, the payment may fail.\n\n' +
      'Do you want to proceed?'
    );
    
    if (!confirmProceed) {
      return;
    }
  }

  // FIX: Clean the IDs before using them
  const cleanCustomerId = selectedCustomer._id?.replace?.(/_default$/, '') || selectedCustomer._id;
  const cleanLoanId = loan._id?.replace?.(/_default$/, '') || loan._id;

  setSelectedLoanForPayment(loan);
  setEmiUpdate(prev => ({
    ...prev,
    customerId: cleanCustomerId || '',
    customerName: selectedCustomer.name || '',
    customerNumber: selectedCustomer.customerNumber || '',
    loanId: cleanLoanId,
    loanNumber: loan.loanNumber || '',
    amount: loan.emiAmount ? loan.emiAmount.toString() : '',
    paymentDate: new Date().toISOString().split('T')[0]
  }));
  setShowPaymentForm(true);
};

  const handleLogout = () => {
    router.push('/auth');
  };

    const renderEMICalendar = () => {
  if (!calendarData) return null;

  const calendarDays = generateCalendar(
    currentMonth, 
    calendarData.loans, 
    calendarData.paymentHistory,
    calendarFilter.loanFilter
  );
  
  const filteredDays = calendarDays.filter(day => {
    if (calendarFilter.emiStatus === 'all') return true;
    
    if (calendarFilter.emiStatus === 'paid') {
      return day.emiStatus === 'paid' || (day.paymentHistory && day.paymentHistory.length > 0);
    }
    
    return day.emiStatus === calendarFilter.emiStatus;
  });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-bold">EMI Calendar - {calendarData.customerName}</h3>
              <p className="text-gray-600">Payment history and due dates</p>
            </div>
            <button 
              onClick={() => setShowEMICalendar(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 border rounded-md hover:bg-gray-50"
              >
                ← Previous
              </button>
              <h4 className="text-lg font-semibold px-4">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h4>
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 border rounded-md hover:bg-gray-50"
              >
                Next →
              </button>
            </div>

            <select
              value={calendarFilter.loanFilter}
              onChange={(e) => setCalendarFilter(prev => ({
                ...prev,
                loanFilter: e.target.value
              }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Loans</option>
              {calendarData.loans.map((loan) => (
                <option key={loan._id} value={loan._id}>
                  {loan.loanNumber} - {loan.customerNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">EMI Status:</label>
            <select
              value={calendarFilter.emiStatus}
              onChange={(e) => setCalendarFilter(prev => ({
                ...prev,
                emiStatus: e.target.value as 'all' | 'paid' | 'due' | 'overdue' | 'partial' | 'upcoming'
              }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All EMI</option>
              <option value="paid">Paid Only</option>
              <option value="due">Due</option>
              <option value="overdue">Overdue</option>
              <option value="partial">Partial</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-md">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
              <span className="text-sm">Paid</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded mr-2"></div>
              <span className="text-sm">Due</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></div>
              <span className="text-sm">Overdue</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
              <span className="text-sm">Partial</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded mr-2"></div>
              <span className="text-sm">Upcoming</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center font-medium text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {filteredDays.map((day, index) => (
              <div
                key={index}
                onClick={() => handleCalendarDateClick(day)}
                className={`min-h-28 p-2 border rounded-md cursor-pointer transition-all hover:shadow-md ${
                  getStatusColor(day.emiStatus)
                } ${!day.isCurrentMonth ? 'opacity-40' : ''} ${
                  day.isToday ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-medium ${
                    day.isToday ? 'text-blue-600' : ''
                  }`}>
                    {day.date.getDate()}
                  </span>
                  {day.emiStatus && day.emiStatus !== 'none' && (
                    <span className="text-xs">{getStatusIcon(day.emiStatus)}</span>
                  )}
                </div>
                
                {(day.emiAmount && day.emiAmount > 0) && (
                  <div className="mt-1">
                    <div className={`text-xs font-semibold ${
                      day.emiStatus === 'paid' ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      ₹{day.emiAmount}
                    </div>
                    {day.loanNumbers && day.loanNumbers.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        {day.loanNumbers.slice(0, 2).join(', ')}
                        {day.loanNumbers.length > 2 && ` +${day.loanNumbers.length - 2}`}
                      </div>
                    )}
                  </div>
                )}

                {day.paymentHistory && day.paymentHistory.length > 0 && (
                  <div className="mt-1">
                    <div className="text-xs text-green-600 font-semibold">
                      ✅ {day.paymentHistory.length} payment(s)
                    </div>
                    
                    {/* Edit/Delete buttons for paid dates - HOVER VERSION */}
                    {day.emiStatus === 'paid' && day.paymentHistory.length > 0 && (
                      <div className="mt-2 opacity-0 hover:opacity-100 transition-opacity duration-200">
                        <div className="flex flex-col gap-1">
                          {/* REMOVED "Manage Payments" button - keeping only Edit/Delete */}
                          {day.paymentHistory.slice(0, 2).map((payment, paymentIndex) => (
                            <div key={payment._id || paymentIndex} className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditPayment(payment, day.date);
                                }}
                                className="flex-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded hover:bg-blue-600 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePayment(payment, day.date);
                                }}
                                className="flex-1 bg-red-500 text-white text-xs px-1 py-0.5 rounded hover:bg-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                          
                          {/* Show "More" if there are more than 2 payments */}
                          {day.paymentHistory.length > 2 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCalendarDate(day.date);
                                setShowDatePaymentHistory(true);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              +{day.paymentHistory.length - 2} more
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-semibold mb-3">Payment Behavior Summary</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {calendarData.loans.map((loan) => {
                const behavior = calculatePaymentBehavior(loan);
                const completion = calculateEMICompletion(loan);
                
                return (
                  <div key={loan._id} className="bg-white p-3 rounded border">
                    <div className="font-medium">{loan.loanNumber}</div>
                    <div className="text-xs text-gray-600">
                      Score: {behavior.punctualityScore.toFixed(0)}%
                    </div>
                    <div className={`text-xs font-semibold ${
                      behavior.behaviorRating === 'EXCELLENT' ? 'text-green-600' :
                      behavior.behaviorRating === 'GOOD' ? 'text-blue-600' :
                      behavior.behaviorRating === 'AVERAGE' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {behavior.behaviorRating}
                    </div>
                    <div className="text-xs text-gray-500">
                      {completion.completionPercentage.toFixed(1)}% Complete
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderDatePaymentHistory = () => {
  if (!selectedCalendarDate || !calendarData) return null;

  const dateStr = selectedCalendarDate.toISOString().split('T')[0];
  const payments = calendarData.paymentHistory.filter(p => {
    const paymentDate = new Date(p.paymentDate).toISOString().split('T')[0];
    return paymentDate === dateStr;
  });

  const startEdit = (payment: EMIHistory) => {
    setEditingPayment(payment);
    setEditAmount(payment.amount.toString());
    setEditStatus(payment.status);
    setShowEditPaymentModal(true);
  };

  const handleDeleteEMI = async (payment: EMIHistory) => {
    setDeletingPayment(payment);
    setShowDeleteConfirmationModal(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">
              Payment History - {selectedCalendarDate.toLocaleDateString()}
            </h3>
            <button 
              onClick={() => setShowDatePaymentHistory(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {payments.length > 0 ? (
            <div className="space-y-4">
              {payments.map((payment, index) => {
                const associatedLoan = calendarData.loans.find(loan => 
                  loan._id === payment.loanId || loan.loanNumber === payment.loanNumber
                );
                
                return (
                  <div key={payment._id || index} className="border rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-lg">₹{payment.amount}</div>
                        <div className="text-sm text-gray-600">
                          Status: <span className={
                            payment.status === 'Paid' ? 'text-green-600' : 
                            payment.status === 'Partial' ? 'text-yellow-600' : 
                            payment.status === 'Advance' ? 'text-blue-600' : 'text-red-600'
                          }>
                            {payment.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Collected by: {payment.collectedBy}
                        </div>
                        <div className="text-sm text-gray-600">
                          Date: {new Date(payment.paymentDate).toLocaleDateString()}
                        </div>
                        {payment.loanNumber && (
                          <div className="text-sm text-gray-600">
                            Loan: {payment.loanNumber} ({associatedLoan?.loanType || 'N/A'})
                          </div>
                        )}
                        {payment.notes && (
                          <div className="text-sm text-gray-600 mt-1">
                            Notes: {payment.notes}
                          </div>
                        )}
                        {payment.paymentType === 'advance' && (
                          <div className="text-sm text-blue-600 mt-1">
                            Advance Payment ({payment.advanceEmiCount} EMI)
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEdit(payment)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteEMI(payment)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          disabled={isLoading}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No payments recorded for this date
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setShowDatePaymentHistory(false)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const renderEditPaymentModal = () => {
  if (!editingPayment || !selectedCalendarDate) return null;

  console.log('🔍 Editing payment details:', {
    paymentId: editingPayment._id,
    paymentDate: editingPayment.paymentDate,
    amount: editingPayment.amount,
    status: editingPayment.status,
    loanNumber: editingPayment.loanNumber
  });

  // Find the loan associated with this payment
  const associatedLoan = calendarData?.loans.find(loan => 
    loan._id === editingPayment.loanId || loan.loanNumber === editingPayment.loanNumber
  );

  const handleSaveEdit = async () => {
    if (!editAmount || parseFloat(editAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!editDate) {
      alert('Please select a valid payment date');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🟡 Attempting to update payment:', editingPayment._id);

      // First, let's check if the payment exists by trying to fetch it
      const checkResponse = await fetch(`/api/data-entry/emi-payments?customerId=${calendarData?.customerId}`);
      const checkData = await checkResponse.json();
      
      if (checkData.success) {
        const paymentExists = checkData.data.payments.find((p: any) => p._id === editingPayment._id);
        console.log('🔍 Payment exists check:', paymentExists);
        
        if (!paymentExists) {
          throw new Error(`Payment ${editingPayment._id} not found in database. It may have been deleted.`);
        }
      }

      // If payment exists, proceed with update
      const response = await fetch(`/api/data-entry/emi-payments?id=${editingPayment._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(editAmount),
          paymentDate: editDate,
          status: editStatus,
          notes: `Payment edited: Amount ₹${editingPayment.amount} → ₹${editAmount}, Status ${editingPayment.status} → ${editStatus}`
        }),
      });

      const responseText = await response.text();
      console.log('📄 Raw API response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        throw new Error('Server returned invalid response');
      }

      console.log('✅ Parsed response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to update payment');
      }

      alert('EMI payment updated successfully!');
      
      // Refresh the calendar data
      if (calendarData) {
        console.log('🔄 Refreshing calendar data...');
        const updatedResponse = await fetch(`/api/data-entry/customers/${calendarData.customerId}`);
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          if (updatedData.success) {
            const customerDetails = updatedData.data;
            const displayLoans = getAllCustomerLoans(customerDetails, customerDetails);
            
            setCalendarData({
              ...calendarData,
              loans: displayLoans,
              paymentHistory: displayLoans.flatMap(loan => loan.emiHistory || [])
            });
            console.log('✅ Calendar data refreshed successfully');
          }
        }
      }
      
      setShowEditPaymentModal(false);
      setEditingPayment(null);
      
    } catch (error: any) {
      console.error('💥 Error editing EMI payment:', error);
      
      if (error.message.includes('not found in database')) {
        // Payment doesn't exist in database - offer to create a new one
        const shouldCreateNew = confirm(
          `This payment record doesn't exist in the database. It may have been deleted.\n\n` +
          `Would you like to create a new payment record with these details?\n\n` +
          `Amount: ₹${editAmount}\n` +
          `Date: ${new Date(editDate).toLocaleDateString()}\n` +
          `Status: ${editStatus}`
        );
        
        if (shouldCreateNew) {
          await createNewPaymentFromEdit();
        }
      } else {
        alert('Error: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to create a new payment when the original is missing
  const createNewPaymentFromEdit = async () => {
    try {
      console.log('🟡 Creating new payment to replace missing one...');
      
      const newPaymentData = {
        customerId: calendarData?.customerId,
        customerName: calendarData?.customerName,
        loanId: editingPayment.loanId,
        loanNumber: editingPayment.loanNumber || associatedLoan?.loanNumber,
        paymentDate: editDate,
        amount: parseFloat(editAmount),
        status: editStatus,
        collectedBy: editingPayment.collectedBy || 'Operator 1',
        notes: `Payment recreated: ${editingPayment.notes || 'Original payment was missing from database'}`
      };

      const response = await fetch('/api/data-entry/emi-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPaymentData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create new payment');
      }

      alert('New payment record created successfully!');
      
      // Refresh calendar data
      if (calendarData) {
        const updatedResponse = await fetch(`/api/data-entry/customers/${calendarData.customerId}`);
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          if (updatedData.success) {
            const customerDetails = updatedData.data;
            const displayLoans = getAllCustomerLoans(customerDetails, customerDetails);
            
            setCalendarData({
              ...calendarData,
              loans: displayLoans,
              paymentHistory: displayLoans.flatMap(loan => loan.emiHistory || [])
            });
          }
        }
      }
      
      setShowEditPaymentModal(false);
      setEditingPayment(null);
      
    } catch (error: any) {
      console.error('❌ Error creating new payment:', error);
      alert('Error creating new payment: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Edit EMI Payment</h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                ID: {editingPayment._id?.substring(0, 8)}...
              </span>
              <button 
                onClick={() => {
                  setShowEditPaymentModal(false);
                  setEditingPayment(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Warning if payment might be missing */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <div className="flex items-center">
              <span className="text-yellow-500 mr-2">⚠️</span>
              <div>
                <p className="text-sm text-yellow-800 font-medium">Payment Record Issue</p>
                <p className="text-xs text-yellow-700 mt-1">
                  This payment might not exist in the database. If update fails, you can create a new record.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Non-editable information */}
            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="font-medium text-gray-700 mb-2">Payment Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Loan:</span>
                  <p className="font-medium">{editingPayment.loanNumber || associatedLoan?.loanNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Loan Type:</span>
                  <p className="font-medium">{associatedLoan?.loanType || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Collected By:</span>
                  <p className="font-medium">{editingPayment.collectedBy}</p>
                </div>
                <div>
                  <span className="text-gray-600">Original Date:</span>
                  <p className="font-medium">{new Date(editingPayment.paymentDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Editable fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={editDate.split('T')[0]}
                onChange={(e) => setEditDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                EMI Amount Paid (₹) *
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                min="0"
                step="0.01"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Original amount: ₹{editingPayment.amount}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status *
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                required
              >
                <option value="Paid">Paid</option>
                <option value="Partial">Partial Payment</option>
                <option value="Due">Due</option>
                <option value="Advance">Advance</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Original status: {editingPayment.status}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowEditPaymentModal(false);
                setEditingPayment(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isLoading || !editAmount || !editDate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const renderDeleteConfirmationModal = () => {
  if (!deletingPayment || !selectedCalendarDate) return null;

  // Find the loan associated with this payment
  const associatedLoan = calendarData?.loans.find(loan => 
    loan._id === deletingPayment.loanId || loan.loanNumber === deletingPayment.loanNumber
  );

  const handleConfirmDelete = async () => {
    if (!deletingPayment._id) {
      alert('Cannot delete payment: Payment ID not found');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/data-entry/emi-payments?id=${deletingPayment._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete payment');
      }

      alert('EMI payment deleted successfully!');
      
      // Refresh the calendar data
      if (calendarData) {
        const updatedResponse = await fetch(`/api/data-entry/customers/${calendarData.customerId}`);
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          if (updatedData.success) {
            const customerDetails = updatedData.data;
            const displayLoans = getAllCustomerLoans(customerDetails, customerDetails);
            
            setCalendarData({
              ...calendarData,
              loans: displayLoans,
              paymentHistory: displayLoans.flatMap(loan => loan.emiHistory || [])
            });
          }
        }
      }
      
      setShowDeleteConfirmationModal(false);
      setDeletingPayment(null);
      
    } catch (error: any) {
      console.error('Error deleting EMI payment:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-red-600">Delete EMI Payment</h3>
            <button 
              onClick={() => {
                setShowDeleteConfirmationModal(false);
                setDeletingPayment(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-red-400 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">Warning</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Are you sure you want to delete this EMI payment? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <h4 className="font-medium text-gray-700 mb-2">Payment Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Payment Date:</span>
                  <p className="font-medium">{new Date(deletingPayment.paymentDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-gray-600">Loan:</span>
                  <p className="font-medium">{deletingPayment.loanNumber || associatedLoan?.loanNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Loan Type:</span>
                  <p className="font-medium">{associatedLoan?.loanType || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Amount:</span>
                  <p className="font-medium">₹{deletingPayment.amount}</p>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <p className="font-medium">{deletingPayment.status}</p>
                </div>
                <div>
                  <span className="text-gray-600">Collected By:</span>
                  <p className="font-medium">{deletingPayment.collectedBy}</p>
                </div>
              </div>
              {deletingPayment.notes && (
                <div className="mt-2">
                  <span className="text-gray-600 text-sm">Notes:</span>
                  <p className="text-sm text-gray-700 mt-1">{deletingPayment.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowDeleteConfirmationModal(false);
                setDeletingPayment(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Deleting...' : 'Delete Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderSearchAndFilters = () => {
    const handleFilterChange = (key: keyof Filters, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
      setFilters({
        customerNumber: '',
        loanType: '',
        status: '',
        officeCategory: ''
      });
      setSearchQuery('');
    };

    const loanTypes = [...new Set(customers.map(customer => customer.loanType).filter(Boolean))];

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by customer name or customer number..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span>Filters</span>
              <span className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {(filters.customerNumber || filters.loanType || filters.status || filters.officeCategory || searchQuery) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Number
                </label>
                <input
                  type="text"
                  placeholder="Enter customer number..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.customerNumber}
                  onChange={(e) => handleFilterChange('customerNumber', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.loanType}
                  onChange={(e) => handleFilterChange('loanType', e.target.value)}
                >
                  <option value="">All Loan Types</option>
                  {loanTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Office Category
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.officeCategory}
                  onChange={(e) => handleFilterChange('officeCategory', e.target.value)}
                >
                  <option value="">All Offices</option>
                  <option value="Office 1">Office 1</option>
                  <option value="Office 2">Office 2</option>
                </select>
              </div>
            </div>

            {(filters.customerNumber || filters.loanType || filters.status || filters.officeCategory) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600">Active filters:</span>
                  {filters.customerNumber && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      Customer No: {filters.customerNumber}
                      <button 
                        onClick={() => handleFilterChange('customerNumber', '')}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.loanType && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      Type: {filters.loanType}
                      <button 
                        onClick={() => handleFilterChange('loanType', '')}
                        className="ml-1 text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.status && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                      Status: {filters.status}
                      <button 
                        onClick={() => handleFilterChange('status', '')}
                        className="ml-1 text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.officeCategory && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                      Office: {filters.officeCategory}
                      <button 
                        onClick={() => handleFilterChange('officeCategory', '')}
                        className="ml-1 text-orange-600 hover:text-orange-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Showing {filteredCustomers.length} of {customers.length} customers
          </span>
          
          {filteredCustomers.length < customers.length && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderAddCustomerForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Add New Customer</h3>
            <button 
              onClick={() => {
                setShowAddCustomer(false);
                resetCustomerForm();
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-24 h-1 mx-2 ${
                      currentStep > step ? 'bg-blue-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <span>Basic Details</span>
              <span>Loan Information</span>
              <span>Login Credentials</span>
            </div>
          </div>

          {currentStep === 1 && (
  <div className="space-y-6">
    <h4 className="text-lg font-semibold">Step 1: Customer Basic Details</h4>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Row 1 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
        <input 
          type="text" 
          className={`w-full px-3 py-2 border rounded-md ${
            step1Errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          value={step1Data.name}
          onChange={(e) => setStep1Data({...step1Data, name: e.target.value})}
          placeholder="Enter full name"
        />
        {step1Errors.name && <p className="text-red-500 text-xs mt-1">{step1Errors.name}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Primary Phone Number *</label>
        <input 
          type="tel" 
          className={`w-full px-3 py-2 border rounded-md ${
            step1Errors.phone ? 'border-red-500' : 'border-gray-300'
          }`}
          value={step1Data.phone[0] || ''}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            if (value.length <= 10) {
              const newPhones = [...step1Data.phone];
              newPhones[0] = value;
              setStep1Data({...step1Data, phone: newPhones});
            }
          }}
          placeholder="Enter 10-digit primary phone number"
          maxLength={10}
        />
        {step1Errors.phone && <p className="text-red-500 text-xs mt-1">{step1Errors.phone}</p>}
      </div>

      {/* Row 2 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Phone Number</label>
        <input 
          type="tel" 
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          value={step1Data.phone[1] || ''}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            if (value.length <= 10) {
              const newPhones = [...step1Data.phone];
              newPhones[1] = value;
              setStep1Data({...step1Data, phone: newPhones});
            }
          }}
          placeholder="Secondary phone (optional)"
          maxLength={10}
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <span className="flex items-center gap-1">
            <span>WhatsApp Number</span>
            <img 
              src="/images/whatsapp-logo.png" 
              alt="WhatsApp" 
              className="w-4 h-4"
            />
          </span>
        </label>
        <input 
          type="tel" 
          className={`w-full px-3 py-2 border rounded-md ${
            step1Errors.whatsappNumber ? 'border-red-500' : 'border-gray-300'
          }`}
          value={step1Data.whatsappNumber}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            if (value.length <= 10) {
              setStep1Data({...step1Data, whatsappNumber: value});
            }
          }}
          placeholder="WhatsApp number (optional)"
          maxLength={10}
        />
        {step1Errors.whatsappNumber && <p className="text-red-500 text-xs mt-1">{step1Errors.whatsappNumber}</p>}
      </div>

      {/* Row 3 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
        <input 
          type="text" 
          className={`w-full px-3 py-2 border rounded-md ${
            step1Errors.businessName ? 'border-red-500' : 'border-gray-300'
          }`}
          value={step1Data.businessName}
          onChange={(e) => setStep1Data({...step1Data, businessName: e.target.value})}
          placeholder="Enter business name"
        />
        {step1Errors.businessName && <p className="text-red-500 text-xs mt-1">{step1Errors.businessName}</p>}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Area *</label>
        <input 
          type="text" 
          className={`w-full px-3 py-2 border rounded-md ${
            step1Errors.area ? 'border-red-500' : 'border-gray-300'
          }`}
          value={step1Data.area}
          onChange={(e) => setStep1Data({...step1Data, area: e.target.value})}
          placeholder="Enter area"
        />
        {step1Errors.area && <p className="text-red-500 text-xs mt-1">{step1Errors.area}</p>}
      </div>

      {/* Row 4 */}
      <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Number *</label>
  <div className="flex">
    <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-md">
      CN
    </span>
    <input 
      type="text" 
      className={`flex-1 px-3 py-2 border rounded-r-md ${
        step1Errors.customerNumber ? 'border-red-500' : 'border-gray-300'
      }`}
      value={step1Data.customerNumber.replace('CN', '')} // Remove CN for input display
      onChange={(e) => {
        const numbersOnly = e.target.value.replace(/\D/g, '');
        // Store with CN prefix
        setStep1Data({...step1Data, customerNumber: `CN${numbersOnly}`});
      }}
      placeholder="Enter numbers only"
      maxLength={10}
    />
  </div>
  {step1Errors.customerNumber && <p className="text-red-500 text-xs mt-1">{step1Errors.customerNumber}</p>}
  <p className="text-xs text-gray-500 mt-1">Must be unique. Full customer number: {step1Data.customerNumber || 'CN___'}</p>
</div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
        <textarea 
          className={`w-full px-3 py-2 border rounded-md ${
            step1Errors.address ? 'border-red-500' : 'border-gray-300'
          }`}
          rows={3}
          value={step1Data.address}
          onChange={(e) => setStep1Data({...step1Data, address: e.target.value})}
          placeholder="Enter complete address"
        />
        {step1Errors.address && <p className="text-red-500 text-xs mt-1">{step1Errors.address}</p>}
      </div>

      {/* Row 5 */}
      <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
  
  {/* Category Field */}
  <select 
    className={`w-full px-3 py-2 border rounded-md ${
      step1Errors.category ? 'border-red-500' : 'border-gray-300'
    }`}
    value={step1Data.category}
    onChange={(e) => setStep1Data({...step1Data, category: e.target.value})}
    required
  >
    <option value="">Select Category</option>
    <option value="A">Category A</option>
    <option value="B">Category B</option>
    <option value="C">Category C</option>
  </select>
  {step1Errors.category && <p className="text-red-500 text-xs mt-1">{step1Errors.category}</p>}
  <p className="text-xs text-gray-500 mt-1">Customer priority category</p>

  {/* Office Category Field */}
  <select 
    className={`w-full px-3 py-2 border rounded-md ${
      step1Errors.officeCategory ? 'border-red-500' : 'border-gray-300'
    }`}
    value={step1Data.officeCategory}
    onChange={(e) => setStep1Data({...step1Data, officeCategory: e.target.value})}
    required
  >
    <option value="">Select Office Category</option>
    <option value="Office 1">Office 1</option>
    <option value="Office 2">Office 2</option>
  </select>
  {step1Errors.officeCategory && <p className="text-red-500 text-xs mt-1">{step1Errors.officeCategory}</p>}
  <p className="text-xs text-gray-500 mt-1">Assigned office location</p>
</div>
    </div>

    {/* File Upload Section */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture (Image)</label>
        <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileUpload('profilePicture', e.target.files?.[0] || null)}
            className="hidden"
            id="profile-picture"
          />
          <label htmlFor="profile-picture" className="cursor-pointer">
            <div className="text-gray-400 mb-2">📷</div>
            <p className="text-sm text-gray-600">
              {step1Data.profilePicture ? step1Data.profilePicture.name : 'Click to upload profile picture'}
            </p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPEG, JPG, etc.</p>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">FI Document - Shop (PDF)</label>
        <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => handleFileUpload('fiDocuments', e.target.files?.[0] || null, 'shop')}
            className="hidden"
            id="fi-doc-shop"
          />
          <label htmlFor="fi-doc-shop" className="cursor-pointer">
            <div className="text-gray-400 mb-2">📄</div>
            <p className="text-sm text-gray-600">
              {step1Data.fiDocuments.shop ? step1Data.fiDocuments.shop.name : 'Upload Shop FI Document'}
            </p>
            <p className="text-xs text-gray-500 mt-1">PDF format only</p>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">FI Document - Home (PDF)</label>
        <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => handleFileUpload('fiDocuments', e.target.files?.[0] || null, 'home')}
            className="hidden"
            id="fi-doc-home"
          />
          <label htmlFor="fi-doc-home" className="cursor-pointer">
            <div className="text-gray-400 mb-2">📄</div>
            <p className="text-sm text-gray-600">
              {step1Data.fiDocuments.home ? step1Data.fiDocuments.home.name : 'Upload Home FI Document'}
            </p>
            <p className="text-xs text-gray-500 mt-1">PDF format only</p>
          </label>
        </div>
      </div>
    </div>

    <div className="flex justify-end space-x-3 mt-6">
      <button 
        onClick={() => {
          setShowAddCustomer(false);
          resetCustomerForm();
        }}
        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
      >
        Cancel
      </button>
      <button 
        onClick={handleStep1Next}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Next Step
      </button>
    </div>
  </div>
)}

          {currentStep === 2 && (
  <div className="space-y-6">
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
      <h4 className="text-lg font-semibold text-blue-900 mb-2">Customer Information</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-blue-700 font-medium">Customer Number:</span>
          <p className="text-blue-900">CN{step1Data.customerNumber}</p>
        </div>
        <div>
          <span className="text-blue-700 font-medium">Customer Name:</span>
          <p className="text-blue-900">{step1Data.name}</p>
        </div>
        <div>
          <span className="text-blue-700 font-medium">Business Name:</span>
          <p className="text-blue-900">{step1Data.businessName}</p>
        </div>
      </div>
    </div>

    <h4 className="text-lg font-semibold">Step 2: Enter Loan Details</h4>
    
    <div className="space-y-6">
      {/* Loan Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="md:col-span-2 lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type *</label>
          <select 
            className={`w-full px-3 py-2 border rounded-md ${
              step2Errors.loanType ? 'border-red-500' : 'border-gray-300'
            }`}
            value={step2Data.loanType}
            onChange={(e) => {
              const newLoanType = e.target.value;
              setStep2Data({
                ...step2Data, 
                loanType: newLoanType,
                loanDays: newLoanType === 'Monthly' ? '1' : 
                         newLoanType === 'Weekly' ? '1' : '30',
                emiType: newLoanType === 'Daily' ? 'fixed' : step2Data.emiType
              });
            }}
            required
          >
            <option value="Daily">Daily EMI</option>
            <option value="Weekly">Weekly EMI</option>
            <option value="Monthly">Monthly EMI</option>
          </select>
          {step2Errors.loanType && <p className="text-red-500 text-xs mt-1">{step2Errors.loanType}</p>}
        </div>
        
        {/* EMI Collection Type - Only show for Weekly/Monthly */}
        {step2Data.loanType !== 'Daily' && (
          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">EMI Collection Type *</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                step2Data.emiType === 'fixed' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="emiType"
                  value="fixed"
                  checked={step2Data.emiType === 'fixed'}
                  onChange={(e) => setStep2Data({...step2Data, emiType: e.target.value as 'fixed' | 'custom'})}
                  className="mr-3 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Fixed EMI</div>
                  <div className="text-sm text-gray-600">Same EMI amount for all periods</div>
                </div>
              </label>
              
              <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                step2Data.emiType === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
                <input
                  type="radio"
                  name="emiType"
                  value="custom"
                  checked={step2Data.emiType === 'custom'}
                  onChange={(e) => setStep2Data({...step2Data, emiType: e.target.value as 'fixed' | 'custom'})}
                  className="mr-3 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">Custom EMI</div>
                  <div className="text-sm text-gray-600">Different EMI for last period</div>
                </div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Loan Details Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Common Fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Loan Date *</label>
          <input 
            type="date" 
            className={`w-full px-3 py-2 border rounded-md ${
              step2Errors.loanDate ? 'border-red-500' : 'border-gray-300'
            }`}
            value={step2Data.loanDate}
            onChange={(e) => setStep2Data({...step2Data, loanDate: e.target.value})}
            required
          />
          {step2Errors.loanDate && <p className="text-red-500 text-xs mt-1">{step2Errors.loanDate}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
          <input 
            type="number" 
            className={`w-full px-3 py-2 border rounded-md ${
              step2Errors.loanAmount ? 'border-red-500' : 'border-gray-300'
            }`}
            value={step2Data.loanAmount}
            onChange={(e) => setStep2Data({...step2Data, loanAmount: e.target.value})}
            placeholder="Amount"
            min="0"
            step="0.01"
            required
          />
          {step2Errors.loanAmount && <p className="text-red-500 text-xs mt-1">{step2Errors.loanAmount}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {step2Data.loanType === 'Daily' ? 'No. of Days *' : 
             step2Data.loanType === 'Weekly' ? 'No. of Weeks *' : 'No. of Months *'}
          </label>
          <input 
            type="number" 
            className={`w-full px-3 py-2 border rounded-md ${
              step2Errors.loanDays ? 'border-red-500' : 'border-gray-300'
            }`}
            value={step2Data.loanDays}
            onChange={(e) => setStep2Data({...step2Data, loanDays: e.target.value})}
            placeholder={step2Data.loanType === 'Daily' ? 'Days' : 
                       step2Data.loanType === 'Weekly' ? 'Weeks' : 'Months'}
            min="1"
            required
          />
          {step2Errors.loanDays && <p className="text-red-500 text-xs mt-1">{step2Errors.loanDays}</p>}
          <p className="text-xs text-gray-500 mt-1">
            {step2Data.loanType === 'Daily' ? 'Total duration in days' : 
             step2Data.loanType === 'Weekly' ? 'Total duration in weeks' : 'Total duration in months'}
          </p>
        </div>

        {/* EMI Amount Fields */}
        {step2Data.emiType === 'fixed' || step2Data.loanType === 'Daily' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">EMI Amount *</label>
            <input 
              type="number" 
              className={`w-full px-3 py-2 border rounded-md ${
                step2Errors.emiAmount ? 'border-red-500' : 'border-gray-300'
              }`}
              value={step2Data.emiAmount}
              onChange={(e) => setStep2Data({...step2Data, emiAmount: e.target.value})}
              placeholder="EMI Amount"
              min="0"
              step="0.01"
              required
            />
            {step2Errors.emiAmount && <p className="text-red-500 text-xs mt-1">{step2Errors.emiAmount}</p>}
          </div>
        ) : (
          <>
            {/* Custom EMI Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fixed EMI Amount *</label>
              <input 
                type="number" 
                className={`w-full px-3 py-2 border rounded-md ${
                  step2Errors.emiAmount ? 'border-red-500' : 'border-gray-300'
                }`}
                value={step2Data.emiAmount}
                onChange={(e) => setStep2Data({...step2Data, emiAmount: e.target.value})}
                placeholder="Fixed EMI Amount"
                min="0"
                step="0.01"
                required
              />
              {step2Errors.emiAmount && <p className="text-red-500 text-xs mt-1">{step2Errors.emiAmount}</p>}
              <p className="text-xs text-gray-500 mt-1">
                For first {Number(step2Data.loanDays || 1) - 1} {step2Data.loanType === 'Weekly' ? 'weeks' : 'months'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last EMI Amount *</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={step2Data.customEmiAmount || ''}
                onChange={(e) => setStep2Data({...step2Data, customEmiAmount: e.target.value})}
                placeholder="Last EMI Amount"
                min="0"
                step="0.01"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                For last 1 {step2Data.loanType === 'Weekly' ? 'week' : 'month'}
              </p>
            </div>
          </>
        )}

        {/* Total Loan Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Total Loan Amount</label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
            <p className="text-gray-900 font-semibold text-lg">
              ₹{step2Data.emiType === 'custom' && step2Data.loanType !== 'Daily' ? (
                ((Number(step2Data.emiAmount || 0) * (Number(step2Data.loanDays || 1) - 1)) + 
                 (Number(step2Data.customEmiAmount || 0) * 1)).toLocaleString()
              ) : (
                (Number(step2Data.emiAmount || 0) * Number(step2Data.loanDays || 1)).toLocaleString()
              )}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {step2Data.emiType === 'custom' && step2Data.loanType !== 'Daily' ? (
              `Fixed Periods + Last Period (Auto-calculated)`
            ) : (
              `EMI × Duration (Auto-calculated)`
            )}
          </p>
        </div>

        {/* EMI Starting Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">EMI Starting Date *</label>
          <input 
            type="date" 
            className={`w-full px-3 py-2 border rounded-md ${
              step2Errors.emiStartDate ? 'border-red-500' : 'border-gray-300'
            }`}
            value={step2Data.emiStartDate}
            onChange={(e) => setStep2Data({...step2Data, emiStartDate: e.target.value})}
            required
          />
          {step2Errors.emiStartDate && <p className="text-red-500 text-xs mt-1">{step2Errors.emiStartDate}</p>}
          <p className="text-xs text-gray-500 mt-1">When EMI collection will start</p>
        </div>
      </div>

      {/* Custom EMI Breakdown */}
      {step2Data.emiType === 'custom' && step2Data.loanType !== 'Daily' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h5 className="font-medium text-yellow-800 mb-3">Custom EMI Breakdown</h5>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-yellow-700">Fixed Periods</div>
              <div className="text-lg font-bold text-yellow-900">{Number(step2Data.loanDays || 1) - 1}</div>
              <div className="text-xs text-yellow-600">{step2Data.loanType === 'Weekly' ? 'weeks' : 'months'}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-yellow-700">Fixed EMI</div>
              <div className="text-lg font-bold text-yellow-900">₹{step2Data.emiAmount || '0'}</div>
              <div className="text-xs text-yellow-600">per period</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-yellow-700">Last Period</div>
              <div className="text-lg font-bold text-yellow-900">1</div>
              <div className="text-xs text-yellow-600">{step2Data.loanType === 'Weekly' ? 'week' : 'month'}</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-yellow-700">Last EMI</div>
              <div className="text-lg font-bold text-yellow-900">₹{step2Data.customEmiAmount || '0'}</div>
              <div className="text-xs text-yellow-600">final period</div>
            </div>
          </div>
        </div>
      )}

      {/* Loan Summary */}
      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <h5 className="font-semibold text-green-900 mb-3">Loan Summary</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-green-700 font-medium">Loan Amount:</span>
            <p className="font-semibold text-green-900">₹{step2Data.loanAmount || '0'}</p>
          </div>
          <div>
            <span className="text-green-700 font-medium">Total Loan:</span>
            <p className="font-semibold text-green-900">
              ₹{step2Data.emiType === 'custom' && step2Data.loanType !== 'Daily' ? (
                ((Number(step2Data.emiAmount || 0) * (Number(step2Data.loanDays || 1) - 1)) + 
                 (Number(step2Data.customEmiAmount || 0) * 1)).toLocaleString()
              ) : (
                (Number(step2Data.emiAmount || 0) * Number(step2Data.loanDays || 1)).toLocaleString()
              )}
            </p>
          </div>
          <div>
            <span className="text-green-700 font-medium">Duration:</span>
            <p className="font-semibold text-green-900">
              {step2Data.loanDays || '0'} 
              {step2Data.loanType === 'Daily' ? ' days' : 
               step2Data.loanType === 'Weekly' ? ' weeks' : ' months'}
            </p>
          </div>
          <div>
            <span className="text-green-700 font-medium">EMI Starts From:</span>
            <p className="font-semibold text-green-900">
              {step2Data.emiStartDate ? formatDateToDDMMYYYY(step2Data.emiStartDate) : 'Not set'}
            </p>
          </div>
        </div>

        {/* EMI Type Summary */}
        <div className="mt-3 pt-3 border-t border-green-200">
          <span className="text-green-700 font-medium">EMI Type:</span>
          <p className="font-semibold text-green-900">
            {step2Data.loanType === 'Daily' ? (
              `Daily EMI - All ${step2Data.loanDays} days at ₹${step2Data.emiAmount || '0'}`
            ) : step2Data.emiType === 'fixed' ? (
              `Fixed EMI - All ${step2Data.loanDays} ${step2Data.loanType.toLowerCase()} periods at ₹${step2Data.emiAmount || '0'}`
            ) : (
              `Custom EMI - ${Number(step2Data.loanDays || 1) - 1} periods at ₹${step2Data.emiAmount || '0'} + 1 period at ₹${step2Data.customEmiAmount || '0'}`
            )}
          </p>
        </div>
      </div>
    </div>

    <div className="flex justify-between space-x-3 mt-6">
      <button 
        onClick={() => setCurrentStep(1)}
        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
      >
        Previous
      </button>
      <button 
        onClick={handleStep2Next}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Next Step
      </button>
    </div>
  </div>
)}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-lg font-semibold text-blue-900 mb-2">Create Login Credentials</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <span className="text-blue-700 font-medium">Customer:</span>
                      <span className="text-blue-900 ml-1">{step1Data.name}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Customer No:</span>
                      <span className="text-blue-900 ml-1">CN{step1Data.customerNumber}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Category:</span>
                      <span className="text-blue-900 ml-1">{step1Data.category || 'Not selected'}</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Office:</span>
                      <span className="text-blue-900 ml-1">{step1Data.officeCategory || 'Not selected'}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <span className="text-blue-700 font-medium flex items-center gap-1">
                        <span>📱</span>
                        WhatsApp:
                      </span>
                      <span className="text-blue-900 ml-1">
                        {step1Data.whatsappNumber || 'Not provided'}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Phone Numbers:</span>
                      <span className="text-blue-900 ml-1">
                        {step1Data.phone.filter(p => p.trim() !== '').join(', ') || 'Not provided'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <h4 className="text-lg font-semibold">Step 3: Generate Login ID & Password</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Login ID *</label>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      className={`flex-1 px-3 py-2 border rounded-md ${
                        step3Errors.loginId ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={step3Data.loginId}
                      onChange={(e) => setStep3Data({...step3Data, loginId: e.target.value})}
                      placeholder="Login ID for customer"
                    />
                    <button 
                      onClick={generateLoginId}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                    >
                      Generate
                    </button>
                  </div>
                  {step3Errors.loginId && <p className="text-red-500 text-xs mt-1">{step3Errors.loginId}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <input 
                        type={showPassword ? "text" : "password"}
                        className={`w-full px-3 py-2 border rounded-md ${
                          step3Errors.password ? 'border-red-500' : 'border-gray-300'
                        }`}
                        value={step3Data.password}
                        onChange={(e) => setStep3Data({...step3Data, password: e.target.value})}
                        placeholder="Password"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                    <button 
                      onClick={generatePassword}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                    >
                      Generate
                    </button>
                  </div>
                  {step3Errors.password && <p className="text-red-500 text-xs mt-1">{step3Errors.password}</p>}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      className={`w-full px-3 py-2 border rounded-md ${
                        step3Errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={step3Data.confirmPassword}
                      onChange={(e) => setStep3Data({...step3Data, confirmPassword: e.target.value})}
                      placeholder="Confirm password"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                  {step3Errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{step3Errors.confirmPassword}</p>}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h5 className="font-semibold text-yellow-900 mb-2">Credentials Preview</h5>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-yellow-700">Login ID:</span>
                    <span className="font-mono ml-2">{step3Data.loginId || 'Not generated'}</span>
                  </div>
                  <div>
                    <span className="text-yellow-700">Password:</span>
                    <span className="font-mono ml-2">
                      {step3Data.password ? (showPassword ? step3Data.password : '••••••••') : 'Not generated'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  Please save these credentials securely. They will be provided to the customer for login.
                </p>
              </div>

              <div className="flex justify-between space-x-3 mt-6">
                <button 
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button 
                  onClick={handleAddCustomer}
                  disabled={isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {isLoading ? 'Submitting Request...' : 'Submit for Approval'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderAddLoanModal = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Add New Loan</h3>
          <button 
            onClick={() => setShowAddLoanModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-lg font-semibold text-blue-900 mb-2">Customer Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Customer Number:</span>
                <p className="text-blue-900">{customerDetails?.customerNumber}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Customer Name:</span>
                <p className="text-blue-900">{customerDetails?.name}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Business Name:</span>
                <p className="text-blue-900">{customerDetails?.businessName}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Enter Loan Details</h4>
            
            <div className="space-y-6">
              {/* Loan Type Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type *</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newLoanData.loanType}
                    onChange={(e) => {
                      const newLoanType = e.target.value;
                      setNewLoanData({
                        ...newLoanData, 
                        loanType: newLoanType,
                        loanDays: newLoanType === 'Monthly' ? '1' : 
                                 newLoanType === 'Weekly' ? '1' : '30',
                        emiType: newLoanType === 'Daily' ? 'fixed' : newLoanData.emiType
                      });
                    }}
                    required
                  >
                    <option value="Daily">Daily EMI</option>
                    <option value="Weekly">Weekly EMI</option>
                    <option value="Monthly">Monthly EMI</option>
                  </select>
                </div>
                
                {/* EMI Collection Type - Only show for Weekly/Monthly */}
                {newLoanData.loanType !== 'Daily' && (
                  <div className="md:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">EMI Collection Type *</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        newLoanData.emiType === 'fixed' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="emiType"
                          value="fixed"
                          checked={newLoanData.emiType === 'fixed'}
                          onChange={(e) => setNewLoanData({...newLoanData, emiType: e.target.value as 'fixed' | 'custom'})}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Fixed EMI</div>
                          <div className="text-sm text-gray-600">Same EMI amount for all periods</div>
                        </div>
                      </label>
                      
                      <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        newLoanData.emiType === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="emiType"
                          value="custom"
                          checked={newLoanData.emiType === 'custom'}
                          onChange={(e) => setNewLoanData({...newLoanData, emiType: e.target.value as 'fixed' | 'custom'})}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Custom EMI</div>
                          <div className="text-sm text-gray-600">Different EMI for last period</div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Loan Details Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Common Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Date *</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newLoanData.loanDate}
                    onChange={(e) => setNewLoanData({...newLoanData, loanDate: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">EMI Starting Date *</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newLoanData.emiStartDate}
                    onChange={(e) => setNewLoanData({...newLoanData, emiStartDate: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newLoanData.loanAmount}
                    onChange={(e) => setNewLoanData({...newLoanData, loanAmount: e.target.value})}
                    placeholder="Amount"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                {/* EMI Amount Fields */}
                {newLoanData.emiType === 'fixed' || newLoanData.loanType === 'Daily' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">EMI Amount *</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={newLoanData.emiAmount}
                      onChange={(e) => setNewLoanData({...newLoanData, emiAmount: e.target.value})}
                      placeholder="EMI Amount"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                ) : (
                  <>
                    {/* Custom EMI Fields */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fixed EMI Amount *</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newLoanData.emiAmount}
                        onChange={(e) => setNewLoanData({...newLoanData, emiAmount: e.target.value})}
                        placeholder="Fixed EMI Amount"
                        min="0"
                        step="0.01"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        For first {Number(newLoanData.loanDays || 1) - 1} {newLoanData.loanType === 'Weekly' ? 'weeks' : 'months'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last EMI Amount *</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={newLoanData.customEmiAmount || ''}
                        onChange={(e) => setNewLoanData({...newLoanData, customEmiAmount: e.target.value})}
                        placeholder="Last EMI Amount"
                        min="0"
                        step="0.01"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        For last 1 {newLoanData.loanType === 'Weekly' ? 'week' : 'month'}
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {newLoanData.loanType === 'Daily' ? 'No. of Days *' : 
                     newLoanData.loanType === 'Weekly' ? 'No. of Weeks *' : 'No. of Months *'}
                  </label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newLoanData.loanDays}
                    onChange={(e) => setNewLoanData({...newLoanData, loanDays: e.target.value})}
                    placeholder={newLoanData.loanType === 'Daily' ? 'Days' : 
                               newLoanData.loanType === 'Weekly' ? 'Weeks' : 'Months'}
                    min="1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {newLoanData.loanType === 'Daily' ? 'Total duration in days' : 
                     newLoanData.loanType === 'Weekly' ? 'Total duration in weeks' : 'Total duration in months'}
                  </p>
                </div>

                {/* Total Loan Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Loan Amount</label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    <p className="text-gray-900 font-semibold text-lg">
                      ₹{newLoanData.emiType === 'custom' && newLoanData.loanType !== 'Daily' ? (
                        ((Number(newLoanData.emiAmount || 0) * (Number(newLoanData.loanDays || 1) - 1)) + 
                         (Number(newLoanData.customEmiAmount || 0) * 1)).toLocaleString()
                      ) : (
                        (Number(newLoanData.emiAmount || 0) * Number(newLoanData.loanDays || 1)).toLocaleString()
                      )}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {newLoanData.emiType === 'custom' && newLoanData.loanType !== 'Daily' ? (
                      `Fixed Periods + Last Period (Auto-calculated)`
                    ) : (
                      `EMI × Duration (Auto-calculated)`
                    )}
                  </p>
                </div>
              </div>

              {/* Custom EMI Breakdown */}
              {newLoanData.emiType === 'custom' && newLoanData.loanType !== 'Daily' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h5 className="font-medium text-yellow-800 mb-3">Custom EMI Breakdown</h5>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-yellow-700">Fixed Periods</div>
                      <div className="text-lg font-bold text-yellow-900">{Number(newLoanData.loanDays || 1) - 1}</div>
                      <div className="text-xs text-yellow-600">{newLoanData.loanType === 'Weekly' ? 'weeks' : 'months'}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-yellow-700">Fixed EMI</div>
                      <div className="text-lg font-bold text-yellow-900">₹{newLoanData.emiAmount || '0'}</div>
                      <div className="text-xs text-yellow-600">per period</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-yellow-700">Last Period</div>
                      <div className="text-lg font-bold text-yellow-900">1</div>
                      <div className="text-xs text-yellow-600">{newLoanData.loanType === 'Weekly' ? 'week' : 'month'}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-yellow-700">Last EMI</div>
                      <div className="text-lg font-bold text-yellow-900">₹{newLoanData.customEmiAmount || '0'}</div>
                      <div className="text-xs text-yellow-600">final period</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Loan Summary */}
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h5 className="font-semibold text-green-900 mb-3">Loan Summary</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-green-700 font-medium">Loan Amount:</span>
                    <p className="font-semibold text-green-900">₹{newLoanData.loanAmount || '0'}</p>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Total Loan:</span>
                    <p className="font-semibold text-green-900">
                      ₹{newLoanData.emiType === 'custom' && newLoanData.loanType !== 'Daily' ? (
                        ((Number(newLoanData.emiAmount || 0) * (Number(newLoanData.loanDays || 1) - 1)) + 
                         (Number(newLoanData.customEmiAmount || 0) * 1)).toLocaleString()
                      ) : (
                        (Number(newLoanData.emiAmount || 0) * Number(newLoanData.loanDays || 1)).toLocaleString()
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Duration:</span>
                    <p className="font-semibold text-green-900">
                      {newLoanData.loanDays || '0'} 
                      {newLoanData.loanType === 'Daily' ? ' days' : 
                       newLoanData.loanType === 'Weekly' ? ' weeks' : ' months'}
                    </p>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">EMI Starts From:</span>
                    <p className="font-semibold text-green-900">
                      {newLoanData.emiStartDate ? formatDateToDDMMYYYY(newLoanData.emiStartDate) : 'Not set'}
                    </p>
                  </div>
                </div>

                {/* EMI Type Summary */}
                <div className="mt-3 pt-3 border-t border-green-200">
                  <span className="text-green-700 font-medium">EMI Type:</span>
                  <p className="font-semibold text-green-900">
                    {newLoanData.loanType === 'Daily' ? (
                      `Daily EMI - All ${newLoanData.loanDays} days at ₹${newLoanData.emiAmount || '0'}`
                    ) : newLoanData.emiType === 'fixed' ? (
                      `Fixed EMI - All ${newLoanData.loanDays} ${newLoanData.loanType.toLowerCase()} periods at ₹${newLoanData.emiAmount || '0'}`
                    ) : (
                      `Custom EMI - ${Number(newLoanData.loanDays || 1) - 1} periods at ₹${newLoanData.emiAmount || '0'} + 1 period at ₹${newLoanData.customEmiAmount || '0'}`
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button 
            onClick={() => setShowAddLoanModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            onClick={handleAddNewLoan}
            disabled={isLoading || !newLoanData.loanAmount || !newLoanData.emiAmount || !newLoanData.loanDays}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Adding...' : 'Submit Loan Addition Request'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

  const renderEditLoanModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Edit Loan</h3>
            <button 
              onClick={() => setShowEditLoan(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-lg font-semibold text-blue-900 mb-2">Customer Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Customer Name:</span>
                  <p className="text-blue-900">{editLoanData.customerName}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Customer Number:</span>
                  <p className="text-blue-900">{editLoanData.customerNumber}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Loan Number:</span>
                  <p className="text-blue-900">{editLoanData.loanNumber}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Edit Loan Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Date *</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formatDateForInput(editLoanData.dateApplied)}
                    onChange={(e) => setEditLoanData({...editLoanData, dateApplied: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type *</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editLoanData.loanType}
                    onChange={(e) => {
                      setEditLoanData({
                        ...editLoanData, 
                        loanType: e.target.value,
                        loanDays: e.target.value === 'Monthly' ? '30' : 
                                 e.target.value === 'Weekly' ? '7' : '30'
                      });
                    }}
                    required
                  >
                    <option value="Daily">Daily EMI</option>
                    <option value="Weekly">Weekly EMI</option>
                    <option value="Monthly">Monthly EMI</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount *</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editLoanData.amount}
                    onChange={(e) => setEditLoanData({...editLoanData, amount: e.target.value})}
                    placeholder="Amount"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">EMI Amount *</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editLoanData.emiAmount}
                    onChange={(e) => setEditLoanData({...editLoanData, emiAmount: e.target.value})}
                    placeholder="EMI Amount"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {editLoanData.loanType === 'Daily' ? 'No. of Days *' : 
                     editLoanData.loanType === 'Weekly' ? 'No. of Weeks *' : 'No. of Months *'}
                  </label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={editLoanData.loanDays}
                    onChange={(e) => setEditLoanData({...editLoanData, loanDays: e.target.value})}
                    placeholder={editLoanData.loanType === 'Daily' ? 'Days' : 
                               editLoanData.loanType === 'Weekly' ? 'Weeks' : 'Months'}
                    min="1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editLoanData.loanType === 'Daily' ? 'Total duration in days' : 
                     editLoanData.loanType === 'Weekly' ? 'Total duration in weeks' : 'Total duration in months'}
                  </p>
                </div>
              </div>
            </div>

            {editLoanData.originalData && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h5 className="font-semibold text-yellow-900 mb-2">Changes Summary</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="text-yellow-700">Loan Amount:</span>
                    <p className="font-semibold">
                      <span className="text-red-600 line-through">₹{editLoanData.originalData.amount}</span>
                      <span className="text-green-600 ml-2">→ ₹{editLoanData.amount || '0'}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-yellow-700">EMI Amount:</span>
                    <p className="font-semibold">
                      <span className="text-red-600 line-through">₹{editLoanData.originalData.emiAmount}</span>
                      <span className="text-green-600 ml-2">→ ₹{editLoanData.emiAmount || '0'}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-yellow-700">Loan Type:</span>
                    <p className="font-semibold">
                      <span className="text-red-600 line-through">{editLoanData.originalData.loanType}</span>
                      <span className="text-green-600 ml-2">→ {editLoanData.loanType}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-yellow-700">Duration:</span>
                    <p className="font-semibold">
                      <span className="text-red-600 line-through">{editLoanData.originalData.loanDays}</span>
                      <span className="text-green-600 ml-2">→ {editLoanData.loanDays || '0'}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-yellow-700">Loan Date:</span>
                    <p className="font-semibold">
                      <span className="text-red-600 line-through">
                        {new Date(editLoanData.originalData.dateApplied).toLocaleDateString()}
                      </span>
                      <span className="text-green-600 ml-2">
                        → {new Date(editLoanData.dateApplied).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h5 className="font-semibold text-blue-900 mb-2">Note</h5>
              <p className="text-sm text-blue-700">
                This edit request will be sent to the admin for approval. The changes will only be applied after admin approval.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button 
              onClick={() => setShowEditLoan(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveEditLoan}
              disabled={isLoading || !editLoanData.amount || !editLoanData.emiAmount || !editLoanData.loanDays}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Submitting...' : 'Submit Edit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRenewLoanModal = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Renew Loan</h3>
          <button 
            onClick={() => setShowRenewLoan(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-lg font-semibold text-blue-900 mb-2">Customer Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700 font-medium">Customer Name:</span>
                <p className="text-blue-900">{renewLoanData.customerName}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Customer Number:</span>
                <p className="text-blue-900">{renewLoanData.customerNumber}</p>
              </div>
              <div>
                <span className="text-blue-700 font-medium">Renewal Date:</span>
                <p className="text-blue-900">{renewLoanData.renewalDate}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Renew Loan Details</h4>
            
            <div className="space-y-6">
              {/* Loan Type Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type *</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={renewLoanData.newLoanType}
                    onChange={(e) => {
                      const newLoanType = e.target.value;
                      setRenewLoanData({
                        ...renewLoanData, 
                        newLoanType: newLoanType,
                        newLoanDays: newLoanType === 'Monthly' ? '1' : 
                                   newLoanType === 'Weekly' ? '1' : '30',
                        emiType: newLoanType === 'Daily' ? 'fixed' : renewLoanData.emiType
                      });
                    }}
                    required
                  >
                    <option value="Daily">Daily EMI</option>
                    <option value="Weekly">Weekly EMI</option>
                    <option value="Monthly">Monthly EMI</option>
                  </select>
                </div>
                
                {/* EMI Collection Type - Only show for Weekly/Monthly */}
                {renewLoanData.newLoanType !== 'Daily' && (
                  <div className="md:col-span-2 lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">EMI Collection Type *</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        renewLoanData.emiType === 'fixed' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="emiType"
                          value="fixed"
                          checked={renewLoanData.emiType === 'fixed'}
                          onChange={(e) => setRenewLoanData({...renewLoanData, emiType: e.target.value as 'fixed' | 'custom'})}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Fixed EMI</div>
                          <div className="text-sm text-gray-600">Same EMI amount for all periods</div>
                        </div>
                      </label>
                      
                      <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        renewLoanData.emiType === 'custom' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="emiType"
                          value="custom"
                          checked={renewLoanData.emiType === 'custom'}
                          onChange={(e) => setRenewLoanData({...renewLoanData, emiType: e.target.value as 'fixed' | 'custom'})}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <div className="font-medium text-gray-900">Custom EMI</div>
                          <div className="text-sm text-gray-600">Different EMI for last period</div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Loan Details Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Common Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Renewal Date *</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={renewLoanData.renewalDate}
                    onChange={(e) => setRenewLoanData({...renewLoanData, renewalDate: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">EMI Starting Date *</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={renewLoanData.emiStartDate}
                    onChange={(e) => setRenewLoanData({...renewLoanData, emiStartDate: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount *</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={renewLoanData.newLoanAmount}
                    onChange={(e) => setRenewLoanData({...renewLoanData, newLoanAmount: e.target.value})}
                    placeholder="Loan Amount"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                {/* EMI Amount Fields */}
                {renewLoanData.emiType === 'fixed' || renewLoanData.newLoanType === 'Daily' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">EMI Amount *</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={renewLoanData.newEmiAmount}
                      onChange={(e) => setRenewLoanData({...renewLoanData, newEmiAmount: e.target.value})}
                      placeholder="EMI Amount"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                ) : (
                  <>
                    {/* Custom EMI Fields */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fixed EMI Amount *</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={renewLoanData.newEmiAmount}
                        onChange={(e) => setRenewLoanData({...renewLoanData, newEmiAmount: e.target.value})}
                        placeholder="Fixed EMI Amount"
                        min="0"
                        step="0.01"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        For first {Number(renewLoanData.newLoanDays || 1) - 1} {renewLoanData.newLoanType === 'Weekly' ? 'weeks' : 'months'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last EMI Amount *</label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={renewLoanData.customEmiAmount || ''}
                        onChange={(e) => setRenewLoanData({...renewLoanData, customEmiAmount: e.target.value})}
                        placeholder="Last EMI Amount"
                        min="0"
                        step="0.01"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        For last 1 {renewLoanData.newLoanType === 'Weekly' ? 'week' : 'month'}
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {renewLoanData.newLoanType === 'Daily' ? 'No. of Days *' : 
                     renewLoanData.newLoanType === 'Weekly' ? 'No. of Weeks *' : 'No. of Months *'}
                  </label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={renewLoanData.newLoanDays}
                    onChange={(e) => setRenewLoanData({...renewLoanData, newLoanDays: e.target.value})}
                    placeholder={renewLoanData.newLoanType === 'Daily' ? 'Days' : 
                               renewLoanData.newLoanType === 'Weekly' ? 'Weeks' : 'Months'}
                    min="1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {renewLoanData.newLoanType === 'Daily' ? 'Total duration in days' : 
                     renewLoanData.newLoanType === 'Weekly' ? 'Total duration in weeks' : 'Total duration in months'}
                  </p>
                </div>

                {/* Total Loan Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Loan Amount</label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    <p className="text-gray-900 font-semibold text-lg">
                      ₹{renewLoanData.emiType === 'custom' && renewLoanData.newLoanType !== 'Daily' ? (
                        ((Number(renewLoanData.newEmiAmount || 0) * (Number(renewLoanData.newLoanDays || 1) - 1)) + 
                         (Number(renewLoanData.customEmiAmount || 0) * 1)).toLocaleString()
                      ) : (
                        (Number(renewLoanData.newEmiAmount || 0) * Number(renewLoanData.newLoanDays || 1)).toLocaleString()
                      )}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {renewLoanData.emiType === 'custom' && renewLoanData.newLoanType !== 'Daily' ? (
                      `Fixed Periods + Last Period (Auto-calculated)`
                    ) : (
                      `EMI × Duration (Auto-calculated)`
                    )}
                  </p>
                </div>
              </div>

              {/* Custom EMI Breakdown */}
              {renewLoanData.emiType === 'custom' && renewLoanData.newLoanType !== 'Daily' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h5 className="font-medium text-yellow-800 mb-3">Custom EMI Breakdown</h5>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-yellow-700">Fixed Periods</div>
                      <div className="text-lg font-bold text-yellow-900">{Number(renewLoanData.newLoanDays || 1) - 1}</div>
                      <div className="text-xs text-yellow-600">{renewLoanData.newLoanType === 'Weekly' ? 'weeks' : 'months'}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-yellow-700">Fixed EMI</div>
                      <div className="text-lg font-bold text-yellow-900">₹{renewLoanData.newEmiAmount || '0'}</div>
                      <div className="text-xs text-yellow-600">per period</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-yellow-700">Last Period</div>
                      <div className="text-lg font-bold text-yellow-900">1</div>
                      <div className="text-xs text-yellow-600">{renewLoanData.newLoanType === 'Weekly' ? 'week' : 'month'}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-yellow-700">Last EMI</div>
                      <div className="text-lg font-bold text-yellow-900">₹{renewLoanData.customEmiAmount || '0'}</div>
                      <div className="text-xs text-yellow-600">final period</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Loan Summary */}
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h5 className="font-semibold text-green-900 mb-3">Renewal Summary</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-green-700 font-medium">Loan Amount:</span>
                    <p className="font-semibold text-green-900">₹{renewLoanData.newLoanAmount || '0'}</p>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Total Loan:</span>
                    <p className="font-semibold text-green-900">
                      ₹{renewLoanData.emiType === 'custom' && renewLoanData.newLoanType !== 'Daily' ? (
                        ((Number(renewLoanData.newEmiAmount || 0) * (Number(renewLoanData.newLoanDays || 1) - 1)) + 
                         (Number(renewLoanData.customEmiAmount || 0) * 1)).toLocaleString()
                      ) : (
                        (Number(renewLoanData.newEmiAmount || 0) * Number(renewLoanData.newLoanDays || 1)).toLocaleString()
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Duration:</span>
                    <p className="font-semibold text-green-900">
                      {renewLoanData.newLoanDays || '0'} 
                      {renewLoanData.newLoanType === 'Daily' ? ' days' : 
                       renewLoanData.newLoanType === 'Weekly' ? ' weeks' : ' months'}
                    </p>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">EMI Starts From:</span>
                    <p className="font-semibold text-green-900">
                      {renewLoanData.emiStartDate ? formatDateToDDMMYYYY(renewLoanData.emiStartDate) : 'Not set'}
                    </p>
                  </div>
                </div>

                {/* EMI Type Summary */}
                <div className="mt-3 pt-3 border-t border-green-200">
                  <span className="text-green-700 font-medium">EMI Type:</span>
                  <p className="font-semibold text-green-900">
                    {renewLoanData.newLoanType === 'Daily' ? (
                      `Daily EMI - All ${renewLoanData.newLoanDays} days at ₹${renewLoanData.newEmiAmount || '0'}`
                    ) : renewLoanData.emiType === 'fixed' ? (
                      `Fixed EMI - All ${renewLoanData.newLoanDays} ${renewLoanData.newLoanType.toLowerCase()} periods at ₹${renewLoanData.newEmiAmount || '0'}`
                    ) : (
                      `Custom EMI - ${Number(renewLoanData.newLoanDays || 1) - 1} periods at ₹${renewLoanData.newEmiAmount || '0'} + 1 period at ₹${renewLoanData.customEmiAmount || '0'}`
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                <textarea 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  value={renewLoanData.remarks}
                  onChange={(e) => setRenewLoanData({...renewLoanData, remarks: e.target.value})}
                  placeholder="Enter any remarks or notes for this renewal..."
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h5 className="font-semibold text-blue-900 mb-2">Note</h5>
            <p className="text-sm text-blue-700">
              This renewal request will create a new loan and add it to the customer's loan list. 
              The original loan will be marked as "Renewed". This request requires admin approval.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <button 
            onClick={() => setShowRenewLoan(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveRenewLoan}
            disabled={isLoading || !renewLoanData.newLoanAmount || !renewLoanData.newEmiAmount || !renewLoanData.newLoanDays}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {isLoading ? 'Submitting...' : 'Submit Renewal Request'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

  const renderEditCustomer = () => {
  const phoneNumbers = Array.isArray(editCustomerData.phone) ? editCustomerData.phone : [editCustomerData.phone || ''];
  
  // Ensure we have at least two phone number slots
  const primaryPhone = phoneNumbers[0] || '';
  const secondaryPhone = phoneNumbers[1] || '';
  const whatsappNumber = editCustomerData.whatsappNumber || '';
  
  const handleFileUpload = (file: File | null) => {
    if (file && !file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPEG, etc.) for profile picture');
      return;
    }
    // In a real implementation, you would handle the file upload here
    console.log('Profile picture selected:', file);
    alert('Profile picture upload functionality would be implemented here');
  };

  const toggleEditField = (fieldName: string) => {
    setEditingFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  const handleSaveEditCustomer = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Starting edit customer request...');
      console.log('📦 Edit data:', editCustomerData);

      if (!editCustomerData.name || !primaryPhone || !editCustomerData.area || !editCustomerData.customerNumber) {
        alert('Please fill all required fields');
        setIsLoading(false);
        return;
      }

      // Prepare phone array with valid numbers only
      const phoneArray = [primaryPhone];
      if (secondaryPhone.trim()) {
        phoneArray.push(secondaryPhone);
      }

      const apiUrl = '/api/data-entry/edit-customer-request';
      console.log('🌐 Calling API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editCustomerData,
          phone: phoneArray,
          whatsappNumber: whatsappNumber || '',
          loanAmount: Number(editCustomerData.loanAmount),
          emiAmount: Number(editCustomerData.emiAmount),
          requestedBy: 'data_entry_operator_1'
        }),
      });

      console.log('📡 Response status:', response.status);

      const responseText = await response.text();
      console.log('📄 Raw response:', responseText);

      if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
        console.error('❌ Server returned HTML instead of JSON. Likely a 404 error.');
        throw new Error('API endpoint not found. Please check the server.');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        throw new Error('Server returned invalid JSON. Response: ' + responseText.substring(0, 200));
      }

      console.log('✅ Parsed response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      alert('Edit request submitted successfully! Waiting for admin approval.');
      setShowEditCustomer(false);
      setEditingFields({});
      setEditCustomerData({
        name: '',
        phone: [''],
        whatsappNumber: '',
        businessName: '',
        area: '',
        customerNumber: '',
        loanAmount: '',
        emiAmount: '',
        loanType: 'Daily',
        address: '',
        customerId: '',
        category: 'A',
        officeCategory: 'Office 1'
      });
      
      if (activeTab === 'requests') fetchPendingRequests();
    } catch (error: any) {
      console.error('💥 Error in handleSaveEditCustomer:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Edit Customer Profile</h3>
            <button 
              onClick={() => setShowEditCustomer(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Customer Information Header */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-lg font-semibold text-blue-900 mb-2">Customer Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Customer ID:</span>
                  <p className="text-blue-900">{editCustomerData.customerId}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Current Customer Number:</span>
                  <p className="text-blue-900">{editCustomerData.customerNumber}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Status:</span>
                  <p className="text-blue-900">Active</p>
                </div>
              </div>
            </div>

            {/* Profile Picture Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h4>
              <div className="flex items-center space-x-6">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-400 text-2xl">👤</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex space-x-3">
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
                        className="hidden"
                        id="profile-picture-edit"
                      />
                      <label 
                        htmlFor="profile-picture-edit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 cursor-pointer text-sm"
                      >
                        Upload New Photo
                      </label>
                    </div>
                    <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm">
                      Remove Current
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Recommended: Square image, 500x500 pixels, max 2MB
                  </p>
                </div>
              </div>
            </div>

            {/* Personal Information Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h4>
              
              <div className="space-y-4">
                {/* Customer Name */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name *
                    </label>
                    {editingFields.name ? (
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={editCustomerData.name}
                        onChange={(e) => setEditCustomerData({...editCustomerData, name: e.target.value})}
                        required
                      />
                    ) : (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-900">{editCustomerData.name}</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => toggleEditField('name')}
                    className={`px-4 py-2 rounded-md text-sm whitespace-nowrap mt-6 ${
                      editingFields.name 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {editingFields.name ? 'Save' : 'Edit'}
                  </button>
                </div>

                {/* Phone Numbers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Primary Phone */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Primary Phone Number *
                      </label>
                      {editingFields.primaryPhone ? (
                        <input 
                          type="tel" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={primaryPhone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 10) {
                              const newPhones = [value, secondaryPhone];
                              setEditCustomerData({...editCustomerData, phone: newPhones});
                            }
                          }}
                          placeholder="10-digit primary phone"
                          maxLength={10}
                          required
                        />
                      ) : (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                          <p className="text-gray-900">{primaryPhone}</p>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => toggleEditField('primaryPhone')}
                      className={`px-4 py-2 rounded-md text-sm whitespace-nowrap mt-6 ${
                        editingFields.primaryPhone 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {editingFields.primaryPhone ? 'Save' : 'Edit'}
                  </button>
                  </div>

                  {/* Secondary Phone */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Secondary Phone Number
                      </label>
                      {editingFields.secondaryPhone ? (
                        <input 
                          type="tel" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={secondaryPhone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 10) {
                              const newPhones = [primaryPhone, value];
                              setEditCustomerData({...editCustomerData, phone: newPhones});
                            }
                          }}
                          placeholder="10-digit secondary phone"
                          maxLength={10}
                        />
                      ) : (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                          <p className="text-gray-900">{secondaryPhone || 'Not provided'}</p>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => toggleEditField('secondaryPhone')}
                      className={`px-4 py-2 rounded-md text-sm whitespace-nowrap mt-6 ${
                        editingFields.secondaryPhone 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {editingFields.secondaryPhone ? 'Save' : 'Edit'}
                    </button>
                  </div>
                </div>

                {/* WhatsApp Number */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="flex items-center gap-1">
                        <span>WhatsApp Number</span>
                        <span className="text-green-600">📱</span>
                      </span>
                    </label>
                    {editingFields.whatsappNumber ? (
                      <input 
                        type="tel" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={whatsappNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 10) {
                            setEditCustomerData({...editCustomerData, whatsappNumber: value});
                          }
                        }}
                        placeholder="10-digit WhatsApp number"
                        maxLength={10}
                      />
                    ) : (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-900">{whatsappNumber || 'Not provided'}</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => toggleEditField('whatsappNumber')}
                    className={`px-4 py-2 rounded-md text-sm whitespace-nowrap mt-6 ${
                      editingFields.whatsappNumber 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {editingFields.whatsappNumber ? 'Save' : 'Edit'}
                  </button>
                </div>
              </div>
            </div>

            {/* Business Information Section */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h4>
              
              <div className="space-y-4">
                {/* Business Name */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Business Name *
                    </label>
                    {editingFields.businessName ? (
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={editCustomerData.businessName}
                        onChange={(e) => setEditCustomerData({...editCustomerData, businessName: e.target.value})}
                        required
                      />
                    ) : (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-900">{editCustomerData.businessName}</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => toggleEditField('businessName')}
                    className={`px-4 py-2 rounded-md text-sm whitespace-nowrap mt-6 ${
                      editingFields.businessName 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {editingFields.businessName ? 'Save' : 'Edit'}
                  </button>
                </div>

                {/* Area */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Area *
                    </label>
                    {editingFields.area ? (
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={editCustomerData.area}
                        onChange={(e) => setEditCustomerData({...editCustomerData, area: e.target.value})}
                        required
                      />
                    ) : (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-900">{editCustomerData.area}</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => toggleEditField('area')}
                    className={`px-4 py-2 rounded-md text-sm whitespace-nowrap mt-6 ${
                      editingFields.area 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {editingFields.area ? 'Save' : 'Edit'}
                  </button>
                </div>

                {/* Customer Number */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Number *
                    </label>
                    {editingFields.customerNumber ? (
                      <div className="flex">
                        <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-md">
                          CN
                        </span>
                        <input 
                          type="text" 
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={editCustomerData.customerNumber.replace('CN', '')}
                          onChange={(e) => setEditCustomerData({
                            ...editCustomerData, 
                            customerNumber: `CN${e.target.value.replace(/\D/g, '')}`
                          })}
                          placeholder="Enter numbers only"
                          maxLength={10}
                          required
                        />
                      </div>
                    ) : (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-900">{editCustomerData.customerNumber}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Full customer number: {editCustomerData.customerNumber}</p>
                  </div>
                  <button 
                    onClick={() => toggleEditField('customerNumber')}
                    className={`px-4 py-2 rounded-md text-sm whitespace-nowrap mt-6 ${
                      editingFields.customerNumber 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {editingFields.customerNumber ? 'Save' : 'Edit'}
                  </button>
                </div>

                {/* Address */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    {editingFields.address ? (
                      <textarea 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        value={editCustomerData.address}
                        onChange={(e) => setEditCustomerData({...editCustomerData, address: e.target.value})}
                        placeholder="Enter complete address"
                      />
                    ) : (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 min-h-[80px]">
                        <p className="text-gray-900 whitespace-pre-wrap">{editCustomerData.address || 'Not provided'}</p>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => toggleEditField('address')}
                    className={`px-4 py-2 rounded-md text-sm whitespace-nowrap mt-6 ${
                      editingFields.address 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {editingFields.address ? 'Save' : 'Edit'}
                  </button>
                </div>
              </div>
            </div>

            {/* Category & Office Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Category & Office Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    {editingFields.category ? (
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={editCustomerData.category}
                        onChange={(e) => setEditCustomerData({...editCustomerData, category: e.target.value})}
                        required
                      >
                        <option value="A">Category A</option>
                        <option value="B">Category B</option>
                        <option value="C">Category C</option>
                      </select>
                    ) : (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-900">{editCustomerData.category}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Customer priority category</p>
                  </div>
                  <button 
                    onClick={() => toggleEditField('category')}
                    className={`px-4 py-2 rounded-md text-sm whitespace-nowrap mt-6 ${
                      editingFields.category 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {editingFields.category ? 'Save' : 'Edit'}
                  </button>
                </div>

                {/* Office Category */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Office Category *
                    </label>
                    {editingFields.officeCategory ? (
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={editCustomerData.officeCategory}
                        onChange={(e) => setEditCustomerData({...editCustomerData, officeCategory: e.target.value})}
                        required
                      >
                        <option value="Office 1">Office 1</option>
                        <option value="Office 2">Office 2</option>
                      </select>
                    ) : (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-900">{editCustomerData.officeCategory}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">Assigned office location</p>
                  </div>
                  <button 
                    onClick={() => toggleEditField('officeCategory')}
                    className={`px-4 py-2 rounded-md text-sm whitespace-nowrap mt-6 ${
                      editingFields.officeCategory 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {editingFields.officeCategory ? 'Save' : 'Edit'}
                  </button>
                </div>
              </div>
            </div>

            {/* Note Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h5 className="font-semibold text-blue-900 mb-2">Note</h5>
              <p className="text-sm text-blue-700">
                This edit request will be sent to the admin for approval. The changes will only be applied after admin approval.
                Click the "Edit" buttons next to each field to make changes, then click "Submit Profile Edit" below to send for approval.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button 
              onClick={() => setShowEditCustomer(false)}
              className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveEditCustomer}
              disabled={isLoading || !editCustomerData.name || !primaryPhone || !editCustomerData.businessName || !editCustomerData.area || !editCustomerData.customerNumber}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⏳</span>
                  Submitting...
                </span>
              ) : (
                'Submit Profile Edit Request'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderEMI = () => {
  // Filter customers for EMI section
  const filteredEMICustomers = customers.filter(customer => {
    const matchesSearch = emiSearchQuery === '' || 
      customer.name.toLowerCase().includes(emiSearchQuery.toLowerCase()) ||
      (customer.customerNumber && customer.customerNumber.toLowerCase().includes(emiSearchQuery.toLowerCase()));
    
    return matchesSearch && customer.status === 'active';
  });

  // Sort EMI customers by customer number
  const sortedEMICustomers = [...filteredEMICustomers].sort((a, b) => {
    const aNumber = a.customerNumber || '';
    const bNumber = b.customerNumber || '';
    
    if (emiSortOrder === 'asc') {
      return aNumber.localeCompare(bNumber);
    } else {
      return bNumber.localeCompare(aNumber);
    }
  });

  // Get EMI status for a customer with real data
  const getEMIStatus = (customer: Customer) => {
    const today = new Date().toISOString().split('T')[0];
    const customerLoans = getAllCustomerLoans(customer, null);
    
    let hasPaid = false;
    let hasPartial = false;
    let hasUnpaid = false;

    customerLoans.forEach(loan => {
      if (loan.emiHistory && loan.emiHistory.length > 0) {
        const todayPayment = loan.emiHistory.find(payment => 
          payment.paymentDate === today
        );
        
        if (todayPayment) {
          if (todayPayment.status === 'Paid') {
            hasPaid = true;
          } else if (todayPayment.status === 'Partial') {
            hasPartial = true;
          }
        } else {
          hasUnpaid = true;
        }
      } else {
        hasUnpaid = true;
      }
    });

    if (hasPaid) return 'paid';
    if (hasPartial) return 'partial';
    return 'unpaid';
  };

  const getEMIStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEMIStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partial': return 'Partial Paid';
      case 'unpaid': return 'Unpaid';
      default: return 'Unknown';
    }
  };

  const handleCustomerSelectForEMI = (customer: Customer) => {
    setSelectedCustomerForEMI(customer);
    setSelectedCustomer(customer);
    setShowUpdateEMI(true);
  };

  const handleViewCustomerLoans = (customer: Customer) => {
    // Toggle - if same customer is clicked again, close it
    if (selectedCustomerForEMI?._id === customer._id) {
      setSelectedCustomerForEMI(null);
    } else {
      setSelectedCustomerForEMI(customer);
    }
  };

  // Get payment status for a specific loan with real data
  const getLoanPaymentStatus = (loan: Loan) => {
    const today = new Date().toISOString().split('T')[0];
    const todayPayment = loan.emiHistory?.find(payment => payment.paymentDate === today);
    
    return {
      status: todayPayment?.status || 'Unpaid',
      amount: todayPayment?.amount || 0,
      date: todayPayment?.paymentDate || today
    };
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Partial': return 'bg-yellow-100 text-yellow-800';
      case 'Advance': return 'bg-blue-100 text-blue-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">EMI Management</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage daily EMI collections for all customers</p>
        </div>
        
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            {/* Search and Sort Section */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by customer name or customer number..."
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={emiSearchQuery}
                      onChange={(e) => setEmiSearchQuery(e.target.value)}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400">🔍</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setEmiSortOrder(emiSortOrder === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>Sort {emiSortOrder === 'asc' ? '↑' : '↓'}</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Showing {sortedEMICustomers.length} of {customers.filter(c => c.status === 'active').length} active customers
                </span>
                
                {emiSearchQuery && (
                  <button
                    onClick={() => setEmiSearchQuery('')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear search
                  </button>
                )}
              </div>
            </div>

            {/* Customers List */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                        Customer Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                        Customer Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                        Business Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                        Office
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                        EMI Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedEMICustomers.map((customer) => {
                      const emiStatus = getEMIStatus(customer);
                      const isSelected = selectedCustomerForEMI?._id === customer._id;
                      const customerLoans = getAllCustomerLoans(customer, null);
                      
                      return (
                        <>
                          <tr 
                            key={customer._id} 
                            className={`hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
                              isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                            }`}
                            onClick={() => handleViewCustomerLoans(customer)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 w-1/6">
                              {customer.customerNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-1/6">
                              {customer.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/6">
                              {customer.businessName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/6">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                customer.officeCategory === 'Office 1' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {customer.officeCategory || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm w-1/6">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEMIStatusColor(emiStatus)}`}>
                                {getEMIStatusText(emiStatus)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium w-1/6">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCustomerSelectForEMI(customer);
                                }}
                                className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm transition-colors"
                              >
                                Update EMI
                              </button>
                            </td>
                          </tr>
                          
                          {/* Expanded Loan Details with smooth transition */}
                          {isSelected && (
                            <tr className="bg-blue-50">
                              <td colSpan={6} className="px-6 py-4">
                                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm transition-all duration-300 ease-in-out">
                                  <h5 className="font-semibold text-gray-900 mb-3 text-lg">
                                    Loan Details - {customer.name} - {customer.customerNumber}
                                  </h5>
                                  <div className="space-y-3">
                                    {customerLoans.map((loan, index) => {
                                      const paymentInfo = getLoanPaymentStatus(loan);
                                      const completion = calculateEMICompletion(loan);
                                      
                                      return (
                                        <div key={loan._id} className="flex justify-between items-center p-4 border border-gray-200 rounded-md bg-gray-50 hover:bg-white transition-colors">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-6 mb-2">
                                              <span className="font-medium text-gray-900 text-lg">
                                                {loan.loanNumber}
                                              </span>
                                              <span className="text-sm text-gray-700 font-semibold">
                                                EMI: ₹{loan.emiAmount}
                                              </span>
                                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(paymentInfo.status)}`}>
                                                {paymentInfo.status}
                                              </span>
                                            </div>
                                            <div className="text-sm text-gray-600 grid grid-cols-1 md:grid-cols-2 gap-2">
                                              <div>
                                                <span className="font-medium">Next EMI Date: </span>
                                                {formatDateToDDMMYYYY(loan.nextEmiDate)}
                                              </div>
                                              <div>
                                                <span className="font-medium">Paid: </span>
                                                {loan.emiPaidCount || 0} / {loan.totalEmiCount || loan.loanDays || 30} EMIs
                                              </div>
                                            </div>
                                            {paymentInfo.amount > 0 && paymentInfo.status !== 'Unpaid' && (
                                              <div className="text-xs text-green-600 mt-1">
                                                Today's Payment: ₹{paymentInfo.amount} on {formatDateToDDMMYYYY(paymentInfo.date)}
                                              </div>
                                            )}
                                          </div>
                                          <button 
                                            onClick={() => {
                                              setSelectedCustomerForEMI(customer);
                                              setSelectedCustomer(customer);
                                              setSelectedLoanForPayment(loan);
                                              setShowUpdateEMI(true);
                                            }}
                                            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm transition-colors"
                                          >
                                            Pay EMI
                                          </button>
                                        </div>
                                      );
                                    })}
                                    
                                    {customerLoans.length === 0 && (
                                      <div className="text-center py-4 text-gray-500">
                                        No loans found for this customer
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                    
                    {sortedEMICustomers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center">
                          <div className="text-gray-400 text-4xl mb-4">💰</div>
                          <p className="text-gray-500 text-lg">No customers found</p>
                          <p className="text-sm text-gray-400 mt-2">
                            {emiSearchQuery 
                              ? 'Try adjusting your search terms' 
                              : 'No active customers available for EMI management'
                            }
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-green-500 text-2xl">✅</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Paid Today</p>
                    <p className="text-2xl font-semibold text-green-600">
                      {sortedEMICustomers.filter(c => getEMIStatus(c) === 'paid').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-red-500 text-2xl">⏰</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Pending</p>
                    <p className="text-2xl font-semibold text-red-600">
                      {sortedEMICustomers.filter(c => getEMIStatus(c) === 'unpaid').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-yellow-500 text-2xl">💰</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Partial</p>
                    <p className="text-2xl font-semibold text-yellow-600">
                      {sortedEMICustomers.filter(c => getEMIStatus(c) === 'partial').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderRequests = () => {

  const requestTypes = [
    'all',
    'New Customer',
    'New Loan', 
    'Customer Edit',
    'Loan Edit',
    'Loan Renew',
    'Loan Addition',
    'Loan Deletion',
    'EMI Correction'
  ];

  const statusOptions = [
    'all',
    'Pending',
    'Approved',
    'Rejected',
    'Processing'
  ];

  const dateSortOptions = [
    { value: 'latest', label: 'Latest First' },
    { value: 'oldest', label: 'Oldest First' }
  ];

  // Filter and sort requests
  const filteredRequests = pendingRequests
    .filter(request => {
      const matchesType = requestFilters.type === 'all' || request.type === requestFilters.type;
      const matchesStatus = requestFilters.status === 'all' || request.status === requestFilters.status;
      return matchesType && matchesStatus;
    })
    .sort((a, b) => {
      if (requestFilters.dateSort === 'latest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });

  const clearFilters = () => {
    setRequestFilters({
      type: 'all',
      dateSort: 'latest',
      status: 'all'
    });
  };

  const hasActiveFilters = requestFilters.type !== 'all' || requestFilters.status !== 'all' || requestFilters.dateSort !== 'latest';

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Pending Requests</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Requests waiting for admin approval</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                filteredRequests.length > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {filteredRequests.length} request(s)
              </span>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="border-t border-gray-200 px-4 py-4 bg-gray-50">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Request Type Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Request Type
              </label>
              <select
                value={requestFilters.type}
                onChange={(e) => setRequestFilters(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {requestTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={requestFilters.status}
                onChange={(e) => setRequestFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Status' : status}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Sort */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort by Date
              </label>
              <select
                value={requestFilters.dateSort}
                onChange={(e) => setRequestFilters(prev => ({ ...prev, dateSort: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {dateSortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-gray-600">Active filters:</span>
              {requestFilters.type !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  Type: {requestFilters.type}
                  <button 
                    onClick={() => setRequestFilters(prev => ({ ...prev, type: 'all' }))}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {requestFilters.status !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  Status: {requestFilters.status}
                  <button 
                    onClick={() => setRequestFilters(prev => ({ ...prev, status: 'all' }))}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {requestFilters.dateSort !== 'latest' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                  Sort: {dateSortOptions.find(opt => opt.value === requestFilters.dateSort)?.label}
                  <button 
                    onClick={() => setRequestFilters(prev => ({ ...prev, dateSort: 'latest' }))}
                    className="ml-1 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(filteredRequests) && filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <tr key={request._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            request.type === 'New Customer' ? 'bg-green-100 text-green-800' :
                            request.type === 'New Loan' ? 'bg-blue-100 text-blue-800' :
                            request.type === 'Customer Edit' ? 'bg-yellow-100 text-yellow-800' :
                            request.type === 'Loan Edit' ? 'bg-orange-100 text-orange-800' :
                            request.type === 'Loan Renew' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {request.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.customerName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateToDDMMYYYY(request.createdAt)}
                        <div className="text-xs text-gray-400">
                          {new Date(request.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          request.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          request.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          request.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.description || request.type}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <div className="text-gray-400 text-4xl mb-4">📋</div>
                      <p className="text-gray-500 text-lg">No requests found</p>
                      <p className="text-sm text-gray-400 mt-2">
                        {hasActiveFilters 
                          ? 'Try adjusting your filters to see more results' 
                          : 'All requests are processed or no requests submitted yet'
                        }
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={clearFilters}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          {filteredRequests.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Total shown:</span> {filteredRequests.length}
                </div>
                {requestFilters.type !== 'all' && (
                  <div>
                    <span className="font-medium">Type:</span> {requestFilters.type}
                  </div>
                )}
                {requestFilters.status !== 'all' && (
                  <div>
                    <span className="font-medium">Status:</span> {requestFilters.status}
                  </div>
                )}
                <div>
                  <span className="font-medium">Sorted:</span> {dateSortOptions.find(opt => opt.value === requestFilters.dateSort)?.label}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const renderCollection = () => {
  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Daily Collection Report</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">View EMI collections by date</p>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input 
                  type="date"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={collectionDate}
                  onChange={(e) => {
                    setCollectionDate(e.target.value);
                    fetchCollectionData(e.target.value);
                  }}
                />
              </div>
              <button
                onClick={() => fetchCollectionData(collectionDate)}
                disabled={isLoadingCollection}
                className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isLoadingCollection ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200">
          {/* Summary Cards */}
          {collectionData && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Collection</dt>
                  <dd className="mt-1 text-2xl font-semibold text-green-600">
                    ₹{collectionData.summary?.totalCollection?.toLocaleString() || '0'}
                  </dd>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <dt className="text-sm font-medium text-gray-500 truncate">Customers Paid</dt>
                  <dd className="mt-1 text-2xl font-semibold text-orange-600">
                    {collectionData.summary?.totalCustomers || 0}
                  </dd>
                </div>
              </div>

              {/* Collection Table */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          EMI Collection
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Office
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {collectionData.customers && collectionData.customers.length > 0 ? (
                        collectionData.customers.map((customer, index) => (
                          <tr key={customer.customerId || index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {customer.customerNumber || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {customer.customerName || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                              ₹{(customer.totalCollection || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                customer.officeCategory === 'Office 1' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {customer.officeCategory || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center">
                            <div className="text-gray-400 text-4xl mb-4">💰</div>
                            <p className="text-gray-500 text-lg">No collections found for {collectionDate}</p>
                            <p className="text-sm text-gray-400 mt-2">
                              No EMI payments were recorded on this date
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Date Information */}
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Showing collections for: <strong>{new Date(collectionDate).toLocaleDateString('en-IN')}</strong>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Last updated: {new Date().toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          )}

          {!collectionData && !isLoadingCollection && (
            <div className="px-6 py-8 text-center">
              <div className="text-gray-400 text-4xl mb-4">📅</div>
              <p className="text-gray-500 text-lg">Select a date to view collection report</p>
              <p className="text-sm text-gray-400 mt-2">
                Choose a date and click Refresh to see EMI collections
              </p>
            </div>
          )}

          {isLoadingCollection && (
            <div className="px-6 py-8 text-center">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-gray-500">Loading collection data...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
  const renderDashboard = () => (
    <div className="px-4 py-6 sm:px-0">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">EMI Collected Today</dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">{todayStats.emiCollected}</dd>
            <p className="text-xs text-gray-500 mt-1">From approved customers</p>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Approved Customers</dt>
            <dd className="mt-1 text-3xl font-semibold text-blue-600">{todayStats.newCustomers}</dd>
            <p className="text-xs text-gray-500 mt-1">Active customers</p>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Pending Requests</dt>
            <dd className="mt-1 text-3xl font-semibold text-orange-600">{todayStats.pendingRequests}</dd>
            <p className="text-xs text-gray-500 mt-1">Waiting for admin approval</p>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Today's Collection</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">₹{todayStats.totalCollection}</dd>
            <p className="text-xs text-gray-500 mt-1">Total EMI collected</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-blue-600 text-lg">💰</span>
            </div>
            <h3 className="text-lg font-medium">Update EMI</h3>
          </div>
          <p className="text-gray-600 mb-4">Record daily EMI payments from approved customers</p>
          <button 
            onClick={() => setShowUpdateEMI(true)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Update EMI
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-green-600 text-lg">👥</span>
            </div>
            <h3 className="text-lg font-medium">Add New Customer</h3>
          </div>
          <p className="text-gray-600 mb-4">Submit new customer requests for admin approval</p>
          <button 
            onClick={() => setShowAddCustomer(true)}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
          >
            Submit Request
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Requires admin approval
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
              <span className="text-purple-600 text-lg">🔍</span>
            </div>
            <h3 className="text-lg font-medium">Search Customers</h3>
          </div>
          <p className="text-gray-600 mb-4">Find and view approved customer details</p>
          <button 
            onClick={() => setActiveTab('customers')}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
          >
            Search Customers
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Your recent actions and updates</p>
          </div>
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📊</div>
                <p className="text-gray-600">Your recent activities will appear here</p>
                <p className="text-sm text-gray-500 mt-2">EMI updates, customer searches, etc.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">How It Works</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Customer approval process</p>
          </div>
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm font-semibold">1</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Submit Request</p>
                    <p className="text-sm text-gray-500">Fill customer details and submit for approval</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 text-sm font-semibold">2</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Admin Review</p>
                    <p className="text-sm text-gray-500">Super Admin reviews and approves the request</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm font-semibold">3</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Customer Active</p>
                    <p className="text-sm text-gray-500">Customer becomes active and appears in lists</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-sm font-semibold">4</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Manage EMI</p>
                    <p className="text-sm text-gray-500">Start collecting EMI from approved customers</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> New customers won't appear in search results until approved by Super Admin.
                  Check the "Requests" tab to track approval status.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-2xl">📋</span>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-yellow-800">Pending Approval Requests</h3>
              <p className="text-yellow-700">
                You have {pendingRequests.length} customer request(s) waiting for admin approval.
              </p>
            </div>
            <button 
              onClick={() => setActiveTab('requests')}
              className="ml-4 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
            >
              View Requests
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderCustomers = () => {
  // Sort customers by customer number
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const aNumber = a.customerNumber || '';
    const bNumber = b.customerNumber || '';
    
    if (customerSortOrder === 'asc') {
      return aNumber.localeCompare(bNumber);
    } else {
      return bNumber.localeCompare(aNumber);
    }
  });

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <button 
              onClick={() => setShowAddCustomer(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 w-full sm:w-auto"
            >
              Add New Customer (Requires Approval)
            </button>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-blue-400 text-lg">ℹ️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Information</h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>Only approved customers are shown here. New customers require admin approval.</p>
                <p className="text-xs mt-1">Check the "Requests" tab to see pending approvals.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Search, Filter and Sort in one line */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by customer name or customer number..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span>Filters</span>
              <span className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            <button
              onClick={() => setCustomerSortOrder(customerSortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span>Sort {customerSortOrder === 'asc' ? '↑' : '↓'}</span>
            </button>
          </div>
        </div>

        {/* Filters Section - Updated without Customer Number and Loan Type */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Office Category
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.officeCategory}
                  onChange={(e) => setFilters(prev => ({ ...prev, officeCategory: e.target.value }))}
                >
                  <option value="">All Offices</option>
                  <option value="Office 1">Office 1</option>
                  <option value="Office 2">Office 2</option>
                </select>
              </div>
            </div>

            {(filters.status || filters.officeCategory) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600">Active filters:</span>
                  {filters.status && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                      Status: {filters.status}
                      <button 
                        onClick={() => setFilters(prev => ({ ...prev, status: '' }))}
                        className="ml-1 text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.officeCategory && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                      Office: {filters.officeCategory}
                      <button 
                        onClick={() => setFilters(prev => ({ ...prev, officeCategory: '' }))}
                        className="ml-1 text-orange-600 hover:text-orange-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Showing {sortedCustomers.length} of {customers.length} customers
          </span>
          
          {(filters.status || filters.officeCategory || searchQuery) && (
            <button
              onClick={() => {
                setFilters({
                  customerNumber: '',
                  loanType: '',
                  status: '',
                  officeCategory: ''
                });
                setSearchQuery('');
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Customers List</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            All active customers and their loan details
          </p>
        </div>
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Customer Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Business
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Office
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedCustomers.map((customer) => (
                  <tr key={customer._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 w-1/5">
                      {customer.customerNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-1/5">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/5">
                      {customer.businessName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.officeCategory === 'Office 1' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {customer.officeCategory || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium w-1/5">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            handleSearchCustomer(customer);
                            setShowUpdateEMI(true);
                          }}
                          className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                        >
                          Update EMI
                        </button>
                        <button 
                          onClick={() => handleViewDetails(customer)}
                          className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm"
                        >
                          View Details
                        </button>
                        <button 
                          onClick={() => handleViewEMICalendar(customer)}
                          className="bg-purple-600 text-white px-3 py-1 rounded-md hover:bg-purple-700 text-sm"
                        >
                          EMI Calendar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderUpdateEMIForm = () => {
    const displayLoans = selectedCustomer ? getAllCustomerLoans(selectedCustomer, customerDetails) : [];
    const currentOperator = "Operator 1";

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Update EMI Payment</h3>
              <button 
                onClick={() => {
                  setShowUpdateEMI(false);
                  setSelectedCustomer(null);
                  setSelectedLoanForPayment(null);
                  setShowPaymentForm(false);
                  setSearchQuery('');
                  setFilters({
                    customerNumber: '',
                    loanType: '',
                    status: '',
                    officeCategory: ''
                  });
                  setShowFilters(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {!showPaymentForm ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Customer *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by customer name or customer number..."
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400">🔍</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Search for active customers to record EMI payments
                  </p>
                </div>

                {searchQuery && !selectedCustomer && (
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(customer => (
                        <div 
                          key={customer._id || customer.id}
                          className={`p-3 border-b border-gray-200 cursor-pointer transition-colors ${
                            customer.status === 'active' 
                              ? 'hover:bg-green-50' 
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                          onClick={() => {
                            if (customer.status === 'active') {
                              handleSearchCustomer(customer);
                            } else {
                              alert('This customer is not active. Only active customers can make EMI payments.');
                            }
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-gray-600">
                                {customer.customerNumber} • ₹{customer.emiAmount} {customer.loanType} EMI
                              </div>
                              <div className="text-xs text-gray-500">
                                {customer.businessName} • {customer.area}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                Category: {customer.category} • Office: {customer.officeCategory}
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              customer.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {customer.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {customer.status !== 'active' && (
                            <div className="text-xs text-red-600 mt-1">
                              Cannot accept payments - customer is inactive
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-gray-500">
                        {customers.length === 0 ? 'No customers found' : 'No customers match your search'}
                      </div>
                    )}
                  </div>
                )}

                {customers.length === 0 && !searchQuery && !selectedCustomer && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-yellow-400 text-lg">⚠️</span>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">No Active Customers</h3>
                        <div className="mt-1 text-sm text-yellow-700">
                          <p>No active customers found. Customers need to be approved by Super Admin first.</p>
                          <p className="text-xs mt-1">Check the "Requests" tab to see pending approvals.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedCustomer && (
                  <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-semibold text-sm">
                            {selectedCustomer?.name?.split(' ').map((n: string) => n[0]).join('') || 'CU'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-blue-900">{selectedCustomer.name}</div>
                          <div className="text-sm text-blue-700">
                            {selectedCustomer.customerNumber}
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        selectedCustomer.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedCustomer.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-blue-600 font-medium">Business:</span>
                        <p className="text-blue-900">{selectedCustomer.businessName}</p>
                      </div>
                      <div>
                        <span className="text-blue-600 font-medium">Area:</span>
                        <p className="text-blue-900">{selectedCustomer.area}</p>
                      </div>
                      <div>
                        <span className="text-blue-600 font-medium">Category:</span>
                        <p className="text-blue-900">{selectedCustomer.category}</p>
                      </div>
                      <div>
                        <span className="text-blue-600 font-medium">Office:</span>
                        <p className="text-blue-900">{selectedCustomer.officeCategory}</p>
                      </div>
                    </div>

                    <div className="flex space-x-2 mt-3">
                      <button 
                        onClick={() => {
                          setSelectedCustomer(null);
                          setSearchQuery('');
                          setEmiUpdate(prev => ({
                            ...prev,
                            customerId: '',
                            customerName: '',
                            customerNumber: '',
                            amount: ''
                          }));
                        }}
                        className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                      >
                        Change Customer
                      </button>
                      <button 
                        onClick={() => handleViewEMICalendar(selectedCustomer)}
                        className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                      >
                        View EMI Calendar
                      </button>
                    </div>
                  </div>
                )}

                {selectedCustomer && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold mb-4">Customer Loans</h4>
                    <div className="space-y-4">
                      {displayLoans.map((loan, index) => {
                        const completion = calculateEMICompletion(loan);
                        const behavior = calculatePaymentBehavior(loan);
                        const totalLoanAmount = calculateTotalLoanAmount(loan);
                        
                        return (
                          <div key={loan._id} className="border border-gray-200 rounded-lg p-4 bg-white">
                            {/* Loan Header */}
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <div className="flex items-center gap-4">
                                  <h5 className="font-medium text-gray-900 text-lg">
                                    {loan.loanNumber}
                                  </h5>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {loan.loanType} Loan
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">
                                  Loan Date: {formatDateToDDMMYYYY(loan.dateApplied)}
                                </p>
                              </div>
                              {/* Behavior Score Section */}
                              <div className="text-right">
                                <div className="text-xs font-medium text-gray-500">Behavior Score</div>
                                <div className={`text-lg font-semibold ${
                                  behavior.punctualityScore >= 90 ? 'text-green-600' :
                                  behavior.punctualityScore >= 75 ? 'text-blue-600' :
                                  behavior.punctualityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {behavior.punctualityScore.toFixed(0)}%
                                </div>
                              </div>
                            </div>
                            
                            {/* Completion Progress */}
                            <div className="mb-4">
                              <div className="flex justify-between text-sm mb-1">
                                <span>Completion: {completion.completionPercentage.toFixed(1)}%</span>
                                <span>{completion.remainingEmis} EMIs remaining</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                                  style={{width: `${Math.min(completion.completionPercentage, 100)}%`}}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Paid: ₹{completion.totalPaid}</span>
                                <span>Remaining: ₹{completion.remainingAmount} of ₹{completion.totalLoanAmount || calculateTotalLoanAmount(loan)}</span>
                              </div>
                            </div>

                            {/* Loan Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                              <div>
                                <label className="block text-xs font-medium text-gray-500">
                                  Amount
                                </label>
                                <p className="text-gray-900">
                                  ₹{loan.amount?.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500">
                                  EMI Amount
                                </label>
                                <p className="text-gray-900">
                                  ₹{loan.emiAmount}
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500">
                                  {loan.loanType === 'Daily' ? 'No. of Days' : 
                                  loan.loanType === 'Weekly' ? 'No. of Weeks' : 'No. of Months'}
                                </label>
                                <p className="text-gray-900">
                                  {loan.loanDays}
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500">
                                  Total Loan Amount
                                </label>
                                <p className="text-gray-900 font-semibold">
                                  ₹{totalLoanAmount.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500">
                                  Next EMI Date
                                </label>
                                <p className="text-gray-900">
                                  {formatDateToDDMMYYYY(loan.nextEmiDate)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-4 flex justify-end">
                              <button 
                                onClick={() => handlePayNow(loan)}
                                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                              >
                                Pay Now
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!selectedCustomer && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-sm text-blue-700">
                      <strong>How to record EMI payment:</strong>
                    </p>
                    <ol className="text-xs text-blue-600 mt-1 list-decimal list-inside space-y-1">
                      <li>Search for an active customer using name or customer number</li>
                      <li>Select the customer from the search results</li>
                      <li>View the customer's loans and click "Pay Now" for the relevant loan</li>
                      <li>Fill in the payment details in the next screen</li>
                      <li>Click "Record EMI Payment" to save</li>
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                  <h4 className="text-lg font-semibold text-blue-900 mb-2">EMI Payment</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600 font-medium">Customer:</span>
                      <p className="text-blue-900">{selectedCustomer?.name}</p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Customer Number:</span>
                      <p className="text-blue-900">{selectedCustomer?.customerNumber}</p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Loan:</span>
                      <p className="text-blue-900">
                        {selectedLoanForPayment?.loanNumber}
                      </p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">EMI Amount:</span>
                      <p className="text-blue-900 font-semibold">₹{selectedLoanForPayment?.emiAmount}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Type *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      emiUpdate.paymentType === 'single' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="paymentType"
                        value="single"
                        checked={emiUpdate.paymentType === 'single'}
                        onChange={(e) => setEmiUpdate({...emiUpdate, paymentType: e.target.value as 'single' | 'advance'})}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Single EMI</div>
                        <div className="text-sm text-gray-600">Payment for a single date</div>
                      </div>
                    </label>
                    
                    <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      emiUpdate.paymentType === 'advance' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="paymentType"
                        value="advance"
                        checked={emiUpdate.paymentType === 'advance'}
                        onChange={(e) => setEmiUpdate({...emiUpdate, paymentType: e.target.value as 'single' | 'advance'})}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Advance EMI</div>
                        <div className="text-sm text-gray-600">Payment for multiple future dates</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Single EMI Fields */}
                {emiUpdate.paymentType === 'single' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Date *
                      </label>
                      <input 
                        type="date" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formatDateForInput(emiUpdate.paymentDate)}
                        onChange={(e) => setEmiUpdate({...emiUpdate, paymentDate: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount Paid (₹) *
                      </label>
                      <input 
                        type="number" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={emiUpdate.amount}
                        onChange={(e) => setEmiUpdate({...emiUpdate, amount: e.target.value})}
                        placeholder="Enter amount paid"
                        min="0"
                        step="0.01"
                        required
                      />
                      {selectedLoanForPayment?.emiAmount && emiUpdate.amount && (
                        <p className={`text-xs mt-1 ${
                          Number(emiUpdate.amount) === selectedLoanForPayment.emiAmount 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                        }`}>
                          {Number(emiUpdate.amount) === selectedLoanForPayment.emiAmount 
                            ? '✓ Full EMI amount matches' 
                            : `ℹ️ Expected EMI: ₹${selectedLoanForPayment.emiAmount}`}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Status *
                      </label>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={emiUpdate.status}
                        onChange={(e) => setEmiUpdate({...emiUpdate, status: e.target.value})}
                        required
                      >
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial Payment</option>
                        <option value="Due">Due</option>
                      </select>
                      {emiUpdate.status === 'Partial' && (
                        <p className="text-xs text-orange-600 mt-1">
                          Partial payments will be recorded and remaining amount will be carried forward.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Collected By *
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                        <p className="text-gray-900 font-medium">{currentOperator}</p>
                        <p className="text-xs text-gray-500 mt-1">Automatically set to logged-in operator</p>
                      </div>
                      <input 
                        type="hidden" 
                        value={currentOperator}
                        onChange={(e) => setEmiUpdate({...emiUpdate, collectedBy: currentOperator})}
                      />
                    </div>
                  </div>
                )}

                {/* Advance EMI Fields */}
                {emiUpdate.paymentType === 'advance' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          From Date *
                        </label>
                        <input 
                          type="date" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={emiUpdate.advanceFromDate || new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            const fromDate = e.target.value;
                            setEmiUpdate(prev => ({
                              ...prev, 
                              advanceFromDate: fromDate,
                              // Auto-set to date if not set
                              advanceToDate: prev.advanceToDate || fromDate,
                              // Auto-calculate EMI count
                              advanceEmiCount: calculateEmiCount(fromDate, prev.advanceToDate || fromDate, selectedLoanForPayment?.loanType)
                            }));
                          }}
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          To Date *
                        </label>
                        <input 
                          type="date" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={emiUpdate.advanceToDate || emiUpdate.advanceFromDate || new Date().toISOString().split('T')[0]}
                          onChange={(e) => {
                            const toDate = e.target.value;
                            setEmiUpdate(prev => ({
                              ...prev, 
                              advanceToDate: toDate,
                              // Auto-calculate EMI count when dates change
                              advanceEmiCount: calculateEmiCount(prev.advanceFromDate || new Date().toISOString().split('T')[0], toDate, selectedLoanForPayment?.loanType)
                            }));
                          }}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          EMI Amount (₹) *
                        </label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={emiUpdate.amount || selectedLoanForPayment?.emiAmount || ''}
                          onChange={(e) => {
                            const emiAmount = e.target.value;
                            setEmiUpdate(prev => ({
                              ...prev, 
                              amount: emiAmount,
                              // Auto-calculate total amount
                              advanceTotalAmount: calculateTotalAmount(emiAmount, prev.advanceEmiCount || '1')
                            }));
                          }}
                          placeholder="EMI Amount"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          No. of EMI *
                        </label>
                        <input 
                          type="number" 
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={emiUpdate.advanceEmiCount || '1'}
                          onChange={(e) => {
                            const emiCount = e.target.value;
                            setEmiUpdate(prev => ({
                              ...prev, 
                              advanceEmiCount: emiCount,
                              // Auto-calculate total amount
                              advanceTotalAmount: calculateTotalAmount(prev.amount || selectedLoanForPayment?.emiAmount || '0', emiCount)
                            }));
                          }}
                          placeholder="Number of EMI"
                          min="1"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Total Amount (₹)
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                          <p className="text-gray-900 font-semibold text-lg">
                            ₹{emiUpdate.advanceTotalAmount || calculateTotalAmount(emiUpdate.amount || selectedLoanForPayment?.emiAmount || '0', emiUpdate.advanceEmiCount || '1')}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Auto-calculated: EMI Amount × No. of EMI</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Status
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-green-50">
                          <p className="text-green-900 font-medium">Advance</p>
                          <p className="text-xs text-green-600 mt-1">Automatically set for advance payments</p>
                        </div>
                        <input 
                          type="hidden" 
                          value="Advance"
                          onChange={(e) => setEmiUpdate({...emiUpdate, status: 'Advance'})}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Collected By *
                        </label>
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                          <p className="text-gray-900 font-medium">{currentOperator}</p>
                          <p className="text-xs text-gray-500 mt-1">Automatically set to logged-in operator</p>
                        </div>
                        <input 
                          type="hidden" 
                          value={currentOperator}
                          onChange={(e) => setEmiUpdate({...emiUpdate, collectedBy: currentOperator})}
                        />
                      </div>
                    </div>

                    {/* Advance Payment Summary */}
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <h5 className="font-semibold text-green-900 mb-2">Advance Payment Summary</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-green-700">Period:</span>
                          <p className="font-semibold text-green-900">
                            {emiUpdate.advanceFromDate ? formatDateToDDMMYYYY(emiUpdate.advanceFromDate) : 'N/A'} to {' '}
                            {emiUpdate.advanceToDate ? formatDateToDDMMYYYY(emiUpdate.advanceToDate) : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-green-700">EMI Count:</span>
                          <p className="font-semibold text-green-900">{emiUpdate.advanceEmiCount || '1'}</p>
                        </div>
                        <div>
                          <span className="text-green-700">EMI Amount:</span>
                          <p className="font-semibold text-green-900">
                            ₹{emiUpdate.amount || selectedLoanForPayment?.emiAmount || '0'}
                          </p>
                        </div>
                        <div>
                          <span className="text-green-700">Total:</span>
                          <p className="font-semibold text-green-900">
                            ₹{emiUpdate.advanceTotalAmount || calculateTotalAmount(emiUpdate.amount || selectedLoanForPayment?.emiAmount || '0', emiUpdate.advanceEmiCount || '1')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    value={emiUpdate.notes || ''}
                    onChange={(e) => setEmiUpdate({...emiUpdate, notes: e.target.value})}
                    placeholder={
                      emiUpdate.paymentType === 'advance' 
                        ? `Advance payment notes...` 
                        : `Add any notes about this payment...`
                    }
                  />
                </div>

                <div className="flex justify-between space-x-3 mt-6">
                  <button 
                    onClick={() => setShowPaymentForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={isLoading}
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleUpdateEMI}
                    disabled={!emiUpdate.amount || isLoading || (emiUpdate.paymentType === 'advance' && (!emiUpdate.advanceFromDate || !emiUpdate.advanceToDate))}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Processing...
                      </>
                    ) : emiUpdate.paymentType === 'advance' ? (
                      'Record Advance EMI Payment'
                    ) : (
                      'Record EMI Payment'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCustomerDetails = () => {
  const displayLoans = customerDetails ? getAllCustomerLoans(customerDetails, customerDetails) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Customer Details</h3>
            <button 
              onClick={() => setShowCustomerDetails(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {customerDetails ? (
            <div className="space-y-6">
              {/* Personal Information Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                    <p className="mt-1 text-sm text-gray-900">{customerDetails.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customerDetails.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : customerDetails.status === 'inactive'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {customerDetails.status || 'Unknown'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customerDetails.category === 'A' ? 'bg-green-100 text-green-800' :
                        customerDetails.category === 'B' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {customerDetails.category || 'Not specified'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Office Category</label>
                    <p className="mt-1 text-sm text-gray-900">{customerDetails.officeCategory || 'Not specified'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Number</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{customerDetails.customerNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Numbers</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {Array.isArray(customerDetails.phone) 
                        ? customerDetails.phone.filter(p => p).join(', ')
                        : customerDetails.phone
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Information Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Name</label>
                    <p className="mt-1 text-sm text-gray-900">{customerDetails.businessName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Area</label>
                    <p className="mt-1 text-sm text-gray-900">{customerDetails.area}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">{customerDetails.address || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
                    <p className="mt-1 text-sm text-gray-900 flex items-center">
                      {customerDetails.whatsappNumber || 'Not provided'}
                      {customerDetails.whatsappNumber && (
                        <span className="ml-2 text-green-600">📱</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{customerDetails.email || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Loan Information Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Loan Information</h4>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setShowAddLoanModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                    >
                      + Add New Loan
                    </button>
                    <button 
                      onClick={() => handleViewEMICalendar(customerDetails)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-sm"
                    >
                      📅 EMI Calendar
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {displayLoans.length > 0 ? (
                    displayLoans.map((loan, index) => {
                      const completion = calculateEMICompletion(loan);
                      const behavior = calculatePaymentBehavior(loan);
                      const totalLoanAmount = calculateTotalLoanAmount(loan);
                      const isRenewed = loan.status === 'renewed' || (loan as any).isRenewed === true;
                      
                      return (
                        <div 
                          key={loan._id} 
                          className={`border border-gray-200 rounded-lg p-4 bg-white ${
                            isRenewed ? 'border-l-4 border-l-purple-500' : ''
                          }`}
                        >
                          {/* Loan Header */}
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex items-center gap-4 flex-wrap">
                                <h5 className="font-medium text-gray-900 text-lg">
                                  {loan.loanNumber}
                                </h5>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {loan.loanType} Loan
                                </span>
                                {isRenewed && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    🔄 Renewed
                                  </span>
                                )}
                                {loan.status === 'active' && !isRenewed && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Active
                                  </span>
                                )}
                                {loan.status === 'completed' && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    Completed
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                Loan Date: {formatDateToDDMMYYYY(loan.dateApplied)}
                                {loan.emiStartDate && loan.emiStartDate !== loan.dateApplied && (
                                  <span className="ml-2">
                                    • EMI Start: {formatDateToDDMMYYYY(loan.emiStartDate)}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-medium text-gray-500">Behavior Score</div>
                              <div className={`text-lg font-semibold ${
                                behavior.punctualityScore >= 90 ? 'text-green-600' :
                                behavior.punctualityScore >= 75 ? 'text-blue-600' :
                                behavior.punctualityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {behavior.punctualityScore.toFixed(0)}%
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {behavior.behaviorRating}
                              </div>
                            </div>
                          </div>
                          
                          {/* Completion Progress */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Completion: {completion.completionPercentage.toFixed(1)}%</span>
                              <span>{completion.remainingEmis} EMIs remaining</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  completion.isCompleted ? 'bg-green-600' : 'bg-blue-600'
                                }`} 
                                style={{width: `${Math.min(completion.completionPercentage, 100)}%`}}
                              ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>Paid: ₹{completion.totalPaid.toLocaleString()}</span>
                              <span>Remaining: ₹{completion.remainingAmount.toLocaleString()} of ₹{completion.totalLoanAmount?.toLocaleString() || totalLoanAmount.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Loan Details Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-500">
                                Loan Amount
                              </label>
                              <p className="text-gray-900 font-semibold">
                                ₹{loan.amount?.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500">
                                EMI Amount
                              </label>
                              <p className="text-gray-900 font-semibold">
                                ₹{loan.emiAmount}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500">
                                {loan.loanType === 'Daily' ? 'No. of Days' : 
                                 loan.loanType === 'Weekly' ? 'No. of Weeks' : 'No. of Months'}
                              </label>
                              <p className="text-gray-900 font-semibold">
                                {loan.loanDays}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-500">
                                Next EMI Date
                              </label>
                              <p className="text-gray-900 font-semibold">
                                {formatDateToDDMMYYYY(loan.nextEmiDate)}
                              </p>
                            </div>
                          </div>

                          {/* Payment Statistics */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-blue-50 p-3 rounded-md mb-4">
                            <div>
                              <span className="text-blue-700 font-medium">Total Paid:</span>
                              <p className="text-blue-900">₹{loan.totalPaidAmount?.toLocaleString() || '0'}</p>
                            </div>
                            <div>
                              <span className="text-blue-700 font-medium">EMI Paid:</span>
                              <p className="text-blue-900">{loan.emiPaidCount || 0}/{loan.totalEmiCount || loan.loanDays}</p>
                            </div>
                            <div>
                              <span className="text-blue-700 font-medium">On Time:</span>
                              <p className="text-blue-900">{behavior.onTimePayments}/{behavior.totalPayments}</p>
                            </div>
                            <div>
                              <span className="text-blue-700 font-medium">Last Payment:</span>
                              <p className="text-blue-900">
                                {loan.emiHistory && loan.emiHistory.length > 0 
                                  ? formatDateToDDMMYYYY(loan.emiHistory[loan.emiHistory.length - 1].paymentDate)
                                  : 'Never'
                                }
                              </p>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
                            {!isRenewed && loan.status !== 'completed' && (
                              <>
                                <button 
                                  onClick={() => {
                                    setSelectedCustomer(customerDetails);
                                    setSelectedLoanForPayment(loan);
                                    setShowUpdateEMI(true);
                                    setShowCustomerDetails(false);
                                  }}
                                  className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm"
                                >
                                  Pay EMI
                                </button>
                                <button 
                                  onClick={() => handleEditLoan(loan)}
                                  className="bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700 text-sm"
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleRenewLoan(loan)}
                                  className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                                >
                                  Renew
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => handleDeleteLoan(loan)}
                              className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 text-sm"
                              disabled={isLoading}
                            >
                              {isLoading ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 bg-white border border-gray-200 rounded-lg">
                      <div className="text-gray-400 text-4xl mb-4">💰</div>
                      <p className="text-gray-600 text-lg">No loans found</p>
                      <p className="text-sm text-gray-500 mt-2">This customer doesn't have any loans yet.</p>
                      <button 
                        onClick={() => setShowAddLoanModal(true)}
                        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                      >
                        + Add First Loan
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Section */}
              {displayLoans.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-green-900 mb-3">Loan Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-green-700 font-medium">Total Loans:</span>
                      <p className="text-green-900 font-semibold">{displayLoans.length}</p>
                    </div>
                    <div>
                      <span className="text-green-700 font-medium">Active Loans:</span>
                      <p className="text-green-900 font-semibold">
                        {displayLoans.filter(loan => loan.status === 'active').length}
                      </p>
                    </div>
                    <div>
                      <span className="text-green-700 font-medium">Total Given:</span>
                      <p className="text-green-900 font-semibold">
                        ₹{displayLoans.reduce((sum, loan) => sum + (loan.amount || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-green-700 font-medium">Total Collected:</span>
                      <p className="text-green-900 font-semibold">
                        ₹{displayLoans.reduce((sum, loan) => sum + (loan.totalPaidAmount || 0), 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button 
                  onClick={() => setShowCustomerDetails(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    handleEditCustomer(customerDetails);
                    setShowCustomerDetails(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Edit Profile
                </button>
                <button 
                  onClick={() => {
                    setSelectedCustomer(customerDetails);
                    setShowUpdateEMI(true);
                    setShowCustomerDetails(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Update EMI
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Loading customer details...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Data Entry Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, Data Entry Operator</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
  {[
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'customers', label: 'Customers' },
    { id: 'emi', label: 'EMI' },
    { id: 'collection', label: 'Collection' },
    { id: 'requests', label: 'Requests' }
  ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
  {activeTab === 'dashboard' && renderDashboard()}
  {activeTab === 'customers' && renderCustomers()}
  {activeTab === 'emi' && renderEMI()}
  {activeTab === 'collection' && renderCollection()}
  {activeTab === 'requests' && renderRequests()}
</main>

      {showAddCustomer && renderAddCustomerForm()}
      {showUpdateEMI && renderUpdateEMIForm()}
      {showCustomerDetails && renderCustomerDetails()}
      {showEditCustomer && renderEditCustomer()}
      {showEditLoan && renderEditLoanModal()}
      {showRenewLoan && renderRenewLoanModal()}
      {showAddLoanModal && renderAddLoanModal()}
      {showEMICalendar && renderEMICalendar()}
      {showDatePaymentHistory && renderDatePaymentHistory()}
      {showEditPaymentModal && renderEditPaymentModal()}
      {showDeleteConfirmationModal && renderDeleteConfirmationModal()}
    </div>
  );
}