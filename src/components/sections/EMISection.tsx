'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Customer } from '@/src/types/dataEntry';
import { useEMI } from '@/src/hooks/useEMI';

// Simple custom icons using emoji or SVG
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

// Memoized EMI Row Component
const EMIRow: React.FC<{ 
  customer: Customer;
  onUpdateEMI: (customer: Customer) => void;
  onViewCalendar: (customer: Customer) => void;
}> = React.memo(({ 
  customer, 
  onUpdateEMI, 
  onViewCalendar 
}) => {
  const handleUpdateEMI = useCallback(() => {
    onUpdateEMI(customer);
  }, [customer, onUpdateEMI]);

  const handleViewCalendar = useCallback(() => {
    onViewCalendar(customer);
  }, [customer, onViewCalendar]);

  // Calculate overdue status
  const isOverdue = useMemo(() => {
    if (!customer.lastPaymentDate) return false;
    const lastPayment = new Date(customer.lastPaymentDate);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - lastPayment.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 7; // Overdue if more than 7 days since last payment
  }, [customer.lastPaymentDate]);

  return (
    <div className="emi-row p-4 border-b hover:bg-gray-50 transition-colors duration-150">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div>
              <h4 className="font-medium text-gray-900">{customer.name}</h4>
              <p className="text-sm text-gray-500">{customer.customerNumber || 'N/A'}</p>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {isOverdue ? 'Overdue' : 'Current'}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Loan:</span>
              <span className="ml-2 font-medium">₹{customer.loanAmount?.toLocaleString() || '0'}</span>
            </div>
            <div>
              <span className="text-gray-600">EMI:</span>
              <span className="ml-2 font-medium">₹{customer.emiAmount?.toLocaleString() || '0'}</span>
            </div>
            <div>
              <span className="text-gray-600">Last Payment:</span>
              <span className="ml-2">
                {customer.lastPaymentDate 
                  ? new Date(customer.lastPaymentDate).toLocaleDateString()
                  : 'No payments'
                }
              </span>
            </div>
            <div>
              <span className="text-gray-600">Due:</span>
              <span className="ml-2 font-medium">₹{customer.dueAmount?.toLocaleString() || '0'}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={handleUpdateEMI}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
          >
            Record Payment
          </button>
          <button 
            onClick={handleViewCalendar}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-1"
          >
            <CalendarIcon />
            <span>Calendar</span>
          </button>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for EMI rows
  return (
    prevProps.customer._id === nextProps.customer._id &&
    prevProps.customer.lastPaymentDate === nextProps.customer.lastPaymentDate &&
    prevProps.customer.dueAmount === nextProps.customer.dueAmount
  );
});

// Set display name for EMIRow
EMIRow.displayName = 'EMIRow';

interface EMISectionProps {
  currentUserOffice: string;
  currentOperator: {
    id: string;
    name: string;
    fullName: string;
  };
  onShowUpdateEMI: (customer: Customer, loan?: any) => void;
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 73;
  const containerHeight = 600;

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

  // Refetch when refreshKey changes
  useEffect(() => {
    refetch();
  }, [refreshKey, refetch]);

  // Filter EMI customers with useMemo
  const filteredEMICustomers = useMemo(() => {
    if (!emiCustomers.length) return [];
    
    return emiCustomers.filter(customer => {
      // Search term filter
      const matchesSearch = debouncedSearchTerm === '' || 
        customer.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (customer.customerNumber && customer.customerNumber.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      
      // Status filter (calculate overdue status)
      const isOverdue = customer.lastPaymentDate 
        ? Math.floor((new Date().getTime() - new Date(customer.lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24)) > 7
        : false;
      
      let matchesStatus = true;
      if (statusFilter === 'overdue') matchesStatus = isOverdue;
      if (statusFilter === 'current') matchesStatus = !isOverdue;
      
      // Date range filter
      let matchesDateRange = true;
      if (dateRange && customer.lastPaymentDate) {
        const paymentDate = new Date(customer.lastPaymentDate);
        const { start, end } = dateRange;
        matchesDateRange = paymentDate >= new Date(start) && paymentDate <= new Date(end);
      }
      
      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [emiCustomers, debouncedSearchTerm, statusFilter, dateRange]);

  // Memoized statistics calculation
  const memoizedStatistics = useMemo(() => {
    if (!filteredEMICustomers.length) return statistics;
    
    const totalDue = filteredEMICustomers.reduce((sum, customer) => 
      sum + (customer.dueAmount || 0), 0
    );
    
    const overdueCount = filteredEMICustomers.filter(customer => {
      if (!customer.lastPaymentDate) return false;
      const diffDays = Math.floor(
        (new Date().getTime() - new Date(customer.lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays > 7;
    }).length;
    
    return {
      ...statistics,
      totalDue,
      overdueCount,
      filteredCount: filteredEMICustomers.length
    };
  }, [filteredEMICustomers, statistics]);

  // Memoized handlers
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleStatusFilter = useCallback((value: string) => {
    setStatusFilter(value);
  }, []);

  const handleDateRange = useCallback((startDate: string, endDate: string) => {
    if (startDate && endDate) {
      setDateRange({
        start: startDate,
        end: endDate
      });
    } else {
      setDateRange(null);
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateRange(null);
  }, []);

  const memoizedOnUpdateEMI = useCallback((customer: Customer) => {
    onShowUpdateEMI(customer);
  }, [onShowUpdateEMI]);

  const memoizedOnViewCalendar = useCallback((customer: Customer) => {
    onShowEMICalendar(customer);
  }, [onShowEMICalendar]);

  // Virtual scrolling implementation
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const scrollTop = containerRef.current.scrollTop;
      const start = Math.floor(scrollTop / itemHeight);
      const end = Math.min(start + Math.ceil(containerRef.current.clientHeight / itemHeight) + 5, filteredEMICustomers.length);
      
      setVisibleRange({ start, end });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial calculation
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [filteredEMICustomers.length]);

  const visibleCustomers = useMemo(() => {
    return filteredEMICustomers.slice(visibleRange.start, visibleRange.end);
  }, [filteredEMICustomers, visibleRange]);

  const totalHeight = filteredEMICustomers.length * itemHeight;

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
    <div className="emi-section">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Due</div>
          <div className="text-2xl font-bold text-red-600">
            ₹{memoizedStatistics.totalDue?.toLocaleString() || '0'}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Overdue</div>
          <div className="text-2xl font-bold text-orange-600">
            {memoizedStatistics.overdueCount || 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Current</div>
          <div className="text-2xl font-bold text-green-600">
            {memoizedStatistics.filteredCount - (memoizedStatistics.overdueCount || 0)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total EMI</div>
          <div className="text-2xl font-bold text-blue-600">
            {memoizedStatistics.filteredCount || 0}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search EMI customers..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
              />
              {loadingSearch && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <option value="all">All</option>
              <option value="overdue">Overdue</option>
              <option value="current">Current</option>
            </select>
            
            <div className="flex space-x-2">
              <input
                type="date"
                onChange={(e) => {
                  const endDate = document.getElementById('end-date') as HTMLInputElement;
                  handleDateRange(e.target.value, endDate?.value || '');
                }}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                placeholder="Start Date"
              />
              <span className="self-center">to</span>
              <input
                id="end-date"
                type="date"
                onChange={(e) => {
                  const startDate = document.getElementById('start-date') as HTMLInputElement;
                  handleDateRange(startDate?.value || '', e.target.value);
                }}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                placeholder="End Date"
              />
            </div>
            
            <button 
              onClick={handleClearFilters}
              className="px-4 py-2 border rounded hover:bg-gray-100 transition-colors duration-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredEMICustomers.length} of {emiCustomers.length} EMI records
          {memoizedStatistics.overdueCount > 0 && (
            <span className="ml-4 text-red-600">
              {memoizedStatistics.overdueCount} overdue payments
            </span>
          )}
        </div>
      </div>

      {/* EMI List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading EMI data...</p>
        </div>
      ) : filteredEMICustomers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-600">
            {debouncedSearchTerm || statusFilter !== 'all' || dateRange
              ? "No EMI records match your filters"
              : "No EMI records found"
          }</p>
          {debouncedSearchTerm || statusFilter !== 'all' || dateRange ? (
            <button 
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="bg-white rounded-lg shadow overflow-auto"
          style={{ height: `${containerHeight}px` }}
        >
          {/* Virtual list container */}
          <div style={{ height: totalHeight, position: 'relative' }}>
            {visibleCustomers.map((customer, index) => {
              const absoluteIndex = visibleRange.start + index;
              return (
                <div
                  key={customer._id}
                  style={{
                    position: 'absolute',
                    top: absoluteIndex * itemHeight,
                    left: 0,
                    right: 0,
                    height: itemHeight
                  }}
                >
                  <EMIRow
                    customer={customer}
                    onUpdateEMI={memoizedOnUpdateEMI}
                    onViewCalendar={memoizedOnViewCalendar}
                  />
                </div>
              );
            })}
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