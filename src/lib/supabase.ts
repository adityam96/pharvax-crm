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

export const getUserProfile = async (userId: string) => {
  try {
    const result = await logSupabaseCall('getUserProfile', () => supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle())
    return result
  } catch (error) {
    return { user: null, error }
  }
}

export const getLeadsAssignedToCurrentUser = async (userProfileId: string) => {
  try {
    const { data, error } = await logSupabaseCall('getLeadsAssignedToCurrentUser', () => supabase
      .from('leads')
      .select(`
              *,
              assigned_to_profile:user_profiles!assigned_to(name)
            `)
      .eq('assigned_to', userProfileId)
      .order('created_at', { ascending: false }))
    return { data, error }
  } catch (error) {
    return { user: null, error }
  }
}

export const getAllLeads = async () => {
  try {
    const { data, error } = await logSupabaseCall('getAllLeads', () => supabase
      .from('leads')
      .select(`
          *,
          assigned_to_profile:user_profiles!assigned_to(name)
        `)
      .order('created_at', { ascending: false }))
    return { data, error }
  } catch (error) {
    return { user: null, error }
  }
}

export const getOpenLeadsCount = async () => {
  try {
    const result: any = await logSupabaseCall('getOpenLeadsCount', () =>
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Open')
    )

    // When using head: true, Supabase returns the count on result.count (data is null)
    const count: number = result?.count ?? 0
    const error = result?.error ?? null
    return { count, error }
  } catch (error) {
    console.error('getOpenLeadsCount failed:', error)
    return { count: 0, error }
  }
}

export const getActiveEmployeesCount = async () => {
  try {
    const result: any = await logSupabaseCall('getActiveEmployeesCount', () =>
      supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
    )

    // supabase returns count separately when head:true
    const count: number = result?.count ?? 0
    const error = result?.error ?? null
    return { count, error }
  } catch (error) {
    console.error('getActiveEmployeesCount failed:', error)
    return { count: 0, error }
  }
}

export const getAllActiveEmployees = async () => {
  try {
    const { data, error } = await logSupabaseCall('getAllActiveEmployees', () => supabase
      .from('user_profiles')
      .select('id, name')
      .eq('is_active', true)
      .order('name'))
    return { data, error }
  } catch (error) {
    return { user: null, error }
  }
}

export const getAllEmployees = async () => {
  try {
    const { data, error } = await logSupabaseCall('getAllEmployees', () => supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false }))
    return { data, error }
  } catch (error) {
    return { user: null, error }
  }
}

export const getChatAndFollowUps = async (leadId: string) => {
  try {
    const [chatsResponse, followupsResponse] = await logSupabaseCall('getChatAndFollowUps', () => Promise.all([
      supabase
        .from('chats')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('followups')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(10)
    ]))
    return [chatsResponse, followupsResponse]
  } catch (error) {
    return { user: null, error }
  }
}
