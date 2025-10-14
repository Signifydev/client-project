'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Add these interfaces for TypeScript
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

export default function DataEntryDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showUpdateEMI, setShowUpdateEMI] = useState(false);
  
  // Real-time data states with proper types
  const [todayStats, setTodayStats] = useState<TodayStats>({
    emiCollected: 0,
    newCustomers: 0,
    pendingRequests: 0,
    totalCollection: 0
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New customer form state with proper type
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

  // EMI update form state with proper type
  const [emiUpdate, setEmiUpdate] = useState<EMIUpdate>({
    customerId: '',
    customerName: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    status: 'Paid',
    collectedBy: 'data_entry_operator_1'
  });

  // Fetch real-time data
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

  // UPDATED: Fetch customers for EMI updates
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

  // Load data when component mounts and when tab changes
  useEffect(() => {
    fetchDashboardData();
    if (activeTab === 'customers') fetchCustomers();
    if (activeTab === 'requests') fetchPendingRequests();
  }, [activeTab]);

  // NEW: Load customers when EMI modal opens
  useEffect(() => {
    if (showUpdateEMI) {
      console.log('EMI modal opened, fetching customers...');
      fetchCustomers();
    }
  }, [showUpdateEMI]);

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (customer.loanNumber && customer.loanNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    customer.phone.includes(searchQuery)
  );

  // NEW: Debug logging
  useEffect(() => {
    console.log('=== DATA ENTRY DEBUG ===');
    console.log('Total customers:', customers.length);
    console.log('Filtered customers:', filteredCustomers.length);
    console.log('Search query:', searchQuery);
    console.log('Show EMI modal:', showUpdateEMI);
    console.log('=======================');
  }, [customers, filteredCustomers, searchQuery, showUpdateEMI]);

  const handleLogout = () => {
    router.push('/auth');
  };

  // Add new customer (sends to database and creates approval request)
  const handleAddCustomer = async () => {
    setIsLoading(true);
    try {
      // Validate required fields
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
      
      // Refresh data
      fetchDashboardData();
      if (activeTab === 'requests') fetchPendingRequests();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Update EMI payment (saves to database)
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
      
      // Refresh dashboard stats
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

  // Add Customer Form (keep your existing code)
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

  // UPDATED: Update EMI Form with better search experience
  const renderUpdateEMIForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Update EMI Payment</h3>
            <button 
              onClick={() => {
                setShowUpdateEMI(false);
                setSelectedCustomer(null);
                setSearchQuery('');
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          {/* Customer Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Customer</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter name, phone, or loan number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              {customers.length} active customers available
            </p>
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="mb-4 max-h-40 overflow-y-auto border border-gray-200 rounded-md">
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
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-gray-500">
                  {customers.length === 0 ? 'No active customers found' : 'No customers match your search'}
                </div>
              )}
            </div>
          )}

          {/* Show message if no customers at all */}
          {customers.length === 0 && !searchQuery && (
            <div className="mb-4 p-3 bg-yellow-50 rounded-md">
              <div className="text-sm text-yellow-700">
                No active customers found. Customers need to be approved by Super Admin first.
              </div>
            </div>
          )}

          {/* Selected Customer Info */}
          {selectedCustomer && (
            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <div className="font-medium text-blue-900">{selectedCustomer.name}</div>
              <div className="text-sm text-blue-700">
                {selectedCustomer.loanNumber} • ₹{selectedCustomer.emiAmount} {selectedCustomer.loanType} EMI
              </div>
            </div>
          )}

          {/* EMI Update Form */}
          <div className="space-y-4">
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

  // Keep the rest of your render functions (EMI, Requests, Dashboard, Customers) exactly as they are
  // EMI Content
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

  // Requests Content (keep your existing code)
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

  // Dashboard Content (keep your existing code)
  const renderDashboard = () => (
    <div className="px-4 py-6 sm:px-0">
      {/* Today's Stats */}
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

      {/* Quick Actions */}
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

  // Customers Content (keep your existing code)
  const renderCustomers = () => (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, phone, or loan number..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowAddCustomer(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Add New Customer
          </button>
        </div>
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
                      <button className="text-green-600 hover:text-green-900">View Details</button>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
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
      {/* Header */}
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

      {/* Navigation Tabs */}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'customers' && renderCustomers()}
        {activeTab === 'emi' && renderEMI()}
        {activeTab === 'requests' && renderRequests()}
      </main>

      {/* Modals */}
      {showAddCustomer && renderAddCustomerForm()}
      {showUpdateEMI && renderUpdateEMIForm()}
    </div>
  );
}