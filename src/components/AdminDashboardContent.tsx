import React, { useState, useEffect } from 'react';
import { Upload, Plus, TrendingUp, Users, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminDashboardContentProps {
  setActiveTab: (tab: string) => void;
}

const AdminDashboardContent: React.FC<AdminDashboardContentProps> = ({ setActiveTab }) => {
  const [stats, setStats] = useState([
    { label: 'Open Leads', value: '0', icon: UserCheck, color: 'bg-green-500' },
    { label: 'Active Employees', value: '0', icon: Users, color: 'bg-green-500' },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch open leads count
      const { count: openLeadsCount, error: leadsError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Open');

      if (leadsError) {
        console.error('Error fetching open leads count:', leadsError);
      }

      // Fetch active employees count
      const { count: activeEmployeesCount, error: employeesError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      if (employeesError) {
        console.error('Error fetching active employees count:', employeesError);
      }

      // Update stats with real data
      setStats([
        { 
          label: 'Open Leads', 
          value: openLeadsCount?.toString() || '0', 
          icon: UserCheck, 
          color: 'bg-green-500' 
        },
        { 
          label: 'Active Employees', 
          value: activeEmployeesCount?.toString() || '0', 
          icon: Users, 
          color: 'bg-green-500' 
        },
      ]);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="text-sm text-gray-600">
            Welcome back, Admin
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg text-gray-600 mb-2">{stat.label}</p>
                    <p className="text-5xl font-bold text-gray-900">
                      {loading ? (
                        <div className="w-12 h-12 border-4 border-gray-300 border-t-green-500 rounded-full animate-spin"></div>
                      ) : (
                        stat.value
                      )}
                    </p>
                  </div>
                  <div className={`p-4 rounded-xl ${stat.color}`}>
                    <Icon className="w-12 h-12 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Lead Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Lead</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
              <div className="flex items-center justify-center mb-4">
                <div className="p-4 bg-blue-100 rounded-lg">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Import CSV</h3>
              <p className="text-gray-600 text-center text-sm">
                Upload a CSV file to import multiple leads at once
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
              <div className="flex items-center justify-center mb-4">
                <div className="p-4 bg-green-100 rounded-lg">
                  <Plus className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Generate Leads</h3>
              <p className="text-gray-600 text-center text-sm">
                Create new leads manually or through automated tools
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setActiveTab('leads')}
              className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200"
            >
              <UserCheck className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">View All Leads</span>
            </button>
            <button 
              onClick={() => setActiveTab('employees')}
              className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200"
            >
              <Users className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-900">Manage Employees</span>
            </button>
            <button 
              onClick={() => setActiveTab('reports')}
              className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200"
            >
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-900">View Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardContent;