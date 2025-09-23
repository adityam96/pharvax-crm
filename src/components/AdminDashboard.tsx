import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminDashboardContent from './AdminDashboardContent';
import AdminLeads from './AdminLeads';
import AdminEmployees from './AdminEmployees';
import AdminSettings from './AdminSettings';
import AdminReports from './AdminReports';

interface AdminDashboardProps {
  userData?: any;
}

function AdminDashboard({ userData }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboardContent setActiveTab={setActiveTab} />;
      case 'leads':
        return <AdminLeads />;
      case 'employees':
        return <AdminEmployees />;
      case 'reports':
        return <AdminReports />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <AdminDashboardContent />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userData={userData}
      />
      <div className="flex-1">
        {renderContent()}
      </div>
    </div>
  );
}

export default AdminDashboard;