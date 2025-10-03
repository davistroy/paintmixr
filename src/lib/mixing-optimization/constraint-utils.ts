/**
 * Volume Constraint Utility Functions
 * Feature: 005-use-codebase-analysis
 * Task: T070
 *
 * Simple utility functions for volume constraint validation and normalization.
 * These are simplified versions used by tests and UI components.
 */

import type { VolumeConstraints } from '@/types/mixing'

export interface ValidationResult {
  valid: boolean
  violations: string[]
}

/**
 * Validates an array of volumes against constraints
 * @param volumes - Array of paint volumes in milliliters
 * @param constraints - Volume constraint specifications
 * @returns Validation result with violations list
 */
export function validateVolumeConstraints(
  volumes: number[],
  constraints: VolumeConstraints
): ValidationResult {
  const violations: string[] = []

  // Handle empty array as valid
  if (volumes.length === 0) {
    return { valid: true, violations: [] }
  }

  // Check for negative volumes
  volumes.forEach((vol, index) => {
    if (vol < 0) {
      violations.push(`Volume at index ${index} (${vol}ml) is negative`)
    }
  })

  // Check individual volume constraints if specified
  if (constraints.minimum_component_volume_ml !== undefined) {
    volumes.forEach((vol, index) => {
      if (vol < constraints.minimum_component_volume_ml!) {
        violations.push(
          `Volume at index ${index} (${vol}ml) is below minimum (${constraints.minimum_component_volume_ml}ml)`
        )
      }
    })
  }

  if (constraints.maximum_component_volume_ml !== undefined) {
    volumes.forEach((vol, index) => {
      if (vol > constraints.maximum_component_volume_ml!) {
        violations.push(
          `Volume at index ${index} (${vol}ml) exceeds maximum (${constraints.maximum_component_volume_ml}ml)`
        )
      }
    })
  }

  // Check total volume constraint
  const totalVolume = calculateTotalVolume(volumes)
  if (totalVolume > constraints.max_total_volume_ml) {
    violations.push(
      `Total volume (${totalVolume}ml) exceeds limit (${constraints.max_total_volume_ml}ml)`
    )
  }

  return {
    valid: violations.length === 0,
    violations
  }
}

/**
 * Normalizes volumes to sum to a target total while preserving ratios
 * @param volumes - Array of paint volumes
 * @param targetTotal - Target total volume
 * @returns Normalized volumes array
 */
export function normalizeVolumes(volumes: number[], targetTotal: number): number[] {
  if (volumes.length === 0) {
    return []
  }

  const currentTotal = calculateTotalVolume(volumes)

  // Handle zero total - return zeros
  if (currentTotal === 0) {
    return volumes.map(() => 0)
  }

  // Scale volumes to target total
  const scale = targetTotal / currentTotal
  return volumes.map(vol => {
    const normalized = vol * scale
    // Round to 2 decimal places (0.01ml precision)
    return Math.round(normalized * 100) / 100
  })
}

/**
 * Applies minimum volume threshold while preserving ratios
 * @param volumes - Array of paint volumes
 * @param minVolume - Minimum volume per component
 * @returns Adjusted volumes array
 */
export function applyMinimumVolume(volumes: number[], minVolume: number): number[] {
  if (volumes.length === 0) {
    return []
  }

  if (minVolume === 0) {
    return volumes
  }

  const minValue = Math.min(...volumes)

  // If all volumes already meet minimum, return as-is
  if (minValue >= minVolume) {
    return volumes
  }

  // Scale all volumes proportionally so smallest becomes minVolume
  const scale = minVolume / minValue
  return volumes.map(vol => {
    const scaled = vol * scale
    // Round to 2 decimal places
    return Math.round(scaled * 100) / 100
  })
}

/**
 * Checks if total volume is within limit
 * @param volumes - Array of paint volumes
 * @param limit - Maximum total volume allowed
 * @returns True if within limit
 */
export function isWithinTotalVolumeLimit(volumes: number[], limit: number): boolean {
  const total = calculateTotalVolume(volumes)
  return total <= limit
}

/**
 * Calculates total volume from array of volumes
 * @param volumes - Array of paint volumes
 * @returns Total volume
 */
export function calculateTotalVolume(volumes: number[]): number {
  if (volumes.length === 0) {
    return 0
  }
  return volumes.reduce((sum, vol) => sum + vol, 0)
}

/**
 * Creates a simple VolumeConstraints object with common defaults
 * @param minVolume - Minimum component volume (default: 5ml)
 * @param maxVolume - Maximum total volume (default: 100ml)
 * @returns VolumeConstraints object
 */
export function createSimpleConstraints(
  minVolume: number = 5,
  maxVolume: number = 100
): VolumeConstraints {
  return {
    min_total_volume_ml: minVolume,
    max_total_volume_ml: maxVolume,
    allow_scaling: true,
    minimum_component_volume_ml: minVolume,
    maximum_component_volume_ml: maxVolume
  }
}
