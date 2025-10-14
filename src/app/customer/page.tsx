'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Define TypeScript interfaces
interface Loan {
  id: number;
  amount: number;
  days: number;
  status: string;
  loanId: string;
  completion: number;
  totalAmount: number;
  emiAmount: number;
  dueDate: string;
  nextEmiDate: string;
  nextEmiAmount: number;
  upcomingEMIs: Array<{
    date: string;
    amount: number;
  }>;
}

interface Payment {
  id: number;
  date: string;
  amount: number;
  type: string;
  status: string;
}

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export default function CustomerDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeLoanTab, setActiveLoanTab] = useState(0); // First loan active by default

  // Mock data matching the image design
  const customerData = {
    name: 'Ram',
    loans: [
      { 
        id: 1,
        amount: 500, 
        days: 80,
        status: 'Active',
        loanId: '102',
        completion: 45,
        totalAmount: 40000,
        emiAmount: 500,
        dueDate: '2025-08-12',
        nextEmiDate: '2025-08-13',
        nextEmiAmount: 500,
        upcomingEMIs: [
          { date: '2025-08-12', amount: 300 },
          { date: '2025-08-14', amount: 200 }
        ]
      },
      { 
        id: 2,
        amount: 300, 
        days: 60,
        status: 'Active',
        loanId: '103',
        completion: 60,
        totalAmount: 18000,
        emiAmount: 300,
        dueDate: '2025-09-15',
        nextEmiDate: '2025-09-16',
        nextEmiAmount: 300,
        upcomingEMIs: [
          { date: '2025-09-16', amount: 300 },
          { date: '2025-09-17', amount: 300 }
        ]
      },
      { 
        id: 3,
        amount: 200, 
        days: 60,
        status: 'Active',
        loanId: '104',
        completion: 75,
        totalAmount: 12000,
        emiAmount: 200,
        dueDate: '2025-10-10',
        nextEmiDate: '2025-10-11',
        nextEmiAmount: 200,
        upcomingEMIs: [
          { date: '2025-10-11', amount: 200 },
          { date: '2025-10-12', amount: 200 }
        ]
      }
    ] as Loan[],
    paymentHistory: [
      { id: 1, date: '2025-08-11', amount: 500, type: 'EMI Payment', status: 'Paid' },
      { id: 2, date: '2025-08-10', amount: 500, type: 'EMI Payment', status: 'Paid' },
      { id: 3, date: '2025-08-09', amount: 500, type: 'EMI Payment', status: 'Paid' },
      { id: 4, date: '2025-08-08', amount: 500, type: 'EMI Payment', status: 'Paid' },
    ] as Payment[]
  };

  const activeLoan = customerData.loans[activeLoanTab];

  const handleLogout = () => {
    router.push('/auth');
  };

  // Circular Progress Bar Component with TypeScript props
  const CircularProgress = ({ percentage, size = 80, strokeWidth = 8 }: CircularProgressProps) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#10b981"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-700">{percentage}%</span>
        </div>
      </div>
    );
  };

  // Dashboard Content - Mobile First Design
  const renderDashboard = () => (
    <div className="p-4 space-y-6">
      {/* Welcome Header */}
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Hello {customerData.name}!</h1>
      </div>

      {/* Loan Cards - Circular Design with Tab Functionality */}
      <div className="flex justify-center space-x-4 pb-2">
        {customerData.loans.map((loan: Loan, index: number) => (
          <button
            key={loan.id}
            onClick={() => setActiveLoanTab(index)}
            className={`flex flex-col items-center transition-all duration-200 ${
              activeLoanTab === index ? 'scale-105' : 'scale-100 opacity-80'
            }`}
          >
            <div className={`
              w-16 h-16 rounded-full flex flex-col items-center justify-center text-white shadow-lg mb-1
              ${activeLoanTab === index 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 ring-2 ring-blue-400 ring-offset-2' 
                : 'bg-gradient-to-br from-blue-500 to-blue-600'
              }
            `}>
              <div className="text-base font-bold">₹{loan.amount}</div>
            </div>
            <div className="text-xs text-gray-600 text-center leading-tight">
              ₹{loan.amount}/{loan.days} days
            </div>
          </button>
        ))}
      </div>

      {/* Active Loan Details - Shows based on selected loan tab */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Current Loan Status</h3>
            <p className="text-sm text-gray-500">{activeLoan.status}</p>
          </div>
          <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-medium">
            Loan ID: {activeLoan.loanId}
          </span>
        </div>

        {/* Loan Completion with Circular Progress */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <h4 className="text-md font-medium text-gray-900 mb-2">Loan Completion</h4>
            
            {/* Loan Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold">₹{activeLoan.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">EMI</span>
                <span className="font-semibold">₹{activeLoan.emiAmount}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">Due</span>
                <div className="flex items-center space-x-1">
                  <span className="font-semibold">
                    {new Date(activeLoan.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-gray-400">📅</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Circular Progress Bar */}
          <div className="ml-4">
            <CircularProgress percentage={activeLoan.completion} size={70} strokeWidth={6} />
          </div>
        </div>
      </div>

      {/* Next EMI Due */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-90 mb-1">Next EMI Due</p>
            <p className="text-xl font-bold">
              {new Date(activeLoan.nextEmiDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-3xl font-bold">₹{activeLoan.nextEmiAmount}</div>
        </div>
      </div>

      {/* Upcoming EMI Payments */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming EMI Payments</h3>
        <div className="space-y-3">
          {activeLoan.upcomingEMIs.map((emi, index: number) => (
            <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-gray-400">📅</span>
                <p className="font-medium text-gray-900">
                  {new Date(emi.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="text-lg font-bold text-gray-900">₹{emi.amount}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
        <div className="space-y-3">
          {customerData.paymentHistory.map((payment: Payment) => (
            <div key={payment.id} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{payment.type}</p>
                <p className="text-sm text-gray-500">
                  {new Date(payment.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">₹{payment.amount}</p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {payment.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Payments Content
  const renderPayments = () => (
    <div className="p-4 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-500">Total Paid</p>
          <p className="text-xl font-bold text-green-600">₹2,000</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-xl font-bold text-orange-600">₹500</p>
        </div>
      </div>

      {/* All Payments List */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Payments</h3>
        <div className="space-y-4">
          {customerData.paymentHistory.map((payment: Payment) => (
            <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-lg">💰</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{payment.type}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(payment.date).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">₹{payment.amount}</p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {payment.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Profile Content
  const renderProfile = () => (
    <div className="p-4 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-blue-600 font-bold">
              {customerData.name.charAt(0)}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{customerData.name}</h2>
          <p className="text-gray-500">Active Customer</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Customer ID</span>
            <span className="font-semibold">CUST001234</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Phone</span>
            <span className="font-semibold">9876543210</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Email</span>
            <span className="font-semibold">ram@example.com</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">Join Date</span>
            <span className="font-semibold">Jan 15, 2024</span>
          </div>
        </div>
      </div>

      {/* Account Status */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
          <div>
            <p className="font-medium text-green-800">Active</p>
            <p className="text-sm text-green-600">All services available</p>
          </div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
      </div>
    </div>
  );

  // Support Content
  const renderSupport = () => (
    <div className="p-4 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support</h1>
        <p className="text-gray-600">We're here to help you</p>
      </div>

      {/* Contact Options */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Support</h3>
        <div className="space-y-4">
          <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-lg">📞</span>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Call Support</p>
                <p className="text-sm text-gray-500">+91 98765 43210</p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-lg">💬</span>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">WhatsApp</p>
                <p className="text-sm text-gray-500">Chat with us</p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <button className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-lg">📧</span>
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Email</p>
                <p className="text-sm text-gray-500">support@kalabrothers.com</p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </button>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">FAQ</h3>
        <div className="space-y-3">
          {[
            'How to make EMI payments?',
            'What if I miss an EMI?',
            'How to check loan status?',
            'Can I prepay my loan?'
          ].map((question, index) => (
            <button key={index} className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">{question}</span>
                <span className="text-gray-400">+</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header - Hidden on mobile, shown on desktop */}
      <header className="bg-white shadow-sm hidden md:block">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">K</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Kala Brothers</h1>
                <p className="text-sm text-gray-500">Customer Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {customerData.name}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto">
        {/* Mobile Header */}
        <div className="bg-white shadow-sm md:hidden">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">K</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Kala Brothers</h1>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-red-600 text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-screen">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'payments' && renderPayments()}
          {activeTab === 'profile' && renderProfile()}
          {activeTab === 'support' && renderSupport()}
        </div>
      </main>

      {/* Bottom Navigation - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
        <div className="flex justify-around items-center">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'payments', label: 'Payments', icon: '💰' },
            { id: 'profile', label: 'Profile', icon: '👤' },
            { id: 'support', label: 'Support', icon: '🛟' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center py-3 px-4 flex-1 ${
                activeTab === tab.id
                  ? 'text-blue-600'
                  : 'text-gray-500'
              }`}
            >
              <span className="text-xl mb-1">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg hidden md:block">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-xl">K</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Kala Brothers</h1>
              <p className="text-sm text-gray-500">Customer Portal</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'payments', label: 'Payments', icon: '💰' },
            { id: 'profile', label: 'Profile', icon: '👤' },
            { id: 'support', label: 'Support', icon: '🛟' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Desktop Main Content Adjustment */}
      <style jsx>{`
        @media (min-width: 768px) {
          main {
            margin-left: 16rem;
          }
          header {
            margin-left: 16rem;
          }
        }
      `}</style>
    </div>
  );
}