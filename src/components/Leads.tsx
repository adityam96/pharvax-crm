import React from 'react';
import { useEffect } from 'react';
import { UserCheck, Search, Filter, X, Mail, Phone, Building, User, Calendar, Plus, Save, MessageSquare, Send, Menu, Tag, ChevronDown } from 'lucide-react';
import { supabase, getLeadsAssignedToCurrentUser, getUserProfile, getChatAndFollowUps, getEmployeeNotes } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { userCache } from '../lib/userCache';
import { getCallStatusConfig, getLeadLabelsConfig } from '../lib/configDataService';
import { formatLocal, getCallTitle } from '../lib/utils';

interface LeadsProps {
  onLogCall: (lead: any) => void;
  onMenuClick?: () => void;
}

const Leads: React.FC<LeadsProps> = ({ onLogCall, onMenuClick }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All');
  const [labelFilter, setLabelFilter] = React.useState('All');
  const [selectedLead, setSelectedLead] = React.useState(null);
  const [availableLabels, setAvailableLabels] = React.useState([]);
  const [showLabelMenu, setShowLabelMenu] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [allLeads, setAllLeads] = React.useState([]);
  const [recentActivity, setRecentActivity] = React.useState([]);
  const [activityLoading, setActivityLoading] = React.useState(false);
  const [notes, setNotes] = React.useState([]);
  const [notesLoading, setNotesLoading] = React.useState(false);
  const [newNote, setNewNote] = React.useState('');
  const [noteLevel, setNoteLevel] = React.useState('info');
  const [addingNote, setAddingNote] = React.useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const { userProfile, user } = useAuth();

  // Fetch leads from database
  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchLabels();
    }
  }, [user]);

  const fetchLabels = async () => {
    try {
      const labels = await getLeadLabelsConfig();
      console.log('Fetched labels:', labels);
      setAvailableLabels(Array.isArray(labels) ? labels : []);
    } catch (error) {
      console.error('Error fetching labels:', error);
      setAvailableLabels([]);
    }
  };

  // Fetch recent activity when a lead is selected
  useEffect(() => {
    if (selectedLead) {
      fetchRecentActivity(selectedLead.id);
      fetchNotes(selectedLead.id);
    }
  }, [selectedLead]);
  const fetchLeads = async () => {
    try {
      setLoading(true);

      // Try to get profile from cache first
      let currentUserProfile = userCache.getProfile();

      if (!currentUserProfile) {
        // Fetch from database if not in cache
        const { data: profileData } = await getUserProfile(user.id);

        if (!profileData) {
          console.error('Error fetching user profile: Profile not found');
          return;
        }

        currentUserProfile = profileData;
        userCache.setProfile(profileData);
      }

      // Fetch leads assigned to current user
      const { data, error } = await getLeadsAssignedToCurrentUser(currentUserProfile.id);

      if (error) {
        console.error('Error fetching leads:', error);
        return;
      }

      console.log('Raw leads data for Leads:', data);
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
        lastContact: lead.last_contact,
        additionalInfo: lead.additional_information,
        source: lead.source,
        area: lead.area,
        created_at: lead.created_at,
        labels: Array.isArray(lead.labels) ? lead.labels : (lead.labels ? JSON.parse(lead.labels) : [])
      }));

      console.log('Transformed leads data:', transformedData);
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
      const [chatsResponse, followupsResponse] = await getChatAndFollowUps(leadId);

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

      setRecentActivity(activities.slice(0, 5)); // Show only last 5 activities
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchNotes = async (leadId: string) => {
    try {
      setNotesLoading(true);

      const { data: notes, error } = await getEmployeeNotes(leadId);

      if (error) {
        console.error('Error fetching notes:', error);
        return;
      }

      setNotes(notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedLead) return;

    try {
      setAddingNote(true);

      // Get current user profile
      let currentUserProfile = userCache.getProfile();
      if (!currentUserProfile) {
        const { data: profileData } = await getUserProfile(user.id);
        if (!profileData) {
          alert('Error fetching user profile');
          return;
        }
        currentUserProfile = profileData;
      }

      const { error } = await supabase
        .from('lead_notes')
        .insert([
          {
            lead_id: selectedLead.id,
            created_by: currentUserProfile.id,
            notes: newNote.trim(),
            level: 'EMPLOYEE'
          }
        ]);

      if (error) {
        console.error('Error adding note:', error);
        alert('Error adding note');
        return;
      }

      // Clear form and refresh notes
      setNewNote('');
      setNoteLevel('info');
      fetchNotes(selectedLead.id);
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Error adding note');
    } finally {
      setAddingNote(false);
    }
  };

  const getNoteColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getNoteTextColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-900';
      case 'medium':
        return 'text-yellow-900';
      case 'low':
        return 'text-blue-900';
      default:
        return 'text-gray-900';
    }
  };

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    const matchesLabel = labelFilter === 'All' || (lead.labels && lead.labels.includes(labelFilter));

    return matchesSearch && matchesStatus && matchesLabel;
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
    setNotes([]);
    setNewNote('');
    setNoteLevel('info');
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
      <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between mb-3 lg:mb-0">
          <div className="flex items-center space-x-3">
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
            )}
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Leads</h1>
          </div>
          {/* <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddLeadModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 lg:px-4 py-2 rounded-lg transition-colors duration-200 font-medium flex items-center space-x-2 text-sm lg:text-base"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Lead</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div> */}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full lg:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Desktop Quick Filters */}
      <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-semibold text-gray-900 mr-4">Filters:</span>
        </div>
        <div className="mt-3 flex items-start space-x-6">
          {/* Status Filter */}
          <div className="flex flex-col space-y-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${statusFilter === status
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow'
                    }`}
                >
                  {status} <span className="opacity-75">({count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Label Filter */}
          {availableLabels.length > 0 && (
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Label
              </label>
              <div className="relative">
                <select
                  value={labelFilter}
                  onChange={(e) => setLabelFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm min-w-[150px]"
                >
                  <option value="All">All Labels</option>
                  {availableLabels.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Button */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-gray-600" />
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {statusFilter}
              </span>
            </div>
          </div>
          <span className="text-gray-500 text-lg">{showFilters ? '▲' : '▼'}</span>
        </button>
        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setShowFilters(false);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${statusFilter === status
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow border border-gray-200'
                    }`}
                >
                  {status} <span className="opacity-75">({count})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 lg:p-6">
        <div className="mb-4">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900">
            Your Assigned Leads
          </h2>
          <p className="text-xs lg:text-sm text-gray-600">
            Showing {filteredLeads.length} of {allLeads.length} leads
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onClick={() => handleCardClick(lead)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-base lg:text-lg truncate">{lead.company}</h3>
                  {lead.establishmentType && (
                    <p className="text-xs lg:text-sm text-blue-600 font-medium mb-1">{lead.establishmentType}</p>
                  )}
                  <p className="text-xs lg:text-sm text-gray-700 mb-1">POC: {lead.name}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${getStatusColor(
                    lead.status
                  )}`}
                >
                  {lead.status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs lg:text-sm truncate">{lead.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs lg:text-sm">{lead.phone}</span>
                </div>
              </div>

              {/* Labels Section */}
              {lead.labels && lead.labels.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex flex-wrap gap-1">
                    {lead.labels.map((label, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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

              {/* Labels Management */}
              {availableLabels.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 flex items-center">
                    <Tag className="w-5 h-5 mr-2" />
                    Labels
                  </h4>

                  <div className="flex flex-wrap gap-2">
                    {availableLabels.map((label) => {
                      const isSelected = selectedLead.labels && selectedLead.labels.includes(label);
                      return (
                        <button
                          key={label}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const currentLabels = selectedLead.labels || [];
                            const newLabels = isSelected
                              ? currentLabels.filter(l => l !== label)
                              : [...currentLabels, label];

                            try {
                              const { error } = await supabase
                                .from('leads')
                                .update({ labels: JSON.stringify(newLabels) })
                                .eq('id', selectedLead.id);

                              if (error) throw error;

                              // Update local state
                              setSelectedLead({ ...selectedLead, labels: newLabels });
                              setAllLeads(allLeads.map(l =>
                                l.id === selectedLead.id ? { ...l, labels: newLabels } : l
                              ));
                            } catch (error) {
                              console.error('Error updating labels:', error);
                              alert('Failed to update label');
                            }
                          }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <Tag className="w-3 h-3 inline mr-1" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                      <p className="text-sm text-gray-600">Created At</p>
                      <p className="text-gray-900">{formatLocal(selectedLead.created_at)}</p>
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

              {/* Additional Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Additional Information
                </h4>

                <div className="space-y-3">
                  <div>
                    <p className="text-gray-900 whitespace-pre-wrap break-words">Source: {selectedLead.source}</p>
                  </div>
                  <div>
                    <p className="text-gray-900 whitespace-pre-wrap break-words">Area: {selectedLead.area}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="text-gray-900 whitespace-pre-wrap break-words">{selectedLead.additionalInfo}</p>
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

              {/* Notes Section */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">Notes</h4>
                  <MessageSquare className="w-5 h-5 text-gray-400" />
                </div>

                {/* Add New Note */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add Note
                      </label>
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Enter your note..."
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || addingNote}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md transition-colors duration-200 font-medium flex items-center space-x-2"
                      >
                        {addingNote ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Add Note</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Display Notes */}
                {notesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span className="text-gray-600">Loading notes...</span>
                  </div>
                ) : notes.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className={`rounded-lg p-4 border ${getNoteColor(note.level)}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {note.created_by_profile?.name || 'Unknown User'}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelBadgeColor(note.level)}`}>
                              {note.level.charAt(0).toUpperCase() + note.level.slice(1)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className={`text-sm ${getNoteTextColor(note.level)}`}>
                          {note.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No notes found for this lead.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <AddLeadModal
          onClose={() => setShowAddLeadModal(false)}
          onLeadAdded={() => {
            setShowAddLeadModal(false);
            fetchLeads(); // Refresh leads list
          }}
          currentUser={user}
          currentUserProfile={userProfile}
        />
      )}
    </div>
  );
};

// Add Lead Modal Component
const AddLeadModal = ({ onClose, onLeadAdded, currentUser, currentUserProfile }) => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    establishmentType: ''
  });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.email || !formData.phone) {
      setError('Please fill in all required fields (Name, Email, Phone)');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Get current user profile
      let currentProfile = currentUserProfile;
      if (!currentProfile) {
        const { data: profileData } = await getUserProfile(currentUser.id);
        if (!profileData) {
          setError('Error fetching user profile');
          setSaving(false);
          return;
        }
        currentProfile = profileData;
      }

      // Create new lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .insert([
          {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            company: formData.company || '',
            establishment_type: formData.establishmentType || '',
            status: 'Open',
            assigned_to: currentProfile.id,
            calls_made: 0,
            last_contact: null
          }
        ])
        .select()
        .single();

      if (leadError) {
        console.error('Error creating lead:', leadError);
        setError('Error creating lead: ' + leadError.message);
        setSaving(false);
        return;
      }

      console.log('Lead created successfully:', leadData);
      onLeadAdded();
    } catch (error) {
      console.error('Error creating lead:', error);
      setError('An unexpected error occurred');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add New Lead</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Contact Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter contact name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter email address"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Phone *
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
              <Building className="w-4 h-4 inline mr-2" />
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

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md transition-colors duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-md transition-colors duration-200 font-medium flex items-center justify-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Add Lead</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default Leads;