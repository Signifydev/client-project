'use client';

import { useState, useEffect } from 'react';

interface EnhancedReportsProps {
  onBack: () => void;
}

export default function EnhancedReportsView({ onBack }: EnhancedReportsProps) {
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