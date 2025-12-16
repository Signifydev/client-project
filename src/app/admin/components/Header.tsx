'use client';

interface HeaderProps {
  onLogout: () => void;
}

export default function Header({ onLogout }: HeaderProps) {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard - KALA BROTHERS</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Welcome, Admin</span>
            <button
              onClick={onLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}