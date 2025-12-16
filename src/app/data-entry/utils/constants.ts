// Date and time constants
export const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Loan type constants
export const loanTypes = ['Daily', 'Weekly', 'Monthly'] as const;

export const emiTypes = ['fixed', 'custom'] as const;

export const paymentTypes = ['single', 'advance'] as const;

// Status constants
export const customerStatusOptions = ['active', 'inactive', 'pending'] as const;

export const loanStatusOptions = ['active', 'renewed', 'completed', 'pending'] as const;

export const paymentStatusOptions = ['Paid', 'Partial', 'Due', 'Advance'] as const;

export const emiCalendarStatusOptions = ['paid', 'due', 'overdue', 'partial', 'upcoming', 'none'] as const;

// Category constants
export const customerCategories = ['A', 'B', 'C'] as const;

export const officeCategories = ['Office 1', 'Office 2'] as const;

// Request type constants
export const requestTypes = [
  'all',
  'New Customer',
  'New Loan', 
  'Customer Edit',
  'Loan Edit',
  'Loan Renew',
  'Loan Addition',
  'Loan Deletion',
  'EMI Correction'
] as const;

// Default values
export const defaultLoanValues = {
  loanType: 'Daily' as const,
  emiType: 'fixed' as const,
  loanDays: '30',
  loanDate: new Date().toISOString().split('T')[0],
  emiStartDate: new Date().toISOString().split('T')[0]
};

export const defaultCustomerValues = {
  category: 'A' as const,
  officeCategory: 'Office 1' as const,
  customerNumber: 'CN001'
};

// Status color mappings
export const getStatusColor = (status: string): string => {
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

export const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'paid': return '✅';
    case 'due': return '📅';
    case 'overdue': return '⚠️';
    case 'partial': return '💰';
    case 'upcoming': return '🔔';
    default: return '';
  }
};