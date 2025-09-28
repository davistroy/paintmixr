import { describe, it, expect, beforeEach } from '@jest/globals'
import { findBestColorMatch } from '@/lib/paint-mixing/color-matching'
import { predictColorFromRatios } from '@/lib/paint-mixing/kubelka-munk'
import { calculateDeltaE } from '@/lib/color-math/delta-e'
import { convertRgbToLab, convertLabToRgb } from '@/lib/color-math/lab-conversions'
import type { ColorValue, PaintData, MixingFormula } from '@/types/types'

describe('Paint Mixing Algorithms', () => {
  const mockPaintDatabase: PaintData[] = [
    {
      id: 'titanium-white',
      name: 'Titanium White',
      ks_coefficients: { k: 0.05, s: 12.0 },
      lab_values: { l: 96.5, a: -0.2, b: 1.8 },
    },
    {
      id: 'cadmium-red-medium',
      name: 'Cadmium Red Medium',
      ks_coefficients: { k: 8.2, s: 5.1 },
      lab_values: { l: 45.2, a: 68.4, b: 54.1 },
    },
    {
      id: 'cadmium-yellow-medium',
      name: 'Cadmium Yellow Medium',
      ks_coefficients: { k: 2.1, s: 8.7 },
      lab_values: { l: 78.3, a: 12.5, b: 78.2 },
    },
    {
      id: 'ultramarine-blue',
      name: 'Ultramarine Blue',
      ks_coefficients: { k: 12.5, s: 3.2 },
      lab_values: { l: 29.8, a: 15.2, b: -58.7 },
    },
  ]

  describe('Color Matching', () => {
    it('should find exact match for paint in database', () => {
      const targetColor: ColorValue = {
        hex: '#ffffff',
        rgb: { r: 255, g: 255, b: 255 },
        lab: { l: 96.5, a: -0.2, b: 1.8 },
      }

      const result = findBestColorMatch({
        targetColor,
        availablePaints: mockPaintDatabase,
        maxPaints: 3,
        volumeMl: 100,
        tolerance: 1.0,
      })

      expect(result.success).toBe(true)
      expect(result.formula?.deltaE).toBeLessThanOrEqual(1.0)
      expect(result.formula?.paints).toHaveLength(1)
      expect(result.formula?.paints[0].paint_id).toBe('titanium-white')
    })

    it('should mix multiple paints for complex colors', () => {
      // Orange target color
      const targetColor: ColorValue = {
        hex: '#ff8000',
        rgb: { r: 255, g: 128, b: 0 },
        lab: { l: 66.5, a: 40.2, b: 65.3 },
      }

      const result = findBestColorMatch({
        targetColor,
        availablePaints: mockPaintDatabase,
        maxPaints: 3,
        volumeMl: 100,
        tolerance: 4.0,
      })

      expect(result.success).toBe(true)
      expect(result.formula?.deltaE).toBeLessThanOrEqual(4.0)
      expect(result.formula?.paints.length).toBeGreaterThan(1)

      // Should include red and yellow for orange
      const paintIds = result.formula?.paints.map(p => p.paint_id)
      expect(paintIds).toContain('cadmium-red-medium')
      expect(paintIds).toContain('cadmium-yellow-medium')
    })

    it('should respect maximum paint count', () => {
      const targetColor: ColorValue = {
        hex: '#8040c0',
        rgb: { r: 128, g: 64, b: 192 },
        lab: { l: 40.5, a: 35.2, b: -45.3 },
      }

      const result = findBestColorMatch({
        targetColor,
        availablePaints: mockPaintDatabase,
        maxPaints: 2,
        volumeMl: 100,
        tolerance: 6.0,
      })

      expect(result.success).toBe(true)
      expect(result.formula?.paints).toHaveLength(2)
    })

    it('should return failure for impossible colors', () => {
      // Highly saturated green that cannot be mixed from available paints
      const targetColor: ColorValue = {
        hex: '#00ff00',
        rgb: { r: 0, g: 255, b: 0 },
        lab: { l: 87.7, a: -86.2, b: 83.2 },
      }

      const result = findBestColorMatch({
        targetColor,
        availablePaints: mockPaintDatabase,
        maxPaints: 3,
        volumeMl: 100,
        tolerance: 2.0,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('tolerance')
    })

    it('should preserve total volume in mixing formula', () => {
      const targetColor: ColorValue = {
        hex: '#ff8080',
        rgb: { r: 255, g: 128, b: 128 },
        lab: { l: 70.2, a: 45.8, b: 25.1 },
      }

      const volumeMl = 50
      const result = findBestColorMatch({
        targetColor,
        availablePaints: mockPaintDatabase,
        maxPaints: 3,
        volumeMl,
        tolerance: 4.0,
      })

      expect(result.success).toBe(true)
      const totalVolume = result.formula?.paints.reduce((sum, paint) => sum + paint.volume_ml, 0)
      expect(totalVolume).toBeCloseTo(volumeMl, 1)
    })
  })

  describe('Color Prediction from Ratios', () => {
    it('should predict single paint color accurately', () => {
      const ratios = [
        { paint_id: 'cadmium-red-medium', ratio: 1.0 },
      ]

      const result = predictColorFromRatios({
        ratios,
        totalVolume: 100,
        paintDatabase: mockPaintDatabase,
      })

      expect(result.success).toBe(true)
      expect(result.predictedColor?.lab.l).toBeCloseTo(45.2, 1)
      expect(result.predictedColor?.lab.a).toBeCloseTo(68.4, 1)
      expect(result.predictedColor?.lab.b).toBeCloseTo(54.1, 1)
    })

    it('should predict mixed color from multiple paints', () => {
      const ratios = [
        { paint_id: 'cadmium-red-medium', ratio: 0.5 },
        { paint_id: 'cadmium-yellow-medium', ratio: 0.5 },
      ]

      const result = predictColorFromRatios({
        ratios,
        totalVolume: 100,
        paintDatabase: mockPaintDatabase,
      })

      expect(result.success).toBe(true)

      // Result should be between red and yellow
      const predictedL = result.predictedColor?.lab.l || 0
      expect(predictedL).toBeGreaterThan(45.2) // Red L value
      expect(predictedL).toBeLessThan(78.3) // Yellow L value
    })

    it('should handle invalid paint IDs', () => {
      const ratios = [
        { paint_id: 'non-existent-paint', ratio: 1.0 },
      ]

      const result = predictColorFromRatios({
        ratios,
        totalVolume: 100,
        paintDatabase: mockPaintDatabase,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should normalize ratios that do not sum to 1', () => {
      const ratios = [
        { paint_id: 'cadmium-red-medium', ratio: 2.0 },
        { paint_id: 'cadmium-yellow-medium', ratio: 2.0 },
      ]

      const result = predictColorFromRatios({
        ratios,
        totalVolume: 100,
        paintDatabase: mockPaintDatabase,
      })

      expect(result.success).toBe(true)
      // Should treat as 50/50 mix despite input ratios summing to 4
      expect(result.predictedColor).toBeDefined()
    })
  })

  describe('Delta E Calculations', () => {
    it('should calculate zero Delta E for identical colors', () => {
      const color1 = { l: 50.0, a: 25.0, b: -25.0 }
      const color2 = { l: 50.0, a: 25.0, b: -25.0 }

      const deltaE = calculateDeltaE(color1, color2)
      expect(deltaE).toBeCloseTo(0, 2)
    })

    it('should calculate correct Delta E for different colors', () => {
      const color1 = { l: 50.0, a: 0.0, b: 0.0 }
      const color2 = { l: 60.0, a: 0.0, b: 0.0 }

      const deltaE = calculateDeltaE(color1, color2)
      expect(deltaE).toBeGreaterThan(0)
      expect(deltaE).toBeCloseTo(10, 1) // Approximate Delta E for lightness difference
    })

    it('should be symmetric', () => {
      const color1 = { l: 45.2, a: 68.4, b: 54.1 }
      const color2 = { l: 78.3, a: 12.5, b: 78.2 }

      const deltaE1 = calculateDeltaE(color1, color2)
      const deltaE2 = calculateDeltaE(color2, color1)

      expect(deltaE1).toBeCloseTo(deltaE2, 5)
    })

    it('should meet commercial accuracy standards', () => {
      // Test colors that should be within commercial printing tolerance (≤ 4.0)
      const targetColor = { l: 50.0, a: 25.0, b: -25.0 }
      const matchedColor = { l: 51.5, a: 26.2, b: -23.8 }

      const deltaE = calculateDeltaE(targetColor, matchedColor)
      expect(deltaE).toBeLessThanOrEqual(4.0)
    })
  })

  describe('Color Space Conversions', () => {
    it('should convert RGB to LAB accurately', () => {
      // Pure red
      const lab = convertRgbToLab(255, 0, 0)

      expect(lab.l).toBeGreaterThan(40)
      expect(lab.l).toBeLessThan(60)
      expect(lab.a).toBeGreaterThan(50)
      expect(lab.b).toBeGreaterThan(30)
    })

    it('should convert LAB to RGB accurately', () => {
      // Known LAB values for red
      const rgb = convertLabToRgb(53.2, 80.1, 67.2)

      expect(rgb.r).toBeGreaterThan(200)
      expect(rgb.g).toBeLessThan(50)
      expect(rgb.b).toBeLessThan(50)
    })

    it('should be reversible within tolerance', () => {
      const originalRgb = { r: 128, g: 64, b: 192 }

      const lab = convertRgbToLab(originalRgb.r, originalRgb.g, originalRgb.b)
      const convertedRgb = convertLabToRgb(lab.l, lab.a, lab.b)

      // Allow for small rounding errors
      expect(convertedRgb.r).toBeCloseTo(originalRgb.r, 0)
      expect(convertedRgb.g).toBeCloseTo(originalRgb.g, 0)
      expect(convertedRgb.b).toBeCloseTo(originalRgb.b, 0)
    })

    it('should handle edge cases', () => {
      // Test black
      const blackLab = convertRgbToLab(0, 0, 0)
      expect(blackLab.l).toBeCloseTo(0, 1)
      expect(blackLab.a).toBeCloseTo(0, 1)
      expect(blackLab.b).toBeCloseTo(0, 1)

      // Test white
      const whiteLab = convertRgbToLab(255, 255, 255)
      expect(whiteLab.l).toBeGreaterThan(95)
      expect(Math.abs(whiteLab.a)).toBeLessThan(2)
      expect(Math.abs(whiteLab.b)).toBeLessThan(2)
    })
  })

  describe('Performance Requirements', () => {
    it('should complete color matching within 500ms for simple cases', async () => {
      const targetColor: ColorValue = {
        hex: '#ff8000',
        rgb: { r: 255, g: 128, b: 0 },
        lab: { l: 66.5, a: 40.2, b: 65.3 },
      }

      const startTime = performance.now()

      findBestColorMatch({
        targetColor,
        availablePaints: mockPaintDatabase,
        maxPaints: 3,
        volumeMl: 100,
        tolerance: 4.0,
      })

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(500)
    })

    it('should handle batch color predictions efficiently', () => {
      const batchSize = 10
      const predictions = []

      const startTime = performance.now()

      for (let i = 0; i < batchSize; i++) {
        const ratios = [
          { paint_id: 'cadmium-red-medium', ratio: i / batchSize },
          { paint_id: 'cadmium-yellow-medium', ratio: 1 - (i / batchSize) },
        ]

        const result = predictColorFromRatios({
          ratios,
          totalVolume: 100,
          paintDatabase: mockPaintDatabase,
        })

        predictions.push(result)
      }

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(100) // Should be very fast for batch operations
      expect(predictions).toHaveLength(batchSize)
      expect(predictions.every(p => p.success)).toBe(true)
    })
  })

  describe('Algorithm Accuracy', () => {
    it('should achieve Delta E ≤ 4.0 for common color mixtures', () => {
      // Orange from red + yellow
      const targetColor: ColorValue = {
        hex: '#ff8000',
        rgb: { r: 255, g: 128, b: 0 },
        lab: { l: 66.5, a: 40.2, b: 65.3 },
      }

      const result = findBestColorMatch({
        targetColor,
        availablePaints: mockPaintDatabase,
        maxPaints: 3,
        volumeMl: 100,
        tolerance: 4.0,
      })

      expect(result.success).toBe(true)
      expect(result.formula?.deltaE).toBeLessThanOrEqual(4.0)
    })

    it('should produce consistent results for repeated calculations', () => {
      const targetColor: ColorValue = {
        hex: '#ff8080',
        rgb: { r: 255, g: 128, b: 128 },
        lab: { l: 70.2, a: 45.8, b: 25.1 },
      }

      const params = {
        targetColor,
        availablePaints: mockPaintDatabase,
        maxPaints: 3,
        volumeMl: 100,
        tolerance: 4.0,
      }

      const result1 = findBestColorMatch(params)
      const result2 = findBestColorMatch(params)

      expect(result1.success).toBe(result2.success)
      expect(result1.formula?.deltaE).toBeCloseTo(result2.formula?.deltaE || 0, 2)
      expect(result1.formula?.paints).toHaveLength(result2.formula?.paints.length || 0)
    })
  })
})