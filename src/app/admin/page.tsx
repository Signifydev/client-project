'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Loan Details Modal Component
function LoanDetailsModal({ stats, onClose }: { 
  stats: any;
  onClose: () => void;
}) {
  const [timeRange, setTimeRange] = useState('monthly');
  const [loanData, setLoanData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLoanDetails = async (range: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/loan-details?range=${range}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLoanData(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching loan details:', error);
      setLoanData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoanDetails(timeRange);
  }, [timeRange]);

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Loan Details</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Time Range Filter */}
          <div className="flex space-x-2 mb-6">
            {['monthly', 'quarterly', 'yearly'].map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-600">Total Loans</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalLoans}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-600">Total Amount</p>
              <p className="text-2xl font-bold text-green-900">₹{(stats.totalAmount / 100000).toFixed(1)}L</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-600">Active Loans</p>
              <p className="text-2xl font-bold text-purple-900">{stats.totalLoans - (loanData.reduce((sum, item) => sum + (item.pending || 0), 0))}</p>
            </div>
          </div>

          {/* Loan Details Table */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} Loan Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">⏳</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Loading loan details...</h3>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        New Loans
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Approved
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Pending
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loanData.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {item.month || item.quarter || item.year}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.newLoans}</td>
                        <td className="px-6-6 py-4 text-sm text-gray-900">
                          ₹{(item.totalAmount / 100000).toFixed(1)}L
                        </td>
                        <td className="px-6 py-4 text-sm text-green-600">{item.approved}</td>
                        <td className="px-6 py-4 text-sm text-orange-600">{item.pending}</td>
                      </tr>
                    ))}
                    {loanData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                          No loan data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Reports Component with Charts
function EnhancedReportsView({ onBack }: { onBack: () => void }) {
  const [dateRange, setDateRange] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReportData = async (range: string, customStart?: string, customEnd?: string) => {
    try {
      setLoading(true);
      let url = `/api/admin/reports?range=${range}`;
      if (range === 'custom' && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setReportData(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData(dateRange);
  }, [dateRange]);

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    if (range !== 'custom') {
      fetchReportData(range);
    }
  };

  const handleCustomDateApply = () => {
    if (startDate && endDate) {
      fetchReportData('custom', startDate, endDate);
    }
  };

  const PieChart = ({ data }: { data: Record<string, number> }) => {
    if (!data) return null;
    
    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'];
    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    
    let currentAngle = 0;
    
    return (
      <div className="relative w-48 h-48">
        <svg width="192" height="192" viewBox="0 0 32 32" className="transform -rotate-90">
          {Object.entries(data).map(([label, value], index) => {
            const percentage = (value / total) * 100;
            const angle = (value / total) * 360;
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const x1 = 16 + 16 * Math.cos(currentAngle * Math.PI / 180);
            const y1 = 16 + 16 * Math.sin(currentAngle * Math.PI / 180);
            const x2 = 16 + 16 * Math.cos((currentAngle + angle) * Math.PI / 180);
            const y2 = 16 + 16 * Math.sin((currentAngle + angle) * Math.PI / 180);
            
            const pathData = [
              `M 16 16`,
              `L ${x1} ${y1}`,
              `A 16 16 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');
            
            const segment = (
              <path
                key={label}
                d={pathData}
                fill={colors[index % colors.length]}
                stroke="#fff"
                strokeWidth="0.5"
              />
            );
            
            currentAngle += angle;
            return segment;
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-gray-600">← Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Advanced Reports & Analytics</h1>
            <p className="text-gray-600">Comprehensive business insights and performance metrics</p>
          </div>
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex space-x-2">
            {['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'].map((range) => (
              <button
                key={range}
                onClick={() => handleDateRangeChange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex space-x-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <span className="self-center text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <button 
                onClick={handleCustomDateApply}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">⏳</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading report data...</h3>
        </div>
      ) : reportData ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New Loans</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{reportData.newLoans || 0}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <span className="text-blue-600 text-xl">📈</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New Customers</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{reportData.newCustomers || 0}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <span className="text-green-600 text-xl">👥</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Collection</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">₹{(reportData.totalCollection || 0).toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <span className="text-purple-600 text-xl">💰</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending EMIs</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">{reportData.pendingEMIs || 0}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg">
                  <span className="text-red-600 text-xl">⏰</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Detailed Reports */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Growth Chart */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Growth Trend</h3>
              <div className="h-64 flex items-end justify-between space-x-2">
                {reportData.chartData && reportData.chartData.length > 0 ? (
                  reportData.chartData.map((value: number, index: number) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t-lg transition-all duration-300 hover:bg-blue-600"
                        style={{ height: `${(value / Math.max(...reportData.chartData)) * 200}px` }}
                      ></div>
                      <span className="text-xs text-gray-500 mt-2">{value}</span>
                    </div>
                  ))
                ) : (
                  <div className="w-full text-center py-8 text-gray-500">
                    No chart data available
                  </div>
                )}
              </div>
            </div>

            {/* Loan Distribution */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Type Distribution</h3>
              {reportData.loanDistribution ? (
                <>
                  <div className="h-64 flex items-center justify-center">
                    <PieChart data={reportData.loanDistribution} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {(Object.entries(reportData.loanDistribution) as [string, number][]).map(([type, percentage], index) => (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{type}</span>
                          <span className="font-medium text-gray-900">
                            {typeof percentage === 'number' ? percentage.toFixed(1) : percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'][index % 5]
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No distribution data available
                </div>
              )}
            </div>
          </div>

          {/* Detailed Report Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Report</h3>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Loans</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Customers</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collection</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending EMIs</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Growth Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{reportData.newLoans || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{reportData.newCustomers || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">₹{(reportData.totalCollection || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-red-600">{reportData.pendingEMIs || 0}</td>
                      <td className="px-6 py-4 text-sm text-green-600">+{reportData.growthRate || 0}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No report data available</h3>
          <p className="text-gray-600">Try selecting a different date range.</p>
        </div>
      )}
    </div>
  );
}

// Team Management Component
function TeamManagementView({ onBack }: { onBack: () => void }) {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/team-members', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTeamMembers(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/team-members?memberId=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        alert('Team member deleted successfully!');
        fetchTeamMembers();
      } else {
        alert(`Error deleting team member: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error deleting team member:', error);
      alert('Error deleting team member: ' + error.message);
    }
  };

  const handleEditMember = (member: any) => {
    setEditingMember(member);
    setShowAddModal(true);
  };

  const handleAddMember = () => {
    setEditingMember(null);
    setShowAddModal(true);
  };

  const handleSaveMember = async (memberData: any) => {
    try {
      const url = '/api/admin/team-members';
      const method = editingMember ? 'PUT' : 'POST';
      
      const requestBody = editingMember ? 
        { ...memberData, memberId: editingMember._id } : 
        memberData;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (response.ok) {
        alert(editingMember ? 'Team member updated successfully!' : 'Team member added successfully!');
        fetchTeamMembers();
        setShowAddModal(false);
        setEditingMember(null);
      } else {
        alert(`Error: ${responseData.error || responseData.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert('Error saving team member: ' + (error.message || 'Check console for details'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-gray-600">← Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-600">Manage your team members and their roles</p>
          </div>
        </div>
        <button 
          onClick={handleAddMember}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Team Member
        </button>
      </div>

      {/* Team Members Grid */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">⏳</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading team members...</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <div key={member._id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {member.name.split(' ').map((n: string) => n[0]).join('')}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEditMember(member)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteMember(member._id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{member.name}</h3>
              <p className="text-sm text-gray-600 mb-1">{member.role}</p>
              <p className="text-sm text-gray-500 mb-1">{member.email}</p>
              <p className="text-sm text-gray-500 mb-3">{member.phone}</p>
              
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  Joined: {member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  member.status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {member.status}
                </span>
              </div>
            </div>
          ))}
          
          {teamMembers.length === 0 && (
            <div className="col-span-3 text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
              <p className="text-gray-600">Add your first team member to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <TeamMemberModal
          member={editingMember}
          onSave={handleSaveMember}
          onClose={() => {
            setShowAddModal(false);
            setEditingMember(null);
          }}
        />
      )}
    </div>
  );
}

// Team Member Modal Component
function TeamMemberModal({ member, onSave, onClose }: { 
  member: any; 
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: member?.name || '',
    email: member?.email || '',
    role: member?.role || 'Data Entry Operator',
    phone: member?.phone || '',
    status: member?.status || 'active',
    username: member?.username || '',
    password: member?.password || '',
    confirmPassword: ''
  });

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword();
    setFormData({
      ...formData,
      password: newPassword,
      confirmPassword: newPassword
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!member && formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (!member && !formData.password) {
      alert('Please generate or enter a password!');
      return;
    }

    const { confirmPassword, ...saveData } = formData;
    onSave(saveData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {member ? 'Edit Team Member' : 'Add Team Member'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Choose a unique username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Data Entry Operator">Data Entry Operator</option>
                <option value="Loan Officer">Loan Officer</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Password Section */}
            {!member && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Login Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                  >
                    Generate Password
                  </button>
                </div>
                
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Click generate or enter password"
                  />
                  
                  <input
                    type="text"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm password"
                  />
                </div>

                {formData.password && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      <strong>Important:</strong> Save this password securely. It will be shown only once.
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Password: <span className="font-mono">{formData.password}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {member ? 'Update' : 'Add'} Member
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Recent Activities Component
function RecentActivities() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [timeFilter, setTimeFilter] = useState('24h');

  const fetchActivities = async (filter = '24h', showAll = false) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/recent-activities?filter=${filter}&showAll=${showAll}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setActivities(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(timeFilter, showAllActivities);
  }, [timeFilter, showAllActivities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'customer': return '👤';
      case 'loan': return '💰';
      case 'emi': return '📊';
      case 'team': return '👥';
      case 'login': return '🔐';
      case 'approval': return '✅';
      case 'rejection': return '❌';
      default: return '📝';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'customer': return 'bg-blue-100 text-blue-800';
      case 'loan': return 'bg-green-100 text-green-800';
      case 'emi': return 'bg-purple-100 text-purple-800';
      case 'team': return 'bg-orange-100 text-orange-800';
      case 'login': return 'bg-gray-100 text-gray-800';
      case 'approval': return 'bg-green-100 text-green-800';
      case 'rejection': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityDate = new Date(timestamp);
    const diff = now.getTime() - activityDate.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const handleTimeFilterChange = (filter: string) => {
    setTimeFilter(filter);
  };

  const handleViewAllClick = () => {
    setShowAllActivities(true);
  };

  const handleBackToRecent = () => {
    setShowAllActivities(false);
    setTimeFilter('24h');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {showAllActivities ? 'All Activities' : 'Recent Activities'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {showAllActivities 
                ? 'Complete activity log from all team members' 
                : 'Latest actions from all team members'
              }
            </p>
          </div>
          
          {showAllActivities && (
            <button 
              onClick={handleBackToRecent}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Recent
            </button>
          )}
        </div>

        {/* Time Filter */}
        {showAllActivities && (
          <div className="flex space-x-2 mt-4">
            {[
              { value: '24h', label: '24 Hours' },
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
              { value: 'all', label: 'All Time' }
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleTimeFilterChange(filter.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium ${
                  timeFilter === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-6">
        {loading ? (
          <div className="text-center py-4">
            <div className="text-gray-400 text-2xl mb-2">⏳</div>
            <p className="text-gray-600">Loading activities...</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activities.map((activity) => (
              <div key={activity._id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm">
                  <span className={getActivityIcon(activity.type)}></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.userName || activity.user}</span> {activity.action}{' '}
                      {activity.target && (
                        <span className="font-medium text-blue-600">{activity.target}</span>
                      )}
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActivityColor(activity.type)}`}>
                      {activity.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {activity.role && `Role: ${activity.role} • `}
                      {getTimeAgo(activity.timestamp)}
                    </p>
                    {activity.details && (
                      <p className="text-xs text-gray-400">{activity.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {activities.length === 0 && (
              <div className="text-center py-4">
                <div className="text-gray-400 text-2xl mb-2">📝</div>
                <p className="text-gray-600">No activities found</p>
                <p className="text-sm text-gray-500 mt-1">Activities will appear here when team members perform actions.</p>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-4 flex justify-between items-center">
          {!showAllActivities && (
            <button 
              onClick={handleViewAllClick}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All Activities →
            </button>
          )}
          
          <button 
            onClick={() => fetchActivities(timeFilter, showAllActivities)}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

// Customer Details View Component
function CustomerDetailsView({ customer, onBack, onDelete }: { 
  customer: any; 
  onBack: () => void;
  onDelete: (customerId: string) => void;
}) {
  const [activeTab, setActiveTab] = useState('loan-details');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(customer._id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-gray-600">← Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-600">{customer.businessName} • {customer.area}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            customer.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {customer.status === 'active' ? 'Active' : 'Inactive'}
          </span>
          <button 
            onClick={handleDeleteClick}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Delete Profile
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Delete Customer</h3>
                  <p className="text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> Deleting this customer will permanently remove all their data including:
                </p>
                <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                  <li>Customer profile information</li>
                  <li>Loan details</li>
                  <li>EMI payment history</li>
                  <li>All related records</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3">
                <button 
                  onClick={handleCancelDelete}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Yes, Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('loan-details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'loan-details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Loan Details
          </button>
          <button
            onClick={() => setActiveTab('transaction-history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transaction-history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Transaction History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'loan-details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Loan Information */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Loan Information</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Loan Number</p>
                  <p className="text-lg font-semibold text-gray-900">{customer.loanNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Loan Amount</p>
                  <p className="text-lg font-semibold text-gray-900">₹{customer.loanAmount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Loan Type</p>
                  <p className="text-lg font-semibold text-gray-900">{customer.loanType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Area</p>
                  <p className="text-lg font-semibold text-gray-900">{customer.area}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Phone</p>
                  <p className="text-lg font-semibold text-gray-900">{customer.phone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Business</p>
                  <p className="text-lg font-semibold text-gray-900">{customer.businessName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* EMI Details */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">EMI Details</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">EMI Amount</p>
                  <p className="text-lg font-semibold text-gray-900">₹{customer.emiAmount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Payment Frequency</p>
                  <p className="text-lg font-semibold text-gray-900">{customer.loanType}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-600">Address</p>
                  <p className="text-lg font-semibold text-gray-900">{customer.address || 'No address provided'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-600">Created Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transaction-history' && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-600">Transaction history will appear here when EMI payments are made.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Pending Requests Component - UPDATED VERSION
function PendingRequestsView({ 
  requests, 
  onApprove, 
  onReject, 
  onBack
}: { 
  requests: any[]; 
  onApprove: (request: any) => void;
  onReject: (request: any) => void;
  onBack: () => void;
}) {
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const handleViewEdit = (request: any) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsViewModalOpen(false);
    setSelectedRequest(null);
  };

  const handleApproveFromModal = () => {
    if (selectedRequest) {
      onApprove(selectedRequest);
      handleCloseModal();
    }
  };

  const handleRejectFromModal = () => {
    if (selectedRequest) {
      onReject(selectedRequest);
      handleCloseModal();
    }
  };

  // Helper function to format field names
  const formatFieldName = (field: string) => {
    return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  // Helper function to compare and highlight changes
  const renderFieldComparison = (field: string, originalValue: any, newValue: any) => {
    const isChanged = originalValue !== newValue;
    
    return (
      <div key={field} className={`p-3 rounded-lg border ${isChanged ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex justify-between items-start mb-2">
          <span className="font-medium text-gray-700">{formatFieldName(field)}</span>
          {isChanged && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Changed
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500 mb-1">Original Value</p>
            <div className={`p-2 rounded border ${isChanged ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
              {field.includes('Amount') || field.includes('amount') ? `₹${originalValue}` : String(originalValue || 'N/A')}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{isChanged ? 'Requested Change' : 'Current Value'}</p>
            <div className={`p-2 rounded border ${isChanged ? 'bg-green-50 border-green-200 text-green-700 font-semibold' : 'bg-gray-100 border-gray-300 text-gray-600'}`}>
              {field.includes('Amount') || field.includes('amount') ? `₹${newValue}` : String(newValue || 'N/A')}
            </div>
          </div>
        </div>
        
        {isChanged && (
          <div className="mt-2 flex items-center text-xs text-yellow-600">
            <span className="mr-1">🔄</span>
            <span>Field updated by Data Entry Operator</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="text-gray-600">← Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pending Requests</h1>
            <p className="text-gray-600">Approve or reject customer requests</p>
          </div>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          {requests.length} Pending
        </span>
      </div>

      {/* Requests List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6">
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        request.type === 'EDIT' ? 'bg-purple-100' : 'bg-blue-100'
                      }`}>
                        <span className={`font-semibold text-sm ${
                          request.type === 'EDIT' ? 'text-purple-600' : 'text-blue-600'
                        }`}>
                          {request.customerName?.split(' ').map((n: string) => n[0]).join('') || 'NC'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-900">{request.customerName}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          request.type === 'EDIT' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {request.type === 'EDIT' ? 'EDIT Request' : 'New Customer'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {request.type === 'EDIT' ? 'Customer Update' : 'New Registration'} • 
                        Created: {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                      
                      {/* Quick summary of changes for EDIT requests */}
                      {request.type === 'EDIT' && request.changes && (
                        <div className="mt-2">
                          <p className="text-xs text-purple-600 font-medium mb-1">
                            Changes requested:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {Object.keys(request.changes).slice(0, 3).map(field => (
                              <span key={field} className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700">
                                {formatFieldName(field)}
                              </span>
                            ))}
                            {Object.keys(request.changes).length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                                +{Object.keys(request.changes).length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* View Button */}
                  <button 
                    onClick={() => handleViewEdit(request)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      request.type === 'EDIT' 
                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {request.type === 'EDIT' ? 'Review Changes' : 'View Details'}
                  </button>
                  
                  <button 
                    onClick={() => onApprove(request)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => onReject(request)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
            
            {requests.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">✅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
                <p className="text-gray-600">All requests have been processed.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {isViewModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedRequest.type === 'EDIT' ? 'Edit Request Details' : 'New Customer Request'}
                </h2>
                <button 
                  onClick={handleCloseModal} 
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Request Type Badge */}
              <div className="mb-6">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  selectedRequest.type === 'EDIT' 
                    ? 'bg-purple-100 text-purple-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedRequest.type === 'EDIT' ? 'EDIT REQUEST' : 'NEW CUSTOMER REQUEST'}
                </span>
                {selectedRequest.type === 'EDIT' && (
                  <p className="text-sm text-purple-600 mt-2">
                    📝 Data Entry Operator has requested changes to customer information
                  </p>
                )}
              </div>
              
              {/* For EDIT requests, show comparison view */}
              {selectedRequest.type === 'EDIT' ? (
                <div className="space-y-6">
                  {/* Customer Information Comparison */}
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                      <h3 className="text-lg font-semibold text-gray-900">Customer Information Changes</h3>
                      <p className="text-sm text-gray-600 mt-1">Compare original values with requested changes</p>
                    </div>
                    <div className="p-6 space-y-4">
                      {/* Display all fields with comparison */}
                      {selectedRequest.originalData && selectedRequest.data && (
                        <div className="grid grid-cols-1 gap-4">
                          {Object.keys(selectedRequest.data).map(field => 
                            renderFieldComparison(
                              field,
                              selectedRequest.originalData[field],
                              selectedRequest.data[field]
                            )
                          )}
                        </div>
                      )}
                      
                      {/* Fallback if no structured comparison data */}
                      {(!selectedRequest.originalData || !selectedRequest.data) && selectedRequest.changes && (
                        <div className="space-y-4">
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h4 className="font-semibold text-yellow-800 mb-2">Changes Summary</h4>
                            {Object.entries(selectedRequest.changes).map(([field, newValue]: [string, any]) => (
                              <div key={field} className="mb-3 last:mb-0">
                                <p className="font-medium text-gray-700 mb-1">{formatFieldName(field)}</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Original Value</p>
                                    <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700">
                                      {selectedRequest.originalData?.[field] || 'N/A'}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Requested Change</p>
                                    <div className="p-2 bg-green-50 border border-green-200 rounded text-green-700 font-semibold">
                                      {newValue}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* For NEW requests, show regular details */
                <>
                  {/* Customer Information */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">Customer Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium">{selectedRequest.customerName || selectedRequest.data?.customerName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium">{selectedRequest.phone || selectedRequest.data?.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Business</p>
                        <p className="font-medium">{selectedRequest.businessName || selectedRequest.data?.businessName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Area</p>
                        <p className="font-medium">{selectedRequest.area || selectedRequest.data?.area || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Loan Details */}
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">Loan Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Loan Amount</p>
                        <p className="font-medium text-lg">
                          ₹{selectedRequest.loanAmount || selectedRequest.data?.loanAmount || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">EMI Amount</p>
                        <p className="font-medium text-lg">
                          ₹{selectedRequest.emiAmount || selectedRequest.data?.emiAmount || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Loan Type</p>
                        <p className="font-medium">{selectedRequest.loanType || selectedRequest.data?.loanType || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Request Metadata */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-lg mb-2">Request Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Request ID</p>
                    <p className="font-mono text-gray-900 text-xs">{selectedRequest._id}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Submitted Date</p>
                    <p className="text-gray-900">
                      {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Type</p>
                    <p className="text-gray-900">{selectedRequest.type || 'Pending'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <p className="text-gray-900">{selectedRequest.status || 'Pending'}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button 
                  onClick={handleRejectFromModal}
                  className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  Reject Request
                </button>
                <button 
                  onClick={handleApproveFromModal}
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
                >
                  Approve Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [dashboardStats, setDashboardStats] = useState({
    totalLoans: 0,
    totalAmount: 0,
    totalCustomers: 0,
    pendingRequests: 0
  })
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    loanNumber: '',
    loanType: '',
    status: ''
  });
  const [loading, setLoading] = useState(true)
  const [showLoanDetails, setShowLoanDetails] = useState(false)

  // Enhanced filtered customers calculation
  const filteredCustomers = customers.filter(customer => {
    // Main search term (name, phone, or loan number)
    const matchesSearch = searchTerm === '' || 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.loanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);

    // Additional filters
    const matchesLoanNumber = filters.loanNumber === '' || 
      customer.loanNumber.toLowerCase().includes(filters.loanNumber.toLowerCase());
    
    const matchesLoanType = filters.loanType === '' || 
      customer.loanType === filters.loanType;
    
    const matchesStatus = filters.status === '' || 
      customer.status === filters.status;

    return matchesSearch && matchesLoanNumber && matchesLoanType && matchesStatus;
  });

  // Fetch real data
  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setDashboardStats(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/admin/customers')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setCustomers(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      setCustomers([])
    }
  }

 const fetchPendingRequests = async () => {
  try {
    console.log('🟡 Super Admin - Fetching pending requests...');
    
    // Try different API endpoints - Super Admin should use admin endpoints
    const response = await fetch('/api/admin/requests');
    
    if (!response.ok) {
      console.log('❌ Admin requests failed, trying data-entry endpoint...');
      // Fallback to data-entry endpoint
      const fallbackResponse = await fetch('/api/data-entry/requests');
      
      if (!fallbackResponse.ok) {
        throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      console.log('🔵 Data-entry requests response:', fallbackData);
      
      // Handle data-entry response structure
      if (fallbackData.success && Array.isArray(fallbackData.data?.requests)) {
        const validRequests = fallbackData.data.requests.filter((req: any) => 
          req.customerName || req.data?.customerName
        );
        console.log(`✅ Setting ${validRequests.length} requests from data-entry`);
        setPendingRequests(validRequests);
      } else {
        console.warn('⚠️ No valid requests found in data-entry response');
        setPendingRequests([]);
      }
      return;
    }

    // Handle admin endpoint response
    const data = await response.json();
    console.log('🔵 Admin requests response:', data);
    
    if (data.success) {
      // Handle different response structures
      let requestsArray = [];
      
      if (Array.isArray(data.data)) {
        requestsArray = data.data;
      } else if (Array.isArray(data.data?.requests)) {
        requestsArray = data.data.requests;
      } else if (Array.isArray(data.requests)) {
        requestsArray = data.requests;
      }
      
      const validRequests = requestsArray.filter((req: any) => 
        req.customerName || req.data?.customerName
      );
      
      console.log(`✅ Setting ${validRequests.length} requests from admin`);
      setPendingRequests(validRequests);
    } else {
      console.warn('⚠️ No requests array found in admin response');
      setPendingRequests([]);
    }
    
  } catch (error) {
    console.error('❌ Error fetching requests:', error);
    setPendingRequests([]);
  }
};

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchDashboardData(),
        fetchCustomers(),
        fetchPendingRequests()
      ])
      setLoading(false)
    }
    loadData()
  }, [activeTab])

  // Handle request approval
  const handleApproveRequest = async (request: any) => {
    try {
      const response = await fetch('/api/admin/approve-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request._id,
          action: 'approve'
        }),
      })

      if (response.ok) {
        alert('Request approved successfully!')
        // Refresh all data
        fetchDashboardData()
        fetchCustomers()
        fetchPendingRequests()
      }
    } catch (error) {
      alert('Error approving request')
    }
  }

  // Handle request rejection
  const handleRejectRequest = async (request: any) => {
    try {
      const response = await fetch('/api/admin/approve-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: request._id,
          action: 'reject'
        }),
      })

      if (response.ok) {
        alert('Request rejected successfully!')
        // Refresh data
        fetchDashboardData()
        fetchPendingRequests()
      }
    } catch (error) {
      alert('Error rejecting request')
    }
  }

  // Handle customer deletion
  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/customers', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Customer deleted successfully!');
        
        // Refresh data
        fetchCustomers();
        fetchDashboardData();
        
        // Go back to customers list
        setSelectedCustomer(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete customer');
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  // Handler functions
  const handleViewDetails = (customer: any) => {
    setSelectedCustomer(customer)
  }

  const handleBackToDashboard = () => {
    setSelectedCustomer(null)
  }

  const handleLogout = () => {
    router.push('/auth');
  }

  // Enhanced Search and Filters function
  const renderSearchAndFilters = () => {
    const handleFilterChange = (key: string, value: string) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
      setFilters({
        loanNumber: '',
        loanType: '',
        status: ''
      });
      setSearchTerm('');
    };

    // Get unique loan types for dropdown
    const loanTypes = [...new Set(customers.map(customer => customer.loanType).filter(Boolean))];

    return (
      <div className="space-y-4">
        {/* Main Search Bar with Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by customer name, phone, or loan number..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
            
            {(filters.loanNumber || filters.loanType || filters.status || searchTerm) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters - Collapsible */}
        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Loan Number Filter */}
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

              {/* Loan Type Filter */}
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

              {/* Status Filter */}
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

            {/* Active Filters Display */}
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

        {/* Results Count */}
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

  // Navigation Tabs - Mobile Scrollable
  const renderNavigation = () => (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Menu - Horizontal Scroll */}
        <div className="sm:hidden">
          <div className="relative">
            <div className="overflow-x-auto scrollbar-hide">
              <nav className="flex space-x-4 px-4 py-3 min-w-max">
                {[
                  { id: 'dashboard', label: 'Dashboard' },
                  { id: 'customers', label: 'Customers' },
                  { id: 'requests', label: 'Requests' },
                  { id: 'reports', label: 'Reports' },
                  { id: 'team', label: 'Team' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center">
                      {tab.label}
                      {tab.id === 'requests' && pendingRequests.length > 0 && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {pendingRequests.length}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Gradient fade effect for scroll indication */}
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex space-x-8 px-4 sm:px-6 lg:px-8">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'customers', label: 'Customers' },
            { id: 'requests', label: 'Requests' },
            { id: 'reports', label: 'Reports' },
            { id: 'team', label: 'Team' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.id === 'requests' && pendingRequests.length > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {pendingRequests.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )

  // Dashboard Section
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome to Super Admin Dashboard</h1>
        <p className="opacity-90">Manage your loan business efficiently and effectively</p>
      </div>

      {/* Stats Grid - UPDATED WITH TOTAL CUSTOMERS INSTEAD OF PENDING EMIS */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Loans Card - Clickable */}
        <div 
          onClick={() => setShowLoanDetails(true)}
          className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Active Loans</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardStats.totalLoans.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Currently active loans</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <span className="text-blue-600 text-xl font-semibold">📊</span>
            </div>
          </div>
        </div>

        {/* Total Amount Card - Clickable */}
        <div 
          onClick={() => setShowLoanDetails(true)}
          className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Amount</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">₹{(dashboardStats.totalAmount / 100000).toFixed(1)}L</p>
              <p className="text-xs text-gray-500 mt-1">Active loans amount</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <span className="text-green-600 text-xl font-semibold">💰</span>
            </div>
          </div>
        </div>

        {/* Total Customer Card - Clickable */}
        <div 
          onClick={() => setActiveTab('customers')}
          className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Active Customers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardStats.totalCustomers?.toLocaleString() || '0'}</p>
              <p className="text-xs text-gray-500 mt-1">Currently active customers</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <span className="text-purple-600 text-xl font-semibold">👥</span>
            </div>
          </div>
        </div>

        {/* Pending Requests Card - Clickable */}
        <div 
          onClick={() => setActiveTab('requests')}
          className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Pending Requests</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{dashboardStats.pendingRequests}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <span className="text-orange-600 text-xl font-semibold">📋</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button 
          onClick={() => setActiveTab('customers')}
          className="p-4 bg-blue-50 rounded-lg text-center hover:bg-blue-100 transition-colors border border-blue-200"
        >
          <div className="text-blue-600 text-lg mb-2">👥</div>
          <span className="text-sm font-medium text-blue-900">Manage Customers</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('requests')}
          className="p-4 bg-orange-50 rounded-lg text-center hover:bg-orange-100 transition-colors border border-orange-200"
        >
          <div className="text-orange-600 text-lg mb-2">📋</div>
          <span className="text-sm font-medium text-orange-900">Pending Requests</span>
          {pendingRequests.length > 0 && (
            <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {pendingRequests.length}
            </span>
          )}
        </button>
        
        <button 
          onClick={() => setActiveTab('reports')}
          className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100 transition-colors border border-purple-200"
        >
          <div className="text-purple-600 text-lg mb-2">📊</div>
          <span className="text-sm font-medium text-purple-900">View Reports</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('team')}
          className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100 transition-colors border border-green-200"
        >
          <div className="text-green-600 text-lg mb-2">👨‍💼</div>
          <span className="text-sm font-medium text-green-900">Team Management</span>
        </button>
      </div>

      {/* Recent Activities */}
      <RecentActivities />

      {/* Loan Details Modal */}
      {showLoanDetails && (
        <LoanDetailsModal 
          stats={dashboardStats}
          onClose={() => setShowLoanDetails(false)}
        />
      )}
    </div>
  )

  // Customers Section with Enhanced Filters
  const renderCustomers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600">Manage all customer accounts and loan details</p>
        </div>
        <span className="text-sm text-gray-600">{customers.length} customers</span>
      </div>

      {/* Enhanced Search and Filters */}
      {renderSearchAndFilters()}

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">⏳</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading customers...</h3>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCustomers.map((customer) => (
                <div key={customer._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {customer.name.split(' ').map((n: string) => n[0]).join('')}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{customer.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {customer.loanNumber} • ₹{customer.emiAmount} • {customer.loanType} EMI
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {customer.businessName} • {customer.area} • {customer.phone}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      customer.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {customer.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                    <button 
                      onClick={() => handleViewDetails(customer)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
              
              {filteredCustomers.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">🔍</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                  <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Conditional render
  if (selectedCustomer) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {renderNavigation()}
        <CustomerDetailsView 
          customer={selectedCustomer} 
          onBack={handleBackToDashboard}
          onDelete={handleDeleteCustomer}
        />
      </div>
    )
  }

  if (activeTab === 'requests') {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {renderNavigation()}
      <PendingRequestsView 
        requests={pendingRequests}
        onApprove={handleApproveRequest}
        onReject={handleRejectRequest}
        onBack={() => setActiveTab('dashboard')}
      />
    </div>
  )
}

  if (activeTab === 'reports') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {renderNavigation()}
        <EnhancedReportsView onBack={() => setActiveTab('dashboard')} />
      </div>
    )
  }

  if (activeTab === 'team') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        {renderNavigation()}
        <TeamManagementView onBack={() => setActiveTab('dashboard')} />
      </div>
    )
  }

    return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER - Always visible */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Loan Management System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, Super Admin</span>
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

      {/* NAVIGATION - Always visible */}
      {renderNavigation()}

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'customers' && renderCustomers()}
      </main>
    </div>
  )
}