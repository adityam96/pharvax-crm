import React from 'react';
import { useEffect } from 'react';
import { UserCheck, Search, Filter, X, Mail, Phone, Building, User, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { userCache } from '../lib/userCache';

interface LeadsProps {
  onLogCall: (lead: any) => void;
}

const Leads: React.FC<LeadsProps> = ({ onLogCall }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All');
  const [selectedLead, setSelectedLead] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [allLeads, setAllLeads] = React.useState([]);
  const [recentActivity, setRecentActivity] = React.useState([]);
  const [activityLoading, setActivityLoading] = React.useState(false);
  const { userProfile, user } = useAuth();

  // Fetch leads from database
  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

  // Fetch recent activity when a lead is selected
  useEffect(() => {
    if (selectedLead) {
      fetchRecentActivity(selectedLead.id);
    }
  }, [selectedLead]);
  const fetchLeads = async () => {
    try {
      setLoading(true);
      
      // Try to get profile from cache first
      let currentUserProfile = userCache.getProfile();
      
      if (!currentUserProfile) {
        // Fetch from database if not in cache
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          return;
        }
        
        currentUserProfile = profileData;
        userCache.setProfile(profileData);
      }

      // Fetch leads assigned to current user
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          assigned_to_profile:user_profiles!assigned_to(name)
        `)
        .eq('assigned_to', currentUserProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
        return;
      }

      // Transform data to match expected format
      const transformedData = data.map(lead => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        company: lead.company,
        establishmentType: lead.establishment_type,
        assignedTo: lead.assigned_to_profile?.name || 'Unassigned',
        callsMade: lead.calls_made,
        lastContact: lead.last_contact
      }));

      setAllLeads(transformedData);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async (leadId: string) => {
    try {
      setActivityLoading(true);
      
      // Fetch chats and followups for the selected lead
      const [chatsResponse, followupsResponse] = await Promise.all([
        supabase
          .from('chats')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('followups')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

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
            title: getCallTitle(chat.call_status),
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
      
      setRecentActivity(activities.slice(0, 5)); // Show only last 5 activities
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const getCallTitle = (callStatus: string) => {
    switch (callStatus) {
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
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLeads = allLeads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    All: allLeads.length,
    Open: allLeads.filter(lead => lead.status === 'Open').length,
    'In Progress': allLeads.filter(lead => lead.status === 'In Progress').length,
    Closed: allLeads.filter(lead => lead.status === 'Closed').length
  };

  const handleCardClick = (lead) => {
    setSelectedLead(lead);
  };

  const closeModal = () => {
    setSelectedLead(null);
    setRecentActivity([]);
  };

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-64"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center space-x-1">
          <Filter className="w-4 h-4 text-gray-500 mr-2" />
          <span className="text-sm font-medium text-gray-700 mr-3">Filter by status:</span>
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                statusFilter === status
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Your Assigned Leads
          </h2>
          <p className="text-sm text-gray-600">
            Showing {filteredLeads.length} of {allLeads.length} leads
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onClick={() => handleCardClick(lead)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{lead.company}</h3>
                  <p className="text-sm text-blue-600 font-medium mb-1">{lead.establishmentType}</p>
                  <p className="text-sm text-gray-700 mb-1">POC: {lead.name}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    lead.status
                  )}`}
                >
                  {lead.status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-gray-600">
                  <span className="text-sm">📧</span>
                  <span className="text-sm">{lead.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <span className="text-sm">📞</span>
                  <span className="text-sm">{lead.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredLeads.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Lead Details</h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Lead Name and Status */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{selectedLead.company}</h3>
                  {selectedLead.establishmentType && (
                    <div className="flex items-center text-blue-600 mb-2">
                      <Building className="w-4 h-4 mr-2" />
                      <span className="font-medium">{selectedLead.establishmentType}</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-700 mb-2">
                    <User className="w-4 h-4 mr-2" />
                    <span>POC: {selectedLead.name}</span>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    selectedLead.status
                  )}`}
                >
                  {selectedLead.status}
                </span>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Contact Information
                </h4>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-gray-900">{selectedLead.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="text-gray-900">{selectedLead.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lead Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Lead Information
                </h4>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Lead ID</p>
                      <p className="text-gray-900">#{selectedLead.id}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Created</p>
                      <p className="text-gray-900">2 weeks ago</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Assigned To</p>
                      <p className="text-gray-900">{selectedLead.assignedTo}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Recent Activity
                </h4>
                
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
                          <h5 className="font-medium text-gray-900">{activity.title}</h5>
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
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-900">Follow-up Call</h5>
                      <span className="text-xs text-gray-500">2 days ago</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Follow-up Notes:</strong> Discussed pricing for bulk orders. {selectedLead.name} showed interest in our new cardiac medication line. Requested product samples and detailed pricing sheet for {selectedLead.company}.
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Next Action:</strong> Send product samples by Friday
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-900">Initial Contact</h5>
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
                      <h5 className="font-medium text-gray-900">Lead Created</h5>
                      <span className="text-xs text-gray-500">2 weeks ago</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Lead generated from healthcare conference. {selectedLead.name} expressed interest in expanding their supplier network for {selectedLead.company}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button 
                  onClick={() => {
                    onLogCall(selectedLead);
                    closeModal();
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 font-medium"
                >
                  Log Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;