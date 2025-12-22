'use client';

import { useState, useEffect } from 'react';
import { EditCustomerData, CloudinaryUploadResponse } from '@/src/app/data-entry/types/dataEntry';
import { customerCategories, officeCategories } from '@/src/app/data-entry/utils/constants';
import { useCustomers } from '@/src/app/data-entry/hooks/useCustomers';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerData: EditCustomerData;
  onSuccess?: () => void;
  currentUserOffice: string;
  currentOperator: { id: string; name: string };
}

// Interface for file upload state
interface FileUploadState {
  profilePicture: { file: File | null; isUploading: boolean; url?: string };
  fiDocumentShop: { file: File | null; isUploading: boolean; url?: string };
  fiDocumentHome: { file: File | null; isUploading: boolean; url?: string };
}

// Extended form data with file URLs
interface ExtendedEditCustomerData extends EditCustomerData {
  profilePictureUrl?: string;
  shopDocumentUrl?: string;
  homeDocumentUrl?: string;
}

export default function EditCustomerModal({
  isOpen,
  onClose,
  customerData,
  onSuccess,
  currentUserOffice,
  currentOperator
}: EditCustomerModalProps) {
  const [formData, setFormData] = useState<ExtendedEditCustomerData>({
    ...customerData,
    profilePictureUrl: '',
    shopDocumentUrl: '',
    homeDocumentUrl: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [fileUploadState, setFileUploadState] = useState<FileUploadState>({
    profilePicture: { file: null, isUploading: false },
    fiDocumentShop: { file: null, isUploading: false },
    fiDocumentHome: { file: null, isUploading: false }
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [currentFiles, setCurrentFiles] = useState<{
    profilePicture?: string;
    shopDocument?: string;
    homeDocument?: string;
  }>({});

  const { editCustomer } = useCustomers(currentUserOffice || 'all', currentOperator.id);

  // ============================================================================
  // ADDED: Fetch current customer files on modal open
  // ============================================================================
  useEffect(() => {
    if (isOpen && customerData.customerId) {
      fetchCurrentCustomerFiles();
    }
  }, [isOpen, customerData.customerId]);

  // ============================================================================
  // ADDED: Fetch current customer files from API
  // ============================================================================
  const fetchCurrentCustomerFiles = async () => {
    try {
      const response = await fetch(`/api/data-entry/customers/${customerData.customerId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const customer = data.data;
          setCurrentFiles({
            profilePicture: customer.profilePicture?.url,
            shopDocument: customer.fiDocuments?.shop?.url,
            homeDocument: customer.fiDocuments?.home?.url
          });
        }
      }
    } catch (error) {
      console.error('Error fetching customer files:', error);
    }
  };

  // ============================================================================
  // ADDED: Handle file upload
  // ============================================================================
  const handleFileUpload = (field: string, file: File | null, documentType?: 'shop' | 'home'): void => {
    // Validate file type and size
    if (file) {
      // Validate image files
      if (field === 'profilePicture') {
        if (!file.type.startsWith('image/')) {
          alert('Please upload an image file (PNG, JPEG, etc.) for profile picture');
          return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          alert('Profile picture size should be less than 5MB');
          return;
        }
      }
      
      // Validate PDF files
      if (field === 'fiDocuments' && documentType) {
        if (file.type !== 'application/pdf') {
          alert('Please upload a PDF file for FI documents');
          return;
        }
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          alert('FI document size should be less than 10MB');
          return;
        }
      }
    }
    
    // Update file state
    if (field === 'profilePicture') {
      setFileUploadState(prev => ({ 
        ...prev, 
        profilePicture: { file, isUploading: false, url: file ? URL.createObjectURL(file) : undefined } 
      }));
    } else if (field === 'fiDocuments' && documentType) {
      const key = documentType === 'shop' ? 'fiDocumentShop' : 'fiDocumentHome';
      setFileUploadState(prev => ({ 
        ...prev, 
        [key]: { file, isUploading: false, url: file ? URL.createObjectURL(file) : undefined } 
      }));
    }
  };

  // ============================================================================
  // ADDED: Upload file to Cloudinary
  // ============================================================================
  const uploadFileToCloudinary = async (file: File, folderName: string, fileType: 'image' | 'document'): Promise<CloudinaryUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', `loan_app/${folderName}`);
    formData.append('type', fileType);
    
    console.log(`📤 Uploading ${file.name} to Cloudinary...`);
    console.log(`📁 Folder: loan_app/${folderName}`);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Upload failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Upload successful:`, data);
    return data;
  };

  // ============================================================================
  // ADDED: Upload all files
  // ============================================================================
  const uploadAllFiles = async (): Promise<{ 
    profilePictureUrl?: string; 
    shopDocumentUrl?: string; 
    homeDocumentUrl?: string; 
  }> => {
    const uploadedFiles: {
      profilePictureUrl?: string;
      shopDocumentUrl?: string;
      homeDocumentUrl?: string;
    } = {};
    
    let filesToUpload = 0;
    let filesUploaded = 0;
    
    // Count files to upload
    if (fileUploadState.profilePicture.file) filesToUpload++;
    if (fileUploadState.fiDocumentShop.file) filesToUpload++;
    if (fileUploadState.fiDocumentHome.file) filesToUpload++;
    
    if (filesToUpload === 0) {
      console.log('📭 No new files to upload');
      return uploadedFiles;
    }
    
    console.log(`📊 Starting upload of ${filesToUpload} file(s)...`);
    setUploadMessage(`Uploading ${filesToUpload} file(s) to Cloudinary...`);
    setUploadProgress(0);
    
    // Upload profile picture
    if (fileUploadState.profilePicture.file) {
      setFileUploadState(prev => ({ ...prev, profilePicture: { ...prev.profilePicture, isUploading: true } }));
      try {
        const result = await uploadFileToCloudinary(
          fileUploadState.profilePicture.file, 
          'profile_pictures', 
          'image'
        );
        uploadedFiles.profilePictureUrl = result.url;
        setFileUploadState(prev => ({ 
          ...prev, 
          profilePicture: { ...prev.profilePicture, isUploading: false } 
        }));
        filesUploaded++;
        setUploadProgress(Math.round((filesUploaded / filesToUpload) * 100));
        console.log('✅ Profile picture uploaded:', result.url);
      } catch (error: any) {
        console.error('❌ Profile picture upload failed:', error);
        setUploadError(`Failed to upload profile picture: ${error.message}`);
        setFileUploadState(prev => ({ ...prev, profilePicture: { ...prev.profilePicture, isUploading: false } }));
        throw error;
      }
    }
    
    // Upload shop document
    if (fileUploadState.fiDocumentShop.file) {
      setFileUploadState(prev => ({ ...prev, fiDocumentShop: { ...prev.fiDocumentShop, isUploading: true } }));
      try {
        const result = await uploadFileToCloudinary(
          fileUploadState.fiDocumentShop.file, 
          'fi_documents/shop', 
          'document'
        );
        uploadedFiles.shopDocumentUrl = result.url;
        setFileUploadState(prev => ({ 
          ...prev, 
          fiDocumentShop: { ...prev.fiDocumentShop, isUploading: false } 
        }));
        filesUploaded++;
        setUploadProgress(Math.round((filesUploaded / filesToUpload) * 100));
        console.log('✅ Shop document uploaded:', result.url);
      } catch (error: any) {
        console.error('❌ Shop document upload failed:', error);
        setUploadError(`Failed to upload shop document: ${error.message}`);
        setFileUploadState(prev => ({ ...prev, fiDocumentShop: { ...prev.fiDocumentShop, isUploading: false } }));
        throw error;
      }
    }
    
    // Upload home document
    if (fileUploadState.fiDocumentHome.file) {
      setFileUploadState(prev => ({ ...prev, fiDocumentHome: { ...prev.fiDocumentHome, isUploading: true } }));
      try {
        const result = await uploadFileToCloudinary(
          fileUploadState.fiDocumentHome.file, 
          'fi_documents/home', 
          'document'
        );
        uploadedFiles.homeDocumentUrl = result.url;
        setFileUploadState(prev => ({ 
          ...prev, 
          fiDocumentHome: { ...prev.fiDocumentHome, isUploading: false } 
        }));
        filesUploaded++;
        setUploadProgress(100);
        console.log('✅ Home document uploaded:', result.url);
      } catch (error: any) {
        console.error('❌ Home document upload failed:', error);
        setUploadError(`Failed to upload home document: ${error.message}`);
        setFileUploadState(prev => ({ ...prev, fiDocumentHome: { ...prev.fiDocumentHome, isUploading: false } }));
        throw error;
      }
    }
    
    setUploadMessage(`✅ Successfully uploaded ${filesUploaded} file(s) to Cloudinary`);
    return uploadedFiles;
  };

  // ============================================================================
  // UPDATED: Handle form submission with Cloudinary upload
  // ============================================================================
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }

    if (!formData.phone[0] || formData.phone[0].length < 10) {
      alert('Valid primary phone number is required');
      return;
    }

    // Reset upload states
    setUploadError('');
    setUploadMessage('Starting file upload...');
    
    setIsLoading(true);
    try {
      // Step 1: Upload files to Cloudinary
      let cloudinaryUrls = {};
      const hasNewFiles = fileUploadState.profilePicture.file || 
                         fileUploadState.fiDocumentShop.file || 
                         fileUploadState.fiDocumentHome.file;
      
      if (hasNewFiles) {
        cloudinaryUrls = await uploadAllFiles();
      }

      // Step 2: Prepare edit data with Cloudinary URLs
      const editData = {
        ...formData,
        // Include Cloudinary URLs if files were uploaded
        ...(cloudinaryUrls as any)
      };

      // Step 3: Submit edit request
      await editCustomer(editData);
      setUploadMessage('✅ Edit request submitted successfully! Waiting for admin approval.');
      alert('Edit request submitted successfully! Waiting for admin approval.');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('❌ Error submitting edit request:', error);
      setUploadError(`Submission failed: ${error.message}`);
      alert('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // ADDED: Reset form function
  // ============================================================================
  const resetForm = () => {
    setFormData(customerData);
    setFileUploadState({
      profilePicture: { file: null, isUploading: false },
      fiDocumentShop: { file: null, isUploading: false },
      fiDocumentHome: { file: null, isUploading: false }
    });
    setUploadProgress(0);
    setUploadMessage('');
    setUploadError('');
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

        {/* ============================================================================
        ADDED: Upload Progress Bar
        ============================================================================ */}
        {isLoading && (
          <div className="p-3 border-b bg-blue-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">
                {uploadMessage || 'Uploading files...'}
              </span>
              <span className="text-sm font-bold text-blue-700">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            {uploadError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-600">⚠️ {uploadError}</p>
              </div>
            )}
          </div>
        )}

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

          {/* ============================================================================
          ADDED: File Upload Section
          ============================================================================ */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wider">File Uploads (Cloudinary)</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {/* Current Files Display */}
              {(currentFiles.profilePicture || currentFiles.shopDocument || currentFiles.homeDocument) && (
                <div className="mb-4">
                  <h5 className="text-xs font-medium text-gray-700 mb-2">Current Files:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {currentFiles.profilePicture && (
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-1">Profile Picture</p>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 text-xs">🖼️</span>
                          </div>
                          <a 
                            href={currentFiles.profilePicture} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate"
                            title={currentFiles.profilePicture}
                          >
                            View on Cloudinary
                          </a>
                        </div>
                      </div>
                    )}
                    {currentFiles.shopDocument && (
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-1">Shop FI Document</p>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center">
                            <span className="text-red-600 text-xs">📄</span>
                          </div>
                          <a 
                            href={currentFiles.shopDocument} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate"
                            title={currentFiles.shopDocument}
                          >
                            View PDF
                          </a>
                        </div>
                      </div>
                    )}
                    {currentFiles.homeDocument && (
                      <div className="bg-white p-3 rounded border border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-1">Home FI Document</p>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center">
                            <span className="text-green-600 text-xs">📄</span>
                          </div>
                          <a 
                            href={currentFiles.homeDocument} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate"
                            title={currentFiles.homeDocument}
                          >
                            View PDF
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* File Upload Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Profile Picture Upload */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    New Profile Picture
                    <span className="text-xs font-normal text-gray-500 ml-1">(Max 5MB, JPG/PNG)</span>
                  </label>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {fileUploadState.profilePicture.url ? (
                        <div className="relative">
                          <img
                            src={fileUploadState.profilePicture.url}
                            alt="Profile preview"
                            className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleFileUpload('profilePicture', null)}
                            className="absolute -top-1 -right-1 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <span className="text-gray-400 text-sm">👤</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        id="edit-profile-picture"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileUpload('profilePicture', e.target.files?.[0] || null)}
                        disabled={fileUploadState.profilePicture.isUploading}
                      />
                      <label
                        htmlFor="edit-profile-picture"
                        className={`cursor-pointer px-3 py-1.5 text-xs rounded-md inline-flex items-center ${
                          fileUploadState.profilePicture.isUploading
                            ? 'bg-blue-100 text-blue-700 border border-blue-300 cursor-not-allowed opacity-70'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {fileUploadState.profilePicture.isUploading ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-1"></div>
                            Uploading...
                          </>
                        ) : fileUploadState.profilePicture.file ? (
                          'Change Picture'
                        ) : (
                          'Upload New Picture'
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* FI Documents Upload */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    FI Documents
                    <span className="text-xs font-normal text-gray-500 ml-1">(PDF, Max 10MB each)</span>
                  </label>
                  <div className="space-y-2">
                    {(['shop', 'home'] as const).map((docType) => {
                      const fileKey = docType === 'shop' ? 'fiDocumentShop' : 'fiDocumentHome';
                      const fileState = fileUploadState[fileKey];
                      
                      return (
                        <div key={docType} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-8 h-8 rounded flex items-center justify-center ${
                              fileState.isUploading 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'bg-red-100 text-red-600'
                            }`}>
                              {fileState.isUploading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              ) : (
                                <span className="text-xs">📄</span>
                              )}
                            </div>
                            <span className="text-xs text-gray-700">
                              {docType === 'shop' ? 'Shop FI' : 'Home FI'}
                            </span>
                          </div>
                          <div>
                            <input
                              type="file"
                              id={`edit-fi-doc-${docType}`}
                              className="hidden"
                              accept=".pdf"
                              onChange={(e) => handleFileUpload('fiDocuments', e.target.files?.[0] || null, docType)}
                              disabled={fileState.isUploading}
                            />
                            <label
                              htmlFor={`edit-fi-doc-${docType}`}
                              className={`cursor-pointer px-3 py-1 text-xs rounded-md inline-flex items-center ${
                                fileState.isUploading
                                  ? 'bg-blue-100 text-blue-700 border border-blue-300 cursor-not-allowed opacity-70'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {fileState.isUploading ? (
                                <>
                                  <div className="animate-spin rounded-full h-2 w-2 border-b-2 border-white mr-1"></div>
                                  Uploading
                                </>
                              ) : fileState.file ? (
                                'Change'
                              ) : (
                                'Upload'
                              )}
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Cloudinary Info */}
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-700">
                  <span className="font-medium">ℹ️ Note:</span> Files are uploaded to Cloudinary. 
                  Leave fields empty to keep existing files.
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
            <div className="text-xs text-gray-500">
              <p className="font-medium mb-1">Note:</p>
              <p>• Changes require admin approval</p>
              <p>• Files are uploaded to Cloudinary</p>
            </div>
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