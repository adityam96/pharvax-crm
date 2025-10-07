import React, { useEffect } from 'react';
import { Phone, Mail, Tag } from 'lucide-react';
import { getLeadLabelsConfig } from '../lib/configDataService';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Open' | 'In Progress' | 'Closed';
  company?: string;
  establishmentType?: string;
}

interface LeadCardProps {
  lead: Lead;
  onLogCall: (lead: Lead) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onLogCall }) => {
  const [availableLabels, setAvailableLabels] = React.useState([]);
  const [availableLabelsMap, setAvailableLabelsMap] = React.useState({});

  // Fetch leads from database
  useEffect(() => {
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

  return (
    <div
      onClick={() => onLogCall(lead)}
      className="bg-white rounded-lg border border-gray-200 p-4 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{lead.company}</h3>
          {lead.establishmentType && (
            <p className="text-sm text-blue-600 font-medium mb-1">{lead.establishmentType}</p>
          )}
          {lead.name && (
            <p className="text-sm text-gray-700 mb-1">POC: {lead.name}</p>
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

      <div className="space-y-2 mb-4">
        <div className="flex items-center space-x-2 text-gray-600">
          <Mail className="w-4 h-4" />
          <span className="text-sm">{lead.email}</span>
        </div>
        <div className="flex items-center space-x-2 text-gray-600">
          <Phone className="w-4 h-4" />
          <span className="text-sm">{lead.phone}</span>
        </div>
      </div>

      {/* Labels Section */}
      {lead.labels && lead.labels.length > 0 && (
        <div className="space-y-2 mb-4 mt-3 pt-3 border-t border-gray-200">
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
      <div className="pt-3 border-t border-gray-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLogCall(lead);
          }}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors duration-200 font-medium text-sm"
        >
          Log Call
        </button>
      </div>
    </div>
  );
};

export default LeadCard;