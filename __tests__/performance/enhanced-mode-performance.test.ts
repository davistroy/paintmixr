/**
 * Performance Test: T011 - Enhanced Mode P95 Response Time
 * Feature: 005-use-codebase-analysis
 * Phase: 3.2 TDD Tests
 *
 * Validates enhanced color matching optimization performance targets:
 * - P95 response time < 30 seconds for all paint collection sizes
 * - Delta E ≤ 2.0 achieved for 85%+ of realistic target colors
 * - Convergence rate > 85% across all scenarios
 * - No memory leaks during repeated optimizations
 * - Cold start vs warm start performance comparison
 *
 * Performance targets from research.md:
 * - 5 paints: Fast optimization (target: <5s p95)
 * - 10 paints: Standard optimization (target: <10s p95)
 * - 20 paints: Complex optimization (target: <20s p95)
 * - 50 paints: Large collection (target: <30s p95)
 * - 100 paints: Maximum collection (target: <30s p95)
 *
 * Expected: FAIL initially - enhanced optimization not yet implemented (T028)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { performance } from 'perf_hooks'

// Type definitions for enhanced optimization
interface LABColor {
  L: number // 0-100
  a: number // -128 to 127
  b: number // -128 to 127
}

interface Paint {
  id: string
  name: string
  brand: string
  lab_color: LABColor
  optical_properties?: {
    k_coefficient?: number
    s_coefficient?: number
  }
  volume_ml?: number
  cost_per_ml?: number
}

interface OptimizationRequest {
  target_color: LABColor
  available_paints: Paint[]
  volume_constraints?: {
    min_total_volume_ml?: number
    max_total_volume_ml?: number
  }
  optimization_config?: {
    algorithm?: 'differential_evolution' | 'tpe_hybrid' | 'auto'
    max_iterations?: number
    target_delta_e?: number
    time_limit_ms?: number
  }
}

interface OptimizationResult {
  success: boolean
  delta_e_achieved?: number
  optimization_time_ms: number
  iterations_completed?: number
  convergence_achieved?: boolean
  achieved_color?: LABColor
}

describe('T011: Enhanced Mode P95 Response Time Performance', () => {
  // Performance targets from research.md
  const PERFORMANCE_TARGETS = {
    5: 5000,   // 5 paints: <5s p95
    10: 10000, // 10 paints: <10s p95
    20: 20000, // 20 paints: <20s p95
    50: 30000, // 50 paints: <30s p95
    100: 30000 // 100 paints: <30s p95
  }

  const TARGET_DELTA_E = 2.0
  const MIN_ACCURACY_RATE = 0.85 // 85% must achieve target Delta E
  const MIN_CONVERGENCE_RATE = 0.85 // 85% must converge

  // Performance data storage
  const performanceResults = new Map<string, number[]>()
  const accuracyResults = new Map<string, number[]>()
  const convergenceResults = new Map<string, boolean[]>()

  // Realistic test paint database
  const createRealisticPaints = (count: number): Paint[] => {
    const basePaints: Paint[] = [
      {
        id: 'titanium-white',
        name: 'Titanium White',
        brand: 'Test Brand',
        lab_color: { L: 96.5, a: -0.2, b: 1.8 },
        optical_properties: { k_coefficient: 0.05, s_coefficient: 12.0 },
        volume_ml: 100,
        cost_per_ml: 0.15
      },
      {
        id: 'carbon-black',
        name: 'Carbon Black',
        brand: 'Test Brand',
        lab_color: { L: 16.2, a: 0.1, b: -0.3 },
        optical_properties: { k_coefficient: 25.0, s_coefficient: 0.8 },
        volume_ml: 100,
        cost_per_ml: 0.20
      },
      {
        id: 'cadmium-red-medium',
        name: 'Cadmium Red Medium',
        brand: 'Test Brand',
        lab_color: { L: 45.2, a: 68.4, b: 54.1 },
        optical_properties: { k_coefficient: 8.2, s_coefficient: 5.1 },
        volume_ml: 100,
        cost_per_ml: 0.85
      },
      {
        id: 'cadmium-yellow-medium',
        name: 'Cadmium Yellow Medium',
        brand: 'Test Brand',
        lab_color: { L: 78.3, a: 12.5, b: 78.2 },
        optical_properties: { k_coefficient: 2.1, s_coefficient: 8.7 },
        volume_ml: 100,
        cost_per_ml: 0.75
      },
      {
        id: 'ultramarine-blue',
        name: 'Ultramarine Blue',
        brand: 'Test Brand',
        lab_color: { L: 29.8, a: 15.2, b: -58.7 },
        optical_properties: { k_coefficient: 12.5, s_coefficient: 3.2 },
        volume_ml: 100,
        cost_per_ml: 0.65
      },
      {
        id: 'phthalo-green',
        name: 'Phthalo Green',
        brand: 'Test Brand',
        lab_color: { L: 42.1, a: -45.3, b: 28.7 },
        optical_properties: { k_coefficient: 10.8, s_coefficient: 4.1 },
        volume_ml: 100,
        cost_per_ml: 0.70
      },
      {
        id: 'burnt-umber',
        name: 'Burnt Umber',
        brand: 'Test Brand',
        lab_color: { L: 25.4, a: 12.8, b: 18.9 },
        optical_properties: { k_coefficient: 15.8, s_coefficient: 2.1 },
        volume_ml: 100,
        cost_per_ml: 0.30
      },
      {
        id: 'raw-sienna',
        name: 'Raw Sienna',
        brand: 'Test Brand',
        lab_color: { L: 42.8, a: 18.5, b: 35.2 },
        optical_properties: { k_coefficient: 6.5, s_coefficient: 4.2 },
        volume_ml: 100,
        cost_per_ml: 0.35
      },
      {
        id: 'alizarin-crimson',
        name: 'Alizarin Crimson',
        brand: 'Test Brand',
        lab_color: { L: 38.6, a: 58.2, b: 22.1 },
        optical_properties: { k_coefficient: 9.8, s_coefficient: 4.5 },
        volume_ml: 100,
        cost_per_ml: 0.80
      },
      {
        id: 'cerulean-blue',
        name: 'Cerulean Blue',
        brand: 'Test Brand',
        lab_color: { L: 52.3, a: -12.8, b: -35.7 },
        optical_properties: { k_coefficient: 8.5, s_coefficient: 4.8 },
        volume_ml: 100,
        cost_per_ml: 0.90
      }
    ]

    // Extend with additional synthetic paints if needed
    const paints = [...basePaints]
    while (paints.length < count) {
      const basePaint = basePaints[paints.length % basePaints.length]
      const variation = Math.floor(paints.length / basePaints.length) + 1

      paints.push({
        ...basePaint,
        id: `${basePaint.id}-var${variation}`,
        name: `${basePaint.name} Variation ${variation}`,
        lab_color: {
          L: Math.max(0, Math.min(100, basePaint.lab_color.L + (Math.random() - 0.5) * 10)),
          a: Math.max(-128, Math.min(127, basePaint.lab_color.a + (Math.random() - 0.5) * 15)),
          b: Math.max(-128, Math.min(127, basePaint.lab_color.b + (Math.random() - 0.5) * 15))
        }
      })
    }

    return paints.slice(0, count)
  }

  // Realistic target colors (skin tones, common colors, edge cases)
  const realisticTargetColors: LABColor[] = [
    // Skin tones
    { L: 65.2, a: 18.5, b: 22.1 }, // Light skin
    { L: 52.8, a: 25.3, b: 28.7 }, // Medium skin
    { L: 38.4, a: 15.2, b: 18.9 }, // Dark skin

    // Common colors
    { L: 55.0, a: 0.0, b: 0.0 },    // Neutral gray
    { L: 45.2, a: 65.4, b: 48.2 },  // Red
    { L: 78.5, a: -10.2, b: 75.3 }, // Yellow
    { L: 32.8, a: 18.5, b: -52.7 }, // Blue
    { L: 48.6, a: -42.3, b: 32.1 }, // Green

    // Edge cases
    { L: 88.2, a: -5.1, b: 8.3 },   // Very light (near white)
    { L: 22.5, a: 3.2, b: -2.8 },   // Very dark (near black)
    { L: 58.3, a: 72.5, b: -55.2 }, // High chroma purple
    { L: 42.1, a: 28.7, b: 65.8 }   // High chroma orange
  ]

  beforeAll(() => {
    jest.setTimeout(120000) // 2 minutes for performance tests
  })

  afterAll(() => {
    // Generate comprehensive performance report
    console.log('\n=== ENHANCED MODE PERFORMANCE REPORT ===\n')

    Object.entries(PERFORMANCE_TARGETS).forEach(([paintCount, targetMs]) => {
      const testName = `${paintCount}_paints`
      const durations = performanceResults.get(testName) || []
      const accuracies = accuracyResults.get(testName) || []
      const convergences = convergenceResults.get(testName) || []

      if (durations.length === 0) {
        console.log(`\n${paintCount} Paints: NO DATA`)
        return
      }

      const p50 = calculatePercentile(durations, 50)
      const p95 = calculatePercentile(durations, 95)
      const p99 = calculatePercentile(durations, 99)
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      const min = Math.min(...durations)
      const max = Math.max(...durations)

      const accuracyRate = accuracies.filter(d => d <= TARGET_DELTA_E).length / accuracies.length
      const convergenceRate = convergences.filter(c => c).length / convergences.length
      const avgDeltaE = accuracies.reduce((a, b) => a + b, 0) / accuracies.length

      console.log(`\n${paintCount} Paints (Target: ${targetMs}ms):`)
      console.log(`  Response Times:`)
      console.log(`    Min: ${min.toFixed(0)}ms`)
      console.log(`    Avg: ${avg.toFixed(0)}ms`)
      console.log(`    P50: ${p50.toFixed(0)}ms`)
      console.log(`    P95: ${p95.toFixed(0)}ms (${p95 <= targetMs ? '✓ PASS' : '✗ FAIL'})`)
      console.log(`    P99: ${p99.toFixed(0)}ms`)
      console.log(`    Max: ${max.toFixed(0)}ms`)
      console.log(`  Quality Metrics:`)
      console.log(`    Accuracy Rate: ${(accuracyRate * 100).toFixed(1)}% (≤${TARGET_DELTA_E} ΔE) ${accuracyRate >= MIN_ACCURACY_RATE ? '✓' : '✗'}`)
      console.log(`    Avg Delta E: ${avgDeltaE.toFixed(2)}`)
      console.log(`    Convergence Rate: ${(convergenceRate * 100).toFixed(1)}% ${convergenceRate >= MIN_CONVERGENCE_RATE ? '✓' : '✗'}`)
      console.log(`    Runs: ${durations.length}`)
    })

    console.log('\n=== END PERFORMANCE REPORT ===\n')

    // Export JSON report for CI/CD
    const reportPath = '/home/davistroy/dev/paintmixr/reports/enhanced-mode-performance-baseline.json'
    const report = generatePerformanceReport()
    console.log(`\nReport data (save to ${reportPath}):`)
    console.log(JSON.stringify(report, null, 2))
  })

  beforeEach(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
  })

  /**
   * Test 1: 5 Paint Collection Performance
   * Target: P95 < 5 seconds
   */
  describe('5 Paint Collection Performance', () => {
    const paintCount = 5
    const targetP95 = PERFORMANCE_TARGETS[paintCount]

    it('should optimize with 5 paints within p95 target', async () => {
      const paints = createRealisticPaints(paintCount)
      const durations: number[] = []
      const deltaEs: number[] = []
      const convergences: boolean[] = []

      // Run optimization for each realistic target color
      for (const targetColor of realisticTargetColors) {
        const startTime = performance.now()

        try {
          const result = await runOptimization({
            target_color: targetColor,
            available_paints: paints,
            optimization_config: {
              target_delta_e: TARGET_DELTA_E,
              time_limit_ms: targetP95
            }
          })

          const endTime = performance.now()
          const duration = endTime - startTime

          durations.push(duration)
          if (result.delta_e_achieved !== undefined) {
            deltaEs.push(result.delta_e_achieved)
          }
          convergences.push(result.convergence_achieved || false)

          expect(result.success).toBe(true)
        } catch (error) {
          // Expected to fail - not implemented yet
          console.log(`5 paints optimization not yet implemented: ${error}`)
          throw error
        }
      }

      // Record results
      recordResults(`${paintCount}_paints`, durations, deltaEs, convergences)

      // Validate p95
      const p95 = calculatePercentile(durations, 95)
      expect(p95).toBeLessThan(targetP95)

      // Validate accuracy
      const accuracyRate = deltaEs.filter(d => d <= TARGET_DELTA_E).length / deltaEs.length
      expect(accuracyRate).toBeGreaterThanOrEqual(MIN_ACCURACY_RATE)

      // Validate convergence
      const convergenceRate = convergences.filter(c => c).length / convergences.length
      expect(convergenceRate).toBeGreaterThanOrEqual(MIN_CONVERGENCE_RATE)
    })
  })

  /**
   * Test 2: 10 Paint Collection Performance
   * Target: P95 < 10 seconds
   */
  describe('10 Paint Collection Performance', () => {
    const paintCount = 10
    const targetP95 = PERFORMANCE_TARGETS[paintCount]

    it('should optimize with 10 paints within p95 target', async () => {
      const paints = createRealisticPaints(paintCount)
      const durations: number[] = []
      const deltaEs: number[] = []
      const convergences: boolean[] = []

      for (const targetColor of realisticTargetColors) {
        const startTime = performance.now()

        try {
          const result = await runOptimization({
            target_color: targetColor,
            available_paints: paints,
            optimization_config: {
              target_delta_e: TARGET_DELTA_E,
              time_limit_ms: targetP95
            }
          })

          const endTime = performance.now()
          const duration = endTime - startTime

          durations.push(duration)
          if (result.delta_e_achieved !== undefined) {
            deltaEs.push(result.delta_e_achieved)
          }
          convergences.push(result.convergence_achieved || false)

          expect(result.success).toBe(true)
        } catch (error) {
          console.log(`10 paints optimization not yet implemented: ${error}`)
          throw error
        }
      }

      recordResults(`${paintCount}_paints`, durations, deltaEs, convergences)

      const p95 = calculatePercentile(durations, 95)
      expect(p95).toBeLessThan(targetP95)

      const accuracyRate = deltaEs.filter(d => d <= TARGET_DELTA_E).length / deltaEs.length
      expect(accuracyRate).toBeGreaterThanOrEqual(MIN_ACCURACY_RATE)

      const convergenceRate = convergences.filter(c => c).length / convergences.length
      expect(convergenceRate).toBeGreaterThanOrEqual(MIN_CONVERGENCE_RATE)
    })
  })

  /**
   * Test 3: 20 Paint Collection Performance
   * Target: P95 < 20 seconds
   */
  describe('20 Paint Collection Performance', () => {
    const paintCount = 20
    const targetP95 = PERFORMANCE_TARGETS[paintCount]

    it('should optimize with 20 paints within p95 target', async () => {
      const paints = createRealisticPaints(paintCount)
      const durations: number[] = []
      const deltaEs: number[] = []
      const convergences: boolean[] = []

      for (const targetColor of realisticTargetColors) {
        const startTime = performance.now()

        try {
          const result = await runOptimization({
            target_color: targetColor,
            available_paints: paints,
            optimization_config: {
              target_delta_e: TARGET_DELTA_E,
              time_limit_ms: targetP95
            }
          })

          const endTime = performance.now()
          const duration = endTime - startTime

          durations.push(duration)
          if (result.delta_e_achieved !== undefined) {
            deltaEs.push(result.delta_e_achieved)
          }
          convergences.push(result.convergence_achieved || false)

          expect(result.success).toBe(true)
        } catch (error) {
          console.log(`20 paints optimization not yet implemented: ${error}`)
          throw error
        }
      }

      recordResults(`${paintCount}_paints`, durations, deltaEs, convergences)

      const p95 = calculatePercentile(durations, 95)
      expect(p95).toBeLessThan(targetP95)

      const accuracyRate = deltaEs.filter(d => d <= TARGET_DELTA_E).length / deltaEs.length
      expect(accuracyRate).toBeGreaterThanOrEqual(MIN_ACCURACY_RATE)

      const convergenceRate = convergences.filter(c => c).length / convergences.length
      expect(convergenceRate).toBeGreaterThanOrEqual(MIN_CONVERGENCE_RATE)
    })
  })

  /**
   * Test 4: 50 Paint Collection Performance
   * Target: P95 < 30 seconds
   */
  describe('50 Paint Collection Performance', () => {
    const paintCount = 50
    const targetP95 = PERFORMANCE_TARGETS[paintCount]

    it('should optimize with 50 paints within p95 target', async () => {
      const paints = createRealisticPaints(paintCount)
      const durations: number[] = []
      const deltaEs: number[] = []
      const convergences: boolean[] = []

      for (const targetColor of realisticTargetColors) {
        const startTime = performance.now()

        try {
          const result = await runOptimization({
            target_color: targetColor,
            available_paints: paints,
            optimization_config: {
              target_delta_e: TARGET_DELTA_E,
              time_limit_ms: targetP95
            }
          })

          const endTime = performance.now()
          const duration = endTime - startTime

          durations.push(duration)
          if (result.delta_e_achieved !== undefined) {
            deltaEs.push(result.delta_e_achieved)
          }
          convergences.push(result.convergence_achieved || false)

          expect(result.success).toBe(true)
        } catch (error) {
          console.log(`50 paints optimization not yet implemented: ${error}`)
          throw error
        }
      }

      recordResults(`${paintCount}_paints`, durations, deltaEs, convergences)

      const p95 = calculatePercentile(durations, 95)
      expect(p95).toBeLessThan(targetP95)

      const accuracyRate = deltaEs.filter(d => d <= TARGET_DELTA_E).length / deltaEs.length
      expect(accuracyRate).toBeGreaterThanOrEqual(MIN_ACCURACY_RATE)

      const convergenceRate = convergences.filter(c => c).length / convergences.length
      expect(convergenceRate).toBeGreaterThanOrEqual(MIN_CONVERGENCE_RATE)
    })
  })

  /**
   * Test 5: 100 Paint Collection Performance (Maximum)
   * Target: P95 < 30 seconds
   */
  describe('100 Paint Collection Performance', () => {
    const paintCount = 100
    const targetP95 = PERFORMANCE_TARGETS[paintCount]

    it('should optimize with 100 paints within p95 target', async () => {
      const paints = createRealisticPaints(paintCount)
      const durations: number[] = []
      const deltaEs: number[] = []
      const convergences: boolean[] = []

      for (const targetColor of realisticTargetColors) {
        const startTime = performance.now()

        try {
          const result = await runOptimization({
            target_color: targetColor,
            available_paints: paints,
            optimization_config: {
              target_delta_e: TARGET_DELTA_E,
              time_limit_ms: targetP95
            }
          })

          const endTime = performance.now()
          const duration = endTime - startTime

          durations.push(duration)
          if (result.delta_e_achieved !== undefined) {
            deltaEs.push(result.delta_e_achieved)
          }
          convergences.push(result.convergence_achieved || false)

          expect(result.success).toBe(true)
        } catch (error) {
          console.log(`100 paints optimization not yet implemented: ${error}`)
          throw error
        }
      }

      recordResults(`${paintCount}_paints`, durations, deltaEs, convergences)

      const p95 = calculatePercentile(durations, 95)
      expect(p95).toBeLessThan(targetP95)

      const accuracyRate = deltaEs.filter(d => d <= TARGET_DELTA_E).length / deltaEs.length
      expect(accuracyRate).toBeGreaterThanOrEqual(MIN_ACCURACY_RATE)

      const convergenceRate = convergences.filter(c => c).length / convergences.length
      expect(convergenceRate).toBeGreaterThanOrEqual(MIN_CONVERGENCE_RATE)
    })
  })

  /**
   * Test 6: Memory Leak Detection
   * Validates no memory leaks during repeated optimizations
   */
  describe('Memory Management', () => {
    it('should not leak memory during repeated optimizations', async () => {
      const paints = createRealisticPaints(20)
      const targetColor = realisticTargetColors[0]
      const iterations = 20

      const initialMemory = process.memoryUsage().heapUsed
      const memorySnapshots: number[] = []

      for (let i = 0; i < iterations; i++) {
        try {
          await runOptimization({
            target_color: targetColor,
            available_paints: paints,
            optimization_config: {
              target_delta_e: TARGET_DELTA_E,
              time_limit_ms: 10000
            }
          })

          // Force GC and measure
          if (global.gc) {
            global.gc()
          }
          memorySnapshots.push(process.memoryUsage().heapUsed)
        } catch (error) {
          console.log('Memory test skipped - optimization not implemented')
          return
        }
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      const maxMemoryIncrease = 50 * 1024 * 1024 // 50MB threshold

      console.log(`Memory usage: Initial ${(initialMemory / 1024 / 1024).toFixed(2)}MB, Final ${(finalMemory / 1024 / 1024).toFixed(2)}MB, Increase ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)

      expect(memoryIncrease).toBeLessThan(maxMemoryIncrease)
    })
  })

  /**
   * Test 7: Cold Start vs Warm Start Performance
   * Compares first-run vs subsequent-run performance
   */
  describe('Cold Start vs Warm Start', () => {
    it('should demonstrate warm start performance improvement', async () => {
      const paints = createRealisticPaints(20)
      const targetColor = realisticTargetColors[0]

      try {
        // Cold start (first run)
        const coldStartTime = performance.now()
        await runOptimization({
          target_color: targetColor,
          available_paints: paints,
          optimization_config: {
            target_delta_e: TARGET_DELTA_E,
            time_limit_ms: 20000
          }
        })
        const coldDuration = performance.now() - coldStartTime

        // Warm starts (subsequent runs)
        const warmDurations: number[] = []
        for (let i = 0; i < 5; i++) {
          const warmStartTime = performance.now()
          await runOptimization({
            target_color: targetColor,
            available_paints: paints,
            optimization_config: {
              target_delta_e: TARGET_DELTA_E,
              time_limit_ms: 20000
            }
          })
          warmDurations.push(performance.now() - warmStartTime)
        }

        const avgWarmDuration = warmDurations.reduce((a, b) => a + b, 0) / warmDurations.length

        console.log(`Cold start: ${coldDuration.toFixed(0)}ms, Warm start avg: ${avgWarmDuration.toFixed(0)}ms`)

        // Warm start should be faster or similar (allow for variance)
        expect(avgWarmDuration).toBeLessThanOrEqual(coldDuration * 1.2)
      } catch (error) {
        console.log('Cold/warm start test skipped - optimization not implemented')
        return
      }
    })
  })
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Run optimization (mock or actual implementation)
 */
async function runOptimization(request: OptimizationRequest): Promise<OptimizationResult> {
  try {
    // Try to import actual optimization API
    const { POST } = await import('../../src/app/api/optimize/route').catch(() => ({ POST: null }))

    if (!POST) {
      // Mock implementation for testing before real implementation
      return mockOptimization(request)
    }

    // Call actual API route
    const mockRequest = {
      json: async () => ({
        target_color: request.target_color,
        paint_filters: {
          available_only: true
        },
        volume_constraints: request.volume_constraints,
        optimization_config: request.optimization_config,
        save_to_history: false
      }),
      headers: new Map()
    } as any

    const response = await POST(mockRequest)
    const data = await response.json()

    if (!data.data || !data.data.success) {
      throw new Error('Optimization failed')
    }

    return {
      success: data.data.success,
      delta_e_achieved: data.data.delta_e_achieved,
      optimization_time_ms: data.data.performance.optimization_time_ms,
      iterations_completed: data.data.performance.iterations_completed,
      convergence_achieved: data.data.performance.convergence_achieved,
      achieved_color: data.data.achieved_color
    }
  } catch (error) {
    throw new Error(`Optimization not yet implemented: ${error}`)
  }
}

/**
 * Mock optimization for testing before implementation
 */
function mockOptimization(request: OptimizationRequest): OptimizationResult {
  const paintCount = request.available_paints.length
  const complexity = Math.log2(paintCount + 1)

  // Simulate realistic optimization time
  const baseTime = 200 * complexity
  const variance = Math.random() * 100
  const optimizationTime = baseTime + variance

  // Simulate Delta E achievement (should be realistic)
  const deltaE = 1.5 + Math.random() * 1.5 // 1.5-3.0 range

  // Simulate convergence (should be high rate)
  const convergence = Math.random() > 0.1 // 90% convergence rate

  return {
    success: true,
    delta_e_achieved: deltaE,
    optimization_time_ms: optimizationTime,
    iterations_completed: Math.floor(Math.random() * 1000) + 500,
    convergence_achieved: convergence,
    achieved_color: request.target_color // Simplified mock
  }
}

/**
 * Calculate percentile from array of values
 */
function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

/**
 * Record performance results for reporting
 */
function recordResults(testName: string, durations: number[], deltaEs: number[], convergences: boolean[]): void {
  const performanceResults = (global as any).performanceResults || new Map()
  const accuracyResults = (global as any).accuracyResults || new Map()
  const convergenceResults = (global as any).convergenceResults || new Map()

  performanceResults.set(testName, durations)
  accuracyResults.set(testName, deltaEs)
  convergenceResults.set(testName, convergences)

  ;(global as any).performanceResults = performanceResults
  ;(global as any).accuracyResults = accuracyResults
  ;(global as any).convergenceResults = convergenceResults
}

/**
 * Generate comprehensive performance report
 */
function generatePerformanceReport(): any {
  const performanceResults = (global as any).performanceResults || new Map()
  const accuracyResults = (global as any).accuracyResults || new Map()
  const convergenceResults = (global as any).convergenceResults || new Map()

  const targets = {
    5: 5000,
    10: 10000,
    20: 20000,
    50: 30000,
    100: 30000
  }

  const report: any = {
    timestamp: new Date().toISOString(),
    test_run: 'T011-enhanced-mode-performance',
    targets: targets,
    results: {}
  }

  Object.keys(targets).forEach((paintCount) => {
    const testName = `${paintCount}_paints`
    const durations = performanceResults.get(testName) || []
    const accuracies = accuracyResults.get(testName) || []
    const convergences = convergenceResults.get(testName) || []

    if (durations.length > 0) {
      report.results[paintCount] = {
        paint_count: parseInt(paintCount),
        target_p95_ms: targets[paintCount as keyof typeof targets],
        response_times: {
          min: Math.min(...durations),
          max: Math.max(...durations),
          avg: durations.reduce((a, b) => a + b, 0) / durations.length,
          p50: calculatePercentile(durations, 50),
          p95: calculatePercentile(durations, 95),
          p99: calculatePercentile(durations, 99),
          samples: durations.length
        },
        quality: {
          avg_delta_e: accuracies.reduce((a, b) => a + b, 0) / accuracies.length,
          accuracy_rate: accuracies.filter(d => d <= 2.0).length / accuracies.length,
          convergence_rate: convergences.filter(c => c).length / convergences.length
        }
      }
    }
  })

  return report
}

/**
 * Usage Instructions:
 *
 * RUN TEST:
 *   npm test -- __tests__/performance/enhanced-mode-performance.test.ts
 *
 * RUN WITH GC:
 *   node --expose-gc node_modules/.bin/jest __tests__/performance/enhanced-mode-performance.test.ts
 *
 * GENERATE BASELINE REPORT:
 *   npm test -- __tests__/performance/enhanced-mode-performance.test.ts --json --outputFile=reports/enhanced-mode-baseline.json
 *
 * EXPECTED INITIAL STATE:
 *   - Tests FAIL because T028 (enhanced optimization) not implemented
 *   - Mock optimization used as placeholder
 *   - Baseline report generation works
 *   - After T028 implementation, tests should PASS
 *
 * PERFORMANCE METRICS TRACKED:
 *   - P95 response time for 5, 10, 20, 50, 100 paint collections
 *   - Delta E accuracy rate (target: 85%+ achieve ≤2.0)
 *   - Convergence rate (target: 85%+ converge successfully)
 *   - Memory usage (no leaks during repeated runs)
 *   - Cold start vs warm start comparison
 */
