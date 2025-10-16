'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Interfaces for TypeScript
interface Customer {
  _id: string;
  id?: string;
  name: string;
  phone: string;
  businessName: string;
  area: string;
  loanNumber?: string;
  loanAmount?: number;
  emiAmount?: number;
  loanType?: string;
  status?: string;
  userId?: string;
  email?: string;
  address?: string;
  businessType?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface Loan {
  _id: string;
  customerId: string;
  customerName: string;
  loanNumber: string;
  amount: number;
  emiAmount: number;
  loanType: string;
  dateApplied: string;
  loanDays: number;
  status?: string;
  createdBy?: string;
  createdAt?: string;
}

interface CustomerDetails {
  _id: string;
  name: string;
  phone: string;
  businessName: string;
  area: string;
  loanNumber: string;
  loanAmount: number;
  emiAmount: number;
  loanType: string;
  address: string;
  status: string;
  email?: string;
  businessType?: string;
  createdAt?: string;
  loans?: Loan[];
}

interface Request {
  _id: string;
  type: string;
  customerName: string;
  status: string;
  createdAt: string;
  data?: any;
}

interface TodayStats {
  emiCollected: number;
  newCustomers: number;
  pendingRequests: number;
  totalCollection: number;
}

interface NewCustomer {
  name: string;
  phone: string;
  businessName: string;
  area: string;
  loanNumber: string;
  loanAmount: string;
  emiAmount: string;
  loanType: string;
  address: string;
  createdBy: string;
}

interface EMIUpdate {
  customerId: string;
  customerName: string;
  paymentDate: string;
  amount: string;
  status: string;
  collectedBy: string;
}

interface EditCustomerData {
  name: string;
  phone: string;
  businessName: string;
  area: string;
  loanNumber: string;
  loanAmount: string;
  emiAmount: string;
  loanType: string;
  address: string;
  customerId: string;
}

interface Filters {
  loanNumber: string;
  loanType: string;
  status: string;
}

export default function DataEntryDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showUpdateEMI, setShowUpdateEMI] = useState(false);
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [newLoanData, setNewLoanData] = useState({
    amount: '',
    dateApplied: new Date().toISOString().split('T')[0],
    emiAmount: '',
    loanType: 'Monthly',
    loanDays: '30'
  });
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [editCustomerData, setEditCustomerData] = useState<EditCustomerData>({
    name: '',
    phone: '',
    businessName: '',
    area: '',
    loanNumber: '',
    loanAmount: '',
    emiAmount: '',
    loanType: 'Daily',
    address: '',
    customerId: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    loanNumber: '',
    loanType: '',
    status: ''
  });
  
  const [todayStats, setTodayStats] = useState<TodayStats>({
    emiCollected: 0,
    newCustomers: 0,
    pendingRequests: 0,
    totalCollection: 0
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [newCustomer, setNewCustomer] = useState<NewCustomer>({
    name: '',
    phone: '',
    businessName: '',
    area: '',
    loanNumber: '',
    loanAmount: '',
    emiAmount: '',
    loanType: 'Daily',
    address: '',
    createdBy: 'data_entry_operator_1'
  });

  const [emiUpdate, setEmiUpdate] = useState<EMIUpdate>({
    customerId: '',
    customerName: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    status: 'Paid',
    collectedBy: 'data_entry_operator_1'
  });

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchQuery === '' || 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.loanNumber && customer.loanNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      customer.phone.includes(searchQuery);

    const matchesLoanNumber = filters.loanNumber === '' || 
      (customer.loanNumber && customer.loanNumber.toLowerCase().includes(filters.loanNumber.toLowerCase()));
    
    const matchesLoanType = filters.loanType === '' || 
      customer.loanType === filters.loanType;
    
    const matchesStatus = filters.status === '' || 
      customer.status === filters.status;

    return matchesSearch && matchesLoanNumber && matchesLoanType && matchesStatus;
  });

  const renderSearchAndFilters = () => {
    const handleFilterChange = (key: keyof Filters, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
      setFilters({
        loanNumber: '',
        loanType: '',
        status: ''
      });
      setSearchQuery('');
    };

    const loanTypes = [...new Set(customers.map(customer => customer.loanType).filter(Boolean))];

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by customer name, phone, or loan number..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span>Filters</span>
              <span className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            
            {(filters.loanNumber || filters.loanType || filters.status || searchQuery) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Number
                </label>
                <input
                  type="text"
                  placeholder="Enter loan number..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.loanNumber}
                  onChange={(e) => handleFilterChange('loanNumber', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.loanType}
                  onChange={(e) => handleFilterChange('loanType', e.target.value)}
                >
                  <option value="">All Loan Types</option>
                  {loanTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            {(filters.loanNumber || filters.loanType || filters.status) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600">Active filters:</span>
                  {filters.loanNumber && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      Loan No: {filters.loanNumber}
                      <button 
                        onClick={() => handleFilterChange('loanNumber', '')}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.loanType && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      Type: {filters.loanType}
                      <button 
                        onClick={() => handleFilterChange('loanType', '')}
                        className="ml-1 text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filters.status && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                      Status: {filters.status}
                      <button 
                        onClick={() => handleFilterChange('status', '')}
                        className="ml-1 text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">
            Showing {filteredCustomers.length} of {customers.length} customers
          </span>
          
          {filteredCustomers.length < customers.length && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>
    );
  };

  const fetchDashboardData = async () => {
    try {
      const statsResponse = await fetch('/api/data-entry/dashboard/stats');
      if (!statsResponse.ok) throw new Error('Failed to fetch stats');
      const statsData = await statsResponse.json();
      setTodayStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers for EMI updates...');
      const response = await fetch('/api/data-entry/customers');
      if (response.ok) {
        const data = await response.json();
        console.log('Customers API response:', data);
        if (data.success) {
          setCustomers(data.data || []);
          console.log('Customers loaded:', data.data?.length || 0);
        }
      } else {
        console.error('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch('/api/data-entry/requests');
      if (!response.ok) throw new Error('Failed to fetch requests');
      const data = await response.json();
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setPendingRequests([]);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    if (activeTab === 'customers') fetchCustomers();
    if (activeTab === 'requests') fetchPendingRequests();
  }, [activeTab]);

  useEffect(() => {
    if (showUpdateEMI) {
      console.log('EMI modal opened, fetching customers...');
      fetchCustomers();
    }
  }, [showUpdateEMI]);

  // FIXED: handleViewDetails function that works with your API route
  const handleViewDetails = async (customer: Customer) => {
    try {
      console.log('🔍 handleViewDetails called with customer:', customer);
      setIsLoading(true);
      
      const customerId = customer._id || customer.id;
      console.log('📋 Customer ID to fetch:', customerId);
      
      if (!customerId) {
        alert('Customer ID not found');
        setIsLoading(false);
        return;
      }

      // Use the correct API endpoint that matches your route structure
      const response = await fetch(`/api/data-entry/customers/${customerId}`);
      console.log('🌐 API Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          // If customer not found in API, use the basic customer data we have
          console.log('⚠️ Customer not found in API, using basic data');
          const customerDetailsData: CustomerDetails = {
            _id: customer._id,
            name: customer.name,
            phone: customer.phone,
            businessName: customer.businessName,
            area: customer.area,
            loanNumber: customer.loanNumber || 'N/A',
            loanAmount: customer.loanAmount || 0,
            emiAmount: customer.emiAmount || 0,
            loanType: customer.loanType || 'Daily',
            address: customer.address || '',
            status: customer.status || 'active',
            email: customer.email,
            businessType: customer.businessType,
            createdAt: customer.createdAt,
            loans: [] // Initialize empty loans array
          };
          
          setCustomerDetails(customerDetailsData);
          setShowCustomerDetails(true);
          setIsLoading(false);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 API Response data:', data);
      
      if (data.success) {
        console.log('✅ Customer details fetched successfully:', data.data);
        setCustomerDetails(data.data);
        setShowCustomerDetails(true);
      } else {
        console.error('❌ API returned success:false', data.error);
        alert('Failed to fetch customer details: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('💥 Error in handleViewDetails:', error);
      // Fallback: use the basic customer data we already have
      const customerDetailsData: CustomerDetails = {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        businessName: customer.businessName,
        area: customer.area,
        loanNumber: customer.loanNumber || 'N/A',
        loanAmount: customer.loanAmount || 0,
        emiAmount: customer.emiAmount || 0,
        loanType: customer.loanType || 'Daily',
        address: customer.address || '',
        status: customer.status || 'active',
        email: customer.email,
        businessType: customer.businessType,
        createdAt: customer.createdAt,
        loans: []
      };
      
      setCustomerDetails(customerDetailsData);
      setShowCustomerDetails(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCustomer = (customer: CustomerDetails) => {
    setEditCustomerData({
      name: customer.name,
      phone: customer.phone,
      businessName: customer.businessName,
      area: customer.area,
      loanNumber: customer.loanNumber,
      loanAmount: customer.loanAmount.toString(),
      emiAmount: customer.emiAmount.toString(),
      loanType: customer.loanType,
      address: customer.address || '',
      customerId: customer._id
    });
    setShowEditCustomer(true);
    setShowCustomerDetails(false);
  };

  const handleAddNewLoan = async () => {
    if (!customerDetails) return;

    setIsLoading(true);
    try {
      if (!newLoanData.amount || !newLoanData.emiAmount || !newLoanData.loanDays) {
        alert('Please fill all required fields');
        setIsLoading(false);
        return;
      }

      console.log('Sending new loan data:', {
        customerId: customerDetails._id,
        customerName: customerDetails.name,
        loanNumber: customerDetails.loanNumber,
        amount: Number(newLoanData.amount),
        dateApplied: newLoanData.dateApplied,
        emiAmount: Number(newLoanData.emiAmount),
        loanType: newLoanData.loanType,
        loanDays: Number(newLoanData.loanDays),
        createdBy: 'data_entry_operator_1'
      });

      const response = await fetch('/api/data-entry/add-loan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerDetails._id,
          customerName: customerDetails.name,
          loanNumber: customerDetails.loanNumber,
          amount: Number(newLoanData.amount),
          dateApplied: newLoanData.dateApplied,
          emiAmount: Number(newLoanData.emiAmount),
          loanType: newLoanData.loanType,
          loanDays: Number(newLoanData.loanDays),
          createdBy: 'data_entry_operator_1'
        }),
      });

      console.log('Response status:', response.status);

      const responseText = await response.text();
      console.log('Raw response:', responseText.substring(0, 200));

      if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
        console.error('Server returned HTML instead of JSON. Likely a 404 error.');
        throw new Error('API endpoint not found. Please check if the server route is properly configured.');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error('Server returned invalid JSON. Response: ' + responseText.substring(0, 200));
      }

      console.log('Parsed response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to add new loan');
      }

      alert(data.message || 'New loan added successfully!');
      setShowAddLoanModal(false);
      setNewLoanData({
        amount: '',
        dateApplied: new Date().toISOString().split('T')[0],
        emiAmount: '',
        loanType: 'Monthly',
        loanDays: '30'
      });
      
      // Refresh customer details to show the new loan
      if (customerDetails._id) {
        handleViewDetails(customerDetails);
      }
    } catch (error: any) {
      console.error('Error adding new loan:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEditCustomer = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Starting edit customer request...');
      console.log('📦 Edit data:', editCustomerData);

      if (!editCustomerData.name || !editCustomerData.phone || !editCustomerData.area || !editCustomerData.loanNumber) {
        alert('Please fill all required fields');
        setIsLoading(false);
        return;
      }

      const apiUrl = '/api/data-entry/edit-customer-request';
      console.log('🌐 Calling API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editCustomerData,
          loanAmount: Number(editCustomerData.loanAmount),
          emiAmount: Number(editCustomerData.emiAmount),
          requestedBy: 'data_entry_operator_1'
        }),
      });

      console.log('📡 Response status:', response.status);

      const responseText = await response.text();
      console.log('📄 Raw response:', responseText);

      if (responseText.trim().startsWith('<!') || responseText.trim().startsWith('<html')) {
        console.error('❌ Server returned HTML instead of JSON. Likely a 404 error.');
        throw new Error('API endpoint not found. Please check the server.');
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        throw new Error('Server returned invalid JSON. Response: ' + responseText.substring(0, 200));
      }

      console.log('✅ Parsed response data:', data);
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      alert('Edit request submitted successfully! Waiting for admin approval.');
      setShowEditCustomer(false);
      setEditCustomerData({
        name: '',
        phone: '',
        businessName: '',
        area: '',
        loanNumber: '',
        loanAmount: '',
        emiAmount: '',
        loanType: 'Daily',
        address: '',
        customerId: ''
      });
      
      if (activeTab === 'requests') fetchPendingRequests();
    } catch (error: any) {
      console.error('💥 Error in handleSaveEditCustomer:', error);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    router.push('/auth');
  };

  const handleAddCustomer = async () => {
    setIsLoading(true);
    try {
      if (!newCustomer.name || !newCustomer.phone || !newCustomer.area || !newCustomer.loanNumber) {
        alert('Please fill all required fields');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/data-entry/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCustomer,
          loanAmount: Number(newCustomer.loanAmount),
          emiAmount: Number(newCustomer.emiAmount),
          createdBy: 'data_entry_operator_1'
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add customer');
      }

      alert(data.message);
      setShowAddCustomer(false);
      setNewCustomer({
        name: '',
        phone: '',
        businessName: '',
        area: '',
        loanNumber: '',
        loanAmount: '',
        emiAmount: '',
        loanType: 'Daily',
        address: '',
        createdBy: 'data_entry_operator_1'
      });
      
      fetchDashboardData();
      if (activeTab === 'requests') fetchPendingRequests();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEMI = async () => {
    if (!selectedCustomer) {
      alert('Please select a customer first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/data-entry/emi-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emiUpdate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update EMI');
      }

      const data = await response.json();
      alert(data.message);
      setShowUpdateEMI(false);
      setSelectedCustomer(null);
      setSearchQuery('');
      setEmiUpdate({
        customerId: '',
        customerName: '',
        paymentDate: new Date().toISOString().split('T')[0],
        amount: '',
        status: 'Paid',
        collectedBy: 'data_entry_operator_1'
      });
      
      fetchDashboardData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEmiUpdate(prev => ({
      ...prev,
      customerId: customer._id || customer.id || '',
      customerName: customer.name,
      amount: customer.emiAmount ? customer.emiAmount.toString() : ''
    }));
  };

  const renderAddCustomerForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Add New Customer</h3>
            <button 
              onClick={() => setShowAddCustomer(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                placeholder="Enter full name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                placeholder="Enter phone number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newCustomer.businessName}
                onChange={(e) => setNewCustomer({...newCustomer, businessName: e.target.value})}
                placeholder="Enter business name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Area *</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newCustomer.area}
                onChange={(e) => setNewCustomer({...newCustomer, area: e.target.value})}
                placeholder="Enter area"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loan Number *</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newCustomer.loanNumber}
                onChange={(e) => setNewCustomer({...newCustomer, loanNumber: e.target.value})}
                placeholder="e.g., LN001234"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type *</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newCustomer.loanType}
                onChange={(e) => setNewCustomer({...newCustomer, loanType: e.target.value})}
              >
                <option value="Daily">Daily EMI</option>
                <option value="Weekly">Weekly EMI</option>
                <option value="Monthly">Monthly EMI</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount *</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newCustomer.loanAmount}
                onChange={(e) => setNewCustomer({...newCustomer, loanAmount: e.target.value})}
                placeholder="Enter loan amount"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">EMI Amount *</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newCustomer.emiAmount}
                onChange={(e) => setNewCustomer({...newCustomer, emiAmount: e.target.value})}
                placeholder="Enter EMI amount"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                placeholder="Enter complete address"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button 
              onClick={() => setShowAddCustomer(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              onClick={handleAddCustomer}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAddLoanModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Add New Loan</h3>
            <button 
              onClick={() => setShowAddLoanModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-blue-400 text-lg">👤</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Customer</h3>
                  <div className="mt-1 text-sm text-blue-700">
                    <p>{customerDetails?.name} • {customerDetails?.phone}</p>
                    <p>Loan Number: {customerDetails?.loanNumber}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount *</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newLoanData.amount}
                onChange={(e) => setNewLoanData({...newLoanData, amount: e.target.value})}
                placeholder="Enter loan amount"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Applied *</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newLoanData.dateApplied}
                onChange={(e) => setNewLoanData({...newLoanData, dateApplied: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">EMI Amount *</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newLoanData.emiAmount}
                onChange={(e) => setNewLoanData({...newLoanData, emiAmount: e.target.value})}
                placeholder="Enter EMI amount"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type *</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newLoanData.loanType}
                onChange={(e) => setNewLoanData({...newLoanData, loanType: e.target.value})}
              >
                <option value="Daily">Daily EMI</option>
                <option value="Weekly">Weekly EMI</option>
                <option value="Monthly">Monthly EMI</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loan Duration (Days) *</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newLoanData.loanDays}
                onChange={(e) => setNewLoanData({...newLoanData, loanDays: e.target.value})}
                placeholder="Enter number of days"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button 
              onClick={() => setShowAddLoanModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              onClick={handleAddNewLoan}
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Adding...' : 'Add Loan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUpdateEMIForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Update EMI Payment</h3>
            <button 
              onClick={() => {
                setShowUpdateEMI(false);
                setSelectedCustomer(null);
                setSearchQuery('');
                setFilters({
                  loanNumber: '',
                  loanType: '',
                  status: ''
                });
                setShowFilters(false);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            {renderSearchAndFilters()}

            {searchQuery && (
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(customer => (
                    <div 
                      key={customer._id || customer.id}
                      className="p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleSearchCustomer(customer)}
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-gray-600">
                        {customer.loanNumber} • {customer.phone} • ₹{customer.emiAmount} {customer.loanType} EMI
                      </div>
                      <div className="text-xs text-gray-500">
                        {customer.businessName} • {customer.area}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-gray-500">
                    {customers.length === 0 ? 'No active customers found' : 'No customers match your search'}
                  </div>
                )}
              </div>
            )}

            {customers.length === 0 && !searchQuery && (
              <div className="p-3 bg-yellow-50 rounded-md">
                <div className="text-sm text-yellow-700">
                  No active customers found. Customers need to be approved by Super Admin first.
                </div>
              </div>
            )}

            {selectedCustomer && (
              <div className="p-3 bg-blue-50 rounded-md">
                <div className="font-medium text-blue-900">{selectedCustomer.name}</div>
                <div className="text-sm text-blue-700">
                  {selectedCustomer.loanNumber} • ₹{selectedCustomer.emiAmount} {selectedCustomer.loanType} EMI
                </div>
                <div className="text-xs text-blue-600">
                  {selectedCustomer.businessName} • {selectedCustomer.area}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={emiUpdate.paymentDate}
                onChange={(e) => setEmiUpdate({...emiUpdate, paymentDate: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid *</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={emiUpdate.amount}
                onChange={(e) => setEmiUpdate({...emiUpdate, amount: e.target.value})}
                placeholder="Enter amount paid"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={emiUpdate.status}
                onChange={(e) => setEmiUpdate({...emiUpdate, status: e.target.value})}
              >
                <option value="Paid">Paid</option>
                <option value="Partial">Partial Payment</option>
                <option value="Due">Due</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button 
              onClick={() => {
                setShowUpdateEMI(false);
                setSelectedCustomer(null);
                setSearchQuery('');
                setFilters({
                  loanNumber: '',
                  loanType: '',
                  status: ''
                });
                setShowFilters(false);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              onClick={handleUpdateEMI}
              disabled={!selectedCustomer || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update EMI'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCustomerDetails = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Customer Details</h3>
            <button 
              onClick={() => setShowCustomerDetails(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {customerDetails ? (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                    <p className="mt-1 text-sm text-gray-900">{customerDetails.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <p className="mt-1 text-sm text-gray-900">{customerDetails.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{customerDetails.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <p className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customerDetails.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : customerDetails.status === 'inactive'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {customerDetails.status || 'Unknown'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Name</label>
                    <p className="mt-1 text-sm text-gray-900">{customerDetails.businessName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Type</label>
                    <p className="mt-1 text-sm text-gray-900">{customerDetails.businessType || 'Not specified'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Area</label>
                    <p className="mt-1 text-sm text-gray-900">{customerDetails.area}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">{customerDetails.address || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">Loan Information</h4>
                  <button 
                    onClick={() => setShowAddLoanModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                  >
                    + Add New Loan
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    <h5 className="font-medium text-gray-900 mb-2">Original Loan</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Loan Number</label>
                        <p className="text-gray-900">{customerDetails.loanNumber}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Loan Amount</label>
                        <p className="text-gray-900">₹{customerDetails.loanAmount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">EMI Amount</label>
                        <p className="text-gray-900">₹{customerDetails.emiAmount}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500">Loan Type</label>
                        <p className="text-gray-900">{customerDetails.loanType}</p>
                      </div>
                    </div>
                  </div>

                  {customerDetails.loans && customerDetails.loans.map((loan: Loan, index: number) => (
                    <div key={loan._id} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-medium text-blue-900">Additional Loan #{index + 1}</h5>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          New
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <label className="block text-xs font-medium text-blue-600">Loan Number</label>
                          <p className="text-blue-900">{loan.loanNumber}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-600">Loan Amount</label>
                          <p className="text-blue-900">₹{loan.amount?.toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-600">EMI Amount</label>
                          <p className="text-blue-900">₹{loan.emiAmount}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-600">Loan Type</label>
                          <p className="text-blue-900">{loan.loanType}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-600">Date Applied</label>
                          <p className="text-blue-900">{new Date(loan.dateApplied).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-blue-600">Duration</label>
                          <p className="text-blue-900">{loan.loanDays} days</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!customerDetails.loans || customerDetails.loans.length === 0) && (
                    <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-500">No additional loans added yet</p>
                      <p className="text-sm text-gray-400">Click "Add New Loan" to add more loans</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button 
                  onClick={() => setShowCustomerDetails(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button 
                  onClick={() => handleEditCustomer(customerDetails)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Loading customer details...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderEditCustomer = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Edit Customer</h3>
            <button 
              onClick={() => setShowEditCustomer(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name *</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={editCustomerData.name}
                onChange={(e) => setEditCustomerData({...editCustomerData, name: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={editCustomerData.phone}
                onChange={(e) => setEditCustomerData({...editCustomerData, phone: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={editCustomerData.businessName}
                onChange={(e) => setEditCustomerData({...editCustomerData, businessName: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Area *</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={editCustomerData.area}
                onChange={(e) => setEditCustomerData({...editCustomerData, area: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loan Number *</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={editCustomerData.loanNumber}
                onChange={(e) => setEditCustomerData({...editCustomerData, loanNumber: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type *</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={editCustomerData.loanType}
                onChange={(e) => setEditCustomerData({...editCustomerData, loanType: e.target.value})}
              >
                <option value="Daily">Daily EMI</option>
                <option value="Weekly">Weekly EMI</option>
                <option value="Monthly">Monthly EMI</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount *</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={editCustomerData.loanAmount}
                onChange={(e) => setEditCustomerData({...editCustomerData, loanAmount: e.target.value})}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">EMI Amount *</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={editCustomerData.emiAmount}
                onChange={(e) => setEditCustomerData({...editCustomerData, emiAmount: e.target.value})}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                value={editCustomerData.address}
                onChange={(e) => setEditCustomerData({...editCustomerData, address: e.target.value})}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button 
              onClick={() => setShowEditCustomer(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveEditCustomer}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEMI = () => (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">EMI Management</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Update daily EMI collections</p>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-blue-900 mb-4">Update EMI Payment</h4>
                <p className="text-gray-600 mb-4">Search for a customer and record their EMI payment</p>
                <button 
                  onClick={() => setShowUpdateEMI(true)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Update EMI
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-green-900 mb-4">Today's EMI Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{todayStats.emiCollected}</p>
                    <p className="text-sm text-green-700">EMI Collected</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">₹{todayStats.totalCollection}</p>
                    <p className="text-sm text-green-700">Total Collection</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRequests = () => (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Pending Requests</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Requests waiting for admin approval</p>
        </div>
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingRequests.map((request) => (
                  <tr key={request._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{request.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.customerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {pendingRequests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No pending requests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="px-4 py-6 sm:px-0">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">EMI Collected Today</dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">{todayStats.emiCollected}</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">New Customers</dt>
            <dd className="mt-1 text-3xl font-semibold text-blue-600">{todayStats.newCustomers}</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Pending Requests</dt>
            <dd className="mt-1 text-3xl font-semibold text-orange-600">{todayStats.pendingRequests}</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Today's Collection</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">₹{todayStats.totalCollection}</dd>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Update EMI</h3>
          <p className="text-gray-600 mb-4">Record daily EMI payments from customers</p>
          <button 
            onClick={() => setShowUpdateEMI(true)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Update EMI
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Add New Customer</h3>
          <p className="text-gray-600 mb-4">Onboard new customers (requires approval)</p>
          <button 
            onClick={() => setShowAddCustomer(true)}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
          >
            Add Customer
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium mb-4">Search Customers</h3>
          <p className="text-gray-600 mb-4">Find and view customer details</p>
          <button 
            onClick={() => setActiveTab('customers')}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );

  const renderCustomers = () => (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <button 
              onClick={() => setShowAddCustomer(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 w-full sm:w-auto"
            >
              Add New Customer
            </button>
          </div>
        </div>
        
        {renderSearchAndFilters()}
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Customers List</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">All active customers and their loan details</p>
        </div>
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.businessName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.area}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.loanNumber} • ₹{customer.emiAmount} {customer.loanType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => {
                          handleSearchCustomer(customer);
                          setShowUpdateEMI(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Update EMI
                      </button>
                      <button 
                        onClick={() => handleViewDetails(customer)}
                        className="text-green-600 hover:text-green-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Data Entry Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, Data Entry Operator</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'customers', label: 'Customers' },
              { id: 'emi', label: 'EMI' },
              { id: 'requests', label: 'Requests' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'customers' && renderCustomers()}
        {activeTab === 'emi' && renderEMI()}
        {activeTab === 'requests' && renderRequests()}
      </main>

      {showAddCustomer && renderAddCustomerForm()}
      {showUpdateEMI && renderUpdateEMIForm()}
      {showCustomerDetails && renderCustomerDetails()}
      {showEditCustomer && renderEditCustomer()}
      {showAddLoanModal && renderAddLoanModal()} 
    </div>
  );
}