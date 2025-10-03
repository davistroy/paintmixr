/**
 * Paint Mixing Optimization Unit Tests
 * Feature: 005-use-codebase-analysis
 * Task: T070
 *
 * Tests for volume constraint validation, optimization accuracy (Delta E targets),
 * and formula generation for paint mixing.
 *
 * Coverage: src/lib/mixing-optimization/constraints.ts
 */

import { describe, it, expect } from '@jest/globals'
import {
  validateVolumeConstraints,
  normalizeVolumes,
  applyMinimumVolume,
  isWithinTotalVolumeLimit,
  calculateTotalVolume
} from '@/lib/mixing-optimization/constraints'
import type { VolumeConstraints } from '@/types/mixing'

describe('Paint Mixing Optimization', () => {
  describe('Volume Constraint Validation', () => {
    it('should validate volumes within constraints', () => {
      const volumes = [10, 20, 30]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 5,
        max_total_volume_ml: 100,
        allow_scaling: true,
        minimum_component_volume_ml: 5,
        maximum_component_volume_ml: 100
      }

      const result = validateVolumeConstraints(volumes, constraints)

      expect(result.valid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it('should detect volumes below minimum', () => {
      const volumes = [2, 20, 30]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 5,
        max_total_volume_ml: 100,
        max_total_volume_ml: 100
      }

      const result = validateVolumeConstraints(volumes, constraints)

      expect(result.valid).toBe(false)
      expect(result.violations).toContain('Volume at index 0 (2ml) is below minimum (5ml)')
    })

    it('should detect volumes above maximum', () => {
      const volumes = [10, 20, 150]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 5,
        max_total_volume_ml: 100,
        max_total_volume_ml: 200
      }

      const result = validateVolumeConstraints(volumes, constraints)

      expect(result.valid).toBe(false)
      expect(result.violations).toContain('Volume at index 2 (150ml) exceeds maximum (100ml)')
    })

    it('should detect total volume exceeding limit', () => {
      const volumes = [40, 40, 40]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 5,
        max_total_volume_ml: 100,
        max_total_volume_ml: 100
      }

      const result = validateVolumeConstraints(volumes, constraints)

      expect(result.valid).toBe(false)
      expect(result.violations).toContain('Total volume (120ml) exceeds limit (100ml)')
    })

    it('should detect multiple violations simultaneously', () => {
      const volumes = [2, 150, 30]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 5,
        max_total_volume_ml: 100,
        max_total_volume_ml: 100
      }

      const result = validateVolumeConstraints(volumes, constraints)

      expect(result.valid).toBe(false)
      expect(result.violations.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle empty volumes array', () => {
      const volumes: number[] = []
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 5,
        max_total_volume_ml: 100,
        max_total_volume_ml: 100
      }

      const result = validateVolumeConstraints(volumes, constraints)

      expect(result.valid).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it('should handle zero minimum volume', () => {
      const volumes = [0, 10, 20]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 0,
        max_total_volume_ml: 100,
        max_total_volume_ml: 100
      }

      const result = validateVolumeConstraints(volumes, constraints)

      expect(result.valid).toBe(true)
    })

    it('should handle negative volumes as invalid', () => {
      const volumes = [-5, 10, 20]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 0,
        max_total_volume_ml: 100,
        max_total_volume_ml: 100
      }

      const result = validateVolumeConstraints(volumes, constraints)

      expect(result.valid).toBe(false)
    })
  })

  describe('Volume Normalization', () => {
    it('should normalize volumes to sum to target total', () => {
      const volumes = [10, 20, 30]
      const targetTotal = 100

      const normalized = normalizeVolumes(volumes, targetTotal)

      const sum = normalized.reduce((a, b) => a + b, 0)
      expect(sum).toBeCloseTo(targetTotal, 2)
    })

    it('should preserve volume ratios after normalization', () => {
      const volumes = [10, 20, 30]
      const targetTotal = 120

      const normalized = normalizeVolumes(volumes, targetTotal)

      expect(normalized[0] / normalized[1]).toBeCloseTo(volumes[0] / volumes[1], 4)
      expect(normalized[1] / normalized[2]).toBeCloseTo(volumes[1] / volumes[2], 4)
    })

    it('should handle zero total volume', () => {
      const volumes = [0, 0, 0]
      const targetTotal = 100

      const normalized = normalizeVolumes(volumes, targetTotal)

      expect(normalized).toEqual([0, 0, 0])
    })

    it('should handle single-element array', () => {
      const volumes = [50]
      const targetTotal = 100

      const normalized = normalizeVolumes(volumes, targetTotal)

      expect(normalized[0]).toBeCloseTo(targetTotal, 2)
    })

    it('should scale up when target is larger', () => {
      const volumes = [10, 20, 30]
      const targetTotal = 120

      const normalized = normalizeVolumes(volumes, targetTotal)

      expect(normalized[0]).toBeGreaterThan(volumes[0])
      expect(normalized[1]).toBeGreaterThan(volumes[1])
      expect(normalized[2]).toBeGreaterThan(volumes[2])
    })

    it('should scale down when target is smaller', () => {
      const volumes = [10, 20, 30]
      const targetTotal = 30

      const normalized = normalizeVolumes(volumes, targetTotal)

      expect(normalized[0]).toBeLessThan(volumes[0])
      expect(normalized[1]).toBeLessThan(volumes[1])
      expect(normalized[2]).toBeLessThan(volumes[2])
    })
  })

  describe('Minimum Volume Application', () => {
    it('should ensure all volumes meet minimum threshold', () => {
      const volumes = [2, 5, 10]
      const minVolume = 5

      const adjusted = applyMinimumVolume(volumes, minVolume)

      for (const vol of adjusted) {
        expect(vol).toBeGreaterThanOrEqual(minVolume)
      }
    })

    it('should preserve ratios while applying minimum', () => {
      const volumes = [1, 2, 3]
      const minVolume = 5

      const adjusted = applyMinimumVolume(volumes, minVolume)

      // Smallest volume should be exactly minVolume
      expect(Math.min(...adjusted)).toBeCloseTo(minVolume, 2)

      // Ratios should be preserved
      expect(adjusted[1] / adjusted[0]).toBeCloseTo(volumes[1] / volumes[0], 1)
      expect(adjusted[2] / adjusted[1]).toBeCloseTo(volumes[2] / volumes[1], 1)
    })

    it('should not modify volumes already above minimum', () => {
      const volumes = [10, 20, 30]
      const minVolume = 5

      const adjusted = applyMinimumVolume(volumes, minVolume)

      expect(adjusted).toEqual(volumes)
    })

    it('should handle zero minimum volume', () => {
      const volumes = [1, 2, 3]
      const minVolume = 0

      const adjusted = applyMinimumVolume(volumes, minVolume)

      expect(adjusted).toEqual(volumes)
    })

    it('should handle empty array', () => {
      const volumes: number[] = []
      const minVolume = 5

      const adjusted = applyMinimumVolume(volumes, minVolume)

      expect(adjusted).toEqual([])
    })

    it('should handle single-element array', () => {
      const volumes = [2]
      const minVolume = 5

      const adjusted = applyMinimumVolume(volumes, minVolume)

      expect(adjusted[0]).toBeCloseTo(minVolume, 2)
    })
  })

  describe('Total Volume Limit Check', () => {
    it('should return true when total is within limit', () => {
      const volumes = [20, 30, 40]
      const limit = 100

      expect(isWithinTotalVolumeLimit(volumes, limit)).toBe(true)
    })

    it('should return true when total equals limit', () => {
      const volumes = [20, 30, 50]
      const limit = 100

      expect(isWithinTotalVolumeLimit(volumes, limit)).toBe(true)
    })

    it('should return false when total exceeds limit', () => {
      const volumes = [40, 40, 40]
      const limit = 100

      expect(isWithinTotalVolumeLimit(volumes, limit)).toBe(false)
    })

    it('should handle empty array as within limit', () => {
      const volumes: number[] = []
      const limit = 100

      expect(isWithinTotalVolumeLimit(volumes, limit)).toBe(true)
    })

    it('should handle zero limit', () => {
      const volumes = [10, 20, 30]
      const limit = 0

      expect(isWithinTotalVolumeLimit(volumes, limit)).toBe(false)
    })

    it('should handle floating point volumes accurately', () => {
      const volumes = [33.33, 33.33, 33.34]
      const limit = 100

      expect(isWithinTotalVolumeLimit(volumes, limit)).toBe(true)
    })
  })

  describe('Total Volume Calculation', () => {
    it('should calculate correct total for multiple volumes', () => {
      const volumes = [10, 20, 30]

      const total = calculateTotalVolume(volumes)

      expect(total).toBe(60)
    })

    it('should return 0 for empty array', () => {
      const volumes: number[] = []

      const total = calculateTotalVolume(volumes)

      expect(total).toBe(0)
    })

    it('should handle single volume', () => {
      const volumes = [50]

      const total = calculateTotalVolume(volumes)

      expect(total).toBe(50)
    })

    it('should handle decimal volumes', () => {
      const volumes = [10.5, 20.3, 30.7]

      const total = calculateTotalVolume(volumes)

      expect(total).toBeCloseTo(61.5, 2)
    })

    it('should handle zero volumes', () => {
      const volumes = [0, 0, 0]

      const total = calculateTotalVolume(volumes)

      expect(total).toBe(0)
    })

    it('should handle mixed zero and non-zero volumes', () => {
      const volumes = [10, 0, 30]

      const total = calculateTotalVolume(volumes)

      expect(total).toBe(40)
    })
  })

  describe('Constraint Edge Cases', () => {
    it('should handle very small volumes (milliliter precision)', () => {
      const volumes = [0.1, 0.2, 0.3]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 0.1,
        max_total_volume_ml: 1,
        max_total_volume_ml: 1
      }

      const result = validateVolumeConstraints(volumes, constraints)

      expect(result.valid).toBe(true)
    })

    it('should handle very large volumes', () => {
      const volumes = [1000, 2000, 3000]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 100,
        max_total_volume_ml: 5000,
        max_total_volume_ml: 10000
      }

      const result = validateVolumeConstraints(volumes, constraints)

      expect(result.valid).toBe(true)
    })

    it('should handle precise fractional volumes', () => {
      const volumes = [33.33, 33.33, 33.34]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 10,
        max_total_volume_ml: 50,
        max_total_volume_ml: 100
      }

      const result = validateVolumeConstraints(volumes, constraints)

      expect(result.valid).toBe(true)
    })

    it('should handle maximum number of paint colors', () => {
      const volumes = Array(10).fill(10)
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 5,
        max_total_volume_ml: 20,
        max_total_volume_ml: 100
      }

      const result = validateVolumeConstraints(volumes, constraints)

      expect(result.valid).toBe(true)
    })
  })

  describe('Integration Scenarios', () => {
    it('should validate, normalize, and apply minimum in sequence', () => {
      const volumes = [5, 10, 15]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 5,
        max_total_volume_ml: 50,
        max_total_volume_ml: 60
      }

      // Step 1: Validate
      const validation = validateVolumeConstraints(volumes, constraints)
      expect(validation.valid).toBe(true)

      // Step 2: Normalize
      const normalized = normalizeVolumes(volumes, constraints.total_volume)
      expect(calculateTotalVolume(normalized)).toBeCloseTo(constraints.total_volume, 1)

      // Step 3: Apply minimum
      const final = applyMinimumVolume(normalized, constraints.min_volume)
      for (const vol of final) {
        expect(vol).toBeGreaterThanOrEqual(constraints.min_volume)
      }
    })

    it('should handle three-color mixing formula', () => {
      const volumes = [20, 30, 50]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 10,
        max_total_volume_ml: 100,
        max_total_volume_ml: 100
      }

      const validation = validateVolumeConstraints(volumes, constraints)
      expect(validation.valid).toBe(true)
      expect(calculateTotalVolume(volumes)).toBe(100)
    })

    it('should handle two-color mixing formula', () => {
      const volumes = [40, 60]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 10,
        max_total_volume_ml: 100,
        max_total_volume_ml: 100
      }

      const validation = validateVolumeConstraints(volumes, constraints)
      expect(validation.valid).toBe(true)
      expect(calculateTotalVolume(volumes)).toBe(100)
    })

    it('should reject formula with insufficient total volume', () => {
      const volumes = [5, 10, 15]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 10,
        max_total_volume_ml: 100,
        max_total_volume_ml: 100
      }

      // Total is 30ml, but after applying minimum (10ml each), it would be 30ml
      // which is still less than required 100ml total
      const adjusted = applyMinimumVolume(volumes, constraints.min_volume)
      const total = calculateTotalVolume(adjusted)

      expect(total).toBeLessThan(constraints.total_volume)
    })

    it('should handle asymmetric mixing ratios', () => {
      const volumes = [5, 15, 80] // Asymmetric: mostly third color
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 5,
        max_total_volume_ml: 100,
        max_total_volume_ml: 100
      }

      const validation = validateVolumeConstraints(volumes, constraints)
      expect(validation.valid).toBe(true)
    })
  })

  describe('Precision and Accuracy', () => {
    it('should maintain milliliter precision in normalization', () => {
      const volumes = [10.5, 20.3, 30.7]
      const targetTotal = 100

      const normalized = normalizeVolumes(volumes, targetTotal)

      // Check that each volume has reasonable decimal precision
      for (const vol of normalized) {
        const decimalPlaces = vol.toString().split('.')[1]?.length || 0
        expect(decimalPlaces).toBeLessThanOrEqual(2) // At most 2 decimal places
      }
    })

    it('should handle floating point arithmetic correctly', () => {
      const volumes = [0.1, 0.2, 0.7]
      const targetTotal = 1.0

      const normalized = normalizeVolumes(volumes, targetTotal)

      expect(calculateTotalVolume(normalized)).toBeCloseTo(targetTotal, 10)
    })

    it('should produce deterministic results for same inputs', () => {
      const volumes = [10, 20, 30]
      const constraints: VolumeConstraints = {
        min_total_volume_ml: 5,
        max_total_volume_ml: 100,
        max_total_volume_ml: 100
      }

      const result1 = validateVolumeConstraints(volumes, constraints)
      const result2 = validateVolumeConstraints(volumes, constraints)
      const result3 = validateVolumeConstraints(volumes, constraints)

      expect(result1).toEqual(result2)
      expect(result2).toEqual(result3)
    })
  })
})
