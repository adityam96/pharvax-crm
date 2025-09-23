import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, getCurrentUser, onAuthStateChange, isSupabaseConfigured } from '../lib/supabase'
import { userCache } from '../lib/userCache'

interface AuthContextType {
  user: User | null
  userProfile: any | null
  loading: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const isConfigured = isSupabaseConfigured()

  useEffect(() => {
    console.log("In useeffect")
    
    // Check cache first
    const cachedUser = userCache.getUser();
    const cachedProfile = userCache.getProfile();
    
    if (cachedUser && cachedProfile && userCache.isValid()) {
      console.log('Using cached user data');
      setUser(cachedUser);
      setUserProfile(cachedProfile);
      setLoading(false);
      return;
    }
    
    // If Supabase is not configured, just stop loading
    if (!isConfigured) {
      console.log('Supabase not configured, stopping loading')
      setLoading(false)
      return
    }

  
    getCurrentUser().then(({ user, error }) => {
      console.log('Initial user fetch result:', { user: user?.email, error })
      if (!error && user) {
        setUser(user)
        userCache.setUser(user)
        fetchUserProfileWithRetry(user.id, "initial user fetch").then(() => {
          console.log('Profile fetch completed, stopping loading')
          setLoading(false)
        }).catch((err) => {
          console.error('Profile fetch failed:', err)
          // If it's a timeout error, the session was already cleared
          if (!err.message?.includes('timeout after 10 seconds')) {
            setLoading(false)
          }
        })
      } else {
        console.log('No user or error, stopping loading')
        setLoading(false)
      }
    }).catch(() => {
      console.log('Initial user fetch failed, stopping loading')
      setLoading(false)
    })

    
    // Listen for auth changes only if configured
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.email || 'no user', session?.user)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        userCache.setUser(session.user)
      } else {
        userCache.clear()
      }
      
