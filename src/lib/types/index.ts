/**
 * Centralized Type Index
 *
 * Single source of truth for all shared TypeScript types.
 * Feature 005-use-codebase-analysis
 *
 * Usage:
 * import { ColorValue, Paint, LABColor } from '@/lib/types'
 */

// ============================================================================
// Debug Types (Feature 009-add-hamburger-menu)
// ============================================================================

/**
 * Debug log entry for session tracking
 * Stored in CircularBuffer with 5MB total size limit
 */
export interface DebugLogEntry {
  sessionId: string
  timestamp: string // ISO 8601
  message: string
  data?: unknown // Optional metadata
}

// ============================================================================
// Color Types
// ============================================================================

/**
 * LAB color space representation (CIE 1976)
 * Used for accurate color calculations and Delta E measurements
 * Note: Uses lowercase 'l' for consistency with existing codebase
 */
export interface LABColor {
  l: number // Lightness (0-100)
  a: number // Green-Red axis (-128 to 127)
  b: number // Blue-Yellow axis (-128 to 127)
}

/**
 * Validated color value with hex and LAB representations
 * Used throughout application for color accuracy (Delta E ≤ 4.0)
 */
export interface ColorValue {
  hex: string // Format: #RRGGBB (validated)
  lab: LABColor
}

/**
 * RGB color space representation (sRGB)
 * Used for display and conversion from hex
 */
export interface RGBColor {
  r: number // Red (0-255)
  g: number // Green (0-255)
  b: number // Blue (0-255)
}

// ============================================================================
// Paint Types
// ============================================================================

/**
 * Kubelka-Munk coefficients for paint mixing simulation
 * k = absorption coefficient, s = scattering coefficient
 */
export interface KubelkaMunkCoefficients {
  k: number // Absorption (0-1)
  s: number // Scattering (0-1)
}

/**
 * Paint database entry with color accuracy metadata
 */
