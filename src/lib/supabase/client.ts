/**
 * Supabase client configuration
 * Provides typed client with database schema and authentication
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

/**
 * Supabase client with typed database schema
 * Configured for client-side usage with anonymous key
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Use PKCE flow for better security
  },
  global: {
    headers: {
      'x-application-name': 'PaintMixr',
    },
  },
})

/**
 * Server-side Supabase client for API routes
 * Uses service role key for admin operations
 */
export const createServerSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-application-name': 'PaintMixr-Server',
      },
    },
  })
}

/**
 * Get current user session
 */
export const getCurrentUser = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Error getting user session:', error)
    return null
  }

  return session?.user || null
}

/**
 * Sign in with email and password
 */
export const signInWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Sign up with email and password
 */
export const signUpWithPassword = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Sign out current user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Reset password
 */
export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Update user password
 */
export const updatePassword = async (password: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback)
}

/**
 * Upload image to Supabase Storage
 */
export const uploadImage = async (file: File, bucket: string = 'images') => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  const filePath = `${fileName}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file)

  if (error) {
    throw new Error(error.message)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return {
    path: data.path,
    publicUrl,
  }
}

/**
 * Delete image from Supabase Storage
 */
export const deleteImage = async (path: string, bucket: string = 'images') => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Database helper for type-safe queries
 */
export const db = {
  /**
   * Get sessions for current user
   */
  sessions: {
    list: async (params?: {
      limit?: number
      offset?: number
      favorites_only?: boolean
      session_type?: 'color_matching' | 'ratio_prediction'
    }) => {
      let query = supabase
        .from('mixing_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (params?.session_type) {
        query = query.eq('session_type', params.session_type)
      }

      if (params?.favorites_only) {
        query = query.eq('is_favorite', true)
      }

      if (params?.limit) {
        query = query.limit(params.limit)
      }

      if (params?.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 20) - 1)
      }

      return query
    },

    get: async (id: string) => {
      return supabase
        .from('mixing_sessions')
        .select(`
          *,
          mixing_formulas (
            *,
            formula_items (*)
          )
        `)
        .eq('id', id)
        .single()
    },

    create: async (session: Database['public']['Tables']['mixing_sessions']['Insert']) => {
      return supabase
        .from('mixing_sessions')
        .insert(session)
        .select()
        .single()
    },

    update: async (id: string, updates: Database['public']['Tables']['mixing_sessions']['Update']) => {
      return supabase
        .from('mixing_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
    },

    delete: async (id: string) => {
      return supabase
        .from('mixing_sessions')
        .delete()
        .eq('id', id)
    },
  },

  /**
   * Formula operations
   */
  formulas: {
    create: async (formula: Database['public']['Tables']['mixing_formulas']['Insert']) => {
      return supabase
        .from('mixing_formulas')
        .insert(formula)
        .select()
        .single()
    },

    delete: async (id: string) => {
      return supabase
        .from('mixing_formulas')
        .delete()
        .eq('id', id)
    },
  },

  /**
   * Formula items operations
   */
  formulaItems: {
    createMany: async (items: Database['public']['Tables']['formula_items']['Insert'][]) => {
      return supabase
        .from('formula_items')
        .insert(items)
        .select()
    },

    deleteByFormula: async (formulaId: string) => {
      return supabase
        .from('formula_items')
        .delete()
        .eq('formula_id', formulaId)
    },
  },
}

export default supabase