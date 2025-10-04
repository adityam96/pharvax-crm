import React, { useState } from 'react';
import { useEffect } from 'react';
import { Calendar, MessageCircle, PhoneIcon, Save } from 'lucide-react';
import { getChatAndFollowUps, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getCallStatusConfig } from '../lib/configDataService';
import { getCallTitle } from '../lib/utils';

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
  const [callStatuses, setCallStatuses] = useState([]);
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

  useEffect(() => {
    const fetchCallStatuses = async () => {
      const config = await getCallStatusConfig();
      if (config) {
        const statuses = Object.keys(config)
          .filter(key => config[key].enabled === true)
          .map(key => ({
            key,
            display_title: config[key].display_title,
            lead_status: config[key].lead_status
          }));
        setCallStatuses(statuses);
        console.log('Loaded Call Statuses:', JSON.stringify(statuses));
      }
    };
    fetchCallStatuses();
  }, []);

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
        const chatActivities = await Promise.all(
          chats.map(async (chat: any) => ({
            id: `chat-${chat.id}`,
            type: 'call',
            title: 'Status: ' + (await getCallTitle(chat.call_status)),
            date: new Date(chat.created_at),
            notes: chat.mom,
            additionalInfo: chat.notes,
            status: chat.call_status,
            created_by: chat.created_by_profile?.name
          }))
        );
        activities.push(...chatActivities);
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
            status: followup.status,
            created_by: followup.created_by_profile?.name
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

  // Helpers to normalize phone numbers (default to India if no country code)
  const onlyDigits = (s: string) => (s || '').replace(/[^\d]/g, '');

  const toE164WithIndiaDefault = (raw: string) => {
    const digits = onlyDigits(raw);
    if (!digits) return '';
    // If already starts with 91 (India), assume full international without plus
    if (digits.startsWith('91') && digits.length > 10) return '+' + digits;
    // If user entered a leading 0, strip and add +91
    if (digits.startsWith('0')) {
      const stripped = digits.replace(/^0+/, '');
      return stripped ? '+91' + stripped : '';
    }
    // If 10 digits, assume Indian national number
    if (digits.length === 10) return '+91' + digits;
    // Otherwise, assume user provided full international without plus
    return '+' + digits;
  };

  const buildTelHref = (raw: string) => {
    const e164 = toE164WithIndiaDefault(raw);
    return e164 ? `tel:${e164}` : 'tel:';
  };

  // WhatsApp requires international format without the plus sign
  const buildWhatsAppUrl = (raw: string) => {
    const e164 = toE164WithIndiaDefault(raw);
    const intlNoPlus = e164.replace(/^\+/, '');
    return intlNoPlus ? `https://wa.me/${intlNoPlus}` : 'https://wa.me/'; // opens WhatsApp home if empty
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

        <div className="flex items-center justify-between mb-2 md:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (window.location.href = buildTelHref(formData.phone))}
              disabled={!formData.phone}
              className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Call this number"
            >
              <PhoneIcon className="w-4 h-4" />
              Call
            </button>
            <button
              type="button"
              onClick={() => window.open(buildWhatsAppUrl(formData.phone), '_blank')}
              disabled={!formData.phone}
              className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Open WhatsApp with this number"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>
          </div>
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
            Call Notes
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
            {callStatuses?.map((s: { key: string; display_title: string }) => (
              <option key={s.key} value={s.key}>
                {s.display_title}
              </option>
            ))}
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
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs text-gray-500"><b>Created By: </b>{activity.created_by}</span>
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