export interface Paint {
  id: string
  name: string
  brand: string
  color: ColorValue
  opacity: number // 0-1 (0 = transparent, 1 = opaque)
  tintingStrength: number // 0-1 (0 = weak, 1 = strong)
  kubelkaMunk: KubelkaMunkCoefficients
  userId: string // RLS isolation
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/**
 * Pigment properties for Kubelka-Munk calculations
 * Used in enhanced color science calculations
 */
export interface PigmentProperties {
  k_coefficient: number // Absorption coefficient (0-1)
  s_coefficient: number // Scattering coefficient (0-1)
  opacity: number // 0-1
  tinting_strength: number // 0-1
  lab_values: LABColor
  mass_tone_lab: LABColor
  undertone_lab: LABColor
  transparency_index: number
}

/**
 * Paint for optimization algorithms
 * Simplified paint structure for optimization calculations
 */
export interface OptimizationPaint {
  id: string
  name: string
  brand?: string
  lab: LABColor
  color_space?: LABColor // Alias for lab
  k_coefficient: number
  s_coefficient: number
  opacity: number
  tinting_strength: number
  available_volume_ml?: number
  cost_per_ml?: number
}

/**
 * Color optimization result
 * Result from optimization algorithms (Differential Evolution, TPE)
 */
export interface ColorOptimizationResult {
  formula: OptimizedPaintFormula
  metrics: OptimizationPerformanceMetrics
  optimization_metadata?: {
    performance_metrics: {
      calculation_time_ms: number
      iterations_completed?: number
      convergence_achieved?: boolean
    }
  }
  warnings: string[]
  success: boolean
  error?: string
}

// ============================================================================
// Optimization Types (Domain-Specific)
// ============================================================================

/**
 * Volume constraints for optimization algorithm
 * Domain: Backend mixing calculations
 */
export interface OptimizationVolumeConstraints {
  minVolume: number // Milliliters
  maxVolume: number // Milliliters
  targetVolume?: number // Milliliters (optional)
  unit: 'ml' | 'oz' | 'gal'
}

/**
 * Extended volume constraints for optimization controls
 * Includes additional constraints for paint mixing UI
 * Used by optimization-controls.tsx component
 */
export interface ExtendedVolumeConstraints {
  min_total_volume_ml: number // Minimum total volume (ml)
  max_total_volume_ml: number // Maximum total volume (ml)
  precision_ml: number // Volume precision (ml)
  max_paint_count: number // Maximum number of paints
  min_paint_volume_ml: number // Minimum volume per paint (ml)
  asymmetric_ratios: boolean // Allow unequal paint proportions
}

/**
 * Volume constraints for UI form inputs
 * Domain: Frontend user input
 * Separate from OptimizationVolumeConstraints to handle string inputs
 */
export interface UIVolumeConstraints {
  minVolume: string // User input as string (validated later)
  maxVolume: string // User input as string
  targetVolume?: string // Optional user input
  displayUnit: string // Display format
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * User mixing session with save/load functionality
 * Note: This is the new format. Legacy API uses MixingSession (below) with different structure.
 */
export interface UserMixingSession {
  id: string
  userId: string
  name: string
  targetColor: ColorValue
  selectedPaints: string[] // Paint IDs
  mixingResult?: MixingResult
  isFavorite: boolean
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/**
 * Mixing algorithm result with accuracy metrics
 */
export interface MixingResult {
  formula: PaintProportion[]
  achievedColor: ColorValue
  deltaE: number // Color accuracy (target: ≤ 4.0)
  totalVolume: number // Milliliters
  warnings: string[] // E.g., "Target color not achievable with selected paints"
}

/**
 * Individual paint proportion in mixing formula
 */
export interface PaintProportion {
  paintId: string
  paintName: string
  proportion: number // 0-1 (percentage of total mix)
  volume: number // Milliliters
}

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * Email signin input from form validation
 * Feature: 004-add-email-add
 */
export interface EmailSigninInput {
  email: string
  password: string
}

/**
 * Email signin API response
 * Feature: 004-add-email-add
 */
export interface EmailSigninResponse {
  success: boolean
  message: string
  redirectTo?: string
  error?: string
  retryAfter?: number
}

/**
 * Lockout metadata stored in auth.users.raw_user_meta_data
 */
export interface LockoutMetadata {
  failed_login_attempts: number // 0-5
  lockout_until: string | null // ISO 8601 timestamp or null
  last_failed_attempt: string | null // ISO 8601 timestamp or null
}

/**
 * Rate limit status for authentication endpoints
 */
export interface RateLimitStatus {
  rateLimited: boolean
  requestsRemaining: number // 0-5
  windowResetAt: Date // When window expires
  retryAfter: number // Seconds until retry allowed (if rate limited)
}

// ============================================================================
// Enhanced Accuracy Mode Types (Feature 007-enhanced-mode-1)
// ============================================================================

/**
 * Enhanced Optimization Request
 * Server-side color matching optimization targeting Delta E ≤ 2.0
 */
export interface EnhancedOptimizationRequest {
  targetColor: LABColor
  availablePaints: Paint[]
  mode: 'standard' | 'enhanced'
  volumeConstraints?: VolumeConstraints
  maxPaintCount?: number // 2-5 (default: 5)
  timeLimit?: number // milliseconds (default: 28000)
  accuracyTarget?: number // Delta E (default: 2.0)
}

/**
 * Volume Constraints for Optimization
 * Used in Enhanced Mode API requests
 */
export interface VolumeConstraints {
  min_total_volume_ml: number
  max_total_volume_ml: number
  minimum_component_volume_ml?: number
  maximum_component_volume_ml?: number
  allow_scaling?: boolean
}

/**
 * Paint Ratio in Optimized Formula
 * Individual component with volume and percentage
 * Note: paint_properties accepts both Paint and PigmentProperties for compatibility
 */
export interface PaintRatio {
  paint_id: string
  paint_name?: string
  volume_ml: number
  percentage: number
  paint_properties?: Paint | PigmentProperties
}

/**
 * Optimized Paint Formula
 * Result of Enhanced mode optimization with 2-5 paint components
 */
export interface OptimizedPaintFormula {
  paintRatios: PaintRatio[]
  paint_components?: PaintRatio[] // Alias for paintRatios
  totalVolume: number
  total_volume_ml?: number // Alias for totalVolume
  predictedColor: LABColor
  achieved_color?: LABColor // Alias for predictedColor
  deltaE: number
  achieved_delta_e?: number // Alias for deltaE
  target_delta_e?: number
  accuracyRating: 'excellent' | 'good' | 'acceptable' | 'poor'
  mixingComplexity: 'simple' | 'moderate' | 'complex'
  kubelkaMunkK: number // 0-1 absorption coefficient
  kubelkaMunkS: number // 0-1 scattering coefficient
  opacity: number // 0-1
  estimated_cost?: number
}

/**
 * Optimization Performance Metrics
 * Tracking data for optimization quality and convergence
 */
export interface OptimizationPerformanceMetrics {
  timeElapsed: number // milliseconds
  iterationsCompleted: number
  algorithmUsed: 'differential_evolution' | 'tpe_hybrid' | 'auto'
  convergenceAchieved: boolean
  targetMet: boolean // Delta E ≤ accuracyTarget
  earlyTermination: boolean // Timeout forced early stop
  initialBestDeltaE: number
  finalBestDeltaE: number
  improvementRate: number // (initial - final) / initial
}

/**
 * Enhanced Optimization Response
 * Complete API response structure for /api/optimize endpoint
 */
export interface EnhancedOptimizationResponse {
  success: boolean
  formula: OptimizedPaintFormula | null
  metrics: OptimizationPerformanceMetrics | null
  warnings: string[]
  error?: string | null
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Validate hex color format (#RRGGBB)
 */
export function isValidHexColor(hex: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hex)
}

/**
 * Type guard for ColorValue interface
 */
export function isColorValue(value: unknown): value is ColorValue {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.hex === 'string' &&
    isValidHexColor(obj.hex) &&
    isLABColor(obj.lab)
  )
}

/**
 * Type guard for LABColor interface
 */
export function isLABColor(value: unknown): value is LABColor {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.l === 'number' &&
    typeof obj.a === 'number' &&
    typeof obj.b === 'number' &&
    obj.l >= 0 && obj.l <= 100 &&
    obj.a >= -128 && obj.a <= 127 &&
    obj.b >= -128 && obj.b <= 127
  )
}

// ============================================================================
// Legacy API Types (from /src/types/types.ts - consolidated during Feature 010)
// ============================================================================

/**
 * Paint color from legacy API
 * Compatible with Supabase paints table structure
 */
export interface PaintColor {
  id: string
  name: string
  brand: string
  hex_color: string
  lab: {
    l: number
    a: number
    b: number
  }
  k_coefficient?: number
  s_coefficient?: number
  opacity: number // 0-1
  tinting_strength: number // 0-1
  density?: number // g/ml
  cost_per_ml?: number
}

/**
 * Mixing formula with paint ratios
 * Legacy API structure
 */
export interface MixingFormula {
  total_volume_ml: number // 100-1000
  paint_ratios: PaintRatio[]
  mixing_order?: string[] // Recommended mixing sequence
}

/**
 * Legacy API session types and enums
 */
export type SessionType = 'color_matching' | 'ratio_prediction'
export type InputMethod = 'hex_input' | 'color_picker' | 'image_upload' | 'manual_ratios' | 'hex' | 'picker' | 'image'
export type OptimizationPreference = 'accuracy' | 'cost' | 'simplicity'
export type ExtractionType = 'pixel' | 'average' | 'dominant' | 'point'

/**
 * Mixing session (Legacy API format)
 * Note: Different from UserMixingSession (new format)
 */
export interface MixingSession {
  id: string
  session_type: SessionType
  custom_label?: string
  is_favorite: boolean
  created_at: string // ISO 8601
  updated_at: string // ISO 8601
}

/**
 * Detailed mixing session with all fields
 */
export interface MixingSessionDetail extends MixingSession {
  input_method: InputMethod
  target_color?: ColorValue
  calculated_color?: ColorValue
  delta_e?: number // CIE 2000 Delta E
  formula?: MixingFormula
  notes?: string
  image_url?: string
}

// ============================================================================
// API Request Types
// ============================================================================

export interface ColorMatchRequest {
  target_color: ColorValue
  total_volume_ml: number // 100-1000
  optimization_preference?: OptimizationPreference
  max_paints?: number
  volume_ml?: number
  tolerance?: number
}

export interface RatioPredictRequest {
  paint_ratios: Array<{
    paint_id: string
    volume_ml: number
  }>
}

export interface CreateSessionRequest {
  session_type: SessionType
  input_method: InputMethod
  target_color?: ColorValue
  calculated_color?: ColorValue
  formula?: MixingFormula
  delta_e?: number
  custom_label?: string
  notes?: string
  image_url?: string
}

export interface UpdateSessionRequest {
  custom_label?: string
  notes?: string
  is_favorite?: boolean
}

export interface ImageExtractRequest {
  image: File
  x: number
  y: number
  extraction_type?: ExtractionType
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ColorMatchResponse {
  formula: MixingFormula
  achieved_color: ColorValue
  calculated_color: ColorValue
  delta_e: number
  alternatives?: Array<{
    formula: MixingFormula
    delta_e: number
    description: string
  }>
}

export interface ColorMatchErrorResponse {
  error: string
  message: string
  closest_achievable?: ColorValue
  min_delta_e?: number
}

export interface RatioPredictResponse {
  resulting_color: ColorValue
  total_volume_ml: number
  formula: MixingFormula
}

export interface SessionListResponse {
  sessions: MixingSession[]
  total_count: number
  has_more: boolean
}

export interface PaintColorsResponse {
  paints: PaintColor[]
}

export interface ExtractedColorResponse {
  color: ColorValue
  extraction_type: ExtractionType
  image_dimensions: {
    width: number
    height: number
  }
}

export interface ImageColorExtractionResponse {
  color: ColorValue
  extracted_color: ColorValue
  extraction_type: ExtractionType
  image_dimensions: {
    width: number
    height: number
  }
}

export interface ImageColorExtractionRequest {
  image: File
  x: number
  y: number
  extraction_type?: ExtractionType
}

// Type alias for legacy compatibility
export type SessionData = MixingSessionDetail

// Type alias for legacy compatibility
export type PaintData = PaintColor

export interface ErrorResponse {
  error: string
  message: string
  details?: Record<string, unknown> | Array<unknown>
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface SessionListParams {
  limit?: number // 1-100, default 20
  offset?: number // default 0
  favorites_only?: boolean // default false
  session_type?: SessionType
}

// ============================================================================
// Form Types
// ============================================================================

export interface ColorInputForm {
  method: InputMethod
  hex_value?: string
  picker_value?: string
  image_file?: File
  image_coordinates?: { x: number; y: number }
  extraction_type?: ExtractionType
}

export interface MixingRatioForm {
  paint_ratios: Array<{
    paint_id: string
    volume_ml: string // String for form input, convert to number
  }>
  total_volume_ml: string
}

export interface SessionSaveForm {
  custom_label?: string
  notes?: string
  is_favorite?: boolean
}

// ============================================================================
// Component Props
// ============================================================================

export interface ColorDisplayProps {
  color: ColorValue
  size?: 'sm' | 'md' | 'lg'
  showHex?: boolean
  showLab?: boolean
  className?: string
}

export interface PaintRatioDisplayProps {
  formula: MixingFormula
  paints: PaintColor[]
  showPercentages?: boolean
  className?: string
}

export interface ColorAccuracyIndicatorProps {
  delta_e: number
  className?: string
}

export interface SessionCardProps {
  session: MixingSession | SessionData
  onClick?: (session: MixingSession) => void
  onFavorite?: () => Promise<void>
  onFavoriteToggle?: (sessionId: string, isFavorite: boolean) => void
  onDelete?: (sessionId: string) => void
  compactMode?: boolean
  className?: string
}

export interface ColorPickerProps {
  onChange?: (color: ColorValue) => void
  onColorChange: (color: ColorValue) => void
  disabled: boolean
  className?: string
}

export interface HexInputProps {
  onChange?: (color: ColorValue) => void
  onColorChange: (color: ColorValue) => void
  disabled: boolean
  className?: string
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseColorMatchingReturn {
  calculateMatch: (request: ColorMatchRequest) => Promise<ColorMatchResponse>
  predictColor: (request: RatioPredictRequest) => Promise<RatioPredictResponse>
  isLoading: boolean
  error: string | null
  clearError: () => void
}

export interface UseSessionsReturn {
  sessions: MixingSession[]
  totalCount: number
  hasMore: boolean
  isLoading: boolean
  error: string | null
  loadSessions: (params?: SessionListParams) => Promise<void>
  loadMore: () => Promise<void>
  createSession: (session: CreateSessionRequest) => Promise<MixingSession>
  updateSession: (id: string, updates: UpdateSessionRequest) => Promise<MixingSession>
  deleteSession: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

export interface UseImageProcessingReturn {
  extractColor: (request: ImageExtractRequest) => Promise<ExtractedColorResponse>
  isProcessing: boolean
  error: string | null
  previewUrl?: string
  clearPreview: () => void
}

export interface UsePaintColorsReturn {
  paints: PaintColor[]
  isLoading: boolean
  error: string | null
  getPaintById: (id: string) => PaintColor | undefined
  getPaintsByBrand: (brand: string) => PaintColor[]
  searchPaints: (query: string) => PaintColor[]
}

// ============================================================================
// Utility Types
// ============================================================================

export type ColorSpace = 'rgb' | 'lab' | 'xyz'
export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'lab'

export interface ColorConversion {
  from: ColorSpace
  to: ColorSpace
  value: number[]
}

export interface DeltaECalculation {
  color1: ColorValue
  color2: ColorValue
  method: 'cie76' | 'cie94' | 'cie2000'
  result: number
}

// ============================================================================
// Database Types (for Supabase)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      mixing_sessions: {
        Row: {
          id: string
          user_id: string
          session_type: SessionType
          target_color_hex?: string
          target_color_lab_l?: number
          target_color_lab_a?: number
          target_color_lab_b?: number
          input_method: InputMethod
          image_url?: string
          calculated_color_hex?: string
          calculated_color_lab_l?: number
          calculated_color_lab_a?: number
          calculated_color_lab_b?: number
          delta_e?: number
          custom_label?: string
          notes?: string
          is_favorite: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['mixing_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['mixing_sessions']['Insert']>
      }
      mixing_formulas: {
        Row: {
          id: string
          session_id: string
          total_volume_ml: number
          mixing_order?: string[]
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['mixing_formulas']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['mixing_formulas']['Insert']>
      }
      formula_items: {
        Row: {
          id: string
          formula_id: string
          paint_id: string
          volume_ml: number
          percentage: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['formula_items']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['formula_items']['Insert']>
      }
    }
  }
}

// ============================================================================
// Constants
// ============================================================================

export const COLOR_ACCURACY_LEVELS = {
  PERFECT: 0,
  EXCELLENT: 1,
  VERY_GOOD: 2,
  GOOD: 3,
  ACCEPTABLE: 4,
  NOTICEABLE: 6,
  POOR: 10,
} as const

export const VOLUME_CONSTRAINTS = {
  MIN: 100,
  MAX: 1000,
} as const

export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB

// ============================================================================
// Additional Type Guards
// ============================================================================

export function isPaintColor(value: unknown): value is PaintColor {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.brand === 'string' &&
    typeof obj.hex_color === 'string' &&
    typeof obj.opacity === 'number' &&
    typeof obj.tinting_strength === 'number'
  )
}

export function isMixingFormula(value: unknown): value is MixingFormula {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.total_volume_ml === 'number' &&
    Array.isArray(obj.paint_ratios) &&
    (obj.paint_ratios as unknown[]).every((ratio: unknown) => {
      if (typeof ratio !== 'object' || ratio === null) return false
      const r = ratio as Record<string, unknown>
      return (
        typeof r.paint_id === 'string' &&
        typeof r.volume_ml === 'number' &&
        typeof r.percentage === 'number'
      )
    })
  )
}

// ============================================================================
// Type Aliases (for API test compatibility)
// ============================================================================

export type ImageExtractColorRequest = ImageExtractRequest
export type ImageExtractColorResponse = ExtractedColorResponse
export type PaintListResponse = PaintColorsResponse
export type SessionResponse = SessionListResponse
export type SessionDetailResponse = MixingSessionDetail
