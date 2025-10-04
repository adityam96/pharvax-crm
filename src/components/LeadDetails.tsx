import React from 'react';
import { ArrowLeft, Phone, Mail, Building, User, Calendar } from 'lucide-react';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Open' | 'In Progress' | 'Closed';
  company?: string;
  establishmentType?: string;
}

interface LeadDetailsProps {
  lead: Lead;
  onBack: () => void;
  onEdit: () => void;
}

const LeadDetails: React.FC<LeadDetailsProps> = ({ lead, onBack, onEdit }) => {
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
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm h-fit">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="mr-3 p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-semibold text-gray-900">Lead Details</h2>
      </div>

      <div className="space-y-6">
        {/* Lead Name and Status */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1">{lead.company}</h3>
            {lead.establishmentType && (
              <div className="flex items-center text-blue-600 mb-2">
                <Building className="w-4 h-4 mr-2" />
                <span className="font-medium">{lead.establishmentType}</span>
              </div>
            )}
            {lead.company && (
              <div className="flex items-center text-gray-700 mb-2">
                <User className="w-4 h-4 mr-2" />
                <span>POC: {lead.name}</span>
              </div>
            )}
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
              lead.status
            )}`}
          >
            {lead.status}
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
                <p className="text-gray-900">{lead.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="text-gray-900">{lead.phone}</p>
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
                <p className="text-gray-900">#{lead.id}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-gray-900">2 days ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={onEdit}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 font-medium"
          >
            Edit Lead
          </button>
          <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors duration-200 font-medium">
            Convert
          </button>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
            Recent Activity
          </h4>

          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-1">Lead created</p>
              <p className="text-xs text-gray-500">2 days ago</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-1">Status updated to {lead.status}</p>
              <p className="text-xs text-gray-500">1 day ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadDetails;