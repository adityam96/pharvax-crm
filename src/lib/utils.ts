// Utility functions

// Map call status to lead status
export const getLeadStatusFromCallStatus = (callStatus: string) => {
  switch (callStatus) {
    case 'list-sent':
      return 'In Progress';
    case 'follow-up-scheduled':
      return 'In Progress';
    case 'no-answer':
      return 'Open';
    case 'denied':
      return 'Failed';
    case 'converted':
      return 'Closed';
    case 'interested':
      return 'In Progress';
    case 'not-interested':
      return 'Failed';
    case 'callback-requested':
      return 'In Progress';
    default:
      return 'In Progress';
  }
}