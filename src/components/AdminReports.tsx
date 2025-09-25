import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, UserCheck, Calendar, Download, Filter, ChevronDown } from 'lucide-react';
import { supabase, logSupabaseCall } from '../lib/supabase';

const AdminReports: React.FC = () => {
  const today = new Date().toISOString().slice(0, 10);

  const [dateRange, setDateRange] = useState({
    startDate: today,
    endDate: today
  });
  const [reportType, setReportType] = useState('All');
  const [loading, setLoading] = useState(false);

  // Report data states
  const [employeeCallsData, setEmployeeCallsData] = useState([]);
  const [employeeLeadsData, setEmployeeLeadsData] = useState([]);
  const [listSentData, setListSentData] = useState([]);

  useEffect(() => {
    fetchReportsData();
  }, [dateRange]);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchEmployeeCallsReport(),
        fetchEmployeeLeadsReport(),
        fetchListSentReport()
      ]);
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Report 1: Employee person wise total calls unique on date
  const fetchEmployeeCallsReport = async () => {
    try {
      const { data, error } = await logSupabaseCall('fetchEmployeeCallsReport', () =>
        supabase
          .from('chats')
          .select(`
            user_id,
            lead_id,
            created_at,
            user_profiles!user_id(name)
          `)
          .gte('created_at', `${dateRange.startDate}T00:00:00`)
          .lte('created_at', `${dateRange.endDate}T23:59:59`)
          .order('created_at', { ascending: false })
      );

      if (error) {
        console.error('Error fetching employee calls report:', error);
        return;
      }

      // Process data to get unique calls per employee per date
      const callsMap = new Map();

      data.forEach(chat => {
        const userId = chat.user_id;
        const leadId = chat.lead_id;
        const date = new Date(chat.created_at).toDateString();
        const userName = chat.user_profiles?.name || 'Unknown User';

        const key = `${userId}-${date}`;

        if (!callsMap.has(key)) {
          callsMap.set(key, {
            userId,
            userName,
            date,
            uniqueLeads: new Set(),
            totalCalls: 0
          });
        }

        const entry = callsMap.get(key);
        entry.uniqueLeads.add(leadId);
        entry.totalCalls++;
      });

      // Convert to array and aggregate by employee
      const employeeCallsMap = new Map();

      callsMap.forEach(entry => {
        if (!employeeCallsMap.has(entry.userId)) {
          employeeCallsMap.set(entry.userId, {
            userName: entry.userName,
            totalUniqueCalls: 0,
            totalCallsCount: 0,
            daysActive: 0
          });
        }

        const empEntry = employeeCallsMap.get(entry.userId);
        empEntry.totalUniqueCalls += entry.uniqueLeads.size;
        empEntry.totalCallsCount += entry.totalCalls;
        empEntry.daysActive++;
      });

      const result = Array.from(employeeCallsMap.values())
        .sort((a, b) => b.totalUniqueCalls - a.totalUniqueCalls);

      setEmployeeCallsData(result);
    } catch (error) {
      console.error('Error processing employee calls report:', error);
    }
  };

  // Report 2: Employee person wise leads handled - from activity log
  const fetchEmployeeLeadsReport = async () => {
    try {
      const { data, error } = await logSupabaseCall('fetchEmployeeLeadsReport', () =>
        supabase
          .from('activity_log')
          .select(`
            target_id,
            event_data,
            created_at,
            event_type
          `)
          .eq('target', 'LEADS')
          .eq('event_type', 'LEAD_ASSIGNED')
          .gte('created_at', `${dateRange.startDate}T00:00:00`)
          .lte('created_at', `${dateRange.endDate}T23:59:59`)
      );

      if (error) {
        console.error('Error fetching employee leads report:', error);
        return;
      }

      // Process activity log data to get leads assigned to employees
      const employeeLeadsMap = new Map();

      for (const log of data) {
        try {
          const eventData = typeof log.event_data === 'string'
            ? JSON.parse(log.event_data)
            : log.event_data;

          const assignedTo = eventData?.assigned_to;

          if (assignedTo) {
            // Fetch employee name
            const { data: profileData } = await supabase
              .from('user_profiles')
              .select('name')
              .eq('id', assignedTo)
              .single();

            const employeeName = profileData?.name || 'Unknown Employee';

            if (!employeeLeadsMap.has(assignedTo)) {
              employeeLeadsMap.set(assignedTo, {
                employeeName,
                leadsAssigned: new Set(),
                totalAssignments: 0
              });
            }

            const entry = employeeLeadsMap.get(assignedTo);
            entry.leadsAssigned.add(log.target_id);
            entry.totalAssignments++;
          }
        } catch (parseError) {
          console.error('Error parsing event data:', parseError);
        }
      }

      const result = Array.from(employeeLeadsMap.values())
        .map(entry => ({
          employeeName: entry.employeeName,
          uniqueLeadsHandled: entry.leadsAssigned.size,
          totalAssignments: entry.totalAssignments
        }))
        .sort((a, b) => b.uniqueLeadsHandled - a.uniqueLeadsHandled);

      setEmployeeLeadsData(result);
    } catch (error) {
      console.error('Error processing employee leads report:', error);
    }
  };

  // Report 3: Lead count for list sent - from chats with call_status 'list-sent'
  const fetchListSentReport = async () => {
    try {
      const { data, error } = await logSupabaseCall('fetchListSentReport', () =>
        supabase
          .from('chats')
          .select(`
            lead_id,
            call_status,
            created_at,
            leads!lead_id(name, company, email)
          `)
          .eq('call_status', 'list-sent')
          .gte('created_at', `${dateRange.startDate}T00:00:00`)
          .lte('created_at', `${dateRange.endDate}T23:59:59`)
      );

      if (error) {
        console.error('Error fetching list sent report:', error);
        return;
      }

      // Process data to get unique leads that received lists
      const listSentMap = new Map();

      data.forEach(chat => {
        const leadId = chat.lead_id;
        const leadData = chat.leads;

        if (!listSentMap.has(leadId)) {
          listSentMap.set(leadId, {
            leadName: leadData?.name || 'Unknown Lead',
            company: leadData?.company || 'Unknown Company',
            email: leadData?.email || 'No Email',
            listSentCount: 0,
            lastListSent: chat.created_at
          });
        }

        const entry = listSentMap.get(leadId);
        entry.listSentCount++;

        // Keep track of the most recent list sent date
        if (new Date(chat.created_at) > new Date(entry.lastListSent)) {
          entry.lastListSent = chat.created_at;
        }
      });

      const result = Array.from(listSentMap.values())
        .sort((a, b) => b.listSentCount - a.listSentCount);

      setListSentData(result);
    } catch (error) {
      console.error('Error processing list sent report:', error);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const exportReport = () => {
    // Implementation for exporting reports
    console.log('Exporting reports...');
  };

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportReport}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium flex items-center space-x-2"
            >
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
              <option value="Calls">Employee Calls</option>
              <option value="Leads">Employee Leads</option>
              <option value="Lists">List Sent</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">From:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">To:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
            <span className="text-gray-600">Loading reports...</span>
          </div>
        )}

        {/* Employee Calls Report */}
        {(reportType === 'All' || reportType === 'Calls') && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <UserCheck className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Employee Calls Report</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Unique Calls</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Total Calls</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Active Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employeeCallsData.map((employee, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{employee.userName}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {employee.totalUniqueCalls}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900">{employee.totalCallsCount}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {employee.daysActive}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {employeeCallsData.length === 0 && !loading && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        No call data found for the selected date range
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Employee Leads Report */}
        {(reportType === 'All' || reportType === 'Leads') && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <Users className="w-6 h-6 text-green-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Employee Leads Handled Report</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Unique Leads Handled</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Total Assignments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employeeLeadsData.map((employee, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{employee.employeeName}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {employee.uniqueLeadsHandled}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900">{employee.totalAssignments}</td>
                    </tr>
                  ))}
                  {employeeLeadsData.length === 0 && !loading && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-500">
                        No lead assignment data found for the selected date range
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* List Sent Report */}
        {(reportType === 'All' || reportType === 'Lists') && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center mb-6">
              <TrendingUp className="w-6 h-6 text-purple-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">List Sent Report</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Lead Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Company</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Lists Sent</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Last List Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {listSentData.map((lead, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{lead.leadName}</td>
                      <td className="py-3 px-4 text-gray-900">{lead.company}</td>
                      <td className="py-3 px-4 text-gray-600">{lead.email}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {lead.listSentCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900">
                        {new Date(lead.lastListSent).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {listSentData.length === 0 && !loading && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No list sent data found for the selected date range
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReports;