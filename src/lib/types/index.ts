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
 */
export interface MixingSession {
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
