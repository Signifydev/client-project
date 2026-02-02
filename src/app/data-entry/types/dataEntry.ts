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
  whatsappNumber?: string;
  lastPaymentDate?: string;
  dueAmount?: number;
  // Add this optional property
  loans?: Loan[];
  totalLoans?: number;
  totalLoanAmount?: number;
  activeLoan?: Loan;
  totalPaid?: number;
  createdBy?: string;
  priority?: string;
  formattedDate?: string;
  submittedBy?: string;
  officeCategory?: string;
  // ✅ NEW: Team Member Assignment
  teamMemberNumber?: string;
  isAssignedToTeam?: boolean;
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
  // ✅ NEW: Team Member Assignment
  teamMemberNumber?: string;
  isAssignedToTeam?: boolean;
}

// ✅ NEW: Team Member Interface for Data Entry
export interface TeamMember {
  _id: string;
  name: string;
  phone: string;
  whatsappNumber?: string;
  address?: string;
  loginId: string;
  role: 'Recovery Team' | 'Data Entry Operator';
  operatorNumber?: string; // For Data Entry Operators
  teamMemberNumber?: string; // For Recovery Team (TM1-TM15)
  officeCategory?: string;
  status: 'active' | 'inactive';
  joinDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ✅ NEW: Customer Assignment Interface
export interface CustomerAssignment {
  customerId: string;
  customerNumber: string;
  customerName: string;
  teamMemberNumber?: string;
  assignedAt?: string;
  assignedBy?: string;
}

// ✅ NEW: Team Management Stats
export interface TeamManagementStats {
  totalTeamMembers: number;
  activeTeamMembers: number;
  totalAssignedCustomers: number;
  unassignedCustomers: number;
  assignmentByTeamMember: Array<{
    teamMemberNumber: string;
    teamMemberName: string;
    customerCount: number;
    totalLoanAmount: number;
  }>;
}

export interface CustomerNumberSuggestion {
  number: string;
  reason: string;
  isAvailable: boolean;
}

/**
 * Cloudinary upload response
 */
export interface CloudinaryUploadResponse {
  success: boolean;
  url: string;           // Cloudinary secure URL
  publicId: string;      // Cloudinary public ID for deletion
  format: string;        // File format (jpg, pdf, etc.)
  size: number;          // File size in bytes
  originalFilename: string;
  uploadedAt: string;
}

// =============================================
// EMI SCHEDULE DETAILS TYPES - NEW FOR CALENDAR FIX
// =============================================

/**
 * EMI Schedule Item for detailed installment tracking
 */
export interface EMIScheduleItem {
  installmentNumber: number;
  dueDate: string;           // YYYY-MM-DD format
  amount: number;
  isCustom: boolean;
  formattedDate: string;     // DD/MM/YYYY for display
}

/**
 * EMI Schedule Details for custom EMI loans
 */
export interface EMIScheduleDetails {
  emiType: 'fixed' | 'custom';
  customEmiAmount?: number | null;
  totalInstallments: number;
  customInstallmentNumber?: number | null; // Which installment has custom amount
  standardAmount: number;
  customAmount?: number | null;
  schedule: EMIScheduleItem[];
}

// =============================================
// LOAN RELATED TYPES - UPDATED WITH SCHEDULE DETAILS
// =============================================

/**
 * EMI History record for loan payments - UPDATED WITH PARTIAL PAYMENT SUPPORT
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
  
  // ✅ NEW: Partial payment properties for accurate tracking
  originalEmiAmount?: number;      // Full EMI amount for partial payments
  installmentTotalAmount?: number; // Total installment amount
  installmentPaidAmount?: number;  // Amount paid so far in installment
  partialChainId?: string;         // Chain ID for partial payments
  isChainComplete?: boolean;       // Whether partial chain is complete
  
  // ✅ NEW: Fields for correct EMI amount display
  emiAmount?: number;              // The actual EMI amount for this payment
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
  lastEmiDate?: string;
  nextEmiDate: string;
  totalPaidAmount: number;
  remainingAmount: number;
  emiHistory: EMIHistory[];
  isFallback?: boolean;
  
  // EMI Type properties
  emiType?: 'fixed' | 'custom';
  customEmiAmount?: number;
  
  // EMI SCHEDULE DETAILS - ADDED FOR CALENDAR FIX
  emiScheduleDetails?: EMIScheduleDetails;
  
  // Renewal tracking properties
  isRenewed?: boolean;
  renewedLoanNumber?: string;
  renewedDate?: string;
  originalLoanNumber?: string;
  
  // ADD THESE LINES for backward compatibility
  loanAmount?: number; // For backward compatibility
  lastPaymentDate?: string; // For backward compatibility
  
  // ✅ NEW: Fields for proper payment tracking
  lastPaymentStatus?: 'Paid' | 'Partial' | 'Advance'; // Status of last payment
  lastPaymentAmount?: number; // Amount of last payment
  
  // ✅ FIXED: Add missing isCompleted field
  isCompleted?: boolean;
  
  // ✅ FIXED: Add loanStatus field (if different from status)
  loanStatus?: string;
  
  // Add other fields from your database
  interestRate?: number;
  startDate?: string;
  endDate?: string;
  emiPaid?: number;
  totalPaid?: number;
  tenure?: number;
  tenureType?: string;
  dailyEMI?: number;
  totalEMI?: number;
  emiPending?: number;
  updatedAt?: string;
  __v?: number;
  
  // Display fields
  dateAppliedDisplay?: string;
  emiStartDateDisplay?: string;
  lastEmiDateDisplay?: string;
  nextEmiDateDisplay?: string;
  createdAtDisplay?: string;
  updatedAtDisplay?: string;
  dateAppliedInput?: string;
  emiStartDateInput?: string;
  lastEmiDateInput?: string;
  nextEmiDateInput?: string;
}

// =============================================
// EMI PAYMENT TYPES - UPDATED WITH PARTIAL PAYMENT CHAIN TRACKING
// =============================================

/**
 * EMI Payment interface with partial payment chain tracking
 */
export interface EMIPayment {
  _id: string;
  loanId: string;
  loanNumber: string;
  amount: number;
  paidAmount?: number; // For frontend display compatibility
  paymentDate: string;
  dueDate?: string;
  status: 'Paid' | 'Partial' | 'Pending' | 'Overdue';
  collectedBy: string;
  notes?: string;
  
