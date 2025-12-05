import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Request } from '@/src/types/dataEntry';

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
const CACHE_DURATION = 1 * 60 * 1000; // 1 minute for requests (changes frequently)
const pendingRequestRequests = new Map<string, Promise<Request[]>>();

export const useRequests = (currentUserOffice?: string): UseRequestsReturn => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchRequests = useCallback(async (forceRefresh = false): Promise<Request[]> => {
    const cacheKey = `requests_${currentUserOffice || 'all'}`;
    
    // Check cache first
    if (!forceRefresh) {
      const cached = requestsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }
    
    // Check for pending request
    if (pendingRequestRequests.has(cacheKey)) {
      return pendingRequestRequests.get(cacheKey)!;
    }
    
    // Create new request
    const requestPromise = (async () => {
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        
        let url = '/api/data-entry/requests';
        if (currentUserOffice) {
          url += `?officeCategory=${encodeURIComponent(currentUserOffice)}`;
        }
        
        console.log('🔄 Fetching requests from:', url);
        
        const response = await fetch(url, {
          signal: abortControllerRef.current.signal
        });
        
        // 🔍 DEBUG CODE STARTS HERE 🔍
        // First, get the raw response text
        const responseText = await response.text();
        console.log('🔍 Raw response (first 500 chars):', responseText.substring(0, 500));
        
        // Check if it's HTML
        if (responseText.trim().startsWith('<!DOCTYPE') || 
            responseText.trim().startsWith('<html') || 
            responseText.includes('<head>')) {
          console.error('❌ ERROR: Received HTML instead of JSON!');
          console.error('This means:');
          console.error('1. The API endpoint does not exist');
          console.error('2. OR there is a server error returning HTML');
          console.error('3. OR the route file has syntax errors');
          console.error('');
          console.error('📁 Expected file location:');
          console.error('/app/api/data-entry/requests/route.js');
          console.error('');
          console.error('🔧 Please check:');
          console.error('- Is the file at the correct location?');
          console.error('- Does the file export GET/POST functions?');
          console.error('- Are there any syntax errors in the file?');
          console.error('- Is the server running?');
          console.error('');
          console.error('📄 Full response type:', typeof responseText);
          console.error('📄 Response starts with:', responseText.substring(0, 100));
          
          throw new Error('API endpoint returned HTML instead of JSON. Check if the route exists at /app/api/data-entry/requests/route.js');
        }
        
        // Try to parse as JSON
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('❌ Failed to parse response as JSON:', parseError);
          console.error('Response that failed to parse:', responseText.substring(0, 300));
          throw new Error('Server returned invalid JSON. Check API endpoint implementation.');
        }
        // 🔍 DEBUG CODE ENDS HERE 🔍
        
        if (!response.ok) {
          throw new Error(`Failed to fetch requests: ${response.status} ${response.statusText}`);
        }
        
        console.log('📦 Parsed response:', {
          success: result.success,
          hasData: !!result.data,
          dataType: typeof result.data,
          responseKeys: Object.keys(result)
        });
        
        // Check if the response has the expected structure
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch requests');
        }
        
        // Extract data from different possible response structures
        let data: Request[] = [];
        
        if (Array.isArray(result.data)) {
          // Case 1: data is directly an array
          data = result.data;
        } else if (result.data && Array.isArray(result.data.requests)) {
          // Case 2: data has a requests property
          data = result.data.requests;
        } else if (Array.isArray(result.requests)) {
          // Case 3: requests is directly on result
          data = result.requests;
        } else if (result.data && typeof result.data === 'object') {
          // Case 4: data is an object, try to extract
          console.warn('⚠️ data is an object, not array. Trying to extract...');
          data = [result.data];
        } else {
          console.warn('⚠️ No requests data found in response, using empty array');
          data = [];
        }
        
        console.log(`✅ Extracted ${data.length} requests`);
        
        // Format the data
        const formattedRequests = data.map((req: any) => ({
          _id: req._id || req.id || `temp_${Math.random()}`,
          type: req.type || 'New Customer',
          customerName: req.customerName || 'Unknown Customer',
          customerNumber: req.customerNumber || '',
          status: req.status || 'Pending',
          createdAt: req.createdAt || new Date().toISOString(),
          description: req.description || `${req.type || 'Request'} request`,
          data: {
            loanAmount: req.data?.loanAmount || 0,
            emiAmount: req.data?.emiAmount || 0,
            loanType: req.data?.loanType || 'Daily',
            loanDays: req.data?.loanDays || 0,
            emiType: req.data?.emiType || 'fixed',
            customEmiAmount: req.data?.customEmiAmount || null
          }
        }));
        
        // Update cache
        requestsCache.set(cacheKey, {
          data: formattedRequests,
          timestamp: Date.now()
        });
        
        return formattedRequests;
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Requests request aborted');
          return [];
        }
        throw err;
      } finally {
        pendingRequestRequests.delete(cacheKey);
      }
    })();
    
    pendingRequestRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }, [currentUserOffice]);

  const refetch = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchRequests(force);
      setRequests(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch requests';
      setError(new Error(errorMessage));
      console.error('Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchRequests]);

  // Calculate statistics with memoization
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