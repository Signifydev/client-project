'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Customer, Loan } from '@/src/app/data-entry/types/dataEntry';
import { useEMI, fetchCustomerLoans } from '@/src/app/data-entry/hooks/useEMI';

// Simple custom icons
const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

// Helper function to safely get loan amount
const getLoanAmount = (loan: Loan): number => {
  // First check the primary field 'amount'
  if (loan.amount !== undefined && loan.amount !== null) {
    return loan.amount;
  }
  // Fallback to 'loanAmount' if 'amount' is not available
  if ((loan as any).loanAmount !== undefined && (loan as any).loanAmount !== null) {
    return (loan as any).loanAmount;
  }
  return 0;
};

// Helper function to safely get EMI amount
const getEmiAmount = (loan: Loan): number => {
  return loan.emiAmount || 0;
};

// Helper function to safely get last EMI/payment date
const getLastEmiDate = (loan: Loan): string => {
  // Check lastEmiDate first
  if (loan.lastEmiDate) {
    try {
      return new Date(loan.lastEmiDate).toLocaleDateString();
    } catch (e) {
      return 'Invalid date';
    }
  }
  
  // Fallback to lastPaymentDate
  if (loan.lastPaymentDate) {
    try {
      return new Date(loan.lastPaymentDate).toLocaleDateString();
    } catch (e) {
      return 'Invalid date';
    }
  }
  
  return 'No EMI paid';
};

// Expanded Customer Component with Loan Details
interface CustomerRowProps {
  customer: Customer;
  expanded: boolean;
  onToggle: () => void;
  onPayNow: (customer: Customer, loan: Loan) => void;
  loadingLoans?: boolean;
  customerLoans?: Loan[];
}

