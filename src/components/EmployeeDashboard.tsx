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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard selectedLeadForCall={selectedLeadForCall} onLeadCallLogged={() => setSelectedLeadForCall(null)} />;
      case 'leads':
        return <Leads onLogCall={(lead) => {
          setSelectedLeadForCall(lead);
          setActiveTab('dashboard');
        }} />;
      default:
        return <Dashboard selectedLeadForCall={selectedLeadForCall} onLeadCallLogged={() => setSelectedLeadForCall(null)} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userData={userData}
      />
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}

export default EmployeeDashboard;