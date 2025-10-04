import React from "react";
import { configCache } from "./configCache";
import { getAdminConfig } from "./supabase";

export const getConfig = async () => {
  try {
    console.log('Attempting to get config...');
    // get from config cache first
    var cachedConfig = configCache.getConfig();
    if (cachedConfig) {
      return cachedConfig;
    }

    // fetch from supabase if not in cache
    cachedConfig = await getAdminConfig();
    console.log('Fetched config from supabase:', cachedConfig);
    if (!cachedConfig) {
      throw new Error(`Error fetching config: ${cachedConfig.error}`);
    }
    var mappedConfig = convertToMap(cachedConfig);
    mappedConfig = Object.fromEntries(mappedConfig);
    console.log('Mapped config:', mappedConfig);
    configCache.setConfig(mappedConfig);
    return mappedConfig;
  } catch (error) {
    console.error('Failed to fetch config:', error);
    throw error;
  }
}

export const getCallStatusConfig = () => {
  return getConfig().then((config) => {
    console.log('Retrieved call statuses from config:', config);
    return config.call_statuses;
  }).catch((error) => {
    console.error('Error getting call statuses from config:', error);
    return {};
  });
}

export function convertToMap(payload: any) {
  const items = payload?.data ?? [];
  if (!Array.isArray(items) || items.length === 0) return new Map();

  // Fallback: generic Map<key, value>
  return new Map(items.map((item: any) => [item.key, item.value]));
}