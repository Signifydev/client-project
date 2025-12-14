// =============================================
// CUSTOMER RELATED TYPES
// =============================================

/**
 * Customer interface representing a customer entity
 */
export interface Customer {
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
  lastPaymentDate?: string;
  dueAmount?: number;
  // Add this optional property
  loans?: Loan[];
  totalLoans?: number;
  totalLoanAmount?: number;
  activeLoan?: Loan;
  totalPaid?: number;
}

/**
 * Extended customer details with loan information
 */
export interface CustomerDetails {
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
  lastPaymentDate?: string; // Added for performance optimization
}

export interface CustomerNumberSuggestion {
  number: string;
  reason: string;
  isAvailable: boolean;
}
// =============================================
// LOAN RELATED TYPES
// =============================================

/**
 * EMI History record for loan payments
 */
export interface EMIHistory {
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
  
  // Advance payment properties
  paymentType?: 'single' | 'advance';
  isAdvancePayment?: boolean;
  advanceFromDate?: string;
  advanceToDate?: string;
  advanceEmiCount?: number;
  advanceTotalAmount?: number;
  
  // Edit/delete functionality
  customerId?: string;
  customerName?: string;
}

/**
 * Loan interface with comprehensive loan information
 * Business Rules:
 * - Daily: Fixed EMI only
 * - Weekly/Monthly: Fixed or Custom EMI types
 * - EMI Collection: Single or Advance types
 */
export interface Loan {
  _id: string;
  customerId: string;
  customerName: string;
  customerNumber: string;
  loanNumber: string;
  amount: number;
  emiAmount: number;
  loanType: string;
  dateApplied: string;
  emiStartDate?: string;
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
  
  // EMI Type properties
  emiType?: 'fixed' | 'custom';
  customEmiAmount?: number;
  
  // Renewal tracking properties
  isRenewed?: boolean;
  renewedLoanNumber?: string; // The new loan number that replaced this one
  renewedDate?: string; // When this loan was renewed
  originalLoanNumber?: string; // For renewed loans, track the original loan
}

// =============================================
// FORM DATA TYPES
// =============================================

/**
 * New Customer Step 1 - Basic Information
 */
export interface NewCustomerStep1 {
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
  // Index signature for TypeScript error handling
  [key: string]: any;
}

/**
 * New Customer Step 2 - Loan Information
 */
export interface NewCustomerStep2 {
  loanDate: string;
  amount: string;
  emiStartDate: string;
  loanNumber: string;
  loanOption?: 'single' | 'multiple';
  loanAmount: string;
  emiAmount: string;
  loanDays: string;
  loanType: string;
  emiType: 'fixed' | 'custom';
  customEmiAmount?: string;
  // Index signature for TypeScript error handling
  [key: string]: any;
}

/**
 * New Customer Step 3 - Login Credentials
 */
export interface NewCustomerStep3 {
  loginId: string;
  password: string;
  confirmPassword: string;
  // Index signature for TypeScript error handling
  [key: string]: any;
}

// =============================================
// UPDATE & EDIT TYPES
// =============================================

/**
 * EMI Update data structure
 */
export interface EMIUpdate {
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
  
  // Advance EMI fields
  paymentType: 'single' | 'advance';
  advanceFromDate?: string;
  advanceToDate?: string;
  advanceEmiCount?: string;
  advanceTotalAmount?: string;
}

/**
 * Edit Customer data structure
 */
export interface EditCustomerData {
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

/**
 * Edit Loan data structure
 */
export interface EditLoanData {
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
    emiType?: 'fixed' | 'custom';
    customEmiAmount?: number | null;
    emiStartDate?: string;
  };
  
  // Additional properties
  emiType?: 'fixed' | 'custom';
  customEmiAmount?: string;
  emiStartDate?: string;
}

/**
 * Renew Loan data structure
 */
export interface RenewLoanData {
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
  
  // Additional fields to match Add Loan structure
  emiStartDate: string;
  emiType: 'fixed' | 'custom';
  customEmiAmount?: string;
}

// =============================================
// FILTER & REQUEST TYPES
// =============================================

/**
 * Filter interface for customer/loan filtering
 */
export interface Filters {
  customerNumber: string;
  loanType: string;
  status: string;
  officeCategory: string;
}

/**
 * Request interface for pending requests
 */
