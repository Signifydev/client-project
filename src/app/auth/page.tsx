'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('customer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // For customer role, use the existing flow
      if (role === 'customer') {
        router.push('/customer');
        return;
      }

      // For super_admin, use existing flow (you might want to add authentication later)
      if (role === 'super_admin') {
        // You can add super admin authentication here later
        router.push('/admin');
        return;
      }

      // For team members (Recovery Team and Data Entry), authenticate via API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loginId,
          password,
          role: role === 'data_entry' ? 'Data Entry Operator' : 'Recovery Team'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store user data in localStorage
        localStorage.setItem('currentUser', JSON.stringify(data.data));
        localStorage.setItem('userRole', data.data.role);
        localStorage.setItem('officeCategory', data.data.officeCategory || '');
        
        // Redirect based on role
        switch (data.data.role) {
          case 'Recovery Team':
            router.push('/team');
            break;
          case 'Data Entry Operator':
            router.push('/data-entry');
            break;
          default:
            router.push('/customer');
        }
      } else {
        setError(data.error || 'Invalid Login ID or Password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update placeholder based on role
  const getLoginIdPlaceholder = () => {
    switch (role) {
      case 'collection_team':
        return 'Enter your RT login ID (e.g., RT1234)';
      case 'data_entry':
        return 'Enter your DE login ID (e.g., DE1234)';
      case 'super_admin':
        return 'Enter super admin username';
      default:
        return 'Enter your username';
    }
  };

  const getRoleLabel = (roleValue: string) => {
    switch (roleValue) {
      case 'collection_team':
        return 'Recovery Team';
      case 'data_entry':
        return 'Data Entry Operator';
      case 'super_admin':
        return 'Super Admin';
      default:
        return 'Customer';
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Login
            </h2>
            <p className="text-sm text-gray-600">
              Welcome to Kala Brothers Associations
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Login As
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setError('');
                  setLoginId('');
                  setPassword('');
                }}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="customer">Customer</option>
                <option value="collection_team">Recovery Team</option>
                <option value="data_entry">Data Entry Operator</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            {/* Login ID Field */}
            <div>
              <label htmlFor="loginId" className="block text-sm font-medium text-gray-700">
                {role === 'super_admin' ? 'Username' : 'Login ID'}
              </label>
              <div className="mt-1">
                <input
                  id="loginId"
                  name="loginId"
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={getLoginIdPlaceholder()}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                  placeholder="Enter your Password"
                />
                {/* Show/Hide Password Toggle */}
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="text-sm text-gray-500 hover:text-gray-700">
                    {showPassword ? 'Hide' : 'Show'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Forgot your password?
                </a>
              </div>
            </div>

            {/* Login Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  'Login'
                )}
              </button>
            </div>

            {/* Demo Info */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                {role === 'customer' || role === 'super_admin' 
                  ? 'Demo: Select your role and use any credentials' 
                  : 'Use your system-generated Login ID and Password'
                }
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side - Branding/Image */}
      <div className="hidden lg:block relative flex-1 bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-white px-12">
            <div className="mb-8">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">KB</span>
              </div>
              <h1 className="text-4xl font-bold mb-2">Kala Brothers</h1>
              <p className="text-xl opacity-90">Associations</p>
            </div>
            
            <div className="mt-12">
              <h3 className="text-2xl font-semibold mb-4">Loan Management System</h3>
              <p className="text-blue-100 text-lg">
                Professional loan management for shopkeepers and small businesses
              </p>
            </div>

            {/* Features List */}
            <div className="mt-16 grid grid-cols-2 gap-6 text-left">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-blue-100">Daily EMI Collection</span>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-blue-100">GPS Tracking</span>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-blue-100">Multi-role Access</span>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm">✓</span>
                </div>
                <span className="text-blue-100">Real-time Reports</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}