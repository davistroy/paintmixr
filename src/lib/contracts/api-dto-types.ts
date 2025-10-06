/**
 * API Data Transfer Objects (DTOs)
 *
 * These types decouple the frontend from database schema changes.
 * DTOs are the contract between API routes and client components.
 *
 * Feature: 010-using-refactor-recommendations
 * Requirement: FR-026 (API DTO layer)
 */

// ============================================================================
// Paint DTO
// ============================================================================

export interface PaintDTO {
  id: string
  name: string
  brand: string
  color: ColorValueDTO
  opacity?: number // 0-1, optional for transparency
  tintingStrength?: number // 0-1, optional for mixing calculations
}

export interface ColorValueDTO {
  hex: string // #RRGGBB format
  lab: LABColorDTO
}

export interface LABColorDTO {
  l: number // Lightness (0-100)
  a: number // Green-Red axis (-128 to 127)
  b: number // Blue-Yellow axis (-128 to 127)
}

// ============================================================================
// Session DTO
// ============================================================================

export interface SessionDTO {
  id: string
  userId: string
  targetColor: ColorValueDTO
  formula: MixingFormulaDTO
  deltaE: number
  customLabel?: string
  isFavorite: boolean
  createdAt: string // ISO 8601
}

export interface MixingFormulaDTO {
  paints: PaintComponentDTO[]
  totalVolume: number // in ml
  achievedColor: ColorValueDTO
}

export interface PaintComponentDTO {
  paintId: string
  paintName: string
  paintBrand: string
  ratio: number // 0-1, sum of all ratios = 1
  volume: number // in ml
}

// ============================================================================
// Optimization Request/Response DTOs
// ============================================================================

export interface OptimizationRequestDTO {
  targetColor: ColorValueDTO
  availablePaints: string[] // Paint IDs
  volumeConstraints?: VolumeConstraintsDTO
  mode: 'standard' | 'enhanced'
}

export interface VolumeConstraintsDTO {
  minVolume: number // in ml
  maxVolume: number // in ml
  targetVolume?: number // in ml, optional
}

export interface OptimizationResponseDTO {
  formula: MixingFormulaDTO
  deltaE: number
  executionTimeMs: number
  algorithm: 'differential-evolution' | 'tpe-hybrid'
}

// ============================================================================
// API Version Header
// ============================================================================

export interface APIVersionHeaders {
  'X-API-Version': string // e.g., "1.0"
  'X-Deprecated'?: 'true' | 'false'
}

// ============================================================================
// Rate Limit Response
// ============================================================================

export interface RateLimitErrorDTO {
  error: 'Rate limit exceeded'
  retryAfter: number // seconds until next allowed request
  limit: number // max requests per window
  windowMs: number // window duration in ms
}

// ============================================================================
// Type Guards
// ============================================================================

export function isPaintDTO(value: unknown): value is PaintDTO {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'brand' in value &&
    'color' in value
  )
}

export function isColorValueDTO(value: unknown): value is ColorValueDTO {
  return (
    typeof value === 'object' &&
    value !== null &&
    'hex' in value &&
    'lab' in value &&
    typeof (value as ColorValueDTO).hex === 'string'
  )
}

export function isOptimizationResponseDTO(value: unknown): value is OptimizationResponseDTO {
  return (
    typeof value === 'object' &&
    value !== null &&
    'formula' in value &&
    'deltaE' in value &&
    typeof (value as OptimizationResponseDTO).deltaE === 'number'
  )
}