export interface Request {
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

// =============================================
// DASHBOARD & STATISTICS TYPES
// =============================================

/**
 * Today's statistics for dashboard
 */
export interface TodayStats {
  emiCollected: number;
  newCustomers: number;
  pendingRequests: number;
  totalCollection: number;
}

// =============================================
// CALENDAR RELATED TYPES
// =============================================

/**
 * Calendar day interface for EMI calendar
 */
export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  emiStatus?: 'paid' | 'due' | 'overdue' | 'partial' | 'upcoming' | 'none';
  emiAmount?: number;
  loanNumbers?: string[];
  paymentHistory?: EMIHistory[];
}

/**
 * EMI Calendar data structure
 */
export interface EMICalendarData {
  customerId: string;
  customerName: string;
  loans: Loan[];
  paymentHistory: EMIHistory[];
}

// =============================================
// COLLECTION RELATED TYPES
// =============================================

/**
 * Collection data for daily collection reports
 */
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

// =============================================
// COLLECTION PAYMENT TYPES (NEW - REQUIRED FOR OPTIMIZATIONS)
// =============================================

/**
 * Collection payment interface for individual collection records
 */
export interface Collection {
  _id: string;
  customerId: string;
  customerName: string;
  customerNumber: string;
  amount: number;
  date: string;
  paymentMode: string;
  collectedBy: string;
  status: 'pending' | 'completed' | 'failed';
  remarks?: string;
  loanId?: string;
  loanNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Payment interface for payment tracking
 */
export interface Payment {
  _id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  paymentType: 'emi' | 'partial' | 'full';
  status: 'completed' | 'pending' | 'failed';
  collectedBy: string;
  notes?: string;
  loanId?: string;
  loanNumber?: string;
  customerNumber?: string;
}

// =============================================
// CUSTOM HOOK RETURN TYPES (NEW - REQUIRED FOR OPTIMIZATIONS)
// =============================================

/**
 * Hook return type for useCustomers
 */
export interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
  statistics?: {
    total: number;
    active: number;
    overdue: number;
  };
}

/**
 * Hook return type for useEMI
 */
export interface UseEMIReturn {
  emiCustomers: Customer[];
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
  statistics: {
    totalDue: number;
    overdueCount: number;
    totalCustomers: number;
    filteredCount: number;
  };
}

/**
 * Hook return type for useCollection
 */
export interface UseCollectionReturn {
  collections: Collection[];
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
  statistics: {
    totalCollected: number;
    todayCollection: number;
    collectionCount: number;
  };
}

/**
 * Hook return type for useRequests
 */
export interface UseRequestsReturn {
  requests: Request[];
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
  statistics?: {
    pending: number;
    completed: number;
    total: number;
  };
}

// =============================================
// OPERATOR & USER TYPES (NEW - REQUIRED FOR OPTIMIZATIONS)
// =============================================

/**
 * Operator/User interface for current user data
 */
export interface Operator {
  id: string;
  name: string;
  fullName: string;
  role?: string;
  officeCategory?: string;
  permissions?: string[];
}

/**
 * Current user context type
 */
export interface CurrentUser {
  id: string;
  username: string;
  name: string;
  role: string;
  officeCategory: string;
  token?: string;
  permissions?: string[];
}

// =============================================
// MODAL PROPS TYPES (NEW - REQUIRED FOR OPTIMIZATIONS)
// =============================================

/**
 * Common modal props interface
 */
export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Add Customer Modal props
 */
export interface AddCustomerModalProps extends BaseModalProps {
  currentUserOffice: string;
  existingCustomers: Customer[];
}

/**
 * Edit Customer Modal props
 */
export interface EditCustomerModalProps extends BaseModalProps {
  customerData: EditCustomerData;
  currentUserOffice: string;
}

/**
 * Add Loan Modal props
 */
export interface AddLoanModalProps extends BaseModalProps {
  customerDetails: CustomerDetails;
}

/**
 * Edit Loan Modal props
 */
export interface EditLoanModalProps extends BaseModalProps {
  loanData: EditLoanData;
}

/**
 * Renew Loan Modal props
 */
export interface RenewLoanModalProps extends BaseModalProps {
  loanData: RenewLoanData;
}

/**
 * EMI Update Modal props
 */
