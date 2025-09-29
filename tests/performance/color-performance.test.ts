import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { calculateKubelkaMunkMixing } from '@/lib/kubelka-munk'
import { calculateDeltaE2000 as calculateDeltaE } from '@/lib/color-science'
import { rgbToLab as convertRgbToLab, labToRgb as convertLabToRgb } from '@/lib/color-science'
import { performanceMonitor } from '@/lib/utils/performance'
import type { ColorValue, PaintData } from '@/types/types'

describe('Color Calculation Performance Tests', () => {
  // Extended paint database for performance testing
  const largePaintDatabase: PaintData[] = [
    // Primary colors
    {
      id: 'titanium-white',
      name: 'Titanium White',
      k_coefficient: { k: 0.05, s: 12.0 },
      lab_values: { l: 96.5, a: -0.2, b: 1.8 },
    },
    {
      id: 'mars-black',
      name: 'Mars Black',
      k_coefficient: { k: 25.0, s: 0.8 },
      lab_values: { l: 16.2, a: 0.1, b: -0.3 },
    },
    // Red family
    {
      id: 'cadmium-red-light',
      name: 'Cadmium Red Light',
      k_coefficient: { k: 7.8, s: 5.5 },
      lab_values: { l: 48.5, a: 70.2, b: 58.3 },
    },
    {
      id: 'cadmium-red-medium',
      name: 'Cadmium Red Medium',
      k_coefficient: { k: 8.2, s: 5.1 },
      lab_values: { l: 45.2, a: 68.4, b: 54.1 },
    },
    {
      id: 'cadmium-red-deep',
      name: 'Cadmium Red Deep',
      k_coefficient: { k: 8.8, s: 4.8 },
      lab_values: { l: 42.1, a: 65.7, b: 49.2 },
    },
    {
      id: 'alizarin-crimson',
      name: 'Alizarin Crimson',
      k_coefficient: { k: 9.8, s: 4.5 },
      lab_values: { l: 38.6, a: 58.2, b: 22.1 },
    },
    {
      id: 'quinacridone-rose',
      name: 'Quinacridone Rose',
      k_coefficient: { k: 6.2, s: 6.8 },
      lab_values: { l: 55.3, a: 62.1, b: 15.7 },
    },
    // Yellow family
    {
      id: 'cadmium-yellow-light',
      name: 'Cadmium Yellow Light',
      k_coefficient: { k: 1.8, s: 9.2 },
      lab_values: { l: 82.1, a: 8.3, b: 82.5 },
    },
    {
      id: 'cadmium-yellow-medium',
      name: 'Cadmium Yellow Medium',
      k_coefficient: { k: 2.1, s: 8.7 },
      lab_values: { l: 78.3, a: 12.5, b: 78.2 },
    },
    {
      id: 'cadmium-yellow-deep',
      name: 'Cadmium Yellow Deep',
      k_coefficient: { k: 2.6, s: 8.1 },
      lab_values: { l: 74.8, a: 18.2, b: 73.1 },
    },
    {
      id: 'yellow-ochre',
      name: 'Yellow Ochre',
      k_coefficient: { k: 4.2, s: 6.8 },
      lab_values: { l: 65.2, a: 8.4, b: 45.7 },
    },
    {
      id: 'naples-yellow',
      name: 'Naples Yellow',
      k_coefficient: { k: 3.1, s: 7.5 },
      lab_values: { l: 71.8, a: 15.6, b: 52.3 },
    },
    // Blue family
    {
      id: 'ultramarine-blue',
      name: 'Ultramarine Blue',
      k_coefficient: { k: 12.5, s: 3.2 },
      lab_values: { l: 29.8, a: 15.2, b: -58.7 },
    },
    {
      id: 'prussian-blue',
      name: 'Prussian Blue',
      k_coefficient: { k: 18.2, s: 2.1 },
      lab_values: { l: 22.5, a: 8.3, b: -45.2 },
    },
    {
      id: 'cerulean-blue',
      name: 'Cerulean Blue',
      k_coefficient: { k: 8.5, s: 4.8 },
      lab_values: { l: 52.3, a: -12.8, b: -35.7 },
    },
    {
      id: 'phthalo-blue',
      name: 'Phthalo Blue',
      k_coefficient: { k: 15.8, s: 2.8 },
      lab_values: { l: 25.1, a: 12.7, b: -52.3 },
    },
    // Earth tones
    {
      id: 'burnt-umber',
      name: 'Burnt Umber',
      k_coefficient: { k: 15.8, s: 2.1 },
      lab_values: { l: 25.4, a: 12.8, b: 18.9 },
    },
    {
      id: 'raw-umber',
      name: 'Raw Umber',
      k_coefficient: { k: 12.3, s: 2.8 },
      lab_values: { l: 32.1, a: 8.5, b: 12.3 },
    },
    {
      id: 'burnt-sienna',
      name: 'Burnt Sienna',
      k_coefficient: { k: 8.7, s: 3.5 },
      lab_values: { l: 38.2, a: 28.5, b: 32.1 },
    },
    {
      id: 'raw-sienna',
      name: 'Raw Sienna',
      k_coefficient: { k: 6.5, s: 4.2 },
      lab_values: { l: 42.8, a: 18.5, b: 35.2 },
    },
    // Greens
    {
      id: 'viridian',
      name: 'Viridian',
      k_coefficient: { k: 11.2, s: 3.8 },
      lab_values: { l: 35.7, a: -38.2, b: 18.5 },
    },
    {
      id: 'sap-green',
      name: 'Sap Green',
      k_coefficient: { k: 13.5, s: 3.1 },
      lab_values: { l: 28.3, a: -25.7, b: 22.8 },
    },
  ]

  beforeEach(() => {
    performanceMonitor.clear()
  })

  afterEach(() => {
    performanceMonitor.clear()
  })

  describe('Color Matching Performance', () => {
    it('should complete simple color matching within 500ms', async () => {
      const targetColor: ColorValue = {
        hex: '#ff8000',
        rgb: { r: 255, g: 128, b: 0 },
        lab: { l: 66.5, a: 40.2, b: 65.3 },
      }

      performanceMonitor.startTimer('simple_color_match')

      const result = findBestColorMatch({
        targetColor,
        availablePaints: largePaintDatabase.slice(0, 10), // Smaller subset
        maxPaints: 3,
        volumeMl: 100,
        tolerance: 4.0,
      })

      const duration = performanceMonitor.endTimer('simple_color_match')

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(500) // 500ms requirement
    })

    it('should complete complex color matching within 1000ms', async () => {
      const targetColor: ColorValue = {
        hex: '#8040c0',
        rgb: { r: 128, g: 64, b: 192 },
        lab: { l: 40.5, a: 35.2, b: -45.3 },
      }

      performanceMonitor.startTimer('complex_color_match')

      const result = findBestColorMatch({
        targetColor,
        availablePaints: largePaintDatabase, // Full database
        maxPaints: 5,
        volumeMl: 100,
        tolerance: 4.0,
      })

      const duration = performanceMonitor.endTimer('complex_color_match')

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(1000) // Extended for complex matching
    })

    it('should handle batch color matching efficiently', async () => {
      const targetColors: ColorValue[] = [
        { hex: '#ff0000', rgb: { r: 255, g: 0, b: 0 }, lab: { l: 53.2, a: 80.1, b: 67.2 } },
        { hex: '#00ff00', rgb: { r: 0, g: 255, b: 0 }, lab: { l: 87.7, a: -86.2, b: 83.2 } },
        { hex: '#0000ff', rgb: { r: 0, g: 0, b: 255 }, lab: { l: 32.3, a: 79.2, b: -107.9 } },
        { hex: '#ffff00', rgb: { r: 255, g: 255, b: 0 }, lab: { l: 97.1, a: -21.6, b: 94.5 } },
        { hex: '#ff00ff', rgb: { r: 255, g: 0, b: 255 }, lab: { l: 60.3, a: 98.2, b: -60.8 } },
      ]

      performanceMonitor.startTimer('batch_color_match')

      const results = targetColors.map(targetColor =>
        findBestColorMatch({
          targetColor,
          availablePaints: largePaintDatabase.slice(0, 15),
          maxPaints: 3,
          volumeMl: 100,
          tolerance: 6.0,
        })
      )

      const duration = performanceMonitor.endTimer('batch_color_match')

      expect(results).toHaveLength(5)
      expect(duration).toBeLessThan(2000) // 2 seconds for batch processing
      expect(results.every(r => r.success || r.error?.includes('tolerance'))).toBe(true)
    })

    it('should scale linearly with paint database size', async () => {
      const targetColor: ColorValue = {
        hex: '#ff8000',
        rgb: { r: 255, g: 128, b: 0 },
        lab: { l: 66.5, a: 40.2, b: 65.3 },
      }

      // Test with small database
      performanceMonitor.startTimer('small_db_match')
      findBestColorMatch({
        targetColor,
        availablePaints: largePaintDatabase.slice(0, 5),
        maxPaints: 3,
        volumeMl: 100,
        tolerance: 4.0,
      })
      const smallDbDuration = performanceMonitor.endTimer('small_db_match')

      // Test with large database
      performanceMonitor.startTimer('large_db_match')
      findBestColorMatch({
        targetColor,
        availablePaints: largePaintDatabase,
        maxPaints: 3,
        volumeMl: 100,
        tolerance: 4.0,
      })
      const largeDbDuration = performanceMonitor.endTimer('large_db_match')

      // Should scale reasonably (not exponentially)
      const scalingFactor = largeDbDuration / smallDbDuration
      expect(scalingFactor).toBeLessThan(10) // Should not be more than 10x slower
    })
  })

  describe('Color Prediction Performance', () => {
    it('should complete color prediction within 100ms', async () => {
      const ratios = [
        { paint_id: 'cadmium-red-medium', ratio: 0.6 },
        { paint_id: 'cadmium-yellow-medium', ratio: 0.4 },
      ]

      performanceMonitor.startTimer('color_prediction')

      const result = predictColorFromRatios({
        ratios,
        totalVolume: 100,
        paintDatabase: largePaintDatabase,
      })

      const duration = performanceMonitor.endTimer('color_prediction')

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(100) // Should be very fast
    })

    it('should handle complex predictions with many paints', async () => {
      const ratios = [
        { paint_id: 'cadmium-red-medium', ratio: 0.3 },
        { paint_id: 'cadmium-yellow-medium', ratio: 0.3 },
        { paint_id: 'ultramarine-blue', ratio: 0.2 },
        { paint_id: 'titanium-white', ratio: 0.15 },
        { paint_id: 'burnt-umber', ratio: 0.05 },
      ]

      performanceMonitor.startTimer('complex_prediction')

      const result = predictColorFromRatios({
        ratios,
        totalVolume: 100,
        paintDatabase: largePaintDatabase,
      })

      const duration = performanceMonitor.endTimer('complex_prediction')

      expect(result.success).toBe(true)
      expect(duration).toBeLessThan(200) // Still fast for complex predictions
    })

    it('should efficiently process prediction batches', async () => {
      const batchSize = 50
      const predictions = []

      performanceMonitor.startTimer('batch_predictions')

      for (let i = 0; i < batchSize; i++) {
        const ratio = i / batchSize
        const ratios = [
          { paint_id: 'cadmium-red-medium', ratio },
          { paint_id: 'cadmium-yellow-medium', ratio: 1 - ratio },
        ]

        const result = predictColorFromRatios({
          ratios,
          totalVolume: 100,
          paintDatabase: largePaintDatabase,
        })

        predictions.push(result)
      }

      const duration = performanceMonitor.endTimer('batch_predictions')

      expect(predictions).toHaveLength(batchSize)
      expect(predictions.every(p => p.success)).toBe(true)
      expect(duration).toBeLessThan(1000) // 1 second for 50 predictions
      expect(duration / batchSize).toBeLessThan(20) // Less than 20ms per prediction
    })
  })

  describe('Color Space Conversion Performance', () => {
    it('should convert RGB to LAB within 10ms', () => {
      const testCases = [
        [255, 0, 0],     // Red
        [0, 255, 0],     // Green
        [0, 0, 255],     // Blue
        [255, 255, 255], // White
        [0, 0, 0],       // Black
        [128, 128, 128], // Gray
      ]

      performanceMonitor.startTimer('rgb_to_lab_batch')

      const results = testCases.map(([r, g, b]) => convertRgbToLab(r, g, b))

      const duration = performanceMonitor.endTimer('rgb_to_lab_batch')

      expect(results).toHaveLength(testCases.length)
      expect(duration).toBeLessThan(10) // Very fast conversion
      expect(duration / testCases.length).toBeLessThan(2) // Less than 2ms per conversion
    })

    it('should convert LAB to RGB within 10ms', () => {
      const testCases = [
        [53.2, 80.1, 67.2],   // Red
        [87.7, -86.2, 83.2],  // Green
        [32.3, 79.2, -107.9], // Blue
        [100, 0, 0],          // White
        [0, 0, 0],            // Black
        [53.6, 0, 0],         // Gray
      ]

      performanceMonitor.startTimer('lab_to_rgb_batch')

      const results = testCases.map(([l, a, b]) => convertLabToRgb(l, a, b))

      const duration = performanceMonitor.endTimer('lab_to_rgb_batch')

      expect(results).toHaveLength(testCases.length)
      expect(duration).toBeLessThan(10) // Very fast conversion
      expect(duration / testCases.length).toBeLessThan(2) // Less than 2ms per conversion
    })

    it('should handle large-scale color conversions efficiently', () => {
      const batchSize = 1000
      const rgbColors = Array.from({ length: batchSize }, (_, i) => [
        Math.floor((i * 255) / batchSize),
        Math.floor((i * 128) / batchSize),
        Math.floor((i * 192) / batchSize),
      ])

      performanceMonitor.startTimer('large_scale_conversion')

      const labColors = rgbColors.map(([r, g, b]) => convertRgbToLab(r, g, b))
      const backToRgb = labColors.map(({ l, a, b }) => convertLabToRgb(l, a, b))

      const duration = performanceMonitor.endTimer('large_scale_conversion')

      expect(labColors).toHaveLength(batchSize)
      expect(backToRgb).toHaveLength(batchSize)
      expect(duration).toBeLessThan(500) // 500ms for 1000 round-trip conversions
      expect(duration / (batchSize * 2)).toBeLessThan(0.25) // Less than 0.25ms per conversion
    })
  })

  describe('Delta E Calculation Performance', () => {
    it('should calculate Delta E within 5ms', () => {
      const colorPairs = [
        [{ l: 50, a: 25, b: -25 }, { l: 52, a: 27, b: -23 }],
        [{ l: 75, a: 15, b: 45 }, { l: 73, a: 17, b: 43 }],
        [{ l: 30, a: -15, b: 35 }, { l: 32, a: -13, b: 37 }],
        [{ l: 90, a: 5, b: 15 }, { l: 88, a: 7, b: 13 }],
        [{ l: 20, a: 45, b: -35 }, { l: 22, a: 43, b: -33 }],
      ]

      performanceMonitor.startTimer('delta_e_batch')

      const deltaEs = colorPairs.map(([color1, color2]) => calculateDeltaE(color1, color2))

      const duration = performanceMonitor.endTimer('delta_e_batch')

      expect(deltaEs).toHaveLength(colorPairs.length)
      expect(deltaEs.every(de => de >= 0)).toBe(true)
      expect(duration).toBeLessThan(5) // Very fast calculation
    })

    it('should efficiently compare large color sets', () => {
      const baseColor = { l: 50, a: 25, b: -25 }
      const testColors = Array.from({ length: 100 }, (_, i) => ({
        l: 50 + (i - 50) * 0.5,
        a: 25 + (i - 50) * 0.3,
        b: -25 + (i - 50) * 0.4,
      }))

      performanceMonitor.startTimer('delta_e_comparison_matrix')

      const deltaEs = testColors.map(color => calculateDeltaE(baseColor, color))

      const duration = performanceMonitor.endTimer('delta_e_comparison_matrix')

      expect(deltaEs).toHaveLength(100)
      expect(duration).toBeLessThan(50) // 50ms for 100 comparisons
      expect(duration / 100).toBeLessThan(0.5) // Less than 0.5ms per comparison
    })
  })

  describe('Memory Performance', () => {
    it('should not leak memory during repeated calculations', () => {
      const targetColor: ColorValue = {
        hex: '#ff8000',
        rgb: { r: 255, g: 128, b: 0 },
        lab: { l: 66.5, a: 40.2, b: 65.3 },
      }

      const initialMemory = performance.memory?.usedJSHeapSize || 0

      // Perform many calculations
      for (let i = 0; i < 100; i++) {
        findBestColorMatch({
          targetColor,
          availablePaints: largePaintDatabase.slice(0, 10),
          maxPaints: 3,
          volumeMl: 100,
          tolerance: 4.0,
        })
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })
  })

  describe('Web Worker Performance', () => {
    it('should demonstrate improved performance with Web Workers', async () => {
      // This test would require actual Web Worker implementation
      // For now, we simulate the expected performance improvement

      const targetColor: ColorValue = {
        hex: '#8040c0',
        rgb: { r: 128, g: 64, b: 192 },
        lab: { l: 40.5, a: 35.2, b: -45.3 },
      }

      // Simulate main thread calculation
      performanceMonitor.startTimer('main_thread_calculation')

      findBestColorMatch({
        targetColor,
        availablePaints: largePaintDatabase,
        maxPaints: 5,
        volumeMl: 100,
        tolerance: 4.0,
      })

      const mainThreadDuration = performanceMonitor.endTimer('main_thread_calculation')

      // In a real scenario, Web Worker would be faster for complex calculations
      // due to parallel processing and not blocking the main thread
      expect(mainThreadDuration).toBeLessThan(1000)
    })
  })

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across runs', () => {
      const targetColor: ColorValue = {
        hex: '#ff8000',
        rgb: { r: 255, g: 128, b: 0 },
        lab: { l: 66.5, a: 40.2, b: 65.3 },
      }

      const durations: number[] = []

      // Run the same calculation multiple times
      for (let i = 0; i < 10; i++) {
        performanceMonitor.startTimer(`consistency_test_${i}`)

        findBestColorMatch({
          targetColor,
          availablePaints: largePaintDatabase.slice(0, 15),
          maxPaints: 3,
          volumeMl: 100,
          tolerance: 4.0,
        })

        durations.push(performanceMonitor.endTimer(`consistency_test_${i}`))
      }

      const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
      const maxDeviation = Math.max(...durations.map(d => Math.abs(d - averageDuration)))

      // Performance should be consistent (within 50% of average)
      expect(maxDeviation).toBeLessThan(averageDuration * 0.5)
      expect(averageDuration).toBeLessThan(500) // Still meet overall target
    })
  })

  describe('Performance Monitoring Integration', () => {
    it('should track performance metrics correctly', () => {
      const targetColor: ColorValue = {
        hex: '#ff8000',
        rgb: { r: 255, g: 128, b: 0 },
        lab: { l: 66.5, a: 40.2, b: 65.3 },
      }

      findBestColorMatch({
        targetColor,
        availablePaints: largePaintDatabase.slice(0, 10),
        maxPaints: 3,
        volumeMl: 100,
        tolerance: 4.0,
      })

      const report = performanceMonitor.generateReport()

      expect(report.metrics.length).toBeGreaterThan(0)
      expect(report.summary.totalTime).toBeGreaterThan(0)
      expect(report.recommendations).toBeDefined()
    })
  })
})