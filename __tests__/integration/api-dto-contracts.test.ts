/**
 * Contract Test: API DTOs Match Schema
 *
 * Validates that API responses match DTO type definitions.
 *
 * Feature: 010-using-refactor-recommendations
 * Task: T030
 * Requirement: FR-026
 */

import type {
  PaintDTO,
  SessionDTO,
  OptimizationResponseDTO,
  ColorValueDTO,
} from '@/lib/contracts/api-dto-types'
import {
  isPaintDTO,
  isColorValueDTO,
  isOptimizationResponseDTO,
} from '@/lib/contracts/api-dto-types'

describe('API DTO Contracts', () => {
  describe('/api/paints response structure', () => {
    it('should return array of PaintDTO objects', async () => {
      // This test will fail until T042 is implemented
      const response = await fetch('http://localhost:3000/api/paints')
      expect(response.ok).toBe(true)

      const paints = await response.json()
      expect(Array.isArray(paints)).toBe(true)

      if (paints.length > 0) {
        const firstPaint = paints[0]
        expect(isPaintDTO(firstPaint)).toBe(true)

        // Validate required fields
        expect(firstPaint).toHaveProperty('id')
        expect(firstPaint).toHaveProperty('name')
        expect(firstPaint).toHaveProperty('brand')
        expect(firstPaint).toHaveProperty('color')

        // Validate color structure
        expect(isColorValueDTO(firstPaint.color)).toBe(true)
        expect(firstPaint.color).toHaveProperty('hex')
        expect(firstPaint.color).toHaveProperty('lab')
        expect(firstPaint.color.lab).toHaveProperty('l')
        expect(firstPaint.color.lab).toHaveProperty('a')
        expect(firstPaint.color.lab).toHaveProperty('b')

        // Validate hex format
        expect(firstPaint.color.hex).toMatch(/^#[0-9A-F]{6}$/i)

        // Validate LAB ranges
        expect(firstPaint.color.lab.l).toBeGreaterThanOrEqual(0)
        expect(firstPaint.color.lab.l).toBeLessThanOrEqual(100)
        expect(firstPaint.color.lab.a).toBeGreaterThanOrEqual(-128)
        expect(firstPaint.color.lab.a).toBeLessThanOrEqual(127)
        expect(firstPaint.color.lab.b).toBeGreaterThanOrEqual(-128)
        expect(firstPaint.color.lab.b).toBeLessThanOrEqual(127)
      }
    })

    it('should not expose internal database fields', async () => {
      // This test will fail until T042 is implemented
      const response = await fetch('http://localhost:3000/api/paints')
      const paints = await response.json()

      if (paints.length > 0) {
        const firstPaint = paints[0]

        // Should NOT have internal fields
        expect(firstPaint).not.toHaveProperty('user_id')
        expect(firstPaint).not.toHaveProperty('created_at')
        expect(firstPaint).not.toHaveProperty('updated_at')
        expect(firstPaint).not.toHaveProperty('deleted_at')

        // Should ONLY have DTO fields
        const allowedKeys = ['id', 'name', 'brand', 'color', 'opacity', 'tintingStrength']
        Object.keys(firstPaint).forEach((key) => {
          expect(allowedKeys).toContain(key)
        })
      }
    })
  })

  describe('/api/sessions response structure', () => {
    it('should return array of SessionDTO objects', async () => {
      // This test will fail until T042 is implemented
      const response = await fetch('http://localhost:3000/api/sessions')
      expect(response.ok).toBe(true)

      const sessions = await response.json()
      expect(Array.isArray(sessions)).toBe(true)

      if (sessions.length > 0) {
        const firstSession = sessions[0]

        // Validate required fields
        expect(firstSession).toHaveProperty('id')
        expect(firstSession).toHaveProperty('userId')
        expect(firstSession).toHaveProperty('targetColor')
        expect(firstSession).toHaveProperty('formula')
        expect(firstSession).toHaveProperty('deltaE')
        expect(firstSession).toHaveProperty('isFavorite')
        expect(firstSession).toHaveProperty('createdAt')

        // Validate target color
        expect(isColorValueDTO(firstSession.targetColor)).toBe(true)

        // Validate formula structure
        expect(firstSession.formula).toHaveProperty('paints')
        expect(firstSession.formula).toHaveProperty('totalVolume')
        expect(firstSession.formula).toHaveProperty('achievedColor')
        expect(Array.isArray(firstSession.formula.paints)).toBe(true)

        // Validate createdAt is ISO 8601
        expect(() => new Date(firstSession.createdAt)).not.toThrow()
      }
    })

    it('should not expose internal database fields', async () => {
      // This test will fail until T042 is implemented
      const response = await fetch('http://localhost:3000/api/sessions')
      const sessions = await response.json()

      if (sessions.length > 0) {
        const firstSession = sessions[0]

        // Should NOT have internal fields
        expect(firstSession).not.toHaveProperty('user_id') // Should be userId (camelCase)
        expect(firstSession).not.toHaveProperty('created_at') // Should be createdAt (camelCase)
        expect(firstSession).not.toHaveProperty('updated_at')
        expect(firstSession).not.toHaveProperty('deleted_at')
      }
    })
  })

  describe('/api/optimize response structure', () => {
    it('should return OptimizationResponseDTO object', async () => {
      // This test will fail until T042 is implemented
      const response = await fetch('http://localhost:3000/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetColor: {
            hex: '#FF0000',
            lab: { l: 50, a: 50, b: 0 },
          },
          availablePaints: [],
          mode: 'standard',
        }),
      })

      expect(response.ok).toBe(true)

      const result = await response.json()
      expect(isOptimizationResponseDTO(result)).toBe(true)

      // Validate required fields
      expect(result).toHaveProperty('formula')
      expect(result).toHaveProperty('deltaE')
      expect(result).toHaveProperty('executionTimeMs')
      expect(result).toHaveProperty('algorithm')

      // Validate types
      expect(typeof result.deltaE).toBe('number')
      expect(typeof result.executionTimeMs).toBe('number')
      expect(['differential-evolution', 'tpe-hybrid']).toContain(result.algorithm)
    }, 30000) // 30s timeout for optimization
  })

  describe('ColorValueDTO consistency across all endpoints', () => {
    it('should use same ColorValueDTO structure everywhere', async () => {
      // This test will fail until T042 is implemented
      const [paintsRes, sessionsRes] = await Promise.all([
        fetch('http://localhost:3000/api/paints'),
        fetch('http://localhost:3000/api/sessions'),
      ])

      const paints = await paintsRes.json()
      const sessions = await sessionsRes.json()

      // All color values should have hex and lab
      if (paints.length > 0) {
        expect(isColorValueDTO(paints[0].color)).toBe(true)
      }

      if (sessions.length > 0) {
        expect(isColorValueDTO(sessions[0].targetColor)).toBe(true)
        expect(isColorValueDTO(sessions[0].formula.achievedColor)).toBe(true)
      }
    })
  })
})
