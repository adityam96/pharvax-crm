import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Edit, Trash2, ChevronDown, X, User, Mail, Phone, Calendar, UserCheck, TrendingUp, FileText, MessageSquare, Plus, Save, Send } from 'lucide-react';
import { getAllLeads, supabase, logSupabaseCall, getChatAndFollowUps, getAdminNotes, getAllNotes, getUserProfile } from '../lib/supabase';
import { userCache } from '../lib/userCache';
import { useAuth } from '../contexts/AuthContext';

const AdminLeads: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allLeads, setAllLeads] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [adminOnlyNotes, setAdminOnlyNotes] = useState([]);
  const [allNotes, setAllNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteLevel, setNoteLevel] = useState('info');
  const [addingNote, setAddingNote] = useState(false);
  const [showAdminNotesDialog, setShowAdminNotesDialog] = useState(false);
  const [adminNotesDialogPosition, setAdminNotesDialogPosition] = useState({ top: 0, left: 0 });
  const adminNotesButtonRef = useRef(null);
  const { user } = useAuth();

  // Fetch leads from database
  useEffect(() => {
    fetchLeads();
  }, []);

  // Fetch recent activity and notes when a lead is selected
  useEffect(() => {
    if (selectedLead) {
      fetchRecentActivity(selectedLead.id);
      fetchNotes(selectedLead.id);
      fetchAdminOnlyNotes(selectedLead.id);
    }
  }, [selectedLead]);

  // Close admin notes dialog when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAdminNotesDialog && 
          adminNotesButtonRef.current && 
          !adminNotesButtonRef.current.contains(event.target) &&
          !event.target.closest('.admin-notes-dialog')) {
        setShowAdminNotesDialog(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAdminNotesDialog]);

  const fetchLeads = async () => {
    try {
      setLoading(true);

      // Check if we can use cached data for current user context
      const cachedProfile = userCache.getProfile();
      if (cachedProfile && cachedProfile.role === 'admin') {
        console.log('Admin user confirmed from cache');
      }

      // Fetch all leads for admin
      const { data, error } = await getAllLeads();

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
        lastContact: lead.last_contact,
        area: lead.area,
        source: lead.source
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
        chats.forEach(chat => {
          activities.push({
            id: `chat-${chat.id}`,
            type: 'call',
            title: 'Status: ' + getCallTitle(chat.call_status),
            date: new Date(chat.created_at),
            notes: chat.mom,
            additionalInfo: chat.notes,
            status: chat.call_status,
            created_by: chat.created_by_profile?.name
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

      const { data: notes, error } = await getAllNotes(leadId);

      if (error) {
        console.error('Error fetching notes:', error);
        return;
      }

      setAllNotes(notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  const fetchAdminOnlyNotes = async (leadId: string) => {
    try {
      const { data: notes, error } = await getAdminNotes(leadId);

      if (error) {
        console.error('Error fetching admin notes:', error);
        return;
      }

      setAdminOnlyNotes(notes || []);
    } catch (error) {
      console.error('Error fetching admin notes:', error);
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
            level: noteLevel === 'admin' ? 'ADMIN' : 'EMPLOYEE'
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
      if (noteLevel === 'admin') {
        fetchAdminOnlyNotes(selectedLead.id);
      }
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Error adding note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleAdminNotesClick = (event) => {
    if (!showAdminNotesDialog) {
      const buttonRect = event.currentTarget.getBoundingClientRect();
      setAdminNotesDialogPosition({
        top: buttonRect.bottom + 8,
        left: buttonRect.left
      });
    }
    setShowAdminNotesDialog(!showAdminNotesDialog);
  };

  const getNoteColor = (level: string) => {
    switch (level) {
      case 'ADMIN':
        return 'bg-red-50 border-red-200';
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
      case 'ADMIN':
        return 'text-red-900';
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
      case 'ADMIN':
        return 'bg-red-100 text-red-800';
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
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
    Closed: allLeads.filter(lead => lead.status === 'Closed').length,
    Failed: allLeads.filter(lead => lead.status === 'Failed').length
  };

  const handleCardClick = (lead) => {
    setSelectedLead(lead);
  };

  const closeModal = () => {
    setSelectedLead(null);
    setRecentActivity([]);
    setAllNotes([]);
    setAdminOnlyNotes([]);
    setNewNote('');
    setNoteLevel('info');
    setShowAdminNotesDialog(false);
  };

  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">All Leads</h1>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
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
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${statusFilter === status
                ? 'bg-blue-600 text-white'
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
            All Leads
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
                  {lead.area && (
                    <p className="text-sm text-gray-600 mb-1">Area: {lead.area}</p>
                  )}
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
                <div className="flex items-center space-x-2 text-gray-600">
                  <span className="text-sm">👤</span>
                  <span className="text-sm">Assigned to: {lead.assignedTo}</span>
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
                      <span className="font-medium">{selectedLead.establishmentType}</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-700 mb-2">
                    <User className="w-4 h-4 mr-2" />
                    <span>POC: {selectedLead.name}</span>
                  </div>
                  {selectedLead.area && (
                    <div className="flex items-center text-gray-700 mb-2">
                      <span>Area: {selectedLead.area}</span>
                    </div>
                  )}
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

              {/* Admin Notes Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Admin Notes
                  </h4>
                  <div className="relative">
                    <button
                      ref={adminNotesButtonRef}
                      onClick={handleAdminNotesClick}
                      className="flex items-center space-x-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors duration-200"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Open admin notes</span>
                    </button>

                    {/* Admin Notes Dialog */}
                    {showAdminNotesDialog && (
                      <div
                        className="admin-notes-dialog fixed bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-y-auto z-50"
                        style={{
                          top: `${adminNotesDialogPosition.top}px`,
                          left: `${adminNotesDialogPosition.left}px`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-semibold text-gray-900">Admin Only Notes</h5>
                          <button
                            onClick={() => setShowAdminNotesDialog(false)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
                          >
                            <X className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>

                        {adminOnlyNotes.length > 0 ? (
                          <div className="space-y-3">
                            {adminOnlyNotes.map((note) => (
                              <div
                                key={note.id}
                                className={`rounded-lg p-3 border ${getNoteColor(note.level)}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-900">
                                      {note.created_by_profile?.name || 'Admin'}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelBadgeColor(note.level)}`}>
                                      ADMIN
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {new Date(note.created_at).toLocaleDateString()}
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
                            <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 text-sm">No admin notes found for this lead.</p>
                          </div>
                        )}
                      </div>
                    )}
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
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
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

              {/* Notes Section */}
              <div className="space-y-4 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">All Notes</h4>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your note..."
                      />
                    </div>
                    <div className="flex items-center space-x-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Note Level
                        </label>
                        <select
                          value={noteLevel}
                          onChange={(e) => setNoteLevel(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="info">Info</option>
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                          <option value="admin">Admin Only</option>
                        </select>
                      </div>
                      <div className="flex-1 flex justify-end items-end">
                        <button
                          onClick={handleAddNote}
                          disabled={!newNote.trim() || addingNote}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md transition-colors duration-200 font-medium flex items-center space-x-2"
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
                </div>

                {/* Display Notes */}
                {notesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span className="text-gray-600">Loading notes...</span>
                  </div>
                ) : allNotes.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {allNotes.map((note) => (
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
                              {note.level === 'ADMIN' ? 'ADMIN' : note.level.charAt(0).toUpperCase() + note.level.slice(1)}
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
    </div>
  );
};

export default AdminLeads;