const CustomerRow: React.FC<CustomerRowProps> = React.memo(({ 
  customer, 
  expanded, 
  onToggle, 
  onPayNow,
  loadingLoans = false,
  customerLoans = []
}) => {
  // Calculate total loans and total EMI amount - NOW ALWAYS CALCULATED
  const { totalLoans, totalEMIAmount } = useMemo(() => {
    // Always calculate from customerLoans if available (even if not expanded)
    if (customerLoans && customerLoans.length > 0) {
      return {
        totalLoans: customerLoans.length,
        totalEMIAmount: customerLoans.reduce((sum, loan) => sum + getEmiAmount(loan), 0)
      };
    }
    
    // Fallback: use customer's own data
    return {
      totalLoans: customer.totalLoans || (customer.loanAmount ? 1 : 0),
      totalEMIAmount: customer.emiAmount || 0
    };
  }, [customerLoans, customer.totalLoans, customer.loanAmount, customer.emiAmount]);

  const handlePayNow = useCallback((loan: Loan) => {
    onPayNow(customer, loan);
  }, [customer, onPayNow]);

  return (
    <div className="border-b border-gray-200">
      {/* Customer Summary Row - SINGLE LINE LAYOUT */}
      <div 
        className={`p-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer ${
          expanded ? 'bg-blue-50' : ''
        }`}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          {/* Left side: Expand icon + Customer Number FIRST */}
          <div className="flex items-center space-x-4 w-1/5">
            <div>
              {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </div>
            <div className="flex flex-col">
              <div className="font-medium text-gray-900">{customer.customerNumber || 'No CN'}</div>
              <div className="text-sm text-gray-600">{customer.name}</div>
            </div>
          </div>
          
          {/* Center: Evenly spread data */}
          <div className="flex items-center justify-around flex-1">
            <div className="text-center w-1/4">
              <div className="text-sm text-gray-600">Total Loans</div>
              <div className="font-medium text-gray-900 text-lg">{totalLoans}</div>
            </div>
            
            <div className="text-center w-1/4">
              <div className="text-sm text-gray-600">Total EMI</div>
              <div className="font-medium text-gray-900 text-lg">₹{totalEMIAmount.toLocaleString()}</div>
            </div>
            
            <div className="text-center w-1/4">
              <div className="text-sm text-gray-600">Office</div>
              <div className="font-medium text-gray-900">{customer.officeCategory || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Loan Details */}
      {expanded && (
        <div className="bg-gray-50 p-4 border-t border-gray-200">
          {loadingLoans ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-sm text-gray-600">Loading loan details...</p>
            </div>
          ) : customerLoans && customerLoans.length > 0 ? (
            <div className="space-y-3">
              {/* REMOVED: "Loan Details:" heading */}
              {customerLoans.map((loan) => {
                // SAFELY get last EMI date
                const lastEmiDate = getLastEmiDate(loan);
                
                const isLoanActive = loan.status === 'active';
                const canPay = isLoanActive && (loan.remainingAmount || getLoanAmount(loan)) > 0;

                return (
                  <div key={loan._id || loan.loanNumber} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 block">Loan No:</span>
                        <span className="font-medium">{loan.loanNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 block">Amount:</span>
                        <span className="font-medium">₹{getLoanAmount(loan).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 block">Loan Type:</span>
                        <span className="font-medium">{loan.loanType || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 block">EMI Amount:</span>
                        <span className="font-medium">₹{getEmiAmount(loan).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 block">Last EMI:</span>
                        <span className={`font-medium ${lastEmiDate === 'No EMI paid' ? 'text-gray-500' : ''}`}>
                          {lastEmiDate}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={() => handlePayNow(loan)}
                          disabled={!canPay}
                          className={`px-4 py-2 rounded text-sm font-medium transition-colors duration-200 ${
                            canPay
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {canPay ? 'Pay Now' : 'Paid/Closed'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Additional loan details */}
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-1 font-medium ${
                          loan.status === 'active' ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {loan.status || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Paid/Total:</span>
                        <span className="ml-1 font-medium">
                          {(loan.emiPaidCount || 0)}/{(loan.totalEmiCount || loan.loanDays || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Paid Amount:</span>
                        <span className="ml-1 font-medium">₹{(loan.totalPaidAmount || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Remaining:</span>
                        <span className="ml-1 font-medium text-red-600">
  ₹{(loan.remainingAmount || getLoanAmount(loan) || 0).toLocaleString()}
</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-gray-400 text-3xl mb-2">🏦</div>
              <p className="text-gray-600">No active loans found for this customer</p>
              <p className="text-sm text-gray-500 mt-1">Add a loan to start collecting EMI</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for re-rendering
  return (
    prevProps.customer._id === nextProps.customer._id &&
    prevProps.expanded === nextProps.expanded &&
    prevProps.loadingLoans === nextProps.loadingLoans &&
    JSON.stringify(prevProps.customerLoans) === JSON.stringify(nextProps.customerLoans)
  );
});

CustomerRow.displayName = 'CustomerRow';

interface EMISectionProps {
  currentUserOffice: string;
  currentOperator: {
    id: string;
    name: string;
    fullName: string;
  };
  onShowUpdateEMI: (customer: Customer, loan?: Loan) => void;
  onShowEMICalendar: (customer: Customer) => void;
  refreshKey: number;
}

const EMISection: React.FC<EMISectionProps> = React.memo(({
  currentUserOffice,
  currentOperator,
  onShowUpdateEMI,
  onShowEMICalendar,
  refreshKey
}) => {
  const { emiCustomers, loading, error, refetch, statistics } = useEMI(currentUserOffice);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [customerLoans, setCustomerLoans] = useState<Record<string, { loans: Loan[]; loading: boolean }>>({});
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input
  useEffect(() => {
    setLoadingSearch(true);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setLoadingSearch(false);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // FIX: Auto-refetch when component mounts and when refreshKey changes
  useEffect(() => {
    console.log('🔄 EMISection - Component mounted or refreshKey changed:', refreshKey);
    
    // Always fetch when component mounts or refreshKey changes
    const timer = setTimeout(() => {
      console.log('🚀 Auto-fetching EMI customers...');
      refetch();
    }, 100); // Small delay to ensure component is ready
    
    return () => clearTimeout(timer);
  }, [refreshKey, refetch]);

  // Pre-fetch loans for ALL customers when data loads
  useEffect(() => {
    if (emiCustomers.length > 0) {
      console.log('📥 Pre-fetching loans for all customers...');
      emiCustomers.forEach(customer => {
        if (!customerLoans[customer._id]) {
          fetchCustomerLoansData(customer._id);
        }
      });
    }
  }, [emiCustomers]);

  // Fetch loans for customers - ENHANCED with error handling
  const fetchCustomerLoansData = useCallback(async (customerId: string) => {
    if (customerLoans[customerId]?.loans?.length > 0) {
      return; // Already loaded
    }

    // Set loading state
    setCustomerLoans(prev => ({
      ...prev,
      [customerId]: { loans: [], loading: true }
    }));

    try {
      console.log(`🔍 Fetching loans for customer: ${customerId}`);
      const loans = await fetchCustomerLoans(customerId);
      
      // Validate and sanitize loan data
      const validatedLoans = (loans || []).map(loan => ({
  ...loan,
  // Ensure all required fields have safe defaults
  amount: loan.amount || loan.loanAmount || 0,
  emiAmount: loan.emiAmount || 0,
  loanNumber: loan.loanNumber || 'N/A',
  loanType: loan.loanType || 'Monthly',
  status: loan.status || 'active',
  totalPaidAmount: loan.totalPaidAmount || 0,
  remainingAmount: loan.remainingAmount || (loan.amount || loan.loanAmount || 0),
  emiPaidCount: loan.emiPaidCount || 0,
  totalEmiCount: loan.totalEmiCount || loan.loanDays || 0,
  // Handle lastEmiDate and lastPaymentDate
  lastEmiDate: loan.lastEmiDate || loan.lastPaymentDate || null
}));
      
      console.log(`✅ Loaded ${validatedLoans.length} loans for customer ${customerId}`);
      
      setCustomerLoans(prev => ({
        ...prev,
        [customerId]: { loans: validatedLoans, loading: false }
      }));
    } catch (error) {
      console.error('Error fetching customer loans:', error);
      setCustomerLoans(prev => ({
        ...prev,
        [customerId]: { loans: [], loading: false }
      }));
    }
  }, [customerLoans]);

  // Handle customer expansion
  const handleToggleCustomer = useCallback((customerId: string) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
        // Fetch loans when expanding if not already loaded
        if (!customerLoans[customerId]?.loans?.length) {
          fetchCustomerLoansData(customerId);
        }
      }
      return newSet;
    });
  }, [customerLoans, fetchCustomerLoansData]);

  // Sort functionality
  const toggleSortOrder = () => {
    setSortOrder(current => {
      if (current === 'none') return 'asc';
      if (current === 'asc') return 'desc';
      return 'none';
    });
  };

  const getSortIcon = () => {
    switch (sortOrder) {
      case 'asc':
        return '↑';
      case 'desc':
        return '↓';
      default:
        return '⇅';
    }
  };

  // Filter and sort EMI customers with useMemo
  const filteredEMICustomers = useMemo(() => {
    if (!emiCustomers.length) return [];
    
    const filtered = emiCustomers.filter(customer => {
      // Search term filter only
      return debouncedSearchTerm === '' || 
        customer.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (customer.customerNumber && customer.customerNumber.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (customer.area && customer.area.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (customer.phone && Array.isArray(customer.phone) && 
         customer.phone.some(phone => phone.includes(debouncedSearchTerm)));
    });

    // Apply sorting if sortOrder is not 'none'
    if (sortOrder !== 'none') {
      filtered.sort((a, b) => {
        const customerNumberA = a.customerNumber || '';
        const customerNumberB = b.customerNumber || '';
        
        // Extract numeric part from customer numbers (e.g., "CN001" -> 1, "CN010" -> 10)
        const extractNumber = (cn: string): number => {
          if (!cn) return 0;
          const numbers = cn.match(/\d+/g);
          if (!numbers || numbers.length === 0) return 0;
          const combinedNumber = numbers.join('');
          return parseInt(combinedNumber, 10) || 0;
        };
        
        const numA = extractNumber(customerNumberA);
        const numB = extractNumber(customerNumberB);
        
        // If both have valid numbers, compare numerically
        if (numA > 0 && numB > 0) {
          return sortOrder === 'asc' ? numA - numB : numB - numA;
        }
        
        // Fallback to string comparison
        if (customerNumberA < customerNumberB) {
          return sortOrder === 'asc' ? -1 : 1;
        }
        if (customerNumberA > customerNumberB) {
          return sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [emiCustomers, debouncedSearchTerm, sortOrder]);

  // Memoized handlers
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const handlePayNow = useCallback((customer: Customer, loan: Loan) => {
    onShowUpdateEMI(customer, loan);
  }, [onShowUpdateEMI]);

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Error loading EMI data: {error.message}</div>
        <button 
          onClick={() => refetch()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="emi-section p-4">
      

      {/* Search and Sort Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* Wider Search Bar */}
        <div className="relative w-full sm:w-3/4">
          <input
            type="text"
            placeholder="Search by customer name, number, phone, or area..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <span className="text-gray-400 text-lg">🔍</span>
          </div>
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute inset-y-0 right-0 flex items-center pr-3"
            >
              <span className="text-gray-400 hover:text-gray-600">✕</span>
            </button>
          )}
        </div>
        
        {/* Sort and Refresh Buttons */}
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={toggleSortOrder}
            className="px-5 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-sm w-full sm:w-auto"
            title={`Sort by Customer Number (${sortOrder === 'asc' ? 'Ascending' : sortOrder === 'desc' ? 'Descending' : 'None'})`}
          >
            <span className="font-medium">Sort</span>
            <span className="text-blue-600 font-bold">{getSortIcon()}</span>
          </button>
          
          <button
            onClick={() => refetch()}
            className="px-5 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2 w-full sm:w-auto"
          >
            <span>↻</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-800">{filteredEMICustomers.length}</span> of <span className="font-semibold text-gray-800">{emiCustomers.length}</span> EMI customers
        {sortOrder !== 'none' && (
          <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Sorted: {sortOrder === 'asc' ? 'Ascending (CN001 → CN999)' : 'Descending (CN999 → CN001)'}
          </span>
        )}
      </div>

      {/* Table Header for Desktop */}
      <div className="hidden md:block bg-gray-50 p-4 rounded-t-lg border border-gray-200">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
          <div className="col-span-3">Customer</div>
          <div className="col-span-3 text-center">Total Loans</div>
          <div className="col-span-3 text-center">Total EMI</div>
          <div className="col-span-3 text-center">Office</div>
        </div>
      </div>

      {/* EMI Customers List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading EMI data...</p>
        </div>
      ) : filteredEMICustomers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-600">
            {searchTerm
              ? "No EMI customers match your search"
              : "No EMI customers found. Add customers with loans to start EMI collection."
            }
          </p>
          {searchTerm && (
            <button 
              onClick={handleClearSearch}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-b-lg shadow overflow-hidden border border-gray-200 border-t-0">
          {filteredEMICustomers.map((customer) => {
            const customerLoanData = customerLoans[customer._id] || { loans: [], loading: false };
            
            return (
              <CustomerRow
                key={customer._id}
                customer={customer}
                expanded={expandedCustomers.has(customer._id)}
                onToggle={() => handleToggleCustomer(customer._id)}
                onPayNow={handlePayNow}
                loadingLoans={customerLoanData.loading}
                customerLoans={customerLoanData.loans}
              />
            );
          })}
        </div>
      )}

      {/* Summary Footer */}
      {filteredEMICustomers.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
          <div className="flex justify-between items-center">
            <div>
              Showing {filteredEMICustomers.length} customer{filteredEMICustomers.length !== 1 ? 's' : ''}
            </div>
            <div className="flex space-x-6">
              <div>
                <span className="text-gray-500">Total Loans:</span>
                <span className="ml-2 font-medium text-purple-600">
                  {emiCustomers.reduce((sum, customer) => sum + (customer.totalLoans || 0), 0)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Total EMI:</span>
                <span className="ml-2 font-medium text-green-600">
                  ₹{emiCustomers.reduce((sum, customer) => sum + (customer.emiAmount || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Memoize the entire section
  return (
    prevProps.currentUserOffice === nextProps.currentUserOffice &&
    prevProps.refreshKey === nextProps.refreshKey
  );
});

// Set display name for EMISection
EMISection.displayName = 'EMISection';

export default EMISection;