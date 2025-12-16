'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic imports for better performance
const CustomerDetails = dynamic(() => import('@/src/app/admin/components/CustomerDetails'), {
  loading: () => <div>Loading Customer Details...</div>
});

const PendingRequests = dynamic(() => import('@/src/app/admin/components/PendingRequests'), {
  loading: () => <div>Loading Requests...</div>
});

const EnhancedReports = dynamic(() => import('@/src/app/admin/components/EnhancedReports'), {
  loading: () => <div>Loading Reports...</div>
});

const TeamManagement = dynamic(() => import('@/src/app/admin/components/TeamManagement'), {
  loading: () => <div>Loading Team Management...</div>
});

const CollectionView = dynamic(() => import('@/src/app/admin/components/CollectionView'), {
  loading: () => <div>Loading Collection...</div>
});

const Dashboard = dynamic(() => import('@/src/app/admin/components/Dashboard'), {
  loading: () => <div>Loading Dashboard...</div>
});

// Static imports for essential components
import Header from '@/src/app/admin/components/Header';
import Navigation from '@/src/app/admin/components/Navigation';
import Customers from '@/src/app/admin/components/Customers';

// Hooks
import { useDashboardStats } from '@/src/app/admin/hooks/useDashboardStats';
import { useCustomers } from '@/src/app/admin/hooks/useCustomers';
import { usePendingRequests } from '@/src/app/admin/hooks/usePendingRequests';

// Types
import { Customer, Filters } from '@/src/app/admin/types';

export default function AdminPage() {
  const router = useRouter();
  
  // State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Filters>({
    customerNumber: '',
    loanType: '',
    status: '',
    officeCategory: '',
    category: ''
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Custom hooks for data fetching
  const { 
    stats: dashboardStats, 
    loading: statsLoading, 
    fetchData: fetchDashboardData 
  } = useDashboardStats();
  
  const { 
    customers, 
    loading: customersLoading, 
    fetchData: fetchCustomers 
  } = useCustomers();
  
  const { 
    requests: pendingRequests, 
    loading: requestsLoading, 
    fetchData: fetchPendingRequests 
  } = usePendingRequests();

  // Memoized filtered customers
  const filteredAndSortedCustomers = useMemo(() => {
    return customers
      .filter((customer: Customer) => {
        const matchesSearch = searchTerm === '' || 
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.customerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone.includes(searchTerm);

        const matchesCustomerNumber = filters.customerNumber === '' || 
          customer.customerNumber.toLowerCase().includes(filters.customerNumber.toLowerCase());
        
        const matchesLoanType = filters.loanType === '' || 
          customer.loanType === filters.loanType;
        
        const matchesStatus = filters.status === '' || 
          customer.status === filters.status;

        const matchesOfficeCategory = filters.officeCategory === '' || 
          customer.officeCategory === filters.officeCategory;

        const matchesCategory = filters.category === '' || 
          customer.category === filters.category;

        return matchesSearch && matchesCustomerNumber && matchesLoanType && matchesStatus && matchesOfficeCategory && matchesCategory;
      })
      .sort((a: Customer, b: Customer) => {
        if (sortOrder === 'asc') {
          return a.customerNumber.localeCompare(b.customerNumber);
        }
        return b.customerNumber.localeCompare(a.customerNumber);
      });
  }, [customers, searchTerm, filters, sortOrder]);

  // Fetch data on tab change
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchDashboardData(),
        fetchCustomers(),
        fetchPendingRequests()
      ]);
    };
    loadData();
  }, [activeTab, fetchDashboardData, fetchCustomers, fetchPendingRequests]);

  // Event handlers
  const handleLogout = useCallback(() => {
    router.push('/auth');
  }, [router]);

  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      customerNumber: '',
      loanType: '',
      status: '',
      officeCategory: '',
      category: ''
    });
    setSearchTerm('');
    setSortOrder('asc');
  }, []);

  const handleSortToggle = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  const handleViewCustomerDetails = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setSelectedCustomer(null);
  }, []);

  const handleDeleteCustomer = useCallback(async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const response = await fetch('/api/admin/customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });

      if (response.ok) {
        alert('Customer deleted successfully!');
        fetchCustomers();
        fetchDashboardData();
        setSelectedCustomer(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete customer');
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }, [fetchCustomers, fetchDashboardData]);

  const handleApproveRequest = useCallback(async (request: any) => {
    try {
      const response = await fetch('/api/admin/approve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request._id, action: 'approve' }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        alert('Request approved successfully!');
        await Promise.all([fetchDashboardData(), fetchCustomers(), fetchPendingRequests()]);
      } else {
        alert(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }, [fetchDashboardData, fetchCustomers, fetchPendingRequests]);

  const handleRejectRequest = useCallback(async (request: any) => {
    try {
      const response = await fetch('/api/admin/approve-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request._id,
          action: 'reject',
          reason: 'Rejected by admin'
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        alert('Request rejected successfully!');
        await Promise.all([fetchDashboardData(), fetchPendingRequests()]);
      } else {
        alert(`Error: ${data.error || data.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  }, [fetchDashboardData, fetchPendingRequests]);

  // Loading state
  const loading = statsLoading || customersLoading || requestsLoading;

  // Render main content based on active tab
  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (selectedCustomer) {
      return (
        <CustomerDetails 
          customer={selectedCustomer} 
          onBack={handleBackToDashboard}
          onDelete={handleDeleteCustomer}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            stats={dashboardStats}
            pendingRequestsCount={pendingRequests.length}
            onViewCustomers={() => setActiveTab('customers')}
            onViewRequests={() => setActiveTab('requests')}
            onViewTeam={() => setActiveTab('team')}
            onViewReports={() => setActiveTab('reports')}
            onViewCollection={() => setActiveTab('collection')}
          />
        );
      case 'customers':
        return (
          <Customers
            customers={customers}
            filteredAndSortedCustomers={filteredAndSortedCustomers}
            searchTerm={searchTerm}
            filters={filters}
            sortOrder={sortOrder}
            onSearchChange={setSearchTerm}
            onFilterChange={handleFilterChange}
            onSortToggle={handleSortToggle}
            onClearFilters={handleClearFilters}
            onViewCustomerDetails={handleViewCustomerDetails}
          />
        );
      case 'requests':
        return (
          <PendingRequests
            requests={pendingRequests}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            onBack={() => setActiveTab('dashboard')}
          />
        );
      case 'reports':
        return <EnhancedReports onBack={() => setActiveTab('dashboard')} />;
      case 'team':
        return <TeamManagement onBack={() => setActiveTab('dashboard')} />;
      case 'collection':
        return <CollectionView onBack={() => setActiveTab('dashboard')} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onLogout={handleLogout} />
      <Navigation 
        activeTab={activeTab} 
        pendingRequestsCount={pendingRequests.length}
        onTabChange={setActiveTab}
      />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {renderMainContent()}
      </main>
    </div>
  );
}