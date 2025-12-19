'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Types
interface PaymentData {
  _id: string;
  customerId: string;
  customerNumber: string;
  customerName: string;
  loanId: string;
  loanNumber: string;
  emiAmount: number;
  paidAmount: number;
  paymentDate: string;
  paymentMethod: string;
  officeCategory: string;
  operatorName: string;
  status: string;
}

interface CollectionStats {
  todaysCollection: number;
  numberOfCustomersPaid: number;
  totalCollections: number;
  office1Collection: number;
  office2Collection: number;
  office1CustomersPaid: number;
  office2CustomersPaid: number;
}

interface CollectionApiResponse {
  success: boolean;
  data?: {
    date: string;
    payments: PaymentData[];
    statistics: CollectionStats;
    summary: any;
  };
  error?: string;
}

interface CollectionViewProps {
  onBack?: () => void;
}

// Inline Error Display Component
const ErrorDisplay = ({ message }: { message: string }) => (
  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <span className="text-red-400 text-lg">⚠️</span>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-red-800">Error</h3>
        <p className="text-sm text-red-700 mt-1">{message}</p>
      </div>
    </div>
  </div>
);

// Inline Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// No Data Display Component
const NoDataDisplay = ({ selectedDate }: { selectedDate: string }) => {
  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  
  return (
    <div className="text-center py-16">
      <div className="text-gray-300 text-6xl mb-6">📭</div>
      <h3 className="text-2xl font-semibold text-gray-800 mb-3">
        No payments found for {new Date(selectedDate).toLocaleDateString()}
      </h3>
      <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg">
        No EMI payments were recorded on this date.
        {isToday && (
          <span className="block mt-2">
            Payments will appear here as data entry operators record EMI payments.
          </span>
        )}
      </p>
    </div>
  );
};

