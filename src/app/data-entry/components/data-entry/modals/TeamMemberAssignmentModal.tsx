'use client';

import { useState, useEffect, useCallback } from 'react';
import { TeamMember, Customer } from '@/src/app/data-entry/types/dataEntry';

interface TeamMemberAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMember: TeamMember;
  customers: Customer[];
  currentUserOffice: string;
  currentOperator: {
    id: string;
    name: string;
    fullName: string;
  };
  onAssignCustomers: (customerIds: string[], teamMemberNumber: string) => Promise<any>;
  onRemoveAssignment: (customerIds: string[]) => Promise<any>;
}

export default function TeamMemberAssignmentModal({
  isOpen,
  onClose,
  teamMember,
  customers,
  currentUserOffice,
  currentOperator,
  onAssignCustomers,
  onRemoveAssignment
}: TeamMemberAssignmentModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [assignedCustomers, setAssignedCustomers] = useState<Customer[]>([]);
  const [unassignedCustomers, setUnassignedCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'unassigned' | 'assigned' | 'all'>('unassigned');
  const [bulkSelectMode, setBulkSelectMode] = useState(false);

  // Filter and organize customers
  useEffect(() => {
    if (!teamMember?.teamMemberNumber) return;

    const assigned = customers.filter(customer => 
      customer.teamMemberNumber === teamMember.teamMemberNumber
    );
    
    const unassigned = customers.filter(customer => 
      !customer.teamMemberNumber || 
      customer.teamMemberNumber.trim() === '' ||
      customer.teamMemberNumber === teamMember.teamMemberNumber
    ).filter(customer => 
      !assigned.some(assigned => assigned._id === customer._id)
    );

    setAssignedCustomers(assigned);
    setUnassignedCustomers(unassigned);
    setSelectedCustomers([]);
  }, [customers, teamMember]);

  // Filter customers based on search term and view mode
  const getFilteredCustomers = useCallback(() => {
    let filtered = [];
    
    if (viewMode === 'assigned') {
      filtered = assignedCustomers;
    } else if (viewMode === 'unassigned') {
      filtered = unassignedCustomers;
    } else {
      filtered = [...assignedCustomers, ...unassignedCustomers];
    }

    if (searchTerm.trim() === '') {
      return filtered;
    }

    const term = searchTerm.toLowerCase();
    return filtered.filter(customer =>
      customer.name?.toLowerCase().includes(term) ||
      customer.customerNumber?.toLowerCase().includes(term) ||
      customer.phone?.some(phone => phone?.toLowerCase().includes(term)) || false ||
      customer.businessName?.toLowerCase().includes(term) ||
      customer.area?.toLowerCase().includes(term)
    );
  }, [assignedCustomers, unassignedCustomers, viewMode, searchTerm]);

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  // Handle bulk select/unselect all
  const handleBulkSelect = () => {
    const filtered = getFilteredCustomers();
    if (selectedCustomers.length === filtered.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filtered.map(c => c._id));
    }
  };

  // Handle assign selected customers
  const handleAssignSelected = async () => {
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer to assign.');
      return;
    }

    if (!teamMember.teamMemberNumber) {
      alert('Team member does not have a valid team number.');
      return;
    }

    setLoading(true);
    try {
      const result = await onAssignCustomers(selectedCustomers, teamMember.teamMemberNumber);
      if (result.success) {
        setSelectedCustomers([]);
        setBulkSelectMode(false);
      }
    } catch (error) {
      console.error('Error assigning customers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle remove assignment from selected customers
  const handleRemoveSelected = async () => {
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer to remove assignment.');
      return;
    }

    if (!confirm(`Are you sure you want to remove team assignment from ${selectedCustomers.length} customer(s)?`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await onRemoveAssignment(selectedCustomers);
      if (result.success) {
        setSelectedCustomers([]);
        setBulkSelectMode(false);
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  if (!isOpen) return null;

  const filteredCustomers = getFilteredCustomers();
  const isAssignedView = viewMode === 'assigned';
  const totalSelected = selectedCustomers.length;
  const totalFiltered = filteredCustomers.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[200]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Team Member Assignment</h2>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center">
                  <span className="bg-white bg-opacity-20 px-3 py-1 rounded-md">
                    {teamMember.name}
                  </span>
                  <span className="ml-2 bg-white bg-opacity-20 px-3 py-1 rounded-md">
                    {teamMember.teamMemberNumber || 'No TM Number'}
                  </span>
                  <span className={`ml-2 px-3 py-1 rounded-md text-xs font-medium ${
                    teamMember.status === 'active' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-red-500 text-white'
                  }`}>
                    {teamMember.status}
                  </span>
                </div>
              </div>
              <p className="text-purple-100 mt-2">
                Assign or remove customers from this team member. Assigned customers will be visible in mobile app.
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-700">{assignedCustomers.length}</div>
              <div className="text-sm text-gray-600">Currently Assigned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{unassignedCustomers.length}</div>
              <div className="text-sm text-gray-600">Available for Assignment</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(assignedCustomers.reduce((sum, c) => sum + (c.loanAmount || 0), 0))}
              </div>
              <div className="text-sm text-gray-600">Total Assigned Loan Amount</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-700">{totalSelected}</div>
              <div className="text-sm text-gray-600">Selected</div>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="px-6 py-4 border-b bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search customers by name, number, phone, business, or area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <div className="absolute right-3 top-2.5 text-gray-400">
                  🔍
                </div>
              </div>

              {/* View Mode */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-700 font-medium whitespace-nowrap">View:</span>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="unassigned">Unassigned Customers</option>
                  <option value="assigned">Assigned Customers</option>
                  <option value="all">All Customers</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center space-x-3">
              {bulkSelectMode ? (
                <>
                  <button
                    onClick={handleBulkSelect}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    {selectedCustomers.length === totalFiltered ? 'Unselect All' : 'Select All'}
                  </button>
                  <button
                    onClick={() => setBulkSelectMode(false)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                  >
                    Cancel Bulk
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setBulkSelectMode(true)}
                  className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
                >
                  Bulk Select
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {totalSelected} customer(s) selected • {totalFiltered} shown
            </div>
            <div className="flex items-center space-x-3">
              {totalSelected > 0 && (
                <>
                  {isAssignedView ? (
                    <button
                      onClick={handleRemoveSelected}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        `Remove Assignment (${totalSelected})`
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleAssignSelected}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Assigning...
                        </>
                      ) : (
                        `Assign to Team (${totalSelected})`
                      )}
                    </button>
                  )}
                </>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Customers List */}
        <div className="flex-1 overflow-auto">
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-5xl mb-4">
                {viewMode === 'assigned' ? '📋' : '👥'}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm 
                  ? 'No matching customers found' 
                  : viewMode === 'assigned' 
                    ? 'No customers assigned to this team member' 
                    : 'No customers available for assignment'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : viewMode === 'assigned'
                    ? 'Assign customers using the "Unassigned Customers" view'
                    : 'All customers are already assigned or no customers exist in this office'
                }
              </p>
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredCustomers.map((customer) => {
                  const isSelected = selectedCustomers.includes(customer._id);
                  const isAssigned = customer.teamMemberNumber === teamMember.teamMemberNumber;
                  
                  return (
                    <div
                      key={customer._id}
                      className={`border rounded-lg p-4 transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                      } ${isAssigned ? 'bg-green-50 border-green-200' : ''}`}
                      onClick={() => bulkSelectMode && handleCustomerSelect(customer._id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleCustomerSelect(customer._id)}
                              className="h-5 w-5 text-purple-600 rounded focus:ring-purple-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <h4 className="font-semibold text-gray-900">{customer.name}</h4>
                            {isAssigned && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                ✓ Assigned
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">Customer #:</span>
                              <span className="ml-2 font-medium">{customer.customerNumber}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Phone:</span>
                              <span className="ml-2 font-medium">{customer.phone?.join(', ')}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Business:</span>
                              <span className="ml-2 font-medium">{customer.businessName}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Area:</span>
                              <span className="ml-2 font-medium">{customer.area}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Loan Amount:</span>
                              <span className="ml-2 font-medium text-green-700">
                                {formatCurrency(customer.loanAmount || 0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Created:</span>
                              <span className="ml-2 font-medium">{formatDate(customer.createdAt)}</span>
                            </div>
                            {customer.teamMemberNumber && customer.teamMemberNumber !== teamMember.teamMemberNumber && (
                              <div className="col-span-2">
                                <span className="text-gray-600">Currently assigned to:</span>
                                <span className="ml-2 font-medium text-orange-700">
                                  {customer.teamMemberNumber}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-2 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomerSelect(customer._id);
                            }}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              isSelected
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                          
                          {isAssigned ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveAssignment([customer._id]);
                              }}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200"
                            >
                              Remove
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAssignCustomers([customer._id], teamMember.teamMemberNumber!);
                              }}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm font-medium hover:bg-green-200"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Office:</span> {currentUserOffice} | 
              <span className="font-medium ml-4">Operator:</span> {currentOperator.name} | 
              <span className="font-medium ml-4">Total Customers:</span> {customers.length}
            </div>
            <div className="text-xs text-gray-500">
              Team Member Number: {teamMember.teamMemberNumber || 'Not set'}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 Tip: Use bulk select to assign or remove multiple customers at once. 
            Only assigned customers will be visible to this team member in the mobile app.
          </p>
        </div>
      </div>
    </div>
  );
}