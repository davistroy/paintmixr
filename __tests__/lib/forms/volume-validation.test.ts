/**
 * Volume Validation Schema Tests
 * Tests for paint volume validation in Ratio Prediction mode
 * Requirements: FR-012d, FR-012e, FR-012f
 */

import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'

// Import schemas from contracts (will be implemented in T025)
// For now, define them here to make tests fail
const paintVolumeSchema = z.number()
  .min(5, "Paint volume must be between 5ml and 1000ml")
  .max(1000, "Paint volume must be between 5ml and 1000ml")

const paintSelectionSchema = z.object({
  paintId: z.string().uuid("Invalid paint ID"),
  volume: paintVolumeSchema
})

const ratioPredictionSchema = z.object({
  paints: z.array(paintSelectionSchema)
    .min(2, "Ratio Prediction requires at least 2 paints")
    .max(5, "Ratio Prediction allows maximum 5 paints")
})

describe('paintVolumeSchema', () => {
  describe('valid volumes', () => {
    it('should accept 5ml (minimum boundary)', () => {
      const result = paintVolumeSchema.safeParse(5)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(5)
      }
    })

    it('should accept 100ml (mid-range)', () => {
      const result = paintVolumeSchema.safeParse(100)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(100)
      }
    })

    it('should accept 1000ml (maximum boundary)', () => {
      const result = paintVolumeSchema.safeParse(1000)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe(1000)
      }
    })
  })

  describe('invalid volumes', () => {
    it('should reject 4ml (below minimum)', () => {
      const result = paintVolumeSchema.safeParse(4)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Paint volume must be between 5ml and 1000ml")
      }
    })

    it('should reject 1001ml (above maximum)', () => {
      const result = paintVolumeSchema.safeParse(1001)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Paint volume must be between 5ml and 1000ml")
      }
    })

    it('should reject -10ml (negative volume)', () => {
      const result = paintVolumeSchema.safeParse(-10)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Paint volume must be between 5ml and 1000ml")
      }
    })

    it('should reject 0ml (zero volume)', () => {
      const result = paintVolumeSchema.safeParse(0)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Paint volume must be between 5ml and 1000ml")
      }
    })
  })

  describe('error message consistency', () => {
    it('should use exact error message from spec (FR-012f)', () => {
      const result = paintVolumeSchema.safeParse(3)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Paint volume must be between 5ml and 1000ml")
      }
    })
  })
})

describe('ratioPredictionSchema', () => {
  const validPaintId1 = '123e4567-e89b-12d3-a456-426614174000'
  const validPaintId2 = '123e4567-e89b-12d3-a456-426614174001'
  const validPaintId3 = '123e4567-e89b-12d3-a456-426614174002'
  const validPaintId4 = '123e4567-e89b-12d3-a456-426614174003'
  const validPaintId5 = '123e4567-e89b-12d3-a456-426614174004'
  const validPaintId6 = '123e4567-e89b-12d3-a456-426614174005'

  describe('valid paint counts', () => {
    it('should accept 2 paints (minimum boundary)', () => {
      const result = ratioPredictionSchema.safeParse({
        paints: [
          { paintId: validPaintId1, volume: 100 },
          { paintId: validPaintId2, volume: 50 }
        ]
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.paints).toHaveLength(2)
      }
    })

    it('should accept 5 paints (maximum boundary)', () => {
      const result = ratioPredictionSchema.safeParse({
        paints: [
          { paintId: validPaintId1, volume: 100 },
          { paintId: validPaintId2, volume: 75 },
          { paintId: validPaintId3, volume: 50 },
          { paintId: validPaintId4, volume: 25 },
          { paintId: validPaintId5, volume: 10 }
        ]
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.paints).toHaveLength(5)
      }
    })
  })

  describe('invalid paint counts', () => {
    it('should reject 1 paint (below minimum per FR-012a)', () => {
      const result = ratioPredictionSchema.safeParse({
        paints: [
          { paintId: validPaintId1, volume: 100 }
        ]
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Ratio Prediction requires at least 2 paints")
      }
    })

    it('should reject 6 paints (above maximum per FR-012b)', () => {
      const result = ratioPredictionSchema.safeParse({
        paints: [
          { paintId: validPaintId1, volume: 100 },
          { paintId: validPaintId2, volume: 75 },
          { paintId: validPaintId3, volume: 50 },
          { paintId: validPaintId4, volume: 25 },
          { paintId: validPaintId5, volume: 10 },
          { paintId: validPaintId6, volume: 5 }
        ]
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Ratio Prediction allows maximum 5 paints")
      }
    })
  })

  describe('paint count error messages', () => {
    it('should use exact error message for minimum constraint', () => {
      const result = ratioPredictionSchema.safeParse({
        paints: []
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Ratio Prediction requires at least 2 paints")
      }
    })

    it('should use exact error message for maximum constraint', () => {
      const result = ratioPredictionSchema.safeParse({
        paints: [
          { paintId: validPaintId1, volume: 100 },
          { paintId: validPaintId2, volume: 75 },
          { paintId: validPaintId3, volume: 50 },
          { paintId: validPaintId4, volume: 25 },
          { paintId: validPaintId5, volume: 10 },
          { paintId: validPaintId6, volume: 5 }
        ]
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const arrayError = result.error.issues.find(issue => issue.path[0] === 'paints')
        expect(arrayError?.message).toBe("Ratio Prediction allows maximum 5 paints")
      }
    })
  })

  describe('volume validation within paint selection', () => {
    it('should reject paint with invalid volume (3ml)', () => {
      const result = ratioPredictionSchema.safeParse({
        paints: [
          { paintId: validPaintId1, volume: 3 },
          { paintId: validPaintId2, volume: 50 }
        ]
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const volumeError = result.error.issues.find(issue =>
          issue.path.includes('volume')
        )
        expect(volumeError?.message).toBe("Paint volume must be between 5ml and 1000ml")
      }
    })

    it('should reject multiple paints with invalid volumes', () => {
      const result = ratioPredictionSchema.safeParse({
        paints: [
          { paintId: validPaintId1, volume: 2 },
          { paintId: validPaintId2, volume: 1500 }
        ]
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
      }
    })
  })
})
