import { performance } from 'perf_hooks';
import { DifferentialEvolutionOptimizer } from '../../src/lib/optimization/differential-evolution';
import { TPEHybridOptimizer } from '../../src/lib/optimization/tpe-hybrid';
import { KubelkaMunkCalculator } from '../../src/lib/color-science/kubelka-munk-enhanced';
import { EnhancedOptimizationService } from '../../src/lib/services/enhanced-optimization-integration';
import { PerformanceMonitor } from '../../src/lib/monitoring/performance-metrics';
import type { LABColor, Paint, OptimizationRequest } from '../../src/lib/types';

describe('Performance Regression Tests', () => {
  let deOptimizer: DifferentialEvolutionOptimizer;
  let tpeOptimizer: TPEHybridOptimizer;
  let kmCalculator: KubelkaMunkCalculator;
  let integrationService: EnhancedOptimizationService;
  let performanceMonitor: PerformanceMonitor;

  const testPaints: Paint[] = [
    {
      id: 'white',
      name: 'Titanium White',
      brand: 'Test',
      lab_l: 95.0,
      lab_a: -0.5,
      lab_b: 2.8,
      volume_ml: 1000,
      ks_values: Array(40).fill(0).map((_, i) => 0.1 + i * 0.01)
    },
    {
      id: 'blue',
      name: 'Ultramarine Blue',
      brand: 'Test',
      lab_l: 32.5,
      lab_a: 15.2,
      lab_b: -58.9,
      volume_ml: 500,
      ks_values: Array(40).fill(0).map((_, i) => 0.8 + Math.sin(i * 0.3) * 0.2)
    },
    {
      id: 'red',
      name: 'Cadmium Red',
      brand: 'Test',
      lab_l: 48.7,
      lab_a: 65.8,
      lab_b: 52.3,
      volume_ml: 750,
      ks_values: Array(40).fill(0).map((_, i) => 0.6 + Math.cos(i * 0.4) * 0.3)
    },
    {
      id: 'yellow',
      name: 'Cadmium Yellow',
      brand: 'Test',
      lab_l: 87.2,
      lab_a: -8.9,
      lab_b: 85.6,
      volume_ml: 600,
      ks_values: Array(40).fill(0).map((_, i) => 0.4 + Math.sin(i * 0.2) * 0.25)
    },
    {
      id: 'brown',
      name: 'Burnt Sienna',
      brand: 'Test',
      lab_l: 35.8,
      lab_a: 22.1,
      lab_b: 32.7,
      volume_ml: 400,
      ks_values: Array(40).fill(0).map((_, i) => 0.7 + Math.cos(i * 0.5) * 0.2)
    }
  ];

  const targetColors: LABColor[] = [
    { L: 50, a: 10, b: -5 },    // Simple mix
    { L: 65.2, a: -12.5, b: 18.7 }, // Medium complexity
    { L: 72.8, a: 25.3, b: -35.1 }, // Complex mix
    { L: 40.5, a: -8.2, b: 45.6 },  // High saturation
    { L: 85.1, a: 2.1, b: 8.9 }     // Light color
  ];

  beforeAll(async () => {
    deOptimizer = new DifferentialEvolutionOptimizer({
      populationSize: 50,
      maxGenerations: 100,
      crossoverRate: 0.8,
      mutationFactor: 0.5
    });

    tpeOptimizer = new TPEHybridOptimizer({
      nStartupTrials: 10,
      nEiCandidates: 24,
      gammaValue: 0.25
    });

    kmCalculator = new KubelkaMunkCalculator();

    integrationService = new EnhancedOptimizationService(
      deOptimizer,
      tpeOptimizer,
      kmCalculator
    );

    performanceMonitor = new PerformanceMonitor();
  });

  describe('Core Algorithm Performance', () => {
    test('Differential Evolution should complete within 500ms', async () => {
      const results: number[] = [];

      for (const targetColor of targetColors) {
        const startTime = performance.now();

        await deOptimizer.optimize({
          request_id: `perf-test-de-${Date.now()}`,
          target_color: targetColor,
          available_paints: testPaints.map(paint => ({
            paint_id: paint.id,
            paint_name: paint.name,
            lab_color: { L: paint.lab_l, a: paint.lab_a, b: paint.lab_b },
            volume_ml: paint.volume_ml,
            ks_values: paint.ks_values || []
          })),
          constraints: {
            max_paints: 4,
            min_volume_ml: 0.1,
            max_volume_ml: 100,
            target_delta_e: 2.0
          }
        });

        const duration = performance.now() - startTime;
        results.push(duration);

        expect(duration).toBeLessThan(500);
      }

      const avgDuration = results.reduce((a, b) => a + b, 0) / results.length;
      const maxDuration = Math.max(...results);

      expect(avgDuration).toBeLessThan(350);
      expect(maxDuration).toBeLessThan(500);

      console.log(`DE Performance - Avg: ${avgDuration.toFixed(1)}ms, Max: ${maxDuration.toFixed(1)}ms`);
    });

    test('TPE Hybrid should complete within 500ms', async () => {
      const results: number[] = [];

      for (const targetColor of targetColors) {
        const startTime = performance.now();

        await tpeOptimizer.optimize({
          request_id: `perf-test-tpe-${Date.now()}`,
          target_color: targetColor,
          available_paints: testPaints.map(paint => ({
            paint_id: paint.id,
            paint_name: paint.name,
            lab_color: { L: paint.lab_l, a: paint.lab_a, b: paint.lab_b },
            volume_ml: paint.volume_ml,
            ks_values: paint.ks_values || []
          })),
          constraints: {
            max_paints: 4,
            min_volume_ml: 0.1,
            max_volume_ml: 100,
            target_delta_e: 2.0
          }
        });

        const duration = performance.now() - startTime;
        results.push(duration);

        expect(duration).toBeLessThan(500);
      }

      const avgDuration = results.reduce((a, b) => a + b, 0) / results.length;
      const maxDuration = Math.max(...results);

      expect(avgDuration).toBeLessThan(400);
      expect(maxDuration).toBeLessThan(500);

      console.log(`TPE Performance - Avg: ${avgDuration.toFixed(1)}ms, Max: ${maxDuration.toFixed(1)}ms`);
    });

    test('Kubelka-Munk calculations should be fast', () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const reflectance = testPaints[0].ks_values!.map(ks =>
          1 / (1 + ks + Math.sqrt(ks * (ks + 2)))
        );

        kmCalculator.calculateKSValues(reflectance);
        kmCalculator.mixReflectanceSpectra(
          [reflectance, testPaints[1].ks_values!.map(ks =>
            1 / (1 + ks + Math.sqrt(ks * (ks + 2)))
          )],
          [0.7, 0.3]
        );
      }

      const duration = performance.now() - startTime;
      const avgPerCalc = duration / iterations;

      expect(avgPerCalc).toBeLessThan(1.0); // Less than 1ms per calculation
      expect(duration).toBeLessThan(500); // Total under 500ms

      console.log(`KM Performance - ${avgPerCalc.toFixed(3)}ms per calculation`);
    });
  });

  describe('Integration Service Performance', () => {
    test('Enhanced optimization integration should maintain performance', async () => {
      const results: number[] = [];
      const accuracyResults: number[] = [];

      for (const targetColor of targetColors) {
        const startTime = performance.now();

        const result = await integrationService.optimizeWithIntegration(
          'test-user',
          {
            target_color: targetColor,
            available_paints: testPaints.map(paint => ({
              paint_id: paint.id,
              paint_name: paint.name,
              lab_color: { L: paint.lab_l, a: paint.lab_a, b: paint.lab_b },
              volume_ml: paint.volume_ml,
              ks_values: paint.ks_values || []
            })),
            constraints: {
              max_paints: 4,
              min_volume_ml: 0.1,
              max_volume_ml: 100,
              target_delta_e: 2.0
            },
            preferences: {
              algorithm: 'auto',
              optimization_level: 'enhanced'
            }
          }
        );

        const duration = performance.now() - startTime;
        results.push(duration);

        if (result.enhancedResult?.delta_e) {
          accuracyResults.push(result.enhancedResult.delta_e);
        }

        // Integration service includes fallback logic, so allow slightly higher time
        expect(duration).toBeLessThan(750);
      }

      const avgDuration = results.reduce((a, b) => a + b, 0) / results.length;
      const maxDuration = Math.max(...results);
      const avgAccuracy = accuracyResults.reduce((a, b) => a + b, 0) / accuracyResults.length;

      expect(avgDuration).toBeLessThan(600);
      expect(maxDuration).toBeLessThan(750);
      expect(avgAccuracy).toBeLessThan(2.0); // Enhanced accuracy target

      console.log(`Integration Service - Avg: ${avgDuration.toFixed(1)}ms, Max: ${maxDuration.toFixed(1)}ms, Accuracy: ${avgAccuracy.toFixed(2)}ΔE`);
    });
  });

  describe('Memory Usage Regression', () => {
    test('Memory usage should remain stable during optimization', async () => {
      const initialMemory = process.memoryUsage();

      // Run multiple optimizations to check for memory leaks
      for (let i = 0; i < 50; i++) {
        await deOptimizer.optimize({
          request_id: `memory-test-${i}`,
          target_color: targetColors[i % targetColors.length],
          available_paints: testPaints.map(paint => ({
            paint_id: paint.id,
            paint_name: paint.name,
            lab_color: { L: paint.lab_l, a: paint.lab_a, b: paint.lab_b },
            volume_ml: paint.volume_ml,
            ks_values: paint.ks_values || []
          })),
          constraints: {
            max_paints: 4,
            min_volume_ml: 0.1,
            max_volume_ml: 100,
            target_delta_e: 2.0
          }
        });

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncreaseMB).toBeLessThan(10);

      console.log(`Memory Usage - Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Increase: ${memoryIncreaseMB.toFixed(2)}MB`);
    });
  });

  describe('Concurrent Performance', () => {
    test('Should handle concurrent optimizations without degradation', async () => {
      const concurrentRequests = 5;
      const promises: Promise<any>[] = [];

      const startTime = performance.now();

      for (let i = 0; i < concurrentRequests; i++) {
        const promise = deOptimizer.optimize({
          request_id: `concurrent-test-${i}`,
          target_color: targetColors[i % targetColors.length],
          available_paints: testPaints.map(paint => ({
            paint_id: paint.id,
            paint_name: paint.name,
            lab_color: { L: paint.lab_l, a: paint.lab_a, b: paint.lab_b },
            volume_ml: paint.volume_ml,
            ks_values: paint.ks_values || []
          })),
          constraints: {
            max_paints: 4,
            min_volume_ml: 0.1,
            max_volume_ml: 100,
            target_delta_e: 2.0
          }
        });
        promises.push(promise);
      }

      const results = await Promise.all(promises);
      const totalDuration = performance.now() - startTime;

      // All requests should complete
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.delta_e).toBeLessThan(3.0);
      });

      // Concurrent execution should be efficient
      expect(totalDuration).toBeLessThan(1500); // Allow for some overhead

      console.log(`Concurrent Performance - ${concurrentRequests} requests in ${totalDuration.toFixed(1)}ms`);
    });
  });

  describe('Accuracy Regression', () => {
    test('Enhanced accuracy should consistently achieve Delta E ≤ 2.0', async () => {
      const accuracyResults: number[] = [];
      const precisionResults: { paint: string; volume: number }[] = [];

      for (const targetColor of targetColors) {
        const result = await deOptimizer.optimize({
          request_id: `accuracy-test-${Date.now()}`,
          target_color: targetColor,
          available_paints: testPaints.map(paint => ({
            paint_id: paint.id,
            paint_name: paint.name,
            lab_color: { L: paint.lab_l, a: paint.lab_a, b: paint.lab_b },
            volume_ml: paint.volume_ml,
            ks_values: paint.ks_values || []
          })),
          constraints: {
            max_paints: 4,
            min_volume_ml: 0.1,
            max_volume_ml: 100,
            target_delta_e: 2.0
          }
        });

        expect(result.success).toBe(true);
        expect(result.delta_e).toBeLessThan(2.1);

        accuracyResults.push(result.delta_e);

        // Check volume precision (0.1ml)
        result.paint_mixture.forEach(paint => {
          precisionResults.push({
            paint: paint.paint_name,
            volume: paint.volume_ml
          });
          expect(paint.volume_ml % 0.1).toBeCloseTo(0, 1);
        });
      }

      const avgAccuracy = accuracyResults.reduce((a, b) => a + b, 0) / accuracyResults.length;
      const maxAccuracy = Math.max(...accuracyResults);

      expect(avgAccuracy).toBeLessThan(1.5);
      expect(maxAccuracy).toBeLessThan(2.0);

      console.log(`Accuracy Regression - Avg: ${avgAccuracy.toFixed(2)}ΔE, Max: ${maxAccuracy.toFixed(2)}ΔE`);
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('Performance monitoring should not impact optimization performance', async () => {
      // Test without monitoring
      const startTimeWithoutMonitoring = performance.now();
      await deOptimizer.optimize({
        request_id: 'monitor-test-without',
        target_color: targetColors[0],
        available_paints: testPaints.map(paint => ({
          paint_id: paint.id,
          paint_name: paint.name,
          lab_color: { L: paint.lab_l, a: paint.lab_a, b: paint.lab_b },
          volume_ml: paint.volume_ml,
          ks_values: paint.ks_values || []
        })),
        constraints: {
          max_paints: 4,
          min_volume_ml: 0.1,
          max_volume_ml: 100,
          target_delta_e: 2.0
        }
      });
      const durationWithoutMonitoring = performance.now() - startTimeWithoutMonitoring;

      // Test with monitoring
      const startTimeWithMonitoring = performance.now();
      const monitoredResult = await integrationService.optimizeWithIntegration('test-user', {
        target_color: targetColors[0],
        available_paints: testPaints.map(paint => ({
          paint_id: paint.id,
          paint_name: paint.name,
          lab_color: { L: paint.lab_l, a: paint.lab_a, b: paint.lab_b },
          volume_ml: paint.volume_ml,
          ks_values: paint.ks_values || []
        })),
        constraints: {
          max_paints: 4,
          min_volume_ml: 0.1,
          max_volume_ml: 100,
          target_delta_e: 2.0
        },
        preferences: {
          algorithm: 'differential_evolution',
          optimization_level: 'enhanced'
        }
      });
      const durationWithMonitoring = performance.now() - startTimeWithMonitoring;

      // Monitoring overhead should be minimal (less than 10% increase)
      const overhead = (durationWithMonitoring - durationWithoutMonitoring) / durationWithoutMonitoring;
      expect(overhead).toBeLessThan(0.15); // Less than 15% overhead

      // Verify monitoring data is captured
      expect(monitoredResult.performanceMetrics).toBeDefined();
      expect(monitoredResult.performanceMetrics.calculation_time_ms).toBeGreaterThan(0);

      console.log(`Monitoring Overhead - Without: ${durationWithoutMonitoring.toFixed(1)}ms, With: ${durationWithMonitoring.toFixed(1)}ms, Overhead: ${(overhead * 100).toFixed(1)}%`);
    });
  });
});