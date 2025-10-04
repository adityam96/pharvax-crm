// Config caching utility
interface CachedConfigData {
  config: any;
  timestamp: number;
}

const CACHE_DURATION = 5 * 1000; // in milliseconds
const CONFIG_CACHE_KEY = 'pharvax_config_cache';

export const configCache = {
  // Set config data in cache
  setConfig: (config: any) => {
    console.log('Setting config in cache:', config);
    const cacheData = {
      config,
      timestamp: Date.now()
    };
    sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(cacheData));
  },

  // Get config data from cache
  getConfig: () => {
    try {
      const cached = sessionStorage.getItem(CONFIG_CACHE_KEY);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now - cacheData.timestamp > CACHE_DURATION) {
        sessionStorage.removeItem(CONFIG_CACHE_KEY);
        return null;
      }

      return cacheData.config;
    } catch (error) {
      console.error('Error reading config cache:', error);
      sessionStorage.removeItem(CONFIG_CACHE_KEY);
      return null;
    }
  },

  // Clear all cached data
  clear: () => {
    sessionStorage.removeItem(CONFIG_CACHE_KEY);
  },

  // Check if cache is valid
  isValid: () => {
    try {
      const configCached = sessionStorage.getItem(CONFIG_CACHE_KEY);

      if (!configCached) return false;

      const configCacheData = JSON.parse(configCached);
      const now = Date.now();

      return (now - configCacheData.timestamp <= CACHE_DURATION);
    } catch (error) {
      return false;
    }
  }
};