import { useState, useCallback } from 'react';
import { DashboardStats } from '../types';

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalLoans: 0,
    totalAmount: 0,
    totalCustomers: 0,
    totalTeamMembers: 0,
    pendingRequests: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, fetchData };
};