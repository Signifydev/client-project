import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Customer } from '@/src/types/dataEntry';

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
    
    // Create new request
    const requestPromise = (async () => {
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        
        let url = '/api/data-entry/emi-customers';
        if (currentUserOffice) {
          url += `?officeCategory=${encodeURIComponent(currentUserOffice)}`;
        }
        
        const response = await fetch(url, {
          signal: abortControllerRef.current.signal,
          headers: {
            'Cache-Control': 'max-age=120' // 2 minutes cache
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: Customer[] = await response.json();
        
        // Update cache
        emiCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        return data;
      } catch (err) {
        if (err.name === 'AbortError') {
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
    
    return {
      totalDue,
      overdueCount,
      totalCustomers: emiCustomers.length,
      filteredCount: emiCustomers.length
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