'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Collection Component for Admin
function CollectionView({ onBack }: { onBack: () => void }) {
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectionData, setCollectionData] = useState<{
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
  } | null>(null);
  const [isLoadingCollection, setIsLoadingCollection] = useState(false);

  const fetchCollectionData = async (date: string) => {
    setIsLoadingCollection(true);
    try {
      console.log('🔄 Admin - Fetching collection data for date:', date);
      
      const response = await fetch(`/api/admin/collection?date=${date}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Admin Collection API response:', data);
        
        if (data.success && data.data) {
          setCollectionData(data.data);
          return;
        }
      }
      
      // Fallback to data-entry API if admin API fails
      console.log('📋 Falling back to data-entry collection API');
      const fallbackResponse = await fetch(`/api/data-entry/collection?date=${date}`);
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.success && fallbackData.data) {
          setCollectionData(fallbackData.data);
          return;
        }
      }
      
      // If both APIs fail, set empty data
      setCollectionData({
        date: date,
        customers: [],
        summary: {
          totalCollection: 0,
          office1Collection: 0,
          office2Collection: 0,
          totalCustomers: 0
        }
      });
      
    } catch (error) {
      console.error('❌ Error fetching collection data:', error);
      setCollectionData({
        date: date,
        customers: [],
        summary: {
          totalCollection: 0,
          office1Collection: 0,
          office2Collection: 0,
          totalCustomers: 0
        }
      });
    } finally {
      setIsLoadingCollection(false);
    }
  };

  useEffect(() => {
    fetchCollectionData(collectionDate);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-gray-600">← Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Collection Report</h1>
            <p className="text-gray-600">View EMI collections by date across all offices</p>
          </div>
        </div>
      </div>

      {/* Collection Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Daily Collection Report</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">View EMI collections by date across all offices</p>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input 
                  type="date"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={collectionDate}
                  onChange={(e) => {
                    setCollectionDate(e.target.value);
                    fetchCollectionData(e.target.value);
                  }}
                />
              </div>
              <button
                onClick={() => fetchCollectionData(collectionDate)}
                disabled={isLoadingCollection}
                className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isLoadingCollection ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200">
          {/* Summary Cards */}
          {collectionData && (
            <div className="px-4 py-5 sm:p-6 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Collection</dt>
                  <dd className="mt-1 text-2xl font-semibold text-green-600">
                    ₹{collectionData.summary?.totalCollection?.toLocaleString() || '0'}
                  </dd>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <dt className="text-sm font-medium text-gray-500 truncate">Office 1 Collection</dt>
                  <dd className="mt-1 text-2xl font-semibold text-blue-600">
                    ₹{collectionData.summary?.office1Collection?.toLocaleString() || '0'}
                  </dd>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <dt className="text-sm font-medium text-gray-500 truncate">Office 2 Collection</dt>
                  <dd className="mt-1 text-2xl font-semibold text-purple-600">
                    ₹{collectionData.summary?.office2Collection?.toLocaleString() || '0'}
                  </dd>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <dt className="text-sm font-medium text-gray-500 truncate">Customers Paid</dt>
                  <dd className="mt-1 text-2xl font-semibold text-orange-600">
                    {collectionData.summary?.totalCustomers || 0}
                  </dd>
                </div>
              </div>

              {/* Collection Table */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          EMI Collection
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Office
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {collectionData.customers && collectionData.customers.length > 0 ? (
                        collectionData.customers.map((customer, index) => (
                          <tr key={customer.customerId || index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {customer.customerNumber || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {customer.customerName || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                              ₹{(customer.totalCollection || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                customer.officeCategory === 'Office 1' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {customer.officeCategory || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center">
                            <div className="text-gray-400 text-4xl mb-4">💰</div>
                            <p className="text-gray-500 text-lg">No collections found for {collectionDate}</p>
                            <p className="text-sm text-gray-400 mt-2">
                              No EMI payments were recorded on this date
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Date Information */}
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Showing collections for: <strong>{new Date(collectionDate).toLocaleDateString('en-IN')}</strong>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Last updated: {new Date().toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          )}

          {!collectionData && !isLoadingCollection && (
            <div className="px-6 py-8 text-center">
              <div className="text-gray-400 text-4xl mb-4">📅</div>
              <p className="text-gray-500 text-lg">Select a date to view collection report</p>
              <p className="text-sm text-gray-400 mt-2">
                Choose a date and click Refresh to see EMI collections
              </p>
            </div>
          )}

          {isLoadingCollection && (
            <div className="px-6 py-8 text-center">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p className="text-gray-500">Loading collection data...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Loan Details Modal Component
// Loan Details Modal Component - UPDATED
function LoanDetailsModal({ stats, onClose }: { 
  stats: any;
  onClose: () => void;
}) {
  const [timeRange, setTimeRange] = useState('daily');
  const [loanData, setLoanData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLoanDetails = async (range: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/loan-details?range=${range}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLoanData(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching loan details:', error);
      setLoanData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanDetails(timeRange);
  }, [timeRange]);

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
  };

  // Calculate totals for the selected time range
  const calculateTotals = () => {
    const totalLoanAmount = loanData.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const totalRecoveredAmount = loanData.reduce((sum, item) => sum + (item.recoveredAmount || 0), 0);
    const totalAmountToRecover = totalLoanAmount - totalRecoveredAmount;
    const totalLoans = loanData.reduce((sum, item) => sum + (item.newLoans || 0), 0);

    return {
      totalLoanAmount,
      totalRecoveredAmount,
      totalAmountToRecover,
      totalLoans
    };
  };

  const totals = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Total Loan Amount Details</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Time Range Filter - UPDATED */}
          <div className="flex space-x-2 mb-6">
            {['daily', 'weekly', 'monthly'].map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>

          {/* Summary Cards - UPDATED */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-600">Total {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} Loans</p>
              <p className="text-2xl font-bold text-blue-900">{totals.totalLoans}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-600">Total Loan Amount</p>
              <p className="text-2xl font-bold text-green-900">₹{(totals.totalLoanAmount / 100000).toFixed(1)}L</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-purple-600">Total Recovered</p>
              <p className="text-2xl font-bold text-purple-900">₹{(totals.totalRecoveredAmount / 100000).toFixed(1)}L</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-sm font-medium text-orange-600">Amount to Recover</p>
              <p className="text-2xl font-bold text-orange-900">₹{(totals.totalAmountToRecover / 100000).toFixed(1)}L</p>
            </div>
          </div>

          {/* Loan Details Table */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} Loan Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">⏳</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Loading loan details...</h3>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        New Loans
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Recovered Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount to Recover
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loanData.map((item: any, index: number) => {
                      const amountToRecover = (item.totalAmount || 0) - (item.recoveredAmount || 0);
                      return (
                        <tr key={index}>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {item.date || item.week || item.month || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{item.newLoans || 0}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            ₹{((item.totalAmount || 0) / 100000).toFixed(1)}L
                          </td>
                          <td className="px-6 py-4 text-sm text-green-600">
                            ₹{((item.recoveredAmount || 0) / 100000).toFixed(1)}L
                          </td>
                          <td className="px-6 py-4 text-sm text-orange-600">
                            ₹{(amountToRecover / 100000).toFixed(1)}L
                          </td>
                        </tr>
                      );
                    })}
                    {loanData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                          No loan data available for {timeRange} range
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Reports Component with Charts
function EnhancedReportsView({ onBack }: { onBack: () => void }) {
  const [dateRange, setDateRange] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReportData = async (range: string, customStart?: string, customEnd?: string) => {
    try {
      setLoading(true);
      let url = `/api/admin/reports?range=${range}`;
      if (range === 'custom' && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReportData(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData(dateRange);
  }, [dateRange]);

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    if (range !== 'custom') {
      fetchReportData(range);
    }
  };

  const handleCustomDateApply = () => {
    if (startDate && endDate) {
      fetchReportData('custom', startDate, endDate);
    }
  };

  const PieChart = ({ data }: { data: Record<string, number> }) => {
    if (!data) return null;
    
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    
    let currentAngle = 0;
    
    return (
      <div className="relative w-48 h-48">
        <svg width="192" height="192" viewBox="0 0 32 32" className="transform -rotate-90">
          {Object.entries(data).map(([label, value], index) => {
            const percentage = (value / total) * 100;
            const angle = (value / total) * 360;
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const x1 = 16 + 16 * Math.cos(currentAngle * Math.PI / 180);
            const y1 = 16 + 16 * Math.sin(currentAngle * Math.PI / 180);
            const x2 = 16 + 16 * Math.cos((currentAngle + angle) * Math.PI / 180);
            const y2 = 16 + 16 * Math.sin((currentAngle + angle) * Math.PI / 180);
            
            const pathData = [
              `M 16 16`,
              `L ${x1} ${y1}`,
              `A 16 16 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');
            
            const segment = (
              <path
                key={label}
                d={pathData}
                fill={colors[index % colors.length]}
                stroke="#fff"
                strokeWidth="0.5"
              />
            );
            
            currentAngle += angle;
            return segment;
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-gray-600">← Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Advanced Reports & Analytics</h1>
            <p className="text-gray-600">Comprehensive business insights and performance metrics</p>
          </div>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex space-x-2">
            {['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'].map((range) => (
              <button
                key={range}
                onClick={() => handleDateRangeChange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <span className="self-center text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button 
                onClick={handleCustomDateApply}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">⏳</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading report data...</h3>
        </div>
      ) : reportData ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New Loans</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{reportData.newLoans || 0}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <span className="text-blue-600 text-xl">📈</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New Customers</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{reportData.newCustomers || 0}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <span className="text-green-600 text-xl">👥</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Collection</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">₹{(reportData.totalCollection || 0).toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <span className="text-purple-600 text-xl">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending EMIs</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">{reportData.pendingEMIs || 0}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <span className="text-red-600 text-xl">⏰</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Detailed Reports */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Growth Chart */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Growth Trend</h3>
              <div className="h-64 flex items-end justify-between space-x-2">
                {reportData.chartData && reportData.chartData.length > 0 ? (
                  reportData.chartData.map((value: number, index: number) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t-lg transition-all duration-300 hover:bg-blue-600"
                        style={{ height: `${(value / Math.max(...reportData.chartData)) * 200}px` }}
                      ></div>
                      <span className="text-xs text-gray-500 mt-2">{value}</span>
                    </div>
                  ))
                ) : (
                  <div className="w-full text-center py-8 text-gray-500">
                    No chart data available
                  </div>
                )}
              </div>
            </div>

            {/* Loan Distribution */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Type Distribution</h3>
              {reportData.loanDistribution ? (
                <>
                  <div className="h-64 flex items-center justify-center">
                    <PieChart data={reportData.loanDistribution} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {(Object.entries(reportData.loanDistribution) as [string, number][]).map(([type, percentage], index) => (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{type}</span>
                          <span className="font-medium text-gray-900">
                            {typeof percentage === 'number' ? percentage.toFixed(1) : percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'][index % 5]
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No distribution data available
                </div>
              )}
            </div>
          </div>

          {/* Detailed Report Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Report</h3>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Loans</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Customers</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collection</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending EMIs</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Growth Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{reportData.newLoans || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{reportData.newCustomers || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">₹{(reportData.totalCollection || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-red-600">{reportData.pendingEMIs || 0}</td>
                      <td className="px-6 py-4 text-sm text-green-600">+{reportData.growthRate || 0}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No report data available</h3>
          <p className="text-gray-600">Try selecting a different date range.</p>
        </div>
      )}
    </div>
  );
}

// Team Management Component
// Team Management Component - UPDATED
function TeamManagementView({ onBack }: { onBack: () => void }) {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showDataEntryModal, setShowDataEntryModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/team-members', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTeamMembers(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/team-members?memberId=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        alert('Team member deleted successfully!');
        fetchTeamMembers();
      } else {
        alert(`Error deleting team member: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error deleting team member:', error);
      alert('Error deleting team member: ' + error.message);
    }
  };

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    if (member.role === 'Recovery Team') {
      setShowRecoveryModal(true);
    } else {
      setShowDataEntryModal(true);
    }
  };

  const handleAddRecoveryMember = () => {
    setEditingMember(null);
    setShowRecoveryModal(true);
  };

  const handleAddDataEntryMember = () => {
    setEditingMember(null);
    setShowDataEntryModal(true);
  };

  const handleSaveMember = async (memberData: any, isRecovery: boolean) => {
    try {
      const url = '/api/admin/team-members';
      const method = editingMember ? 'PUT' : 'POST';
      
      const role = isRecovery ? 'Recovery Team' : 'Data Entry Operator';
      const requestBody = editingMember ? 
        { ...memberData, memberId: editingMember._id, role } : 
        { ...memberData, role };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (response.ok) {
        alert(editingMember ? 'Team member updated successfully!' : 'Team member added successfully!');
        fetchTeamMembers();
        setShowRecoveryModal(false);
        setShowDataEntryModal(false);
        setEditingMember(null);
      } else {
        alert(`Error: ${responseData.error || responseData.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert('Error saving team member: ' + (error.message || 'Check console for details'));
    }
  };

  // Filter team members by role
  const recoveryTeamMembers = teamMembers.filter(member => member.role === 'Recovery Team');
  const dataEntryOperators = teamMembers.filter(member => member.role === 'Data Entry Operator');

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
              <h1 className="text-2xl font-bold">Team Management</h1>
              <p className="text-blue-100 mt-1">Manage your team members and their roles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recovery Team Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Recovery Team</h3>
              <p className="text-gray-600 mt-1">Manage recovery team members who handle loan recovery operations</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-xl">💰</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Members</span>
              <span className="text-lg font-semibold text-gray-900">{recoveryTeamMembers.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Members</span>
              <span className="text-lg font-semibold text-green-600">
                {recoveryTeamMembers.filter(m => m.status === 'active').length}
              </span>
            </div>
          </div>

          <button 
            onClick={handleAddRecoveryMember}
            className="w-full mt-6 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Add Recovery Team Member
          </button>
        </div>

        {/* Data Entry Operator Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Data Entry Operators</h3>
              <p className="text-gray-600 mt-1">Manage operators who handle customer data entry and management</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-xl">📊</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Operators</span>
              <span className="text-lg font-semibold text-gray-900">{dataEntryOperators.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Operators</span>
              <span className="text-lg font-semibold text-green-600">
                {dataEntryOperators.filter(m => m.status === 'active').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Office Categories</span>
              <span className="text-lg font-semibold text-purple-600">
                {[...new Set(dataEntryOperators.map(m => m.officeCategory).filter(Boolean))].length}
              </span>
            </div>
          </div>

          <button 
            onClick={handleAddDataEntryMember}
            className="w-full mt-6 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Add Data Entry Operator
          </button>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Team Members</h3>
          <p className="text-gray-600 mt-1">Manage existing team members and their permissions</p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">⏳</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading team members...</h3>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        member.role === 'Recovery Team' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <span className={`font-semibold text-sm ${
                          member.role === 'Recovery Team' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {member.name.split(' ').map((n: string) => n[0]).join('')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-semibold text-gray-900">{member.name}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.role === 'Recovery Team' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {member.role}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {member.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-600">{member.phone}</p>
                        {member.officeCategory && (
                          <p className="text-sm text-gray-600">
                            Office: <span className="font-medium">{member.officeCategory}</span>
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          Joined: {member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleEditMember(member)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteMember(member._id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              
              {teamMembers.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">👥</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
                  <p className="text-gray-600">Add your first team member using the cards above.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recovery Team Member Modal */}
      {showRecoveryModal && (
        <RecoveryTeamModal
          member={editingMember}
          onSave={(data) => handleSaveMember(data, true)}
          onClose={() => {
            setShowRecoveryModal(false);
            setEditingMember(null);
          }}
        />
      )}

      {/* Data Entry Operator Modal */}
      {showDataEntryModal && (
        <DataEntryOperatorModal
          member={editingMember}
          onSave={(data) => handleSaveMember(data, false)}
          onClose={() => {
            setShowDataEntryModal(false);
            setEditingMember(null);
          }}
        />
      )}
    </div>
  );
}

// Recovery Team Member Modal Component - UPDATED WIDTH
function RecoveryTeamModal({ member, onSave, onClose }: { 
  member: any; 
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: member?.name || '',
    phone: member?.phone || '',
    whatsappNumber: member?.whatsappNumber || '',
    email: member?.email || '',
    address: member?.address || '',
    username: member?.username || '',
    password: member?.password || '',
    confirmPassword: '',
    status: member?.status || 'active'
  });

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword();
    setFormData({
      ...formData,
      password: newPassword,
      confirmPassword: newPassword
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!member && formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (!member && !formData.password) {
      alert('Please generate or enter a password!');
      return;
    }

    const { confirmPassword, ...saveData } = formData;
    onSave(saveData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"> {/* UPDATED WIDTH */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {member ? 'Edit Recovery Team Member' : 'Add Recovery Team Member'}
            </h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                  placeholder="Choose a unique username"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                  placeholder="WhatsApp number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                placeholder="Email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                placeholder="Full address"
              />
            </div>

            {/* Password Section */}
            {!member && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-lg font-medium text-gray-700">
                    Login Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 font-medium"
                  >
                    Generate Password
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                      placeholder="Click generate or enter password"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>

                {formData.password && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium">
                      <strong>Important:</strong> Save this password securely. It will be shown only once.
                    </p>
                    <p className="text-sm text-yellow-700 mt-2">
                      Generated Password: <span className="font-mono bg-yellow-100 px-2 py-1 rounded">{formData.password}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-lg"
              >
                {member ? 'Update' : 'Create'} Member
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Data Entry Operator Modal Component - UPDATED WIDTH
function DataEntryOperatorModal({ member, onSave, onClose }: { 
  member: any; 
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: member?.name || '',
    phone: member?.phone || '',
    whatsappNumber: member?.whatsappNumber || '',
    email: member?.email || '',
    address: member?.address || '',
    officeCategory: member?.officeCategory || 'Office 1',
    username: member?.username || '',
    password: member?.password || '',
    confirmPassword: '',
    status: member?.status || 'active'
  });

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword();
    setFormData({
      ...formData,
      password: newPassword,
      confirmPassword: newPassword
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!member && formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (!member && !formData.password) {
      alert('Please generate or enter a password!');
      return;
    }

    const { confirmPassword, ...saveData } = formData;
    onSave(saveData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"> {/* UPDATED WIDTH */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {member ? 'Edit Data Entry Operator' : 'Add Data Entry Operator'}
            </h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="Choose a unique username"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="WhatsApp number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="Email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="Full address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Office Category *
                </label>
                <select
                  required
                  value={formData.officeCategory}
                  onChange={(e) => setFormData({ ...formData, officeCategory: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                >
                  <option value="Office 1">Office 1</option>
                  <option value="Office 2">Office 2</option>
                  <option value="Office 3">Office 3</option>
                  <option value="Head Office">Head Office</option>
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  This determines which customers the operator can access
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Password Section */}
            {!member && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-lg font-medium text-gray-700">
                    Login Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 font-medium"
                  >
                    Generate Password
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      placeholder="Click generate or enter password"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                      placeholder="Confirm password"
                    />
                  </div>
                </div>

                {formData.password && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium">
                      <strong>Important:</strong> Save this password securely. It will be shown only once.
                    </p>
                    <p className="text-sm text-yellow-700 mt-2">
                      Generated Password: <span className="font-mono bg-yellow-100 px-2 py-1 rounded">{formData.password}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg"
              >
                {member ? 'Update' : 'Create'} Operator
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Recent Activities Component
function RecentActivities() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [timeFilter, setTimeFilter] = useState('24h');

  const fetchActivities = async (filter = '24h', showAll = false) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/recent-activities?filter=${filter}&showAll=${showAll}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setActivities(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(timeFilter, showAllActivities);
  }, [timeFilter, showAllActivities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'customer': return '👤';
      case 'loan': return '💰';
      case 'emi': return '📊';
      case 'team': return '👥';
      case 'login': return '🔐';
      case 'approval': return '✅';
      case 'rejection': return '❌';
      default: return '📝';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'customer': return 'bg-blue-100 text-blue-800';
      case 'loan': return 'bg-green-100 text-green-800';
      case 'emi': return 'bg-purple-100 text-purple-800';
      case 'team': return 'bg-orange-100 text-orange-800';
      case 'login': return 'bg-gray-100 text-gray-800';
      case 'approval': return 'bg-green-100 text-green-800';
      case 'rejection': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityDate = new Date(timestamp);
    const diff = now.getTime() - activityDate.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const handleTimeFilterChange = (filter: string) => {
    setTimeFilter(filter);
  };

  const handleViewAllClick = () => {
    setShowAllActivities(true);
  };

  const handleBackToRecent = () => {
    setShowAllActivities(false);
    setTimeFilter('24h');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {showAllActivities ? 'All Activities' : 'Recent Activities'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {showAllActivities 
                ? 'Complete activity log from all team members' 
                : 'Latest actions from all team members'
              }
            </p>
          </div>
          
          {showAllActivities && (
            <button 
              onClick={handleBackToRecent}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Recent
            </button>
          )}
        </div>

        {/* Time Filter */}
        {showAllActivities && (
          <div className="flex space-x-2 mt-4">
            {[
              { value: '24h', label: '24 Hours' },
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
              { value: 'all', label: 'All Time' }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleTimeFilterChange(filter.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium ${
                  timeFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-6">
        {loading ? (
          <div className="text-center py-4">
            <div className="text-gray-400 text-2xl mb-2">⏳</div>
            <p className="text-gray-600">Loading activities...</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activities.map((activity) => (
              <div key={activity._id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm">
                  <span className={getActivityIcon(activity.type)}></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.userName || activity.user}</span> {activity.action}{' '}
                      {activity.target && (
                        <span className="font-medium text-blue-600">{activity.target}</span>
                      )}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActivityColor(activity.type)}`}>
                      {activity.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {activity.role && `Role: ${activity.role} • `}
                      {getTimeAgo(activity.timestamp)}
                    </p>
                    {activity.details && (
                      <p className="text-xs text-gray-400">{activity.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {activities.length === 0 && (
              <div className="text-center py-4">
                <div className="text-gray-400 text-2xl mb-2">📝</div>
                <p className="text-gray-600">No activities found</p>
                <p className="text-sm text-gray-500 mt-1">Activities will appear here when team members perform actions.</p>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 flex justify-between items-center">
          {!showAllActivities && (
            <button 
              onClick={handleViewAllClick}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All Activities →
            </button>
          )}
          
          <button 
            onClick={() => fetchActivities(timeFilter, showAllActivities)}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

// Enhanced Customer Details View Component with FI Documents
function CustomerDetailsView({ customer, onBack, onDelete }: { 
  customer: any; 
  onBack: () => void;
  onDelete: (customerId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState('loan-details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  // Function to handle document download
  const handleDownload = (documentUrl: string, documentType: string) => {
    if (documentUrl) {
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = `${customer.name}_${documentType}.pdf`;
      link.click();
    } else {
      alert('Document not available');
    }
  };

  // Function to handle document share via WhatsApp
  const handleShareWhatsApp = (documentUrl: string, documentType: string) => {
    if (documentUrl) {
      const message = `FI Document for ${customer.name} - ${documentType}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message + ' ' + documentUrl)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      alert('Document not available for sharing');
    }
  };

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
                <h1 className="text-2xl font-bold">{customer.name}</h1>
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {customer.customerNumber}
                </span>
              </div>
              <div className="flex items-center space-x-4 mt-2">
                <p className="text-blue-100">{customer.businessName}</p>
                <span className="text-blue-200">•</span>
                <p className="text-blue-100">{customer.area}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              customer.status === 'active' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}>
              {customer.status === 'active' ? 'Active' : 'Inactive'}
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

      {/* Tabs - Added FI Documents */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('loan-details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'loan-details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Loan Details
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
      {activeTab === 'loan-details' && (
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
                    <p className="text-lg font-semibold text-gray-900">{customer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Business Name</p>
                    <p className="text-lg font-semibold text-gray-900">{customer.businessName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Primary Phone Number</p>
                    <p className="text-lg font-semibold text-gray-900">{customer.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Secondary Phone Number</p>
                    <p className="text-lg font-semibold text-gray-900">{customer.secondaryPhone || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">WhatsApp Number</p>
                    <p className="text-lg font-semibold text-gray-900">{customer.whatsappNumber || customer.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Address</p>
                    <p className="text-lg font-semibold text-gray-900">{customer.address || 'No address provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Area</p>
                    <p className="text-lg font-semibold text-gray-900">{customer.area}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Office Category & Category</p>
                    <div className="flex space-x-2 mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {customer.officeCategory || 'N/A'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.category === 'A' ? 'bg-green-100 text-green-800' :
                        customer.category === 'B' ? 'bg-yellow-100 text-yellow-800' :
                        customer.category === 'C' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {customer.category || 'Not specified'}
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
              <h3 className="text-lg font-semibold text-gray-900">Loan Details</h3>
            </div>
            <div className="p-6">
              {/* Single Loan Display */}
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold text-gray-900">Loan Details</h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Loan Number</p>
                      <p className="text-lg font-semibold text-gray-900">{customer.loanNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Loan Amount</p>
                      <p className="text-lg font-semibold text-green-600">₹{customer.loanAmount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">EMI Amount</p>
                      <p className="text-lg font-semibold text-blue-600">₹{customer.emiAmount}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Loan Type</p>
                      <p className="text-lg font-semibold text-gray-900">{customer.loanType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Loan Date</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {customer.loanDate ? new Date(customer.loanDate).toLocaleDateString() : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Loan Duration</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {customer.loanDays ? `${customer.loanDays} days` : 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Additional loans can be added here in similar structure */}
                {customer.additionalLoans && customer.additionalLoans.map((loan: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-semibold text-gray-900">Loan {index + 2}</h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Additional
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Loan Number</p>
                        <p className="text-lg font-semibold text-gray-900">{loan.loanNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Loan Amount</p>
                        <p className="text-lg font-semibold text-green-600">₹{loan.loanAmount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">EMI Amount</p>
                        <p className="text-lg font-semibold text-blue-600">₹{loan.emiAmount}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transaction-history' && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
          </div>
          <div className="p-6">
            {customer.transactions && customer.transactions.length > 0 ? (
              <div className="space-y-4">
                {customer.transactions.map((transaction: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-600">EMI Payment</p>
                        <p className="text-lg font-semibold text-green-600">₹{transaction.amount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-600">Date</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {transaction.notes && (
                      <p className="text-sm text-gray-500 mt-2">{transaction.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-600">Transaction history will appear here when EMI payments are made.</p>
              </div>
            )}
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
                      onClick={() => handleDownload(customer.fiDocuments?.shop, 'Shop_FI')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Download
                    </button>
                    <button 
                      onClick={() => handleShareWhatsApp(customer.fiDocuments?.shop, 'Shop FI Document')}
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
                      onClick={() => handleDownload(customer.fiDocuments?.home, 'Home_FI')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Download
                    </button>
                    <button 
                      onClick={() => handleShareWhatsApp(customer.fiDocuments?.home, 'Home FI Document')}
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
                    customer.fiDocuments?.shop ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {customer.fiDocuments?.shop ? 'Uploaded' : 'Not Uploaded'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <span className="text-gray-700">Home FI Document</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    customer.fiDocuments?.home ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {customer.fiDocuments?.home ? 'Uploaded' : 'Not Uploaded'}
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

// Enhanced Pending Requests Component with Filters
function PendingRequestsView({ 
  requests, 
  onApprove, 
  onReject, 
  onBack
}: { 
  requests: any[]; 
  onApprove: (request: any) => void;
  onReject: (request: any) => void;
  onBack: () => void;
}) {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [filters, setFilters] = useState({
    requestType: '',
    status: '',
    operator: '',
    sortBy: 'newest'
  });

  const handleViewEdit = (request: any) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsViewModalOpen(false);
    setSelectedRequest(null);
  };

  const handleApproveFromModal = () => {
    if (selectedRequest) {
      onApprove(selectedRequest);
      handleCloseModal();
    }
  };

  const handleRejectFromModal = () => {
    if (selectedRequest) {
      onReject(selectedRequest);
      handleCloseModal();
    }
  };

  // Filter and sort requests
  const filteredAndSortedRequests = requests
    .filter(request => {
      const matchesType = !filters.requestType || request.type === filters.requestType;
      const matchesStatus = !filters.status || request.status === filters.status;
      const matchesOperator = !filters.operator || request.createdBy === filters.operator;
      return matchesType && matchesStatus && matchesOperator;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
    });

  // Get unique values for filters
  const requestTypes = [...new Set(requests.map(r => r.type))];
  const operators = [...new Set(requests.map(r => r.createdBy).filter(Boolean))];

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      requestType: '',
      status: '',
      operator: '',
      sortBy: 'newest'
    });
  };

  // Helper function to format field names
  const formatFieldName = (field: string) => {
    return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  // Helper function to display field value
  const renderFieldValue = (label: string, value: any) => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }
    
    // Format currency fields
    if (label.toLowerCase().includes('amount')) {
      return `₹${Number(value).toLocaleString()}`;
    }
    
    // Format dates
    if (label.toLowerCase().includes('date') && !isNaN(Date.parse(value))) {
      return new Date(value).toLocaleDateString();
    }
    
    return String(value);
  };

  // Get all customer details for display - FIXED VERSION
  const getCustomerDetails = (request: any) => {
    console.log('🔍 Full Request data:', request);
    
    // For NEW customer requests, data is in request.requestedData
    if (request.type === 'New Customer' && request.requestedData) {
      console.log('📊 Requested Data found:', request.requestedData);
      return request.requestedData;
    }
    
    // For EDIT requests, show both original and changed data
    if (request.type === 'EDIT' && request.changes) {
      return {
        ...request.originalData,
        ...request.changes
      };
    }
    
    // Fallback: try to extract from any possible location
    const extractedData = {
      ...request.requestedData,
      ...request.data,
      ...request
    };
    
    console.log('🔄 Extracted data:', extractedData);
    return extractedData;
  };

  // Render detailed customer information - FIXED VERSION
  const renderCustomerDetails = (request: any) => {
    const customerData = getCustomerDetails(request);
    
    console.log('📊 Final customer data for display:', customerData);
    
    // Field mappings based on the actual data structure from data-entry
    const customerFields = [
      { 
        label: 'Customer Name', 
        value: customerData.name || customerData.customerName || request.customerName
      },
      { 
        label: 'Phone Number', 
        value: customerData.phone || customerData.customerPhone || request.customerPhone
      },
      { 
        label: 'Business Name', 
        value: customerData.businessName || request.businessName
      },
      { 
        label: 'Area', 
        value: customerData.area || request.area
      },
      { 
        label: 'Address', 
        value: customerData.address || request.address
      },
      { 
        label: 'Login ID', 
        value: customerData.loginId || 'Will be generated after approval'
      },
    ];

    const loanFields = [
      { 
        label: 'Loan Number', 
        value: customerData.loanNumber || request.loanNumber
      },
      { 
        label: 'Loan Amount', 
        value: customerData.loanAmount || request.loanAmount
      },
      { 
        label: 'EMI Amount', 
        value: customerData.emiAmount || request.emiAmount
      },
      { 
        label: 'Loan Type', 
        value: customerData.loanType || request.loanType
      },
      { 
        label: 'Loan Date', 
        value: customerData.loanDate || 'Not specified'
      },
      { 
        label: 'Loan Duration', 
        value: customerData.loanDays ? `${customerData.loanDays} days` : 'Not specified'
      },
    ];

    // File upload information
    const fileFields = [
      {
        label: 'Profile Picture',
        value: customerData.profilePicture ? 'Uploaded' : 'Not uploaded'
      },
      {
        label: 'FI Document - Shop',
        value: customerData.fiDocuments?.shop ? 'Uploaded' : 'Not uploaded'
      },
      {
        label: 'FI Document - Home', 
        value: customerData.fiDocuments?.home ? 'Uploaded' : 'Not uploaded'
      }
    ];

    // For EDIT requests, show comparison view
    if (request.type === 'EDIT' && request.changes) {
      return (
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">Edit Request - Changes Summary</h3>
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(request.changes).map(([field, newValue]: [string, any]) => (
                <div key={field} className="p-3 bg-white rounded-lg border border-yellow-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-700">{formatFieldName(field)}</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Changed
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Original Value</p>
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700">
                        {renderFieldValue(field, request.originalData?.[field])}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Requested Change</p>
                      <div className="p-2 bg-green-50 border border-green-200 rounded text-green-700 font-semibold">
                        {renderFieldValue(field, newValue)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Customer Information */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customerFields.map((field, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">{field.label}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {renderFieldValue(field.label, field.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loan Details */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
            <h3 className="text-lg font-semibold text-gray-900">Loan Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loanFields.map((field, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">{field.label}</p>
                  <p className={`text-lg font-semibold ${
                    field.label.includes('Amount') ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    {renderFieldValue(field.label, field.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* File Uploads */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-purple-50">
            <h3 className="text-lg font-semibold text-gray-900">Document Uploads</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {fileFields.map((field, index) => (
                <div key={index} className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">{field.label}</p>
                  <p className={`text-lg font-semibold ${
                    field.value === 'Uploaded' ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">Request Information</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Request ID</p>
                <p className="text-lg font-semibold text-gray-900 font-mono text-sm">{request._id}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Created Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {request.createdAt ? new Date(request.createdAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Created By</p>
                <p className="text-lg font-semibold text-gray-900">{request.createdBy || 'Data Entry Operator'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Priority</p>
                <p className="text-lg font-semibold text-gray-900">{request.priority || 'Medium'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-gray-600">← Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pending Requests</h1>
            <p className="text-gray-600">Approve or reject customer requests</p>
          </div>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          {filteredAndSortedRequests.length} Pending
        </span>
      </div>

      {/* Filters Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Request Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.requestType}
                onChange={(e) => handleFilterChange('requestType', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="New Customer">New Customer</option>
                <option value="EDIT">Edit Request</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </div>

            {/* Operator Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operator
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.operator}
                onChange={(e) => handleFilterChange('operator', e.target.value)}
              >
                <option value="">All Operators</option>
                {operators.map(operator => (
                  <option key={operator} value={operator}>{operator}</option>
                ))}
              </select>
            </div>

            {/* Sort By Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By Date
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.requestType || filters.status || filters.operator || filters.sortBy !== 'newest') && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Active filters:</span>
                {filters.requestType && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    Type: {filters.requestType}
                    <button 
                      onClick={() => handleFilterChange('requestType', '')}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    Status: {filters.status}
                    <button 
                      onClick={() => handleFilterChange('status', '')}
                      className="ml-1 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.operator && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    Operator: {filters.operator}
                    <button 
                      onClick={() => handleFilterChange('operator', '')}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.sortBy !== 'newest' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                    Sort: {filters.sortBy === 'oldest' ? 'Oldest First' : 'Newest First'}
                    <button 
                      onClick={() => handleFilterChange('sortBy', 'newest')}
                      className="ml-1 text-orange-600 hover:text-orange-800"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6">
          <div className="space-y-4">
            {filteredAndSortedRequests.map((request) => (
              <div key={request._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        request.type === 'EDIT' ? 'bg-purple-100' : 'bg-blue-100'
                      }`}>
                        <span className={`font-semibold text-sm ${
                          request.type === 'EDIT' ? 'text-purple-600' : 'text-blue-600'
                        }`}>
                          {request.customerName?.split(' ').map((n: string) => n[0]).join('') || 'NC'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {request.customerName || 'Unknown Customer'}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          request.type === 'EDIT' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {request.type === 'EDIT' ? 'EDIT Request' : 'New Customer'}
                        </span>
                        <span className="text-xs text-gray-500">
                          #{request.customerNumber || 'N/A'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {request.type === 'EDIT' ? 'Customer Update' : 'New Registration'} • 
                        Created: {new Date(request.createdAt).toLocaleDateString()} •
                        By: {request.createdBy || 'Unknown Operator'}
                      </p>
                      
                      {/* Quick summary */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          Phone: {request.customerPhone || request.requestedData?.phone || 'N/A'}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          Loan: ₹{((request.loanAmount || request.requestedData?.loanAmount || 0)).toLocaleString()}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          EMI: ₹{((request.emiAmount || request.requestedData?.emiAmount || 0)).toLocaleString()}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {request.loanType || request.requestedData?.loanType || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* View Button */}
                  <button 
                    onClick={() => handleViewEdit(request)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      request.type === 'EDIT' 
                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    View Details
                  </button>
                  
                  <button 
                    onClick={() => onApprove(request)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => onReject(request)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
            
            {filteredAndSortedRequests.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">✅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
                <p className="text-gray-600">All requests have been processed.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {isViewModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedRequest.type === 'EDIT' ? 'Edit Request Details' : 'New Customer Request'}
                </h2>
                <button 
                  onClick={handleCloseModal} 
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Request Type Badge */}
              <div className="mb-6">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  selectedRequest.type === 'EDIT' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedRequest.type === 'EDIT' ? 'EDIT REQUEST' : 'NEW CUSTOMER REQUEST'}
                </span>
              </div>
              
              {/* Customer Details */}
              {renderCustomerDetails(selectedRequest)}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button 
                  onClick={handleRejectFromModal}
                  className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  Reject Request
                </button>
                <button 
                  onClick={handleApproveFromModal}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
                >
                  Approve Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [dashboardStats, setDashboardStats] = useState({
  totalLoans: 0,
  totalAmount: 0,
  totalCustomers: 0,
  totalTeamMembers: 0, // ADD THIS LINE
  pendingRequests: 0
})
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
  customerNumber: '',
  loanType: '',
  status: '',
  officeCategory: '',
  category: '' // Add category filter
});

  // Sort state
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [loading, setLoading] = useState(true)
  const [showLoanDetails, setShowLoanDetails] = useState(false)

  // Enhanced filtered and sorted customers calculation
  const filteredAndSortedCustomers = customers
    .filter(customer => {
      const matchesSearch = searchTerm === '' || 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm);

      const matchesCustomerNumber = filters.customerNumber === '' || 
        (customer.customerNumber && customer.customerNumber.toLowerCase().includes(filters.customerNumber.toLowerCase()));
      
      const matchesLoanType = filters.loanType === '' || 
        customer.loanType === filters.loanType;
      
      const matchesStatus = filters.status === '' || 
        customer.status === filters.status;

      const matchesOfficeCategory = filters.officeCategory === '' || 
        customer.officeCategory === filters.officeCategory;

      const matchesCategory = filters.category === '' || 
        customer.category === filters.category;

      return matchesSearch && matchesCustomerNumber && matchesLoanType && matchesStatus && matchesOfficeCategory && matchesCategory;
    })
    .sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.customerNumber.localeCompare(b.customerNumber);
      } else {
        return b.customerNumber.localeCompare(a.customerNumber);
      }
    });

  // Fetch real data
  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDashboardStats(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/admin/customers')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setCustomers(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      setCustomers([])
    }
  }

 const fetchPendingRequests = async () => {
  try {
    console.log('🟡 Super Admin - Fetching pending requests...');
    
    const response = await fetch('/api/admin/requests');
    
    if (!response.ok) {
      console.log('❌ Admin requests failed, trying data-entry endpoint...');
      const fallbackResponse = await fetch('/api/data-entry/requests');
      
      if (!fallbackResponse.ok) {
        throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      console.log('🔵 Data-entry requests response STRUCTURE:', fallbackData);
      
      // Log the first request to see its structure
      if (fallbackData.success && Array.isArray(fallbackData.data?.requests)) {
        console.log('📊 First request object:', JSON.stringify(fallbackData.data.requests[0], null, 2));
        setPendingRequests(fallbackData.data.requests);
      } else {
        setPendingRequests([]);
      }
      return;
    }

    const data = await response.json();
    console.log('🔵 Admin requests response STRUCTURE:', data);
    
    // Log the first request to see its structure
    if (data.success) {
      let requestsArray = [];
      
      if (Array.isArray(data.data)) {
        requestsArray = data.data;
      } else if (Array.isArray(data.data?.requests)) {
        requestsArray = data.data.requests;
      } else if (Array.isArray(data.requests)) {
        requestsArray = data.requests;
      }
      
      if (requestsArray.length > 0) {
        console.log('📊 First request object:', JSON.stringify(requestsArray[0], null, 2));
      }
      
      setPendingRequests(requestsArray);
    }
    
  } catch (error) {
    console.error('❌ Error fetching requests:', error);
    setPendingRequests([]);
  }
};

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchDashboardData(),
        fetchCustomers(),
        fetchPendingRequests()
      ])
      setLoading(false)
    }
    loadData()
  }, [activeTab])

  // Handle request approval - FIXED VERSION
  const handleApproveRequest = async (request: any) => {
    try {
      console.log('🟡 Approving request:', request._id);
      console.log('📊 Request type:', request.type);
      
      // For both NEW and EDIT requests, just call the approve endpoint
      // The backend will handle customer creation/activation automatically
      console.log('📨 Sending approval request to backend...');
      
      const approveResponse = await fetch('/api/admin/approve-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request._id,
          action: 'approve'
        }),
      });

      const approveData = await approveResponse.json();
      console.log('🔵 Approve request response:', approveData);
      
      if (approveResponse.ok && approveData.success) {
        alert('Request approved successfully!');
        await Promise.all([
          fetchDashboardData(),
          fetchCustomers(),
          fetchPendingRequests()
        ]);
      } else {
        alert(`Error approving request: ${approveData.error || 'Unknown error'}`);
        console.log('❌ Approval failed details:', approveData);
      }
    } catch (error: any) {
      console.error('❌ Error approving request:', error);
      alert('Error approving request: ' + (error.message || 'Check console for details'));
    }
  };

  // Handle request rejection - FIXED VERSION
  const handleRejectRequest = async (request: any) => {
    try {
      console.log('🟡 Rejecting request:', request._id);
      
      const response = await fetch('/api/admin/approve-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request._id,
          action: 'reject',
          reason: 'Rejected by admin'
        }),
      });

      const data = await response.json();
      console.log('🔵 Reject response:', data);

      if (response.ok && data.success) {
        alert('Request rejected successfully!');
        // Refresh data
        await Promise.all([
          fetchDashboardData(),
          fetchPendingRequests()
        ]);
      } else {
        alert(`Error rejecting request: ${data.error || data.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('❌ Error rejecting request:', error);
      alert('Error rejecting request: ' + (error.message || 'Check console for details'));
    }
  };

  // Handle customer deletion
  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/customers', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Customer deleted successfully!');
        
        // Refresh data
        fetchCustomers();
        fetchDashboardData();
        
        // Go back to customers list
        setSelectedCustomer(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete customer');
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  // Handler functions
  const handleViewDetails = (customer: any) => {
    setSelectedCustomer(customer)
  }

  const handleBackToDashboard = () => {
    setSelectedCustomer(null)
  }

  const handleLogout = () => {
    router.push('/auth');
  }

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  // Enhanced Search and Filters function with Sort Button
  const renderSearchAndFilters = () => {
  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      customerNumber: '',
      loanType: '',
      status: '',
      officeCategory: '',
      category: ''
    });
    setSearchTerm('');
    setSortOrder('asc');
  };

  const loanTypes = [...new Set(customers.map(customer => customer.loanType).filter(Boolean))];
  const officeCategories = [...new Set(customers.map(customer => customer.officeCategory).filter(Boolean))];
  const customerCategories = [...new Set(customers.map(customer => customer.category).filter(Boolean))];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by customer name or customer number..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Sort Button */}
          <button
            onClick={toggleSortOrder}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span>Sort</span>
            <span className={`transform ${sortOrder === 'asc' ? '' : 'rotate-180'}`}>
              ↓
            </span>
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span>Filters</span>
            <span className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          
          {(filters.customerNumber || filters.loanType || filters.status || filters.officeCategory || filters.category || searchTerm || sortOrder !== 'asc') && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Customer Number Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Number
              </label>
              <input
                type="text"
                placeholder="Enter customer number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.customerNumber}
                onChange={(e) => handleFilterChange('customerNumber', e.target.value)}
              />
            </div>

            {/* Loan Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loan Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.loanType}
                onChange={(e) => handleFilterChange('loanType', e.target.value)}
              >
                <option value="">All Loan Types</option>
                {loanTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Office Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Office Category
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.officeCategory}
                onChange={(e) => handleFilterChange('officeCategory', e.target.value)}
              >
                <option value="">All Offices</option>
                {officeCategories.map(office => (
                  <option key={office} value={office}>{office}</option>
                ))}
              </select>
            </div>

            {/* Category Filter - NEW */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="A">Category A</option>
                <option value="B">Category B</option>
                <option value="C">Category C</option>
                {customerCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.customerNumber || filters.loanType || filters.status || filters.officeCategory || filters.category || sortOrder !== 'asc') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Active filters:</span>
                {filters.customerNumber && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    Customer No: {filters.customerNumber}
                    <button 
                      onClick={() => handleFilterChange('customerNumber', '')}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.loanType && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    Type: {filters.loanType}
                    <button 
                      onClick={() => handleFilterChange('loanType', '')}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.status && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    Status: {filters.status}
                    <button 
                      onClick={() => handleFilterChange('status', '')}
                      className="ml-1 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.officeCategory && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                    Office: {filters.officeCategory}
                    <button 
                      onClick={() => handleFilterChange('officeCategory', '')}
                      className="ml-1 text-orange-600 hover:text-orange-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.category && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
                    Category: {filters.category}
                    <button 
                      onClick={() => handleFilterChange('category', '')}
                      className="ml-1 text-indigo-600 hover:text-indigo-800"
                    >
                      ×
                    </button>
                  </span>
                )}
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                  Sort: {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                  <button 
                    onClick={() => setSortOrder('asc')}
                    className="ml-1 text-gray-600 hover:text-gray-800"
                  >
                    ×
                  </button>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">
          Showing {filteredAndSortedCustomers.length} of {customers.length} customers
          {sortOrder === 'asc' ? ' (A-Z)' : ' (Z-A)'}
        </span>
        
        {(filteredAndSortedCustomers.length < customers.length || sortOrder !== 'asc') && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
};

  // Navigation Tabs - Mobile Scrollable
  const renderNavigation = () => (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Menu - Horizontal Scroll */}
        <div className="sm:hidden">
          <div className="relative">
            <div className="overflow-x-auto scrollbar-hide">
              <nav className="flex space-x-4 px-4 py-3 min-w-max">
                {[
                  { id: 'dashboard', label: 'Dashboard' },
                  { id: 'customers', label: 'Customers' },
                  { id: 'requests', label: 'Requests' },
                  { id: 'reports', label: 'Reports' },
                  { id: 'team', label: 'Team' },
                  { id: 'collection', label: 'Collection' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center">
                      {tab.label}
                      {tab.id === 'requests' && pendingRequests.length > 0 && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {pendingRequests.length}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Gradient fade effect for scroll indication */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex space-x-8 px-4 sm:px-6 lg:px-8">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'customers', label: 'Customers' },
            { id: 'requests', label: 'Requests' },
            { id: 'reports', label: 'Reports' },
            { id: 'team', label: 'Team' },
            { id: 'collection', label: 'Collection' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.id === 'requests' && pendingRequests.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )

  // Dashboard Section
  // Dashboard Section - UPDATED
const renderDashboard = () => (
  <div className="space-y-6">
    {/* Welcome Banner */}
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
      <h1 className="text-2xl font-bold mb-2">Welcome to Super Admin Dashboard</h1>
      <p className="opacity-90">Manage your loan business efficiently and effectively</p>
    </div>

    {/* Stats Grid - UPDATED ORDER AND ADDED TEAM MEMBER CARD */}
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Active Customers Card - FIRST POSITION */}
      <div 
        onClick={() => setActiveTab('customers')}
        className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Active Customers</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardStats.totalCustomers?.toLocaleString() || '0'}</p>
            <p className="text-xs text-gray-500 mt-1">Currently active customers</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <span className="text-blue-600 text-xl font-semibold">👥</span>
          </div>
        </div>
      </div>

      {/* Total Loan Amount Card - SECOND POSITION */}
      <div 
        onClick={() => setShowLoanDetails(true)}
        className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Loan Amount</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">₹{(dashboardStats.totalAmount / 100000).toFixed(1)}L</p>
            <p className="text-xs text-gray-500 mt-1">Active loans amount</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <span className="text-green-600 text-xl font-semibold">💰</span>
          </div>
        </div>
      </div>

      {/* Total Team Member Card - THIRD POSITION */}
      <div 
        onClick={() => setActiveTab('team')}
        className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Team Members</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardStats.totalTeamMembers || '0'}</p>
            <p className="text-xs text-gray-500 mt-1">Active team members</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <span className="text-purple-600 text-xl font-semibold">👨‍💼</span>
          </div>
        </div>
      </div>

      {/* Pending Requests Card - FOURTH POSITION */}
      <div 
        onClick={() => setActiveTab('requests')}
        className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Pending Requests</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">{dashboardStats.pendingRequests}</p>
            <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <span className="text-orange-600 text-xl font-semibold">📋</span>
          </div>
        </div>
      </div>
    </div>

    {/* Quick Actions */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <button 
        onClick={() => setActiveTab('customers')}
        className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition-colors border border-blue-200"
      >
        <div className="text-blue-600 text-lg mb-2">👥</div>
        <span className="text-sm font-medium text-blue-900">Manage Customers</span>
      </button>
      
      <button 
        onClick={() => setActiveTab('requests')}
        className="p-4 bg-orange-50 rounded-lg text-center hover:bg-orange-100 transition-colors border border-orange-200"
      >
        <div className="text-orange-600 text-lg mb-2">📋</div>
        <span className="text-sm font-medium text-orange-900">Pending Requests</span>
        {pendingRequests.length > 0 && (
          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            {pendingRequests.length}
          </span>
        )}
      </button>
      
      <button 
        onClick={() => setActiveTab('reports')}
        className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition-colors border border-purple-200"
      >
        <div className="text-purple-600 text-lg mb-2">📊</div>
        <span className="text-sm font-medium text-purple-900">View Reports</span>
      </button>
      
      <button 
        onClick={() => setActiveTab('team')}
        className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100 transition-colors border border-green-200"
      >
        <div className="text-green-600 text-lg mb-2">👨‍💼</div>
        <span className="text-sm font-medium text-green-900">Team Management</span>
      </button>
    </div>

    {/* Recent Activities */}
    <RecentActivities />

    {/* Loan Details Modal */}
    {showLoanDetails && (
      <LoanDetailsModal 
        stats={dashboardStats}
        onClose={() => setShowLoanDetails(false)}
      />
    )}
  </div>
)

  // Customers Section with Enhanced Filters and Sort
  const renderCustomers = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
        <p className="text-gray-600">Manage all customer accounts and loan details</p>
      </div>
      <span className="text-sm text-gray-600">
        {customers.length} customers • Sorted {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
      </span>
    </div>

    {/* Enhanced Search and Filters with Sort */}
    {renderSearchAndFilters()}

    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Customer Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Business</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Office</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedCustomers.map((customer) => (
              <tr key={customer._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 w-1/6">{customer.customerNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-1/6">{customer.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/6">{customer.businessName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/6">
                  {customer.officeCategory || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-1/6">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    customer.category === 'A' ? 'bg-green-100 text-green-800' :
                    customer.category === 'B' ? 'bg-yellow-100 text-yellow-800' :
                    customer.category === 'C' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {customer.category || 'Not specified'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium w-1/6">
                  <button 
                    onClick={() => handleViewDetails(customer)}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
            {filteredAndSortedCustomers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                  No customers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)

  // Main render function with consistent header and navigation
  const renderMainContent = () => {
    if (selectedCustomer) {
      return (
        <CustomerDetailsView 
          customer={selectedCustomer} 
          onBack={handleBackToDashboard}
          onDelete={handleDeleteCustomer}
        />
      )
    }

    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'customers':
        return renderCustomers();
      case 'requests':
        return (
          <PendingRequestsView 
            requests={pendingRequests}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            onBack={() => setActiveTab('dashboard')}
          />
        );
      case 'reports':
        return <EnhancedReportsView onBack={() => setActiveTab('dashboard')} />;
      case 'team':
        return <TeamManagementView onBack={() => setActiveTab('dashboard')} />;
      case 'collection':
        return <CollectionView onBack={() => setActiveTab('dashboard')} />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER - Always visible */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Loan Management System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, Super Admin</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* NAVIGATION - Always visible */}
      {renderNavigation()}

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {renderMainContent()}
      </main>
    </div>
  )
}