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

export const getContrastText = (hex?: string) => {
  if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return 'white';
  const expand = (h: string) => (h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h);
  const c = expand(hex).slice(1);
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b); // 0-255
  return lum > 150 ? 'black' : 'white';
};