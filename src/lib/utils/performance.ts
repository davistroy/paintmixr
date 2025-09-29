interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  metadata?: Record<string, any>
}

interface PerformanceReport {
  metrics: PerformanceMetric[]
  summary: {
    totalTime: number
    apiCalls: number
    errors: number
    cacheHits: number
    cacheMisses: number
  }
  recommendations: string[]
}

interface TimingOptions {
  includeUserTiming?: boolean
  includeNavigation?: boolean
  includeResource?: boolean
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private timers: Map<string, number> = new Map()
  private apiCallCount = 0
  private errorCount = 0
  private cacheStats = { hits: 0, misses: 0 }

  startTimer(name: string): void {
    this.timers.set(name, performance.now())
  }

  endTimer(name: string, metadata?: Record<string, any>): number {
    const startTime = this.timers.get(name)
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`)
      return 0
    }

    const duration = performance.now() - startTime
    this.timers.delete(name)

    this.addMetric({
      name,
      value: duration,
      timestamp: Date.now(),
      metadata,
    })

    return duration
  }

  addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)

    // Keep only recent metrics (last 100)
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }
  }

  recordApiCall(endpoint: string, duration: number, success: boolean): void {
    this.apiCallCount++
    if (!success) this.errorCount++

    this.addMetric({
      name: 'api_call',
      value: duration,
      timestamp: Date.now(),
      metadata: { endpoint, success },
    })
  }

  recordCacheHit(key: string): void {
    this.cacheStats.hits++
    this.addMetric({
      name: 'cache_hit',
      value: 1,
      timestamp: Date.now(),
      metadata: { key },
    })
  }

  recordCacheMiss(key: string): void {
    this.cacheStats.misses++
    this.addMetric({
      name: 'cache_miss',
      value: 1,
      timestamp: Date.now(),
      metadata: { key },
    })
  }

  getMetrics(filter?: string): PerformanceMetric[] {
    if (!filter) return [...this.metrics]
    return this.metrics.filter(metric => metric.name.includes(filter))
  }

  getAverageTime(metricName: string): number {
    const filteredMetrics = this.metrics.filter(m => m.name === metricName)
    if (filteredMetrics.length === 0) return 0

    const total = filteredMetrics.reduce((sum, metric) => sum + metric.value, 0)
    return total / filteredMetrics.length
  }

  getCacheHitRatio(): number {
    const total = this.cacheStats.hits + this.cacheStats.misses
    return total === 0 ? 0 : this.cacheStats.hits / total
  }

  getBrowserTimings(options: TimingOptions = {}): PerformanceMetric[] {
    const browserMetrics: PerformanceMetric[] = []

    if (typeof window === 'undefined') return browserMetrics

    // Navigation timing
    if (options.includeNavigation !== false) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        browserMetrics.push(
          {
            name: 'page_load_time',
            value: navigation.loadEventEnd - navigation.fetchStart,
            timestamp: Date.now(),
            metadata: { type: 'navigation' },
          },
          {
            name: 'dom_content_loaded',
            value: navigation.domContentLoadedEventEnd - navigation.fetchStart,
            timestamp: Date.now(),
            metadata: { type: 'navigation' },
          },
          {
            name: 'first_byte',
            value: navigation.responseStart - navigation.fetchStart,
            timestamp: Date.now(),
            metadata: { type: 'navigation' },
          }
        )
      }
    }

    // User timing marks and measures
    if (options.includeUserTiming !== false) {
      const userTimings = performance.getEntriesByType('measure')
      userTimings.forEach(timing => {
        browserMetrics.push({
          name: timing.name,
          value: timing.duration,
          timestamp: Date.now(),
          metadata: { type: 'user_timing' },
        })
      })
    }

    // Resource timing (limited to avoid too much data)
    if (options.includeResource) {
      const resources = performance.getEntriesByType('resource').slice(-20) // Last 20 resources
      resources.forEach(resource => {
        browserMetrics.push({
          name: 'resource_load',
          value: resource.duration,
          timestamp: Date.now(),
          metadata: {
            type: 'resource',
            name: resource.name,
            size: (resource as PerformanceResourceTiming).transferSize,
          },
        })
      })
    }

    return browserMetrics
  }

  generateReport(): PerformanceReport {
    const totalTime = this.metrics.reduce((sum, metric) => sum + metric.value, 0)
    const recommendations: string[] = []

    // Generate recommendations based on metrics
    const avgApiTime = this.getAverageTime('api_call')
    if (avgApiTime > 1000) {
      recommendations.push('API calls are taking longer than 1 second on average. Consider optimizing backend or adding caching.')
    }

    const cacheHitRatio = this.getCacheHitRatio()
    if (cacheHitRatio < 0.7) {
      recommendations.push('Cache hit ratio is below 70%. Consider improving caching strategy.')
    }

    if (this.errorCount > this.apiCallCount * 0.05) {
      recommendations.push('Error rate is above 5%. Review error handling and API reliability.')
    }

    // Check for slow operations
    const slowOperations = this.metrics.filter(m => m.value > 2000)
    if (slowOperations.length > 0) {
      recommendations.push('Some operations are taking longer than 2 seconds. Consider optimizing or showing loading indicators.')
    }

    return {
      metrics: [...this.metrics],
      summary: {
        totalTime,
        apiCalls: this.apiCallCount,
        errors: this.errorCount,
        cacheHits: this.cacheStats.hits,
        cacheMisses: this.cacheStats.misses,
      },
      recommendations,
    }
  }

  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = ['name', 'value', 'timestamp', 'metadata']
      const rows = this.metrics.map(metric => [
        metric.name,
        metric.value.toString(),
        metric.timestamp.toString(),
        JSON.stringify(metric.metadata || {}),
      ])

      return [headers, ...rows].map(row => row.join(',')).join('\n')
    }

    return JSON.stringify(this.metrics, null, 2)
  }

  clear(): void {
    this.metrics = []
    this.timers.clear()
    this.apiCallCount = 0
    this.errorCount = 0
    this.cacheStats = { hits: 0, misses: 0 }
  }

  // Web Vitals integration
  observeWebVitals(): void {
    if (typeof window === 'undefined') return

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      this.addMetric({
        name: 'largest_contentful_paint',
        value: lastEntry.startTime,
        timestamp: Date.now(),
        metadata: { type: 'web_vital' },
      })
    })

    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (e) {
      // LCP not supported
    }

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        this.addMetric({
          name: 'first_input_delay',
          value: (entry as any).processingStart - entry.startTime,
          timestamp: Date.now(),
          metadata: { type: 'web_vital' },
        })
      })
    })

    try {
      fidObserver.observe({ entryTypes: ['first-input'] })
    } catch (e) {
      // FID not supported
    }

    // Cumulative Layout Shift
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
        }
      })

      this.addMetric({
        name: 'cumulative_layout_shift',
        value: clsValue,
        timestamp: Date.now(),
        metadata: { type: 'web_vital' },
      })
    })

    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    } catch (e) {
      // CLS not supported
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Utility functions for easy integration
export function withPerformanceTracking<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: any[]) => {
    performanceMonitor.startTimer(name)
    try {
      const result = fn(...args)

      if (result instanceof Promise) {
        return result.finally(() => {
          performanceMonitor.endTimer(name)
        })
      }

      performanceMonitor.endTimer(name)
      return result
    } catch (error) {
      performanceMonitor.endTimer(name, { error: true })
      throw error
    }
  }) as T
}

export async function measureAsync<T>(
  operation: () => Promise<T>,
  name: string,
  metadata?: Record<string, any>
): Promise<T> {
  performanceMonitor.startTimer(name)
  try {
    const result = await operation()
    performanceMonitor.endTimer(name, metadata)
    return result
  } catch (error) {
    performanceMonitor.endTimer(name, { ...metadata, error: true })
    throw error
  }
}

export function measureSync<T>(
  operation: () => T,
  name: string,
  metadata?: Record<string, any>
): T {
  performanceMonitor.startTimer(name)
  try {
    const result = operation()
    performanceMonitor.endTimer(name, metadata)
    return result
  } catch (error) {
    performanceMonitor.endTimer(name, { ...metadata, error: true })
    throw error
  }
}

// API call wrapper with performance tracking
export async function trackedFetch(
  url: string,
  options?: RequestInit,
  metadata?: Record<string, any>
): Promise<Response> {
  const startTime = performance.now()
  let success = false

  try {
    const response = await fetch(url, options)
    success = response.ok
    return response
  } finally {
    const duration = performance.now() - startTime
    performanceMonitor.recordApiCall(url, duration, success)

    if (metadata) {
      performanceMonitor.addMetric({
        name: 'api_call_detailed',
        value: duration,
        timestamp: Date.now(),
        metadata: { ...metadata, url, success },
      })
    }
  }
}

// Memory usage monitoring
export function getMemoryUsage(): PerformanceMetric | null {
  if (typeof window === 'undefined' || !(performance as any).memory) {
    return null
  }

  const memory = (performance as any).memory
  return {
    name: 'memory_usage',
    value: memory.usedJSHeapSize,
    timestamp: Date.now(),
    metadata: {
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedJSHeapSize: memory.usedJSHeapSize,
    },
  }
}

// Initialize Web Vitals monitoring on import (client-side only)
if (typeof window !== 'undefined') {
  performanceMonitor.observeWebVitals()
}

export type { PerformanceMetric, PerformanceReport, TimingOptions }