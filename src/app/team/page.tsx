'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Mock data for demonstration
  const todayStats = {
    customersVisited: 18,
    emiCollected: 22,
    totalCollection: 45000,
    pendingVisits: 7
  };

  // Mock customers data
  const assignedCustomers = [
    { id: 1, name: 'Rajesh Kumar', area: 'Sector 15', emiAmount: 2500, status: 'Pending', address: 'House No. 123, Sector 15' },
    { id: 2, name: 'Priya Sharma', area: 'Sector 22', emiAmount: 3750, status: 'Pending', address: 'House No. 456, Sector 22' },
    { id: 3, name: 'Amit Patel', area: 'Sector 8', emiAmount: 1500, status: 'Collected', address: 'House No. 789, Sector 8' },
    { id: 4, name: 'Sneha Gupta', area: 'Sector 45', emiAmount: 5000, status: 'Pending', address: 'House No. 321, Sector 45' },
  ];

  // Mock location history
  const locationHistory = [
    { id: 1, time: '10:30 AM', location: 'Sector 15', lat: 28.6129, lng: 77.2295 },
    { id: 2, time: '11:45 AM', location: 'Sector 22', lat: 28.6255, lng: 77.2320 },
    { id: 3, time: '01:15 PM', location: 'Sector 8', lat: 28.6343, lng: 77.2389 },
  ];

  const handleLogout = () => {
    router.push('/auth');
  };

  // Dashboard Content
  const renderDashboard = () => (
    <div className="px-4 py-6 sm:px-0">
      {/* Today's Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Customers Visited</dt>
            <dd className="mt-1 text-3xl font-semibold text-blue-600">{todayStats.customersVisited}</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">EMI Collected</dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">{todayStats.emiCollected}</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Collection</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">₹{todayStats.totalCollection}</dd>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Pending Visits</dt>
            <dd className="mt-1 text-3xl font-semibold text-orange-600">{todayStats.pendingVisits}</dd>
          </div>
        </div>
      </div>

      {/* Today's Route */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Today's Collection Route</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Your scheduled customer visits for today</p>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {assignedCustomers.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{customer.name}</h4>
                    <p className="text-sm text-gray-500">{customer.address}</p>
                    <p className="text-sm text-gray-500">EMI: ₹{customer.emiAmount}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      customer.status === 'Collected' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {customer.status}
                    </span>
                    <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                      {customer.status === 'Pending' ? 'Collect' : 'View'}
                    </button>
                    <button className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700">
                      Navigate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* GPS Status */}
      <div className="mt-8 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">GPS Location Tracking</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Your location is being tracked for the last 72 hours</p>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-green-400">📍</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Location Services Active</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>GPS tracking is enabled. Admin can view your location history from last 72 hours.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Clients Content
  const renderClients = () => (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Assigned Clients</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Customers assigned to you for EMI collection</p>
        </div>
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMI Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignedCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.area}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{customer.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{customer.emiAmount}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        customer.status === 'Collected' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">Collect EMI</button>
                      <button className="text-green-600 hover:text-green-900">Navigate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // Location Content
  const renderLocation = () => (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Location History</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Your GPS location tracking for last 72 hours</p>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {locationHistory.map((location) => (
                <div key={location.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <span className="text-blue-600">📍</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{location.location}</h4>
                      <p className="text-sm text-gray-500">Time: {location.time}</p>
                      <p className="text-sm text-gray-500">Coordinates: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
                    </div>
                  </div>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                    View on Map
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <h4 className="text-lg font-medium text-gray-900 mb-2">Live Location Map</h4>
              <p className="text-gray-600 mb-4">Interactive map showing your current and historical locations</p>
              <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Map View Will Be Implemented Here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Profile Content
  const renderProfile = () => (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Your Profile</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal information and settings</p>
        </div>
        <div className="border-t border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Personal Information</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">Rahul Verma</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">9876543220</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assigned Area</label>
                    <p className="mt-1 text-sm text-gray-900">Sector 15-22</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Settings</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">GPS Tracking</span>
                    <button className="bg-blue-600 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                      <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Notifications</span>
                    <button className="bg-blue-600 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                      <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Collection Team Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, Team Member</span>
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

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'clients', label: 'Clients' },
              { id: 'location', label: 'Location' },
              { id: 'profile', label: 'Profile' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'clients' && renderClients()}
        {activeTab === 'location' && renderLocation()}
        {activeTab === 'profile' && renderProfile()}
      </main>
    </div>
  );
}