import React, { useState, useEffect } from 'react';
import { Upload, Plus, TrendingUp, Users, UserCheck, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase, getOpenLeadsCount, getActiveEmployeesCount, getAllActiveEmployees } from '../lib/supabase';
import { userCache } from '../lib/userCache';

interface AdminDashboardContentProps {
  setActiveTab: (tab: string) => void;
}

const AdminDashboardContent: React.FC<AdminDashboardContentProps> = ({ setActiveTab }) => {
  const [stats, setStats] = useState([
    { label: 'Open Leads', value: '0', icon: UserCheck, color: 'bg-green-500' },
    { label: 'Active Employees', value: '0', icon: Users, color: 'bg-green-500' },
  ]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Check if we can use cached data for current user context
      const cachedProfile = userCache.getProfile();
      if (cachedProfile && cachedProfile.role === 'admin') {
        console.log('Admin user confirmed from cache');
      }

      // Fetch open leads count
      const { count: openLeadsCount, error: leadsError } = await getOpenLeadsCount();

      if (leadsError) {
        console.error('Error fetching open leads count:', leadsError);
      }

      // Fetch active employees count
      const { count: activeEmployeesCount, error: employeesError } = await getActiveEmployeesCount();

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
            <div
              onClick={() => setShowImportModal(true)}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
            >
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

      {/* CSV Import Modal */}
      {showImportModal && (
        <CSVImportModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            setShowImportModal(false);
            fetchDashboardStats(); // Refresh stats after import
          }}
        />
      )}
    </div>
  );
};

// CSV Import Modal Component
const CSVImportModal = ({ onClose, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [employees, setEmployees] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Map Columns, 3: Results

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await getAllActiveEmployees();

      if (error) {
        console.error('Error fetching employees:', error);
        return;
      }

      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.toLowerCase().endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/"/g, '')));

      if (rows.length < 2) {
        alert('CSV file must have at least a header row and one data row');
        return;
      }

      const headers = rows[0];
      const data = rows.slice(1).filter(row => row.some(cell => cell.length > 0));

      setCsvData({ headers, data });

      // Auto-map common column names
      const mapping = {};
      headers.forEach((header, index) => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('name') || lowerHeader.includes('contact')) {
          mapping.name = index;
        } else if (lowerHeader.includes('email')) {
          mapping.email = index;
        } else if (lowerHeader.includes('phone') || lowerHeader.includes('mobile')) {
          mapping.phone = index;
        } else if (lowerHeader.includes('company') || lowerHeader.includes('organization')) {
          mapping.company = index;
        } else if (lowerHeader.includes('type') || lowerHeader.includes('establishment')) {
          mapping.establishment_type = index;
        }
      });

      setColumnMapping(mapping);
      setStep(2);
    };

    reader.readAsText(uploadedFile);
  };

  const handleImport = async () => {
    if (!columnMapping.name || !columnMapping.email || !columnMapping.phone) {
      alert('Please map at least Name, Email, and Phone columns');
      return;
    }

    setImporting(true);
    const results = { success: 0, failed: 0, errors: [] };

    try {
      for (let i = 0; i < csvData.data.length; i++) {
        const row = csvData.data[i];

        try {
          const leadData = {
            name: row[columnMapping.name] || '',
            email: row[columnMapping.email] || '',
            phone: row[columnMapping.phone] || '',
            company: row[columnMapping.company] || '',
            establishment_type: row[columnMapping.establishment_type] || '',
            status: 'Open'
          };

          // Validate required fields
          if (!leadData.name || !leadData.email || !leadData.phone) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: Missing required fields (name, email, or phone)`);
            continue;
          }

          const { error } = await supabase
            .from('leads')
            .insert([leadData]);

          if (error) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: ${error.message}`);
          } else {
            results.success++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Import error:', error);
    }

    setImportResults(results);
    setImporting(false);
    setStep(3);
  };

  const handleComplete = () => {
    onImportComplete();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Import Leads from CSV</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {/* Step Indicator */}
          <div className="flex items-center mb-6">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              2
            </div>
            <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              3
            </div>
          </div>

          {/* Step 1: File Upload */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Upload CSV File</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Choose a CSV file to upload</p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200"
                  >
                    Select CSV File
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• First row should contain column headers</li>
                  <li>• Required columns: Name, Email, Phone</li>
                  <li>• Optional columns: Company, Establishment Type</li>
                  <li>• Example: Name, Email, Phone, Company, Type</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 2 && csvData.headers && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 2: Map Columns</h3>
                <p className="text-gray-600 mb-4">Map your CSV columns to lead fields:</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'name', label: 'Name *', required: true },
                  { key: 'email', label: 'Email *', required: true },
                  { key: 'phone', label: 'Phone *', required: true },
                  { key: 'company', label: 'Company', required: false },
                  { key: 'establishment_type', label: 'Establishment Type', required: false }
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                    </label>
                    <select
                      value={columnMapping[field.key] || ''}
                      onChange={(e) => setColumnMapping(prev => ({
                        ...prev,
                        [field.key]: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${field.required && !columnMapping[field.key] ? 'border-red-300' : 'border-gray-300'
                        }`}
                    >
                      <option value="">Select column...</option>
                      {csvData.headers.map((header, index) => (
                        <option key={index} value={index}>{header}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              {csvData.data.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Preview (first 3 rows):</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-900">Name</th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-900">Email</th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-900">Phone</th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-900">Company</th>
                          <th className="px-3 py-2 text-left text-sm font-medium text-gray-900">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {csvData.data.slice(0, 3).map((row, index) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm text-gray-900">{row[columnMapping.name] || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row[columnMapping.email] || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row[columnMapping.phone] || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row[columnMapping.company] || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row[columnMapping.establishment_type] || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md transition-colors duration-200 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || !columnMapping.name || !columnMapping.email || !columnMapping.phone}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md transition-colors duration-200 font-medium flex items-center justify-center"
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    'Import Leads'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {step === 3 && importResults && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 3: Import Results</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium text-green-900">Successfully Imported</p>
                      <p className="text-2xl font-bold text-green-900">{importResults.success}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
                    <div>
                      <p className="font-medium text-red-900">Failed to Import</p>
                      <p className="text-2xl font-bold text-red-900">{importResults.failed}</p>
                    </div>
                  </div>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Errors:</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <ul className="text-sm text-red-800 space-y-1">
                      {importResults.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleComplete}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors duration-200 font-medium"
                >
                  Complete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default AdminDashboardContent;