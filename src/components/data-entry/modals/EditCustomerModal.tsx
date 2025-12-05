'use client';

import { useState } from 'react';
import { EditCustomerData } from '@/src/types/dataEntry';
import { customerCategories, officeCategories } from '@/src/utils/constants';
import { useCustomers } from '@/src/hooks/useCustomers';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerData: EditCustomerData;
  onSuccess?: () => void;
  currentUserOffice: string;
}

export default function EditCustomerModal({
  isOpen,
  onClose,
  customerData,
  onSuccess,
  currentUserOffice
}: EditCustomerModalProps) {
  const [formData, setFormData] = useState<EditCustomerData>(customerData);
  const [isLoading, setIsLoading] = useState(false);

  const { editCustomer } = useCustomers(currentUserOffice);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }

    if (!formData.phone[0] || formData.phone[0].length < 10) {
      alert('Valid primary phone number is required');
      return;
    }

    setIsLoading(true);
    try {
      await editCustomer(formData);
      alert('Edit request submitted successfully! Waiting for admin approval.');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center p-4 pt-20">
      {/* Increased width to max-w-4xl */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-auto mb-8">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 rounded-t-lg z-10">
          <div className="flex items-center justify-between p-4 md:p-5">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-blue-600 text-xl">✏️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit Customer Profile
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Customer ID: {formData.customerId?.substring(0, 12)}...
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 bg-transparent hover:bg-gray-100 hover:text-gray-900 rounded-lg text-sm p-1.5"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Warning Alert */}
        <div className="p-3 border-b bg-yellow-50">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-yellow-500 text-lg">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Important Notice</h3>
              <div className="text-sm text-yellow-700">
                <p>
                  All changes require admin approval. The customer details will be updated only after approval.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content - Reduced height */}
        <div className="p-4 md:p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Customer Information Section */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Customer Information</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Customer Number</p>
                  <p className="text-sm font-medium text-gray-900">{formData.customerNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Note</p>
                <p className="text-xs text-gray-600">
                  All changes require admin approval. The customer details will be updated only after approval.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal Information Section */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Personal Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Primary Phone Number *
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.phone[0]}
                    onChange={(e) => {
                      const newPhones = [...formData.phone];
                      newPhones[0] = e.target.value;
                      setFormData(prev => ({ ...prev, phone: newPhones }));
                    }}
                    placeholder="10-digit phone number"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Alternate Phone Number
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.phone[1] || ''}
                    onChange={(e) => {
                      const newPhones = [...formData.phone];
                      newPhones[1] = e.target.value;
                      setFormData(prev => ({ ...prev, phone: newPhones }));
                    }}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsappNumber: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            {/* Business Information Section */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Business Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Enter business name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Area/Location *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.area}
                    onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                    placeholder="Enter area/location"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Complete Address
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter complete address"
                  />
                </div>
              </div>
            </div>

            {/* Category & Office Information Section */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">Category & Office Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <option value="">Select Category</option>
                    {customerCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Office Category *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.officeCategory}
                    onChange={(e) => setFormData(prev => ({ ...prev, officeCategory: e.target.value }))}
                  >
                    <option value="">Select Office</option>
                    {officeCategories.map(office => (
                      <option key={office} value={office}>{office}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 rounded-b-lg p-4 md:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              <span className="font-medium">Note:</span> Changes require admin approval
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block mr-2 animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></span>
                    Submitting...
                  </>
                ) : (
                  'Submit for Approval'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}