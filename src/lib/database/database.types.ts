export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      enhanced_paints: {
        Row: {
          id: string
          user_id: string
          collection_id: string | null
          name: string
          brand: string
          product_line: string | null
          color_code: string | null
          finish_type: 'matte' | 'satin' | 'semi_gloss' | 'gloss' | 'high_gloss'
          lab_color: Json
          rgb_color: Json
          hex_color: string
          optical_properties: Json
          volume_ml: number
          cost_per_ml: number
          viscosity: number | null
          density_g_per_ml: number | null
          mixing_compatibility: Json
          mixing_restrictions: Json
          drying_time_minutes: number | null
          coverage_sqm_per_liter: number | null
          delta_e_tolerance: number
          color_stability_rating: number
          lightfastness_rating: number | null
          times_used: number
          total_volume_mixed: number
          last_used_at: string | null
          color_accuracy_verified: boolean
          optical_properties_calibrated: boolean
          calibration_date: string | null
          quality_control_notes: string | null
          tags: Json
          notes: string | null
          purchase_date: string | null
          expiry_date: string | null
          supplier: string | null
          created_at: string
          updated_at: string
          version: number
          archived: boolean
          archived_at: string | null
          archived_reason: string | null
        }
        Insert: {
          id?: string
          user_id: string
          collection_id?: string | null
          name: string
          brand: string
          product_line?: string | null
          color_code?: string | null
          finish_type: 'matte' | 'satin' | 'semi_gloss' | 'gloss' | 'high_gloss'
          lab_color: Json
          rgb_color: Json
          hex_color: string
          optical_properties: Json
          volume_ml: number
          cost_per_ml: number
          viscosity?: number | null
          density_g_per_ml?: number | null
          mixing_compatibility?: Json
          mixing_restrictions?: Json
          drying_time_minutes?: number | null
          coverage_sqm_per_liter?: number | null
          delta_e_tolerance?: number
          color_stability_rating?: number
          lightfastness_rating?: number | null
          times_used?: number
          total_volume_mixed?: number
          last_used_at?: string | null
          color_accuracy_verified?: boolean
          optical_properties_calibrated?: boolean
          calibration_date?: string | null
          quality_control_notes?: string | null
          tags?: Json
          notes?: string | null
          purchase_date?: string | null
          expiry_date?: string | null
          supplier?: string | null
          created_at?: string
          updated_at?: string
          version?: number
          archived?: boolean
          archived_at?: string | null
          archived_reason?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          collection_id?: string | null
          name?: string
          brand?: string
          product_line?: string | null
          color_code?: string | null
          finish_type?: 'matte' | 'satin' | 'semi_gloss' | 'gloss' | 'high_gloss'
          lab_color?: Json
          rgb_color?: Json
          hex_color?: string
          optical_properties?: Json
          volume_ml?: number
          cost_per_ml?: number
          viscosity?: number | null
          density_g_per_ml?: number | null
          mixing_compatibility?: Json
          mixing_restrictions?: Json
          drying_time_minutes?: number | null
          coverage_sqm_per_liter?: number | null
          delta_e_tolerance?: number
          color_stability_rating?: number
          lightfastness_rating?: number | null
          times_used?: number
          total_volume_mixed?: number
          last_used_at?: string | null
          color_accuracy_verified?: boolean
          optical_properties_calibrated?: boolean
          calibration_date?: string | null
          quality_control_notes?: string | null
          tags?: Json
          notes?: string | null
          purchase_date?: string | null
          expiry_date?: string | null
          supplier?: string | null
          created_at?: string
          updated_at?: string
          version?: number
          archived?: boolean
          archived_at?: string | null
          archived_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enhanced_paints_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "paint_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enhanced_paints_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      paint_collections: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          color_space: 'sRGB' | 'Adobe_RGB' | 'ProPhoto_RGB' | 'Lab'
          is_default: boolean
          paint_count: number
          total_volume_ml: number
          average_cost_per_ml: number
          tags: Json
          created_at: string
          updated_at: string
          archived: boolean
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          color_space?: 'sRGB' | 'Adobe_RGB' | 'ProPhoto_RGB' | 'Lab'
          is_default?: boolean
          paint_count?: number
          total_volume_ml?: number
          average_cost_per_ml?: number
          tags?: Json
          created_at?: string
          updated_at?: string
          archived?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          color_space?: 'sRGB' | 'Adobe_RGB' | 'ProPhoto_RGB' | 'Lab'
          is_default?: boolean
          paint_count?: number
          total_volume_ml?: number
          average_cost_per_ml?: number
          tags?: Json
          created_at?: string
          updated_at?: string
          archived?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "paint_collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      mixing_history: {
        Row: {
          id: string
          user_id: string
          target_color: Json
          achieved_color: Json
          delta_e_achieved: number
          paint_volumes: Json
          total_volume_ml: number
          mixing_time_minutes: number
          algorithm_used: string
          iterations_completed: number
          optimization_time_ms: number
          convergence_achieved: boolean
          color_accuracy_score: number | null
          mixing_efficiency_score: number | null
          cost_effectiveness_score: number | null
          project_name: string | null
          surface_type: string | null
          application_method: string | null
          environmental_conditions: Json | null
          user_satisfaction_rating: number | null
          notes: string | null
          would_use_again: boolean | null
          created_at: string
          updated_at: string
          archived: boolean
        }
        Insert: {
          id?: string
          user_id: string
          target_color: Json
          achieved_color: Json
          delta_e_achieved: number
          paint_volumes: Json
          total_volume_ml: number
          mixing_time_minutes: number
          algorithm_used: string
          iterations_completed: number
          optimization_time_ms: number
          convergence_achieved: boolean
          color_accuracy_score?: number | null
          mixing_efficiency_score?: number | null
          cost_effectiveness_score?: number | null
          project_name?: string | null
          surface_type?: string | null
          application_method?: string | null
          environmental_conditions?: Json | null
          user_satisfaction_rating?: number | null
          notes?: string | null
          would_use_again?: boolean | null
          created_at?: string
          updated_at?: string
          archived?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          target_color?: Json
          achieved_color?: Json
          delta_e_achieved?: number
          paint_volumes?: Json
          total_volume_ml?: number
          mixing_time_minutes?: number
          algorithm_used?: string
          iterations_completed?: number
          optimization_time_ms?: number
          convergence_achieved?: boolean
          color_accuracy_score?: number | null
          mixing_efficiency_score?: number | null
          cost_effectiveness_score?: number | null
          project_name?: string | null
          surface_type?: string | null
          application_method?: string | null
          environmental_conditions?: Json | null
          user_satisfaction_rating?: number | null
          notes?: string | null
          would_use_again?: boolean | null
          created_at?: string
          updated_at?: string
          archived?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "mixing_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_paint_stats: {
        Args: {
          user_uuid: string
        }
        Returns: {
          total_paints: number
          total_collections: number
          total_volume_ml: number
          average_delta_e: number
          most_used_brand: string
          mixing_sessions: number
        }[]
      }
      search_paints_by_color: {
        Args: {
          user_uuid: string
          target_lab: Json
          max_delta_e: number
          limit_count: number
        }
        Returns: {
          id: string
          name: string
          brand: string
          lab_color: Json
          delta_e_distance: number
        }[]
      }
      get_mixing_recommendations: {
        Args: {
          user_uuid: string
          target_color: Json
          max_paints: number
        }
        Returns: {
          paint_id: string
          paint_name: string
          recommended_volume: number
          confidence_score: number
        }[]
      }
      update_paint_usage_stats: {
        Args: {
          paint_uuid: string
          volume_used: number
        }
        Returns: boolean
      }
    }
    Enums: {
      finish_type: 'matte' | 'satin' | 'semi_gloss' | 'gloss' | 'high_gloss'
      color_space: 'sRGB' | 'Adobe_RGB' | 'ProPhoto_RGB' | 'Lab'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Utility types for working with the database
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Type aliases for common database operations
export type EnhancedPaintRow = Tables<'enhanced_paints'>
export type EnhancedPaintInsert = InsertTables<'enhanced_paints'>
export type EnhancedPaintUpdate = UpdateTables<'enhanced_paints'>

export type PaintCollectionRow = Tables<'paint_collections'>
export type PaintCollectionInsert = InsertTables<'paint_collections'>
export type PaintCollectionUpdate = UpdateTables<'paint_collections'>

export type MixingHistoryRow = Tables<'mixing_history'>
export type MixingHistoryInsert = InsertTables<'mixing_history'>
export type MixingHistoryUpdate = UpdateTables<'mixing_history'>

// Database function result types
export type UserPaintStats = Database['public']['Functions']['get_user_paint_stats']['Returns'][0]
export type ColorSearchResult = Database['public']['Functions']['search_paints_by_color']['Returns'][0]
export type MixingRecommendation = Database['public']['Functions']['get_mixing_recommendations']['Returns'][0]

// Common filter and sort types
export type PaintSortField =
  | 'name'
  | 'brand'
  | 'created_at'
  | 'updated_at'
  | 'last_used_at'
  | 'times_used'
  | 'volume_ml'
  | 'cost_per_ml'

export type SortDirection = 'asc' | 'desc'

export interface PaintFilters {
  brand?: string
  finish_type?: Database['public']['Enums']['finish_type']
  collection_id?: string
  tags?: string[]
  min_volume?: number
  max_volume?: number
  min_cost?: number
  max_cost?: number
  color_verified?: boolean
  calibrated?: boolean
  archived?: boolean
}

export interface PaginationOptions {
  page: number
  limit: number
  sort_field?: PaintSortField
  sort_direction?: SortDirection
}

// Response wrapper types
export interface DatabaseResponse<T> {
  data: T | null
  error: {
    code: string
    message: string
    details?: string
  } | null
  count?: number
}

export interface PaginatedResponse<T> extends DatabaseResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total_count: number
    total_pages: number
    has_next: boolean
    has_previous: boolean
  }
}

// Query builder helpers
export interface QueryOptions {
  select?: string
  count?: 'exact' | 'planned' | 'estimated'
  head?: boolean
  single?: boolean
}

// Real-time subscription types
export type RealtimePayload<T = any> = {
  schema: string
  table: string
  commit_timestamp: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: T
  old?: T
  errors?: string[]
}

export type SubscriptionCallback<T = any> = (payload: RealtimePayload<T>) => void

// Error handling types
export interface SupabaseError {
  code: string
  message: string
  details?: string
  hint?: string
}

export const isSupabaseError = (error: any): error is SupabaseError => {
  return error && typeof error.code === 'string' && typeof error.message === 'string'
}

// Database utility functions
export const createDatabaseError = (
  code: string,
  message: string,
  details?: string
): SupabaseError => ({
  code,
  message,
  details
})

export const formatDatabaseTimestamp = (timestamp: string): Date => {
  return new Date(timestamp)
}

export const isDatabaseTimestamp = (value: any): value is string => {
  return typeof value === 'string' && !isNaN(Date.parse(value))
}