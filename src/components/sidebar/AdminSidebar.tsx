'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onSectionChange: (section: string) => void;
}

export default function AdminSidebar({ isCollapsed, onToggle, onSectionChange }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const menuItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: '📊',
      section: 'dashboard'
    },
    {
      name: 'Customers',
      href: '/admin',
      icon: '👥',
      section: 'customers'
    },
    {
      name: 'Team Management',
      href: '/admin',
      icon: '👨‍💼',
      section: 'team'
    },
    {
      name: 'Loan Management',
      href: '/admin',
      icon: '💰',
      section: 'loans'
    },
    {
      name: 'EMI Collection',
      href: '/admin',
      icon: '📋',
      section: 'emi'
    },
    {
      name: 'Reports',
      href: '/admin',
      icon: '📈',
      section: 'reports'
    },
    {
      name: 'Settings',
      href: '/admin',
      icon: '⚙️',
      section: 'settings'
    },
  ];

  const isExpanded = isHovered || !isCollapsed;

  const handleMenuClick = (section: string) => {
    onSectionChange(section);
  };

  return (
    <div
      className={`bg-gray-800 text-white transition-all duration-300 relative h-full ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Toggle Button */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        {isExpanded && (
          <h2 className="text-xl font-bold text-white">Admin Panel</h2>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-700 transition-colors flex-shrink-0"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            return (
              <li key={item.name}>
                <button
                  onClick={() => handleMenuClick(item.section)}
                  className={`flex items-center w-full p-3 rounded-lg transition-all duration-200 ${
                    pathname === item.href
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  } ${isExpanded ? 'justify-start' : 'justify-center'}`}
                  title={isCollapsed ? item.name : ''}
                >
                  <span className="text-xl flex-shrink-0">{item.icon}</span>
                  {isExpanded && (
                    <span className="ml-3 font-medium text-left">{item.name}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Quick Stats (Visible when expanded) */}
      {isExpanded && (
        <div className="absolute bottom-4 left-4 right-4 p-4 bg-gray-700 rounded-lg">
          <div className="text-sm text-gray-300 mb-2">Quick Stats</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Active Loans:</span>
              <span className="text-green-400">1,250</span>
            </div>
            <div className="flex justify-between">
              <span>Pending EMI:</span>
              <span className="text-yellow-400">345</span>
            </div>
            <div className="flex justify-between">
              <span>Team Members:</span>
              <span className="text-blue-400">15</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}