export interface EMIUpdateModalProps extends BaseModalProps {
  selectedCustomer: Customer | null;
  selectedLoan: Loan | null;
  currentOperator: Operator;
  customers: Customer[];
}

/**
 * EMI Calendar Modal props
 */
export interface EMICalendarModalProps extends BaseModalProps {
  customer: Customer;
  currentUserOffice: string;
}

/**
 * Customer Details Modal props
 */
export interface CustomerDetailsModalProps extends BaseModalProps {
  customer: Customer | CustomerDetails;
  onEditCustomer: (customer: CustomerDetails) => void;
  onEditLoan: (loan: Loan) => void;
  onRenewLoan: (loan: Loan) => void;
  onDeleteLoan: (loan: Loan) => void;
  onViewEMICalendar: (customer: Customer) => void;
  onAddLoan: () => void;
  currentUserOffice: string;
}

// =============================================
// SECTION COMPONENTS PROPS TYPES (NEW - REQUIRED FOR OPTIMIZATIONS)
// =============================================

/**
 * Customers Section props
 */
export interface CustomersSectionProps {
  currentUserOffice: string;
  onViewCustomerDetails: (customer: Customer | CustomerDetails) => void;
  onUpdateEMI: (customer: Customer, loan?: Loan) => void;
  onEditCustomer: (customer: CustomerDetails) => void;
  onAddLoan: (customer: CustomerDetails) => void;
  refreshKey: number;
  onAddNewCustomer?: () => void; // Add this optional prop
}

/**
 * EMI Section props
 */
export interface EMISectionProps {
  currentUserOffice: string;
  currentOperator: Operator;
  onShowUpdateEMI: (customer: Customer, loan?: Loan) => void;
  onShowEMICalendar: (customer: Customer) => void;
  refreshKey: number;
}

/**
 * Collection Section props
 */
export interface CollectionSectionProps {
  refreshKey?: number;
  currentUserOffice?: string;
  currentOperator?: {
    id: string;
    name: string;
    fullName: string;
  };
  onShowUpdateEMI?: () => void;
  // Add other props if needed
}

/**
 * Requests Section props
 */
export interface RequestsSectionProps {
  refreshKey: number;
}

/**
 * Dashboard Section props
 */
export interface DashboardSectionProps {
  currentUserOffice: string;
  onNavigateToTab: (tab: string) => void;
  onShowAddCustomer: () => void;
  onShowUpdateEMI: () => void;
}

// =============================================
// PERFORMANCE OPTIMIZATION TYPES (NEW)
// =============================================

/**
 * Virtual scroll configuration
 */
export interface VirtualScrollConfig {
  containerHeight: number;
  itemHeight: number;
  overscan: number;
}

/**
 * Debounced search configuration
 */
export interface DebouncedSearchConfig {
  delay: number;
  minLength: number;
}

/**
 * Cache configuration for API responses
 */
export interface CacheConfig {
  duration: number; // milliseconds
  key: string;
}

// =============================================
// API RESPONSE TYPES (NEW - HELPFUL FOR TYPE SAFETY)
// =============================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaymentData {
  _id: string;
  customerId: string;
  customerNumber: string;
  customerName: string;
  loanId: string;
  loanNumber: string;
  emiAmount: number;
  paidAmount: number;
  paymentDate: string;
  paymentMethod?: string;
  officeCategory: string;
  operatorName: string;
  status?: string;
}

/**
 * Collection statistics for collection section
 */
export interface CollectionStats {
  todaysCollection: number;
  numberOfCustomersPaid: number;
  totalCollections: number;
}

/**
 * Collection API response type
 */
export interface CollectionApiResponse {
  success: boolean;
  data?: {
    date: string;
    payments?: PaymentData[];
    customers?: Array<{
      customerId: string;
      customerNumber: string;
      customerName: string;
      totalCollection: number;
      officeCategory: string;
      loans?: Array<{
        loanNumber: string;
        emiAmount: number;
        collectedAmount: number;
      }>;
    }>;
    statistics?: {
      todaysCollection: number;
      numberOfCustomersPaid: number;
      totalCollections: number;
    };
    summary?: {
      totalCollection: number;
      office1Collection: number;
      office2Collection: number;
      totalCustomers: number;
      totalTransactions?: number;
      numberOfCustomersPaid?: number;
    };
  };
  error?: string;
  message?: string;
}