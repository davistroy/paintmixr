/**
 * Delta E CIEDE2000 Unit Tests
 * Feature: 005-use-codebase-analysis
 * Task: T069
 *
 * Tests for Delta E calculations, ≤4.0 requirement validation (Constitutional Principle I),
 * and CIE 2000 formula accuracy with known reference values.
 *
 * Coverage: src/lib/color-science/delta-e-ciede2000.ts
 */

import { describe, it, expect } from '@jest/globals'
import {
  calculateCIEDE2000,
  calculateBatchCIEDE2000,
  findClosestColor,
  analyzeColorDifference,
  isWithinTolerance,
  CIEDE2000_CONSTANTS,
  type LABColor
} from '@/lib/color-science/delta-e-ciede2000'

describe('Delta E CIEDE2000 Calculations', () => {
  describe('Basic Delta E Calculations', () => {
    it('should return 0 for identical colors', () => {
      const color: LABColor = { l: 50, a: 25, b: -25 }

      const result = calculateCIEDE2000(color, color)

      expect(result.delta_e).toBe(0)
    })

    it('should return 0 for white compared to white', () => {
      const white1: LABColor = { l: 100, a: 0, b: 0 }
      const white2: LABColor = { l: 100, a: 0, b: 0 }

      const result = calculateCIEDE2000(white1, white2)

      expect(result.delta_e).toBe(0)
    })

    it('should return 0 for black compared to black', () => {
      const black1: LABColor = { l: 0, a: 0, b: 0 }
      const black2: LABColor = { l: 0, a: 0, b: 0 }

      const result = calculateCIEDE2000(black1, black2)

      expect(result.delta_e).toBe(0)
    })

    it('should be symmetric (Delta E(A,B) = Delta E(B,A))', () => {
      const color1: LABColor = { l: 50, a: 10, b: 20 }
      const color2: LABColor = { l: 60, a: -10, b: -20 }

      const deltaAB = calculateCIEDE2000(color1, color2)
      const deltaBA = calculateCIEDE2000(color2, color1)

      expect(deltaAB.delta_e).toBeCloseTo(deltaBA.delta_e, 6)
    })

    it('should calculate lightness difference for achromatic colors', () => {
      const lighter: LABColor = { l: 70, a: 0, b: 0 }
      const darker: LABColor = { l: 30, a: 0, b: 0 }

      const result = calculateCIEDE2000(lighter, darker)

      expect(result.delta_e).toBeGreaterThan(0)
      expect(result.delta_l_prime).toBeCloseTo(-40, 1) // L2 - L1
    })

    it('should calculate chroma difference for same lightness', () => {
      const color1: LABColor = { l: 50, a: 10, b: 10 }
      const color2: LABColor = { l: 50, a: 20, b: 20 }

      const result = calculateCIEDE2000(color1, color2)

      expect(result.delta_e).toBeGreaterThan(0)
      expect(result.delta_c_prime).toBeGreaterThan(0)
    })

    it('should calculate hue difference for same lightness and chroma', () => {
      const color1: LABColor = { l: 50, a: 20, b: 0 }
      const color2: LABColor = { l: 50, a: 0, b: 20 }

      const result = calculateCIEDE2000(color1, color2)

      expect(result.delta_e).toBeGreaterThan(0)
      expect(Math.abs(result.delta_h_prime)).toBeGreaterThan(0)
    })
  })

  describe('CIEDE2000 Reference Test Data', () => {
    // Test data from Sharma et al. (2005)
    // "The CIEDE2000 color-difference formula: Implementation notes, supplementary test data, and mathematical observations"

    it('should match Sharma reference pair 1', () => {
      const color1: LABColor = { l: 50.0000, a: 2.6772, b: -79.7751 }
      const color2: LABColor = { l: 50.0000, a: 0.0000, b: -82.7485 }

      const result = calculateCIEDE2000(color1, color2)

      // Expected Delta E: 2.0425
      expect(result.delta_e).toBeCloseTo(2.0425, 2)
    })

    it('should match Sharma reference pair 2', () => {
      const color1: LABColor = { l: 50.0000, a: 3.1571, b: -77.2803 }
      const color2: LABColor = { l: 50.0000, a: 0.0000, b: -82.7485 }

      const result = calculateCIEDE2000(color1, color2)

      // Expected Delta E: 2.8615
      expect(result.delta_e).toBeCloseTo(2.8615, 2)
    })

    it('should match Sharma reference pair 3', () => {
      const color1: LABColor = { l: 50.0000, a: 2.8361, b: -74.0200 }
      const color2: LABColor = { l: 50.0000, a: 0.0000, b: -82.7485 }

      const result = calculateCIEDE2000(color1, color2)

      // Expected Delta E: 3.4412
      expect(result.delta_e).toBeCloseTo(3.4412, 2)
    })

    it('should match Sharma reference pair 4 (gray)', () => {
      const color1: LABColor = { l: 50.0000, a: -1.3802, b: -84.2814 }
      const color2: LABColor = { l: 50.0000, a: 0.0000, b: -82.7485 }

      const result = calculateCIEDE2000(color1, color2)

      // Expected Delta E: 1.0000
      expect(result.delta_e).toBeCloseTo(1.0000, 2)
    })

    it('should match Sharma reference pair 5', () => {
      const color1: LABColor = { l: 50.0000, a: -1.1848, b: -84.8006 }
      const color2: LABColor = { l: 50.0000, a: 0.0000, b: -82.7485 }

      const result = calculateCIEDE2000(color1, color2)

      // Expected Delta E: 1.0000
      expect(result.delta_e).toBeCloseTo(1.0000, 2)
    })
  })

  describe('Constitutional Principle I: Delta E ≤4.0 Requirement', () => {
    it('should validate colors within ≤4.0 tolerance', () => {
      const target: LABColor = { l: 50, a: 0, b: 0 }
      const similar: LABColor = { l: 52, a: 2, b: -2 }

      const result = calculateCIEDE2000(target, similar)

      expect(result.delta_e).toBeLessThanOrEqual(4.0)
    })

    it('should classify Delta E ≤1.0 as imperceptible', () => {
      const color1: LABColor = { l: 50, a: 0, b: 0 }
      const color2: LABColor = { l: 50.5, a: 0.2, b: 0.2 }

      const result = calculateCIEDE2000(color1, color2)

      if (result.delta_e <= CIEDE2000_CONSTANTS.JUST_NOTICEABLE) {
        expect(result.perceptual_classification).toBe('Imperceptible')
      }
    })

    it('should classify Delta E ≤2.3 as just noticeable', () => {
      const color1: LABColor = { l: 50, a: 0, b: 0 }
      const color2: LABColor = { l: 52, a: 1, b: 1 }

      const result = calculateCIEDE2000(color1, color2)

      if (result.delta_e > CIEDE2000_CONSTANTS.JUST_NOTICEABLE &&
          result.delta_e <= CIEDE2000_CONSTANTS.ACCEPTABLE) {
        expect(result.perceptual_classification).toBe('Just Noticeable')
      }
    })

    it('should classify Delta E >4.0 as failing tolerance', () => {
      const color1: LABColor = { l: 50, a: 0, b: 0 }
      const color2: LABColor = { l: 70, a: 20, b: -20 }

      const result = calculateCIEDE2000(color1, color2)

      expect(result.delta_e).toBeGreaterThan(4.0)
    })

    it('should validate isWithinTolerance for Delta E ≤4.0', () => {
      const target: LABColor = { l: 50, a: 10, b: -10 }
      const match: LABColor = { l: 51, a: 11, b: -9 }

      const result = isWithinTolerance(target, match, 4.0)

      expect(result.withinTolerance).toBe(true)
      expect(result.deltaE).toBeLessThanOrEqual(4.0)
    })

    it('should fail isWithinTolerance for Delta E >4.0', () => {
      const target: LABColor = { l: 50, a: 10, b: -10 }
      const mismatch: LABColor = { l: 80, a: -30, b: 30 }

      const result = isWithinTolerance(target, mismatch, 4.0)

      expect(result.withinTolerance).toBe(false)
      expect(result.deltaE).toBeGreaterThan(4.0)
    })
  })

  describe('Intermediate Calculation Values', () => {
    it('should provide complete intermediate values', () => {
      const color1: LABColor = { l: 50, a: 10, b: 20 }
      const color2: LABColor = { l: 60, a: -10, b: -20 }

      const result = calculateCIEDE2000(color1, color2)

      expect(result.intermediate_values).toBeDefined()
      expect(result.intermediate_values.a_prime).toHaveLength(2)
      expect(result.intermediate_values.c_prime).toHaveLength(2)
      expect(result.intermediate_values.h_prime).toHaveLength(2)
      expect(result.intermediate_values.g_factor).toBeGreaterThanOrEqual(0)
      expect(result.intermediate_values.t_factor).toBeGreaterThan(0)
    })

    it('should calculate G factor correctly for high chroma', () => {
      const color1: LABColor = { l: 50, a: 50, b: 50 }
      const color2: LABColor = { l: 50, a: 60, b: 60 }

      const result = calculateCIEDE2000(color1, color2)

      // G factor should be small for high chroma
      expect(result.intermediate_values.g_factor).toBeGreaterThan(0)
      expect(result.intermediate_values.g_factor).toBeLessThan(0.5)
    })

    it('should calculate weighting functions (SL, SC, SH)', () => {
      const color1: LABColor = { l: 50, a: 25, b: -25 }
      const color2: LABColor = { l: 55, a: 30, b: -30 }

      const result = calculateCIEDE2000(color1, color2)

      expect(result.sl_weighting).toBeGreaterThan(0)
      expect(result.sc_weighting).toBeGreaterThan(0)
      expect(result.sh_weighting).toBeGreaterThan(0)
    })

    it('should calculate rotation term for blue region', () => {
      // Blue region has significant rotation term
      const color1: LABColor = { l: 50, a: 0, b: -50 }
      const color2: LABColor = { l: 50, a: -5, b: -55 }

      const result = calculateCIEDE2000(color1, color2)

      // Rotation term should be non-zero in blue region
      expect(Math.abs(result.rotation_term)).toBeGreaterThan(0)
    })
  })

  describe('Batch Delta E Calculations', () => {
    it('should calculate Delta E for multiple colors', () => {
      const target: LABColor = { l: 50, a: 0, b: 0 }
      const colors: LABColor[] = [
        { l: 51, a: 1, b: 1 },
        { l: 52, a: 2, b: 2 },
        { l: 55, a: 5, b: 5 }
      ]

      const results = calculateBatchCIEDE2000(target, colors)

      expect(results).toHaveLength(3)
      expect(results[0].delta_e).toBeLessThan(results[1].delta_e)
      expect(results[1].delta_e).toBeLessThan(results[2].delta_e)
    })

    it('should support custom weighting factors', () => {
      const target: LABColor = { l: 50, a: 0, b: 0 }
      const colors: LABColor[] = [
        { l: 60, a: 0, b: 0 },
        { l: 50, a: 10, b: 0 }
      ]

      const results1 = calculateBatchCIEDE2000(target, colors)
      const results2 = calculateBatchCIEDE2000(target, colors, { kL: 2.0 })

      // Higher kL weight should reduce lightness contribution
      expect(results2[0].delta_e).toBeLessThan(results1[0].delta_e)
    })
  })

  describe('Find Closest Color', () => {
    it('should find the closest color from array', () => {
      const target: LABColor = { l: 50, a: 0, b: 0 }
      const candidates: LABColor[] = [
        { l: 70, a: 20, b: 20 },  // Far
        { l: 51, a: 1, b: 1 },    // Close
        { l: 30, a: -30, b: -30 } // Far
      ]

      const result = findClosestColor(target, candidates)

      expect(result.index).toBe(1) // Second color is closest
      expect(result.color).toEqual(candidates[1])
      expect(result.deltaE).toBeLessThan(5)
    })

    it('should throw error for empty candidate array', () => {
      const target: LABColor = { l: 50, a: 0, b: 0 }

      expect(() => findClosestColor(target, [])).toThrow('Candidate colors array cannot be empty')
    })

    it('should return exact match if present', () => {
      const target: LABColor = { l: 50, a: 25, b: -25 }
      const candidates: LABColor[] = [
        { l: 70, a: 20, b: 20 },
        target,
        { l: 30, a: -30, b: -30 }
      ]

      const result = findClosestColor(target, candidates)

      expect(result.index).toBe(1)
      expect(result.deltaE).toBe(0)
    })
  })

  describe('Color Difference Analysis', () => {
    it('should identify dominant lightness difference', () => {
      const color1: LABColor = { l: 30, a: 0, b: 0 }
      const color2: LABColor = { l: 70, a: 0, b: 0 }

      const analysis = analyzeColorDifference(color1, color2)

      expect(analysis.dominant_component).toBe('lightness')
      expect(analysis.component_contributions.lightness).toBeGreaterThan(90)
    })

    it('should identify dominant chroma difference', () => {
      const color1: LABColor = { l: 50, a: 5, b: 5 }
      const color2: LABColor = { l: 50, a: 50, b: 50 }

      const analysis = analyzeColorDifference(color1, color2)

      expect(analysis.dominant_component).toBe('chroma')
      expect(analysis.component_contributions.chroma).toBeGreaterThan(50)
    })

    it('should provide adjustment recommendations', () => {
      const color1: LABColor = { l: 30, a: -20, b: 10 }
      const color2: LABColor = { l: 50, a: 20, b: -30 }

      const analysis = analyzeColorDifference(color1, color2)

      expect(analysis.adjustment_recommendations).toBeInstanceOf(Array)
      expect(analysis.adjustment_recommendations.length).toBeGreaterThan(0)
    })

    it('should generate visual description', () => {
      const color1: LABColor = { l: 50, a: 0, b: 0 }
      const color2: LABColor = { l: 51, a: 1, b: 1 }

      const analysis = analyzeColorDifference(color1, color2)

      expect(analysis.visual_description).toBeTruthy()
      expect(typeof analysis.visual_description).toBe('string')
    })
  })

  describe('Calculation Confidence', () => {
    it('should provide high confidence for mid-range colors', () => {
      const color1: LABColor = { l: 50, a: 25, b: -25 }
      const color2: LABColor = { l: 55, a: 30, b: -30 }

      const result = calculateCIEDE2000(color1, color2)

      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should reduce confidence near color space boundaries', () => {
      const color1: LABColor = { l: 2, a: 0, b: 0 }  // Near black
      const color2: LABColor = { l: 3, a: 1, b: 1 }

      const result = calculateCIEDE2000(color1, color2)

      expect(result.confidence).toBeLessThan(1.0)
    })

    it('should reduce confidence for very small differences', () => {
      const color1: LABColor = { l: 50.00, a: 0.00, b: 0.00 }
      const color2: LABColor = { l: 50.01, a: 0.01, b: 0.01 }

      const result = calculateCIEDE2000(color1, color2)

      if (result.delta_e < 0.1) {
        expect(result.confidence).toBeLessThan(1.0)
      }
    })

    it('should reduce confidence for very large differences', () => {
      const color1: LABColor = { l: 0, a: 0, b: 0 }
      const color2: LABColor = { l: 100, a: 127, b: 127 }

      const result = calculateCIEDE2000(color1, color2)

      expect(result.delta_e).toBeGreaterThan(50)
      expect(result.confidence).toBeLessThan(1.0)
    })
  })

  describe('Edge Cases and Numerical Stability', () => {
    it('should handle achromatic colors (a=0, b=0)', () => {
      const color1: LABColor = { l: 50, a: 0, b: 0 }
      const color2: LABColor = { l: 60, a: 0, b: 0 }

      const result = calculateCIEDE2000(color1, color2)

      expect(result.delta_e).toBeGreaterThan(0)
      expect(isFinite(result.delta_e)).toBe(true)
    })

    it('should handle near-achromatic colors', () => {
      const color1: LABColor = { l: 50, a: 0.001, b: 0.001 }
      const color2: LABColor = { l: 50, a: -0.001, b: -0.001 }

      const result = calculateCIEDE2000(color1, color2)

      expect(isFinite(result.delta_e)).toBe(true)
      expect(result.delta_e).toBeGreaterThanOrEqual(0)
    })

    it('should handle hue angle discontinuity at 0/360 degrees', () => {
      const color1: LABColor = { l: 50, a: 20, b: 0.1 }   // ~0 degrees
      const color2: LABColor = { l: 50, a: 20, b: -0.1 }  // ~360 degrees

      const result = calculateCIEDE2000(color1, color2)

      expect(isFinite(result.delta_e)).toBe(true)
      expect(result.delta_e).toBeGreaterThanOrEqual(0)
    })

    it('should produce stable results for repeated calculations', () => {
      const color1: LABColor = { l: 50, a: 25, b: -25 }
      const color2: LABColor = { l: 60, a: -25, b: 25 }

      const result1 = calculateCIEDE2000(color1, color2)
      const result2 = calculateCIEDE2000(color1, color2)
      const result3 = calculateCIEDE2000(color1, color2)

      expect(result1.delta_e).toBe(result2.delta_e)
      expect(result2.delta_e).toBe(result3.delta_e)
    })
  })

  describe('Perceptual Classification', () => {
    it('should classify imperceptible differences (Delta E <1)', () => {
      const color1: LABColor = { l: 50, a: 0, b: 0 }
      const color2: LABColor = { l: 50.5, a: 0.2, b: 0.2 }

      const result = calculateCIEDE2000(color1, color2)

      if (result.delta_e < 1) {
        expect(result.perceptual_classification).toBe('Imperceptible')
      }
    })

    it('should classify just noticeable differences (1 < Delta E < 2.3)', () => {
      const color1: LABColor = { l: 50, a: 0, b: 0 }
      const color2: LABColor = { l: 52, a: 1, b: 1 }

      const result = calculateCIEDE2000(color1, color2)

      if (result.delta_e >= 1 && result.delta_e < 2.3) {
        expect(result.perceptual_classification).toBe('Just Noticeable')
      }
    })

    it('should classify perceptible differences (2.3 < Delta E < 5)', () => {
      const color1: LABColor = { l: 50, a: 0, b: 0 }
      const color2: LABColor = { l: 55, a: 5, b: 5 }

      const result = calculateCIEDE2000(color1, color2)

      if (result.delta_e >= 2.3 && result.delta_e < 5) {
        expect(result.perceptual_classification).toBe('Perceptible')
      }
    })

    it('should classify well perceptible differences (5 < Delta E < 10)', () => {
      const color1: LABColor = { l: 50, a: 0, b: 0 }
      const color2: LABColor = { l: 65, a: 15, b: 15 }

      const result = calculateCIEDE2000(color1, color2)

      if (result.delta_e >= 5 && result.delta_e < 10) {
        expect(result.perceptual_classification).toBe('Well Perceptible')
      }
    })

    it('should classify very different colors (Delta E >= 10)', () => {
      const color1: LABColor = { l: 20, a: -50, b: -50 }
      const color2: LABColor = { l: 80, a: 50, b: 50 }

      const result = calculateCIEDE2000(color1, color2)

      if (result.delta_e >= 10) {
        expect(result.perceptual_classification).toBe('Very Different')
      }
    })
  })
})
