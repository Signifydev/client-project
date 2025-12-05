import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Customer, CustomerDetails, Filters, CustomersSectionProps, Loan, EMIHistory } from '@/src/types/dataEntry';
import { useCustomers } from '@/src/hooks/useCustomers';
import { getStatusColor } from '@/src/utils/constants';
import { loanTypes, customerStatusOptions, officeCategories } from '@/src/utils/constants';

// Inline Error Display Component
const ErrorDisplay = ({ message }: { message: string }) => (
  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <span className="text-red-400 text-lg">⚠️</span>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-red-800">Error</h3>
        <p className="text-sm text-red-700 mt-1">{message}</p>
      </div>
    </div>
  </div>
);

// Inline Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Sort order type
type SortOrder = 'asc' | 'desc' | 'none';

export default function CustomersSection({
  currentUserOffice,
  onViewCustomerDetails,
  onUpdateEMI,
  onEditCustomer,
  onAddLoan,
  refreshKey
}: CustomersSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    customerNumber: '',
    loanType: '',
    status: '',
    officeCategory: ''
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // Correct destructuring based on useCustomers hook
  const { 
    customers, 
    loading, 
    error, 
    refetch,
    fetchCustomerDetails 
  } = useCustomers(currentUserOffice);

  useEffect(() => {
    refetch();
  }, [refreshKey, refetch]);

  // Sort customers by customer number
  const sortedAndFilteredCustomers = useMemo(() => {
    const filtered = customers.filter(customer => { // FIXED: Changed from let to const
      const matchesSearch = searchQuery === '' || 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customer.customerNumber && customer.customerNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (customer.businessName && customer.businessName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (customer.area && customer.area.toLowerCase().includes(searchQuery.toLowerCase()));

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

    // Apply sorting if sortOrder is not 'none'
    if (sortOrder !== 'none') {
      filtered.sort((a, b) => {
        const customerNumberA = a.customerNumber || '';
        const customerNumberB = b.customerNumber || '';
        
        if (customerNumberA < customerNumberB) {
          return sortOrder === 'asc' ? -1 : 1;
        }
        if (customerNumberA > customerNumberB) {
          return sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [customers, searchQuery, filters, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(current => {
      if (current === 'none') return 'asc';
      if (current === 'asc') return 'desc';
      return 'none';
    });
  };

  const getSortIcon = () => {
    switch (sortOrder) {
      case 'asc':
        return '↑';
      case 'desc':
        return '↓';
      default:
        return '⇅';
    }
  };

  const getEMIStatus = useCallback((customer: Customer) => {
    const today = new Date().toISOString().split('T')[0];
    
    const hasLoans = (customer as any).loans;
    const customerLoans = hasLoans || [];
    
    const hasPaymentToday = customerLoans.some((loan: any) => 
      (loan.emiHistory || []).some((payment: any) => 
        payment.paymentDate.split('T')[0] === today && payment.status === 'Paid'
      )
    );
    
    if (hasPaymentToday) return 'paid';
    
    const hasPartialPayment = customerLoans.some((loan: any) => 
      (loan.emiHistory || []).some((payment: any) => 
        payment.paymentDate.split('T')[0] === today && payment.status === 'Partial'
      )
    );
    
    if (hasPartialPayment) return 'partial';
    
    return 'unpaid';
  }, []);

  const handleViewDetails = async (customer: Customer) => {
    try {
      const customerId = customer._id || customer.id;
      if (!customerId) {
        alert('Customer ID not found');
        return;
      }

      const details = await fetchCustomerDetails(customerId);
      if (details) {
        onViewCustomerDetails(details);
      }
    } catch (error: any) {
      console.error('Error fetching customer details:', error);
      alert('Failed to fetch customer details: ' + error.message);
    }
  };

  const handleUpdateEMI = (customer: Customer) => {
    setSelectedCustomer(customer);
    onUpdateEMI(customer);
  };

  const handleViewEMICalendar = async (customer: Customer) => {
    try {
      const customerId = customer._id || customer.id;
      if (!customerId) {
        alert('Customer ID not found');
        return;
      }

      const details = await fetchCustomerDetails(customerId);
      if (details) {
        // You'll need to handle EMI calendar view differently
        // For now, let's open the customer details and navigate to EMI calendar from there
        onViewCustomerDetails(details);
        // In your CustomerDetailsModal, you'll need to trigger the EMI calendar modal
      }
    } catch (error: any) {
      console.error('Error fetching customer details for EMI calendar:', error);
      alert('Failed to fetch customer details: ' + error.message);
    }
  };

  const handleAddNewCustomer = () => {
    // This should trigger the Add Customer modal from the parent
    // Since we don't have direct access to setShowAddCustomer from parent,
    // we'll need to add a prop for this
    alert('Add New Customer functionality will be handled by the parent component');
    // In the parent component (DataEntryDashboard), make sure to handle this
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error.message || 'Failed to load customers'} />;
  }

  const customersToDisplay = sortedAndFilteredCustomers;

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
            <p className="text-sm text-gray-600 mt-1">Manage all customer records and information</p>
          </div>
          
          <button
            onClick={handleAddNewCustomer}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            <span>Add New Customer (Requires Admin Approval)</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-2/3">
            <input
              type="text"
              placeholder="Search by customer name, number, business, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <span className="text-gray-400 text-lg">🔍</span>
            </div>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-5 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-sm"
            >
              <span className="font-medium">Filters</span>
              <span className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            <button
              onClick={toggleSortOrder}
              className="px-5 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-sm"
              title={`Sort by Customer Number (${sortOrder === 'asc' ? 'Ascending' : sortOrder === 'desc' ? 'Descending' : 'None'})`}
            >
              <span className="font-medium">Sort</span>
              <span className="text-blue-600 font-bold">{getSortIcon()}</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 p-6 bg-gray-50 rounded-xl border border-gray-200 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Number
                </label>
                <input
                  type="text"
                  value={filters.customerNumber}
                  onChange={(e) => setFilters({ ...filters, customerNumber: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter customer number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loan Type
                </label>
                <select
                  value={filters.loanType}
                  onChange={(e) => setFilters({ ...filters, loanType: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  {loanTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  {customerStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Office Category
                </label>
                <select
                  value={filters.officeCategory}
                  onChange={(e) => setFilters({ ...filters, officeCategory: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Offices</option>
                  {officeCategories.map((office) => (
                    <option key={office} value={office}>
                      {office}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setFilters({
                  customerNumber: '',
                  loanType: '',
                  status: '',
                  officeCategory: ''
                })}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-800">{customersToDisplay.length}</span> of <span className="font-semibold text-gray-800">{customers.length}</span> customers
          {sortOrder !== 'none' && (
            <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Sorted: Customer Number {sortOrder === 'asc' ? 'A→Z' : 'Z→A'}
            </span>
          )}
        </div>
      </div>

      {customersToDisplay.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
          <div className="text-gray-300 text-6xl mb-6">👥</div>
          <h3 className="text-2xl font-semibold text-gray-800 mb-3">
            {customers.length === 0 ? 'No customers found' : 'No matching customers'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg">
            {customers.length === 0 
              ? 'Start by adding your first customer using the button above.'
              : 'Try adjusting your search or filters to find what you\'re looking for.'
            }
          </p>
          {customers.length === 0 && (
            <button
              onClick={handleAddNewCustomer}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Add Your First Customer
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white shadow-xl rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-8 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Customer Number
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Business
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Office
                  </th>
                  <th className="px-8 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customersToDisplay.map((customer) => {
                  const emiStatus = getEMIStatus(customer);
                  const statusColor = getStatusColor(emiStatus);
                  
                  return (
                    <tr 
                      key={customer._id || customer.id} 
                      className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 group"
                    >
                      {/* Customer Number */}
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-200">
                            <span className="text-white font-bold text-lg">
                              {customer.customerNumber?.charAt(2) || 'C'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors duration-200">
                              {customer.customerNumber || 'CN0000'}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {customer._id?.substring(0, 8) || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Name */}
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900 group-hover:text-gray-800">
                          {customer.name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="inline-flex items-center">
                            <span className="mr-1">📱</span>
                            {Array.isArray(customer.phone) ? customer.phone[0] : customer.phone || 'No Phone'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {customer.area || 'No Area'}
                        </div>
                      </td>
                      
                      {/* Business */}
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.businessName || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {customer.businessType || 'General Business'}
                        </div>
                        <div className="mt-2">
                          <span className={`px-2.5 py-1 inline-flex text-xs leading-4 font-bold rounded-full ${statusColor} shadow-sm`}>
                            {emiStatus.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      
                      {/* Office */}
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className={`px-3 py-1.5 inline-flex text-sm font-semibold rounded-lg ${
                            customer.officeCategory === 'Office 1' 
                              ? 'bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 border border-purple-200'
                          }`}>
                            {customer.officeCategory || 'Not Assigned'}
                          </span>
                          <div className="mt-2 text-xs text-gray-500">
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100">
                              {customer.category || 'C'} Category
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      {/* Actions */}
                      <td className="px-8 py-5 whitespace-nowrap">
                        <div className="flex flex-col space-y-3">
                          {/* Update EMI Button */}
                          <button
                            onClick={() => handleUpdateEMI(customer)}
                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group/action"
                          >
                            <span className="text-base">💰</span>
                            <span>Update EMI</span>
                          </button>
                          
                          {/* View Details Button */}
                          <button
                            onClick={() => handleViewDetails(customer)}
                            className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group/action"
                          >
                            <span className="text-base">👁️</span>
                            <span>View Details</span>
                          </button>
                          
                          {/* EMI Calendar Button */}
                          <button
                            onClick={() => handleViewEMICalendar(customer)}
                            className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-violet-600 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-violet-700 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 flex items-center justify-center gap-2 group/action"
                          >
                            <span className="text-base">📅</span>
                            <span>EMI Calendar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Footer with pagination info */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Page 1 of 1 • Showing {customersToDisplay.length} customers
              </div>
              <div className="flex space-x-2">
                <button
                  disabled
                  className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                >
                  ← Previous
                </button>
                <button
                  disabled
                  className="px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 rounded-lg cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}