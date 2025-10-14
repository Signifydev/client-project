export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const handleLogout = () => {
    // Redirect to login page
    window.location.href = '/auth';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Loan Management System
            </h1>
            <p className="text-sm text-gray-600">
              Super Admin Dashboard
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Logout Button */}
           
            
            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                SA
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Super Admin</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}