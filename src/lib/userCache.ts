// User and profile caching utility
interface CachedUserData {
  user: any;
  userProfile: any;
  timestamp: number;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds
const USER_CACHE_KEY = 'pharvax_user_cache';
const PROFILE_CACHE_KEY = 'pharvax_profile_cache';

export const userCache = {
  // Set user data in cache
  setUser: (user: any) => {
    const cacheData = {
      user,
      timestamp: Date.now()
    };
    sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(cacheData));
  },

  // Get user data from cache
  getUser: () => {
    try {
      const cached = sessionStorage.getItem(USER_CACHE_KEY);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - cacheData.timestamp > CACHE_DURATION) {
        sessionStorage.removeItem(USER_CACHE_KEY);
        return null;
      }

      return cacheData.user;
    } catch (error) {
      console.error('Error reading user cache:', error);
      sessionStorage.removeItem(USER_CACHE_KEY);
      return null;
    }
  },

  // Set profile data in cache
  setProfile: (userProfile: any) => {
    const cacheData = {
      userProfile,
      timestamp: Date.now()
    };
    sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cacheData));
  },

  // Get profile data from cache
  getProfile: () => {
    try {
      const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (now - cacheData.timestamp > CACHE_DURATION) {
        sessionStorage.removeItem(PROFILE_CACHE_KEY);
        return null;
      }

      return cacheData.userProfile;
    } catch (error) {
      console.error('Error reading profile cache:', error);
      sessionStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }
  },

  // Clear all cached data
  clear: () => {
    sessionStorage.removeItem(USER_CACHE_KEY);
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
  },

  // Check if cache is valid
  isValid: () => {
    try {
      const userCached = sessionStorage.getItem(USER_CACHE_KEY);
      const profileCached = sessionStorage.getItem(PROFILE_CACHE_KEY);
      
      if (!userCached || !profileCached) return false;

      const userCacheData = JSON.parse(userCached);
      const profileCacheData = JSON.parse(profileCached);
      const now = Date.now();
      
      return (now - userCacheData.timestamp <= CACHE_DURATION) && 
             (now - profileCacheData.timestamp <= CACHE_DURATION);
    } catch (error) {
      return false;
    }
  }
};