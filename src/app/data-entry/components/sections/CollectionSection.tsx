import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CollectionSectionProps, 
  PaymentData, 
  CollectionStats,
  CollectionApiResponse 
} from '@/src/app/data-entry/types/dataEntry';

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
      // Use the correct API endpoint
      let url = `/api/data-entry/collection?date=${selectedDate}`;
      
      if (currentUserOffice && currentUserOffice !== 'all') {
        url += `&officeCategory=${encodeURIComponent(currentUserOffice)}`;
      }
      
      console.log('📊 Fetching collection data:', { 
        url, 
        selectedDate, 
        currentUserOffice,
        currentOperator: currentOperator.name
      });
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Response not OK:', { status: response.status, errorText });
        throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0, 100)}`);
      }
      
      const result: CollectionApiResponse = await response.json();
      console.log('📥 API Response received:', { 
        success: result.success, 
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : []
      });
      
      if (result.success && result.data) {
        // ✅ FIXED DATA MAPPING: Handle both response structures
        let paymentsData: PaymentData[] = [];
        
        // Check if data has direct payments array (PREFERRED)
        if (result.data.payments && Array.isArray(result.data.payments)) {
          console.log(`✅ Using direct payments array with ${result.data.payments.length} records`);
          
          paymentsData = result.data.payments.map((payment: any) => ({
            _id: payment._id?.toString() || `payment_${Date.now()}_${Math.random()}`,
            customerId: payment.customerId?.toString() || payment.customerId || 'unknown',
            customerNumber: payment.customerNumber || payment.customerId?.customerNumber || 'N/A',
            customerName: payment.customerName || payment.customerId?.name || 'Unknown Customer',
            loanId: payment.loanId?.toString() || payment.loanId || 'N/A',
            loanNumber: payment.loanNumber || payment.loanId?.loanNumber || 'N/A',
            emiAmount: payment.emiAmount || payment.loanId?.emiAmount || 0,
            paidAmount: payment.paidAmount || payment.amount || 0,
            paymentDate: payment.paymentDate || selectedDate,
            paymentMethod: payment.paymentMethod || 'Cash',
            officeCategory: payment.officeCategory || payment.customerId?.officeCategory || currentUserOffice,
            // ✅ CRITICAL FIX: Handle both operatorName and collectedBy fields
            operatorName: payment.operatorName || payment.collectedBy || currentOperator.name,
            status: payment.status || 'Paid'
          }));
          
          console.log(`💰 Mapped ${paymentsData.length} payments from direct array`);
        } 
        // Check if data has customers array (ALTERNATIVE STRUCTURE)
        else if (result.data.customers && Array.isArray(result.data.customers)) {
          console.log(`📊 Using customers array with ${result.data.customers.length} customers`);
          
          paymentsData = result.data.customers.flatMap((customer: any) => {
            if (customer.payments && Array.isArray(customer.payments)) {
              return customer.payments.map((payment: any) => ({
                _id: payment._id?.toString() || `payment_${customer.customerId}_${Date.now()}`,
                customerId: customer.customerId?.toString() || customer.customerId || 'unknown',
                customerNumber: customer.customerNumber || 'N/A',
                customerName: customer.customerName || 'Unknown Customer',
                loanId: payment.loanId?.toString() || payment.loanId || 'N/A',
                loanNumber: payment.loanNumber || 'N/A',
                emiAmount: payment.emiAmount || 0,
                paidAmount: payment.paidAmount || payment.amount || 0,
                paymentDate: payment.paymentDate || selectedDate,
                paymentMethod: payment.paymentMethod || 'Cash',
                officeCategory: customer.officeCategory || currentUserOffice,
                // ✅ CRITICAL FIX: Handle both operatorName and collectedBy fields
                operatorName: payment.operatorName || payment.collectedBy || currentOperator.name,
                status: payment.status || 'Paid'
              }));
            }
            return [];
          });
          
          console.log(`📦 Flattened ${result.data.customers.length} customers into ${paymentsData.length} payments`);
        }
        // If no payments found but API returned success
        else if (result.data.statistics) {
          console.log('ℹ️ No payments array found, using statistics only');
          paymentsData = [];
        }
        
        console.log(`💰 Total payment records after mapping: ${paymentsData.length}`);
        
        if (paymentsData.length > 0) {
          console.log('📄 Sample payment data:', {
            customerName: paymentsData[0].customerName,
            amount: paymentsData[0].paidAmount,
            operator: paymentsData[0].operatorName,
            loanNumber: paymentsData[0].loanNumber
          });
        }
        
        setPayments(paymentsData);
        
        // Calculate statistics - use API statistics if available, otherwise calculate
        let todaysCollection = 0;
        let numberOfCustomersPaid = 0;
        
        if (result.data.statistics) {
          // Use API-provided statistics
          todaysCollection = result.data.statistics.todaysCollection || 0;
          numberOfCustomersPaid = result.data.statistics.numberOfCustomersPaid || 0;
          console.log('📈 Using API statistics:', result.data.statistics);
        } else {
          // Calculate from payments data
          todaysCollection = paymentsData.reduce((sum, payment) => 
            sum + (payment.paidAmount || 0), 0
          );
          
          const uniqueCustomerIds = [...new Set(paymentsData.map(p => p.customerId))];
          numberOfCustomersPaid = uniqueCustomerIds.length;
          console.log('🧮 Calculated statistics from payments:', { todaysCollection, numberOfCustomersPaid });
        }
        
        setStats({
          todaysCollection: todaysCollection,
          numberOfCustomersPaid: numberOfCustomersPaid,
          totalCollections: paymentsData.length
        });
        
      } else {
        const errorMsg = result.error || 'Failed to fetch collection data';
        const message = result.message || 'No data returned from server';
        console.error('❌ API Error:', { errorMsg, message });
        setError(`${errorMsg} - ${message}`);
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

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Collection Management</h1>
            <p className="text-gray-600">Track and manage EMI collections</p>
          </div>
          
          <button
            onClick={() => fetchPaymentData()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors duration-200"
          >
            <span>🔄</span>
            Refresh Data
          </button>
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
            {currentUserOffice && currentUserOffice !== 'all' && (
              <p className="text-sm text-gray-600 mt-1">
                Filtered by office: <span className="font-medium">{currentUserOffice}</span>
              </p>
            )}
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
                  {formatCurrency(stats.todaysCollection)}
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
            {stats.todaysCollection > 0 && (
              <p className="text-sm font-medium text-green-700 mt-1">
                Total Collection: {formatCurrency(stats.todaysCollection)}
              </p>
            )}
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
                              <div className="text-xs text-green-600 font-medium mt-1">
                                Total Paid: {formatCurrency(customerTotal)}
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        {/* Payment Details */}
                        <td className="px-6 py-5">
                          <div className="space-y-2">
                            {customerPayments.map((payment, index) => (
                              <div key={payment._id || index} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                                <div>
                                  <span className="text-sm font-medium text-gray-900">
                                    Loan: {payment.loanNumber || 'N/A'}
                                  </span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    EMI: {formatCurrency(payment.emiAmount || 0)}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold text-green-600">
                                    {formatCurrency(payment.paidAmount || 0)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {payment.paymentMethod || 'Cash'}
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="pt-2 border-t border-gray-200 mt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-gray-800">Customer Total:</span>
                                <span className="text-lg font-bold text-blue-700">
                                  {formatCurrency(customerTotal)}
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
                              {firstPayment.officeCategory || currentUserOffice}
                            </span>
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Operator:</span> {firstPayment.operatorName || currentOperator.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">Date:</span> {new Date(firstPayment.paymentDate).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">Status:</span> 
                              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                firstPayment.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                firstPayment.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                                firstPayment.status === 'Advance' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {firstPayment.status || 'Paid'}
                              </span>
                            </div>
                          </div>
                        </td>
                        
                        {/* Actions */}
                        <td className="px-6 py-5 whitespace-nowrap">
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => {
                                console.log('View customer details:', customerId, firstPayment.customerName);
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
                Daily Total: {formatCurrency(stats.todaysCollection)}
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center">
              Last updated: {new Date().toLocaleTimeString()} • Operator: {currentOperator.name}
            </div>
          </div>
        </div>

        {/* Debug Info (Remove in production) */}
        {process.env.NODE_ENV === 'development' && payments.length > 0 && (
          <div className="mt-8 p-4 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono">
            <div className="font-bold mb-2">🔍 Debug Info:</div>
            <div>Total Payments: {payments.length}</div>
            <div>First Payment Sample: {JSON.stringify(payments[0], null, 2)}</div>
            <div>API Stats: {JSON.stringify(stats, null, 2)}</div>
          </div>
        )}
      </div>
    </div>
  );
}