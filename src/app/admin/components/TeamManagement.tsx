'use client';

import { useState, useEffect } from 'react';
import RecoveryTeamModal from '@/src/app/admin/components/modals/RecoveryTeamModal';
import DataEntryOperatorModal from '@/src/app/admin/components/modals/DataEntryOperatorModal';
import ViewDetailsModal from '@/src/app/admin/components/modals/ViewDetailsModal';
import { TeamMember } from '@/src/app/admin/types/index';

interface TeamManagementProps {
  onBack: () => void;
}

interface SaveMemberData {
  name: string;
  phone: string;
  whatsappNumber?: string;
  address?: string;
  officeCategory?: string;
  operatorNumber?: string;
  status: 'active' | 'inactive';
  loginId?: string;
  password?: string;
}

export default function TeamManagement({ onBack }: TeamManagementProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showDataEntryModal, setShowDataEntryModal] = useState(false);
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showResetCredentials, setShowResetCredentials] = useState(false);
  const [newCredentials, setNewCredentials] = useState({
    loginId: '',
    password: '',
    confirmPassword: ''
  });

  const generateRandomId = () => {
    const prefix = selectedTeamMember?.role === 'Recovery Team' ? 'RT' : 'DE';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${randomNum}`;
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

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

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    if (member.role === 'Recovery Team') {
      setShowRecoveryModal(true);
    } else {
      setShowDataEntryModal(true);
    }
  };

  const handleViewDetails = (member: TeamMember) => {
    setSelectedTeamMember(member);
    setShowViewDetailsModal(true);
  };

  const handleAddRecoveryMember = () => {
    setEditingMember(null);
    setShowRecoveryModal(true);
  };

  const handleAddDataEntryMember = () => {
    setEditingMember(null);
    setShowDataEntryModal(true);
  };

  const handleSaveMember = async (memberData: SaveMemberData, isRecovery: boolean) => {
    try {
      const url = '/api/admin/team-members';
      const method = editingMember ? 'PUT' : 'POST';
      
      const role = isRecovery ? 'Recovery Team' : 'Data Entry Operator';
      const requestBody = editingMember ? 
        { ...memberData, memberId: editingMember._id, role } : 
        { ...memberData, role };
      
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
        setShowRecoveryModal(false);
        setShowDataEntryModal(false);
        setEditingMember(null);
      } else {
        alert(`Error: ${responseData.error || responseData.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert('Error saving team member: ' + (error.message || 'Check console for details'));
    }
  };

  const handleResetCredentials = async () => {
    if (!newCredentials.loginId || !newCredentials.password) {
      alert('Please enter both Login ID and Password');
      return;
    }

    if (newCredentials.password !== newCredentials.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    try {
      const response = await fetch('/api/admin/team-members', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: selectedTeamMember?._id,
          loginId: newCredentials.loginId,
          password: newCredentials.password,
          name: selectedTeamMember?.name,
          phone: selectedTeamMember?.phone,
          whatsappNumber: selectedTeamMember?.whatsappNumber,
          address: selectedTeamMember?.address,
          role: selectedTeamMember?.role,
          officeCategory: selectedTeamMember?.officeCategory,
          status: selectedTeamMember?.status
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Credentials updated successfully!');
        setShowResetCredentials(false);
        setNewCredentials({ loginId: '', password: '', confirmPassword: '' });
        fetchTeamMembers();
      } else {
        alert(`Error updating credentials: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert('Error updating credentials: ' + error.message);
    }
  };

  const recoveryTeamMembers = teamMembers.filter(member => member.role === 'Recovery Team');
  const dataEntryOperators = teamMembers.filter(member => member.role === 'Data Entry Operator');

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Background Color */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onBack}
              className="flex items-center space-x-2 bg-white text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              <span className="text-lg">←</span>
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold">Team Management</h1>
              <p className="text-blue-100 mt-1">Manage your team members and their roles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recovery Team Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Recovery Team</h3>
              <p className="text-gray-600 mt-1">Manage recovery team members who handle loan recovery operations</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-xl">💰</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Members</span>
              <span className="text-lg font-semibold text-gray-900">{recoveryTeamMembers.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Members</span>
              <span className="text-lg font-semibold text-green-600">
                {recoveryTeamMembers.filter(m => m.status === 'active').length}
              </span>
            </div>
          </div>

          <button 
            onClick={handleAddRecoveryMember}
            className="w-full mt-6 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Add Recovery Team Member
          </button>
        </div>

        {/* Data Entry Operator Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Data Entry Operators</h3>
              <p className="text-gray-600 mt-1">Manage operators who handle customer data entry and management</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-xl">📊</span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Operators</span>
              <span className="text-lg font-semibold text-gray-900">{dataEntryOperators.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Operators</span>
              <span className="text-lg font-semibold text-green-600">
                {dataEntryOperators.filter(m => m.status === 'active').length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Office Categories</span>
              <span className="text-lg font-semibold text-purple-600">
                {[...new Set(dataEntryOperators.map(m => m.officeCategory).filter(Boolean))].length}
              </span>
            </div>
          </div>

          <button 
            onClick={handleAddDataEntryMember}
            className="w-full mt-6 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Add Data Entry Operator
          </button>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Team Members</h3>
          <p className="text-gray-600 mt-1">Manage existing team members and their permissions</p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">⏳</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading team members...</h3>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        member.role === 'Recovery Team' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <span className={`font-semibold text-sm ${
                          member.role === 'Recovery Team' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {member.name.split(' ').map((n) => n[0]).join('')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-semibold text-gray-900">{member.name}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.role === 'Recovery Team' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {member.role}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          member.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {member.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-600">{member.phone}</p>
                        {member.officeCategory && (
                          <p className="text-sm text-gray-600">
                            Office: <span className="font-medium">{member.officeCategory}</span>
                          </p>
                        )}
                        {member.operatorNumber && (
                          <p className="text-sm text-gray-600">
                            Operator: <span className="font-medium">{member.operatorNumber}</span>
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          Joined: {member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => handleViewDetails(member)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      View Details
                    </button>
                    
                    <button 
                      onClick={() => handleEditMember(member)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteMember(member._id)}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              
              {teamMembers.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">👥</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
                  <p className="text-gray-600">Add your first team member using the cards above.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recovery Team Member Modal */}
      {showRecoveryModal && (
        <RecoveryTeamModal
          member={editingMember}
          onSave={(data: SaveMemberData) => handleSaveMember(data, true)}
          onClose={() => {
            setShowRecoveryModal(false);
            setEditingMember(null);
          }}
        />
      )}

      {/* Data Entry Operator Modal */}
      {showDataEntryModal && (
        <DataEntryOperatorModal
          member={editingMember}
          onSave={(data: SaveMemberData) => handleSaveMember(data, false)}
          onClose={() => {
            setShowDataEntryModal(false);
            setEditingMember(null);
          }}
        />
      )}

      {/* View Details Modal */}
      {showViewDetailsModal && selectedTeamMember && (
        <ViewDetailsModal
          member={selectedTeamMember}
          newCredentials={newCredentials}
          showResetCredentials={showResetCredentials}
          onClose={() => {
            setShowViewDetailsModal(false);
            setSelectedTeamMember(null);
            setShowResetCredentials(false);
          }}
          onEdit={() => handleEditMember(selectedTeamMember)}
          onGenerateCredentials={() => {
            const newLoginId = generateRandomId();
            const newPassword = generateRandomPassword();
            setNewCredentials({
              loginId: newLoginId,
              password: newPassword,
              confirmPassword: newPassword
            });
          }}
          onResetCredentials={() => setShowResetCredentials(!showResetCredentials)}
          onUpdateCredentials={handleResetCredentials}
          onCredentialsChange={setNewCredentials}
        />
      )}
    </div>
  );
}