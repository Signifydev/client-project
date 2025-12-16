'use client';

import { useState, useMemo } from 'react';
import { Customer, Filters } from '../types';

interface SearchAndFiltersProps {
  searchTerm: string;
  filters: Filters;
  sortOrder: 'asc' | 'desc';
  customers: Customer[];
  onSearchChange: (value: string) => void;
  onFilterChange: (key: keyof Filters, value: string) => void;
  onSortToggle: () => void;
  onClearFilters: () => void;
}

export default function SearchAndFilters({
  searchTerm,
  filters,
  sortOrder,
  customers,
  onSearchChange,
  onFilterChange,
  onSortToggle,
  onClearFilters
}: SearchAndFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Memoize unique values for filter options
  const filterOptions = useMemo(() => {
    const loanTypes = [...new Set(customers.map(c => c.loanType).filter(Boolean))] as string[];
    const officeCategories = [...new Set(customers.map(c => c.officeCategory).filter(Boolean))] as string[];
    const customerCategories = [...new Set(customers.map(c => c.category).filter(Boolean))] as string[];

    return { loanTypes, officeCategories, customerCategories };
  }, [customers]);

  const hasActiveFilters = Object.values(filters).some(f => f) || searchTerm || sortOrder !== 'asc';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by customer name or customer number..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onSortToggle}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span>Sort</span>
            <span className={`transform ${sortOrder === 'asc' ? '' : 'rotate-180'}`}>↓</span>
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span>Filters</span>
            <span className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`}>▼</span>
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Customer Number Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Number
              </label>
              <input
                type="text"
                placeholder="Enter customer number..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.customerNumber}
                onChange={(e) => onFilterChange('customerNumber', e.target.value)}
              />
            </div>

            {/* Loan Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loan Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.loanType}
                onChange={(e) => onFilterChange('loanType', e.target.value)}
              >
                <option value="">All Loan Types</option>
                {filterOptions.loanTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.status}
                onChange={(e) => onFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Office Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Office Category
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.officeCategory}
                onChange={(e) => onFilterChange('officeCategory', e.target.value)}
              >
                <option value="">All Offices</option>
                {filterOptions.officeCategories.map(office => (
                  <option key={office} value={office}>{office}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={filters.category}
                onChange={(e) => onFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="A">Category A</option>
                <option value="B">Category B</option>
                <option value="C">Category C</option>
                {filterOptions.customerCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">
          Showing {customers.length} customers • Sorted {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
        </span>
        
        {hasActiveFilters && (
          <button onClick={onClearFilters} className="text-sm text-blue-600 hover:text-blue-800">
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}