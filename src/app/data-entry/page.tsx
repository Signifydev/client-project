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
  loanNumber?: string;
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
}

interface Loan {
  _id: string;
  customerId: string;
  customerName: string;
  loanNumber: string;
  amount: number;
  emiAmount: number;
  loanType: string;
  dateApplied: string;
  loanDays: number;
  status?: string;
  createdBy?: string;
  createdAt?: string;
  isMainLoan?: boolean;
  // Enhanced fields for EMI tracking
  totalEmiCount: number;
  emiPaidCount: number;
  lastEmiDate: string;
  nextEmiDate: string;
  totalPaidAmount: number;
  remainingAmount: number;
  emiHistory: EMIHistory[];
}

interface EMIHistory {
  paymentDate: string;
  amount: number;
  status: string;
  collectedBy: string;
  notes?: string;
  createdAt?: string;
  loanNumber?: string; // ADDED THIS MISSING PROPERTY
  loanId?: string; // ADDED THIS FOR BETTER TRACKING
}

interface CustomerDetails {
  _id: string;
  name: string;
  phone: string[];
  businessName: string;
  area: string;
  loanNumber: string;
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
}

interface Request {
  _id: string;
  type: string;
  customerName: string;
  status: string;
  createdAt: string;
  data?: any;
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
  loanNumber: string;
  address: string;
  category: string;
  officeCategory: string;
  profilePicture: File | null;
  fiDocuments: {
    shop: File | null;
    home: File | null;
  };
}

interface NewCustomerStep2 {
  loanDate: string;
  loanAmount: string;
  emiAmount: string;
  loanDays: string;
  loanType: string;
}

interface NewCustomerStep3 {
  loginId: string;
  password: string;
  confirmPassword: string;
}

interface RenewLoanData {
  loanId: string;
  customerId: string;
  customerName: string;
  loanNumber: string;
  renewalDate: string;
  newLoanAmount: string;
  newEmiAmount: string;
  newLoanDays: string;
  newLoanType: string;
  remarks: string;
}

interface EMIUpdate {
  customerId: string;
  customerName: string;
  paymentDate: string;
  amount: string;
  status: string;
  collectedBy: string;
  loanId?: string;
  loanNumber?: string;
  notes?: string;
}

interface EditCustomerData {
  name: string;
  phone: string[];
  businessName: string;
  area: string;
  loanNumber: string;
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
  loanNumber: string;
  amount: string;
  emiAmount: string;
  loanType: string;
  dateApplied: string;
  loanDays: string;
  isMainLoan: boolean;
  originalData?: {
    amount: number;
    emiAmount: number;
    loanType: string;
    dateApplied: string;
    loanDays: number;
  };
}

interface Filters {
  loanNumber: string;
  loanType: string;
  status: string;
  officeCategory: string;
}

// Extended interface for display purposes
interface DisplayLoan extends Loan {
  isMainLoan: boolean;
}

// Calendar interfaces
interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  emiStatus?: 'paid' | 'due' | 'overdue' | 'partial' | 'upcoming' | 'none';
  emiAmount?: number;
  loanNumbers?: string[];
  paymentHistory?: EMIHistory[];
}

