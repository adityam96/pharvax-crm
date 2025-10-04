// Utility functions

import { getCallStatusConfig } from "./configDataService";

// Map call status to lead status
export const getLeadStatusFromCallStatus = (callStatus: string) => {
  return getCallStatusConfig().then((config) => {
    if (config && config[callStatus]) {
      console.log('Mapping call status:', callStatus, 'to lead status:', config[callStatus]['lead_status']);
      return config[callStatus]['lead_status'];
    }
  }).catch((error) => {
    console.error('Error getting call statuses from config:', error);
    return callStatus
  });
}


export const getCallTitle = async (callStatus: string) => {
  try {
    const config = await getCallStatusConfig();
    const title = config?.[callStatus]?.['display_title'];
    console.log('Call status title from config:', title);
    return title ?? callStatus;
  } catch (error) {
    console.error('Error getting call statuses from config:', error);
    return callStatus;
  }
};