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

export const formatLocal = (isoString: string) => {
  // JS Date only keeps milliseconds; trim extra fractional digits if needed
  const safe = isoString.replace(/(\.\d{3})\d+/, "$1");
  const d = new Date(safe);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}