      if (session?.user) {
        try {
          console.log('Auth state change - fetching profile for:', session.user.id)
          await fetchUserProfileWithRetry(session.user.id, "auth state change")
          
          // Check if user is active after profile fetch
          const profile = userProfile
          if (profile && profile.is_active === false) {
            console.log('User is inactive, signing out')
            await forceSignOut()
            return
          }
          
          console.log('Auth state change - profile fetch completed successfully')
          setLoading(false)
        } catch (error) {
          console.error('Profile fetch failed during auth change:', error)
          // Loading will be handled by forceSignOut if needed
          setUserProfile(null)
          setLoading(false)
        }
      } else {
        console.log('Auth state change - no user, clearing profile')
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
    return () => {}
  }, [isConfigured])

  function withTimeout<T>(p: Promise<T>, ms: number, label = 'Timeout'): Promise<T> {
    try {
      return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(label)), ms);
        p.then(
          (v) => { clearTimeout(t); resolve(v); },
          (e) => { clearTimeout(t); reject(e); }
        );
      });
    } catch (error) {
      // do nothing
    }
  }

  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
    
  const fetchUserProfileWithRetry = async (userId: string, caller: string) => {
    console.log(`fetchUserProfileWithRetry called for userId: ${userId} from: ${caller}`)
    
    const startTime = Date.now()
    const maxDuration = 10000 // 10 seconds
    let attempts = 0
    const maxAttempts = 5
    
    while (attempts < maxAttempts) {
      const elapsedTime = Date.now() - startTime
      
      if (elapsedTime >= maxDuration) {
        console.log(`Profile fetch timeout after ${elapsedTime}ms, giving up`)
        throw new Error(`Profile fetch timeout after 10 seconds`)
      }
      
      attempts++
      console.log(`Profile fetch attempt ${attempts}/${maxAttempts} (elapsed: ${elapsedTime}ms)`)
      
      try {
        await fetchUserProfile(userId, `${caller} - attempt ${attempts}`)
        console.log(`Profile fetch successful on attempt ${attempts}`)
        return // Success!
      } catch (error) {
        // Only log as warning until the final attempt
        if (attempts >= maxAttempts || (Date.now() - startTime) >= maxDuration) {
          console.error(`Profile fetch attempt ${attempts} failed (final attempt):`, error)
          throw error
        } else {
          console.warn(`Profile fetch attempt ${attempts} failed (will retry):`, error)
        }
        
        // Wait before next attempt (but don't exceed total time limit)
        const waitTime = Math.min(2000, maxDuration - (Date.now() - startTime))
        if (waitTime > 0) {
          console.log(`Waiting ${waitTime}ms before next attempt...`)
          await sleep(waitTime)
        }
      }
    }
    
    throw new Error(`Profile fetch failed after ${maxAttempts} attempts`)
  }

  const fetchUserProfile = async (userId: string, caller: string) => {
    console.log('fetchUserProfile called with userId:', userId, ' from: ', caller)
    if (!isConfigured) return
    
    try {
      console.log('About to query user_profiles table...')
      console.log('Querying with userId:', userId)

      const result = await withTimeout(
        supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        5_000,
        `DB timeout: user_profiles read exceeded 5s`
      );

      const { data, error } = result;
      console.log('Query completed.')
      console.log('Data received:', JSON.stringify(data, null, 2))
      if (error) {
        console.log('Error received:', JSON.stringify(error, null, 2))
        console.log('Error code:', error?.code)
        console.log('Error message:', error?.message)
      }
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error)
        throw error
      }

      if (!data) {
        console.log('No data returned from query')
        setUserProfile(null)
        return
      }

      console.log('Setting user profile to:', data)
      setUserProfile(data)
      userCache.setProfile(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      
      // If this is a timeout after 10 seconds, clear the session
      if (error.message?.includes('timeout after 10 seconds')) {
        console.log('Profile fetch failed after 10 seconds, clearing session and redirecting to login')
        await forceSignOut()
        return
      }
      
      setUserProfile(null)
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      // Demo mode - simulate authentication
      if ((email === 'admin@pharvax.com' || email === 'employee@pharvax.com') && password === 'password123') {
        const mockUser = {
          id: email === 'admin@pharvax.com' ? 'admin-123' : 'employee-123',
          email: email,
          user_metadata: {
            name: email === 'admin@pharvax.com' ? 'Admin User' : 'Employee User'
          }
        }
        
        const mockProfile = {
          name: email === 'admin@pharvax.com' ? 'Admin User' : 'Employee User',
          role: email === 'admin@pharvax.com' ? 'admin' : 'employee'
        }
        
        setUser(mockUser as User)
        setUserProfile(mockProfile)
        userCache.setUser(mockUser)
        userCache.setProfile(mockProfile)
        setLoading(false)
        return { error: null }
      } else {
        return { error: { message: 'Invalid demo credentials. Use admin@pharvax.com or employee@pharvax.com with password123' } }
      }
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setLoading(false)
        return { error }
      }

      if (data.user) {
        setUser(data.user)
        userCache.setUser(data.user)
        try {
          await fetchUserProfile(data.user.id, "sign in")
          
          // Check if user is active after fetching profile
          if (userProfile && userProfile.is_active === false) {
            await signOut()
            return { error: { message: 'Your account has been deactivated. Please contact your administrator.' } }
          }
        } catch (profileError) {
          console.error('Profile fetch failed during sign in:', profileError)
          // Don't set loading to false here - let the retry mechanism handle it
          return { error: null } // Return success since auth worked
        }
      }
      
      setLoading(false)
      return { error: null }
    } catch (error) {
      setLoading(false)
      return { error }
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    console.log("SignUp called")
    if (!isConfigured) {
      // In demo mode, simulate successful signup
      console.log("In demo mode, simulate successful signup")
      return { error: null }
    }

    try {
      console.log("Supabase signup")
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })

      if (error) {
        console.log("Error in supabase signup: ")
        console.log(error)
        return { error }
      }

      console.log("Create user profile after successful signup")
      // Create user profile after successful signup
      if (data.user && !error) {
        try {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert([
              {
                user_id: data.user.id,
                name: metadata?.name || '',
                role: metadata?.role || 'employee',
                position: metadata?.position || '',
                department: metadata?.department || 'Sales',
                location: metadata?.location || '',
                phone: metadata?.phone || ''
              }
            ])

          if (profileError) {
            console.error('Error creating user profile:', profileError)
            // Don't fail the signup if profile creation fails
            // The user can still sign in, just without a profile
          } else {
            console.log("user_profiles added")
          }
        } catch (profileError) {
          console.error('Error creating user profile:', profileError)
        }
      }

      return { error: null }
    } catch (error) {
      console.error('Signup error:', error)
      return { error }
    }
  }

  const signOut = async () => {
    console.log('SignOut called - starting logout process')
    
    try {
      // Clear local state immediately
      console.log('Clearing user state')
      setUser(null)
      setUserProfile(null)
      userCache.clear()
      console.log('User state cleared - should redirect to login')
      
      // Force a re-render by setting loading briefly
      setLoading(true)
      setTimeout(() => setLoading(false), 100)
    } catch (error) {
      console.error('Error clearing user state:', error)
    }
    
    // Sign out from Supabase properly to clear session
    if (isConfigured) {
      console.log('Supabase configured - calling supabase.auth.signOut() in background')
      try {
        supabase.auth.signOut()
        console.log('Supabase signOut successful')
        // Clear any remaining session data
        localStorage.removeItem('sb-' + supabase.supabaseUrl.split('//')[1].split('.')[0] + '-auth-token')
        sessionStorage.clear()
      } catch (error) {
        console.error('Supabase signOut error:', error)
        // Force clear local storage even if signOut fails
        localStorage.clear()
        sessionStorage.clear()
      }
    } else {
      console.log('Demo mode - clearing local storage')
      // In demo mode, clear all storage to ensure clean logout
      localStorage.clear()
      sessionStorage.clear()
    }
  }

  // Add a function to force clear all auth data
  const forceSignOut = async () => {
    console.log('Force signOut called')
    try {
      // Clear state first
      setUser(null)
      setUserProfile(null)
      userCache.clear()
      setLoading(false)
      
      // Clear all possible storage locations
      localStorage.clear()
      sessionStorage.clear()
      
      // Try Supabase signOut if configured
      if (isConfigured) {
        await supabase.auth.signOut()
      }
      
      // Small delay to ensure state is cleared, then redirect
      setTimeout(() => {
        window.location.href = '/login'
      }, 100)
    } catch (error) {
      console.error('Force signOut error:', error)
      // Even if there's an error, force reload
      window.location.href = '/login'
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    isConfigured,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}