import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, getCurrentUser, onAuthStateChange, isSupabaseConfigured } from '../lib/supabase'

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
  const [isConfigured] = useState(isSupabaseConfigured())

  useEffect(() => {
    console.log("In useeffect")
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
        fetchUserProfile(user.id).then(() => {
          console.log('Profile fetch completed, stopping loading')
          setLoading(false)
        }).catch((err) => {
          console.error('Profile fetch failed:', err)
          setLoading(false)
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
        try {
          console.log('Auth state change - fetching profile for:', session.user.id)
          await fetchUserProfile(session.user.id)
          console.log('Auth state change - profile fetch completed successfully')
          setLoading(false)
        } catch (error) {
          console.error('Profile fetch failed during auth change:', error)
          // Don't let profile fetch failure block the auth flow
          setUserProfile(null)
        }
      } else {
        console.log('Auth state change - no user, clearing profile')
        setUserProfile(null)
      }
      console.log('Auth state change - setting loading to false')
      // setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [isConfigured])

  function withTimeout<T>(p: Promise<T>, ms: number, label = 'Timeout'): Promise<T> {
    try {
      return new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(label)), ms);
      p.then(
        (v) => { clearTimeout(t); resolve(v); },
        (e) => { clearTimeout(t); resolve(e); }
      );
    });
    } catch (error) {
      // do nothing
    }
  }

  const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
    
  const fetchUserProfile = async (userId: string) => {
    console.log('fetchUserProfile called with userId:', userId)
    if (!isConfigured) return
    
    try {
      console.log('About to query user_profiles table...')
      console.log('Querying with userId:', userId)

      // Retry logic for database calls
      let result;
      let attempts = 0;
      const maxAttempts = 1;
      
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`Database query attempt ${attempts}/${maxAttempts}`);
        
        try {
          result = await withTimeout(
            supabase
              .from('user_profiles')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle(),
            attempts === 1 ? 5_000 : 3_000, // First attempt gets 5s, others get 3s
            `DB timeout: user_profiles read exceeded ${attempts === 1 ? 5 : 3}s (attempt ${attempts})`
          );
          break; // Success, exit retry loop
        } catch (error) {
          console.log(`Attempt ${attempts} failed:`, error);
          if (attempts === maxAttempts) {
            throw error; // Re-throw on final attempt
          }
          // Wait before retry
          await sleep(1000);
        }
      }

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
    } catch (error) {
      console.error('Error fetching user profile:', error)
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
        return { error: null }
      } else {
        return { error: { message: 'Invalid demo credentials. Use admin@pharvax.com or employee@pharvax.com with password123' } }
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error }
      }

      return { error: null }
    } catch (error) {
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
      // Clear all possible storage locations
      localStorage.clear()
      sessionStorage.clear()
      
      // Clear state
      setUser(null)
      setUserProfile(null)
      
      // Try Supabase signOut if configured
      if (isConfigured) {
        await supabase.auth.signOut()
      }
      
      // Force reload to ensure clean state
      window.location.href = '/login'
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