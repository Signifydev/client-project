import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Customer, Loan } from '@/src/types/dataEntry';

interface UseEMIReturn {
  emiCustomers: Customer[];
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
  statistics: {
    totalDue: number;
    overdueCount: number;
    totalCustomers: number;
    filteredCount: number;
    totalActiveLoans: number;
  };
}

// Cache implementation
const emiCache = new Map<string, { data: Customer[]; timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for EMI data
const pendingEMIRequests = new Map<string, Promise<Customer[]>>();

export const useEMI = (currentUserOffice?: string): UseEMIReturn => {
  const [emiCustomers, setEmiCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchEMICustomers = useCallback(async (forceRefresh = false): Promise<Customer[]> => {
    const cacheKey = `emi_${currentUserOffice || 'all'}`;
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = emiCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }
    
    // Check for pending request
    if (pendingEMIRequests.has(cacheKey)) {
      return pendingEMIRequests.get(cacheKey)!;
    }
    
    // Create new request - Use customers endpoint instead of emi-customers
    const requestPromise = (async () => {
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        
        let url = '/api/data-entry/customers';
        const params = new URLSearchParams();
        
        // Only fetch active customers
        params.append('status', 'active');
        
        if (currentUserOffice && currentUserOffice !== 'all') {
          params.append('officeCategory', currentUserOffice);
        }
        
        const fullUrl = url + '?' + params.toString();
        console.log('📡 Fetching EMI customers from:', fullUrl);
        
        const response = await fetch(fullUrl, {
          signal: abortControllerRef.current.signal,
          headers: {
            'Cache-Control': 'max-age=120' // 2 minutes cache
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch customers');
        }
        
        const data: Customer[] = result.data || [];
        
        console.log(`📊 Raw data received: ${data.length} customers`);
        
        // DEBUG: Log customer data to see what fields are available
        data.slice(0, 5).forEach((customer, index) => {
          console.log(`Customer ${index + 1}:`, {
            name: customer.name,
            customerNumber: customer.customerNumber,
            loanAmount: customer.loanAmount,
            emiAmount: customer.emiAmount,
            totalLoans: customer.totalLoans,
            totalLoanAmount: customer.totalLoanAmount,
            status: customer.status
          });
        });
        
        // IMPORTANT: Filter for customers who have active loans
        // Check multiple fields to determine if customer has loans
        const customersWithLoans = data.filter(customer => {
          // Check if customer has any loan-related data
          const hasLoanData = 
            (customer.totalLoans && customer.totalLoans > 0) ||
            (customer.totalLoanAmount && customer.totalLoanAmount > 0) ||
            (customer.loanAmount && customer.loanAmount > 0) ||
            (customer.activeLoan !== undefined);
          
          console.log(`Customer ${customer.name}: hasLoanData = ${hasLoanData}`, {
            totalLoans: customer.totalLoans,
            totalLoanAmount: customer.totalLoanAmount,
            loanAmount: customer.loanAmount,
            hasActiveLoan: !!customer.activeLoan
          });
          
          return hasLoanData;
        });
        
        console.log(`✅ Found ${customersWithLoans.length} EMI customers out of ${data.length} total customers`);
        
        // Update cache
        emiCache.set(cacheKey, {
          data: customersWithLoans,
          timestamp: Date.now()
        });
        
        return customersWithLoans;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('EMI request aborted');
          return [];
        }
        throw err;
      } finally {
        pendingEMIRequests.delete(cacheKey);
      }
    })();
    
    pendingEMIRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }, [currentUserOffice]);

  const refetch = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchEMICustomers(force);
      setEmiCustomers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch EMI data';
      setError(new Error(errorMessage));
      console.error('Error fetching EMI data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchEMICustomers]);

  // Calculate statistics with memoization
  const statistics = useMemo(() => {
    const totalDue = emiCustomers.reduce((sum, customer) => 
      sum + (customer.dueAmount || 0), 0
    );
    
    const overdueCount = emiCustomers.filter(customer => {
      if (!customer.lastPaymentDate) return false;
      const diffDays = Math.floor(
        (new Date().getTime() - new Date(customer.lastPaymentDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return diffDays > 7;
    }).length;
    
    // Calculate total active loans (using totalLoans field)
    const totalActiveLoans = emiCustomers.reduce((sum, customer) => 
      sum + (customer.totalLoans || 0), 0
    );
    
    // Calculate total EMI amount
    const totalEMIAmount = emiCustomers.reduce((sum, customer) => {
      if (customer.emiAmount) return sum + customer.emiAmount;
      return sum;
    }, 0);
    
    return {
      totalDue,
      overdueCount,
      totalCustomers: emiCustomers.length,
      filteredCount: emiCustomers.length,
      totalActiveLoans,
      totalEMIAmount
    };
  }, [emiCustomers]);

  // Initial fetch
  useEffect(() => {
    refetch();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [refetch]);

  return {
    emiCustomers,
    loading,
    error,
    refetch,
    statistics
  };
};

// Helper function to fetch customer loans
export const fetchCustomerLoans = async (customerId: string): Promise<Loan[]> => {
  try {
    const response = await fetch(`/api/data-entry/customers/${customerId}`);
    const result = await response.json();
    
    if (result.success && result.data && result.data.loans) {
      return result.data.loans.filter((loan: Loan) => 
        loan.status === 'active' || loan.status === 'pending'
      );
    }
    return [];
  } catch (error) {
    console.error('Error fetching customer loans:', error);
    return [];
  }
};