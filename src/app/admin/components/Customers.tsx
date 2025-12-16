'use client';

import { Customer, Filters } from '../types';
import SearchAndFilters from './SearchAndFilters';

interface CustomersProps {
  customers: Customer[];
  filteredAndSortedCustomers: Customer[];
  searchTerm: string;
  filters: Filters;
  sortOrder: 'asc' | 'desc';
  onSearchChange: (value: string) => void;
  onFilterChange: (key: keyof Filters, value: string) => void;
  onSortToggle: () => void;
  onClearFilters: () => void;
  onViewCustomerDetails: (customer: Customer) => void;
}

export default function Customers({
  customers,
  filteredAndSortedCustomers,
  searchTerm,
  filters,
  sortOrder,
  onSearchChange,
  onFilterChange,
  onSortToggle,
  onClearFilters,
  onViewCustomerDetails
}: CustomersProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">Manage all customer accounts and loan details</p>
        </div>
        <span className="text-sm text-gray-600">
          {customers.length} customers • Sorted {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
        </span>
      </div>

      {/* Search and Filters */}
      <SearchAndFilters
        searchTerm={searchTerm}
        filters={filters}
        sortOrder={sortOrder}
        customers={customers}
        onSearchChange={onSearchChange}
        onFilterChange={onFilterChange}
        onSortToggle={onSortToggle}
        onClearFilters={onClearFilters}
      />

      {/* Customers Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Number</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Office</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedCustomers.map((customer) => (
                <tr key={customer._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {customer.customerNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {customer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.businessName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {customer.officeCategory || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      customer.category === 'A' ? 'bg-green-100 text-green-800' :
                      customer.category === 'B' ? 'bg-yellow-100 text-yellow-800' :
                      customer.category === 'C' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {customer.category || 'Not specified'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => onViewCustomerDetails(customer)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAndSortedCustomers.length === 0 && (
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
  );
}