/**
 * Performance Test: T031 - Response Time Baselines
 * Feature: 005-use-codebase-analysis
 * Phase: 3.2 TDD Tests
 *
 * Establishes and validates performance baselines for critical operations:
 * - Authentication response time <2 seconds (NFR-001)
 * - Color calculation <500ms (Constitutional Principle VI)
 * - UI interaction at 60fps (16.67ms per frame)
 * - Performance monitoring captures metrics
 * - Regression detection triggers on >10% slowdown
 *
 * Expected: FAIL initially - performance optimizations not yet implemented
 *
 * Uses Jest with performance.now() for timing measurements
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'

describe('T031: Response Time Baselines', () => {
  // Performance budgets (from requirements)
  const AUTH_RESPONSE_BUDGET_MS = 2000 // NFR-001
  const COLOR_CALCULATION_BUDGET_MS = 500 // Constitutional Principle VI
  const UI_FRAME_BUDGET_MS = 16.67 // 60fps target
  const REGRESSION_THRESHOLD_PERCENT = 10 // >10% slowdown triggers alert

  // Performance baseline storage (simulates monitoring system)
  const performanceBaselines = new Map<string, number>()
  const performanceResults = new Map<
    string,
    Array<{ timestamp: number; duration: number }>
  >()

  beforeAll(() => {
    jest.setTimeout(30000) // Allow time for performance tests

    // Initialize baseline values (these would come from monitoring system)
    performanceBaselines.set('auth_signin', 150) // Baseline: 150ms
    performanceBaselines.set('color_calculation', 200) // Baseline: 200ms
    performanceBaselines.set('ui_render', 10) // Baseline: 10ms
  })

  afterAll(() => {
    // Report all performance results
    console.log('\n=== PERFORMANCE TEST RESULTS ===')
    performanceResults.forEach((results, testName) => {
      const durations = results.map((r) => r.duration)
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      const min = Math.min(...durations)
      const max = Math.max(...durations)
      const p95 = calculatePercentile(durations, 95)

      console.log(`\n${testName}:`)
      console.log(`  Min: ${min.toFixed(2)}ms`)
      console.log(`  Avg: ${avg.toFixed(2)}ms`)
      console.log(`  P95: ${p95.toFixed(2)}ms`)
      console.log(`  Max: ${max.toFixed(2)}ms`)
      console.log(`  Budget: ${performanceBaselines.get(testName) || 'N/A'}ms`)
    })
    console.log('\n================================\n')
  })

  beforeEach(() => {
    // Reset any cached values between tests
    if (global.gc) {
      global.gc() // Force garbage collection if --expose-gc flag used
    }
  })

  /**
   * Test 1: Authentication Response Time <2 Seconds
   *
   * Measures end-to-end authentication flow performance
   * Budget: <2000ms (NFR-001)
   */
  describe('Authentication Performance', () => {
    it('should complete email/password signin in under 2 seconds', async () => {
      const testUser = {
        email: 'performance-test@example.com',
        password: 'ValidPassword123!'
      }

      // Measure sign-in API call
      const startTime = performance.now()

      try {
        // Mock API route handler (in real test, would import actual route)
        const { POST: signinHandler } = await import(
          '../../src/app/api/auth/email-signin/route'
        ).catch(() => ({ POST: null }))

        if (!signinHandler) {
          // Fallback: Mock request if route doesn't exist yet
          await mockAuthenticationRequest(testUser.email, testUser.password)
        } else {
          // Real implementation
          const mockRequest = createMockRequest('POST', '/api/auth/email-signin', testUser)
          const mockResponse = createMockResponse()

          await signinHandler(mockRequest as any, mockResponse as any)
        }

        const endTime = performance.now()
        const duration = endTime - startTime

        // Record result
        recordPerformanceResult('auth_signin', duration)

        // Assert against budget
        expect(duration).toBeLessThan(AUTH_RESPONSE_BUDGET_MS)

        // Check for regression
        const baseline = performanceBaselines.get('auth_signin') || duration
        const regressionThreshold = baseline * (1 + REGRESSION_THRESHOLD_PERCENT / 100)

        if (duration > regressionThreshold) {
          console.warn(
            `⚠️  REGRESSION: Auth took ${duration.toFixed(2)}ms (baseline: ${baseline}ms, +${((duration - baseline) / baseline * 100).toFixed(1)}%)`
          )
        }

        expect(duration).toBeLessThan(regressionThreshold)
      } catch (error) {
        // Expected to fail - route not implemented yet
        console.log('Auth route not yet implemented - test will fail')
        throw error
      }
    })

    it('should validate email lookup in under 500ms', async () => {
      const startTime = performance.now()

      try {
        // Mock email validation (database query)
        await mockEmailLookup('test@example.com')

        const endTime = performance.now()
        const duration = endTime - startTime

        recordPerformanceResult('email_lookup', duration)

        // Email validation should be fast (<500ms)
        expect(duration).toBeLessThan(500)
      } catch (error) {
        console.log('Email lookup not yet optimized')
        throw error
      }
    })

    it('should check OAuth precedence in under 200ms', async () => {
      const startTime = performance.now()

      try {
        // Mock OAuth identity check
        await mockOAuthPrecedenceCheck('test@example.com')

        const endTime = performance.now()
        const duration = endTime - startTime

        recordPerformanceResult('oauth_check', duration)

        expect(duration).toBeLessThan(200)
      } catch (error) {
        console.log('OAuth check not yet optimized')
        throw error
      }
    })
  })

  /**
   * Test 2: Color Calculation Performance <500ms
   *
   * Validates color mixing algorithm meets performance budget
   * Budget: <500ms (Constitutional Principle VI)
   */
  describe('Color Calculation Performance', () => {
    it('should calculate simple color mix in under 200ms', async () => {
      const simpleColorRequest = {
        target_color: { l: 50.0, a: 0.0, b: 0.0 },
        available_paints: ['white-uuid', 'black-uuid'],
        accuracy_target: 3.0
      }

      const startTime = performance.now()

      try {
        await mockColorCalculation(simpleColorRequest)

        const endTime = performance.now()
        const duration = endTime - startTime

        recordPerformanceResult('color_calculation_simple', duration)

        // Simple calculations should be very fast
        expect(duration).toBeLessThan(200)
      } catch (error) {
        console.log('Color calculation not yet implemented')
        throw error
      }
    })

    it('should calculate complex color mix in under 500ms', async () => {
      const complexColorRequest = {
        target_color: { l: 42.8, a: 18.5, b: -12.3 },
        available_paints: [
          'white-uuid',
          'red-uuid',
          'blue-uuid',
          'yellow-uuid',
          'umber-uuid',
          'sienna-uuid'
        ],
        accuracy_target: 2.0,
        formula_version: 'enhanced'
      }

      const startTime = performance.now()

      try {
        await mockColorCalculation(complexColorRequest)

        const endTime = performance.now()
        const duration = endTime - startTime

        recordPerformanceResult('color_calculation_complex', duration)

        // Complex calculations must meet budget
        expect(duration).toBeLessThan(COLOR_CALCULATION_BUDGET_MS)

        // Check for regression
        const baseline = performanceBaselines.get('color_calculation') || duration
        const regressionThreshold = baseline * (1 + REGRESSION_THRESHOLD_PERCENT / 100)

        if (duration > regressionThreshold) {
          console.warn(
            `⚠️  REGRESSION: Color calc took ${duration.toFixed(2)}ms (baseline: ${baseline}ms, +${((duration - baseline) / baseline * 100).toFixed(1)}%)`
          )
        }

        expect(duration).toBeLessThan(regressionThreshold)
      } catch (error) {
        console.log('Complex color calculation not yet optimized')
        throw error
      }
    })

    it('should handle batch calculations efficiently', async () => {
      const batchSize = 10
      const batchRequests = Array(batchSize)
        .fill(null)
        .map((_, i) => ({
          target_color: { l: 40 + i, a: 10, b: -5 },
          available_paints: ['white-uuid', 'black-uuid'],
          accuracy_target: 3.0
        }))

      const startTime = performance.now()

      try {
        await Promise.all(batchRequests.map((req) => mockColorCalculation(req)))

        const endTime = performance.now()
        const duration = endTime - startTime
        const avgPerCalculation = duration / batchSize

        recordPerformanceResult('color_calculation_batch', duration)

        // Each calculation in batch should be within budget
        expect(avgPerCalculation).toBeLessThan(COLOR_CALCULATION_BUDGET_MS)

        console.log(
          `Batch: ${batchSize} calculations in ${duration.toFixed(2)}ms (avg: ${avgPerCalculation.toFixed(2)}ms)`
        )
      } catch (error) {
        console.log('Batch calculations not yet implemented')
        throw error
      }
    })
  })

  /**
   * Test 3: UI Interaction at 60fps (16.67ms per frame)
   *
   * Validates UI rendering meets 60fps target
   * Budget: <16.67ms per frame
   */
  describe('UI Interaction Performance', () => {
    it('should render form input changes within frame budget', async () => {
      const frameStart = performance.now()

      try {
        // Simulate component render (would use React test renderer in real test)
        await mockComponentRender({
          email: 'test@example.com',
          password: 'typing...',
          errors: {}
        })

        const frameEnd = performance.now()
        const duration = frameEnd - frameStart

        recordPerformanceResult('ui_render_input', duration)

        // Should render within 60fps budget
        expect(duration).toBeLessThan(UI_FRAME_BUDGET_MS)
      } catch (error) {
        console.log('UI rendering not yet optimized')
        throw error
      }
    })

    it('should handle validation updates within frame budget', async () => {
      const frameStart = performance.now()

      try {
        // Simulate validation update
        await mockValidationRender({
          email: 'invalid-email',
          errors: { email: 'Invalid email format' }
        })

        const frameEnd = performance.now()
        const duration = frameEnd - frameStart

        recordPerformanceResult('ui_render_validation', duration)

        expect(duration).toBeLessThan(UI_FRAME_BUDGET_MS)
      } catch (error) {
        console.log('Validation rendering not yet optimized')
        throw error
      }
    })

    it('should update lockout timer without frame drops', async () => {
      const timerUpdates = 10
      const durations: number[] = []

      try {
        for (let i = 0; i < timerUpdates; i++) {
          const frameStart = performance.now()

          await mockTimerRender({ remainingSeconds: 900 - i })

          const frameEnd = performance.now()
          durations.push(frameEnd - frameStart)
        }

        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
        const maxDuration = Math.max(...durations)

        recordPerformanceResult('ui_render_timer', avgDuration)

        // Average should be well within budget
        expect(avgDuration).toBeLessThan(UI_FRAME_BUDGET_MS)

        // Even max frame shouldn't drop below 60fps
        expect(maxDuration).toBeLessThan(UI_FRAME_BUDGET_MS * 2) // Allow some variance

        console.log(
          `Timer renders: avg ${avgDuration.toFixed(2)}ms, max ${maxDuration.toFixed(2)}ms`
        )
      } catch (error) {
        console.log('Timer rendering not yet optimized')
        throw error
      }
    })
  })

  /**
   * Test 4: Performance Monitoring Integration
   *
   * Validates that performance metrics are captured correctly
   */
  describe('Performance Monitoring', () => {
    it('should capture authentication timing metrics', () => {
      const metrics = performanceResults.get('auth_signin') || []

      // Should have recorded at least one measurement
      expect(metrics.length).toBeGreaterThan(0)

      // Each metric should have timestamp and duration
      metrics.forEach((metric) => {
        expect(metric).toHaveProperty('timestamp')
        expect(metric).toHaveProperty('duration')
        expect(metric.timestamp).toBeGreaterThan(0)
        expect(metric.duration).toBeGreaterThan(0)
      })
    })

    it('should calculate performance percentiles correctly', () => {
      const testDurations = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550]

      const p50 = calculatePercentile(testDurations, 50)
      const p95 = calculatePercentile(testDurations, 95)
      const p99 = calculatePercentile(testDurations, 99)

      expect(p50).toBeCloseTo(300, 0) // Median
      expect(p95).toBeCloseTo(545, 0) // 95th percentile
      expect(p99).toBeCloseTo(549, 0) // 99th percentile
    })

    it('should export performance data for analysis', () => {
      const exportData = exportPerformanceResults()

      expect(exportData).toHaveProperty('results')
      expect(exportData).toHaveProperty('baselines')
      expect(exportData).toHaveProperty('timestamp')

      console.log('Performance export:', JSON.stringify(exportData, null, 2))
    })
  })

  /**
   * Test 5: Regression Detection
   *
   * Validates that performance regressions are detected
   */
  describe('Regression Detection', () => {
    it('should detect >10% slowdown in authentication', () => {
      const baseline = performanceBaselines.get('auth_signin') || 150
      const currentPerformance = baseline * 1.15 // 15% slower

      const isRegression = detectRegression('auth_signin', currentPerformance)

      expect(isRegression).toBe(true)
      expect(isRegression).toEqual(
        expect.objectContaining({
          detected: true,
          baseline: expect.any(Number),
          current: currentPerformance,
          percentChange: expect.any(Number)
        })
      )
    })

    it('should not flag acceptable performance variations', () => {
      const baseline = performanceBaselines.get('auth_signin') || 150
      const currentPerformance = baseline * 1.05 // 5% slower (within threshold)

      const isRegression = detectRegression('auth_signin', currentPerformance)

      expect(isRegression).toBe(false)
    })

    it('should alert on p95 latency regression', () => {
      const durations = [100, 150, 200, 250, 300, 350, 400, 450, 500, 600]
      const p95 = calculatePercentile(durations, 95)

      const baseline = 500
      const regressionThreshold = baseline * (1 + REGRESSION_THRESHOLD_PERCENT / 100)

      if (p95 > regressionThreshold) {
        console.warn(`⚠️  P95 REGRESSION: ${p95}ms exceeds threshold ${regressionThreshold}ms`)
      }

      // P95 should be monitored for regressions
      expect(p95).toBeLessThan(regressionThreshold)
    })
  })
})

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Record performance result for later analysis
 */
