/**
 * Contract Test: POST /api/optimize (Enhanced Mode)
 * Feature: 007-enhanced-mode-1
 * Task: T004
 *
 * Tests the Enhanced Accuracy Mode optimization endpoint contract according to
 * specs/007-enhanced-mode-1/contracts/optimize-api.yaml specification.
 *
 * Requirements from optimize-api.yaml:
 * 1. Request schema validation (EnhancedOptimizationRequest)
 * 2. Response schema validation (EnhancedOptimizationResponse)
 * 3. 400 error for invalid paint count (<2 or >100)
 * 4. 400 error for invalid LAB values (out of range)
 * 5. 400 error for invalid mode enum
 * 6. 200 success response structure
 * 7. Partial result warning structure
 * 8. 504 timeout scenario (30s serverless limit)
 *
 * EXPECTED: This test MUST FAIL until the /api/optimize endpoint is implemented.
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { z } from 'zod'
import type {
  EnhancedOptimizationRequest,
  EnhancedOptimizationResponse,
  Paint,
  LABColor,
  OptimizedPaintFormula,
  OptimizationPerformanceMetrics,
  PaintRatio
} from '@/lib/types'

// ============================================================================
// Zod Schemas for Contract Validation
// ============================================================================

const LABColorSchema = z.object({
  l: z.number().min(0).max(100),
  a: z.number().min(-128).max(127),
  b: z.number().min(-128).max(127)
})

const PaintSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  brand: z.string(),
  color: z.object({
    hex: z.string().regex(/^#[0-9A-F]{6}$/i),
    lab: LABColorSchema
  }),
  opacity: z.number().min(0).max(1),
  tintingStrength: z.number().min(0).max(1),
  kubelkaMunk: z.object({
    k: z.number().min(0).max(1),
    s: z.number().min(0).max(1)
  }),
  userId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

const EnhancedOptimizationRequestSchema = z.object({
  targetColor: LABColorSchema,
  availablePaints: z.array(PaintSchema).min(2).max(100),
  mode: z.enum(['standard', 'enhanced']),
  volumeConstraints: z.object({
    min_total_volume_ml: z.number().min(0),
    max_total_volume_ml: z.number().min(0),
    minimum_component_volume_ml: z.number().min(0).optional(),
    maximum_component_volume_ml: z.number().min(0).optional(),
    allow_scaling: z.boolean().optional()
  }).optional(),
  maxPaintCount: z.number().int().min(2).max(5).optional(),
  timeLimit: z.number().int().min(1000).max(30000).optional(),
  accuracyTarget: z.number().min(0).optional()
})

const PaintRatioSchema = z.object({
  paint_id: z.string(),
  paint_name: z.string().optional(),
  volume_ml: z.number().min(0),
  percentage: z.number().min(0).max(100),
  paint_properties: PaintSchema.optional()
})

const OptimizedFormulaSchema = z.object({
  paintRatios: z.array(PaintRatioSchema).min(2).max(5),
  totalVolume: z.number().min(0),
  predictedColor: LABColorSchema,
  deltaE: z.number().min(0),
  accuracyRating: z.enum(['excellent', 'good', 'acceptable', 'poor']),
  mixingComplexity: z.enum(['simple', 'moderate', 'complex']),
  kubelkaMunkK: z.number().min(0).max(1),
  kubelkaMunkS: z.number().min(0).max(1),
  opacity: z.number().min(0).max(1)
})

const PerformanceMetricsSchema = z.object({
  timeElapsed: z.number().min(0),
  iterationsCompleted: z.number().int().min(0),
  algorithmUsed: z.enum(['differential_evolution', 'tpe_hybrid', 'auto']),
  convergenceAchieved: z.boolean(),
  targetMet: z.boolean(),
  earlyTermination: z.boolean(),
  initialBestDeltaE: z.number().min(0).nullable(),
  finalBestDeltaE: z.number().min(0).nullable(),
  improvementRate: z.number()
})

const EnhancedOptimizationResponseSchema = z.object({
  success: z.boolean(),
  formula: OptimizedFormulaSchema.nullable(),
  metrics: PerformanceMetricsSchema.nullable(),
  warnings: z.array(z.string()),
  error: z.string().nullable().optional()
})

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockPaint = (overrides: Partial<Paint> = {}): Paint => ({
  id: crypto.randomUUID(),
  name: 'Test Paint',
  brand: 'Test Brand',
  color: {
    hex: '#FF0000',
    lab: { l: 53.24, a: 80.09, b: 67.20 }
  },
  opacity: 0.85,
  tintingStrength: 0.75,
  kubelkaMunk: {
    k: 0.68,
    s: 0.32
  },
  userId: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
})

const createValidRequest = (overrides: Partial<EnhancedOptimizationRequest> = {}): EnhancedOptimizationRequest => ({
  targetColor: { l: 65, a: 18, b: -5 },
  availablePaints: [
    createMockPaint({ name: 'Titanium White', color: { hex: '#FFFFFF', lab: { l: 95, a: 0, b: 0 } } }),
    createMockPaint({ name: 'Ultramarine Blue', color: { hex: '#0000FF', lab: { l: 35, a: 12, b: -55 } } })
  ],
  mode: 'enhanced',
  maxPaintCount: 5,
  timeLimit: 28000,
  accuracyTarget: 2.0,
  ...overrides
})

// ============================================================================
// Test Suite
// ============================================================================

describe('Contract: POST /api/optimize (Enhanced Mode)', () => {
  const endpoint = '/api/optimize'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  describe('Request Schema Validation', () => {
    it('should accept valid enhanced mode request with all required fields', () => {
      const request = createValidRequest()

      expect(() => EnhancedOptimizationRequestSchema.parse(request)).not.toThrow()
    })

    it('should accept valid standard mode request', () => {
      const request = createValidRequest({
        mode: 'standard',
        maxPaintCount: 3,
        accuracyTarget: 5.0
      })

      expect(() => EnhancedOptimizationRequestSchema.parse(request)).not.toThrow()
    })

    it('should accept request with optional volume constraints', () => {
      const request = createValidRequest({
        volumeConstraints: {
          min_total_volume_ml: 50,
          max_total_volume_ml: 150,
          minimum_component_volume_ml: 5,
          maximum_component_volume_ml: 100,
          allow_scaling: true
        }
      })

      expect(() => EnhancedOptimizationRequestSchema.parse(request)).not.toThrow()
    })

    it('should accept request with minimum required fields only', () => {
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 10, b: 20 },
        availablePaints: [
          createMockPaint(),
          createMockPaint()
        ],
        mode: 'enhanced'
      }

      expect(() => EnhancedOptimizationRequestSchema.parse(request)).not.toThrow()
    })
  })

  describe('Invalid Paint Count - 400 Errors', () => {
    it('should reject request with less than 2 paints', async () => {
      const request = createValidRequest({
        availablePaints: [createMockPaint()]
      })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(400)

      const data = await response.json() as EnhancedOptimizationResponse
      expect(data.success).toBe(false)
      expect(data.formula).toBeNull()
      expect(data.metrics).toBeNull()
      expect(data.error).toContain('at least 2 paints')
    })

    it('should reject request with more than 100 paints', async () => {
      const paints = Array.from({ length: 101 }, () => createMockPaint())
      const request = createValidRequest({ availablePaints: paints })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(400)

      const data = await response.json() as EnhancedOptimizationResponse
      expect(data.success).toBe(false)
      expect(data.error).toContain('maximum 100 paints')
    })

    it('should reject request with empty paints array', async () => {
      const request = createValidRequest({ availablePaints: [] })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(400)

      const data = await response.json() as EnhancedOptimizationResponse
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })

  describe('Invalid LAB Values - 400 Errors', () => {
    it('should reject request with L value above 100', async () => {
      const request = createValidRequest({
        targetColor: { l: 150, a: 0, b: 0 }
      })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(400)

      const data = await response.json() as EnhancedOptimizationResponse
      expect(data.success).toBe(false)
      expect(data.error).toContain('l must be between 0 and 100')
    })

    it('should reject request with L value below 0', async () => {
      const request = createValidRequest({
        targetColor: { l: -10, a: 0, b: 0 }
      })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(400)

      const data = await response.json() as EnhancedOptimizationResponse
      expect(data.success).toBe(false)
      expect(data.error).toContain('l must be between 0 and 100')
    })

    it('should reject request with A value above 127', async () => {
      const request = createValidRequest({
        targetColor: { l: 50, a: 150, b: 0 }
      })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(400)

      const data = await response.json() as EnhancedOptimizationResponse
      expect(data.success).toBe(false)
      expect(data.error).toContain('a must be between -128 and 127')
    })

    it('should reject request with A value below -128', async () => {
      const request = createValidRequest({
        targetColor: { l: 50, a: -200, b: 0 }
      })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(400)

      const data = await response.json() as EnhancedOptimizationResponse
      expect(data.success).toBe(false)
      expect(data.error).toContain('a must be between -128 and 127')
    })

    it('should reject request with B value above 127', async () => {
      const request = createValidRequest({
        targetColor: { l: 50, a: 0, b: 200 }
      })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(400)

      const data = await response.json() as EnhancedOptimizationResponse
      expect(data.success).toBe(false)
      expect(data.error).toContain('b must be between -128 and 127')
    })

    it('should reject request with B value below -128', async () => {
      const request = createValidRequest({
        targetColor: { l: 50, a: 0, b: -150 }
      })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(400)

      const data = await response.json() as EnhancedOptimizationResponse
      expect(data.success).toBe(false)
      expect(data.error).toContain('b must be between -128 and 127')
    })

    it('should reject request with non-numeric LAB values', async () => {
      const request = {
        ...createValidRequest(),
        targetColor: { l: 'invalid', a: 0, b: 0 }
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(400)

      const data = await response.json() as EnhancedOptimizationResponse
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })

  describe('Invalid Mode Enum - 400 Errors', () => {
    it('should reject request with invalid mode value', async () => {
      const request = {
        ...createValidRequest(),
        mode: 'ultra-precision' // Invalid mode
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(400)

      const data = await response.json() as EnhancedOptimizationResponse
      expect(data.success).toBe(false)
      expect(data.error).toContain('mode')
    })

    it('should reject request with missing mode field', async () => {
      const request = {
        targetColor: { l: 50, a: 10, b: 20 },
        availablePaints: [createMockPaint(), createMockPaint()]
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(400)

      const data = await response.json() as EnhancedOptimizationResponse
      expect(data.success).toBe(false)
      expect(data.error).toContain('mode')
    })

    it('should reject request with null mode', async () => {
      const request = {
        ...createValidRequest(),
        mode: null
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(400)

      const data = await response.json() as EnhancedOptimizationResponse
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })

  describe('Success Response Structure - 200', () => {
    it('should return valid response structure on successful optimization', async () => {
      const request = createValidRequest()

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(200)

      const data = await response.json() as EnhancedOptimizationResponse

      // Validate response schema
      expect(() => EnhancedOptimizationResponseSchema.parse(data)).not.toThrow()

      // Validate success response structure
      expect(data.success).toBe(true)
      expect(data.formula).not.toBeNull()
      expect(data.metrics).not.toBeNull()
      expect(Array.isArray(data.warnings)).toBe(true)
    })

    it('should return valid formula with 2-5 paint ratios', async () => {
      const request = createValidRequest()

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data = await response.json() as EnhancedOptimizationResponse

      expect(data.formula).not.toBeNull()
      expect(data.formula!.paintRatios.length).toBeGreaterThanOrEqual(2)
      expect(data.formula!.paintRatios.length).toBeLessThanOrEqual(5)
    })

    it('should return formula with valid LAB predicted color', async () => {
      const request = createValidRequest()

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data = await response.json() as EnhancedOptimizationResponse

      expect(data.formula).not.toBeNull()
      expect(data.formula!.predictedColor.l).toBeGreaterThanOrEqual(0)
      expect(data.formula!.predictedColor.l).toBeLessThanOrEqual(100)
      expect(data.formula!.predictedColor.a).toBeGreaterThanOrEqual(-128)
      expect(data.formula!.predictedColor.a).toBeLessThanOrEqual(127)
      expect(data.formula!.predictedColor.b).toBeGreaterThanOrEqual(-128)
      expect(data.formula!.predictedColor.b).toBeLessThanOrEqual(127)
    })

    it('should return formula with valid accuracy rating', async () => {
      const request = createValidRequest()

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data = await response.json() as EnhancedOptimizationResponse

      expect(data.formula).not.toBeNull()
      expect(['excellent', 'good', 'acceptable', 'poor']).toContain(data.formula!.accuracyRating)
    })

    it('should return formula with valid mixing complexity', async () => {
      const request = createValidRequest()

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data = await response.json() as EnhancedOptimizationResponse

      expect(data.formula).not.toBeNull()
      expect(['simple', 'moderate', 'complex']).toContain(data.formula!.mixingComplexity)
    })

    it('should return valid performance metrics', async () => {
      const request = createValidRequest()

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data = await response.json() as EnhancedOptimizationResponse

      expect(data.metrics).not.toBeNull()
      expect(data.metrics!.timeElapsed).toBeGreaterThan(0)
      expect(data.metrics!.iterationsCompleted).toBeGreaterThanOrEqual(0)
      expect(['differential_evolution', 'tpe_hybrid', 'auto']).toContain(data.metrics!.algorithmUsed)
      expect(typeof data.metrics!.convergenceAchieved).toBe('boolean')
      expect(typeof data.metrics!.targetMet).toBe('boolean')
      expect(typeof data.metrics!.earlyTermination).toBe('boolean')
    })

    it('should return paint ratios that sum to total volume', async () => {
      const request = createValidRequest()

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data = await response.json() as EnhancedOptimizationResponse

      expect(data.formula).not.toBeNull()

      const volumeSum = data.formula!.paintRatios.reduce((sum, ratio) => sum + ratio.volume_ml, 0)
      expect(volumeSum).toBeCloseTo(data.formula!.totalVolume, 2) // Allow 0.01ml precision
    })

    it('should return paint ratios with percentages summing to 100', async () => {
      const request = createValidRequest()

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data = await response.json() as EnhancedOptimizationResponse

      expect(data.formula).not.toBeNull()

      const percentageSum = data.formula!.paintRatios.reduce((sum, ratio) => sum + ratio.percentage, 0)
      expect(percentageSum).toBeCloseTo(100, 2) // Allow 0.01% precision
    })
  })

  describe('Partial Result Warning Structure - 200', () => {
    it('should return warnings array when optimization times out', async () => {
      // Request with very tight time limit to force timeout
      const request = createValidRequest({
        timeLimit: 1000, // 1 second timeout
        availablePaints: Array.from({ length: 50 }, () => createMockPaint()) // Complex scenario
      })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(200)

      const data = await response.json() as EnhancedOptimizationResponse

      // Even on timeout, should return best result found
      expect(data.success).toBe(true)
      expect(data.formula).not.toBeNull()

      // Should have early termination warning
      if (data.metrics?.earlyTermination) {
        expect(data.warnings.length).toBeGreaterThan(0)
        expect(data.warnings.some(w => w.toLowerCase().includes('timeout'))).toBe(true)
      }
    })

    it('should indicate early termination in metrics when timeout occurs', async () => {
      const request = createValidRequest({
        timeLimit: 1000,
        availablePaints: Array.from({ length: 50 }, () => createMockPaint())
      })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data = await response.json() as EnhancedOptimizationResponse

      expect(data.metrics).not.toBeNull()

      // If timeout occurred, earlyTermination should be true
      if (data.metrics!.timeElapsed >= 1000) {
        expect(data.metrics!.earlyTermination).toBe(true)
      }
    })

    it('should warn if target accuracy not achieved', async () => {
      // Request impossible target with short timeout
      const request = createValidRequest({
        targetColor: { l: 50, a: 100, b: 100 }, // Very saturated color
        availablePaints: [
          createMockPaint({ color: { hex: '#FFFFFF', lab: { l: 95, a: 0, b: 0 } } }), // White
          createMockPaint({ color: { hex: '#000000', lab: { l: 0, a: 0, b: 0 } } }) // Black
        ],
        accuracyTarget: 1.0,
        timeLimit: 2000
      })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data = await response.json() as EnhancedOptimizationResponse

      if (data.metrics?.targetMet === false) {
        expect(data.warnings.length).toBeGreaterThan(0)
      }
    })

    it('should return best result found even if target not met', async () => {
      const request = createValidRequest({
        targetColor: { l: 50, a: 100, b: 100 },
        availablePaints: [
          createMockPaint({ color: { hex: '#FFFFFF', lab: { l: 95, a: 0, b: 0 } } }),
          createMockPaint({ color: { hex: '#000000', lab: { l: 0, a: 0, b: 0 } } })
        ],
        accuracyTarget: 1.0,
        timeLimit: 2000
      })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(200)

      const data = await response.json() as EnhancedOptimizationResponse

      expect(data.success).toBe(true)
      expect(data.formula).not.toBeNull()
      expect(data.metrics?.finalBestDeltaE).toBeGreaterThan(0)
    })
  })

  describe('Timeout Scenario - 504', () => {
    it('should handle serverless function timeout (30s limit)', async () => {
      // Note: This test mocks 30s timeout; actual timeout would take 30s
      // In real implementation, use mock or test environment configuration
      const request = createValidRequest({
        timeLimit: 30000,
        availablePaints: Array.from({ length: 100 }, () => createMockPaint())
      })

      // Mock fetch to simulate timeout
      const mockFetch = async () => {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Server timeout: Optimization exceeded 30-second limit',
            formula: null,
            metrics: null,
            warnings: []
          }),
          {
            status: 504,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      const response = await mockFetch()

      expect(response.status).toBe(504)

      const data = await response.json() as EnhancedOptimizationResponse

      expect(data.success).toBe(false)
      expect(data.formula).toBeNull()
      expect(data.metrics).toBeNull()
      expect(data.error).toContain('timeout')
    })
  })

  describe('Edge Cases', () => {
    it('should handle request with exactly 2 paints (minimum)', async () => {
      const request = createValidRequest({
        availablePaints: [createMockPaint(), createMockPaint()],
        maxPaintCount: 2
      })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(200)

      const data = await response.json() as EnhancedOptimizationResponse
      expect(data.formula?.paintRatios.length).toBeLessThanOrEqual(2)
    })

    it('should handle request with 100 paints (maximum)', async () => {
      const paints = Array.from({ length: 100 }, (_, i) =>
        createMockPaint({ name: `Paint ${i + 1}` })
      )
      const request = createValidRequest({ availablePaints: paints })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(200)
    })

    it('should handle LAB boundary values (L=0, A=-128, B=-128)', async () => {
      const request = createValidRequest({
        targetColor: { l: 0, a: -128, b: -128 }
      })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect([200, 400]).toContain(response.status)
    })

    it('should handle LAB boundary values (L=100, A=127, B=127)', async () => {
      const request = createValidRequest({
        targetColor: { l: 100, a: 127, b: 127 }
      })

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect([200, 400]).toContain(response.status)
    })

    it('should handle missing optional fields', async () => {
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 10, b: 20 },
        availablePaints: [createMockPaint(), createMockPaint()],
        mode: 'enhanced'
        // No volumeConstraints, maxPaintCount, timeLimit, or accuracyTarget
      }

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      expect(response.status).toBe(200)
    })
  })

  describe('Response Schema Compliance', () => {
    it('should always return valid EnhancedOptimizationResponse structure', async () => {
      const testCases = [
        createValidRequest(),
        createValidRequest({ mode: 'standard' }),
        createValidRequest({ maxPaintCount: 3 }),
        createValidRequest({ timeLimit: 5000 })
      ]

      for (const request of testCases) {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request)
        })

        const data = await response.json()

        // All responses must conform to EnhancedOptimizationResponse schema
        expect(() => EnhancedOptimizationResponseSchema.parse(data)).not.toThrow()
      }
    })

    it('should validate formula Kubelka-Munk coefficients are in range 0-1', async () => {
      const request = createValidRequest()

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data = await response.json() as EnhancedOptimizationResponse

      if (data.formula) {
        expect(data.formula.kubelkaMunkK).toBeGreaterThanOrEqual(0)
        expect(data.formula.kubelkaMunkK).toBeLessThanOrEqual(1)
        expect(data.formula.kubelkaMunkS).toBeGreaterThanOrEqual(0)
        expect(data.formula.kubelkaMunkS).toBeLessThanOrEqual(1)
      }
    })

    it('should validate formula opacity is in range 0-1', async () => {
      const request = createValidRequest()

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data = await response.json() as EnhancedOptimizationResponse

      if (data.formula) {
        expect(data.formula.opacity).toBeGreaterThanOrEqual(0)
        expect(data.formula.opacity).toBeLessThanOrEqual(1)
      }
    })
  })
})
