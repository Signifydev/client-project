import { useState, useCallback } from 'react';
import { Customer } from '../types';

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/customers');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCustomers(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { customers, loading, fetchData };
};