export default function CollectionView({ onBack }: CollectionViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CollectionStats>({
    todaysCollection: 0,
    numberOfCustomersPaid: 0,
    totalCollections: 0,
    office1Collection: 0,
    office2Collection: 0,
    office1CustomersPaid: 0,
    office2CustomersPaid: 0
  });

  // Fetch payment data for the selected date
  const fetchPaymentData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const url = `/api/admin/collections?date=${selectedDate}`;
      
      console.log('📊 [ADMIN] Fetching collection data:', { 
        url, 
        selectedDate
      });
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: CollectionApiResponse = await response.json();
      console.log('📥 [ADMIN] API Response received:', result);
      
      if (result.success && result.data) {
        const paymentsData = result.data.payments || [];
        
        console.log(`💰 [ADMIN] Total payment records: ${paymentsData.length}`);
        
        setPayments(paymentsData);
        
        // Set statistics from API response
        if (result.data.statistics) {
          setStats(result.data.statistics);
        } else {
          // Calculate statistics if not provided by API
          const todaysCollection = paymentsData.reduce((sum, payment) => 
            sum + (payment.paidAmount || 0), 0
          );
          
          const uniqueCustomerIds = [...new Set(paymentsData.map(p => p.customerId))];
          
          // Calculate office-wise statistics
          const office1Payments = paymentsData.filter(p => p.officeCategory === 'Office 1');
          const office2Payments = paymentsData.filter(p => p.officeCategory === 'Office 2');
          
          const office1Collection = office1Payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
          const office2Collection = office2Payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
          
          const office1CustomerIds = [...new Set(office1Payments.map(p => p.customerId))];
          const office2CustomerIds = [...new Set(office2Payments.map(p => p.customerId))];
          
          setStats({
            todaysCollection: todaysCollection,
            numberOfCustomersPaid: uniqueCustomerIds.length,
            totalCollections: paymentsData.length,
            office1Collection: office1Collection,
            office2Collection: office2Collection,
            office1CustomersPaid: office1CustomerIds.length,
            office2CustomersPaid: office2CustomerIds.length
          });
        }
        
      } else {
        const errorMsg = result.error || 'Failed to fetch collection data';
        console.error('❌ [ADMIN] API Error:', errorMsg);
        setError(errorMsg);
        setPayments([]);
        setStats({
          todaysCollection: 0,
          numberOfCustomersPaid: 0,
          totalCollections: 0,
          office1Collection: 0,
          office2Collection: 0,
          office1CustomersPaid: 0,
          office2CustomersPaid: 0
        });
      }
    } catch (err: any) {
      console.error('❌ [ADMIN] Error fetching collection data:', err);
      setError(err.message || 'Failed to load collection data. Please check your API endpoint.');
      setPayments([]);
      setStats({
        todaysCollection: 0,
        numberOfCustomersPaid: 0,
        totalCollections: 0,
        office1Collection: 0,
        office2Collection: 0,
        office1CustomersPaid: 0,
        office2CustomersPaid: 0
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Initial fetch on component mount and date change
  useEffect(() => {
    fetchPaymentData();
  }, [fetchPaymentData]);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  // Reset to today's date
  const handleResetDate = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Group payments by customer for better display
  const groupedPayments = useMemo(() => {
    const groups: { [key: string]: PaymentData[] } = {};
    
    payments.forEach(payment => {
      if (!payment.customerId) return;
      
      if (!groups[payment.customerId]) {
        groups[payment.customerId] = [];
      }
      groups[payment.customerId].push(payment);
    });
    
    console.log(`📊 [ADMIN] Grouped ${payments.length} payments into ${Object.keys(groups).length} customer groups`);
    return groups;
  }, [payments]);

  // Calculate total amount per customer
  const calculateCustomerTotal = (payments: PaymentData[]) => {
    return payments.reduce((sum, payment) => 
      sum + (payment.paidAmount || 0), 0
    );
  };

  // Handle back button if provided
  const handleBackClick = () => {
    if (onBack) {
      onBack();
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Header with back button */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {onBack && (
                <button
                  onClick={handleBackClick}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Back to Dashboard"
                >
                  <span className="text-xl">←</span>
                </button>
              )}
              <h1 className="text-2xl font-bold text-gray-900">Collection Management (Admin View)</h1>
            </div>
            <p className="text-gray-600">Track and manage EMI collections from ALL offices and operators</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchPaymentData()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span>🔄</span>
              Refresh Data
            </button>
          </div>
        </div>

        {/* Date Selection */}
        <div className="mb-8 p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Select Date</h3>
              <p className="text-sm text-gray-600">
                View collections for a specific date. Default is today.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Collection Date
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <button
                    onClick={handleResetDate}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all duration-200"
                  >
                    Reset to Today
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-lg font-semibold text-blue-700">
              Showing collections for: <span className="font-bold">{formatDisplayDate(selectedDate)}</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              All offices • All operators • Admin view
            </p>
          </div>
        </div>

        {error && <ErrorDisplay message={error} />}

        {/* Statistics Cards - 5 Cards Now */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Today's Total Collection Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-2">Today's Collection</h3>
                <p className="text-2xl font-bold text-blue-900">
                  ₹{stats.todaysCollection.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  Total EMI collected on {selectedDate}
                </p>
              </div>
              <div className="text-4xl text-blue-500">
                💰
              </div>
            </div>
          </div>

          {/* Customers Paid Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-2">Customers Paid</h3>
                <p className="text-2xl font-bold text-green-900">
                  {stats.numberOfCustomersPaid}
                </p>
                <p className="text-xs text-green-700 mt-2">
                  Unique customers who made payments
                </p>
              </div>
              <div className="text-4xl text-green-500">
                👥
              </div>
            </div>
          </div>

          {/* Total Transactions Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-purple-800 mb-2">Total Transactions</h3>
                <p className="text-2xl font-bold text-purple-900">
                  {stats.totalCollections}
                </p>
                <p className="text-xs text-purple-700 mt-2">
                  Number of EMI payments recorded
                </p>
              </div>
              <div className="text-4xl text-purple-500">
                📊
              </div>
            </div>
          </div>

          {/* Office 1 Collection Card */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-orange-800 mb-2">Office 1 Collection</h3>
                <p className="text-2xl font-bold text-orange-900">
                  ₹{stats.office1Collection.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-orange-700 mt-2">
                  {stats.office1CustomersPaid} customers paid
                </p>
              </div>
              <div className="text-4xl text-orange-500">
                🏢
              </div>
            </div>
          </div>

          {/* Office 2 Collection Card */}
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-pink-800 mb-2">Office 2 Collection</h3>
                <p className="text-2xl font-bold text-pink-900">
                  ₹{stats.office2Collection.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-pink-700 mt-2">
                  {stats.office2CustomersPaid} customers paid
                </p>
              </div>
              <div className="text-4xl text-pink-500">
                🏢
              </div>
            </div>
          </div>
        </div>

        {/* Customer Payment List */}
        <div className="bg-white shadow-xl rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Customer Payments for {formatDisplayDate(selectedDate)}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {payments.length} payment{payments.length !== 1 ? 's' : ''} from {Object.keys(groupedPayments).length} customer{Object.keys(groupedPayments).length !== 1 ? 's' : ''} across all offices
                </p>
              </div>
              <div className="text-sm font-medium text-gray-700">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full mr-2">
                  Office 1: {stats.office1CustomersPaid} customers
                </span>
                <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full">
                  Office 2: {stats.office2CustomersPaid} customers
                </span>
              </div>
            </div>
          </div>

          {payments.length === 0 ? (
            <NoDataDisplay selectedDate={selectedDate} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Customer Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Payment Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Office & Operator
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(groupedPayments).map(([customerId, customerPayments]) => {
                    const firstPayment = customerPayments[0];
                    const customerTotal = calculateCustomerTotal(customerPayments);
                    
                    return (
                      <tr 
                        key={customerId}
                        className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group"
                      >
                        {/* Customer Details */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-200">
                              <span className="text-white font-bold text-lg">
                                {firstPayment.customerName?.charAt(0) || 'C'}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                                {firstPayment.customerName || 'Unknown Customer'}
                              </div>
                              <div className="text-xs text-gray-600">
                                {firstPayment.customerNumber || 'No Number'}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Customer ID: {customerId.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Payment Details */}
                        <td className="px-6 py-5">
                          <div className="space-y-2">
                            {customerPayments.map((payment, index) => (
                              <div key={payment._id || index} className="flex justify-between items-center">
                                <div>
                                  <span className="text-sm font-medium text-gray-900">
                                    Loan: {payment.loanNumber || 'N/A'}
                                  </span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    EMI: ₹{payment.emiAmount?.toLocaleString('en-IN') || '0'}
                                  </span>
                                </div>
                                <div className="text-sm font-bold text-green-600">
                                  ₹{(payment.paidAmount || 0).toLocaleString('en-IN')}
                                </div>
                              </div>
                            ))}
                            <div className="pt-2 border-t border-gray-200">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-gray-800">Customer Total:</span>
                                <span className="text-lg font-bold text-blue-700">
                                  ₹{customerTotal.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Office & Operator */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex flex-col space-y-2">
                            <span className={`px-3 py-1.5 inline-flex text-sm font-semibold rounded-lg ${
                              firstPayment.officeCategory === 'Office 1' 
                                ? 'bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200'
                                : 'bg-gradient-to-r from-pink-100 to-pink-50 text-pink-800 border border-pink-200'
                            }`}>
                              {firstPayment.officeCategory || 'Office 1'}
                            </span>
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Operator:</span> {firstPayment.operatorName || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">Date:</span> {new Date(firstPayment.paymentDate).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">Method:</span> {firstPayment.paymentMethod}
                            </div>
                          </div>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => {
                                console.log('View customer details:', customerId, firstPayment.customerName);
                                alert(`View customer: ${firstPayment.customerName}\nOffice: ${firstPayment.officeCategory}\nOperator: ${firstPayment.operatorName}`);
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                            >
                              <span className="text-base">👁️</span>
                              <span>View Details</span>
                            </button>
                            <button
                              onClick={() => {
                                console.log('Verify payment for:', customerId);
                                alert(`Verify payment for: ${firstPayment.customerName}\nThis would mark the payment as verified by admin.`);
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                            >
                              <span className="text-base">✅</span>
                              <span>Verify Payment</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Footer with summary */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-sm text-gray-600">
                Showing {Object.keys(groupedPayments).length} customer{Object.keys(groupedPayments).length !== 1 ? 's' : ''} • {payments.length} transaction{payments.length !== 1 ? 's' : ''}
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="text-sm font-medium text-gray-700">
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full mr-2">
                    Office 1: ₹{stats.office1Collection.toLocaleString('en-IN')}
                  </span>
                  <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full">
                    Office 2: ₹{stats.office2Collection.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="text-lg font-bold text-blue-700">
                  Daily Total: ₹{stats.todaysCollection.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}