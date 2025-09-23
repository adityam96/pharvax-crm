import React, { useState } from 'react';
import { useEffect } from 'react';
import { Calendar, Save } from 'lucide-react';
import { getChatAndFollowUps, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CallLogData {
  contactName: string;
  phone: string;
  email?: string;
  company?: string;
  establishmentType?: string;
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
    email?: string;
    establishmentType?: string;
  } | null;
}

const CallLogForm: React.FC<CallLogFormProps> = ({ onSave, selectedLead }) => {
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const { user } = useAuth();
  const [formData, setFormData] = useState<CallLogData>({
    contactName: selectedLead?.name || '',
    phone: selectedLead?.phone || '',
    email: selectedLead?.email || '',
    company: selectedLead?.company || '',
    establishmentType: selectedLead?.establishmentType || '',
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
        email: selectedLead.email || '',
        company: selectedLead.company || '',
        establishmentType: selectedLead.establishmentType || '',
      }));
      fetchRecentActivity(selectedLead.id);
    } else {
      setFormData({
        contactName: '',
        phone: '',
        email: '',
        company: '',
        establishmentType: '',
        mom: '',
        followUpDate: '',
        notes: '',
        callStatus: '',
      });
      setRecentActivity([]);
    }
  }, [selectedLead]);

  const fetchRecentActivity = async (leadId: string) => {
    try {
      setActivityLoading(true);

      // Fetch chats and followups for the selected lead
      const [chatsResponse, followupsResponse] = await getChatAndFollowUps(leadId);

      console.log('Fetched chats:', chatsResponse);
      console.log('Fetched followups:', followupsResponse);

      const { data: chats, error: chatsError } = chatsResponse;
      const { data: followups, error: followupsError } = followupsResponse;

      if (chatsError) {
        console.error('Error fetching chats:', chatsError);
      }
      if (followupsError) {
        console.error('Error fetching followups:', followupsError);
      }

      // Combine and sort activities
      const activities = [];

      // Add chats as activities
      if (chats) {
        chats.forEach(chat => {
          activities.push({
            id: `chat-${chat.id}`,
            type: 'call',
            title: 'Status: ' + getCallTitle(chat.call_status),
            date: new Date(chat.created_at),
            notes: chat.mom,
            additionalInfo: chat.notes,
            status: chat.call_status
          });
        });
      }

      // Add followups as activities
      if (followups) {
        followups.forEach(followup => {
          activities.push({
            id: `followup-${followup.id}`,
            type: 'followup',
            title: 'Follow-up Scheduled',
            date: new Date(followup.created_at),
            notes: followup.notes,
            followupDate: followup.follow_up_date,
            status: followup.status
          });
        });
      }

      // Sort by date (newest first)
      activities.sort((a, b) => b.date.getTime() - a.date.getTime());

      setRecentActivity(activities.slice(0, 3)); // Show only last 3 activities
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const getCallTitle = (callStatus: string) => {
    switch (callStatus) {
      case 'list-sent':
        return 'List Sent';
      case 'follow-up-scheduled':
        return 'Follow-up Call';
      case 'no-answer':
        return 'No Answer';
      case 'denied':
        return 'Call Denied';
      case 'converted':
        return 'Successful Conversion';
      case 'interested':
        return 'Interested Contact';
      case 'not-interested':
        return 'Not Interested';
      case 'callback-requested':
        return 'Callback Requested';
      default:
        return 'Call Made';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    // Reset form
    setFormData({
      contactName: '',
      phone: '',
      email: '',
      company: '',
      establishmentType: '',
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
        {!selectedLead && (
          <p className="text-sm text-green-600 mt-1">
            Creating new lead and logging call
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

        {!selectedLead && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Establishment Type
              </label>
              <select
                value={formData.establishmentType}
                onChange={(e) => handleChange('establishmentType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select establishment type</option>
                <option value="Clinic">Clinic</option>
                <option value="Hospital">Hospital</option>
                <option value="Distributor">Distributor</option>
                <option value="Pharmacy">Pharmacy</option>
              </select>
            </div>
          </>
        )}

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
            <option value="list-sent">List Sent</option>
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
          {activityLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-gray-600">Loading activity...</span>
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{activity.title}</h4>
                    <span className="text-xs text-gray-500">{formatDate(activity.date)}</span>
                  </div>
                  {activity.type === 'call' && (
                    <>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Call Notes:</strong> {activity.notes}
                      </p>
                      {activity.additionalInfo && (
                        <p className="text-sm text-gray-600">
                          <strong>Additional Notes:</strong> {activity.additionalInfo}
                        </p>
                      )}
                    </>
                  )}
                  {activity.type === 'followup' && (
                    <>
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Follow-up Date:</strong> {new Date(activity.followupDate).toLocaleDateString()}
                      </p>
                      {activity.notes && (
                        <p className="text-sm text-gray-600">
                          <strong>Notes:</strong> {activity.notes}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600">No recent activity found for this lead.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default CallLogForm;