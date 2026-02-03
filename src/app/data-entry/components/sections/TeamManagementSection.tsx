'use client';

import { useState, useEffect, useCallback } from 'react';
import { TeamMember, Customer, TeamManagementStats } from '@/src/app/data-entry/types/dataEntry';
import TeamMemberAssignmentModal from '../data-entry/modals/TeamMemberAssignmentModal';

interface TeamManagementSectionProps {
  currentUserOffice: string;
  currentOperator: {
    id: string;
    name: string;
    fullName: string;
    permissions?: 'only_data_entry' | 'data_entry_plus_team';
  };
  refreshKey: number;
  onManageTeamMember: (teamMember: TeamMember) => void;
}

export default function TeamManagementSection({ 
  currentUserOffice, 
  currentOperator,
  refreshKey,
  onManageTeamMember 
}: TeamManagementSectionProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TeamManagementStats | null>(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  // Fetch team members (Recovery Team only)
  const fetchTeamMembers = useCallback(async () => {
    try {
      console.log('📥 Fetching team members for office:', currentUserOffice);
      const response = await fetch(`/api/data-entry/team-members?officeCategory=${currentUserOffice}`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Found ${data.data.length} team members`);
        setTeamMembers(data.data);
      } else {
        console.error('❌ Error fetching team members:', data.error);
        setTeamMembers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching team members:', error);
      setTeamMembers([]);
    }
  }, [currentUserOffice]);

  // Fetch customers for the current office
  const fetchCustomers = useCallback(async () => {
    try {
      console.log('📥 Fetching customers for office:', currentUserOffice);
      const response = await fetch(`/api/data-entry/customers?officeCategory=${currentUserOffice}&includeTeamAssignment=true`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Found ${data.data.length} customers`);
        setCustomers(data.data);
      } else {
        console.error('❌ Error fetching customers:', data.error);
        setCustomers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      setCustomers([]);
    }
  }, [currentUserOffice]);

  // Fetch team management statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/data-entry/team-management/stats?officeCategory=${currentUserOffice}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [currentUserOffice]);

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTeamMembers(),
        fetchCustomers(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchTeamMembers, fetchCustomers, fetchStats]);

  // Initial load and refresh on key change
  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // Handle manage team member click
  const handleManageTeamMember = (teamMember: TeamMember) => {
    console.log('👥 Managing team member:', teamMember.name);
    setSelectedTeamMember(teamMember);
    setShowAssignmentModal(true);
  };

  // Handle customer assignment
  const handleAssignCustomers = async (customerIds: string[], teamMemberNumber: string) => {
    try {
      console.log('🔗 Assigning customers:', customerIds.length, 'to team member:', teamMemberNumber);
      
      const response = await fetch('/api/data-entry/customers/assign-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerIds,
          teamMemberNumber,
          assignedBy: currentOperator.id,
          assignedByOffice: currentUserOffice,
          notes: `Assigned by ${currentOperator.name}`
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Assignment successful:', data.data.assignedCount, 'customers assigned');
        alert(`Successfully assigned ${data.data.assignedCount} customer(s) to team member ${teamMemberNumber}`);
        
        // Refresh data
        loadData();
        setShowAssignmentModal(false);
        setSelectedTeamMember(null);
        
        return { success: true, data: data.data };
      } else {
        console.error('❌ Assignment failed:', data.error);
        alert(`Failed to assign customers: ${data.error || 'Unknown error'}`);
        return { success: false, error: data.error };
      }
    } catch (error: any) {
      console.error('❌ Error assigning customers:', error);
      alert(`Error assigning customers: ${error.message || 'Unknown error'}`);
      return { success: false, error: error.message };
    }
  };

  // Handle remove assignment
  const handleRemoveAssignment = async (customerIds: string[]) => {
    try {
      console.log('🗑️ Removing assignment from:', customerIds.length, 'customers');
      
      const response = await fetch('/api/data-entry/customers/remove-team-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerIds,
          removedBy: currentOperator.id,
          notes: `Removed by ${currentOperator.name}`
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log('✅ Removal successful:', data.data.removedCount, 'customers updated');
        alert(`Successfully removed assignment from ${data.data.removedCount} customer(s)`);
        
        // Refresh data
        loadData();
        
        return { success: true, data: data.data };
      } else {
        console.error('❌ Removal failed:', data.error);
        alert(`Failed to remove assignment: ${data.error || 'Unknown error'}`);
        return { success: false, error: data.error };
      }
    } catch (error: any) {
      console.error('❌ Error removing assignment:', error);
      alert(`Error removing assignment: ${error.message || 'Unknown error'}`);
      return { success: false, error: error.message };
    }
  };

  // Filter team members based on search
  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = searchTerm === '' || 
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.teamMemberNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'assigned') {
      const assignedCount = customers.filter(c => c.teamMemberNumber === member.teamMemberNumber).length;
      return matchesSearch && assignedCount > 0;
    }
    if (filterStatus === 'unassigned') {
      const assignedCount = customers.filter(c => c.teamMemberNumber === member.teamMemberNumber).length;
      return matchesSearch && assignedCount === 0;
    }
    return matchesSearch;
  });

  // Filter customers based on search and filter
  const filteredCustomers = customers.filter(customer => {
    // Apply customer filter
    if (customerFilter === 'assigned' && (!customer.teamMemberNumber || customer.teamMemberNumber.trim() === '')) {
      return false;
    }
    if (customerFilter === 'unassigned' && customer.teamMemberNumber && customer.teamMemberNumber.trim() !== '') {
      return false;
    }
    
    // Apply search term
    if (customerSearchTerm) {
      const searchLower = customerSearchTerm.toLowerCase();
      return (
        customer.name?.toLowerCase().includes(searchLower) || false ||
        customer.customerNumber?.toLowerCase().includes(searchLower) || false ||
        customer.phone?.some(p => p?.includes(searchLower)) || false ||
        customer.businessName?.toLowerCase().includes(searchLower) || false ||
        customer.area?.toLowerCase().includes(searchLower) || false ||
        (customer.teamMemberNumber && customer.teamMemberNumber.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  // Get assigned customers count for a team member
  const getAssignedCustomersCount = (teamMemberNumber: string) => {
    return customers.filter(customer => customer.teamMemberNumber === teamMemberNumber).length;
  };

  // Get total loan amount for assigned customers
  const getTotalLoanAmount = (teamMemberNumber: string) => {
    const assignedCustomers = customers.filter(c => c.teamMemberNumber === teamMemberNumber);
    return assignedCustomers.reduce((total, customer) => {
      return total + (customer.loanAmount || 0);
    }, 0);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Handle refresh
  const handleRefresh = () => {
    console.log('🔄 Refreshing team management data...');
    loadData();
  };

  // Handle quick assign to team member
  const handleQuickAssign = async (customerId: string, teamMemberNumber: string) => {
    if (!teamMemberNumber || teamMemberNumber === '') {
      alert('Please select a valid team member number');
      return;
    }

    try {
      console.log('🔗 Quick assigning customer', customerId, 'to', teamMemberNumber);
      
      const response = await fetch('/api/data-entry/customers/assign-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerIds: [customerId],
          teamMemberNumber,
          assignedBy: currentOperator.id,
          assignedByOffice: currentUserOffice,
          notes: `Quick assign by ${currentOperator.name}`
        }),
      });

      const data = await response.json();
      console.log('Quick assign response:', data);

      if (response.ok && data.success) {
        alert(`✅ Customer assigned to ${teamMemberNumber}`);
        loadData();
      } else {
        alert(`❌ Failed to assign: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error quick assigning:', error);
      alert(`❌ Error: ${error.message || 'Failed to assign customer'}`);
    }
  };

  // Handle quick remove assignment
  const handleQuickRemove = async (customerId: string) => {
    if (!confirm('Are you sure you want to remove team assignment from this customer?')) {
      return;
    }

    try {
      console.log('🗑️ Quick removing assignment from customer:', customerId);
      
      const response = await fetch('/api/data-entry/customers/remove-team-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerIds: [customerId],
          removedBy: currentOperator.id,
          notes: `Quick removal by ${currentOperator.name}`
        }),
      });

      const data = await response.json();
      console.log('Quick remove response:', data);

      if (response.ok && data.success) {
        alert('✅ Assignment removed successfully');
        loadData();
      } else {
        alert(`❌ Failed to remove: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error removing assignment:', error);
      alert(`❌ Error: ${error.message || 'Failed to remove assignment'}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
        <p className="text-center text-gray-600 mt-4">Loading team management data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search for Team Members */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search team members by name, number, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <div className="absolute right-3 top-2.5 text-gray-400">
                🔍
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-gray-700 font-medium">Filter:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Members</option>
                <option value="assigned">With Assignments</option>
                <option value="unassigned">No Assignments</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredTeamMembers.length} of {teamMembers.length} team members
          </div>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeamMembers.map((member) => {
          const assignedCount = getAssignedCustomersCount(member.teamMemberNumber || '');
          const totalLoanAmount = getTotalLoanAmount(member.teamMemberNumber || '');
          
          return (
            <div key={member._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Team Member Header */}
              <div className={`p-4 ${member.status === 'active' ? 'bg-green-50' : 'bg-gray-100'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      member.status === 'active' ? 'bg-green-100' : 'bg-gray-200'
                    }`}>
                      <span className={`font-semibold text-lg ${
                        member.status === 'active' ? 'text-green-700' : 'text-gray-600'
                      }`}>
                        {member.name?.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{member.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {member.teamMemberNumber || 'No Number'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          member.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {member.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleManageTeamMember(member)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    Manage
                  </button>
                </div>
              </div>

              {/* Team Member Details */}
              <div className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-6">📱</span>
                    <span className="ml-2 font-medium">{member.phone}</span>
                  </div>
                  
                  {member.whatsappNumber && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="w-6">💬</span>
                      <span className="ml-2">WhatsApp: {member.whatsappNumber}</span>
                    </div>
                  )}
                  
                  {member.address && (
                    <div className="flex items-start text-sm text-gray-600">
                      <span className="w-6 mt-1">🏠</span>
                      <span className="ml-2 flex-1">{member.address}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-6">👤</span>
                    <span className="ml-2">Login ID: <span className="font-mono">{member.loginId}</span></span>
                  </div>
                  
                  {member.joinDate && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="w-6">📅</span>
                      <span className="ml-2">Joined: {new Date(member.joinDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Assignment Stats */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-700">{assignedCount}</div>
                      <div className="text-xs text-gray-600">Customers Assigned</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-700">{formatCurrency(totalLoanAmount)}</div>
                      <div className="text-xs text-gray-600">Total Loan Amount</div>
                    </div>
                  </div>
                  
                  {assignedCount > 0 && (
                    <button
                      onClick={() => handleManageTeamMember(member)}
                      className="w-full mt-3 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      View Assigned Customers
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Customers Assignment Section */}
      <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Customer Assignments</h3>
            <p className="text-sm text-gray-600">View and manage customer team assignments</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search customers..."
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <div className="absolute right-3 top-2.5 text-gray-400">
                🔍
              </div>
            </div>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Customers</option>
              <option value="assigned">Assigned Only</option>
              <option value="unassigned">Unassigned Only</option>
            </select>
          </div>
        </div>

        {/* Customers Table - REMOVED Loan Details and Actions columns */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.map((customer) => (
                <tr key={customer._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {customer.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          #{customer.customerNumber}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.phone?.[0] || 'N/A'}</div>
                    {customer.whatsappNumber && (
                      <div className="text-sm text-gray-500">WhatsApp: {customer.whatsappNumber}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.businessName}</div>
                    <div className="text-sm text-gray-500">{customer.area}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {customer.teamMemberNumber ? (
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {customer.teamMemberNumber}
                        </span>
                        <button
                          onClick={() => handleQuickRemove(customer._id)}
                          className="ml-2 text-red-600 hover:text-red-800 text-sm"
                          title="Remove assignment"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Not Assigned
                        </span>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleQuickAssign(customer._id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                          defaultValue=""
                          title="Assign to team member"
                        >
                          <option value="" disabled>Assign to...</option>
                          {teamMembers
                            .filter(m => m.status === 'active' && m.teamMemberNumber)
                            .map(member => (
                              <option key={member._id} value={member.teamMemberNumber}>
                                {member.teamMemberNumber} - {member.name}
                              </option>
                            ))
                          }
                        </select>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredCustomers.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {customerSearchTerm ? 'No matching customers found' : 'No customers found'}
              </h3>
              <p className="text-gray-600">
                {customerSearchTerm 
                  ? 'Try adjusting your search terms'
                  : 'No customers available for assignment in this office category.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Empty State for Team Members */}
      {filteredTeamMembers.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 text-5xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'No matching team members found' : 'No team members found'}
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'No Recovery Team members found for your office category. Contact admin to add team members.'
            }
          </p>
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && selectedTeamMember && (
        <TeamMemberAssignmentModal
          isOpen={showAssignmentModal}
          onClose={() => {
            setShowAssignmentModal(false);
            setSelectedTeamMember(null);
          }}
          teamMember={selectedTeamMember}
          customers={customers.filter(c => c.officeCategory === currentUserOffice)}
          currentUserOffice={currentUserOffice}
          currentOperator={currentOperator}
          onAssignCustomers={handleAssignCustomers}
          onRemoveAssignment={handleRemoveAssignment}
        />
      )}

      {/* Office Info Footer */}
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Office Category:</span> {currentUserOffice} | 
          <span className="font-medium ml-4">Operator:</span> {currentOperator.name} | 
          <span className="font-medium ml-4">Total Customers:</span> {customers.length}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Team members can only see customers assigned to them in the mobile app.
          Assign TM numbers (TM1-TM15) to control mobile app visibility.
        </p>
      </div>
    </div>
  );
}