interface EMICalendarData {
  customerId: string;
  customerName: string;
  loans: DisplayLoan[];
  paymentHistory: EMIHistory[];
}
// Date format utility functions - ADD THESE FUNCTIONS HERE
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
    amount: '',
    dateApplied: new Date().toISOString().split('T')[0],
    emiAmount: '',
    loanType: 'Monthly',
    loanDays: '30'
  });
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [showEditLoan, setShowEditLoan] = useState(false);
  const [showRenewLoan, setShowRenewLoan] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [editCustomerData, setEditCustomerData] = useState<EditCustomerData>({
    name: '',
    phone: [''],
    businessName: '',
    area: '',
    loanNumber: '',
    loanAmount: '',
    emiAmount: '',
    loanType: 'Daily',
    address: '',
    customerId: '',
    category: 'A',
    officeCategory: 'Office 1'
  });
  
  const [editLoanData, setEditLoanData] = useState<EditLoanData>({
    loanId: '',
    customerId: '',
    customerName: '',
    loanNumber: '',
    amount: '',
    emiAmount: '',
    loanType: 'Daily',
    dateApplied: new Date().toISOString().split('T')[0],
    loanDays: '',
    isMainLoan: false
  });

  const [renewLoanData, setRenewLoanData] = useState<RenewLoanData>({
    loanId: '',
    customerId: '',
    customerName: '',
    loanNumber: '',
    renewalDate: new Date().toISOString().split('T')[0],
    newLoanAmount: '',
    newEmiAmount: '',
    newLoanDays: '',
    newLoanType: 'Monthly',
    remarks: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    loanNumber: '',
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

  // Step-by-step customer addition states
  const [currentStep, setCurrentStep] = useState(1);
  const [step1Data, setStep1Data] = useState<NewCustomerStep1>({
    name: '',
    phone: [''],
    whatsappNumber: '',
    businessName: '',
    area: '',
    loanNumber: '',
    address: '',
    category: '',
    officeCategory: '',
    profilePicture: null,
    fiDocuments: {
      shop: null,
      home: null
    }
  });
  const [step2Data, setStep2Data] = useState<NewCustomerStep2>({
    loanDate: new Date().toISOString().split('T')[0],
    loanAmount: '',
    emiAmount: '',
    loanDays: '',
    loanType: 'Daily'
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
    collectedBy: 'Operator 1'
  }); 

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<Loan | null>(null);

  // Calendar states
  const [showEMICalendar, setShowEMICalendar] = useState(false);
  const [calendarData, setCalendarData] = useState<EMICalendarData | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [showDatePaymentHistory, setShowDatePaymentHistory] = useState(false);
  const [calendarFilter, setCalendarFilter] = useState<{
  emiStatus: 'all' | 'paid' | 'due' | 'overdue' | 'partial' | 'upcoming';
  loanFilter: 'all' | string;
}>({
  emiStatus: 'all',
  loanFilter: 'all'
});

  // Enhanced EMI Calculation Functions
  const calculateEMICompletion = (loan: Loan) => {
  const totalLoanAmount = loan.emiAmount * loan.totalEmiCount; // Calculate total loan
  const completionPercentage = (loan.emiPaidCount / loan.totalEmiCount) * 100;
  const isCompleted = loan.emiPaidCount >= loan.totalEmiCount;
  const remainingEmis = loan.totalEmiCount - loan.emiPaidCount;
  const totalPaid = loan.totalPaidAmount;
  const remainingAmount = totalLoanAmount - totalPaid; // Use total loan instead of loan amount
  
  return {
    completionPercentage,
    isCompleted,
    remainingEmis,
    totalPaid,
    remainingAmount
  };
};

  const calculateTotalLoanAmount = (loan: DisplayLoan): number => {
  return loan.emiAmount * loan.totalEmiCount;
};

  const calculateNextEmiDate = (currentDate: string, loanType: string): string => {
    const date = new Date(currentDate);
    
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

  const calculatePaymentBehavior = (loan: Loan) => {
    const totalPayments = loan.emiHistory.length;
    const onTimePayments = loan.emiHistory.filter(payment => {
      const paymentDate = new Date(payment.paymentDate);
      const dueDate = new Date(calculateNextEmiDate(loan.lastEmiDate, loan.loanType));
      return paymentDate <= dueDate;
    }).length;
    
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

  // Calendar Functions
  const generateCalendar = (month: Date, loans: DisplayLoan[], paymentHistory: EMIHistory[], loanFilter: string = 'all'): CalendarDay[] => {
  const days: CalendarDay[] = [];
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  
  // First day of the month
  const firstDay = new Date(year, monthIndex, 1);
  // Last day of the month
  const lastDay = new Date(year, monthIndex + 1, 0);
  
  // Filter loans if specific loan is selected
  const filteredLoans = loanFilter === 'all' 
    ? loans 
    : loans.filter(loan => loan._id === loanFilter || loan.loanNumber === loanFilter);
  
  // Filter payment history if specific loan is selected
  const filteredPaymentHistory = loanFilter === 'all'
    ? paymentHistory
    : paymentHistory.filter(payment => 
        payment.loanId === loanFilter || payment.loanNumber === loanFilter
      );

  // Days from previous month
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
  
  // Current month days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, monthIndex, day);
    const isToday = date.toDateString() === new Date().toDateString();
    
    // Find payments for this date
    const dateStr = date.toISOString().split('T')[0];
    const datePayments = filteredPaymentHistory.filter(payment => 
      payment.paymentDate === dateStr
    );
    
    // Find due dates for this date
    const dueLoans = filteredLoans.filter(loan => 
      loan.nextEmiDate === dateStr && loan.emiPaidCount < loan.totalEmiCount
    );
    
    let emiStatus: CalendarDay['emiStatus'] = 'none';
    let emiAmount = 0;
    const loanNumbers: string[] = [];
    
    if (datePayments.length > 0) {
      emiStatus = datePayments.every(p => p.status === 'Paid') ? 'paid' : 'partial';
      emiAmount = datePayments.reduce((sum, p) => sum + p.amount, 0);
      datePayments.forEach(p => {
        if (p.loanNumber && !loanNumbers.includes(p.loanNumber)) {
          loanNumbers.push(p.loanNumber);
        }
      });
    } else if (dueLoans.length > 0) {
      const today = new Date();
      if (date < today) {
        emiStatus = 'overdue';
      } else {
        emiStatus = 'due';
      }
      emiAmount = dueLoans.reduce((sum, loan) => sum + loan.emiAmount, 0);
      dueLoans.forEach(loan => loanNumbers.push(loan.loanNumber));
    } else if (date > new Date()) {
      // Check if any upcoming EMI in next 3 days
      const upcomingLoans = filteredLoans.filter(loan => {
        const emiDate = new Date(loan.nextEmiDate);
        const diffTime = emiDate.getTime() - date.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 3;
      });
      
      if (upcomingLoans.length > 0) {
        emiStatus = 'upcoming';
        emiAmount = upcomingLoans.reduce((sum, loan) => sum + loan.emiAmount, 0);
        upcomingLoans.forEach(loan => loanNumbers.push(loan.loanNumber));
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
  
  // Days from next month
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
      case 'paid': return 'bg-green-100 border-green-300 text-green-800';
      case 'due': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'overdue': return 'bg-red-100 border-red-300 text-red-800';
      case 'partial': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'upcoming': return 'bg-purple-100 border-purple-300 text-purple-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-600';
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
      // Fetch customer details with enhanced loan data
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
      // Create mock data for demo
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
      // Auto-fill EMI payment for due dates
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
    // Create edit request for admin approval
    const editRequest = {
      type: 'EMI Correction',
      customerId: calendarData?.customerId,
      customerName: calendarData?.customerName,
      originalPayment: payment,
      requestedChanges: {
        // This would be filled from a form
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        status: payment.status
      },
      reason: 'Data correction required'
    };
    
    // Submit request to admin
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

  // Filter customers based on search and filters
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchQuery === '' || 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.loanNumber && customer.loanNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLoanNumber = filters.loanNumber === '' || 
      (customer.loanNumber && customer.loanNumber.toLowerCase().includes(filters.loanNumber.toLowerCase()));
    
    const matchesLoanType = filters.loanType === '' || 
      customer.loanType === filters.loanType;
    
    const matchesStatus = filters.status === '' || 
      customer.status === filters.status;

    const matchesOfficeCategory = filters.officeCategory === '' || 
      customer.officeCategory === filters.officeCategory;

    return matchesSearch && matchesLoanNumber && matchesLoanType && matchesStatus && matchesOfficeCategory;
  });

  // Function to get all loans including main loan and additional loans
  const getAllCustomerLoans = (customer: Customer, customerDetails: CustomerDetails | null): DisplayLoan[] => {
    const loans: DisplayLoan[] = [];
    
    // Add main loan with enhanced fields
    if (customer.loanNumber) {
      const mainLoan: DisplayLoan = {
        _id: customer._id,
        customerId: customer._id,
        customerName: customer.name,
        loanNumber: customer.loanNumber,
        amount: customer.loanAmount || 0,
        emiAmount: customer.emiAmount || 0,
        loanType: customer.loanType || 'Daily',
        dateApplied: customer.createdAt || new Date().toISOString(),
        loanDays: 30,
        isMainLoan: true,
        // Enhanced fields with default values
        totalEmiCount: 30, // Default 30 days
        emiPaidCount: 0,
        lastEmiDate: customer.createdAt || new Date().toISOString(),
        nextEmiDate: calculateNextEmiDate(customer.createdAt || new Date().toISOString(), customer.loanType || 'Daily'),
        totalPaidAmount: 0,
        remainingAmount: customer.loanAmount || 0,
        emiHistory: []
      };
      loans.push(mainLoan);
    }
    
    // Add additional loans with enhanced fields
    if (customerDetails?.loans && customerDetails.loans.length > 0) {
      customerDetails.loans.forEach(loan => {
        const enhancedLoan: DisplayLoan = {
          ...loan,
          isMainLoan: false,
          // Ensure enhanced fields exist
          totalEmiCount: (loan as any).totalEmiCount || loan.loanDays,
          emiPaidCount: (loan as any).emiPaidCount || 0,
          lastEmiDate: (loan as any).lastEmiDate || loan.dateApplied,
          nextEmiDate: (loan as any).nextEmiDate || calculateNextEmiDate(loan.dateApplied, loan.loanType),
          totalPaidAmount: (loan as any).totalPaidAmount || 0,
          remainingAmount: (loan as any).remainingAmount || loan.amount,
          emiHistory: (loan as any).emiHistory || []
        };
        loans.push(enhancedLoan);
      });
    }
    
    return loans;
  };

  // Validation functions
  const validateStep1 = () => {
    const errors: {[key: string]: string} = {};
    
    if (!step1Data.name.trim()) {
      errors.name = 'Customer name is required';
    }
    
    // Phone validation for multiple numbers
    const validPhones = step1Data.phone.filter(p => p.trim() !== '');
    if (validPhones.length === 0) {
      errors.phone = 'At least one phone number is required';
    } else {
      for (const phone of validPhones) {
        if (!/^\d{10}$/.test(phone)) {
          errors.phone = 'All phone numbers must be valid 10-digit numbers';
          break;
        }
      }
    }

    // WhatsApp number validation
    if (step1Data.whatsappNumber && !/^\d{10}$/.test(step1Data.whatsappNumber)) {
      errors.whatsappNumber = 'WhatsApp number must be a valid 10-digit number';
    }
    
    if (!step1Data.businessName.trim()) {
      errors.businessName = 'Business name is required';
    }
    
    if (!step1Data.area.trim()) {
      errors.area = 'Area is required';
    }
    
    if (!step1Data.loanNumber.trim()) {
      errors.loanNumber = 'Loan number is required';
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
      phone: [''],
      whatsappNumber: '',
      businessName: '',
      area: '',
      loanNumber: '',
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
      loanAmount: '',
      emiAmount: '',
      loanDays: '',
      loanType: 'Daily'
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
          const customerDetailsData: CustomerDetails = {
            _id: customer._id,
            name: customer.name,
            phone: customer.phone,
            businessName: customer.businessName,
            area: customer.area,
            loanNumber: customer.loanNumber || 'N/A',
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
          setIsLoading(false);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 API Response data:', data);
      
      if (data.success) {
        console.log('✅ Customer details fetched successfully:', data.data);
        console.log('🔍 Category:', data.data.category);
        console.log('🔍 Office Category:', data.data.officeCategory);
        
        setCustomerDetails(data.data);
        setShowCustomerDetails(true);
      } else {
        console.error('❌ API returned success:false', data.error);
        alert('Failed to fetch customer details: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('💥 Error in handleViewDetails:', error);
      const customerDetailsData: CustomerDetails = {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        businessName: customer.businessName,
        area: customer.area,
        loanNumber: customer.loanNumber || 'N/A',
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
    // Ensure phone is always an array
    const phoneArray = Array.isArray(customer.phone) ? customer.phone : [customer.phone || ''];
    
    setEditCustomerData({
      name: customer.name,
      phone: phoneArray,
      businessName: customer.businessName,
      area: customer.area,
      loanNumber: customer.loanNumber,
      loanAmount: customer.loanAmount.toString(),
      emiAmount: customer.emiAmount.toString(),
      loanType: customer.loanType,
      address: customer.address || '',
      customerId: customer._id,
      category: customer.category || 'A',
      officeCategory: customer.officeCategory || 'Office 1'
    });
    setShowEditCustomer(true);
    setShowCustomerDetails(false);
  };

  const handleEditLoan = (loan: DisplayLoan) => {
    setEditLoanData({
      loanId: loan._id,
      customerId: loan.customerId,
      customerName: loan.customerName,
      loanNumber: loan.loanNumber,
      amount: loan.amount.toString(),
      emiAmount: loan.emiAmount.toString(),
      loanType: loan.loanType,
      dateApplied: loan.dateApplied.split('T')[0],
      loanDays: loan.loanDays.toString(),
      isMainLoan: loan.isMainLoan || false,
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

  const handleRenewLoan = (loan: DisplayLoan) => {
    setRenewLoanData({
      loanId: loan._id,
      customerId: loan.customerId,
      customerName: loan.customerName,
      loanNumber: loan.loanNumber,
      renewalDate: new Date().toISOString().split('T')[0],
      newLoanAmount: loan.amount.toString(),
      newEmiAmount: loan.emiAmount.toString(),
      newLoanDays: loan.loanDays.toString(),
      newLoanType: loan.loanType,
      remarks: ''
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
        loanId: editLoanData.loanId,
        loanNumber: editLoanData.loanNumber,
        requestedData: {
          amount: Number(editLoanData.amount),
          emiAmount: Number(editLoanData.emiAmount),
          loanType: editLoanData.loanType,
          loanDays: Number(editLoanData.loanDays),
          dateApplied: editLoanData.dateApplied,
          isMainLoan: editLoanData.isMainLoan,
          originalData: editLoanData.originalData
        },
        description: `Loan edit request for ${editLoanData.customerName} - Loan ${editLoanData.loanNumber}`,
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
      loanNumber: '',
      amount: '',
      emiAmount: '',
      loanType: 'Daily',
      dateApplied: new Date().toISOString().split('T')[0],
      loanDays: '',
      isMainLoan: false
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
          requestedBy: 'data_entry_operator_1',
          requestType: 'renew_loan'
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

      alert('Loan renewal request submitted successfully! Waiting for admin approval.');
      setShowRenewLoan(false);
      setRenewLoanData({
        loanId: '',
        customerId: '',
        customerName: '',
        loanNumber: '',
        renewalDate: new Date().toISOString().split('T')[0],
        newLoanAmount: '',
        newEmiAmount: '',
        newLoanDays: '',
        newLoanType: 'Monthly',
        remarks: ''
      });
      
      if (activeTab === 'requests') fetchPendingRequests();
    } catch (error: any) {
      console.error('💥 Error in handleSaveRenewLoan:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLoan = async (loan: DisplayLoan) => {
    if (!confirm(`Are you sure you want to request deletion of ${loan.isMainLoan ? 'Main Loan' : 'Loan'} ${loan.loanNumber}? This action requires admin approval.`)) {
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
          loanNumber: loan.loanNumber,
          isMainLoan: loan.isMainLoan,
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
      if (!newLoanData.amount || !newLoanData.emiAmount || !newLoanData.loanDays) {
        alert('Please fill all required fields');
        setIsLoading(false);
        return;
      }

      console.log('🟡 Creating loan addition request for:', customerDetails.name);

      // Create loan addition request - NO LOAN CREATION until admin approval
      const requestResponse = await fetch('/api/data-entry/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'Loan Addition',
          customerId: customerDetails._id,
          customerName: customerDetails.name,
          loanNumber: `ADD_${customerDetails.loanNumber}_${Date.now()}`,
          requestedData: {
            // Loan details
            amount: Number(newLoanData.amount),
            emiAmount: Number(newLoanData.emiAmount),
            loanType: newLoanData.loanType,
            loanDays: Number(newLoanData.loanDays),
            dateApplied: newLoanData.dateApplied,
            // Customer reference
            customerId: customerDetails._id,
            customerName: customerDetails.name,
            mainLoanNumber: customerDetails.loanNumber,
            // Additional info
            createdBy: 'data_entry_operator_1',
            requestType: 'loan_addition'
          },
          description: `Additional loan request for ${customerDetails.name} - Main Loan: ${customerDetails.loanNumber}`,
          priority: 'Medium',
          status: 'Pending', // ✅ Ensure capital P
          createdBy: 'data_entry_operator_1',
          createdByRole: 'data_entry',
          requiresCustomerNotification: false,
          estimatedImpact: 'Medium'
        }),
      });

      console.log('Request response status:', requestResponse.status);

      const responseText = await requestResponse.text();
      console.log('Raw response:', responseText);

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
        amount: '',
        dateApplied: new Date().toISOString().split('T')[0],
        emiAmount: '',
        loanType: 'Monthly',
        loanDays: '30'
      });
      
      // Refresh pending requests list
      if (activeTab === 'requests') {
        fetchPendingRequests();
      }

      // Close the customer details modal
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

      if (!editCustomerData.name || !editCustomerData.phone || !editCustomerData.area || !editCustomerData.loanNumber) {
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
        businessName: '',
        area: '',
        loanNumber: '',
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

  const handleAddCustomer = async () => {
    if (!validateStep3()) return;

    // Double-check all required fields before submitting
    if (!step1Data.name || !step1Data.businessName || !step1Data.area || 
        !step1Data.loanNumber || !step1Data.address || !step1Data.category || 
        !step1Data.officeCategory) {
      alert('Please fill all required fields in Step 1');
      setCurrentStep(1);
      return;
    }

    // Check if at least one phone number is provided
    const validPhones = step1Data.phone.filter(p => p.trim() !== '');
    if (validPhones.length === 0) {
      alert('Please provide at least one phone number');
      setCurrentStep(1);
      return;
    }

    // Validate phone numbers
    for (const phone of validPhones) {
      if (!/^\d{10}$/.test(phone)) {
        alert('Please ensure all phone numbers are valid 10-digit numbers');
        setCurrentStep(1);
        return;
      }
    }

    // Check loan details
    if (!step2Data.loanAmount || !step2Data.emiAmount || !step2Data.loanDays) {
      alert('Please fill all required loan details in Step 2');
      setCurrentStep(2);
      return;
    }

    setIsLoading(true);
    try {
      // Create FormData to handle file uploads
      const formData = new FormData();
      
      // Append step1 data
      formData.append('name', step1Data.name.trim());
      
      // Append all phone numbers
      step1Data.phone.forEach((phone, index) => {
        if (phone.trim()) {
          formData.append(`phone[${index}]`, phone.trim());
        }
      });
      
      // Append WhatsApp number (optional)
      if (step1Data.whatsappNumber.trim()) {
        formData.append('whatsappNumber', step1Data.whatsappNumber.trim());
      } else {
        formData.append('whatsappNumber', ''); // Send empty string if not provided
      }
      
      formData.append('businessName', step1Data.businessName.trim());
      formData.append('area', step1Data.area.trim());
      // Store loan number with LN prefix
      formData.append('loanNumber', `LN${step1Data.loanNumber}`);
      formData.append('address', step1Data.address.trim());
      formData.append('category', step1Data.category);
      formData.append('officeCategory', step1Data.officeCategory);
      
      // Append files
      if (step1Data.profilePicture) {
        formData.append('profilePicture', step1Data.profilePicture);
      }
      if (step1Data.fiDocuments.shop) {
        formData.append('fiDocumentShop', step1Data.fiDocuments.shop);
      }
      if (step1Data.fiDocuments.home) {
        formData.append('fiDocumentHome', step1Data.fiDocuments.home);
      }
      
      // Append step2 data
      formData.append('loanDate', step2Data.loanDate);
      formData.append('loanAmount', step2Data.loanAmount);
      formData.append('emiAmount', step2Data.emiAmount);
      formData.append('loanDays', step2Data.loanDays);
      formData.append('loanType', step2Data.loanType);
      
      // Append step3 data
      formData.append('loginId', step3Data.loginId.trim());
      formData.append('password', step3Data.password);
      formData.append('createdBy', 'data_entry_operator_1');

      console.log('📦 Sending customer data:', {
        name: step1Data.name,
        businessName: step1Data.businessName,
        area: step1Data.area,
        loanNumber: `LN${step1Data.loanNumber}`,
        address: step1Data.address,
        category: step1Data.category,
        officeCategory: step1Data.officeCategory,
        phones: step1Data.phone.filter(p => p.trim()),
        whatsappNumber: step1Data.whatsappNumber,
        loanAmount: step2Data.loanAmount,
        emiAmount: step2Data.emiAmount,
        loanDays: step2Data.loanDays,
        loanType: step2Data.loanType
      });

      const response = await fetch('/api/data-entry/customers', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 409) {
          if (data.field === 'phone') {
            throw new Error('Customer with this phone number already exists');
          } else if (data.field === 'loanNumber') {
            throw new Error('Loan number already exists. Please use a unique loan number');
          } else {
            throw new Error(data.error || 'A pending request already exists for this customer');
          }
        }
        
        // Show more specific error message from backend
        if (data.error) {
          throw new Error(data.error);
        } else if (data.message) {
          throw new Error(data.message);
        } else {
          throw new Error(`Failed to submit customer request: ${response.status} ${response.statusText}`);
        }
      }

      // SUCCESS: Show request submission message (not customer creation)
      alert(data.message || 'Customer request submitted successfully! Waiting for admin approval.');
      setShowAddCustomer(false);
      resetCustomerForm();
      
      // Refresh dashboard and requests
      fetchDashboardData();
      if (activeTab === 'requests') fetchPendingRequests();
      
    } catch (error: any) {
      console.error('Error submitting customer:', error);
      alert('Error: ' + error.message);
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
      
      // Validate required fields
      if (!emiUpdate.amount || !emiUpdate.paymentDate) {
        alert('Please fill all required fields');
        setIsLoading(false);
        return;
      }

      // Prepare EMI payment data
      const emiPaymentData = {
        customerId: selectedCustomer._id,
        customerName: selectedCustomer.name,
        loanId: selectedLoanForPayment._id, // Use the actual loan ID
        loanNumber: selectedLoanForPayment.loanNumber,
        paymentDate: emiUpdate.paymentDate,
        amount: Number(emiUpdate.amount),
        status: emiUpdate.status,
        collectedBy: emiUpdate.collectedBy,
        paymentMethod: 'Cash',
        notes: emiUpdate.notes || `EMI payment recorded for ${selectedCustomer.name} - Loan ${selectedLoanForPayment.loanNumber}`
      };

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
        
        // Handle specific error cases
        if (response.status === 404) {
          throw new Error('Loan not found. Please refresh and try again.');
        } else if (response.status === 400) {
          throw new Error(data.error || 'Invalid loan data provided');
        } else {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to update EMI');
      }

      alert(data.message || 'EMI payment recorded successfully!');
      
      // Reset form and close modal
      setShowPaymentForm(false);
      setSelectedLoanForPayment(null);
      setShowUpdateEMI(false);
      setSelectedCustomer(null);
      setSearchQuery('');
      setFilters({
        loanNumber: '',
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
        collectedBy: 'Operator 1'
      });
      
      // Refresh dashboard data
      fetchDashboardData();
      
    } catch (error: any) {
      console.error('💥 Error updating EMI:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchCustomer = (customer: Customer) => {
    console.log('🔍 Customer selected for EMI:', customer);
    setSelectedCustomer(customer);
    setEmiUpdate(prev => ({
      ...prev,
      customerId: customer._id || customer.id || '',
      customerName: customer.name,
      paymentDate: new Date().toISOString().split('T')[0]
    }));
    
    // Clear search after selection
    setSearchQuery('');
  };

  const handlePayNow = (loan: DisplayLoan) => {
    console.log('💰 Pay Now clicked for loan:', loan);
    console.log('📋 Loan details:', {
      id: loan._id,
      loanNumber: loan.loanNumber,
      customerId: loan.customerId,
      isMainLoan: loan.isMainLoan,
      amount: loan.amount,
      emiAmount: loan.emiAmount
    });
    
    // Validate that we have a proper loan ID
    if (!loan._id) {
      console.error('❌ No loan ID found for loan:', loan);
      alert('Error: Loan ID not found. Please refresh and try again.');
      return;
    }

    // Validate that we have a customer ID
    if (!selectedCustomer?._id) {
      console.error('❌ No customer selected');
      alert('Error: No customer selected. Please select a customer first.');
      return;
    }

    setSelectedLoanForPayment(loan);
    setEmiUpdate(prev => ({
      ...prev,
      customerId: selectedCustomer._id || '',
      customerName: selectedCustomer.name || '',
      loanId: loan._id, // Use the actual loan ID
      loanNumber: loan.loanNumber || '',
      amount: loan.emiAmount ? loan.emiAmount.toString() : '',
      paymentDate: new Date().toISOString().split('T')[0]
    }));
    setShowPaymentForm(true);
  };

  const handleLogout = () => {
    router.push('/auth');
  };

  // Calendar component
  const renderEMICalendar = () => {
    if (!calendarData) return null;

    const calendarDays = generateCalendar(
  currentMonth, 
  calendarData.loans, 
  calendarData.paymentHistory,
  calendarFilter.loanFilter
);
    const filteredDays = calendarFilter.emiStatus === 'all' 
  ? calendarDays 
  : calendarDays.filter(day => day.emiStatus === calendarFilter.emiStatus);

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

            {/* Calendar Controls */}
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

              {/* Filters */}
              <select
      value={calendarFilter.loanFilter}
      onChange={(e) => setCalendarFilter(prev => ({
        ...prev,
        loanFilter: e.target.value
      }))}
      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
    >
      <option value="all">All Loans</option>
      {calendarData.loans.map((loan, index) => (
        <option key={loan._id} value={loan._id}>
          {loan.isMainLoan ? 'L1 (Main)' : `L${index + 1}`} - {loan.loanNumber} 
          {loan.isMainLoan && ' ★'}
        </option>
      ))}
    </select>
  </div>

  {/* EMI Status Filter */}
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

            {/* Legend */}
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

            {/* Calendar Grid */}
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
                  className={`min-h-24 p-2 border rounded-md cursor-pointer transition-all hover:shadow-md ${
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
                  
                  {day.emiAmount && day.emiAmount > 0 && (
                    <div className="mt-1">
                      <div className="text-xs font-semibold">
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
                    <div className="mt-1 text-xs text-gray-500">
                      {day.paymentHistory.length} payment(s)
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Customer Behavior Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h5 className="font-semibold mb-3">Payment Behavior Summary</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {calendarData.loans.map((loan, index) => {
                  const behavior = calculatePaymentBehavior(loan);
                  const completion = calculateEMICompletion(loan);
                  return (
                    <div key={loan._id} className="bg-white p-3 rounded border">
                      <div className="font-medium">Loan {index + 1}</div>
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
    const payments = calendarData.paymentHistory.filter(p => p.paymentDate === dateStr);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full">
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
              <div className="space-y-3">
                {payments.map((payment, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">₹{payment.amount}</div>
                        <div className="text-sm text-gray-600">
                          Status: <span className={
                            payment.status === 'Paid' ? 'text-green-600' : 
                            payment.status === 'Partial' ? 'text-yellow-600' : 'text-red-600'
                          }>
                            {payment.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Collected by: {payment.collectedBy}
                        </div>
                        {payment.notes && (
                          <div className="text-sm text-gray-600 mt-1">
                            Notes: {payment.notes}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleEditPastEMI(payment)}
                        className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700"
                      >
                        Request Edit
                      </button>
                    </div>
                  </div>
                ))}
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

  const renderSearchAndFilters = () => {
    const handleFilterChange = (key: keyof Filters, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
      setFilters({
        loanNumber: '',
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
                placeholder="Search by customer name or loan number..."
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
            
            {(filters.loanNumber || filters.loanType || filters.status || filters.officeCategory || searchQuery) && (
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
                  Loan Number
                </label>
                <input
                  type="text"
                  placeholder="Enter loan number..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.loanNumber}
                  onChange={(e) => handleFilterChange('loanNumber', e.target.value)}
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

            {(filters.loanNumber || filters.loanType || filters.status || filters.officeCategory) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600">Active filters:</span>
                  {filters.loanNumber && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      Loan No: {filters.loanNumber}
                      <button 
                        onClick={() => handleFilterChange('loanNumber', '')}
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

          {/* Progress Steps */}
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

          {/* Step 1: Basic Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h4 className="text-lg font-semibold">Step 1: Customer Basic Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Numbers *</label>
                  {step1Data.phone.map((phoneNumber, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input 
                        type="tel" 
                        className={`w-full px-3 py-2 border rounded-md ${
                          step1Errors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        value={phoneNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 10) {
                            const newPhones = [...step1Data.phone];
                            newPhones[index] = value;
                            setStep1Data({...step1Data, phone: newPhones});
                          }
                        }}
                        placeholder="Enter 10-digit phone number"
                        maxLength={10}
                      />
                      {index === step1Data.phone.length - 1 && step1Data.phone.length < 3 && (
                        <button
                          type="button"
                          onClick={() => setStep1Data({
                            ...step1Data, 
                            phone: [...step1Data.phone, '']
                          })}
                          className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                        >
                          +
                        </button>
                      )}
                      {step1Data.phone.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newPhones = step1Data.phone.filter((_, i) => i !== index);
                            setStep1Data({...step1Data, phone: newPhones});
                          }}
                          className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {step1Errors.phone && <p className="text-red-500 text-xs mt-1">{step1Errors.phone}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    You can add up to 3 phone numbers. Click + to add another.
                  </p>
                </div>

                {/* WhatsApp Number Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      <img 
                        src="/images/whatsapp-logo.png" 
                        alt="WhatsApp" 
                        className="w-5 h-5"
                      />
                      <span className="text-green-600 font-semibold">WhatsApp Number</span>
                    </span>
                  </label>
                  <div className="relative">
                    {/* WhatsApp logo inside input */}
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <img 
                        src="/images/whatsapp-logo.png" 
                        alt="WhatsApp" 
                        className="w-4 h-4"
                      />
                    </div>
                    <input 
                      type="tel" 
                      className={`w-full px-3 py-2 pl-10 border rounded-md ${
                        step1Errors.whatsappNumber ? 'border-red-500' : 'border-gray-300'
                      } focus:ring-2 focus:ring-green-500 focus:border-green-500`}
                      value={step1Data.whatsappNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 10) {
                          setStep1Data({...step1Data, whatsappNumber: value});
                        }
                      }}
                      placeholder="10-digit number"
                      maxLength={10}
                    />
                  </div>
                  {step1Errors.whatsappNumber && <p className="text-red-500 text-xs mt-1">{step1Errors.whatsappNumber}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    Optional - for WhatsApp communication
                  </p>
                </div>
                
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Number *</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-md">
                      LN
                    </span>
                    <input 
                      type="text" 
                      className={`flex-1 px-3 py-2 border rounded-r-md ${
                        step1Errors.loanNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={step1Data.loanNumber}
                      onChange={(e) => setStep1Data({...step1Data, loanNumber: e.target.value.replace(/\D/g, '')})}
                      placeholder="Enter numbers only"
                      maxLength={10}
                    />
                  </div>
                  {step1Errors.loanNumber && <p className="text-red-500 text-xs mt-1">{step1Errors.loanNumber}</p>}
                  <p className="text-xs text-gray-500 mt-1">Must be unique. Full loan number: LN{step1Data.loanNumber || '___'}</p>
                </div>
                
                <div className="md:col-span-2">
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

                {/* Category and Office Category Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
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
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Office Category *</label>
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

              {/* File Uploads */}
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

          {/* Step 2: Loan Information - UPDATED FORMAT */}
          {currentStep === 2 && (
  <div className="space-y-6">
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
      <h4 className="text-lg font-semibold text-blue-900 mb-2">Customer Information</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-blue-700 font-medium">Loan Number:</span>
          <p className="text-blue-900">LN{step1Data.loanNumber}</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Loan Date *</label>
          <input 
            type="date" 
            className={`w-full px-3 py-2 border rounded-md ${
              step2Errors.loanDate ? 'border-red-500' : 'border-gray-300'
            }`}
            value={formatDateForInput(step2Data.loanDate)}
            onChange={(e) => setStep2Data({...step2Data, loanDate: e.target.value})}
            required
          />
          {step2Errors.loanDate && <p className="text-red-500 text-xs mt-1">{step2Errors.loanDate}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type *</label>
          <select 
            className={`w-full px-3 py-2 border rounded-md ${
              step2Errors.loanType ? 'border-red-500' : 'border-gray-300'
            }`}
            value={step2Data.loanType}
            onChange={(e) => {
              setStep2Data({
                ...step2Data, 
                loanType: e.target.value,
                // Reset duration when loan type changes
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
          {step2Errors.loanType && <p className="text-red-500 text-xs mt-1">{step2Errors.loanType}</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount *</label>
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

        {/* NEW: Total Loan Amount Column */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Total Loan</label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
            <p className="text-gray-900 font-semibold text-lg">
              ₹{(Number(step2Data.emiAmount || 0) * Number(step2Data.loanDays || 0)).toLocaleString()}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            EMI × Duration (Auto-calculated)
          </p>
        </div>
      </div>

      {/* Loan Summary Preview */}
      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <h5 className="font-semibold text-green-900 mb-2">Loan Summary</h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-green-700">Loan Amount:</span>
            <p className="font-semibold">₹{step2Data.loanAmount || '0'}</p>
          </div>
          <div>
            <span className="text-green-700">EMI Amount:</span>
            <p className="font-semibold">₹{step2Data.emiAmount || '0'}</p>
          </div>
          <div>
            <span className="text-green-700">Duration:</span>
            <p className="font-semibold">
              {step2Data.loanDays || '0'} 
              {step2Data.loanType === 'Daily' ? ' days' : 
               step2Data.loanType === 'Weekly' ? ' weeks' : ' months'}
            </p>
          </div>
          <div>
            <span className="text-green-700">Total Loan:</span>
            <p className="font-semibold">
              ₹{(Number(step2Data.emiAmount || 0) * Number(step2Data.loanDays || 0)).toLocaleString()}
            </p>
          </div>
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

          {/* Step 3: Login Credentials */}
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
                      <span className="text-blue-700 font-medium">Loan No:</span>
                      <span className="text-blue-900 ml-1">LN{step1Data.loanNumber}</span>
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
            {/* Customer Information Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-lg font-semibold text-blue-900 mb-2">Customer Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Loan Number:</span>
                  <p className="text-blue-900">{customerDetails?.loanNumber}</p>
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

            {/* Enter Loan Details Section */}
            <div>
  <h4 className="text-lg font-semibold mb-4">Enter Loan Details</h4>
  
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Loan Date *</label>
      <input 
        type="date" 
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={formatDateForInput(newLoanData.dateApplied)}
        onChange={(e) => setNewLoanData({...newLoanData, dateApplied: e.target.value})}
        required
      />
    </div>
    
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type *</label>
      <select 
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        value={newLoanData.loanType}
        onChange={(e) => {
          setNewLoanData({
            ...newLoanData, 
            loanType: e.target.value,
            // Reset duration when loan type changes
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
        value={newLoanData.amount}
        onChange={(e) => setNewLoanData({...newLoanData, amount: e.target.value})}
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
        value={newLoanData.emiAmount}
        onChange={(e) => setNewLoanData({...newLoanData, emiAmount: e.target.value})}
        placeholder="EMI Amount"
        min="0"
        step="0.01"
        required
      />
    </div>
    
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

    {/* NEW: Total Loan Amount Column */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Total Loan</label>
      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
        <p className="text-gray-900 font-semibold text-lg">
          ₹{(Number(newLoanData.emiAmount || 0) * Number(newLoanData.loanDays || 0)).toLocaleString()}
        </p>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        EMI × Duration (Auto-calculated)
      </p>
    </div>
  </div>
</div>

            {/* Loan Summary Preview */}
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
  <h5 className="font-semibold text-green-900 mb-2">Loan Summary</h5>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
    <div>
      <span className="text-green-700">Loan Amount:</span>
      <p className="font-semibold">₹{newLoanData.amount || '0'}</p>
    </div>
    <div>
      <span className="text-green-700">EMI Amount:</span>
      <p className="font-semibold">₹{newLoanData.emiAmount || '0'}</p>
    </div>
    <div>
      <span className="text-green-700">Duration:</span>
      <p className="font-semibold">
        {newLoanData.loanDays || '0'} 
        {newLoanData.loanType === 'Daily' ? ' days' : 
         newLoanData.loanType === 'Weekly' ? ' weeks' : ' months'}
      </p>
    </div>
    <div>
      <span className="text-green-700">Total Loan:</span>
      <p className="font-semibold">
        ₹{(Number(newLoanData.emiAmount || 0) * Number(newLoanData.loanDays || 0)).toLocaleString()}
      </p>
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
              disabled={isLoading || !newLoanData.amount || !newLoanData.emiAmount || !newLoanData.loanDays}
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
            {/* Customer Information Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-lg font-semibold text-blue-900 mb-2">Customer Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Customer Name:</span>
                  <p className="text-blue-900">{editLoanData.customerName}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Loan Number:</span>
                  <p className="text-blue-900">{editLoanData.loanNumber}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Type:</span>
                  <p className="text-blue-900">
                    {editLoanData.isMainLoan ? 'Main Loan' : 'Additional Loan'}
                  </p>
                </div>
              </div>
            </div>

            {/* Edit Loan Details Section */}
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

            {/* Changes Summary */}
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

            {/* Note */}
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
            {/* Customer Information Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-lg font-semibold text-blue-900 mb-2">Customer Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Customer Name:</span>
                  <p className="text-blue-900">{renewLoanData.customerName}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Loan Number:</span>
                  <p className="text-blue-900">{renewLoanData.loanNumber}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Renewal Date:</span>
                  <p className="text-blue-900">{renewLoanData.renewalDate}</p>
                </div>
              </div>
            </div>

            {/* Renew Loan Details Section */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Renew Loan Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type *</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={renewLoanData.newLoanType}
                    onChange={(e) => {
                      setRenewLoanData({
                        ...renewLoanData, 
                        newLoanType: e.target.value,
                        newLoanDays: e.target.value === 'Monthly' ? '30' : 
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Loan Amount *</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={renewLoanData.newLoanAmount}
                    onChange={(e) => setRenewLoanData({...renewLoanData, newLoanAmount: e.target.value})}
                    placeholder="New Amount"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New EMI Amount *</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={renewLoanData.newEmiAmount}
                    onChange={(e) => setRenewLoanData({...renewLoanData, newEmiAmount: e.target.value})}
                    placeholder="New EMI Amount"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                
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
              </div>

              {/* Remarks */}
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

            {/* Renewal Summary */}
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h5 className="font-semibold text-green-900 mb-2">Renewal Summary</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-green-700">New Loan Amount:</span>
                  <p className="font-semibold">₹{renewLoanData.newLoanAmount || '0'}</p>
                </div>
                <div>
                  <span className="text-green-700">New EMI Amount:</span>
                  <p className="font-semibold">₹{renewLoanData.newEmiAmount || '0'}</p>
                </div>
                <div>
                  <span className="text-green-700">Duration:</span>
                  <p className="font-semibold">
                    {renewLoanData.newLoanDays || '0'} 
                    {renewLoanData.newLoanType === 'Daily' ? ' days' : 
                     renewLoanData.newLoanType === 'Weekly' ? ' weeks' : ' months'}
                  </p>
                </div>
                <div>
                  <span className="text-green-700">Type:</span>
                  <p className="font-semibold">{renewLoanData.newLoanType} EMI</p>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h5 className="font-semibold text-blue-900 mb-2">Note</h5>
              <p className="text-sm text-blue-700">
                This renewal request will be sent to the admin for approval. The renewed loan will only be created after admin approval.
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
    // Ensure phone is always an array
    const phoneNumbers = Array.isArray(editCustomerData.phone) ? editCustomerData.phone : [editCustomerData.phone || ''];
  
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Edit Customer Profile</h3>
              <button 
                onClick={() => setShowEditCustomer(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Customer Information Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-lg font-semibold text-blue-900 mb-2">Customer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Customer ID:</span>
                    <p className="text-blue-900">{editCustomerData.customerId}</p>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Current Loan Number:</span>
                    <p className="text-blue-900">{editCustomerData.loanNumber}</p>
                  </div>
                </div>
              </div>
  
              {/* Edit Customer Details Section */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Edit Customer Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={editCustomerData.name}
                      onChange={(e) => setEditCustomerData({...editCustomerData, name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={editCustomerData.businessName}
                      onChange={(e) => setEditCustomerData({...editCustomerData, businessName: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Area *</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={editCustomerData.area}
                      onChange={(e) => setEditCustomerData({...editCustomerData, area: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Number *</label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 py-2 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 rounded-l-md">
                        LN
                      </span>
                      <input 
                        type="text" 
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={editCustomerData.loanNumber.replace('LN', '')}
                        onChange={(e) => setEditCustomerData({
                          ...editCustomerData, 
                          loanNumber: `LN${e.target.value.replace(/\D/g, '')}`
                        })}
                        placeholder="Enter numbers only"
                        maxLength={10}
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Full loan number: {editCustomerData.loanNumber}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type *</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={editCustomerData.loanType}
                      onChange={(e) => setEditCustomerData({...editCustomerData, loanType: e.target.value})}
                      required
                    >
                      <option value="Daily">Daily EMI</option>
                      <option value="Weekly">Weekly EMI</option>
                      <option value="Monthly">Monthly EMI</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
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
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Office Category *</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={editCustomerData.officeCategory}
                      onChange={(e) => setEditCustomerData({...editCustomerData, officeCategory: e.target.value})}
                      required
                    >
                      <option value="Office 1">Office 1</option>
                      <option value="Office 2">Office 2</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      value={editCustomerData.address}
                      onChange={(e) => setEditCustomerData({...editCustomerData, address: e.target.value})}
                    />
                  </div>
                </div>
              </div>
  
              {/* Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h5 className="font-semibold text-blue-900 mb-2">Note</h5>
                <p className="text-sm text-blue-700">
                  This edit request will be sent to the admin for approval. The changes will only be applied after admin approval.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => setShowEditCustomer(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEditCustomer}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isLoading ? 'Submitting...' : 'Submit Profile Edit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEMI = () => (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">EMI Management</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Update daily EMI collections</p>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-blue-900 mb-4">Update EMI Payment</h4>
                <p className="text-gray-600 mb-4">Search for a customer and record their EMI payment</p>
                <button 
                  onClick={() => setShowUpdateEMI(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Update EMI
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-green-900 mb-4">Today's EMI Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{todayStats.emiCollected}</p>
                    <p className="text-sm text-green-700">EMI Collected</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">₹{todayStats.totalCollection}</p>
                    <p className="text-sm text-green-700">Total Collection</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRequests = () => (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Pending Requests</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Requests waiting for admin approval</p>
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(pendingRequests) && pendingRequests.length > 0 ? (
                  pendingRequests.map((request) => (
                    <tr key={request._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.customerName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateToDDMMYYYY(request.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {request.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      {Array.isArray(pendingRequests) ? 'No pending requests' : 'Error loading requests'}
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

  const renderDashboard = () => (
    <div className="px-4 py-6 sm:px-0">
      {/* Stats Grid */}
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

      {/* Quick Actions */}
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

      {/* Recent Activity & Info Section */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
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

        {/* Process Info */}
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

      {/* Pending Requests Quick View */}
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

  const renderCustomers = () => (
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
        
        {/* Add info note */}
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
        
        {renderSearchAndFilters()}
      </div>

      <div className="bg-white shadow rounded-lg">
  <div className="px-4 py-5 sm:px-6">
    <h3 className="text-lg leading-6 font-medium text-gray-900">Customers List</h3>
    <p className="mt-1 max-w-2xl text-sm text-gray-500">All active customers and their loan details</p>
  </div>
  <div className="border-t border-gray-200">
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Loan Number</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Business</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Office</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredCustomers.map((customer) => (
            <tr key={customer._id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 w-1/5">{customer.loanNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-1/5">{customer.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/5">{customer.businessName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/5">
                {customer.officeCategory || 'N/A'}
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
          {filteredCustomers.length === 0 && (
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

  // Update the EMI payment form to show completion percentage
  const renderUpdateEMIForm = () => {
    // Get all loans for display
    const displayLoans = selectedCustomer ? getAllCustomerLoans(selectedCustomer, customerDetails) : [];
    const calculateTotalLoanAmount = (loan: DisplayLoan): number => {
  return loan.emiAmount * loan.totalEmiCount;
};

    // Get current operator name from user context or session
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
                    loanNumber: '',
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
                {/* Search Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Customer *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by customer name or loan number..."
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

                {/* Customer Search Results */}
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
                                {customer.loanNumber} • ₹{customer.emiAmount} {customer.loanType} EMI
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

                {/* No Customers Message */}
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

                {/* Selected Customer Display */}
                {selectedCustomer && (
                  <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 font-semibold text-sm">
                            {selectedCustomer.name.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-blue-900">{selectedCustomer.name}</div>
                          <div className="text-sm text-blue-700">
                            {selectedCustomer.loanNumber}
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

                {/* Customer Loans Section */}
                {selectedCustomer && (
  <div className="mt-6">
    <h4 className="text-lg font-semibold mb-4">Customer Loans</h4>
    <div className="space-y-4">
      {/* Get all loans including main loan and additional loans */}
      {displayLoans.map((loan, index) => {
        const completion = calculateEMICompletion(loan);
        const totalLoanAmount = calculateTotalLoanAmount(loan);
        
        return (
          <div 
            key={loan._id} 
            className={`border rounded-lg p-4 ${
              loan.isMainLoan 
                ? 'border-gray-200 bg-white' 
                : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <div>
                <h5 className={`font-medium ${
                  loan.isMainLoan ? 'text-gray-900' : 'text-blue-900'
                }`}>
                  Loan {loan.isMainLoan ? 'L1 (Main Loan)' : `L${index + 1}`}
                </h5>
                <p className="text-xs text-gray-500">
                  Loan Date: {formatDateToDDMMYYYY(loan.dateApplied)}
                </p>
              </div>
              {/* REMOVED: Completion Percentage Badge */}
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                loan.isMainLoan 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {loan.isMainLoan ? 'Main' : 'Additional'}
              </span>
            </div>

            {/* Completion Progress Bar */}
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
                <span>Remaining: ₹{completion.remainingAmount}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <label className={`block text-xs font-medium ${
                  loan.isMainLoan ? 'text-gray-500' : 'text-blue-600'
                }`}>
                  Total Loan
                </label>
                <p className={loan.isMainLoan ? 'text-gray-900' : 'text-blue-900'}>
                  ₹{totalLoanAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <label className={`block text-xs font-medium ${
                  loan.isMainLoan ? 'text-gray-500' : 'text-blue-600'
                }`}>
                  EMI Amount
                </label>
                <p className={loan.isMainLoan ? 'text-gray-900' : 'text-blue-900'}>
                  ₹{loan.emiAmount}
                </p>
              </div>
              <div>
                <label className={`block text-xs font-medium ${
                  loan.isMainLoan ? 'text-gray-500' : 'text-blue-600'
                }`}>
                  Loan Type
                </label>
                <p className={loan.isMainLoan ? 'text-gray-900' : 'text-blue-900'}>
                  {loan.loanType}
                </p>
              </div>
              <div>
                <label className={`block text-xs font-medium ${
                  loan.isMainLoan ? 'text-gray-500' : 'text-blue-600'
                }`}>
                  Duration
                </label>
                <p className={loan.isMainLoan ? 'text-gray-900' : 'text-blue-900'}>
                  {loan.loanDays} {loan.loanType === 'Daily' ? 'days' : 
                                 loan.loanType === 'Weekly' ? 'weeks' : 'months'}
                </p>
              </div>
              <div>
                <label className={`block text-xs font-medium ${
                  loan.isMainLoan ? 'text-gray-500' : 'text-blue-600'
                }`}>
                  Next EMI Date
                </label>
                <p className={loan.isMainLoan ? 'text-gray-900' : 'text-blue-900'}>
                  {formatDateToDDMMYYYY(loan.nextEmiDate)}
                </p>
              </div>
            </div>
            
            {/* REMOVED: Duplicate EMI remaining and paid details */}
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

                {/* Help Text */}
                {!selectedCustomer && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-sm text-blue-700">
                      <strong>How to record EMI payment:</strong>
                    </p>
                    <ol className="text-xs text-blue-600 mt-1 list-decimal list-inside space-y-1">
                      <li>Search for an active customer using name or loan number</li>
                      <li>Select the customer from the search results</li>
                      <li>View the customer's loans and click "Pay Now" for the relevant loan</li>
                      <li>Fill in the payment details in the next screen</li>
                      <li>Click "Record EMI Payment" to save</li>
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              /* Payment Form */
              <div className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                  <h4 className="text-lg font-semibold text-blue-900 mb-2">EMI Payment</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600 font-medium">Customer:</span>
                      <p className="text-blue-900">{selectedCustomer?.name}</p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Loan:</span>
                      <p className="text-blue-900">
                        {selectedLoanForPayment && displayLoans.find(l => l._id === selectedLoanForPayment._id)?.isMainLoan 
                          ? 'L1 (Main Loan)' 
                          : `L${displayLoans.findIndex(l => l._id === selectedLoanForPayment?._id) + 1}`}
                      </p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">EMI Amount:</span>
                      <p className="text-blue-900 font-semibold">₹{selectedLoanForPayment?.emiAmount}</p>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Loan Type:</span>
                      <p className="text-blue-900">{selectedLoanForPayment?.loanType}</p>
                    </div>
                  </div>
                </div>

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
                    {/* Hidden input to maintain the value in state */}
                    <input 
                      type="hidden" 
                      value={currentOperator}
                      onChange={(e) => setEmiUpdate({...emiUpdate, collectedBy: currentOperator})}
                    />
                  </div>
                </div>

                {/* Notes Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    value={emiUpdate.notes || ''}
                    onChange={(e) => setEmiUpdate({...emiUpdate, notes: e.target.value})}
                    placeholder="Add any notes about this payment..."
                  />
                </div>

                {/* Action Buttons */}
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
                    disabled={!emiUpdate.amount || isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin mr-2">⏳</span>
                        Processing...
                      </>
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

  // Update the customer details view to show completion percentage
  const renderCustomerDetails = () => {
    // Get all loans for display
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
                  </div>
                </div>

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

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Loan Information</h4>
                    <button 
                      onClick={() => setShowAddLoanModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                    >
                      + Add New Loan
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Display all loans including main loan and additional loans */}
                    {displayLoans.map((loan, index) => {
                      const completion = calculateEMICompletion(loan);
                      const behavior = calculatePaymentBehavior(loan);
                      
                      return (
                        <div 
                          key={loan._id} 
                          className={`border rounded-lg p-4 ${
                            loan.isMainLoan 
                              ? 'border-gray-200 bg-white' 
                              : 'border-blue-200 bg-blue-50'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h5 className={`font-medium ${
                                loan.isMainLoan ? 'text-gray-900' : 'text-blue-900'
                              }`}>
                                Loan {loan.isMainLoan ? 'L1 (Main Loan)' : `L${index + 1}`}
                              </h5>
                              <p className="text-xs text-gray-500">
                Loan Date: {formatDateToDDMMYYYY(loan.dateApplied)}
              </p>
                              {loan.isMainLoan && (
                                <p className="text-xs text-gray-500">Primary loan account</p>
                              )}
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              loan.isMainLoan 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {loan.isMainLoan ? 'Main' : 'Additional'}
                            </span>
                          </div>
                          
                          {/* Completion Progress Bar */}
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
    <span>Remaining: ₹{completion.remainingAmount}</span>
  </div>
</div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
  <div>
    <label className={`block text-xs font-medium ${
      loan.isMainLoan ? 'text-gray-500' : 'text-blue-600'
    }`}>
      Total Loan
    </label>
    <p className={loan.isMainLoan ? 'text-gray-900' : 'text-blue-900'}>
      ₹{calculateTotalLoanAmount(loan).toLocaleString()}
    </p>
  </div>
  <div>
    <label className={`block text-xs font-medium ${
      loan.isMainLoan ? 'text-gray-500' : 'text-blue-600'
    }`}>
      EMI Amount
    </label>
    <p className={loan.isMainLoan ? 'text-gray-900' : 'text-blue-900'}>
      ₹{loan.emiAmount}
    </p>
  </div>
  <div>
    <label className={`block text-xs font-medium ${
      loan.isMainLoan ? 'text-gray-500' : 'text-blue-600'
    }`}>
      Loan Type
    </label>
    <p className={loan.isMainLoan ? 'text-gray-900' : 'text-blue-900'}>
      {loan.loanType}
    </p>
  </div>
  <div>
    <label className={`block text-xs font-medium ${
      loan.isMainLoan ? 'text-gray-500' : 'text-blue-600'
    }`}>
      Next EMI Date
    </label>
    <p className={loan.isMainLoan ? 'text-gray-900' : 'text-blue-900'}>
      {formatDateToDDMMYYYY(loan.nextEmiDate)}
    </p>
  </div>
  <div>
    <label className={`block text-xs font-medium ${
      loan.isMainLoan ? 'text-gray-500' : 'text-blue-600'
    }`}>
      Behavior Score
    </label>
    <p className={`font-semibold ${
      behavior.punctualityScore >= 90 ? 'text-green-600' :
      behavior.punctualityScore >= 75 ? 'text-blue-600' :
      behavior.punctualityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
    }`}>
      {behavior.punctualityScore.toFixed(0)}%
    </p>
  </div>
</div>
                          
                          {/* Edit, Renew and Delete Buttons */}
                          <div className="flex justify-end space-x-2 mt-4">
                            <button 
                              onClick={() => handleEditLoan(loan)}
                              className="bg-yellow-600 text-white px-3 py-1 rounded-md hover:bg-yellow-700 text-sm"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleRenewLoan(loan)}
                              className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm"
                            >
                              Renew
                            </button>
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
                    })}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button 
                    onClick={() => setShowCustomerDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => handleEditCustomer(customerDetails)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Edit Profile
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
    </div>
  );
}