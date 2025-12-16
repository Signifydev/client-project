'use client';

import { useState } from 'react';
import { Customer } from '../types';

interface CustomerDetailsProps {
  customer: Customer;
  onBack: () => void;
  onDelete: (customerId: string) => void;
}

export default function CustomerDetails({ customer, onBack, onDelete }: CustomerDetailsProps) {
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

  const handleDownload = (documentUrl: string, documentType: string) => {
    if (documentUrl) {
      const link = document.createElement('a');
      link.href = documentUrl;
      link.download = `${customer.name}_${documentType}.pdf`;
      link.click();
    } else {
      alert('Document not available');
    }
  };

  const handleShareWhatsApp = (documentUrl: string, documentType: string) => {
    if (documentUrl) {
      const message = `FI Document for ${customer.name} - ${documentType}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message + ' ' + documentUrl)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      alert('Document not available for sharing');
    }
  };

  const calculateEMICompletion = (loan: any) => {
    const totalAmount = loan.loanAmount || 0;
    const paidAmount = loan.totalCollection || 0;
    const totalEmis = loan.loanDays || 30;
    const paidEmis = loan.emiPaidCount || 0;
    
    const completionPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
    const remainingEmis = Math.max(0, totalEmis - paidEmis);
    
    return {
      completionPercentage,
      remainingEmis,
      paidAmount,
      totalAmount,
      paidEmis,
      totalEmis
    };
  };

  const safeFormatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch (error) {
      return dateString;
    }
  };

  const getCustomerLoans = () => {
    const loans = [];
    
    if (customer.loanNumber || customer.loanAmount) {
      loans.push({
        loanNumber: customer.loanNumber,
        loanAmount: customer.loanAmount,
        emiAmount: customer.emiAmount,
        loanType: customer.loanType,
        loanDate: customer.loanDate,
        loanDays: customer.loanDays,
        status: customer.status || 'active',
        totalCollection: customer.totalCollection || 0,
        emiPaidCount: customer.emiPaidCount || 0,
        nextEmiDate: customer.nextEmiDate,
        emiHistory: customer.transactions || []
      });
    }
    
    if (customer.additionalLoans && Array.isArray(customer.additionalLoans)) {
      customer.additionalLoans.forEach((loan: any, index: number) => {
        loans.push({
          loanNumber: loan.loanNumber,
          loanAmount: loan.loanAmount,
          emiAmount: loan.emiAmount,
          loanType: loan.loanType || customer.loanType,
          loanDate: loan.loanDate || customer.loanDate,
          loanDays: loan.loanDays || customer.loanDays,
          status: loan.status || 'active',
          totalCollection: loan.totalCollection || 0,
          emiPaidCount: loan.emiPaidCount || 0,
          nextEmiDate: loan.nextEmiDate,
          emiHistory: loan.transactions || []
        });
      });
    }
    
    return loans;
  };

  const customerLoans = getCustomerLoans();

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
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold">{customer.name}</h1>
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {customer.customerNumber}
                </span>
              </div>
              <div className="flex items-center space-x-4 mt-2">
                <p className="text-blue-100">{customer.businessName}</p>
                <span className="text-blue-200">•</span>
                <p className="text-blue-100">{customer.area}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              customer.status === 'active' 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}>
              {customer.status === 'active' ? 'Active' : 'Inactive'}
            </span>
            <button 
              onClick={handleDeleteClick}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              Delete Profile
            </button>
          </div>
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
            onClick={() => setActiveTab('details')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Details
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
          <button
            onClick={() => setActiveTab('fi-documents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'fi-documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            FI Documents
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          {/* Customer Information Box */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Customer Name</p>
                    <p className="text-lg font-semibold text-gray-900">{customer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Business Name</p>
                    <p className="text-lg font-semibold text-gray-900">{customer.businessName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Primary Phone Number</p>
                    <p className="text-lg font-semibold text-gray-900">{customer.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Secondary Phone Number</p>
                    <p className="text-lg font-semibold text-gray-900">{customer.secondaryPhone || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">WhatsApp Number</p>
                    <p className="text-lg font-semibold text-gray-900">{customer.whatsappNumber || customer.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Address</p>
                    <p className="text-lg font-semibold text-gray-900">{customer.address || 'No address provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Area</p>
                    <p className="text-lg font-semibold text-gray-900">{customer.area}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Office Category & Category</p>
                    <div className="flex space-x-2 mt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {customer.officeCategory || 'N/A'}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.category === 'A' ? 'bg-green-100 text-green-800' :
                        customer.category === 'B' ? 'bg-yellow-100 text-yellow-800' :
                        customer.category === 'C' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {customer.category || 'Not specified'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loan Details Box */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Loan Details</h3>
                <span className="text-sm text-gray-600">
                  {customerLoans.length} Loan{customerLoans.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="p-6">
              {customerLoans.length > 0 ? (
                <div className="space-y-6">
                  {customerLoans.map((loan: any, index: number) => {
                    const completion = calculateEMICompletion(loan);
                    const remainingAmount = Math.round((loan.loanAmount || 0) * (1 - completion.completionPercentage/100));
                    
                    return (
                      <div key={index} className="border border-gray-300 rounded-xl p-6 hover:shadow-lg transition-all">
                        {/* Loan Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h5 className="font-bold text-gray-900 text-lg mb-2">
                              {loan.loanNumber || `L${index + 1}`}
                            </h5>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                loan.status === 'active' ? 'bg-green-100 text-green-800' :
                                loan.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                loan.status === 'defaulted' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {loan.status || 'active'}
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${
                                loan.loanType === 'Daily' ? 'bg-blue-100 text-blue-800' :
                                loan.loanType === 'Weekly' ? 'bg-green-100 text-green-800' :
                                loan.loanType === 'Monthly' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {loan.loanType || 'Daily'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-gray-600">Loan Amount</p>
                            <p className="text-lg font-bold text-green-600">
                              ₹{(loan.loanAmount || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Completion Percentage */}
                        <div className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <p className="text-xs font-semibold text-gray-700 mb-1">Completion</p>
                              <p className="font-bold text-xl text-blue-700">
                                {completion.completionPercentage.toFixed(1)}%
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium text-gray-600 mb-1">EMI Remaining</p>
                              <p className="font-semibold text-base text-gray-900">
                                {completion.remainingEmis} of {completion.totalEmis}
                              </p>
                            </div>
                          </div>
                          <div className="w-full bg-blue-100 rounded-full h-2 mb-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                              style={{width: `${Math.min(completion.completionPercentage, 100)}%`}}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <div className="text-gray-600">
                              <span>Paid: </span>
                              <span className="font-semibold">₹{Math.round(completion.paidAmount)}</span>
                            </div>
                            <div className="text-gray-600">
                              <span>Remaining: </span>
                              <span className="font-semibold">₹{remainingAmount} of ₹{loan.loanAmount?.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Loan Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">Loan Amount</p>
                            <p className="font-semibold text-gray-900 text-sm">
                              ₹{(loan.loanAmount || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">EMI Amount</p>
                            <p className="font-semibold text-gray-900 text-sm">
                              ₹{loan.emiAmount || '0'}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">No. of {loan.loanType === 'Daily' ? 'Days' : loan.loanType === 'Weekly' ? 'Weeks' : 'Months'}</p>
                            <p className="font-semibold text-gray-900 text-sm">
                              {loan.loanDays || 30}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">Loan Start Date</p>
                            <p className="font-semibold text-gray-900 text-sm">
                              {loan.loanDate ? safeFormatDate(loan.loanDate) : 'N/A'}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">Next EMI Date</p>
                            <p className="font-semibold text-gray-900 text-sm">
                              {loan.nextEmiDate ? safeFormatDate(loan.nextEmiDate) : 'N/A'}
                            </p>
                          </div>
                        </div>

                        {/* EMI History */}
                        {loan.emiHistory && loan.emiHistory.length > 0 && (
                          <div className="mt-4">
                            <details className="group">
                              <summary className="flex justify-between items-center cursor-pointer list-none text-sm font-semibold text-blue-700 hover:text-blue-800 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                <span>View EMI History ({loan.emiHistory.length} payments)</span>
                                <span className="transition-transform group-open:rotate-180 text-xs">▼</span>
                              </summary>
                              <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Amount</th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Collected By</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {loan.emiHistory.slice(0, 5).map((payment: any, idx: number) => (
                                      <tr key={idx}>
                                        <td className="px-3 py-2 text-xs">{safeFormatDate(payment.date)}</td>
                                        <td className="px-3 py-2 text-xs font-medium">₹{payment.amount}</td>
                                        <td className="px-3 py-2 text-xs">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            payment.status === 'Paid' ? 'bg-green-100 text-green-800' :
                                            payment.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                                            payment.status === 'Advance' ? 'bg-blue-100 text-blue-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {payment.status || 'Paid'}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2 text-xs">{payment.collectedBy || 'System'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {loan.emiHistory.length > 5 && (
                                  <div className="px-3 py-2 bg-gray-50 text-center">
                                    <p className="text-xs text-gray-500">
                                      Showing 5 of {loan.emiHistory.length} payments
                                    </p>
                                  </div>
                                )}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">💰</div>
                  <p className="text-gray-500 text-lg font-semibold">No loans found</p>
                  <p className="text-gray-400 text-sm mt-2">
                    This customer doesn't have any active loans
                  </p>
                </div>
              )}
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
            {customer.transactions && customer.transactions.length > 0 ? (
              <div className="space-y-4">
                {customer.transactions.map((transaction: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-600">EMI Payment</p>
                        <p className="text-lg font-semibold text-green-600">₹{transaction.amount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-600">Date</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {transaction.notes && (
                      <p className="text-sm text-gray-500 mt-2">{transaction.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📝</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-600">Transaction history will appear here when EMI payments are made.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'fi-documents' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Shop FI Document */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                <h3 className="text-lg font-semibold text-gray-900">Shop FI Document</h3>
              </div>
              <div className="p-6">
                <div className="text-center">
                  <div className="text-green-400 text-6xl mb-4">🏪</div>
                  <p className="text-gray-600 mb-4">Shop Field Investigation Document</p>
                  <div className="flex justify-center space-x-3">
                    <button 
                      onClick={() => handleDownload(customer.fiDocuments?.shop, 'Shop_FI')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Download
                    </button>
                    <button 
                      onClick={() => handleShareWhatsApp(customer.fiDocuments?.shop, 'Shop FI Document')}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
                    >
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Home FI Document */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                <h3 className="text-lg font-semibold text-gray-900">Home FI Document</h3>
              </div>
              <div className="p-6">
                <div className="text-center">
                  <div className="text-blue-400 text-6xl mb-4">🏠</div>
                  <p className="text-gray-600 mb-4">Home Field Investigation Document</p>
                  <div className="flex justify-center space-x-3">
                    <button 
                      onClick={() => handleDownload(customer.fiDocuments?.home, 'Home_FI')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Download
                    </button>
                    <button 
                      onClick={() => handleShareWhatsApp(customer.fiDocuments?.home, 'Home FI Document')}
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                    >
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Document Status */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Document Status</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <span className="text-gray-700">Shop FI Document</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    customer.fiDocuments?.shop ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {customer.fiDocuments?.shop ? 'Uploaded' : 'Not Uploaded'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <span className="text-gray-700">Home FI Document</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    customer.fiDocuments?.home ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {customer.fiDocuments?.home ? 'Uploaded' : 'Not Uploaded'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}