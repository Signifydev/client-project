'use client';

import { useState, useEffect } from 'react';
import { DashboardStats } from '../../types';

interface LoanDetailsModalProps {
  stats: DashboardStats;
  onClose: () => void;
}

export default function LoanDetailsModal({ stats, onClose }: LoanDetailsModalProps) {
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

          {/* Time Range Filter */}
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

          {/* Summary Cards */}
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