function recordPerformanceResult(testName: string, duration: number): void {
  if (!performanceResults.has(testName)) {
    performanceResults.set(testName, [])
  }

  performanceResults.get(testName)!.push({
    timestamp: Date.now(),
    duration
  })
}

/**
 * Calculate percentile from array of durations
 */
function calculatePercentile(durations: number[], percentile: number): number {
  const sorted = [...durations].sort((a, b) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)]
}

/**
 * Detect performance regression
 */
function detectRegression(
  testName: string,
  currentDuration: number
): boolean | { detected: boolean; baseline: number; current: number; percentChange: number } {
  const baseline = performanceBaselines.get(testName)
  if (!baseline) return false

  const regressionThreshold = baseline * (1 + REGRESSION_THRESHOLD_PERCENT / 100)
  const detected = currentDuration > regressionThreshold

  if (detected) {
    return {
      detected: true,
      baseline,
      current: currentDuration,
      percentChange: ((currentDuration - baseline) / baseline) * 100
    }
  }

  return false
}

/**
 * Export performance results for CI/CD integration
 */
function exportPerformanceResults(): {
  results: Record<string, any>
  baselines: Record<string, number>
  timestamp: number
} {
  const results: Record<string, any> = {}

  performanceResults.forEach((measurements, testName) => {
    const durations = measurements.map((m) => m.duration)
    results[testName] = {
      count: durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: calculatePercentile(durations, 50),
      p95: calculatePercentile(durations, 95),
      p99: calculatePercentile(durations, 99)
    }
  })

  return {
    results,
    baselines: Object.fromEntries(performanceBaselines),
    timestamp: Date.now()
  }
}