  // New fields for partial payment chain tracking
  partialChainId?: string | null;
  chainParentId?: string | null;
  chainChildrenIds?: string[];
  installmentTotalAmount?: number;
  installmentPaidAmount?: number;
  isChainComplete?: boolean;
  chainSequence?: number;
  
  // ✅ NEW: Critical field for partial payment fixes
  originalEmiAmount?: number; // The full EMI amount for this payment
  
  // Existing fields
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  
  // For frontend display
  customerId?: string;
  customerName?: string;
  customerNumber?: string;
  paymentMethod?: string;
  
  // ✅ NEW: Loan information for context
  loanType?: string;
  emiType?: 'fixed' | 'custom';
  emiAmount?: number;
  customEmiAmount?: number;
}

/**
 * EMI Payment Chain Information
 */
export interface EMIPaymentChainInfo {
  chainId: string;
  payments: EMIPayment[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  isComplete: boolean;
  
  // ✅ NEW: Critical fields for partial payment fixes
  originalEmiAmount?: number;      // Full EMI amount for this chain
  installmentTotalAmount?: number; // Total installment amount
  loanId?: string;                 // Loan ID for filtering
  loanNumber?: string;             // Loan number for display
}

/**
 * Complete Partial Payment Request
 */
export interface CompletePartialPaymentRequest {
  parentPaymentId: string;
  additionalAmount: number;
  paymentDate: string;
  collectedBy: string;
  notes?: string;
  loanId?: string; // ✅ NEW: Added for better chain tracking
}

/**
 * Complete Partial Payment Response
 */
export interface CompletePartialPaymentResponse {
  success: boolean;
  data: {
    parentPayment: EMIPayment;
    newPayment: EMIPayment;
    chainId: string;
    totalPaid: number;
    remainingAmount: number; // ✅ NEW: Added for clarity
  };
}

/**
 * Edit Payment Request
 */
export interface EditPaymentRequest {
  amount: number;
  status: 'Paid' | 'Partial' | 'Pending' | 'Overdue';
  updateChain?: boolean; // Whether to update chain totals
  collectedBy?: string;
  notes?: string;
  paymentDate?: string;
  originalEmiAmount?: number; // ✅ NEW: Added for partial payment fixes
}

/**
 * Edit Payment Response
 */
export interface EditPaymentResponse {
  success: boolean;
  data: {
    updatedPayment: EMIPayment;
    updatedChain: boolean;
    chainTotals?: {
      totalAmount: number;
      paidAmount: number;
      remaining: number;
      originalEmiAmount?: number; // ✅ NEW: Added
    };
  };
}

/**
 * Chain Info Response
 */
export interface ChainInfoResponse {
  success: boolean;
  data: EMIPaymentChainInfo;
}

/**
 * Partial Payment Information for UI
 */
export interface PartialPaymentInfo {
  alreadyPaid: number;
  remainingAmount: number;
  installmentTotal: number;
  originalEmiAmount: number; // ✅ NEW: Added for accuracy
  canComplete: boolean;
  chainId?: string;
  loanId?: string;
}

/**
 * Edit EMI Option for Modal
 */
export interface EditEMIOption {
  id: 'editAmount' | 'completePartial';
  label: string;
  description: string;
  disabled?: boolean;
}

/**
 * EMI Transaction Modal State
 */
export interface EMITransactionModalState {
  selectedOption: 'editAmount' | 'completePartial';
  amount: number;
  status: 'Paid' | 'Partial' | 'Pending' | 'Overdue';
  additionalAmount: number;
  partialPaymentInfo: PartialPaymentInfo | null;
  isLoading: boolean;
  errors: {
    amount?: string;
    additionalAmount?: string;
    general?: string;
  };
}

/**
 * Chain Calculation Result
 */
export interface ChainCalculationResult {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  originalEmiAmount: number; // ✅ NEW: Added
  isComplete: boolean;
  paymentsCount: number;
  chainId?: string;
}

/**
 * Chain Payment for display
 */
export interface ChainPayment {
  id: string;
  amount: number;
  paymentDate: string;
  status: string;
  collectedBy: string;
  sequence: number;
  originalEmiAmount?: number; // ✅ NEW: Added
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
  uploadedFiles?: {  // NEW: Stores Cloudinary URLs after upload
    profilePicture?: string;
    shopDocument?: string;
    homeDocument?: string;
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
 * EMI Update data structure - UPDATED WITH PARTIAL PAYMENT SUPPORT
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
  
  // ✅ NEW: Critical field for partial payment fixes
  originalEmiAmount?: number | string; // The full EMI amount for this payment
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

// Update the EditLoanData interface in types/dataEntry.ts
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
    loanNumber: string; // ← ADD THIS LINE
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
// TEAM MANAGEMENT TYPES (NEW)
// =============================================

/**
 * Team Member Assignment Request
 */
export interface TeamMemberAssignmentRequest {
  customerIds: string[];
  teamMemberNumber: string;
  assignedBy: string;
  assignedByOffice: string;
  notes?: string;
}

/**
 * Team Member Assignment Response
 */
export interface TeamMemberAssignmentResponse {
  success: boolean;
  data: {
    assignedCount: number;
    failedCount: number;
    totalCustomers: number;
    teamMemberNumber: string;
    assignedCustomers: Array<{
      customerId: string;
      customerNumber: string;
      customerName: string;
      success: boolean;
      message?: string;
    }>;
  };
}

/**
 * Team Member Removal Request
 */
export interface TeamMemberRemovalRequest {
  customerIds: string[];
  removedBy: string;
  notes?: string;
}

/**
 * Team Member Removal Response
 */
export interface TeamMemberRemovalResponse {
  success: boolean;
  data: {
    removedCount: number;
    failedCount: number;
    totalCustomers: number;
    removedCustomers: Array<{
      customerId: string;
      customerNumber: string;
      customerName: string;
      success: boolean;
      message?: string;
    }>;
  };
}

/**
 * Bulk Assignment Preview
 */
export interface BulkAssignmentPreview {
  customers: Customer[];
  teamMemberNumber: string;
  teamMemberName?: string;
  totalCustomers: number;
  totalLoanAmount: number;
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
  partialPaymentsCount?: number; // ✅ NEW: Added for partial payment tracking
  partialPaymentsAmount?: number; // ✅ NEW: Added for partial payment tracking
}

// =============================================
// CALENDAR RELATED TYPES - UPDATED FOR EMI CALENDAR FIX
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
  // Added for custom EMI identification
  isCustomInstallment?: boolean;
  installmentNumber?: number;
  // ✅ NEW: For partial payment tracking
  partialPaymentAmount?: number;
  fullEmiAmount?: number;
  remainingAmount?: number;
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
      isPartial?: boolean; // ✅ NEW: Added for partial payment tracking
      remainingAmount?: number; // ✅ NEW: Added for partial payment tracking
    }>;
  }>;
  summary: {
    totalCollection: number;
    office1Collection: number;
    office2Collection: number;
    totalCustomers: number;
    partialPaymentsCount?: number; // ✅ NEW: Added
    partialPaymentsAmount?: number; // ✅ NEW: Added
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
  // ✅ NEW: For partial payment tracking
  isPartial?: boolean;
  originalEmiAmount?: number;
  remainingAmount?: number;
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
  // ✅ NEW: For partial payment tracking
  originalEmiAmount?: number;
  isChainComplete?: boolean;
  partialChainId?: string;
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
    partialPayments?: number; // ✅ NEW: Added
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
    partialPaymentsCount?: number; // ✅ NEW: Added
    partialPaymentsAmount?: number; // ✅ NEW: Added
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
    partialPayments?: { // ✅ NEW: Added
      count: number;
      amount: number;
    };
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
 * EMI Transactions Modal Props
 */
export interface EMITransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: EMIPayment | null;
  onSave: (updatedPayment: EMIPayment) => void;
  onCompletePartial?: (data: CompletePartialPaymentRequest) => Promise<void>;
}

/**
 * Add Customer Modal props
 */
export interface AddCustomerModalProps extends BaseModalProps {
  currentUserOffice: string;
  existingCustomers: Customer[];
  currentOperator?: {      // ADD THIS - Operator info for tracking
    id: string;
    name: string;
  };
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

// ✅ NEW: Team Management Modal Props
export interface TeamManagementModalProps extends BaseModalProps {
  teamMember: TeamMember;
  customers: Customer[];
  currentUserOffice: string;
  currentOperator: Operator;
  onAssignCustomers: (customerIds: string[], teamMemberNumber: string) => Promise<void>;
  onRemoveAssignment: (customerIds: string[]) => Promise<void>;
}

// ✅ NEW: Customer Assignment Modal Props
export interface CustomerAssignmentModalProps extends BaseModalProps {
  teamMemberNumber: string;
  teamMemberName?: string;
  customers: Customer[];
  assignedCustomers: Customer[];
  onAssign: (customerIds: string[]) => Promise<void>;
  onRemove: (customerIds: string[]) => Promise<void>;
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
  currentUserOffice?: string;
  currentOperatorId?: string;
  currentOperatorName?: string;
  onRefresh?: () => void;
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

// ✅ NEW: Team Management Section Props
export interface TeamManagementSectionProps {
  currentUserOffice: string;
  currentOperator: Operator;
  refreshKey: number;
  onViewTeamMemberDetails?: (teamMember: TeamMember) => void;
  onManageTeamMember?: (teamMember: TeamMember) => void;
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
  // ✅ NEW: Added for partial payment tracking
  originalEmiAmount?: number;
  isPartial?: boolean;
  remainingAmount?: number;
}

/**
 * Collection statistics for collection section
 */
export interface CollectionStats {
  todaysCollection: number;
  numberOfCustomersPaid: number;
  totalCollections: number;
  partialPayments?: { // ✅ NEW: Added
    count: number;
    amount: number;
  };
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
        isPartial?: boolean; // ✅ NEW: Added
        remainingAmount?: number; // ✅ NEW: Added
      }>;
    }>;
    statistics?: {
      todaysCollection: number;
      numberOfCustomersPaid: number;
      totalCollections: number;
      partialPayments?: { // ✅ NEW: Added
        count: number;
        amount: number;
      };
    };
    summary?: {
      totalCollection: number;
      office1Collection: number;
      office2Collection: number;
      totalCustomers: number;
      totalTransactions?: number;
      numberOfCustomersPaid?: number;
      partialPaymentsCount?: number; // ✅ NEW: Added
      partialPaymentsAmount?: number; // ✅ NEW: Added
    };
  };
  error?: string;
  message?: string;
}

// ✅ NEW: Team Management API Response Types
export interface TeamMembersResponse {
  success: boolean;
  data?: TeamMember[];
  error?: string;
  message?: string;
}

export interface CustomerAssignmentResponse {
  success: boolean;
  data?: {
    assignedCount: number;
    failedCount: number;
    totalCustomers: number;
    teamMemberNumber: string;
    assignedCustomers: Array<{
      customerId: string;
      customerNumber: string;
      customerName: string;
      success: boolean;
      message?: string;
    }>;
  };
  error?: string;
  message?: string;
}

export interface TeamManagementStatsResponse {
  success: boolean;
  data?: TeamManagementStats;
  error?: string;
  message?: string;
}

// =============================================
// UTILITY TYPES FOR EMI PAYMENT CHAIN TRACKING
// =============================================

/**
 * Utility types for the modal
 */
export type EditMode = 'edit' | 'complete' | 'view';

/**
 * Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Loan EMI Details with chain tracking
 */
export interface LoanEMIDetails {
  loanId: string;
  emiAmount: number;
  dueDate: string;
  paidAmount: number;
  pendingAmount: number;
  nextDueDate?: string;
  paymentHistory: EMIPayment[];
  activeChainId?: string;
  // ✅ NEW: Added for partial payment fixes
  originalEmiAmount?: number;
  isPartialPending?: boolean;
}

/**
 * Payment Chain Response
 */
export interface PaymentChainResponse {
  chainId: string;
  payments: EMIPayment[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  isComplete: boolean;
  // ✅ NEW: Critical fields for partial payment fixes
  originalEmiAmount?: number;
  loanId?: string;
  loanNumber?: string;
}

/**
 * Update EMIPayment Request for PUT endpoint
 */
export interface UpdateEMIPaymentRequest {
  amount: number;
  status: 'Paid' | 'Partial' | 'Pending' | 'Overdue';
  updateChain?: boolean;
  collectedBy?: string;
  notes?: string;
  paymentDate?: string;
  originalEmiAmount?: number; // ✅ NEW: Added for partial payment fixes
}

/**
 * Complete Partial Payment Body for POST endpoint
 */
export interface CompletePartialPaymentBody {
  parentPaymentId: string;
  additionalAmount: number;
  paymentDate: string;
  collectedBy: string;
  notes?: string;
  loanId?: string; // ✅ NEW: Added for better chain tracking
  originalEmiAmount?: number; // ✅ NEW: Added for consistency
}

// =============================================
// EMI TRANSACTION TYPES FOR MODAL (NEW)
// =============================================

/**
 * EMI Transaction for modal display
 */
export interface EMITransaction {
  _id: string;
  paymentDate: string;
  amount: number;
  loanNumber: string;
  collectedBy: string;
  status: string;
  paymentMethod?: string;
  notes?: string;
  // ✅ NEW: Added for partial payment fixes
  originalEmiAmount?: number;
  partialChainId?: string;
  installmentTotalAmount?: number;
  installmentPaidAmount?: number;
  isChainComplete?: boolean;
  loanId?: string;
}

// =============================================
// PARTIAL PAYMENT STATUS TYPES (NEW)
// =============================================

/**
 * Partial payment status information
 */
export interface PartialPaymentStatus {
  wasPartial: boolean;
  lastPayment: EMIHistory | null;
  remainingAmount: number;
  lastPaymentDate?: string;
  nextEmiDate?: string;
  isPaymentDue: boolean;
}