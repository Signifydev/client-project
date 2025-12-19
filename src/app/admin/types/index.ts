export interface DashboardStats {
  totalLoans: number;
  totalAmount: number;
  totalCustomers: number;
  totalTeamMembers: number;
  pendingRequests: number;
}

export interface Customer {
  _id: string;
  id: string;
  customerNumber: string;
  name: string;
  phone: string | string[];
  businessName: string;
  officeCategory: string;
  category: string;
  status: string;
  loanType?: string;
  loanNumber?: string;
  loanAmount?: number;
  emiAmount?: number;
  loanDate?: string;
  loanDays?: number;
  totalCollection?: number;
  emiPaidCount?: number;
  nextEmiDate?: string;
  area?: string;
  secondaryPhone?: string;
  whatsappNumber?: string;
  address?: string;
  transactions?: any[];
  fiDocuments?: {
    shop?: {
      filename?: string;
      url?: string;
      originalName?: string;
      uploadedAt?: string;
    } | string;
    home?: {
      filename?: string;
      url?: string;
      originalName?: string;
      uploadedAt?: string;
    } | string;
  };
  additionalLoans?: any[];
  loans?: any[]; // NEW: For enhanced loan data
  phoneArray?: string[]; // NEW: For phone number array
  profilePicture?: string | {
    filename?: string;
    url?: string;
    originalName?: string;
    uploadedAt?: string;
  };
  businessType?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // NEW: Loan summary fields from enhanced API
  loanSummary?: {
    totalLoans: number;
    totalLoanAmount: number;
    totalPaidAmount: number;
    totalRemainingAmount: number;
    activeLoans: number;
    completedLoans: number;
    overdueLoans: number;
    renewedLoans: number;
  };
  
  // NEW: EMI payments for transaction history
  emiPayments?: EMIPayment[];
}

export interface TeamMember {
  _id: string;
  name: string;
  role: 'Recovery Team' | 'Data Entry Operator';
  phone: string;
  whatsappNumber?: string;
  address?: string;
  officeCategory?: string;
  operatorNumber?: string;
  status: 'active' | 'inactive';
  loginId: string;
  password?: string;
  joinDate?: string;
  updatedAt?: string;
}

export interface PendingRequest {
  _id: string;
  type: 'New Customer' | 'EDIT';
  customerName?: string;
  customerNumber?: string;
  customerPhone?: string;
  loanAmount?: number;
  emiAmount?: number;
  loanType?: string;
  requestedData?: any;
  originalData?: any;
  changes?: Record<string, any>;
  status: string;
  createdAt: string;
  createdBy: string;
  priority?: string;
}

export interface Filters {
  customerNumber: string;
  loanType: string;
  status: string;
  officeCategory: string;
  category: string;
}

export interface CollectionData {
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
}

// EMI Payment Interface
export interface EMIPayment {
  _id: string;
  customerId: string;
  customerName: string;
  loanId?: string;
  loanNumber?: string;
  paymentDate: string;
  amount: number;
  status: 'Paid' | 'Partial' | 'Due' | 'Overdue' | 'Advance' | 'Pending';
  collectedBy: string;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Other';
  transactionId?: string;
  notes?: string;
  isVerified?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  paymentType?: 'single' | 'advance';
  isAdvancePayment?: boolean;
  advanceFromDate?: string;
  advanceToDate?: string;
  advanceEmiCount?: number;
  advanceTotalAmount?: number;
  createdAt: string;
  updatedAt: string;
}

// Loan Interface
export interface Loan {
  _id: string;
  loanId?: string;
  customerId: string;
  customerName: string;
  customerNumber: string;
  loanNumber: string;
  amount: number;
  emiAmount: number;
  loanType: 'Daily' | 'Weekly' | 'Monthly';
  dateApplied: string;
  loanDays: number;
  emiType: 'fixed' | 'custom';
  customEmiAmount?: number;
  emiStartDate: string;
  totalEmiCount: number;
  emiPaidCount: number;
  lastEmiDate?: string;
  nextEmiDate: string;
  totalPaidAmount: number;
  totalCollection?: number;
  remainingAmount: number;
  emiHistory?: EMIHistory[];
  status: 'active' | 'completed' | 'overdue' | 'pending' | 'closed' | 'defaulted' | 'renewed';
  createdBy: string;
  isRenewed?: boolean;
  renewedLoanNumber?: string;
  renewedDate?: string;
  originalLoanNumber?: string;
  createdAt: string;
  updatedAt: string;
}

// EMI History Interface
export interface EMIHistory {
  paymentDate: string;
  amount: number;
  status: 'Paid' | 'Partial' | 'Due' | 'Overdue' | 'Advance';
  collectedBy: string;
  notes?: string;
  loanId?: string;
  customerNumber?: string;
  loanNumber?: string;
  paymentType?: 'single' | 'advance';
  advanceFromDate?: string;
  advanceToDate?: string;
  advanceEmiCount?: number;
  advanceTotalAmount?: number;
  createdAt: string;
}

// Loan Payment Summary Interface
export interface LoanPaymentSummary {
  loanNumber: string;
  loanId: string;
  totalPaid: number;
  paymentCount: number;
  lastPaymentDate?: string;
  emiAmount?: number;
  loanAmount?: number;
  loanType?: string;
}

// API Response Interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// EMI Payments API Response
export interface EMIPaymentsResponse {
  payments: EMIPayment[];
  statistics: {
    todayCollection: number;
    todayPayments: number;
    customerWise: Array<{
      customerName: string;
      loanNumber: string;
      totalAmount: number;
      paymentCount: number;
    }>;
  };
}

// Customer Loan Summary
export interface CustomerLoanSummary {
  totalLoans: number;
  totalLoanAmount: number;
  totalPaidAmount: number;
  totalRemainingAmount: number;
  activeLoans: number;
  completedLoans: number;
  overdueLoans: number;
  renewedLoans: number;
}

// Search Filters
export interface SearchFilters {
  searchTerm?: string;
  customerNumber?: string;
  loanType?: string;
  status?: string;
  officeCategory?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

// Pagination
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Paginated Response
export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: Pagination;
}

// Notification
export interface Notification {
  id: string;
  type: 'payment' | 'request' | 'system' | 'warning';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

// Document
export interface Document {
  id: string;
  type: 'shop_fi' | 'home_fi' | 'aadhar' | 'pan' | 'other';
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  verified: boolean;
}

// Loan Renewal Data
export interface LoanRenewalData {
  originalLoanId: string;
  newLoanAmount: number;
  newEmiAmount: number;
  newLoanType: 'Daily' | 'Weekly' | 'Monthly';
  newLoanDays: number;
  renewalDate: string;
  emiType: 'fixed' | 'custom';
  customEmiAmount?: number;
  emiStartDate: string;
  requestedBy: string;
}