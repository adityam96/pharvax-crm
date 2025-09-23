import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

// Create client even with placeholder values to prevent app from crashing
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseAnonKey !== 'placeholder-key' &&
    supabaseUrl &&
    supabaseAnonKey
}

// Auth helper functions
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const supabaseSignUp = async (email: string, password: string, metadata?: any) => {
  const { data, error } = await logSupabaseCall('supabaseSignUp', () => supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  }))
  return { data, error }
}

export const supabaseSignOut = async () => {
  const { error } = await logSupabaseCall('supabaseSignOut', () => supabase.auth.signOut())
  return { error }
}

export const getCurrentUser = async () => {
  try {
    console.log("inside getCurrentUser")
    // const { data: { user }, error } = await supabase.auth.getUser()
    const { data: { user }, error } = await logSupabaseCall('get current user', () => supabase.auth.getUser()
    )
    console.log("getCurrentUser result:", user)
    return { user, error }
  } catch (error) {
    return { user: null, error }
  }
}

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}

export async function logSupabaseCall<T>(
  label: string,
  callback: () => Promise<T>
): Promise<T> {
  const start = performance.now()
  try {
    const result = await callback()
    return result
  } finally {
    const end = performance.now()
    console.log(`[Supabase] ${label} took ${(end - start).toFixed(2)} ms`)
  }
}

export const signInWithPassword = async (email: string, password: string) => {
  try {
    const { data, error } = await logSupabaseCall('signInWithPassword', () => supabase.auth.signInWithPassword({
      email,
      password,
    }))
    return { data, error }
  } catch (error) {
    return { user: null, error }
  }
}
