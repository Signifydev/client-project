import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CollectionSectionProps, 
  PaymentData, 
  CollectionStats,
  CollectionApiResponse 
} from '@/src/types/dataEntry';

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
            Click "Record EMI Payment" button to record today's first payment.
          </span>
        )}
      </p>
    </div>
  );
};

export default function CollectionSection({
  refreshKey = 0,
  currentUserOffice = 'all',
  currentOperator = {
    id: 'operator_1',
    name: 'Operator',
    fullName: 'Operator (Data Entry)'
  },
  onShowUpdateEMI = () => console.log('Record EMI Payment clicked')
}: CollectionSectionProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CollectionStats>({
    todaysCollection: 0,
    numberOfCustomersPaid: 0,
    totalCollections: 0
  });

  // Fetch payment data for the selected date
  const fetchPaymentData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the correct API endpoint - IMPORTANT: This should match your API route
      let url = `/api/data-entry/collection?date=${selectedDate}`;
      
      if (currentUserOffice && currentUserOffice !== 'all') {
        url += `&officeCategory=${encodeURIComponent(currentUserOffice)}`;
      }
      
      console.log('📊 Fetching collection data:', { 
        url, 
        selectedDate, 
        currentUserOffice,
        fullUrl: url 
      });
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: CollectionApiResponse = await response.json();
      console.log('📥 API Response received:', result);
      
      if (result.success && result.data) {
        // Handle different response structures from API
        let paymentsData: PaymentData[] = [];
        
        // Check if data has payments array
        if (result.data.payments && Array.isArray(result.data.payments)) {
          paymentsData = result.data.payments;
        } 
        // Check if data has customers array (old format)
        else if (result.data.customers && Array.isArray(result.data.customers)) {
          paymentsData = result.data.customers.flatMap((customer: any) => {
            if (customer.loans && Array.isArray(customer.loans)) {
              return customer.loans.map((loan: any) => ({
                _id: `${customer.customerId}_${loan.loanNumber}`,
                customerId: customer.customerId,
                customerNumber: customer.customerNumber,
                customerName: customer.customerName,
                loanId: loan.loanId || 'N/A',
                loanNumber: loan.loanNumber,
                emiAmount: loan.emiAmount || 0,
                paidAmount: loan.collectedAmount || loan.emiAmount || 0,
                paymentDate: selectedDate,
                paymentMethod: 'Cash',
                officeCategory: customer.officeCategory,
                operatorName: currentOperator.name,
                status: 'Paid'
              }));
            }
            return [];
          });
        }
        
        console.log(`💰 Processed ${paymentsData.length} payment records`);
        
        setPayments(paymentsData);
        
        // FIX: Handle both types of API responses
        const apiStats = result.data.statistics || result.data.summary;
        
        if (apiStats) {
          // Handle new format (statistics object)
          if ('todaysCollection' in apiStats) {
            const stats = apiStats as { todaysCollection: number; numberOfCustomersPaid: number; totalCollections: number };
            setStats({
              todaysCollection: stats.todaysCollection || 0,
              numberOfCustomersPaid: stats.numberOfCustomersPaid || 0,
              totalCollections: stats.totalCollections || paymentsData.length
            });
          } 
          // Handle old format (summary object)
          else if ('totalCollection' in apiStats) {
            const summary = apiStats as { totalCollection: number; numberOfCustomersPaid?: number; totalTransactions?: number };
            setStats({
              todaysCollection: summary.totalCollection || 0,
              numberOfCustomersPaid: summary.numberOfCustomersPaid || 
                (result.data.customers ? result.data.customers.length : 0) || 0,
              totalCollections: summary.totalTransactions || paymentsData.length
            });
          } else {
            // Calculate manually if structure is unknown
            const todaysCollection = paymentsData.reduce((sum, payment) => 
              sum + (payment.paidAmount || 0), 0
            );
            
            const uniqueCustomerIds = [...new Set(paymentsData.map(p => p.customerId))];
            
            setStats({
              todaysCollection,
              numberOfCustomersPaid: uniqueCustomerIds.length,
              totalCollections: paymentsData.length
            });
          }
        } else {
          // Calculate manually if no stats from API
          const todaysCollection = paymentsData.reduce((sum, payment) => 
            sum + (payment.paidAmount || 0), 0
          );
          
          const uniqueCustomerIds = [...new Set(paymentsData.map(p => p.customerId))];
          
          setStats({
            todaysCollection,
            numberOfCustomersPaid: uniqueCustomerIds.length,
            totalCollections: paymentsData.length
          });
        }
        
      } else {
        const errorMsg = result.error || 'Failed to fetch collection data';
        console.error('❌ API Error:', errorMsg);
        setError(errorMsg);
        setPayments([]);
        setStats({
          todaysCollection: 0,
          numberOfCustomersPaid: 0,
          totalCollections: 0
        });
      }
    } catch (err: any) {
      console.error('❌ Error fetching collection data:', err);
      setError(err.message || 'Failed to load collection data. Please check your API endpoint.');
      setPayments([]);
      setStats({
        todaysCollection: 0,
        numberOfCustomersPaid: 0,
        totalCollections: 0
      });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, currentUserOffice, currentOperator.name]);

  // Initial fetch and refresh on key change
  useEffect(() => {
    fetchPaymentData();
  }, [fetchPaymentData, refreshKey]);

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
    
    console.log(`📊 Grouped ${payments.length} payments into ${Object.keys(groups).length} customer groups`);
    return groups;
  }, [payments]);

  // Calculate total amount per customer
  const calculateCustomerTotal = (payments: PaymentData[]) => {
    return payments.reduce((sum, payment) => 
      sum + (payment.paidAmount || 0), 0
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Debug button - remove in production */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => console.log('Debug info:', { payments, stats, groupedPayments })}
          className="px-3 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700"
        >
          Debug Info
        </button>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Collection Management</h2>
            <p className="text-sm text-gray-600 mt-1">Track and manage daily collections and payments</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onShowUpdateEMI}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2"
            >
              <span className="text-lg">💰</span>
              <span>Record EMI Payment</span>
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
          </div>
        </div>

        {error && <ErrorDisplay message={error} />}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Today's Collection Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-2">Today's Collection</h3>
                <p className="text-3xl font-bold text-blue-900">
                  ₹{stats.todaysCollection.toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-blue-700 mt-2">
                  Total EMI collected on {selectedDate}
                </p>
              </div>
              <div className="text-4xl text-blue-500">
                💰
              </div>
            </div>
          </div>

          {/* Number of Customers Paid Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-green-800 mb-2">Customers Paid</h3>
                <p className="text-3xl font-bold text-green-900">
                  {stats.numberOfCustomersPaid}
                </p>
                <p className="text-sm text-green-700 mt-2">
                  Unique customers who made payments
                </p>
              </div>
              <div className="text-4xl text-green-500">
                👥
              </div>
            </div>
          </div>

          {/* Total Collections Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-purple-800 mb-2">Total Transactions</h3>
                <p className="text-3xl font-bold text-purple-900">
                  {stats.totalCollections}
                </p>
                <p className="text-sm text-purple-700 mt-2">
                  Number of EMI payments recorded
                </p>
              </div>
              <div className="text-4xl text-purple-500">
                📊
              </div>
            </div>
          </div>
        </div>

        {/* Customer Payment List */}
        <div className="bg-white shadow-xl rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800">
              Customer Payments for {formatDisplayDate(selectedDate)}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Showing {payments.length} payment{payments.length !== 1 ? 's' : ''} from {Object.keys(groupedPayments).length} customer{Object.keys(groupedPayments).length !== 1 ? 's' : ''}
            </p>
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
                                ? 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200'
                            }`}>
                              {firstPayment.officeCategory || 'Not Assigned'}
                            </span>
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Operator:</span> {firstPayment.operatorName || currentOperator.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">Date:</span> {new Date(firstPayment.paymentDate).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => {
                                console.log('View customer details:', customerId, firstPayment.customerName);
                                // This would ideally open the customer details modal
                                // You'll need to pass this function from parent
                                alert(`View customer: ${firstPayment.customerName}`);
                              }}
                              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                            >
                              <span className="text-base">👁️</span>
                              <span>View Customer</span>
                            </button>
                            <button
                              onClick={onShowUpdateEMI}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                            >
                              <span className="text-base">💰</span>
                              <span>Add Payment</span>
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
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {Object.keys(groupedPayments).length} customer{Object.keys(groupedPayments).length !== 1 ? 's' : ''} • {payments.length} transaction{payments.length !== 1 ? 's' : ''}
              </div>
              <div className="text-lg font-bold text-blue-700">
                Daily Total: ₹{stats.todaysCollection.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}