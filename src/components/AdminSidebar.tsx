import React from 'react';
import { BarChart3, Users, UserCheck, Settings, LogOut, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userData?: any;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeTab, setActiveTab, userData }) => {
  const { signOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'leads', label: 'Leads', icon: UserCheck },
    { id: 'employees', label: 'Employee Management', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-slate-800 text-white min-h-screen flex flex-col sticky top-0">
      {/* Logo and Company Name */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center space-x-2 mb-4">
          <img 
            src="/logo.png" 
            alt="Pharvax Biosciences" 
            className="h-12 w-auto"
          />
        </div>
        <div className="text-sm text-gray-300">{userData?.name || 'Admin'}</div>
        <div className="text-xs text-gray-400">{userData?.role || 'Administrator'}</div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-6 py-3 text-left transition-colors duration-200 ${
                activeTab === item.id
                  ? 'bg-green-600 border-r-2 border-green-400'
                  : 'hover:bg-slate-700'
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
            console.log('Admin logout button clicked')
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

export default AdminSidebar;