'use client';

import { TeamMember } from '../../types';

interface ViewDetailsModalProps {
  member: TeamMember;
  newCredentials: {
    loginId: string;
    password: string;
    confirmPassword: string;
  };
  showResetCredentials: boolean;
  onClose: () => void;
  onEdit: () => void;
  onGenerateCredentials: () => void;
  onResetCredentials: () => void;
  onUpdateCredentials: () => void;
  onCredentialsChange: (credentials: any) => void;
}

export default function ViewDetailsModal({
  member,
  newCredentials,
  showResetCredentials,
  onClose,
  onEdit,
  onGenerateCredentials,
  onResetCredentials,
  onUpdateCredentials,
  onCredentialsChange
}: ViewDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Team Member Details</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Member Information */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <p className="text-lg font-semibold text-gray-900">{member.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.role === 'Recovery Team' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {member.role}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <p className="text-lg font-semibold text-gray-900">{member.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    member.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {member.status}
                  </span>
                </div>
                {member.whatsappNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
                    <p className="text-lg font-semibold text-gray-900">{member.whatsappNumber}</p>
                  </div>
                )}
                {member.officeCategory && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Office Category</label>
                    <p className="text-lg font-semibold text-gray-900">{member.officeCategory}</p>
                  </div>
                )}
              </div>
              
              {member.address && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <p className="text-lg font-semibold text-gray-900">{member.address}</p>
                </div>
              )}
            </div>

            {/* Login Credentials Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Login Credentials</h3>
                <button
                  onClick={onResetCredentials}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                >
                  {showResetCredentials ? 'Cancel Reset' : 'Reset Credentials'}
                </button>
              </div>

              {!showResetCredentials ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Login ID</label>
                    <p className="text-lg font-semibold text-gray-900 font-mono bg-gray-100 p-2 rounded">
                      {member.loginId}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <span className="text-yellow-600 mr-2">🔒</span>
                        <p className="text-sm text-yellow-800">
                          <strong>Password is securely stored and cannot be viewed.</strong> 
                          It was only shown during the initial creation process.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-yellow-800 mb-3">Reset Login Credentials</h4>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-yellow-700">Generate new credentials:</span>
                    <button
                      onClick={onGenerateCredentials}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-medium hover:bg-blue-200"
                    >
                      Generate New
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Login ID</label>
                      <input
                        type="text"
                        value={newCredentials.loginId}
                        onChange={(e) => onCredentialsChange({...newCredentials, loginId: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50"
                        placeholder="Will be auto-generated"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={newCredentials.password}
                          onChange={(e) => onCredentialsChange({...newCredentials, password: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50"
                          placeholder="Will be auto-generated"
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={newCredentials.confirmPassword}
                          onChange={(e) => onCredentialsChange({...newCredentials, confirmPassword: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50"
                          placeholder="Confirm new password"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  {newCredentials.loginId && newCredentials.password && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center mb-2">
                        <span className="text-green-600 text-lg mr-2">⚠️</span>
                        <p className="text-sm text-green-800 font-medium">
                          <strong>Save these new credentials now!</strong>
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm text-green-700">New Login ID:</p>
                          <p className="text-md font-mono bg-green-100 px-2 py-1 rounded">
                            {newCredentials.loginId}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-green-700">New Password:</p>
                          <p className="text-md font-mono bg-green-100 px-2 py-1 rounded">
                            {newCredentials.password}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-green-600 mt-2">
                        These credentials will not be shown again after reset.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        onResetCredentials();
                        onCredentialsChange({ loginId: '', password: '', confirmPassword: '' });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onUpdateCredentials}
                      className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                    >
                      Update Credentials
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.joinDate ? new Date(member.joinDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {member.updatedAt ? new Date(member.updatedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={onEdit}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Edit Member
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}