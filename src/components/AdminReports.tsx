import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, UserCheck, Calendar, Download, Filter, ChevronDown } from 'lucide-react';

const AdminReports: React.FC = () => {
  const [dateRange, setDateRange] = useState('01/01/2024 - 03/31/2024');
  const [reportType, setReportType] = useState('All');

  // Sample data for reports
  const businessMetrics = {
    totalLeads: 1247,
    convertedLeads: 231,
    conversionRate: 18.5,
    totalRevenue: '₹45,67,890',
    avgDealSize: '₹1,97,650',
    monthlyGrowth: 12.3
  };

  const leadConversionData = [
    { month: 'January', leads: 420, converted: 78, rate: 18.6 },
    { month: 'February', leads: 385, converted: 71, rate: 18.4 },
    { month: 'March', leads: 442, converted: 82, rate: 18.6 }
  ];

  const employeePerformance = [
    { name: 'Kavita Joshi', role: 'Sales Manager', calls: 50, deals: 10, revenue: '₹4,95,000', conversion: 20.0 },
    { name: 'Abhishek Dange', role: 'Sales Representative', calls: 45, deals: 12, revenue: '₹4,73,800', conversion: 26.7 },
    { name: 'Meera Nair', role: 'Sales Representative', calls: 40, deals: 11, revenue: '₹4,34,150', conversion: 27.5 },
    { name: 'Rohit Patel', role: 'Sales Representative', calls: 35, deals: 8, revenue: '₹3,15,200', conversion: 22.9 },
    { name: 'Pooja Sharma', role: 'Sales Manager', calls: 42, deals: 15, revenue: '₹5,92,750', conversion: 35.7 },
    { name: 'Arjun Mehta', role: 'Sales Representative', calls: 29, deals: 5, revenue: '₹1,98,250', conversion: 17.2 },
    { name: 'Vikram Singh', role: 'Sales Representative', calls: 38, deals: 9, revenue: '₹3,55,350', conversion: 23.7 }
  ];

  const topPerformers = employeePerformance
    .sort((a, b) => b.conversion - a.conversion)
    .slice(0, 3);

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <div className="flex items-center space-x-3">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="All">All Reports</option>
              <option value="Business">Business Metrics</option>
              <option value="Leads">Lead Conversion</option>
              <option value="Employees">Employee Performance</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          <div className="relative">
            <input
              type="text"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Select date range"
            />
            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Business Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-6">
            <BarChart3 className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Business Overview</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 mb-1">Total Leads</p>
                  <p className="text-2xl font-bold text-blue-900">{businessMetrics.totalLeads.toLocaleString()}</p>
                </div>
                <UserCheck className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 mb-1">Converted Leads</p>
                  <p className="text-2xl font-bold text-green-900">{businessMetrics.convertedLeads}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 mb-1">Conversion Rate</p>
                  <p className="text-2xl font-bold text-purple-900">{businessMetrics.conversionRate}%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-yellow-900">{businessMetrics.totalRevenue}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600 mb-1">Avg Deal Size</p>
                  <p className="text-2xl font-bold text-indigo-900">{businessMetrics.avgDealSize}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-indigo-600" />
              </div>
            </div>
            
            <div className="bg-pink-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pink-600 mb-1">Monthly Growth</p>
                  <p className="text-2xl font-bold text-pink-900">+{businessMetrics.monthlyGrowth}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-pink-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Lead Conversion Report */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-6">
            <TrendingUp className="w-6 h-6 text-green-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Lead Conversion Report</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Month</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Total Leads</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Converted</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leadConversionData.map((data, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{data.month}</td>
                    <td className="py-3 px-4 text-gray-900">{data.leads}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {data.converted}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {data.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Employee Performance Report */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-6">
            <Users className="w-6 h-6 text-purple-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Employee Performance Report</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Employee</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Calls Made</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Deals Closed</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Revenue</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employeePerformance.map((employee, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{employee.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {employee.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{employee.calls}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {employee.deals}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{employee.revenue}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        employee.conversion >= 25 ? 'bg-green-100 text-green-800' :
                        employee.conversion >= 20 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {employee.conversion}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center mb-6">
            <TrendingUp className="w-6 h-6 text-yellow-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Top Performers</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topPerformers.map((performer, index) => (
              <div key={index} className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{performer.name}</h3>
                  <span className="text-2xl">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{performer.role}</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Conversion Rate:</span>
                    <span className="font-medium text-green-600">{performer.conversion}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-medium text-gray-900">{performer.revenue}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Deals Closed:</span>
                    <span className="font-medium text-blue-600">{performer.deals}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;