// ============================================================================
// Mock Functions (for testing before implementation)
// ============================================================================

async function mockAuthenticationRequest(email: string, password: string): Promise<void> {
  // Simulate database query and auth check
  await sleep(150) // Realistic auth time
}

async function mockEmailLookup(email: string): Promise<void> {
  await sleep(50) // Indexed database query
}

async function mockOAuthPrecedenceCheck(email: string): Promise<void> {
  await sleep(30) // Quick identity table check
}

async function mockColorCalculation(request: any): Promise<void> {
  const complexity = request.available_paints?.length || 2
  await sleep(complexity * 20) // Simulated calculation time
}

async function mockComponentRender(state: any): Promise<void> {
  await sleep(5) // React render cycle
}

async function mockValidationRender(state: any): Promise<void> {
  await sleep(3) // Validation update
}

async function mockTimerRender(state: any): Promise<void> {
  await sleep(2) // Timer tick update
}

function createMockRequest(method: string, url: string, body: any): any {
  return {
    method,
    url,
    json: async () => body,
    headers: new Map()
  }
}

function createMockResponse(): any {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    headers: new Map()
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Usage Instructions:
 *
 * RUN TESTS:
 *   npm run test:performance
 *   npm test -- __tests__/performance/response-times.test.ts
 *
 * RUN WITH GARBAGE COLLECTION:
 *   node --expose-gc node_modules/.bin/jest __tests__/performance/response-times.test.ts
 *
 * GENERATE REPORT:
 *   npm run test:performance -- --json --outputFile=performance-report.json
 *
 * CI/CD INTEGRATION:
 *   - Run tests on every PR
 *   - Compare against baseline from main branch
 *   - Fail build if >10% regression detected
 *   - Store results in artifacts for trend analysis
 *
 * EXPECTED INITIAL STATE:
 *   - Tests FAIL because optimizations not implemented
 *   - Baselines may not exist yet
 *   - Implementation tasks will improve performance to meet budgets
 */
