import React from 'react';
import { Home, Users, UserCheck, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userData?: any;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userData }) => {
  const { signOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'leads', label: 'Leads', icon: UserCheck },
  ];

  return (
    <div className="w-64 text-white h-screen flex flex-col sticky top-0"
      style={{ backgroundColor: 'rgb(11,41,105)' }}
    >
      {/* Logo and Company Name */}
      <div className="p-6 border-b border-slate-700 bg-white">
        <div className="flex items-center space-x-2 mb-4">
          <img
            src="/logo.png"
            alt="Pharvax Biosciences"
            className="h-12 w-auto"
          />
        </div>
        <div className="text-sm text-black">{userData?.name || 'Employee'}</div>
        <div className="text-xs text-black">{userData?.role || 'Sales Representative'}</div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-6 py-3 text-left transition-colors duration-200 ${activeTab === item.id
                ? 'bg-green-600 border-r-2 border-green-400'
                : 'hover:bg-green-900'
                }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={() => {
            console.log('Employee logout button clicked')
            // Use more aggressive logout to ensure session is cleared
            signOut().then(() => {
              // Force reload after a short delay to ensure clean state
              setTimeout(() => {
                if (window.location.pathname !== '/login') {
                  window.location.href = '/login'
                }
              }, 500)
            })
          }}
          className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-slate-700 rounded transition-colors duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;