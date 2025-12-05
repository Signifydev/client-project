import { useState, useEffect, useCallback, useRef } from 'react';
import type { Customer, CustomerDetails, EditCustomerData, Filters } from '@/src/types/dataEntry';

interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  error: Error | null;
  refetch: (force?: boolean) => Promise<void>;
  fetchCustomerDetails: (customerId: string) => Promise<CustomerDetails | null>;
  searchCustomers: (query: string, filters: Filters) => Customer[];
  addCustomer: (customerData: FormData) => Promise<boolean>;
  editCustomer: (editData: EditCustomerData) => Promise<boolean>;
  refreshCustomer: (customerId: string) => Promise<CustomerDetails | null>;
}

// Cache implementation
const customersCache = new Map<string, { data: Customer[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const pendingRequests = new Map<string, Promise<Customer[]>>();

export const useCustomers = (currentUserOffice?: string, refreshKey = 0): UseCustomersReturn => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCustomers = useCallback(async (forceRefresh = false): Promise<Customer[]> => {
    const cacheKey = `customers_${currentUserOffice || 'all'}_${refreshKey}`; // Include refreshKey in cache key
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = customersCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }
    }
    
    // Check for pending request
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey)!;
    }
    
    // Create new request
    const requestPromise = (async () => {
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();
        
        let url = '/api/data-entry/customers';
        if (currentUserOffice) {
          url += `?officeCategory=${encodeURIComponent(currentUserOffice)}`;
        }
        
        const response = await fetch(url, {
          signal: abortControllerRef.current.signal,
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch customers: ${response.status}`);
        }
        
        const responseData = await response.json();
        
        if (!responseData.success) {
          throw new Error(responseData.error || 'Failed to fetch customers');
        }
        
        const data: Customer[] = responseData.data || [];
        
        // Update cache
        customersCache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        return data;
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Customers request aborted');
          return [];
        }
        throw err;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();
    
    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }, [currentUserOffice, refreshKey]); // Add refreshKey dependency

  const refetch = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchCustomers(force);
      setCustomers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch customers';
      setError(new Error(errorMessage));
      console.error('Error fetching customers:', err);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [fetchCustomers]);

  const fetchCustomerDetails = useCallback(async (customerId: string): Promise<CustomerDetails | null> => {
    setLoading(true);
    try {
      const response = await fetch(`/api/data-entry/customers/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return data.data;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching customer details:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchCustomers = useCallback((query: string, filters: Filters): Customer[] => {
    return customers.filter(customer => {
      const matchesSearch = query === '' || 
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        (customer.customerNumber && customer.customerNumber.toLowerCase().includes(query.toLowerCase()));

      const matchesCustomerNumber = filters.customerNumber === '' || 
        (customer.customerNumber && customer.customerNumber.toLowerCase().includes(filters.customerNumber.toLowerCase()));
      
      const matchesLoanType = filters.loanType === '' || 
        customer.loanType === filters.loanType;
      
      const matchesStatus = filters.status === '' || 
        customer.status === filters.status;

      const matchesOfficeCategory = filters.officeCategory === '' || 
        customer.officeCategory === filters.officeCategory;

      return matchesSearch && matchesCustomerNumber && matchesLoanType && matchesStatus && matchesOfficeCategory;
    });
  }, [customers]);

  const addCustomer = useCallback(async (customerData: FormData): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch('/api/data-entry/customers', {
        method: 'POST',
        body: customerData,
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Server returned invalid response');
      }

      if (!response.ok) {
        if (data.missingFields) {
          throw new Error(`Missing required fields: ${data.missingFields.join(', ')}`);
        } else if (data.error) {
          throw new Error(data.error);
        } else {
          throw new Error(`Failed to submit customer request: ${response.status} ${response.statusText}`);
        }
      }

      // Clear cache and refresh after adding
      customersCache.clear();
      await refetch(true);
      return data.success;
    } catch (err) {
      console.error('Error adding customer:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add customer';
      setError(new Error(errorMessage));
      return false;
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  const editCustomer = useCallback(async (editData: EditCustomerData): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch('/api/data-entry/edit-customer-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Server returned invalid JSON');
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      // Clear cache and refresh after editing
      customersCache.clear();
      await refetch(true);
      return data.success;
    } catch (err) {
      console.error('Error editing customer:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to edit customer';
      setError(new Error(errorMessage));
      return false;
    } finally {
      setLoading(false);
    }
  }, [refetch]);

  const refreshCustomer = useCallback(async (customerId: string): Promise<CustomerDetails | null> => {
    try {
      const response = await fetch(`/api/data-entry/customers/${customerId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return data.data;
        }
      }
      return null;
    } catch (error) {
      console.error('Error refreshing customer data:', error);
      return null;
    }
  }, []);

  // Initial fetch - runs when currentUserOffice OR refreshKey changes
  useEffect(() => {
    refetch();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [refetch, refreshKey]); // Add refreshKey dependency

  return {
    customers,
    loading,
    error,
    refetch,
    fetchCustomerDetails,
    searchCustomers,
    addCustomer,
    editCustomer,
    refreshCustomer,
  };
};