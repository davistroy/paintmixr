/**
 * Color Conversion Unit Tests
 * Feature: 005-use-codebase-analysis
 * Task: T069
 *
 * Tests for LAB ↔ RGB color conversions with known reference values,
 * hex color validation, and ColorValue type guards.
 *
 * Coverage: src/lib/color-science/lab-enhanced.ts
 */

import { describe, it, expect } from '@jest/globals'
import {
  rgbToXYZ,
  xyzToRGB,
  xyzToLAB,
  labToXYZ,
  rgbToLAB,
  labToRGB,
  hexToLAB,
  labToHex,
  validateLABColor,
  LAB_CONSTANTS,
  type RGBColor,
  type LABColor,
  type XYZColor
} from '@/lib/color-science/lab-enhanced'

describe('Color Conversion Functions', () => {
  describe('RGB to XYZ Conversion', () => {
    it('should convert pure white RGB to XYZ', () => {
      const white: RGBColor = { r: 255, g: 255, b: 255 }
      const xyz = rgbToXYZ(white)

      // D65 white point values
      expect(xyz.x).toBeCloseTo(LAB_CONSTANTS.XN, 1)
      expect(xyz.y).toBeCloseTo(LAB_CONSTANTS.YN, 1)
      expect(xyz.z).toBeCloseTo(LAB_CONSTANTS.ZN, 1)
    })

    it('should convert pure black RGB to XYZ', () => {
      const black: RGBColor = { r: 0, g: 0, b: 0 }
      const xyz = rgbToXYZ(black)

      expect(xyz.x).toBeCloseTo(0, 1)
      expect(xyz.y).toBeCloseTo(0, 1)
      expect(xyz.z).toBeCloseTo(0, 1)
    })

    it('should convert pure red RGB to XYZ', () => {
      const red: RGBColor = { r: 255, g: 0, b: 0 }
      const xyz = rgbToXYZ(red)

      expect(xyz.x).toBeGreaterThan(0)
      expect(xyz.y).toBeGreaterThan(0)
      // Pure red has some Z component due to color matching functions
      expect(xyz.z).toBeGreaterThan(0)
      expect(xyz.z).toBeLessThan(xyz.x) // But less than X
    })

    it('should convert middle gray RGB to XYZ', () => {
      const gray: RGBColor = { r: 128, g: 128, b: 128 }
      const xyz = rgbToXYZ(gray)

      // Middle gray should be around 21-22 on all axes
      expect(xyz.x).toBeGreaterThan(15)
      expect(xyz.x).toBeLessThan(25)
      expect(xyz.y).toBeGreaterThan(15)
      expect(xyz.y).toBeLessThan(25)
      expect(xyz.z).toBeGreaterThan(15)
      expect(xyz.z).toBeLessThan(25)
    })

    it('should apply sRGB gamma correction correctly', () => {
      const rgb1: RGBColor = { r: 10, g: 10, b: 10 }
      const rgb2: RGBColor = { r: 20, g: 20, b: 20 }

      const xyz1 = rgbToXYZ(rgb1)
      const xyz2 = rgbToXYZ(rgb2)

      // Due to gamma correction, doubling RGB doesn't double XYZ
      expect(xyz2.x / xyz1.x).toBeGreaterThan(2)
      expect(xyz2.y / xyz1.y).toBeGreaterThan(2)
      expect(xyz2.z / xyz1.z).toBeGreaterThan(2)
    })
  })

  describe('XYZ to RGB Conversion', () => {
    it('should convert white point XYZ to RGB white', () => {
      const xyz: XYZColor = {
        x: LAB_CONSTANTS.XN,
        y: LAB_CONSTANTS.YN,
        z: LAB_CONSTANTS.ZN
      }
      const rgb = xyzToRGB(xyz)

      expect(rgb.r).toBe(255)
      expect(rgb.g).toBe(255)
      expect(rgb.b).toBe(255)
    })

    it('should convert zero XYZ to RGB black', () => {
      const xyz: XYZColor = { x: 0, y: 0, z: 0 }
      const rgb = xyzToRGB(xyz)

      expect(rgb.r).toBe(0)
      expect(rgb.g).toBe(0)
      expect(rgb.b).toBe(0)
    })

    it('should clamp out-of-gamut colors to 0-255 range', () => {
      const xyz: XYZColor = { x: 200, y: 200, z: 200 } // Out of gamut
      const rgb = xyzToRGB(xyz)

      expect(rgb.r).toBeGreaterThanOrEqual(0)
      expect(rgb.r).toBeLessThanOrEqual(255)
      expect(rgb.g).toBeGreaterThanOrEqual(0)
      expect(rgb.g).toBeLessThanOrEqual(255)
      expect(rgb.b).toBeGreaterThanOrEqual(0)
      expect(rgb.b).toBeLessThanOrEqual(255)
    })

    it('should apply sRGB gamma correction on conversion', () => {
      const xyz1: XYZColor = { x: 5, y: 5, z: 5 }
      const xyz2: XYZColor = { x: 10, y: 10, z: 10 }

      const rgb1 = xyzToRGB(xyz1)
      const rgb2 = xyzToRGB(xyz2)

      // Gamma correction means RGB doesn't scale linearly
      const ratio1 = rgb2.r / rgb1.r
      const ratio2 = rgb2.g / rgb1.g
      const ratio3 = rgb2.b / rgb1.b

      expect(ratio1).toBeLessThan(2)
      expect(ratio2).toBeLessThan(2)
      expect(ratio3).toBeLessThan(2)
    })
  })

  describe('RGB ↔ XYZ Round-trip Conversion', () => {
    it('should preserve pure colors in round-trip', () => {
      const colors: RGBColor[] = [
        { r: 255, g: 0, b: 0 },    // Red
        { r: 0, g: 255, b: 0 },    // Green
        { r: 0, g: 0, b: 255 },    // Blue
        { r: 255, g: 255, b: 0 },  // Yellow
        { r: 0, g: 255, b: 255 },  // Cyan
        { r: 255, g: 0, b: 255 }   // Magenta
      ]

      for (const original of colors) {
        const xyz = rgbToXYZ(original)
        const converted = xyzToRGB(xyz)

        expect(converted.r).toBeCloseTo(original.r, 0)
        expect(converted.g).toBeCloseTo(original.g, 0)
        expect(converted.b).toBeCloseTo(original.b, 0)
      }
    })

    it('should preserve grayscale values in round-trip', () => {
      const grays: RGBColor[] = [
        { r: 0, g: 0, b: 0 },
        { r: 64, g: 64, b: 64 },
        { r: 128, g: 128, b: 128 },
        { r: 192, g: 192, b: 192 },
        { r: 255, g: 255, b: 255 }
      ]

      for (const original of grays) {
        const xyz = rgbToXYZ(original)
        const converted = xyzToRGB(xyz)

        expect(converted.r).toBeCloseTo(original.r, 0)
        expect(converted.g).toBeCloseTo(original.g, 0)
        expect(converted.b).toBeCloseTo(original.b, 0)
      }
    })
  })

  describe('XYZ to LAB Conversion', () => {
    it('should convert white point to L=100, a=0, b=0', () => {
      const xyz: XYZColor = {
        x: LAB_CONSTANTS.XN,
        y: LAB_CONSTANTS.YN,
        z: LAB_CONSTANTS.ZN
      }
      const lab = xyzToLAB(xyz)

      expect(lab.l).toBeCloseTo(100, 1)
      expect(lab.a).toBeCloseTo(0, 1)
      expect(lab.b).toBeCloseTo(0, 1)
    })

    it('should convert black to L=0, a=0, b=0', () => {
      const xyz: XYZColor = { x: 0, y: 0, z: 0 }
      const lab = xyzToLAB(xyz)

      expect(lab.l).toBeCloseTo(0, 1)
      expect(lab.a).toBeCloseTo(0, 1)
      expect(lab.b).toBeCloseTo(0, 1)
    })

    it('should produce consistent L values for achromatic colors', () => {
      const xyz50: XYZColor = {
        x: LAB_CONSTANTS.XN * 0.5,
        y: LAB_CONSTANTS.YN * 0.5,
        z: LAB_CONSTANTS.ZN * 0.5
      }
      const lab = xyzToLAB(xyz50)

      expect(lab.l).toBeGreaterThan(50)
      expect(lab.l).toBeLessThan(80)
      expect(lab.a).toBeCloseTo(0, 1)
      expect(lab.b).toBeCloseTo(0, 1)
    })
  })

  describe('LAB to XYZ Conversion', () => {
    it('should convert L=100, a=0, b=0 to white point', () => {
      const lab: LABColor = { l: 100, a: 0, b: 0 }
      const xyz = labToXYZ(lab)

      expect(xyz.x).toBeCloseTo(LAB_CONSTANTS.XN, 1)
      expect(xyz.y).toBeCloseTo(LAB_CONSTANTS.YN, 1)
      expect(xyz.z).toBeCloseTo(LAB_CONSTANTS.ZN, 1)
    })

    it('should convert L=0, a=0, b=0 to black', () => {
      const lab: LABColor = { l: 0, a: 0, b: 0 }
      const xyz = labToXYZ(lab)

      expect(xyz.x).toBeCloseTo(0, 1)
      expect(xyz.y).toBeCloseTo(0, 1)
      expect(xyz.z).toBeCloseTo(0, 1)
    })
  })

  describe('RGB to LAB Direct Conversion', () => {
    it('should convert white RGB to LAB L=100', () => {
      const white: RGBColor = { r: 255, g: 255, b: 255 }
      const lab = rgbToLAB(white)

      expect(lab.l).toBeCloseTo(100, 1)
      expect(lab.a).toBeCloseTo(0, 1)
      expect(lab.b).toBeCloseTo(0, 1)
    })

    it('should convert black RGB to LAB L=0', () => {
      const black: RGBColor = { r: 0, g: 0, b: 0 }
      const lab = rgbToLAB(black)

      expect(lab.l).toBeCloseTo(0, 1)
      expect(lab.a).toBeCloseTo(0, 1)
      expect(lab.b).toBeCloseTo(0, 1)
    })

    it('should convert pure red to positive a* value', () => {
      const red: RGBColor = { r: 255, g: 0, b: 0 }
      const lab = rgbToLAB(red)

      expect(lab.l).toBeGreaterThan(0)
      expect(lab.a).toBeGreaterThan(50) // Red has high positive a*
      // Pure red also has positive b* component (red-orange)
      expect(lab.b).toBeGreaterThan(0)
    })

    it('should convert pure green to negative a* value', () => {
      const green: RGBColor = { r: 0, g: 255, b: 0 }
      const lab = rgbToLAB(green)

      expect(lab.l).toBeGreaterThan(0)
      expect(lab.a).toBeLessThan(-50) // Green has high negative a*
      expect(lab.b).toBeGreaterThan(0)
    })

    it('should convert pure blue to negative b* value', () => {
      const blue: RGBColor = { r: 0, g: 0, b: 255 }
      const lab = rgbToLAB(blue)

      expect(lab.l).toBeGreaterThan(0)
      expect(lab.b).toBeLessThan(-50) // Blue has high negative b*
    })
  })

  describe('Hex Color Conversion', () => {
    it('should convert white hex to LAB', () => {
      const lab = hexToLAB('#ffffff')

      expect(lab.l).toBeCloseTo(100, 1)
      expect(lab.a).toBeCloseTo(0, 1)
      expect(lab.b).toBeCloseTo(0, 1)
    })

    it('should convert black hex to LAB', () => {
      const lab = hexToLAB('#000000')

      expect(lab.l).toBeCloseTo(0, 1)
      expect(lab.a).toBeCloseTo(0, 1)
      expect(lab.b).toBeCloseTo(0, 1)
    })

    it('should handle hex without # prefix', () => {
      const lab1 = hexToLAB('#ff0000')
      const lab2 = hexToLAB('ff0000')

      expect(lab1.l).toBeCloseTo(lab2.l, 2)
      expect(lab1.a).toBeCloseTo(lab2.a, 2)
      expect(lab1.b).toBeCloseTo(lab2.b, 2)
    })

    it('should convert lowercase hex correctly', () => {
      const lab1 = hexToLAB('#AABBCC')
      const lab2 = hexToLAB('#aabbcc')

      expect(lab1.l).toBeCloseTo(lab2.l, 2)
      expect(lab1.a).toBeCloseTo(lab2.a, 2)
      expect(lab1.b).toBeCloseTo(lab2.b, 2)
    })

    it('should throw error for invalid hex format', () => {
      expect(() => hexToLAB('#fff')).toThrow('Invalid hex color format')
      expect(() => hexToLAB('#fffffff')).toThrow('Invalid hex color format')
      expect(() => hexToLAB('invalid')).toThrow('Invalid hex color format')
    })
  })

  describe('LAB to Hex Conversion', () => {
    it('should convert white LAB to hex #ffffff', () => {
      const lab: LABColor = { l: 100, a: 0, b: 0 }
      const hex = labToHex(lab)

      expect(hex).toBe('#ffffff')
    })

    it('should convert black LAB to hex #000000', () => {
      const lab: LABColor = { l: 0, a: 0, b: 0 }
      const hex = labToHex(lab)

      expect(hex).toBe('#000000')
    })

    it('should always return lowercase hex', () => {
      const lab: LABColor = { l: 75, a: 25, b: -25 }
      const hex = labToHex(lab)

      expect(hex).toMatch(/^#[0-9a-f]{6}$/)
    })

    it('should pad hex values with leading zeros', () => {
      const lab: LABColor = { l: 5, a: 0, b: 0 }
      const hex = labToHex(lab)

      expect(hex).toHaveLength(7) // # + 6 chars
      expect(hex).toMatch(/^#[0-9a-f]{6}$/)
    })
  })

  describe('Hex ↔ LAB Round-trip Conversion', () => {
    it('should preserve common web colors in round-trip', () => {
      const testColors = [
        '#ffffff', // White
        '#000000', // Black
        '#ff0000', // Red
        '#00ff00', // Green
        '#0000ff', // Blue
        '#ffff00', // Yellow
        '#00ffff', // Cyan
        '#ff00ff', // Magenta
        '#808080'  // Gray
      ]

      for (const original of testColors) {
        const lab = hexToLAB(original)
        const converted = labToHex(lab)

        expect(converted).toBe(original.toLowerCase())
      }
    })

    it('should preserve arbitrary hex colors with minimal loss', () => {
      const testColors = [
        '#123456',
        '#abcdef',
        '#fedcba',
        '#a1b2c3'
      ]

      for (const original of testColors) {
        const lab = hexToLAB(original)
        const converted = labToHex(lab)

        // Allow small RGB differences due to rounding
        const origRgb = {
          r: parseInt(original.slice(1, 3), 16),
          g: parseInt(original.slice(3, 5), 16),
          b: parseInt(original.slice(5, 7), 16)
        }

        const convRgb = {
          r: parseInt(converted.slice(1, 3), 16),
          g: parseInt(converted.slice(3, 5), 16),
          b: parseInt(converted.slice(5, 7), 16)
        }

        expect(Math.abs(origRgb.r - convRgb.r)).toBeLessThanOrEqual(1)
        expect(Math.abs(origRgb.g - convRgb.g)).toBeLessThanOrEqual(1)
        expect(Math.abs(origRgb.b - convRgb.b)).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('LAB Color Validation', () => {
    it('should accept valid LAB colors within range', () => {
      const validColors: LABColor[] = [
        { l: 0, a: 0, b: 0 },
        { l: 100, a: 0, b: 0 },
        { l: 50, a: -128, b: -128 },
        { l: 50, a: 127, b: 127 },
        { l: 50, a: 50, b: -50 }
      ]

      for (const color of validColors) {
        expect(validateLABColor(color)).toBe(true)
      }
    })

    it('should reject LAB colors with L out of range', () => {
      const invalidColors: LABColor[] = [
        { l: -1, a: 0, b: 0 },
        { l: 101, a: 0, b: 0 },
        { l: -50, a: 0, b: 0 },
        { l: 200, a: 0, b: 0 }
      ]

      for (const color of invalidColors) {
        expect(validateLABColor(color)).toBe(false)
      }
    })

    it('should reject LAB colors with a* out of range', () => {
      const invalidColors: LABColor[] = [
        { l: 50, a: -129, b: 0 },
        { l: 50, a: 128, b: 0 },
        { l: 50, a: -200, b: 0 },
        { l: 50, a: 200, b: 0 }
      ]

      for (const color of invalidColors) {
        expect(validateLABColor(color)).toBe(false)
      }
    })

    it('should reject LAB colors with b* out of range', () => {
      const invalidColors: LABColor[] = [
        { l: 50, a: 0, b: -129 },
        { l: 50, a: 0, b: 128 },
        { l: 50, a: 0, b: -200 },
        { l: 50, a: 0, b: 200 }
      ]

      for (const color of invalidColors) {
        expect(validateLABColor(color)).toBe(false)
      }
    })

    it('should reject LAB colors with NaN values', () => {
      const invalidColors: LABColor[] = [
        { l: NaN, a: 0, b: 0 },
        { l: 50, a: NaN, b: 0 },
        { l: 50, a: 0, b: NaN },
        { l: NaN, a: NaN, b: NaN }
      ]

      for (const color of invalidColors) {
        expect(validateLABColor(color)).toBe(false)
      }
    })

    it('should reject LAB colors with non-numeric values', () => {
      const invalidColors: any[] = [
        { l: '50', a: 0, b: 0 },
        { l: 50, a: '0', b: 0 },
        { l: 50, a: 0, b: '0' },
        { l: null, a: 0, b: 0 },
        { l: undefined, a: 0, b: 0 }
      ]

      for (const color of invalidColors) {
        expect(validateLABColor(color)).toBe(false)
      }
    })
  })

  describe('Color Conversion Accuracy', () => {
    it('should maintain high precision in LAB conversions', () => {
      const rgb: RGBColor = { r: 128, g: 64, b: 192 }

      const lab = rgbToLAB(rgb)
      const backToRgb = labToRGB(lab)

      expect(Math.abs(backToRgb.r - rgb.r)).toBeLessThanOrEqual(1)
      expect(Math.abs(backToRgb.g - rgb.g)).toBeLessThanOrEqual(1)
      expect(Math.abs(backToRgb.b - rgb.b)).toBeLessThanOrEqual(1)
    })

    it('should produce deterministic results for same input', () => {
      const rgb: RGBColor = { r: 100, g: 150, b: 200 }

      const lab1 = rgbToLAB(rgb)
      const lab2 = rgbToLAB(rgb)

      expect(lab1.l).toBe(lab2.l)
      expect(lab1.a).toBe(lab2.a)
      expect(lab1.b).toBe(lab2.b)
    })
  })

  describe('Additional LAB Functions Coverage', () => {
    it('should calculate delta E CIE76', () => {
      const { deltaECIE76 } = require('@/lib/color-science/lab-enhanced')
      const color1: LABColor = { l: 50, a: 25, b: -25 }
      const color2: LABColor = { l: 60, a: 30, b: -30 }

      const deltaE = deltaECIE76(color1, color2)

      expect(deltaE).toBeGreaterThan(0)
      expect(deltaE).toBeLessThan(20)
    })

    it('should calculate delta E CIEDE2000', () => {
      const { deltaECIEDE2000 } = require('@/lib/color-science/lab-enhanced')
      const color1: LABColor = { l: 50, a: 25, b: -25 }
      const color2: LABColor = { l: 60, a: 30, b: -30 }

      const deltaE = deltaECIEDE2000(color1, color2)

      expect(deltaE).toBeGreaterThan(0)
      expect(deltaE).toBeLessThan(20)
    })

    it('should interpolate LAB colors', () => {
      const { interpolateLAB } = require('@/lib/color-science/lab-enhanced')
      const color1: LABColor = { l: 50, a: 0, b: 0 }
      const color2: LABColor = { l: 100, a: 0, b: 0 }

      const mid = interpolateLAB(color1, color2, 0.5)

      expect(mid.l).toBeCloseTo(75, 1)
      expect(mid.a).toBeCloseTo(0, 1)
      expect(mid.b).toBeCloseTo(0, 1)
    })

    it('should mix LAB colors with weights', () => {
      const { mixLABColors } = require('@/lib/color-science/lab-enhanced')
      const colors: LABColor[] = [
        { l: 50, a: 0, b: 0 },
        { l: 100, a: 0, b: 0 }
      ]
      const weights = [1, 1]

      const mixed = mixLABColors(colors, weights)

      expect(mixed.l).toBeCloseTo(75, 1)
    })

    it('should check if color is in paint gamut', () => {
      const { isColorInPaintGamut } = require('@/lib/color-science/lab-enhanced')
      const validColor: LABColor = { l: 50, a: 25, b: -25 }
      const invalidColor: LABColor = { l: 2, a: 0, b: 0 }

      expect(isColorInPaintGamut(validColor)).toBe(true)
      expect(isColorInPaintGamut(invalidColor)).toBe(false)
    })

    it('should compare colors for equality', () => {
      const { colorsAreEqual } = require('@/lib/color-science/lab-enhanced')
      const color1: LABColor = { l: 50, a: 25, b: -25 }
      const color2: LABColor = { l: 50, a: 25, b: -25 }
      const color3: LABColor = { l: 51, a: 25, b: -25 }

      expect(colorsAreEqual(color1, color2)).toBe(true)
      expect(colorsAreEqual(color1, color3)).toBe(false)
    })

    it('should classify color accuracy from delta E', () => {
      const { classifyColorAccuracy } = require('@/lib/color-science/lab-enhanced')

      expect(classifyColorAccuracy(0.5)).toBe('Excellent')
      expect(classifyColorAccuracy(1.5)).toBe('Good')
      expect(classifyColorAccuracy(3.0)).toBe('Acceptable')
      expect(classifyColorAccuracy(6.0)).toBe('Poor')
      expect(classifyColorAccuracy(10.0)).toBe('Unacceptable')
    })

    it('should generate complementary color', () => {
      const { generateComplementaryColor } = require('@/lib/color-science/lab-enhanced')
      const color: LABColor = { l: 50, a: 25, b: -25 }

      const complement = generateComplementaryColor(color)

      expect(complement.l).toBe(color.l)
      expect(complement.a).toBe(-color.a)
      expect(complement.b).toBe(-color.b)
    })

    it('should generate triadic colors', () => {
      const { generateTriadicColors } = require('@/lib/color-science/lab-enhanced')
      const color: LABColor = { l: 50, a: 25, b: -25 }

      const [triadic1, triadic2] = generateTriadicColors(color)

      expect(triadic1.l).toBe(color.l)
      expect(triadic2.l).toBe(color.l)
    })
  })
})
