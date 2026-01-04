'use client';

import { useState, useEffect } from 'react';
import { DashboardStats } from '../../types';

interface LoanDetailsModalProps {
  stats: DashboardStats;
  onClose: () => void;
}

export default function LoanDetailsModal({ stats, onClose }: LoanDetailsModalProps) {
  const [loanData, setLoanData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoanType, setSelectedLoanType] = useState<string | null>(null);

  const fetchLoanDetails = async (loanType: string | null = null) => {
    try {
      setLoading(true);
      const url = `/api/admin/loan-details${loanType ? `?loanType=${loanType}` : ''}`;
      const response = await fetch(url);
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
    fetchLoanDetails(selectedLoanType);
  }, [selectedLoanType]);

  const handleLoanTypeFilter = (loanType: string | null) => {
    setSelectedLoanType(loanType);
  };

  // Calculate totals for the selected view
  const calculateTotals = () => {
    const filteredData = selectedLoanType 
      ? loanData.filter(item => item.loanType === selectedLoanType)
      : loanData.filter(item => item.loanType !== 'TOTAL');
    
    const totals = filteredData.reduce((acc, item) => ({
      totalLoans: acc.totalLoans + (item.newLoans || 0),
      totalLoanAmount: acc.totalLoanAmount + (item.totalAmount || 0),
      totalRecoveredAmount: acc.totalRecoveredAmount + (item.recoveredAmount || 0),
      paymentCount: acc.paymentCount + (item.paymentCount || 0)
    }), { totalLoans: 0, totalLoanAmount: 0, totalRecoveredAmount: 0, paymentCount: 0 });

    return {
      ...totals,
      totalAmountToRecover: totals.totalLoanAmount - totals.totalRecoveredAmount
    };
  };

  const totals = calculateTotals();
  const hasMultipleTypes = !selectedLoanType && loanData.some(item => item.loanType !== 'TOTAL');

  // Get display title
  const getDisplayTitle = () => {
    if (selectedLoanType) {
      return `${selectedLoanType} Loans Summary`;
    }
    return 'Total Loan Amount Summary';
  };

  // Get display subtitle
  const getDisplaySubtitle = () => {
    if (selectedLoanType) {
      return `Showing all ${selectedLoanType.toLowerCase()} loans data`;
    }
    return 'Showing all loan types data';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{getDisplayTitle()}</h2>
              <p className="text-sm text-gray-600 mt-1">{getDisplaySubtitle()}</p>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Loan Type Filter */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Filter by Loan Type:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleLoanTypeFilter(null)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !selectedLoanType
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Loan Types
              </button>
              {['Daily', 'Weekly', 'Monthly'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleLoanTypeFilter(type)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    selectedLoanType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {type} Loans
                </button>
              ))}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-600">
                {selectedLoanType ? selectedLoanType : 'Total'} Loans
              </p>
              <p className="text-2xl font-bold text-blue-900">{totals.totalLoans}</p>
              <p className="text-xs text-blue-700 mt-1">Active loans count</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-600">Total Loan Amount</p>
              <p className="text-2xl font-bold text-green-900">
                ₹{totals.totalLoanAmount.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-green-700 mt-1">
                {(totals.totalLoanAmount / 100000).toFixed(1)} Lakhs
              </p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-purple-600">Total Recovered</p>
              <p className="text-2xl font-bold text-purple-900">
                ₹{totals.totalRecoveredAmount.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-purple-700 mt-1">
                {totals.paymentCount} payments
              </p>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-sm font-medium text-orange-600">Amount to Recover</p>
              <p className="text-2xl font-bold text-orange-900">
                ₹{totals.totalAmountToRecover.toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-orange-700 mt-1">
                {(totals.totalAmountToRecover / 100000).toFixed(1)} Lakhs
              </p>
            </div>
          </div>

          {/* Loan Details Table */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedLoanType ? `${selectedLoanType} Loans` : 'All Loans'} Breakdown
              </h3>
              <p className="text-sm text-gray-600">
                Showing comprehensive loan data including amounts, recoveries, and payments
              </p>
            </div>
            
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <h3 className="text-lg font-medium text-gray-900 mt-4">Loading loan details...</h3>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Loan Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Loans Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Recovered Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Payment Count
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount to Recover
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Recovery %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loanData
                      .filter(item => item.loanType !== 'TOTAL' || !hasMultipleTypes)
                      .map((item: any, index: number) => {
                        const recoveryPercentage = item.totalAmount > 0 
                          ? Math.round((item.recoveredAmount / item.totalAmount) * 100)
                          : 0;
                        
                        return (
                          <tr key={index} className={item.loanType === 'TOTAL' ? 'bg-gray-50 font-semibold' : ''}>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {item.loanType}
                                {item.loanType === 'TOTAL' && ' (All Types)'}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{item.newLoans || 0}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              ₹{(item.totalAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-4 text-sm text-green-600 font-medium">
                              ₹{(item.recoveredAmount || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {item.paymentCount || 0}
                            </td>
                            <td className="px-6 py-4 text-sm text-orange-600 font-medium">
                              ₹{((item.totalAmount || 0) - (item.recoveredAmount || 0)).toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div 
                                    className={`h-2.5 rounded-full ${
                                      recoveryPercentage >= 80 ? 'bg-green-600' :
                                      recoveryPercentage >= 50 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(recoveryPercentage, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="ml-2 text-xs text-gray-600 min-w-[40px]">
                                  {recoveryPercentage}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    
                    {loanData.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center">
                          <div className="text-gray-400 text-4xl mb-4">📊</div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No loan data available</h3>
                          <p className="text-sm text-gray-600">
                            No {selectedLoanType ? selectedLoanType.toLowerCase() : ''} loans found in the system
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  
                  {/* Totals Row (only show when viewing all types) */}
                  {hasMultipleTypes && loanData.find(item => item.loanType === 'TOTAL') && (
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">TOTAL</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {loanData.find(item => item.loanType === 'TOTAL')?.newLoans || 0}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          ₹{(loanData.find(item => item.loanType === 'TOTAL')?.totalAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-700">
                          ₹{(loanData.find(item => item.loanType === 'TOTAL')?.recoveredAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {loanData.find(item => item.loanType === 'TOTAL')?.paymentCount || 0}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-orange-700">
                          ₹{((loanData.find(item => item.loanType === 'TOTAL')?.totalAmount || 0) - 
                             (loanData.find(item => item.loanType === 'TOTAL')?.recoveredAmount || 0)).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {loanData.find(item => item.loanType === 'TOTAL')?.totalAmount > 0
                            ? Math.round((loanData.find(item => item.loanType === 'TOTAL')?.recoveredAmount || 0) / 
                                        (loanData.find(item => item.loanType === 'TOTAL')?.totalAmount || 1) * 100)
                            : 0}%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </div>
          </div>

          {/* Legend/Info */}
          <div className="mt-4 text-xs text-gray-500">
            <p>
              <span className="inline-block w-3 h-3 bg-green-600 rounded-full mr-1"></span>
              Recovery ≥80% • 
              <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mx-2 mr-1"></span>
              Recovery 50-79% • 
              <span className="inline-block w-3 h-3 bg-red-500 rounded-full mx-2 mr-1"></span>
              Recovery &lt;50%
            </p>
            <p className="mt-1">Data includes all active loans in the system. Renewed and completed loans are excluded.</p>
          </div>
        </div>
      </div>
    </div>
  );
}