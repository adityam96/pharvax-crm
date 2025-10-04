import React, { useState } from 'react';
import { useEffect } from 'react';
import { Search, Plus, GripVertical, Menu } from 'lucide-react';
import LeadCard from './LeadCard';
import CallLogForm from './CallLogForm';
import { supabase, getOpenLeadsAssignedToCurrentUser, getUserProfile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { userCache } from '../lib/userCache';
import { getLeadStatusFromCallStatus } from '../lib/utils';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Open' | 'In Progress' | 'Closed';
  company?: string;
  establishmentType?: string;
}

interface DashboardProps {
  selectedLeadForCall?: Lead | null;
  onLeadCallLogged: () => void;
  onMenuClick?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ selectedLeadForCall, onLeadCallLogged, onMenuClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(selectedLeadForCall || null);
  const [leftPaneWidth, setLeftPaneWidth] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCallLogForm, setShowCallLogForm] = useState(false);
  const { user } = useAuth();

  // Update selected lead when prop changes
  React.useEffect(() => {
    if (selectedLeadForCall) {
      setSelectedLead(selectedLeadForCall);
    }
  }, [selectedLeadForCall]);

  // Fetch leads from database
  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

  const fetchLeads = async () => {
    try {
      setLoading(true);

      // Try to get profile from cache first
      let currentUserProfile = userCache.getProfile();
      console.log('Current user profile from cache:', currentUserProfile);
      if (!currentUserProfile) {
        // Fetch from database if not in cache
        console.log('Fetching user profile from database for user ID:', user.id);
        const { data: profileData } = await getUserProfile(user.id);

        console.log('Fetched user profile:', profileData);
        if (!profileData) {
          console.error('Error fetching user profile:');
          return;
        }

        currentUserProfile = profileData;
        userCache.setProfile(profileData);
      }

      console.log('Using user profile:', currentUserProfile);
      // Fetch leads assigned to current user
      const { data, error } = await getOpenLeadsAssignedToCurrentUser(currentUserProfile.id);

      console.log('Fetched leads:', data, 'error:', error);
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
        callsMade: lead.calls_made,
        lastContact: lead.last_contact
      }));

      setLeads(transformedData);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleLogCall = (lead: Lead) => {
    setSelectedLead(lead);
    setShowCallLogForm(true);
  };

  const handleLogNewCall = () => {
    setSelectedLead(null);
    setShowCallLogForm(true);
  };

  const handleSaveCall = async (callData: any) => {
    try {
      if (selectedLead) {
        // Update existing lead call
        await saveExistingLeadCall(selectedLead, callData);
      } else {
        // Create new lead and call
        await saveNewLeadCall(callData);
      }

      // Refresh leads data
      await fetchLeads();
    } catch (error) {
      console.error('Error saving call:', error);
      alert('Error saving call data');
      return;
    }

    setShowCallLogForm(false);
    onLeadCallLogged();
    alert('Call data saved successfully!');
  };

  const saveExistingLeadCall = async (lead: Lead, callData: any) => {
    // Get current user from cache or context
    const currentUser = userCache.getUser() || user;

    // Save chat record
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .insert([
        {
          lead_id: lead.id,
          user_id: currentUser.id,
          contact_name: callData.contactName,
          phone: callData.phone,
          mom: callData.mom,
          notes: callData.notes,
          call_status: callData.callStatus
        }
      ])
      .select()
      .single();

    if (chatError) {
      throw new Error(`Error saving chat: ${chatError.message}`);
    }

    console.log('Lead data', lead)
    const lead_status = await getLeadStatusFromCallStatus(callData.callStatus)
    console.log('Determined lead status:', lead_status);
    // Update lead's calls_made count, status and last_contact
    const { data: updatedLead, error: leadError } = await supabase
      .from('leads')
      .update({
        last_contact: new Date().toISOString(),
        status: lead_status
      })
      .eq('id', lead.id)
      .select()
      .single();

    console.log('Lead update result:', { updatedLead, leadError });


    if (leadError) {
      throw new Error(`Error updating lead: ${leadError.message}`);
    }

    // Save follow-up if provided
    if (callData.followUpDate) {
      const { error: followupError } = await supabase
        .from('followups')
        .insert([
          {
            chat_id: chatData.id,
            lead_id: lead.id,
            user_id: currentUser.id,
            follow_up_date: callData.followUpDate,
            notes: callData.notes,
            status: 'pending'
          }
        ]);

      if (followupError) {
        throw new Error(`Error saving follow-up: ${followupError.message}`);
      }
    }
  };

  const saveNewLeadCall = async (callData: any) => {
    // Get current user and profile from cache or fetch
    const currentUser = userCache.getUser() || user;
    let currentUserProfile = userCache.getProfile();

    if (!currentUserProfile) {
      const { data: profileData } = await getUserProfile(currentUser.id);

      if (!profileData) {
        throw new Error(`Error fetching user profile`);
      }

      currentUserProfile = profileData;
      userCache.setProfile(profileData);
    }

    // Create new lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert([
        {
          name: callData.contactName,
          email: callData.email || '',
          phone: callData.phone,
          company: callData.company || '',
          establishment_type: callData.establishmentType || '',
          status: 'Open',
          assigned_to: currentUserProfile.id,
          calls_made: 1,
          last_contact: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (leadError) {
      throw new Error(`Error creating lead: ${leadError.message}`);
    }

    // Save chat record
    const { data: chatData, error: chatError } = await supabase
      .from('chats')
      .insert([
        {
          lead_id: leadData.id,
          user_id: currentUser.id,
          contact_name: callData.contactName,
          phone: callData.phone,
          mom: callData.mom,
          notes: callData.notes,
          call_status: callData.callStatus
        }
      ])
      .select()
      .single();

    if (chatError) {
      throw new Error(`Error saving chat: ${chatError.message}`);
    }

    // Save follow-up if provided
    if (callData.followUpDate) {
      const { error: followupError } = await supabase
        .from('followups')
        .insert([
          {
            chat_id: chatData.id,
            lead_id: leadData.id,
            user_id: currentUser.id,
            follow_up_date: callData.followUpDate,
            notes: callData.notes,
            status: 'pending'
          }
        ]);

      if (followupError) {
        throw new Error(`Error saving follow-up: ${followupError.message}`);
      }
    }
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const container = document.getElementById('dashboard-container');
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

    // Set limits: minimum 30%, maximum 80%
    const clampedWidth = Math.min(Math.max(newWidth, 30), 80);
    setLeftPaneWidth(clampedWidth);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
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
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <div className="flex items-center space-x-2 lg:space-x-4">
            <button
              onClick={handleLogNewCall}
              className="bg-green-600 hover:bg-green-700 text-white px-3 lg:px-4 py-2 rounded-lg transition-colors duration-200 font-medium flex items-center space-x-2 text-sm lg:text-base"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Log New Call</span>
              <span className="sm:hidden">Log Call</span>
            </button>
          </div>
        </div>
        <div className="relative lg:hidden">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div className="hidden lg:flex items-center justify-end">
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

      {/* Main Content */}
      <div id="dashboard-container" className="flex flex-1 h-[calc(100vh-80px)] lg:h-[calc(100vh-80px)] relative">
        {/* Desktop Layout */}
        <div className="hidden lg:flex flex-1 relative">
          {/* Left Side - Leads List */}
          <div
            className="p-6 overflow-y-auto bg-gray-50"
            style={{ width: `${leftPaneWidth}%` }}
          >
            <div className="mb-4 sticky top-0 bg-gray-50 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
              <p className="text-sm text-gray-600">Manage and track your sales leads</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">Loading leads...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onLogCall={handleLogCall}
                  />
                ))}
                {filteredLeads.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No leads assigned to you yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Resizable Divider */}
          <div
            className="w-1 bg-gray-300 hover:bg-green-500 cursor-col-resize flex items-center justify-center group transition-colors duration-200 relative"
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center">
              <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-200" />
            </div>
          </div>

          {/* Right Side - Call Log Form */}
          <div
            className="p-6 overflow-y-auto bg-gray-50 border-l border-gray-200"
            style={{ width: `${100 - leftPaneWidth}%` }}
          >
            <CallLogForm onSave={handleSaveCall} selectedLead={selectedLead} />
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden flex-1 overflow-y-auto">
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">Loading leads...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onLogCall={handleLogCall}
                  />
                ))}
                {filteredLeads.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No leads assigned to you yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Call Log Form Modal */}
      {showCallLogForm && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedLead ? 'Log Call' : 'Log New Call'}
              </h2>
              <button
                onClick={() => setShowCallLogForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5 text-gray-600 rotate-45" />
              </button>
            </div>
            <div className="p-4">
              <CallLogForm onSave={handleSaveCall} selectedLead={selectedLead} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;