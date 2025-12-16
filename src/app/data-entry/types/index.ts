// User types for different roles
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'super_admin' | 'data_entry' | 'collection_team' | 'customer';
  isActive: boolean;
  createdAt: Date;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  businessName: string;
  businessType: string;
  area: string;
  createdAt: Date;
  isActive: boolean;
}

export interface Loan {
  id: string;
  customerId: string;
  loanAmount: number;
  interestRate: number;
  tenure: number; // in days
  tenureType: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  status: 'active' | 'completed' | 'overdue';
  dailyEMI: number;
  totalEMI: number;
  emiPaid: number;
  emiPending: number;
  totalPaid: number;
  totalPending: number;
}

export interface EMI {
  id: string;
  loanId: string;
  customerId: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: 'pending' | 'paid' | 'overdue';
  collectorId?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface CollectionTeam {
  id: string;
  userId: string;
  area: string;
  group: string;
  isActive: boolean;
  lastLocation?: {
    lat: number;
    lng: number;
    timestamp: Date;
  };
}

export interface LocationHistory {
  id: string;
  teamMemberId: string;
  lat: number;
  lng: number;
  timestamp: Date;
}

// For API responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}