// useRequests.ts - UPDATED with better logging
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Request } from '@/src/app/data-entry/types/dataEntry';

interface UseRequestsReturn {
  requests: Request[];
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
  statistics: {
    pending: number;
    completed: number;
    total: number;
  };
}

// Cache implementation
const requestsCache = new Map<string, { data: Request[]; timestamp: number }>();
const CACHE_DURATION = 1 * 60 * 1000; // 1 minute
const pendingRequestRequests = new Map<string, Promise<Request[]>>();

export const useRequests = (currentUserOffice?: string, currentOperatorId?: string): UseRequestsReturn => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRequests = useCallback(async (forceRefresh = false): Promise<Request[]> => {
    const cacheKey = `requests_${currentUserOffice || 'all'}_${currentOperatorId || 'all'}`;
    
    // Check cache first
    if (!forceRefresh) {
      const cached = requestsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📦 Using cached requests');
        return cached.data;
      }
    }
    
    // Check for pending request
    if (pendingRequestRequests.has(cacheKey)) {
      console.log('⏳ Using pending request');
      return pendingRequestRequests.get(cacheKey)!;
    }
    
    // Create new request
    const requestPromise = (async () => {
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        
        // Build URL with parameters
        const params = new URLSearchParams();
        
        if (currentUserOffice && currentUserOffice !== 'all') {
          params.append('officeCategory', currentUserOffice);
        }
        
        if (currentOperatorId) {
          params.append('createdBy', currentOperatorId);
        } else {
          console.warn('⚠️ No operator ID provided for filtering requests');
        }
        
        const url = `/api/data-entry/requests${params.toString() ? `?${params.toString()}` : ''}`;
        
        console.log('🔄 Fetching requests from:', url);
        
        const response = await fetch(url, {
          signal: abortControllerRef.current.signal
        });
        
        console.log('📊 Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch requests: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        console.log('📦 API Response:', {
          success: result.success,
          hasData: !!result.data,
          dataLength: Array.isArray(result.data) ? result.data.length : 'not an array'
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch requests');
        }
        
        // Extract data from response - handle different response formats
        let data: any[] = [];
        
        if (result.data && Array.isArray(result.data)) {
          data = result.data;
        } else if (result.data && Array.isArray(result.data.requests)) {
          data = result.data.requests;
        } else if (Array.isArray(result.requests)) {
          data = result.requests;
        } else {
          console.warn('⚠️ No requests data found in response, using empty array');
          console.log('Response structure:', result);
          data = [];
        }
        
        console.log(`✅ Extracted ${data.length} requests`);
        
        // Log each request for debugging
        data.forEach((req, index) => {
          console.log(`  ${index + 1}. ${req.type} - ${req.customerName} (Created by: ${req.createdBy})`);
        });
        
        // Format the data
        const formattedRequests = data.map((req: any) => {
          return {
            _id: req._id || req.id || `temp_${Math.random()}`,
            type: req.type || 'Unknown',
            customerName: req.customerName || 'Unknown Customer',
            customerNumber: req.customerNumber || '',
            status: req.status || 'Pending',
            createdAt: req.createdAt || new Date().toISOString(),
            description: req.description || `${req.type || 'Request'} request`,
            data: req.data || req.requestedData || {},
            createdBy: req.createdBy || req.submittedBy || 'Unknown',
            officeCategory: req.officeCategory || currentUserOffice || 'Unknown'
          };
        });
        
        // Update cache
        requestsCache.set(cacheKey, {
          data: formattedRequests,
          timestamp: Date.now()
        });
        
        return formattedRequests;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Requests request aborted');
          return [];
        }
        console.error('❌ Error fetching requests:', err);
        throw err;
      } finally {
        pendingRequestRequests.delete(cacheKey);
      }
    })();
    
    pendingRequestRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }, [currentUserOffice, currentOperatorId]);

  const refetch = useCallback(async (force = false) => {
    console.log('🔄 Refetching requests, force:', force);
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchRequests(force);
      console.log('✅ Refetch complete, received:', data.length, 'requests');
      setRequests(data);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch requests';
      console.error('❌ Error in refetch:', err);
      setError(new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [fetchRequests]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const pending = requests.filter(req => 
      req.status === 'Pending' || req.status === 'pending'
    ).length;
    
    const completed = requests.filter(req => 
      req.status === 'Approved' || req.status === 'Rejected' || req.status === 'completed'
    ).length;
    
    return {
      pending,
      completed,
      total: requests.length
    };
  }, [requests]);

  // Initial fetch
  useEffect(() => {
    console.log('🚀 useRequests initializing...', {
      currentUserOffice,
      currentOperatorId,
      hasOperatorId: !!currentOperatorId
    });
    
    refetch();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [refetch]);

  return {
    requests,
    loading,
    error,
    refetch,
    statistics
  };
};