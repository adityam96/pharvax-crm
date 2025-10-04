import React, { useEffect, useState } from 'react';
import { Settings, Bell, Shield, Database, Mail, Building, Phone, MapPin, X, User } from 'lucide-react';
import { getCallStatusConfig, getLeadLabelsConfig } from '../lib/configDataService';
import { updateCallStatusesConfig, updateLeadLabelsConfig } from '../lib/supabase';

const AdminSettings: React.FC = () => {
  const [editCallStatusesModalShow, setEditCallStatusesModalShow] = useState(false);
  const [callStatusConfig, setCallStatusConfig] = useState({});
  const [editLeadLabelsModalShow, setEditLeadLabelsModalShow] = useState(false);
  const [leadLabelsConfig, setLeadLabelsConfig] = useState({});

  useEffect(() => {
    fetchCallStatusConfig();
  }, [editCallStatusesModalShow]);

  useEffect(() => {
    fetchLeadLabelsConfig();
  }, [editLeadLabelsModalShow]);

  const fetchCallStatusConfig = async () => {
    // Fetch call status configuration logic here
    const response = await getCallStatusConfig();
    console.log('Fetched Call Status Config:', JSON.stringify(response));
    setCallStatusConfig(response);
  };

  const fetchLeadLabelsConfig = async () => {
    const response = await getLeadLabelsConfig();
    console.log('Fetched Lead Labels Config:', JSON.stringify(response));
    setLeadLabelsConfig(response);
  };


  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Save Button */}
          <div className="lg:col-span-2">
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors duration-200 font-medium">
              Save All Changes
            </button>
          </div>
          {/* Configure */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <Settings className="w-5 h-5 text-black-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>
            </div>
            <div className="space-y-4 p-6">
              <button
                onClick={() => setEditCallStatusesModalShow(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors duration-200 font-medium">
                Call Statuses
              </button>
            </div>
            <div className="space-y-4 p-6">
              <button
                onClick={() => setEditLeadLabelsModalShow(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors duration-200 font-medium">
                Lead Labels
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Call Status Modal */}
      {editCallStatusesModalShow && callStatusConfig && (
        <EditCallStatusModal
          callStatusConfig={callStatusConfig}
          onClose={() => {
            setEditCallStatusesModalShow(false);
          }}
        />
      )}

      {/* Edit Lead Labels Modal */}
      {editLeadLabelsModalShow && leadLabelsConfig && (
        <EditLeadLabelsModal
          leadLabelsConfig={leadLabelsConfig}
          onClose={() => {
            setEditLeadLabelsModalShow(false);
          }}
        />
      )}

    </div>
  );
};


const EditCallStatusModal = ({ callStatusConfig, onClose }) => {
  const leadStatusOptions = ['Open', 'In Progress', 'Closed', 'Failed'];
  const booleanOptions = ["true", "false"];
  const [newKey, setNewKey] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newLeadStatus, setNewLeadStatus] = useState('Open');
  const [formData, setFormData] = useState<Record<string, { display_title: string; lead_status: string; enabled: string }>>({
    ...(callStatusConfig as Record<string, { display_title: string; lead_status: string; enabled: string }>)
  });

  const updateRowField = (key: string, field: 'display_title' | 'lead_status' | 'enabled', value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const addRow = () => {
    const key = newKey.trim();
    if (!key) {
      alert('Please provide a unique status key (e.g., "no-answer").');
      return;
    }
    if (formData[key]) {
      alert('That status key already exists. Choose a different key.');
      return;
    }
    if (!newTitle.trim()) {
      alert('Please provide a display title.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      [key]: { display_title: newTitle.trim(), lead_status: newLeadStatus, enabled: "true" }
    }));
    setNewKey('');
    setNewTitle('');
    setNewLeadStatus('Open');
    // Implement lock if needed
    updateCallStatusesConfig(JSON.stringify({ ...formData, [key]: { display_title: newTitle.trim(), lead_status: newLeadStatus } }));
    alert('Successfully added new status.');
  };

  const saveConfig = () => {
    // Implement lock if needed
    updateCallStatusesConfig(JSON.stringify({ ...formData }));
    alert('Successfully updated config.');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Statuses</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex">
          <div className="w-full p-6 border-r border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Call Statuses</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Table of existing statuses */}
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Status Key</th>
                    <th className="text-left px-3 py-2 font-medium">Display Title</th>
                    <th className="text-left px-3 py-2 font-medium">Lead Status</th>
                    <th className="text-left px-3 py-2 font-medium">Enabled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(formData).map(([key, value]) => (
                    <tr key={key} className="bg-white">
                      <td className="px-3 py-2 align-top">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{key}</code>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={value.display_title}
                          onChange={(e) => updateRowField(key, 'display_title', e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={value.lead_status}
                          onChange={(e) => updateRowField(key, 'lead_status', e.target.value)}
                          className="rounded-md border border-gray-300 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {leadStatusOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={value.enabled}
                          onChange={(e) => updateRowField(key, 'enabled', e.target.value)}
                          className="rounded-md border border-gray-300 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {booleanOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Add New Status Section */}
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">Add New Status</h4>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="status key (e.g., no-answer)"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Display Title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={newLeadStatus}
                  onChange={(e) => setNewLeadStatus(e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {leadStatusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Add Row
                </button>

                <button
                  type="button"
                  onClick={saveConfig} // or your save handler
                  className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditLeadLabelsModal = ({ leadLabelsConfig, onClose }) => {
  const booleanOptions = ["true", "false"];
  const [newKey, setNewKey] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState('#6366F1'); // default indigo-500
  const [formData, setFormData] = useState<Record<string, { display_title: string; color: string; enabled: string }>>({
    ...(leadLabelsConfig as Record<string, { display_title: string; color: string; enabled: string }>)
  });
  const colorOptions = [
    { label: 'Indigo', value: '#6366F1' },
    { label: 'Blue', value: '#3B82F6' },
    { label: 'Sky', value: '#38BDF8' },
    { label: 'Cyan', value: '#06B6D4' },
    { label: 'Teal', value: '#14B8A6' },
    { label: 'Green', value: '#22C55E' },
    { label: 'Lime', value: '#84CC16' },
    { label: 'Amber', value: '#F59E0B' },
    { label: 'Orange', value: '#F97316' },
    { label: 'Red', value: '#EF4444' }
  ];

  const updateRowField = (key: string, field: 'display_title' | 'color' | 'enabled', value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const addRow = () => {
    const key = newKey.trim();
    if (!key) {
      alert('Please provide a unique label key (e.g., "high-priority").');
      return;
    }
    if (formData[key]) {
      alert('That label key already exists. Choose a different key.');
      return;
    }
    if (!newTitle.trim()) {
      alert('Please provide a display title.');
      return;
    }
    const next = { ...formData, [key]: { display_title: newTitle.trim(), color: newColor.trim(), enabled: "true" } };
    setFormData(next);
    setNewKey('');
    setNewTitle('');
    setNewColor('#6366F1');
    updateLeadLabelsConfig(JSON.stringify(next));
    alert('Successfully added new label.');
  };

  const saveConfig = () => {
    updateLeadLabelsConfig(JSON.stringify({ ...formData }));
    alert('Successfully updated labels config.');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Lead Labels</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="flex">
          <div className="w-full p-6 border-r border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Labels</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {/* Table of existing labels */}
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Label Key</th>
                    <th className="text-left px-3 py-2 font-medium">Display Title</th>
                    <th className="text-left px-3 py-2 font-medium">Color</th>
                    <th className="text-left px-3 py-2 font-medium">Enabled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(formData).map(([key, value]) => (
                    <tr key={key} className="bg-white">
                      <td className="px-3 py-2 align-top">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{key}</code>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={value.display_title}
                          onChange={(e) => updateRowField(key, 'display_title', e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={value.color}
                            onChange={(e) => updateRowField(key, 'color', e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            {colorOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <span
                            className="inline-block w-4 h-4 rounded-full border border-gray-300"
                            style={{ backgroundColor: value.color }}
                            aria-label={`Color swatch for ${value.color}`}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={value.enabled}
                          onChange={(e) => updateRowField(key, 'enabled', e.target.value)}
                          className="rounded-md border border-gray-300 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {booleanOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add New Label Section */}
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">Add New Label</h4>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="label key (e.g., high-priority)"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Display Title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {colorOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span
                    className="inline-block w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: newColor }}
                    aria-label={`Selected color swatch`}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center px-3 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700"
                >
                  Add Row
                </button>

                <button
                  type="button"
                  onClick={saveConfig}
                  className="inline-flex items-center px-3 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default AdminSettings;