/**
 * Database service layer for mixing sessions
 * Provides business logic and data transformation for session operations
 */

import { supabase, getCurrentUser } from './client'
import type {
  Database,
  MixingSession,
  MixingSessionDetail,
  CreateSessionRequest,
  UpdateSessionRequest,
  SessionListParams,
  MixingFormula,
  ColorValue,
} from '@/types/types'

type SessionRow = Database['public']['Tables']['mixing_sessions']['Row']
type SessionInsert = Database['public']['Tables']['mixing_sessions']['Insert']
type SessionUpdate = Database['public']['Tables']['mixing_sessions']['Update']

/**
 * Transform database row to API response format
 */
function transformSessionRow(row: SessionRow): MixingSession {
  return {
    id: row.id,
    session_type: row.session_type,
    custom_label: row.custom_label || undefined,
    is_favorite: row.is_favorite,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/**
 * Transform database row with related data to detailed session
 */
function transformSessionDetail(
  row: SessionRow & {
    mixing_formulas?: Array<{
      id: string
      total_volume_ml: number
      mixing_order: string[] | null
      formula_items: Array<{
        id: string
        paint_id: string
        volume_ml: number
        percentage: number
      }>
    }>
  }
): MixingSessionDetail {
  const baseSession = transformSessionRow(row)

  // Extract color information
  const target_color: ColorValue | undefined = row.target_color_hex ? {
    hex: row.target_color_hex,
    lab: {
      l: row.target_color_lab_l || 0,
      a: row.target_color_lab_a || 0,
      b: row.target_color_lab_b || 0,
    },
  } : undefined

  const calculated_color: ColorValue | undefined = row.calculated_color_hex ? {
    hex: row.calculated_color_hex,
    lab: {
      l: row.calculated_color_lab_l || 0,
      a: row.calculated_color_lab_a || 0,
      b: row.calculated_color_lab_b || 0,
    },
  } : undefined

  // Extract formula information
  const formula: MixingFormula | undefined = row.mixing_formulas?.[0] ? {
    total_volume_ml: row.mixing_formulas[0].total_volume_ml,
    paint_ratios: row.mixing_formulas[0].formula_items.map(item => ({
      paint_id: item.paint_id,
      volume_ml: Number(item.volume_ml),
      percentage: Number(item.percentage),
    })),
    mixing_order: row.mixing_formulas[0].mixing_order || undefined,
  } : undefined

  return {
    ...baseSession,
    input_method: row.input_method,
    target_color,
    calculated_color,
    delta_e: row.delta_e ? Number(row.delta_e) : undefined,
    formula,
    notes: row.notes || undefined,
    image_url: row.image_url || undefined,
  }
}

/**
 * Transform API request to database insert format
 */
function transformCreateRequest(
  request: CreateSessionRequest,
  userId: string
): SessionInsert {
  return {
    user_id: userId,
    session_type: request.session_type,
    input_method: request.input_method,
    target_color_hex: request.target_color?.hex,
    target_color_lab_l: request.target_color?.lab.l,
    target_color_lab_a: request.target_color?.lab.a,
    target_color_lab_b: request.target_color?.lab.b,
    calculated_color_hex: request.calculated_color?.hex,
    calculated_color_lab_l: request.calculated_color?.lab.l,
    calculated_color_lab_a: request.calculated_color?.lab.a,
    calculated_color_lab_b: request.calculated_color?.lab.b,
    delta_e: request.delta_e,
    custom_label: request.custom_label,
    notes: request.notes,
    image_url: request.image_url,
    is_favorite: false, // Default to not favorite
  }
}

/**
 * Session service class with business logic
 */
export class SessionService {
  /**
   * List sessions for current user
   */
  static async listSessions(params: SessionListParams = {}) {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const {
      limit = 20,
      offset = 0,
      favorites_only = false,
      session_type,
    } = params

    let query = supabase
      .from('mixing_sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (session_type) {
      query = query.eq('session_type', session_type)
    }

    if (favorites_only) {
      query = query.eq('is_favorite', true)
    }

    // Get total count for pagination
    const { count } = await query.select('*', { count: 'exact', head: true })

    // Get paginated results
    const { data, error } = await query
      .range(offset, offset + limit - 1)

    if (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`)
    }

    const sessions = data?.map(transformSessionRow) || []
    const totalCount = count || 0
    const hasMore = offset + limit < totalCount

    return {
      sessions,
      total_count: totalCount,
      has_more: hasMore,
    }
  }

  /**
   * Get session by ID with full details
   */
  static async getSession(sessionId: string): Promise<MixingSessionDetail> {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('mixing_sessions')
      .select(`
        *,
        mixing_formulas (
          id,
          total_volume_ml,
          mixing_order,
          formula_items (
            id,
            paint_id,
            volume_ml,
            percentage
          )
        )
      `)
      .eq('id', sessionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Session not found')
      }
      throw new Error(`Failed to fetch session: ${error.message}`)
    }

    return transformSessionDetail(data)
  }

  /**
   * Create new session
   */
  static async createSession(request: CreateSessionRequest): Promise<MixingSession> {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Validate request
    if (!request.session_type || !request.input_method) {
      throw new Error('Session type and input method are required')
    }

    const sessionData = transformCreateRequest(request, user.id)

    const { data, error } = await supabase
      .from('mixing_sessions')
      .insert(sessionData as any)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`)
    }

    const session = transformSessionRow(data)

    // Create formula if provided
    if (request.formula) {
      await SessionService.saveFormula(session.id, request.formula)
    }

    return session
  }

  /**
   * Update existing session
   */
  static async updateSession(
    sessionId: string,
    updates: UpdateSessionRequest
  ): Promise<MixingSession> {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const updateData: SessionUpdate = {
      custom_label: updates.custom_label,
      notes: updates.notes,
      is_favorite: updates.is_favorite,
    }

    const { data, error } = await supabase
      .from('mixing_sessions')
      .update(updateData as any)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Session not found')
      }
      throw new Error(`Failed to update session: ${error.message}`)
    }

    return transformSessionRow(data)
  }

  /**
   * Delete session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { error } = await supabase
      .from('mixing_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      throw new Error(`Failed to delete session: ${error.message}`)
    }
  }

  /**
   * Save formula for session
   */
  static async saveFormula(sessionId: string, formula: MixingFormula): Promise<void> {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Start transaction
    const { data: formulaData, error: formulaError } = await supabase
      .from('mixing_formulas')
      .insert({
        session_id: sessionId,
        total_volume_ml: formula.total_volume_ml,
        mixing_order: formula.mixing_order || null,
      } as any)
      .select()
      .single()

    if (formulaError) {
      throw new Error(`Failed to save formula: ${formulaError.message}`)
    }

    // Validate paint ratios sum to 100%
    const totalPercentage = formula.paint_ratios.reduce((sum, ratio) => sum + ratio.percentage, 0)
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Paint ratios must sum to 100%')
    }

    // Insert formula items
    const formulaItems = formula.paint_ratios.map(ratio => ({
      formula_id: formulaData.id,
      paint_id: ratio.paint_id,
      volume_ml: ratio.volume_ml,
      percentage: ratio.percentage,
    }))

    const { error: itemsError } = await supabase
      .from('formula_items')
      .insert(formulaItems as any)

    if (itemsError) {
      // Cleanup formula if items insertion fails
      await supabase
        .from('mixing_formulas')
        .delete()
        .eq('id', formulaData.id)

      throw new Error(`Failed to save formula items: ${itemsError.message}`)
    }
  }

  /**
   * Toggle favorite status
   */
  static async toggleFavorite(sessionId: string): Promise<MixingSession> {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get current state
    const { data: currentData, error: selectError } = await supabase
      .from('mixing_sessions')
      .select('is_favorite')
      .eq('id', sessionId)
      .single()

    if (selectError) {
      throw new Error('Session not found')
    }

    // Toggle favorite status
    const { data, error } = await supabase
      .from('mixing_sessions')
      .update({ is_favorite: !currentData.is_favorite } as any)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to toggle favorite: ${error.message}`)
    }

    return transformSessionRow(data)
  }

  /**
   * Get user's favorite sessions
   */
  static async getFavorites(limit: number = 10): Promise<MixingSession[]> {
    const { sessions } = await SessionService.listSessions({
      favorites_only: true,
      limit,
    })

    return sessions
  }

  /**
   * Search sessions by custom label
   */
  static async searchSessions(query: string, limit: number = 20): Promise<MixingSession[]> {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('mixing_sessions')
      .select('*')
      .ilike('custom_label', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Failed to search sessions: ${error.message}`)
    }

    return data?.map(transformSessionRow) || []
  }
}

export default SessionService