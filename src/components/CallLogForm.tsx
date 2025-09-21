import React, { useState } from 'react';
import { Calendar, Save } from 'lucide-react';

interface CallLogData {
  contactName: string;
  phone: string;
  mom: string;
  followUpDate: string;
  notes: string;
  callStatus: string;
}

interface CallLogFormProps {
  onSave: (data: CallLogData) => void;
  selectedLead?: {
    id: string;
    name: string;
    phone: string;
    company?: string;
  } | null;
}

const CallLogForm: React.FC<CallLogFormProps> = ({ onSave, selectedLead }) => {
  const [formData, setFormData] = useState<CallLogData>({
    contactName: selectedLead?.name || '',
    phone: selectedLead?.phone || '',
    mom: '',
    followUpDate: '',
    notes: '',
    callStatus: '',
  });

  // Update form data when selectedLead changes
  React.useEffect(() => {
    if (selectedLead) {
      setFormData(prev => ({
        ...prev,
        contactName: selectedLead.name,
        phone: selectedLead.phone,
      }));
    } else {
      setFormData({
        contactName: '',
        phone: '',
        mom: '',
        followUpDate: '',
        notes: '',
        callStatus: '',
      });
    }
  }, [selectedLead]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    // Reset form
    setFormData({
      contactName: '',
      phone: '',
      mom: '',
      followUpDate: '',
      notes: '',
      callStatus: '',
    });
  };

  const handleChange = (field: keyof CallLogData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm h-fit">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Log a Call</h2>
        {selectedLead && (
          <p className="text-sm text-blue-600 mt-1">
            Logging call for: {selectedLead.company || selectedLead.name}
          </p>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Name
          </label>
          <input
            type="text"
            value={formData.contactName}
            onChange={(e) => handleChange('contactName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter contact name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter phone number"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minutes of Meeting (MoM)
          </label>
          <textarea
            value={formData.mom}
            onChange={(e) => handleChange('mom', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Enter meeting details and key discussion points"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Follow-Up Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={formData.followUpDate}
              onChange={(e) => handleChange('followUpDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent pr-10"
              required
            />
            <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Follow up notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Follow up notes and observations"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Call Status
          </label>
          <select
            value={formData.callStatus}
            onChange={(e) => handleChange('callStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required
          >
            <option value="">Select call status</option>
            <option value="follow-up-scheduled">Follow Up Scheduled</option>
            <option value="no-answer">Didn't Pick Up</option>
            <option value="denied">Denied</option>
            <option value="converted">Converted</option>
            <option value="interested">Interested</option>
            <option value="not-interested">Not Interested</option>
            <option value="callback-requested">Callback Requested</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors duration-200 font-medium flex items-center justify-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save</span>
        </button>
      </form>

      {/* Recent Activity Section */}
      {selectedLead && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">Follow-up Call</h4>
                <span className="text-xs text-gray-500">2 days ago</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Follow-up Notes:</strong> Discussed pricing for bulk orders. Dr. Kumar showed interest in our new cardiac medication line. Requested product samples and detailed pricing sheet.
              </p>
              <p className="text-sm text-gray-600">
                <strong>Next Action:</strong> Send product samples by Friday
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">Initial Contact</h4>
                <span className="text-xs text-gray-500">1 week ago</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                <strong>Call Notes:</strong> First contact with {selectedLead.company}. Spoke with {selectedLead.name} about our pharmaceutical distribution services. Positive response to our product portfolio.
              </p>
              <p className="text-sm text-gray-600">
                <strong>Status:</strong> Interested in partnership discussion
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">Lead Created</h4>
                <span className="text-xs text-gray-500">2 weeks ago</span>
              </div>
              <p className="text-sm text-gray-700">
                Lead generated from healthcare conference. {selectedLead.name} expressed interest in expanding their supplier network.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallLogForm;