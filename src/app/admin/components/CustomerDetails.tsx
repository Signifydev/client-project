'use client';

import { useState, useEffect, useCallback } from 'react';
import { Customer } from '../types';

interface CustomerDetailsProps {
  customer: Customer;
  onBack: () => void;
  onDelete: (customerId: string) => void;
}

interface LoanPaymentSummary {
  loanNumber: string;
  loanId: string;
  totalPaid: number;
  paymentCount: number;
  lastPaymentDate?: string;
  emiAmount?: number;
  loanAmount?: number;
  loanType?: string;
}

// Extended Customer interface with our enhanced properties
interface ExtendedCustomer extends Omit<Customer, 'emiPayments'> {
  loans?: any[];
  phoneArray?: string[];
  // Use the imported EMIPayment type from Customer type
  emiPayments?: Customer['emiPayments'];
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
}

export default function CustomerDetails({ customer, onBack, onDelete }: CustomerDetailsProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedLoanFilter, setSelectedLoanFilter] = useState<string>('all');
  const [emiPayments, setEmiPayments] = useState<Customer['emiPayments']>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loanPaymentSummaries, setLoanPaymentSummaries] = useState<LoanPaymentSummary[]>([]);
  const [detailedCustomer, setDetailedCustomer] = useState<ExtendedCustomer | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch detailed customer data with loans
  const fetchDetailedCustomer = useCallback(async () => {
    if (!customer._id) return;
    
    setLoadingDetails(true);
    try {
      console.log('🔍 Fetching detailed customer data for:', customer._id);
      
      // Use the admin customers API with customerId parameter
      const response = await fetch(`/api/admin/customers?customerId=${customer._id}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('✅ Detailed customer data loaded:', {
          name: data.data.name,
          loanCount: data.data.loans?.length || 0,
          hasPrimaryLoan: !!data.data.loanNumber,
          additionalLoans: data.data.additionalLoans?.length || 0
        });
        
        setDetailedCustomer(data.data as ExtendedCustomer);
        
        // Set EMI payments if available
        if (data.data.emiPayments) {
          setEmiPayments(data.data.emiPayments);
          calculateLoanPaymentSummaries(data.data.emiPayments, data.data.loans || []);
        }
      } else {
        console.error('❌ Failed to load detailed customer data:', data.error);
        // Fallback to original customer data
        setDetailedCustomer(customer as ExtendedCustomer);
      }
    } catch (error) {
      console.error('❌ Error fetching detailed customer:', error);
      setDetailedCustomer(customer as ExtendedCustomer);
    } finally {
      setLoadingDetails(false);
    }
  }, [customer._id]);

  // Fetch EMI payments (fallback if not in customer data)
  const fetchEmiPayments = useCallback(async () => {
    if (!customer._id) return;
    
    setLoadingPayments(true);
    try {
      const response = await fetch(`/api/data-entry/emi-payments?customerId=${customer._id}&limit=500`);
      const data = await response.json();
      
      if (data.success && data.data.payments) {
        const payments = data.data.payments;
        setEmiPayments(payments);
        
        // Calculate loan-wise payment summaries
        calculateLoanPaymentSummaries(payments, getCustomerLoans());
      }
    } catch (error) {
      console.error('Error fetching EMI payments:', error);
    } finally {
      setLoadingPayments(false);
    }
  }, [customer._id]);

  // Calculate loan payment summaries
  const calculateLoanPaymentSummaries = (payments: Customer['emiPayments'] | undefined, loans: any[]) => {
    const loanMap = new Map<string, LoanPaymentSummary>();
    
    // ✅ FIXED: Check if payments exists before iterating
    if (payments && Array.isArray(payments)) {
      payments.forEach((payment: any) => {
        if (!payment) return;
        
        const loanKey = payment.loanId || 'unknown';
        const loanNumber = payment.loanNumber || 'Unknown Loan';
        
        if (!loanMap.has(loanKey)) {
          loanMap.set(loanKey, {
            loanNumber,
            loanId: loanKey,
            totalPaid: 0,
            paymentCount: 0
          });
        }
        
        const summary = loanMap.get(loanKey)!;
        summary.totalPaid += payment.amount || 0;
        summary.paymentCount++;
        
        if (!summary.lastPaymentDate || (payment.paymentDate && new Date(payment.paymentDate) > new Date(summary.lastPaymentDate))) {
          summary.lastPaymentDate = payment.paymentDate;
        }
      });
    }
    
    // Get loan details from customer data
    loans.forEach(loan => {
      const summary = loanMap.get(loan.loanId || '');
      if (summary) {
        summary.emiAmount = loan.emiAmount;
        summary.loanAmount = loan.loanAmount;
        summary.loanType = loan.loanType;
      }
    });
    
    setLoanPaymentSummaries(Array.from(loanMap.values()));
  };

  useEffect(() => {
    fetchDetailedCustomer();
  }, [fetchDetailedCustomer]);

  useEffect(() => {
    if (activeTab === 'transaction-history' && (!emiPayments || emiPayments.length === 0)) {
      fetchEmiPayments();
    }
  }, [activeTab, emiPayments, fetchEmiPayments]);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(customer._id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Helper function to get document URL safely
  const getDocumentUrl = (document: any): string => {
    if (!document) return '';
    if (typeof document === 'string') return document;
    if (typeof document === 'object' && document.url) return document.url;
    return '';
  };

  const handleDownload = (document: any, documentType: string) => {
    const url = getDocumentUrl(document);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${customer.name}_${documentType}.pdf`;
      link.click();
    } else {
      alert('Document not available');
    }
  };

  const handleShareWhatsApp = (document: any, documentType: string) => {
    const url = getDocumentUrl(document);
    if (url) {
      const message = `FI Document for ${customer.name} - ${documentType}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message + ' ' + url)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      alert('Document not available for sharing');
    }
  };

  const calculateEMICompletion = (loan: any) => {
    const totalAmount = loan.loanAmount || 0;
    const paidAmount = loan.totalCollection || 0;
    const totalEmis = loan.loanDays || 30;
    const paidEmis = loan.emiPaidCount || 0;
    
    const completionPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    const remainingEmis = Math.max(0, totalEmis - paidEmis);
    
    return {
      completionPercentage,
      remainingEmis,
      paidAmount,
      totalAmount,
      paidEmis,
      totalEmis
    };
  };

  const safeFormatDate = (dateString: string | Date) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch (error) {
      return String(dateString);
    }
  };

  const safeFormatDateTime = (dateString: string | Date) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return String(dateString);
    }
  };

  // UPDATED: Get customer loans from detailed customer data
  const getCustomerLoans = () => {
    const loans: any[] = [];
    
    // Use detailed customer data if available, otherwise fallback to original customer
    const customerData = detailedCustomer || customer;
    
    // Check for primary loan (flattened structure)
    if (customerData.loanNumber || customerData.loanAmount) {
      loans.push({
        loanId: customerData._id + '_primary',
        loanNumber: customerData.loanNumber,
        loanAmount: customerData.loanAmount,
        emiAmount: customerData.emiAmount,
        loanType: customerData.loanType,
        loanDate: customerData.loanDate,
        loanDays: customerData.loanDays,
        status: customerData.status || 'active',
        totalCollection: customerData.totalCollection || 0,
        emiPaidCount: customerData.emiPaidCount || 0,
        nextEmiDate: customerData.nextEmiDate,
        emiStartDate: customerData.loanDate,
        totalEmiCount: customerData.loanDays || 30,
        remainingAmount: (customerData.loanAmount || 0) - (customerData.totalCollection || 0)
      });
    }
    
    // Check for additionalLoans array
    if (customerData.additionalLoans && Array.isArray(customerData.additionalLoans)) {
      customerData.additionalLoans.forEach((loan: any, index: number) => {
        loans.push({
          loanId: loan._id || `additional_${index}`,
          loanNumber: loan.loanNumber,
          loanAmount: loan.loanAmount,
          emiAmount: loan.emiAmount,
          loanType: loan.loanType || customerData.loanType,
          loanDate: loan.loanDate || customerData.loanDate,
          loanDays: loan.loanDays || customerData.loanDays,
          status: loan.status || 'active',
          totalCollection: loan.totalCollection || 0,
          emiPaidCount: loan.emiPaidCount || 0,
          nextEmiDate: loan.nextEmiDate,
          emiStartDate: loan.loanDate || customerData.loanDate,
          totalEmiCount: loan.loanDays || 30,
          remainingAmount: (loan.loanAmount || 0) - (loan.totalCollection || 0)
        });
      });
    }
    
    // Check for loans array (new structure from admin API)
    if ((customerData as ExtendedCustomer).loans && Array.isArray((customerData as ExtendedCustomer).loans)) {
      // Only add if we haven't already added them
      if (loans.length === 0) {
        ((customerData as ExtendedCustomer).loans || []).forEach((loan: any) => {
          loans.push({
            loanId: loan._id || loan.loanId,
            loanNumber: loan.loanNumber,
            loanAmount: loan.loanAmount,
            emiAmount: loan.emiAmount,
            loanType: loan.loanType,
            loanDate: loan.loanDate,
            loanDays: loan.loanDays,
            status: loan.status || 'active',
            totalCollection: loan.totalCollection || 0,
            emiPaidCount: loan.emiPaidCount || 0,
            nextEmiDate: loan.nextEmiDate,
            emiStartDate: loan.emiStartDate || loan.loanDate,
            totalEmiCount: loan.totalEmiCount || loan.loanDays || 30,
            remainingAmount: loan.remainingAmount || ((loan.loanAmount || 0) - (loan.totalCollection || 0))
          });
        });
      }
    }
    
    console.log(`📊 Found ${loans.length} loans for customer ${customerData.name}`);
    return loans;
  };

  const customerLoans = getCustomerLoans();

  // Filter payments based on selected loan
  const getFilteredPayments = () => {
    if (selectedLoanFilter === 'all') {
      return emiPayments || [];
    }
    
    if (selectedLoanFilter === 'unknown') {
      return (emiPayments || []).filter(payment => !payment || !payment.loanId || payment.loanId === 'unknown');
    }
    
    return (emiPayments || []).filter(payment => payment && payment.loanId === selectedLoanFilter);
  };

  const filteredPayments = getFilteredPayments();

  // Calculate payment statistics
  const totalPaidAmount = (emiPayments || []).reduce((sum, payment) => sum + (payment?.amount || 0), 0);
  const advancePayments = (emiPayments || []).filter(p => p?.isAdvancePayment);
  const singlePayments = (emiPayments || []).filter(p => !p?.isAdvancePayment);

  // Get customer data for display (use detailed if available)
  const displayCustomer = detailedCustomer || customer;

  // Helper to get phone as string
  const getPhoneString = (phoneData: string | string[] | undefined): string => {
    if (!phoneData) return '';
    if (Array.isArray(phoneData)) return phoneData[0] || '';
    return phoneData;
  };

  // Helper to get secondary phone
  const getSecondaryPhone = (customerData: Customer | ExtendedCustomer): string => {
    if (customerData.secondaryPhone) return customerData.secondaryPhone;
    if ((customerData as ExtendedCustomer).phoneArray && Array.isArray((customerData as ExtendedCustomer).phoneArray)) {
      return ((customerData as ExtendedCustomer).phoneArray || [])[1] || '';
    }
    if (Array.isArray(customerData.phone)) {
      return customerData.phone[1] || '';
    }
    return '';
  };

  if (loadingDetails) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading customer details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Background Color */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onBack}
              className="flex items-center space-x-2 bg-white text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              <span className="text-lg">←</span>
              <span>Back</span>
            </button>
            <div>
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold">{displayCustomer.name}</h1>
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {displayCustomer.customerNumber}
                </span>
                <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">
                  {customerLoans.length} Loan{customerLoans.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center space-x-4 mt-2">
                <p className="text-blue-100">{displayCustomer.businessName}</p>
                <span className="text-blue-200">•</span>
                <p className="text-blue-100">{displayCustomer.area}</p>
                <span className="text-blue-200">•</span>
                <p className="text-blue-100">
                  {getPhoneString(displayCustomer.phone)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              displayCustomer.status === 'active' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}>
              {displayCustomer.status === 'active' ? 'Active' : 'Inactive'}
            </span>
            <button 
              onClick={handleDeleteClick}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              Delete Profile
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Customer</h3>
                  <p className="text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> Deleting this customer will permanently remove all their data including:
                </p>
                <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                  <li>Customer profile information</li>
                  <li>Loan details</li>
                  <li>EMI payment history</li>
                  <li>All related records</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3">
                <button 
                  onClick={handleCancelDelete}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Yes, Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('transaction-history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transaction-history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Transaction History
          </button>
          <button
            onClick={() => setActiveTab('fi-documents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'fi-documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            FI Documents
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Customer Information Box */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Customer Name</p>
                    <p className="text-lg font-semibold text-gray-900">{displayCustomer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Business Name</p>
                    <p className="text-lg font-semibold text-gray-900">{displayCustomer.businessName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Primary Phone Number</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {getPhoneString(displayCustomer.phone)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Secondary Phone Number</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {getSecondaryPhone(displayCustomer) || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">WhatsApp Number</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {displayCustomer.whatsappNumber || getPhoneString(displayCustomer.phone)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Address</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {displayCustomer.address || 'No address provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Area</p>
                    <p className="text-lg font-semibold text-gray-900">{displayCustomer.area}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Office Category & Category</p>
                    <div className="flex space-x-2 mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {displayCustomer.officeCategory || 'N/A'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        displayCustomer.category === 'A' ? 'bg-green-100 text-green-800' :
                        displayCustomer.category === 'B' ? 'bg-yellow-100 text-yellow-800' :
                        displayCustomer.category === 'C' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {displayCustomer.category || 'Not specified'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loan Details Box */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Loan Details</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {customerLoans.length} Loan{customerLoans.length !== 1 ? 's' : ''}
                  </span>
                  <button 
                    onClick={fetchDetailedCustomer}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6">
              {customerLoans.length > 0 ? (
                <div className="space-y-6">
                  {customerLoans.map((loan: any, index: number) => {
                    const completion = calculateEMICompletion(loan);
                    const remainingAmount = Math.max(0, (loan.loanAmount || 0) - (loan.totalCollection || 0));
                    
                    return (
                      <div key={loan.loanId || index} className="border border-gray-300 rounded-xl p-6 hover:shadow-lg transition-all">
                        {/* Loan Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h5 className="font-bold text-gray-900 text-lg mb-2">
                              {loan.loanNumber || `L${index + 1}`}
                              {index === 0 && customerLoans.length > 1 && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Primary
                                </span>
                              )}
                            </h5>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                loan.status === 'active' ? 'bg-green-100 text-green-800' :
                                loan.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                loan.status === 'defaulted' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {loan.status || 'active'}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                loan.loanType === 'Daily' ? 'bg-blue-100 text-blue-800' :
                                loan.loanType === 'Weekly' ? 'bg-green-100 text-green-800' :
                                loan.loanType === 'Monthly' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {loan.loanType || 'Daily'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-gray-600">Loan Amount</p>
                            <p className="text-lg font-bold text-green-600">
                              ₹{(loan.loanAmount || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Completion Percentage */}
                        <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">Completion</p>
                              <p className="font-bold text-xl text-blue-700">
                                {completion.completionPercentage.toFixed(1)}%
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium text-gray-600 mb-1">EMI Remaining</p>
                              <p className="font-semibold text-base text-gray-900">
                                {completion.remainingEmis} of {completion.totalEmis}
                              </p>
                            </div>
                          </div>
                          <div className="w-full bg-blue-100 rounded-full h-2 mb-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                              style={{width: `${Math.min(completion.completionPercentage, 100)}%`}}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <div className="text-gray-600">
                              <span>Paid: </span>
                              <span className="font-semibold">₹{Math.round(completion.paidAmount)}</span>
                            </div>
                            <div className="text-gray-600">
                              <span>Remaining: </span>
                              <span className="font-semibold">₹{remainingAmount} of ₹{loan.loanAmount?.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Loan Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">Loan Amount</p>
                            <p className="font-semibold text-gray-900 text-sm">
                              ₹{(loan.loanAmount || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">EMI Amount</p>
                            <p className="font-semibold text-gray-900 text-sm">
                              ₹{loan.emiAmount || '0'}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">No. of {loan.loanType === 'Daily' ? 'Days' : loan.loanType === 'Weekly' ? 'Weeks' : 'Months'}</p>
                            <p className="font-semibold text-gray-900 text-sm">
                              {loan.loanDays || 30}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">Loan Start Date</p>
                            <p className="font-semibold text-gray-900 text-sm">
                              {loan.loanDate ? safeFormatDate(loan.loanDate) : 'N/A'}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">Next EMI Date</p>
                            <p className="font-semibold text-gray-900 text-sm">
                              {loan.nextEmiDate ? safeFormatDate(loan.nextEmiDate) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">💰</div>
                  <p className="text-gray-500 text-lg font-semibold">No loans found</p>
                  <p className="text-gray-400 text-sm mt-2">
                    This customer doesn't have any active loans
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transaction-history' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg mr-4">
                  <span className="text-blue-600 text-xl">💰</span>
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-medium">Total Paid</p>
                  <p className="text-2xl font-bold text-blue-800">₹{totalPaidAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg mr-4">
                  <span className="text-green-600 text-xl">📊</span>
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium">Total Payments</p>
                  <p className="text-2xl font-bold text-green-800">{emiPayments?.length || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg mr-4">
                  <span className="text-purple-600 text-xl">⚡</span>
                </div>
                <div>
                  <p className="text-sm text-purple-700 font-medium">Single Payments</p>
                  <p className="text-2xl font-bold text-purple-800">{singlePayments.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="bg-amber-100 p-3 rounded-lg mr-4">
                  <span className="text-amber-600 text-xl">📅</span>
                </div>
                <div>
                  <p className="text-sm text-amber-700 font-medium">Advance Payments</p>
                  <p className="text-2xl font-bold text-amber-800">{advancePayments.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Loan Filter Tabs */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Payment History by Loan</h3>
              <p className="text-sm text-gray-600 mt-1">Click on a loan to filter its payments</p>
            </div>
            <div className="p-6">
              {/* Circle-style Loan Tabs */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-3">
                  {/* All Loans Button */}
                  <button
                    onClick={() => setSelectedLoanFilter('all')}
                    className={`flex flex-col items-center justify-center w-24 h-24 rounded-full transition-all duration-300 ${
                      selectedLoanFilter === 'all'
                        ? 'bg-blue-600 text-white transform scale-105 shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="text-2xl mb-1">📊</span>
                    <span className="text-sm font-medium">All Loans</span>
                    <span className="text-xs mt-1">{(emiPayments || []).length} payments</span>
                  </button>

                  {/* Loan-specific Buttons */}
                  {loanPaymentSummaries.map((loan) => (
                    <button
                      key={loan.loanId}
                      onClick={() => setSelectedLoanFilter(loan.loanId)}
                      className={`flex flex-col items-center justify-center w-24 h-24 rounded-full transition-all duration-300 ${
                        selectedLoanFilter === loan.loanId
                          ? 'bg-green-600 text-white transform scale-105 shadow-lg'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      <span className="text-xl font-bold mb-1">{loan.loanNumber}</span>
                      <span className="text-xs mb-1">₹{loan.totalPaid.toLocaleString()}</span>
                      <span className="text-xs bg-white/30 px-2 py-1 rounded-full">
                        {loan.paymentCount} {loan.paymentCount === 1 ? 'payment' : 'payments'}
                      </span>
                    </button>
                  ))}

                  {/* Unknown Loan Button */}
                  {(emiPayments || []).some(p => !p?.loanId || p.loanId === 'unknown') && (
                    <button
                      onClick={() => setSelectedLoanFilter('unknown')}
                      className={`flex flex-col items-center justify-center w-24 h-24 rounded-full transition-all duration-300 ${
                        selectedLoanFilter === 'unknown'
                          ? 'bg-red-600 text-white transform scale-105 shadow-lg'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      <span className="text-2xl mb-1">❓</span>
                      <span className="text-sm font-medium">Unknown</span>
                      <span className="text-xs mt-1">
                        {(emiPayments || []).filter(p => !p?.loanId || p.loanId === 'unknown').length} payments
                      </span>
                    </button>
                  )}
                </div>

                {/* Selected Loan Info */}
                {selectedLoanFilter !== 'all' && selectedLoanFilter !== 'unknown' && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    {loanPaymentSummaries
                      .filter(loan => loan.loanId === selectedLoanFilter)
                      .map(loan => (
                        <div key={loan.loanId} className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-blue-800">Loan {loan.loanNumber}</h4>
                            <div className="flex items-center space-x-4 mt-2 text-sm">
                              {loan.loanType && (
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                                  {loan.loanType}
                                </span>
                              )}
                              {loan.loanAmount && (
                                <span className="text-gray-600">
                                  Amount: <span className="font-semibold">₹{loan.loanAmount.toLocaleString()}</span>
                                </span>
                              )}
                              {loan.emiAmount && (
                                <span className="text-gray-600">
                                  EMI: <span className="font-semibold">₹{loan.emiAmount.toLocaleString()}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Last Payment</p>
                            <p className="font-semibold text-gray-900">
                              {loan.lastPaymentDate ? safeFormatDate(loan.lastPaymentDate) : 'No payments'}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Payments Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-700">
                      {selectedLoanFilter === 'all' 
                        ? 'All Payments' 
                        : selectedLoanFilter === 'unknown'
                          ? 'Unassigned Payments'
                          : `Payments for Loan ${loanPaymentSummaries.find(l => l.loanId === selectedLoanFilter)?.loanNumber}`
                      }
                      <span className="ml-2 text-sm text-gray-500">
                        ({filteredPayments.length} payments)
                      </span>
                    </h4>
                    <button
                      onClick={fetchEmiPayments}
                      disabled={loadingPayments}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-md hover:bg-blue-200 disabled:opacity-50"
                    >
                      {loadingPayments ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                </div>

                {loadingPayments ? (
                  <div className="py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading payment history...</p>
                  </div>
                ) : filteredPayments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collected By</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredPayments.map((payment) => (
                          <tr key={payment?._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {payment?.paymentDate ? safeFormatDate(payment.paymentDate) : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {payment?.paymentDate ? safeFormatDateTime(payment.paymentDate).split(', ')[1] : ''}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-semibold text-green-600">
                                ₹{(payment?.amount || 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                payment?.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                payment?.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                                payment?.status === 'Advance' ? 'bg-blue-100 text-blue-800' :
                                payment?.status === 'Due' ? 'bg-orange-100 text-orange-800' :
                                payment?.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {payment?.status || 'Unknown'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {payment?.loanNumber ? (
                                <span className="text-sm font-medium text-gray-900">
                                  {payment.loanNumber}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-500">Not assigned</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {payment?.collectedBy || 'Unknown'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                  payment?.paymentType === 'advance'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {payment?.paymentType === 'advance' ? 'Advance' : 'Single'}
                                </span>
                                {payment?.isAdvancePayment && payment?.advanceEmiCount && (
                                  <span className="text-xs text-gray-600">
                                    {payment.advanceEmiCount} EMI(s)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900 max-w-xs truncate" title={payment?.notes}>
                                {payment?.notes || '-'}
                              </div>
                              {payment?.advanceFromDate && payment?.advanceToDate && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {safeFormatDate(payment.advanceFromDate)} to {safeFormatDate(payment.advanceToDate)}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <div className="text-gray-400 text-4xl mb-4">📭</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
                    <p className="text-gray-600">
                      {selectedLoanFilter === 'all'
                        ? 'No EMI payments recorded for this customer.'
                        : 'No payments found for the selected loan filter.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Statistics */}
              {filteredPayments.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-600">Total Amount</p>
                    <p className="text-xl font-bold text-gray-900">
                      ₹{filteredPayments.reduce((sum, p) => sum + (p?.amount || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-600">Average Payment</p>
                    <p className="text-xl font-bold text-gray-900">
                      ₹{filteredPayments.length > 0 
                        ? Math.round(filteredPayments.reduce((sum, p) => sum + (p?.amount || 0), 0) / filteredPayments.length).toLocaleString()
                        : '0'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-600">Payment Range</p>
                    <p className="text-xl font-bold text-gray-900">
                      ₹{filteredPayments.length > 0 
                        ? `${Math.min(...filteredPayments.map(p => p?.amount || 0)).toLocaleString()} - ₹${Math.max(...filteredPayments.map(p => p?.amount || 0)).toLocaleString()}`
                        : '0'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fi-documents' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shop FI Document */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                <h3 className="text-lg font-semibold text-gray-900">Shop FI Document</h3>
              </div>
              <div className="p-6">
                <div className="text-center">
                  <div className="text-green-400 text-6xl mb-4">🏪</div>
                  <p className="text-gray-600 mb-4">Shop Field Investigation Document</p>
                  <div className="flex justify-center space-x-3">
                    <button 
                      onClick={() => handleDownload(displayCustomer.fiDocuments?.shop, 'Shop_FI')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Download
                    </button>
                    <button 
                      onClick={() => handleShareWhatsApp(displayCustomer.fiDocuments?.shop, 'Shop FI Document')}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
                    >
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Home FI Document */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                <h3 className="text-lg font-semibold text-gray-900">Home FI Document</h3>
              </div>
              <div className="p-6">
                <div className="text-center">
                  <div className="text-blue-400 text-6xl mb-4">🏠</div>
                  <p className="text-gray-600 mb-4">Home Field Investigation Document</p>
                  <div className="flex justify-center space-x-3">
                    <button 
                      onClick={() => handleDownload(displayCustomer.fiDocuments?.home, 'Home_FI')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Download
                    </button>
                    <button 
                      onClick={() => handleShareWhatsApp(displayCustomer.fiDocuments?.home, 'Home FI Document')}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                    >
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Document Status */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Document Status</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <span className="text-gray-700">Shop FI Document</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getDocumentUrl(displayCustomer.fiDocuments?.shop) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {getDocumentUrl(displayCustomer.fiDocuments?.shop) ? 'Uploaded' : 'Not Uploaded'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <span className="text-gray-700">Home FI Document</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getDocumentUrl(displayCustomer.fiDocuments?.home) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {getDocumentUrl(displayCustomer.fiDocuments?.home) ? 'Uploaded' : 'Not Uploaded'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}