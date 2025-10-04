import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import Leads from './Leads';

interface EmployeeDashboardProps {
  userData?: any;
}

function EmployeeDashboard({ userData }: EmployeeDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedLeadForCall, setSelectedLeadForCall] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard selectedLeadForCall={selectedLeadForCall} onLeadCallLogged={() => setSelectedLeadForCall(null)} onMenuClick={() => setIsSidebarOpen(true)} />;
      case 'leads':
        return <Leads onLogCall={(lead) => {
          setSelectedLeadForCall(lead);
          setActiveTab('dashboard');
        }} onMenuClick={() => setIsSidebarOpen(true)} />;
      default:
        return <Dashboard selectedLeadForCall={selectedLeadForCall} onLeadCallLogged={() => setSelectedLeadForCall(null)} onMenuClick={() => setIsSidebarOpen(true)} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop sidebar - always visible */}
      <div className="hidden lg:block">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userData={userData}
        />
      </div>

      {/* Mobile sidebar - toggleable (only visible on mobile) */}
      <div className="lg:hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false);
          }}
          userData={userData}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}

export default EmployeeDashboard;