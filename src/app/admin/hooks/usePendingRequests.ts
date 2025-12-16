import { useState, useCallback } from 'react';
import { PendingRequest } from '../types';

export const usePendingRequests = () => {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/requests');
      
      if (!response.ok) {
        const fallbackResponse = await fetch('/api/data-entry/requests');
        if (!fallbackResponse.ok) throw new Error('Both endpoints failed');
        
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.success && Array.isArray(fallbackData.data?.requests)) {
          setRequests(fallbackData.data.requests);
        } else {
          setRequests([]);
        }
        return;
      }

      const data = await response.json();
      let requestsArray: PendingRequest[] = [];
      
      if (Array.isArray(data.data)) {
        requestsArray = data.data;
      } else if (Array.isArray(data.data?.requests)) {
        requestsArray = data.data.requests;
      } else if (Array.isArray(data.requests)) {
        requestsArray = data.requests;
      }
      
      setRequests(requestsArray);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { requests, loading, fetchData };
};