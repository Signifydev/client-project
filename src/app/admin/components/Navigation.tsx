'use client';

interface NavigationProps {
  activeTab: string;
  pendingRequestsCount: number;
  onTabChange: (tab: string) => void;
}

export default function Navigation({ activeTab, pendingRequestsCount, onTabChange }: NavigationProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'customers', label: 'Customers' },
    { id: 'requests', label: 'Requests' },
    { id: 'reports', label: 'Reports' },
    { id: 'team', label: 'Team' },
    { id: 'collection', label: 'Collection' }
  ];

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Menu */}
        <div className="sm:hidden">
          <div className="relative">
            <div className="overflow-x-auto scrollbar-hide">
              <nav className="flex space-x-4 px-4 py-3 min-w-max">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`py-2 px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center">
                      {tab.label}
                      {tab.id === 'requests' && pendingRequestsCount > 0 && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex space-x-8 px-4 sm:px-6 lg:px-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.id === 'requests' && pendingRequestsCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}