import React, { useState } from 'react';
import { Search, Plus, GripVertical } from 'lucide-react';
import LeadCard from './LeadCard';
import CallLogForm from './CallLogForm';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Open' | 'In Progress' | 'Closed';
  company?: string;
}

interface DashboardProps {
  selectedLeadForCall?: Lead | null;
  onLeadCallLogged: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ selectedLeadForCall, onLeadCallLogged }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(selectedLeadForCall || null);
  const [leftPaneWidth, setLeftPaneWidth] = useState(60); // percentage
  const [isDragging, setIsDragging] = useState(false);
  
  // Update selected lead when prop changes
  React.useEffect(() => {
    if (selectedLeadForCall) {
      setSelectedLead(selectedLeadForCall);
    }
  }, [selectedLeadForCall]);

  // Sample leads data
  const [leads] = useState<Lead[]>([
    {
      id: '1',
      name: 'Dr. Rajesh Kumar',
      email: 'rajesh@apolloclinic.com',
      phone: '+91 98765 43210',
      status: 'Open',
      company: 'Apollo Medical Clinic',
      establishmentType: 'Clinic'
    },
    {
      id: '2',
      name: 'Priya Sharma',
      email: 'priya@medplusdist.in',
      phone: '+91 87654 32109',
      status: 'In Progress',
      company: 'MedPlus Distributors',
      establishmentType: 'Distributor'
    },
    {
      id: '3',
      name: 'Dr. Amit Patel',
      email: 'amit@fortishospital.com',
      phone: '+91 76543 21098',
      status: 'In Progress',
      company: 'Fortis Hospital',
      establishmentType: 'Hospital'
    },
    {
      id: '4',
      name: 'Sunita Reddy',
      email: 'sunita@reliancepharm.co.in',
      phone: '+91 65432 10987',
      status: 'Closed',
      company: 'Reliance Pharmacy Chain',
      establishmentType: 'Pharmacy'
    }
  ]);

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleLogCall = (lead: Lead) => {
    setSelectedLead(lead);
  };

  const handleLogNewCall = () => {
    setSelectedLead(null);
  };

  const handleSaveCall = (callData: any) => {
    console.log('Saving call data:', callData);
    // Implementation for saving call data
    onLeadCallLogged();
    alert('Call data saved successfully!');
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
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogNewCall}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 font-medium flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Log New Call</span>
            </button>
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

      {/* Main Content */}
      <div id="dashboard-container" className="flex flex-1 h-[calc(100vh-80px)] relative">
        {/* Left Side - Leads List */}
        <div 
          className="p-6 overflow-y-auto bg-gray-50"
          style={{ width: `${leftPaneWidth}%` }}
        >
          <div className="mb-4 sticky top-0 bg-gray-50 pb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
            <p className="text-sm text-gray-600">Manage and track your sales leads</p>
          </div>
          
          <div className="space-y-4">
            {filteredLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onLogCall={handleLogCall}
              />
            ))}
          </div>
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
    </div>
  );
};

export default Dashboard;