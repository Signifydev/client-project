'use client';

import { useState } from 'react';
import { TeamMember } from '../../types';

interface DataEntryOperatorModalProps {
  member: TeamMember | null;
  onSave: (data: any) => void;
  onClose: () => void;
}

export default function DataEntryOperatorModal({ member, onSave, onClose }: DataEntryOperatorModalProps) {
  const [formData, setFormData] = useState({
    name: member?.name || '',
    phone: member?.phone || '',
    whatsappNumber: member?.whatsappNumber || '',
    address: member?.address || '',
    officeCategory: member?.officeCategory || 'Office 1',
    operatorNumber: member?.operatorNumber || '',
    loginId: member?.loginId || '',
    password: member?.password || '',
    confirmPassword: '',
    status: member?.status || 'active'
  });

  const [showPassword, setShowPassword] = useState(false);

  const generateRandomId = () => {
    const prefix = 'DE';
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

  const handleGenerateCredentials = () => {
    const newLoginId = generateRandomId();
    const newPassword = generateRandomPassword();
    setFormData({
      ...formData,
      loginId: newLoginId,
      password: newPassword,
      confirmPassword: newPassword
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.loginId) {
      alert('Please generate Login ID!');
      return;
    }

    if (!member && formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    if (!member && !formData.password) {
      alert('Please generate credentials!');
      return;
    }

    if (!formData.operatorNumber) {
      alert('Please select Operator Number!');
      return;
    }

    const { confirmPassword, ...saveData } = formData;
    onSave(saveData);
  };

  const operatorNumbers = Array.from({ length: 10 }, (_, i) => `Operator ${i + 1}`);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {member ? 'Edit Data Entry Operator' : 'Add Data Entry Operator'}
            </h2>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="Phone number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="WhatsApp number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Office Category *
                </label>
                <select
                  required
                  value={formData.officeCategory}
                  onChange={(e) => setFormData({ ...formData, officeCategory: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                >
                  <option value="Office 1">Office 1</option>
                  <option value="Office 2">Office 2</option>
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  This determines which customers the operator can access
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operator Number *
                </label>
                <select
                  required
                  value={formData.operatorNumber}
                  onChange={(e) => setFormData({ ...formData, operatorNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                >
                  <option value="">Select Operator Number</option>
                  {operatorNumbers.map(number => (
                    <option key={number} value={number}>{number}</option>
                  ))}
                </select>
                <p className="text-sm text-gray-500 mt-2">
                  This will be used to track operator activities
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="Full address"
              />
            </div>

            {/* Login Credentials Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-lg font-medium text-gray-700">
                  Login Credentials *
                </label>
                {!member && (
                  <button
                    type="button"
                    onClick={handleGenerateCredentials}
                    className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 font-medium"
                  >
                    Generate Credentials
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Login ID
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.loginId}
                    onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-gray-50"
                    placeholder="Click generate to create Login ID"
                    readOnly
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    System-generated Login ID for data entry
                  </p>
                </div>
                
                {!member && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-gray-50"
                          placeholder="Click generate to create password"
                          readOnly
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? (
                            <span className="text-gray-400">👁️</span>
                          ) : (
                            <span className="text-gray-400">👁️</span>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg bg-gray-50"
                          placeholder="Confirm password"
                          readOnly
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? (
                            <span className="text-gray-400">👁️</span>
                          ) : (
                            <span className="text-gray-400">👁️</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {formData.loginId && formData.password && !member && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    <strong>Important:</strong> Save these credentials securely. They will be shown only once.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-sm text-yellow-700">
                        Login ID: <span className="font-mono bg-yellow-100 px-2 py-1 rounded">{formData.loginId}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-yellow-700">
                        Password: <span className="font-mono bg-yellow-100 px-2 py-1 rounded">{formData.password}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg"
              >
                {member ? 'Update' : 'Create'} Operator
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}