/**
 * Kubelka-Munk Theory Unit Tests
 * Feature: 005-use-codebase-analysis
 * Task: T070
 *
 * Tests for K-M mixing with known inputs/outputs, coefficient calculations,
 * and opacity handling for paint mixing predictions.
 *
 * Coverage: src/lib/color-science/kubelka-munk-enhanced.ts
 */

import { describe, it, expect } from '@jest/globals'
import {
  reflectanceToKS,
  ksToReflectance,
  calculateKubelkaMunkCoefficients,
  getSurfaceReflectionForFinish,
  classifyOpacity,
  calculateRequiredThickness,
  KUBELKA_MUNK_CONSTANTS
} from '@/lib/color-science/kubelka-munk-enhanced'

describe('Kubelka-Munk Color Theory', () => {
  describe('Reflectance to K/S Conversion', () => {
    it('should convert high reflectance to low K/S ratio', () => {
      const reflectance = 0.9 // High reflectance (light color)
      const ks = reflectanceToKS(reflectance)

      expect(ks).toBeGreaterThan(0)
      expect(ks).toBeLessThan(1) // Low K/S for high reflectance
    })

    it('should convert low reflectance to high K/S ratio', () => {
      const reflectance = 0.1 // Low reflectance (dark color)
      const ks = reflectanceToKS(reflectance)

      expect(ks).toBeGreaterThan(10) // High K/S for low reflectance
    })

    it('should convert 50% reflectance to moderate K/S', () => {
      const reflectance = 0.5
      const ks = reflectanceToKS(reflectance)

      expect(ks).toBeGreaterThan(0.1)
      expect(ks).toBeLessThan(2)
    })

    it('should handle surface reflection correction', () => {
      const reflectance = 0.5
      const ksMatte = reflectanceToKS(reflectance, KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_MATTE)
      const ksGloss = reflectanceToKS(reflectance, KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_GLOSS)

      // Different surface reflections should yield different K/S
      expect(ksMatte).not.toBe(ksGloss)
    })

    it('should clamp reflectance to valid range [0.001, 0.999]', () => {
      const ks0 = reflectanceToKS(0)
      const ks1 = reflectanceToKS(1)

      expect(isFinite(ks0)).toBe(true)
      expect(isFinite(ks1)).toBe(true)
    })

    it('should produce monotonically decreasing K/S as reflectance increases', () => {
      const r1 = 0.3
      const r2 = 0.5
      const r3 = 0.7

      const ks1 = reflectanceToKS(r1)
      const ks2 = reflectanceToKS(r2)
      const ks3 = reflectanceToKS(r3)

      expect(ks1).toBeGreaterThan(ks2)
      expect(ks2).toBeGreaterThan(ks3)
    })
  })

  describe('K/S to Reflectance Conversion', () => {
    it('should convert low K/S to high reflectance', () => {
      const ks = 0.5 // Low K/S
      const reflectance = ksToReflectance(ks)

      expect(reflectance).toBeGreaterThan(0.5)
      expect(reflectance).toBeLessThan(1)
    })

    it('should convert high K/S to low reflectance', () => {
      const ks = 10 // High K/S
      const reflectance = ksToReflectance(ks)

      expect(reflectance).toBeGreaterThan(0)
      expect(reflectance).toBeLessThan(0.3)
    })

    it('should handle surface reflection correction', () => {
      const ks = 1.0
      const rMatte = ksToReflectance(ks, KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_MATTE)
      const rGloss = ksToReflectance(ks, KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_GLOSS)

      expect(rMatte).not.toBe(rGloss)
    })

    it('should return valid reflectance in [0.001, 0.999] range', () => {
      const testKS = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0]

      for (const ks of testKS) {
        const r = ksToReflectance(ks)

        expect(r).toBeGreaterThanOrEqual(0.001)
        expect(r).toBeLessThanOrEqual(0.999)
      }
    })

    it('should handle very high K/S values without errors', () => {
      const ks = 100 // Very high K/S
      const reflectance = ksToReflectance(ks)

      expect(isFinite(reflectance)).toBe(true)
      expect(reflectance).toBeGreaterThan(0)
    })
  })

  describe('Reflectance ↔ K/S Round-trip Conversion', () => {
    it('should preserve reflectance in round-trip conversion', () => {
      const testReflectances = [0.1, 0.3, 0.5, 0.7, 0.9]

      for (const original of testReflectances) {
        const ks = reflectanceToKS(original)
        const converted = ksToReflectance(ks)

        expect(converted).toBeCloseTo(original, 3)
      }
    })

    it('should preserve K/S in round-trip conversion', () => {
      const testKS = [0.5, 1.0, 2.0, 5.0, 10.0]

      for (const original of testKS) {
        const r = ksToReflectance(original)
        const converted = reflectanceToKS(r)

        expect(converted).toBeCloseTo(original, 2)
      }
    })

    it('should handle round-trip with different surface reflections', () => {
      const reflectance = 0.6
      const surfaceRefl = KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_SEMIGLOSS

      const ks = reflectanceToKS(reflectance, surfaceRefl)
      const converted = ksToReflectance(ks, surfaceRefl)

      expect(converted).toBeCloseTo(reflectance, 3)
    })
  })

  describe('Kubelka-Munk Coefficient Calculation', () => {
    it('should calculate K and S from reflectance', () => {
      const reflectance = 0.5
      const pigmentConcentration = 0.2
      const filmThickness = 0.1

      const coeffs = calculateKubelkaMunkCoefficients(
        reflectance,
        pigmentConcentration,
        filmThickness
      )

      expect(coeffs.k).toBeGreaterThan(0)
      expect(coeffs.s).toBeGreaterThan(0)
      expect(coeffs.k_over_s).toBeCloseTo(coeffs.k / coeffs.s, 4)
    })

    it('should increase K with higher pigment concentration', () => {
      const reflectance = 0.5
      const filmThickness = 0.1

      const coeffs1 = calculateKubelkaMunkCoefficients(reflectance, 0.1, filmThickness)
      const coeffs2 = calculateKubelkaMunkCoefficients(reflectance, 0.3, filmThickness)

      expect(coeffs2.k).toBeGreaterThan(coeffs1.k)
    })

    it('should decrease S with higher film thickness', () => {
      const reflectance = 0.5
      const pigmentConcentration = 0.2

      const coeffs1 = calculateKubelkaMunkCoefficients(reflectance, pigmentConcentration, 0.05)
      const coeffs2 = calculateKubelkaMunkCoefficients(reflectance, pigmentConcentration, 0.2)

      expect(coeffs1.s).toBeGreaterThan(coeffs2.s)
    })

    it('should apply minimum concentration threshold', () => {
      const reflectance = 0.5
      const filmThickness = 0.1

      const coeffs = calculateKubelkaMunkCoefficients(reflectance, 0, filmThickness)

      // Should use minimum concentration
      expect(coeffs.pigment_concentration).toBeGreaterThan(0)
    })

    it('should apply minimum thickness threshold', () => {
      const reflectance = 0.5
      const pigmentConcentration = 0.2

      const coeffs = calculateKubelkaMunkCoefficients(reflectance, pigmentConcentration, 0)

      // Should use minimum thickness
      expect(coeffs.film_thickness).toBeGreaterThan(0)
    })

    it('should store surface reflection in coefficients', () => {
      const reflectance = 0.5
      const pigmentConcentration = 0.2
      const filmThickness = 0.1
      const surfaceRefl = KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_METALLIC

      const coeffs = calculateKubelkaMunkCoefficients(
        reflectance,
        pigmentConcentration,
        filmThickness,
        surfaceRefl
      )

      expect(coeffs.surface_reflection).toBe(surfaceRefl)
    })

    it('should apply precision rounding to coefficients', () => {
      const reflectance = 0.5
      const pigmentConcentration = 0.2
      const filmThickness = 0.1

      const coeffs = calculateKubelkaMunkCoefficients(
        reflectance,
        pigmentConcentration,
        filmThickness
      )

      // Check that values are rounded to precision
      const kString = coeffs.k.toString()
      const sString = coeffs.s.toString()

      const kDecimalPlaces = kString.includes('.') ? kString.split('.')[1].length : 0
      const sDecimalPlaces = sString.includes('.') ? sString.split('.')[1].length : 0

      expect(kDecimalPlaces).toBeLessThanOrEqual(6)
      expect(sDecimalPlaces).toBeLessThanOrEqual(6)
    })
  })

  describe('Surface Reflection for Different Finishes', () => {
    it('should return matte surface reflection', () => {
      const value = getSurfaceReflectionForFinish('matte')

      expect(value).toBe(KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_MATTE)
    })

    it('should return semigloss surface reflection', () => {
      const value = getSurfaceReflectionForFinish('semigloss')

      expect(value).toBe(KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_SEMIGLOSS)
    })

    it('should return gloss surface reflection', () => {
      const value = getSurfaceReflectionForFinish('gloss')

      expect(value).toBe(KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_GLOSS)
    })

    it('should return metallic surface reflection', () => {
      const value = getSurfaceReflectionForFinish('metallic')

      expect(value).toBe(KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_METALLIC)
    })

    it('should return pearlescent surface reflection', () => {
      const value = getSurfaceReflectionForFinish('pearlescent')

      expect(value).toBe(KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_METALLIC)
    })

    it('should default to matte for unknown finish', () => {
      const value = getSurfaceReflectionForFinish('unknown-finish')

      expect(value).toBe(KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_MATTE)
    })

    it('should handle case-insensitive finish types', () => {
      const value1 = getSurfaceReflectionForFinish('GLOSS')
      const value2 = getSurfaceReflectionForFinish('Gloss')
      const value3 = getSurfaceReflectionForFinish('gloss')

      expect(value1).toBe(KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_GLOSS)
      expect(value2).toBe(KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_GLOSS)
      expect(value3).toBe(KUBELKA_MUNK_CONSTANTS.SURFACE_REFLECTION_GLOSS)
    })

    it('should produce increasing reflection for glossier finishes', () => {
      const matte = getSurfaceReflectionForFinish('matte')
      const semigloss = getSurfaceReflectionForFinish('semigloss')
      const gloss = getSurfaceReflectionForFinish('gloss')
      const metallic = getSurfaceReflectionForFinish('metallic')

      expect(matte).toBeLessThan(semigloss)
      expect(semigloss).toBeLessThan(gloss)
      expect(gloss).toBeLessThan(metallic)
    })
  })

  describe('Opacity Classification', () => {
    it('should classify opacity >= 0.99 as Opaque', () => {
      expect(classifyOpacity(0.99)).toBe('Opaque')
      expect(classifyOpacity(1.0)).toBe('Opaque')
    })

    it('should classify opacity >= 0.7 as Semi-opaque', () => {
      expect(classifyOpacity(0.7)).toBe('Semi-opaque')
      expect(classifyOpacity(0.85)).toBe('Semi-opaque')
      expect(classifyOpacity(0.98)).toBe('Semi-opaque')
    })

    it('should classify opacity >= 0.3 as Translucent', () => {
      expect(classifyOpacity(0.3)).toBe('Translucent')
      expect(classifyOpacity(0.5)).toBe('Translucent')
      expect(classifyOpacity(0.69)).toBe('Translucent')
    })

    it('should classify opacity < 0.3 as Transparent', () => {
      expect(classifyOpacity(0.0)).toBe('Transparent')
      expect(classifyOpacity(0.1)).toBe('Transparent')
      expect(classifyOpacity(0.29)).toBe('Transparent')
    })

    it('should handle boundary values correctly', () => {
      expect(classifyOpacity(0.999)).toBe('Opaque')
      expect(classifyOpacity(0.7)).toBe('Semi-opaque')
      expect(classifyOpacity(0.3)).toBe('Translucent')
      expect(classifyOpacity(0.01)).toBe('Transparent')
    })
  })

  describe('Required Thickness Calculation', () => {
    it('should calculate thickness for target opacity', () => {
      const coeffs = {
        k: 1.0,
        s: 2.0,
        k_over_s: 0.5,
        surface_reflection: 0.04,
        film_thickness: 0.1,
        pigment_concentration: 0.2
      }

      const thickness = calculateRequiredThickness(coeffs, 0.9)

      expect(thickness).toBeGreaterThan(0)
      expect(isFinite(thickness)).toBe(true)
    })

    it('should return 0 for zero scattering coefficient', () => {
      const coeffs = {
        k: 1.0,
        s: 0,
        k_over_s: 0,
        surface_reflection: 0.04,
        film_thickness: 0.1,
        pigment_concentration: 0.2
      }

      const thickness = calculateRequiredThickness(coeffs, 0.9)

      expect(thickness).toBe(0)
    })

    it('should return 0 for zero target opacity', () => {
      const coeffs = {
        k: 1.0,
        s: 2.0,
        k_over_s: 0.5,
        surface_reflection: 0.04,
        film_thickness: 0.1,
        pigment_concentration: 0.2
      }

      const thickness = calculateRequiredThickness(coeffs, 0)

      expect(thickness).toBe(0)
    })

    it('should return MAX_THICKNESS for opacity >= 1', () => {
      const coeffs = {
        k: 1.0,
        s: 2.0,
        k_over_s: 0.5,
        surface_reflection: 0.04,
        film_thickness: 0.1,
        pigment_concentration: 0.2
      }

      const thickness = calculateRequiredThickness(coeffs, 1.0)

      expect(thickness).toBe(KUBELKA_MUNK_CONSTANTS.MAX_THICKNESS)
    })

    it('should increase thickness for higher target opacity', () => {
      const coeffs = {
        k: 1.0,
        s: 2.0,
        k_over_s: 0.5,
        surface_reflection: 0.04,
        film_thickness: 0.1,
        pigment_concentration: 0.2
      }

      const thickness1 = calculateRequiredThickness(coeffs, 0.5)
      const thickness2 = calculateRequiredThickness(coeffs, 0.7)
      const thickness3 = calculateRequiredThickness(coeffs, 0.9)

      expect(thickness1).toBeLessThan(thickness2)
      expect(thickness2).toBeLessThan(thickness3)
    })

    it('should clamp thickness to valid range', () => {
      const coeffs = {
        k: 0.1,
        s: 10.0,
        k_over_s: 0.01,
        surface_reflection: 0.04,
        film_thickness: 0.1,
        pigment_concentration: 0.2
      }

      const thickness = calculateRequiredThickness(coeffs, 0.8)

      expect(thickness).toBeGreaterThanOrEqual(KUBELKA_MUNK_CONSTANTS.MIN_THICKNESS)
      expect(thickness).toBeLessThanOrEqual(KUBELKA_MUNK_CONSTANTS.MAX_THICKNESS)
    })

    it('should return MAX_THICKNESS when target exceeds infinite opacity', () => {
      const coeffs = {
        k: 0.5,
        s: 3.0,
        k_over_s: 0.167,
        surface_reflection: 0.04,
        film_thickness: 0.1,
        pigment_concentration: 0.2
      }

      // Request opacity very close to 1
      const thickness = calculateRequiredThickness(coeffs, 0.99)

      expect(thickness).toBeGreaterThan(0)
      expect(thickness).toBeLessThanOrEqual(KUBELKA_MUNK_CONSTANTS.MAX_THICKNESS)
    })
  })

  describe('Coefficient Edge Cases', () => {
    it('should handle very low reflectance gracefully', () => {
      const reflectance = 0.01
      const pigmentConcentration = 0.5
      const filmThickness = 0.1

      const coeffs = calculateKubelkaMunkCoefficients(
        reflectance,
        pigmentConcentration,
        filmThickness
      )

      expect(isFinite(coeffs.k)).toBe(true)
      expect(isFinite(coeffs.s)).toBe(true)
      expect(coeffs.k).toBeGreaterThan(0)
      expect(coeffs.s).toBeGreaterThan(0)
    })

    it('should handle very high reflectance gracefully', () => {
      const reflectance = 0.99
      const pigmentConcentration = 0.5
      const filmThickness = 0.1

      const coeffs = calculateKubelkaMunkCoefficients(
        reflectance,
        pigmentConcentration,
        filmThickness
      )

      expect(isFinite(coeffs.k)).toBe(true)
      expect(isFinite(coeffs.s)).toBe(true)
      expect(coeffs.k).toBeGreaterThan(0)
      expect(coeffs.s).toBeGreaterThan(0)
    })

    it('should handle very thin films', () => {
      const reflectance = 0.5
      const pigmentConcentration = 0.2
      const filmThickness = 0.001

      const coeffs = calculateKubelkaMunkCoefficients(
        reflectance,
        pigmentConcentration,
        filmThickness
      )

      expect(isFinite(coeffs.k)).toBe(true)
      expect(isFinite(coeffs.s)).toBe(true)
    })

    it('should handle very thick films', () => {
      const reflectance = 0.5
      const pigmentConcentration = 0.2
      const filmThickness = 5.0

      const coeffs = calculateKubelkaMunkCoefficients(
        reflectance,
        pigmentConcentration,
        filmThickness
      )

      expect(isFinite(coeffs.k)).toBe(true)
      expect(isFinite(coeffs.s)).toBe(true)
    })

    it('should produce deterministic results for same inputs', () => {
      const reflectance = 0.5
      const pigmentConcentration = 0.2
      const filmThickness = 0.1

      const coeffs1 = calculateKubelkaMunkCoefficients(reflectance, pigmentConcentration, filmThickness)
      const coeffs2 = calculateKubelkaMunkCoefficients(reflectance, pigmentConcentration, filmThickness)
      const coeffs3 = calculateKubelkaMunkCoefficients(reflectance, pigmentConcentration, filmThickness)

      expect(coeffs1.k).toBe(coeffs2.k)
      expect(coeffs2.k).toBe(coeffs3.k)
      expect(coeffs1.s).toBe(coeffs2.s)
      expect(coeffs2.s).toBe(coeffs3.s)
    })
  })
})
