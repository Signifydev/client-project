export interface DashboardStats {
  totalLoans: number;
  totalAmount: number;
  totalCustomers: number;
  totalTeamMembers: number;
  pendingRequests: number;
}

export interface Customer {
  _id: string;
  customerNumber: string;
  name: string;
  phone: string;
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
    shop?: string;
    home?: string;
  };
  additionalLoans?: any[];
  profilePicture?: string;
  businessType?: string;
  guarantorName?: string;
  guarantorPhone?: string;
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