import React, { useState, useRef } from 'react';
import { useEffect } from 'react';
import { Search, Filter, Download, Calendar, ChevronDown, Upload, Plus, X, Mail, Phone, Building, User, CreditCard as Edit, UserCheck, FileText, AlertCircle, CheckCircle, Users, MessageSquare, Send, AreaChart, PlayCircle, Navigation as NavigationIcon, Map as MapIcon, Tag, Save } from 'lucide-react';
import { supabase, getAllLeads, getAllEmployees, getChatAndFollowUps, getUserProfile, getAllNotes, getAdminNotes } from '../lib/supabase';
import { userCache } from '../lib/userCache';
import { getCallStatusConfig, getLeadLabelsConfig } from '../lib/configDataService';
import { getCallTitle, getContrastText } from '../lib/utils';

const AdminLeads: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('All');
  const [establishmentTypeFilter, setEstablishmentTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [labelFilter, setLabelFilter] = useState('All');
  const [areaFilter, setAreaFilter] = useState('All');
  const [dateRange, setDateRange] = useState('01/01/2024 - 03/31/2024');
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedLeadForAdminNotes, setSelectedLeadForAdminNotes] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [allLeads, setAllLeads] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    assignedTo: ['All'],
    establishmentTypes: ['All'],
    statuses: ['All'],
    sources: ['All'],
    areas: ['All'],
    labels: ['All']
  });
  const [adminNotes, setAdminNotes] = useState([]);
  const [adminOnlyNotes, setAdminOnlyNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [adminOnlyNotesLoading, setAdminOnlyNotesLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteLevel, setNoteLevel] = useState('info');
  const [addingNote, setAddingNote] = useState(false);
  const [adminNotesDialogPosition, setAdminNotesDialogPosition] = useState({ top: 0, left: 0 });
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [selectedLeadForLabels, setSelectedLeadForLabels] = useState(null);
  const [availableLabels, setAvailableLabels] = useState([]);
  const [availableLabelsMap, setAvailableLabelsMap] = useState({});

  // Fetch data from database
  useEffect(() => {
    fetchLeads();
    fetchEmployees();
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    try {
      const labels = await getLeadLabelsConfig();
      console.log('Fetched labels:', labels);
      const labelsArray = Object.keys(labels ?? {});
      console.log('Labels array:', labelsArray);
      const labelsObj = labels ?? {};
      const labelsMap: Map<string, any> =
        labelsObj instanceof Map ? labelsObj : new Map(Object.entries(labelsObj));
      setAvailableLabels(labelsArray);
      setAvailableLabelsMap(labelsMap);
    } catch (error) {
      console.error('Error fetching labels:', error);
      setAvailableLabels([]);
    }
  };

  // Fetch all notes when a lead is selected
  useEffect(() => {
    if (selectedLead) {
      fetchAdminNotes(selectedLead.id);
    }
  }, [selectedLead]);

  // Fetch admin pnly notes when a lead is selected
  useEffect(() => {
    if (selectedLeadForAdminNotes) {
      fetchAdminOnlyNotes(selectedLeadForAdminNotes.id);
    }
  }, [selectedLeadForAdminNotes]);

  const fetchLeads = async () => {
    try {
      setLoading(true);

      // Check if we can use cached data for current user context
      const cachedProfile = userCache.getProfile();
      if (cachedProfile && cachedProfile.role === 'admin') {
        console.log('Admin user confirmed from cache');
      }

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
        company: lead.company,
        source: lead.source,
        establishmentType: lead.establishment_type,
        assignedTo: lead.assigned_to_profile?.name || 'Unassigned',
        assignedToId: lead.assigned_to,
        status: lead.status,
        lastContact: lead.last_contact?.split('T')[0] || '',
        area: lead.area || 'N/A',
        additionalInformation: lead.additional_information || '',
        labels: Array.isArray(lead.labels) ? lead.labels : (lead.labels ? JSON.parse(lead.labels) : [])
      }));

      setAllLeads(transformedData);

      // Generate filter options from the retrieved leads
      // const assignedToOptions = ['All', ...new Set(transformedData.map(lead => lead.assignedTo).filter(Boolean))];
      // Build assigned-to options: All, Unassigned, unique assignee names, and "Assigned to any"
      const assignedNames = Array.from(new Set(transformedData.map(lead => lead.assignedTo || 'Unassigned')));
      const assignedToOptions = ['All', 'Assigned to any', 'Unassigned', ...assignedNames.filter(n => n !== 'Unassigned')];
      const establishmentTypeOptions = ['All', ...new Set(transformedData.map(lead => lead.establishmentType).filter(Boolean))];
      const statusOptions = ['All', ...new Set(transformedData.map(lead => lead.status).filter(Boolean))];
      const sourceOptions = ['All', ...new Set(transformedData.map(lead => lead.source).filter(Boolean))];
      const areaOptions = ['All', ...new Set(transformedData.map(lead => lead.area).filter(Boolean))];
      const labelOptions = [
        'All',
        ...Array.from(
          new Set(
            transformedData.flatMap(lead =>
              Array.isArray(lead.labels) ? lead.labels.filter(Boolean) : []
            )
          )
        ),
      ];
      console.log('Label options:', labelOptions);
      setFilterOptions({
        assignedTo: assignedToOptions,
        establishmentTypes: establishmentTypeOptions,
        statuses: statusOptions,
        sources: sourceOptions,
        areas: areaOptions,
        labels: labelOptions
      });
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {

      const { data, error } = await getAllEmployees();

      if (error) {
        console.error('Error fetching employees:', error);
        return;
      }

      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchAdminNotes = async (leadId: string) => {
    try {
      setNotesLoading(true);

      const { data: notes, error } = await getAllNotes(leadId);

      console.log('Fetched admin notes:', notes);
      if (error) {
        console.error('Error fetching admin notes:', error);
        return;
      }

      setAdminNotes(notes || []);
    } catch (error) {
      console.error('Error fetching admin notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };

  const fetchAdminOnlyNotes = async (leadId: string) => {
    try {
      setAdminOnlyNotesLoading(true);

      const { data: notes, error } = await getAdminNotes(leadId);

      console.log('Fetched admin notes:', notes);
      if (error) {
        console.error('Error fetching admin notes:', error);
        return;
      }

      setAdminOnlyNotes(notes || []);
    } catch (error) {
      console.error('Error fetching admin only notes:', error);
    } finally {
      setAdminOnlyNotesLoading(false);
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

      console.log('Storing data: ', {
        lead_id: selectedLead.id,
        created_by: currentUserProfile.id,
        notes: newNote.trim(),
        level: 'ADMIN'
      });
      const { error } = await supabase
        .from('lead_notes')
        .insert([
          {
            lead_id: selectedLead.id,
            created_by: currentUserProfile.id,
            notes: newNote.trim(),
            level: 'ADMIN'
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
      fetchAdminNotes(selectedLead.id);
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
      lead.company.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAssignedTo = assignedToFilter === 'All' || lead.assignedTo === assignedToFilter || (assignedToFilter === 'Assigned to any' && lead.assignedTo !== 'Unassigned');
    const matchesEstablishmentType = establishmentTypeFilter === 'All' || lead.establishmentType === establishmentTypeFilter;
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'All' || lead.source === sourceFilter;
    const matchesArea = areaFilter === 'All' || lead.area === areaFilter;
    const matchesLabel =
      labelFilter === 'All' ||
      (lead.labels || []).some(label => label.includes(labelFilter));
    return matchesSearch && matchesAssignedTo && matchesEstablishmentType && matchesStatus && matchesSource && matchesArea && matchesLabel;
  });

  const handleSelectLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map(lead => lead.id)));
    }
  };

  const handleBulkAssign = () => {
    if (selectedLeads.size === 0) {
      alert('Please select leads to assign');
      return;
    }
    setShowBulkAssignModal(true);
  };

  const handleCardClick = (lead) => {
    console.log('Card clicked:', lead);
    setSelectedLead(lead);
  };

  const handleAdminNotesClick = (lead) => {
    // Get the position of the click event to position the dialog
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setAdminNotesDialogPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
    setSelectedLeadForAdminNotes(lead);
  };

  const handleAdminNotesCloseClick = () => {
    setSelectedLeadForAdminNotes(null);
    setAdminOnlyNotes([]);
  };

  const closeModal = () => {
    setSelectedLead(null);
    setAdminNotes([]);
    setNewNote('');
    setNoteLevel('info');
  };

  const handleAddLead = (leadData) => {
    addLead(leadData);
  };

  const addLead = async (leadData) => {
    try {
      const { error } = await supabase
        .from('leads')
        .insert([
          {
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
            company: leadData.company,
            establishment_type: leadData.establishmentType,
            assigned_to: leadData.assignedTo
          }
        ]);

      if (error) {
        console.error('Error adding lead:', error);
        alert('Error adding lead');
        return;
      }

      setShowAddModal(false);
      fetchLeads();
    } catch (error) {
      console.error('Error adding lead:', error);
      alert('Error adding lead');
    }
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead);
    setShowEditModal(true);
    setSelectedLead(null);
  };

  const handleUpdateLead = (updatedLead) => {
    updateLead(updatedLead);
  };

  const updateLead = async (updatedLead) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          name: updatedLead.name,
          email: updatedLead.email,
          phone: updatedLead.phone,
          company: updatedLead.company,
          establishment_type: updatedLead.establishmentType,
          status: updatedLead.status,
          assigned_to: updatedLead.assignedTo
        })
        .eq('id', updatedLead.id);

      if (error) {
        console.error('Error updating lead:', error);
        alert('Error updating lead');
        return;
      }

      setShowEditModal(false);
      setEditingLead(null);
      fetchLeads();
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Error updating lead');
    }
  };

  const handleReassignLead = (leadId, newAssignee) => {
    reassignLead(leadId, newAssignee);
  };

  const reassignLead = async (leadId, newAssigneeId) => {
    try {
      if (newAssigneeId === 'unassign') {
        newAssigneeId = null; // Unassign the lead
      }
      const { error } = await supabase
        .from('leads')
        .update({ assigned_to: newAssigneeId })
        .eq('id', leadId);

      if (error) {
        console.error('Error reassigning lead:', error);
        alert('Error reassigning lead');
        return;
      }
      if (newAssigneeId) {
        alert('Sucessfully reassigned lead to: ' + employees.find(emp => emp.id === newAssigneeId)?.name);
      } else {
        alert('Successfully unassigned lead');
      }
      setSelectedLead(null);
      fetchLeads();
    } catch (error) {
      console.error('Error reassigning lead:', error);
      alert('Error reassigning lead');
    }
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
    <>
      <div className="flex-1 bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Leads Management</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="space-y-4">
            {/* Search Row */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full lg:w-96 text-sm"
                />
              </div>
            </div>

            {/* Filter Dropdowns Row */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Filter className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-semibold text-gray-900">Filters</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Assigned To
                  </label>
                  <div className="relative">
                    <select
                      value={assignedToFilter}
                      onChange={(e) => setAssignedToFilter(e.target.value)}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full text-sm"
                    >
                      {filterOptions.assignedTo.map((option) => (
                        <option key={option} value={option}>
                          {option === 'All' ? 'All' : option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Establishment Type
                  </label>
                  <div className="relative">
                    <select
                      value={establishmentTypeFilter}
                      onChange={(e) => setEstablishmentTypeFilter(e.target.value)}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full text-sm"
                    >
                      {filterOptions.establishmentTypes.map((option) => (
                        <option key={option} value={option}>
                          {option === 'All' ? 'All Types' : option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full text-sm"
                    >
                      {filterOptions.statuses.map((option) => (
                        <option key={option} value={option}>
                          {option === 'All' ? 'All Statuses' : option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Area
                  </label>
                  <div className="relative">
                    <select
                      value={areaFilter}
                      onChange={(e) => setAreaFilter(e.target.value)}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full text-sm"
                    >
                      {filterOptions.areas.map((area) => (
                        <option key={area} value={area}>
                          {area === 'All' ? 'All Areas' : area}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Source
                  </label>
                  <div className="relative">
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full text-sm"
                    >
                      {filterOptions.sources.map((source) => (
                        <option key={source} value={source}>
                          {source === 'All' ? 'All Sources' : source}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Labels
                  </label>
                  <div className="relative">
                    <select
                      value={labelFilter}
                      onChange={(e) => setLabelFilter(e.target.value)}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full text-sm"
                    >
                      {filterOptions.labels.map((label) => (
                        <option key={label} value={label}>
                          {label === 'All' ? 'All Labels' : label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                  onChange={handleSelectAll}
                  className="mr-2 rounded"
                />
                <span className="text-sm text-gray-700">
                  Select All ({selectedLeads.size} selected)
                </span>
              </label>
            </div>
            {selectedLeads.size > 0 && (
              <button
                onClick={handleBulkAssign}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium flex items-center space-x-2"
              >
                <Users className="w-4 h-4" />
                <span>Bulk Assign ({selectedLeads.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing {filteredLeads.length} of {allLeads.length} leads {selectedLeads.size > 0 && `(${selectedLeads.size} selected)`}
              {assignedToFilter !== 'All' && ` • Assigned to: ${assignedToFilter}`}
              {establishmentTypeFilter !== 'All' && ` • Type: ${establishmentTypeFilter}`}
              {statusFilter !== 'All' && ` • Status: ${statusFilter}`}
            </p>
          </div>

          {/* Leads Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeads.map((lead) => (
              <div key={lead.id} className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div
                  key={lead.id}
                  className="bg-white rounded-t-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
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

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{lead.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{lead.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span className="text-sm">Assigned to: {lead.assignedTo}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-600">
                      <MapIcon className="w-4 h-4" />
                      <span className="text-sm">Area: {lead.area}</span>
                    </div>
                  </div>
                </div>
                {/* Labels Section */}
                {lead.labels && lead.labels.length > 0 && (
                  <div className="bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer">
                    <div className="flex items-center space-x-2 text-gray-600">
                      {lead.labels.map((label, index) => {
                        const meta = availableLabelsMap instanceof Map
                          ? availableLabelsMap.get(label)
                          : availableLabelsMap?.[label];
                        const color = meta?.color as string | undefined;
                        const style = color ? { backgroundColor: color, color: getContrastText(color) } : {};
                        return (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                            style={style}
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {label}
                          </span>
                        );
                      })}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLeadForLabels(lead);
                          setShowLabelModal(true);
                        }}
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors">
                        <Plus className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                  </div>
                ) || (<div className="bg-white border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">No labels</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLeadForLabels(lead);
                        setShowLabelModal(true);
                      }}
                      className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors">
                      <Plus className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                </div>)}
                {/* Sticky (attached) full-width admin notes footer */}
                <div
                  key={'admin-note' + lead.id}
                  className="bg-white rounded-b-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                  onClick={() => handleAdminNotesClick(lead, event)}
                >
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm font-medium">Open admin notes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredLeads.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
              <p className="text-gray-600">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </div>

        {/* Admin Notes Dialog */}
        {selectedLeadForAdminNotes && (
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
                onClick={() => handleAdminNotesCloseClick()}
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

        {/* Lead Details Modal */}
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
                    <div className="flex items-center text-blue-600 mb-2">
                      <Building className="w-4 h-4 mr-2" />
                      <span className="font-medium">{selectedLead.establishmentType}</span>
                    </div>
                    <div className="flex items-center text-gray-700 mb-2">
                      <User className="w-4 h-4 mr-2" />
                      <span>POC: {selectedLead.name}</span>
                    </div>
                    <div className="flex items-center text-gray-700 mb-2">
                      <UserCheck className="w-4 h-4 mr-2" />
                      <span>Assigned to: {selectedLead.assignedTo}</span>
                    </div>
                    <div className="flex items-center text-gray-700 mb-2">
                      <MapIcon className="w-4 h-4 mr-2" />
                      <span>Area: {selectedLead.area}</span>
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

                {/* Additional Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Additional Information
                  </h4>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="text-gray-900 whitespace-pre-wrap break-words">{selectedLead.additionalInformation}</p>
                      </div>
                    </div>
                  </div>
                </div>


                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900">Actions</h4>
                  </div>
                  <button
                    onClick={() => handleEditLead(selectedLead)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 font-medium flex items-center justify-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit Lead</span>
                  </button>
                  <div className="flex-1">
                    <select
                      onChange={(e) => handleReassignLead(selectedLead.id, e.target.value)}
                      className="w-full py-2 px-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      defaultValue=""
                    >
                      <option value="" disabled>Reassign to...</option>
                      {/* Show "Unassign" only if there's an assignee */}
                      {(selectedLead.assignedToId !== null && selectedLead.assignedToId !== undefined) && (
                        <option key="unassign" value="unassign">Unassign</option>
                      )}
                      {employees.filter(emp => emp.id !== selectedLead.assignedToId).map(employee => (
                        <option key={employee.id} value={employee.id}>{employee.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Admin Notes Section */}
                <div className="space-y-4 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900">Admin Notes</h4>
                    <MessageSquare className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* Display Notes */}
                  {notesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span className="text-gray-600">Loading notes...</span>
                    </div>
                  ) : adminNotes.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {adminNotes.map((note) => (
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
                      <p className="text-gray-600">No admin notes found for this lead.</p>
                    </div>
                  )}
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
                    <div className="flex items-center justify-between">
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

                {/* Lead Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Lead Information
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Source</p>
                      <p className="text-gray-900">{selectedLead.source || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Lead ID</p>
                      <p className="text-gray-900">#{selectedLead.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="text-gray-900">{selectedLead.status}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Recent Activity
                  </h4>

                  <RecentActivitySection leadId={selectedLead.id} />
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Label Management Modal */}
        {showLabelModal && selectedLeadForLabels && (
          <LabelManagementModal
            lead={selectedLeadForLabels}
            availableLabels={availableLabels}
            availableLabelsMap={availableLabelsMap}
            onClose={() => {
              setShowLabelModal(false);
              setSelectedLeadForLabels(null);
            }}
            onUpdate={(updatedLabels) => {
              // Update local state
              setAllLeads(allLeads.map(l =>
                l.id === selectedLeadForLabels.id ? { ...l, labels: updatedLabels } : l
              ));
              setShowLabelModal(false);
              setSelectedLeadForLabels(null);
            }}
          />
        )}

        {/* Add Lead Modal */}
        {showAddModal && (
          <AddLeadModal
            onSave={handleAddLead}
            onClose={() => setShowAddModal(false)}
            employees={employees}
          />
        )}

        {/* Edit Lead Modal */}
        {showEditModal && editingLead && (
          <EditLeadModal
            lead={editingLead}
            onSave={handleUpdateLead}
            onClose={() => {
              setShowEditModal(false);
              setEditingLead(null);
            }}
            employees={employees}
          />
        )}

        {/* CSV Import Modal */}
        {showImportModal && (
          <CSVImportModal
            onClose={() => setShowImportModal(false)}
            onImportComplete={() => {
              setShowImportModal(false);
              fetchLeads(); // Refresh leads after import
            }}
            employees={employees}
          />
        )}

        {/* Bulk Assign Modal */}
        {showBulkAssignModal && (
          <BulkAssignModal
            selectedLeads={Array.from(selectedLeads)}
            employees={employees}
            onAssign={async (employeeId) => {
              try {
                const { error } = await supabase
                  .from('leads')
                  .update({ assigned_to: employeeId })
                  .in('id', Array.from(selectedLeads));

                if (error) {
                  console.error('Error bulk assigning leads:', error);
                  alert('Error assigning leads');
                  return;
                }

                alert(`Successfully assigned ${selectedLeads.size} leads`);
                setSelectedLeads(new Set());
                setShowBulkAssignModal(false);
                fetchLeads();
              } catch (error) {
                console.error('Error bulk assigning leads:', error);
                alert('Error assigning leads');
              }
            }}
            onClose={() => setShowBulkAssignModal(false)}
          />
        )}
      </div >
    </>
  );
};

// Recent Activity Component
const RecentActivitySection = ({ leadId }) => {
  const [recentActivity, setRecentActivity] = React.useState([]);
  const [activityLoading, setActivityLoading] = React.useState(false);

  React.useEffect(() => {
    if (leadId) {
      fetchRecentActivity(leadId);
    }
  }, [leadId]);

  const fetchRecentActivity = async (leadId: string) => {
    try {
      setActivityLoading(true);

      // Fetch chats and followups for the selected lead
      const [chatsResponse, followupsResponse] = await getChatAndFollowUps(leadId);

      console.log('Fetched chats:', chatsResponse, 'followups:', followupsResponse);

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
            created_by: chat.created_by_profile?.name,
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

  if (activityLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
        <span className="text-gray-600">Loading activity...</span>
      </div>
    );
  }

  if (recentActivity.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">No recent activity found for this lead.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentActivity.map((activity) => (
        <div key={activity.id} className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <h5 className="font-medium text-gray-900">{activity.title}</h5>
            <span className="text-xs text-gray-500">{formatDate(activity.date)}</span>

          </div>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs text-gray-500"><b>Created By:</b> {activity.created_by}</span>
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
  );
};
// Add Lead Modal Component
const AddLeadModal = ({ onSave, onClose, employees }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    establishmentType: '',
    assignedTo: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              POC Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter POC name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter email address"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter phone number"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter company name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Establishment Type
            </label>
            <select
              value={formData.establishmentType}
              onChange={(e) => handleChange('establishmentType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select establishment type</option>
              <option value="Clinic">Clinic</option>
              <option value="Hospital">Hospital</option>
              <option value="Distributor">Distributor</option>
              <option value="Pharmacy">Pharmacy</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To
            </label>
            <select
              value={formData.assignedTo}
              onChange={(e) => handleChange('assignedTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select employee</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors duration-200 font-medium"
            >
              Add Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Lead Modal Component
const EditLeadModal = ({ lead, onSave, onClose, employees }) => {
  const [formData, setFormData] = useState({
    ...lead
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Lead</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              POC Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Establishment Type
            </label>
            <select
              value={formData.establishmentType}
              onChange={(e) => handleChange('establishmentType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="Clinic">Clinic</option>
              <option value="Hospital">Hospital</option>
              <option value="Distributor">Distributor</option>
              <option value="Pharmacy">Pharmacy</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign To
            </label>
            <select
              value={formData.assignedTo}
              onChange={(e) => handleChange('assignedTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
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
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors duration-200 font-medium"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// CSV Import Modal Component
const CSVImportModal = ({ onClose, onImportComplete, employees }) => {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [step, setStep] = useState(1); // 1: Upload, 2: Map Columns, 3: Results

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
      alert('Please map required columns and select an employee');
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

// Bulk Assign Modal Component
const BulkAssignModal = ({ selectedLeads, employees, onAssign, onClose }) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      alert('Please select an employee');
      return;
    }
    onAssign(selectedEmployee);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Bulk Assign Leads</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Assign {selectedLeads.length} selected leads to:
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Choose an employee...</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md transition-colors duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors duration-200 font-medium"
            >
              Assign Leads
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Label Management Modal Component
const LabelManagementModal = ({ lead, availableLabels, availableLabelsMap, onClose, onUpdate }) => {
  const [selectedLabels, setSelectedLabels] = useState(lead.labels || []);
  const [saving, setSaving] = useState(false);

  const toggleLabel = (label) => {
    setSelectedLabels(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('leads')
        .update({ labels: JSON.stringify(selectedLabels) })
        .eq('id', lead.id);

      if (error) {
        console.error('Error updating labels:', error);
        alert('Error updating labels');
        return;
      }

      onUpdate(selectedLabels);
    } catch (error) {
      console.error('Error updating labels:', error);
      alert('Error updating labels');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Tag className="w-5 h-5 mr-2" />
              Manage Labels
            </h2>
            <p className="text-sm text-gray-600 mt-1">{lead.company}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6">
          {availableLabels.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Select labels to apply to this lead:
              </p>
              <div className="flex flex-wrap gap-2">
                {availableLabels.map((label) => {
                  const isSelected = selectedLabels.includes(label);
                  const meta = availableLabelsMap instanceof Map
                    ? availableLabelsMap.get(label)
                    : availableLabelsMap?.[label];
                  const color = meta?.color ?? '#9CA3AF';
                  return (
                    <button
                      key={label}
                      onClick={() => toggleLabel(label)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isSelected ? 'shadow-md' : 'bg-transparent'}`}
                      style={
                        isSelected
                          ? { backgroundColor: color, color: getContrastText(color) }
                          : { border: `1px solid ${color}`, color }
                      }
                    >
                      <Tag className="w-3 h-3 inline mr-1" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Tag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No labels configured</p>
              <p className="text-sm text-gray-500 mt-1">
                Please configure labels in the system settings
              </p>
            </div>
          )}
        </div>

        <div className="flex space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors duration-200 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || availableLabels.length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-lg transition-colors duration-200 font-medium flex items-center justify-center"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Labels
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLeads;