import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Collection } from '@/src/types/dataEntry';

interface UseCollectionReturn {
  collections: Collection[];
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
  statistics: {
    totalCollected: number;
    todayCollection: number;
    collectionCount: number;
  };
}

// Cache implementation
const collectionCache = new Map<string, { data: Collection[]; timestamp: number }>();
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes for collection data
const pendingCollectionRequests = new Map<string, Promise<Collection[]>>();

export const useCollection = (currentUserOffice?: string): UseCollectionReturn => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCollections = useCallback(async (forceRefresh = false): Promise<Collection[]> => {
    const cacheKey = `collections_${currentUserOffice || 'all'}`;
    
    // Check cache first
    if (!forceRefresh) {
      const cached = collectionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }
    
    // Check for pending request
    if (pendingCollectionRequests.has(cacheKey)) {
      return pendingCollectionRequests.get(cacheKey)!;
    }
    
    // Create new request
    const requestPromise = (async () => {
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        
        // FIX: Build URL properly without reassigning const
        const url = currentUserOffice
          ? `/api/data-entry/collections?officeCategory=${encodeURIComponent(currentUserOffice)}`
          : '/api/data-entry/collections';
        
        const response = await fetch(url, {
          signal: abortControllerRef.current.signal
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch collections: ${response.status}`);
        }
        
        const data: Collection[] = await response.json();
        
        // Update cache
        collectionCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        return data;
      } catch (err) {
        // FIX: Properly handle unknown error type
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Collections request aborted');
          return [];
        }
        throw err;
      } finally {
        pendingCollectionRequests.delete(cacheKey);
      }
    })();
    
    pendingCollectionRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }, [currentUserOffice]);

  const refetch = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchCollections(force);
      setCollections(data);
    } catch (err) {
      // FIX: Properly handle unknown error type
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch collections';
      setError(new Error(errorMessage));
      console.error('Error fetching collections:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchCollections]);

  // Calculate statistics with memoization
  const statistics = useMemo(() => {
    const totalCollected = collections.reduce((sum, collection) => 
      sum + collection.amount, 0
    );
    
    const today = new Date().toISOString().split('T')[0];
    const todayCollection = collections
      .filter(collection => collection.date === today)
      .reduce((sum, collection) => sum + collection.amount, 0);
    
    return {
      totalCollected,
      todayCollection,
      collectionCount: collections.length
    };
  }, [collections]);

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
    collections,
    loading,
    error,
    refetch,
    statistics
  };
};