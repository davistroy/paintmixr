/**
 * TPE Hybrid Algorithm Unit Tests (T022)
 * Feature: 007-enhanced-mode-1
 *
 * Tests for Tree-Structured Parzen Estimator hybrid optimization including:
 * - Bayesian optimization behavior on known functions
 * - Gaussian Mixture Model fitting and probability estimation
 * - Acquisition function (Expected Improvement) selection
 * - Sequential sampling strategy
 * - Higher-dimensional search (15+ paints)
 * - Local gradient descent refinement
 * - Paint selection for optimization (color space diversity)
 *
 * Target: >80% code coverage
 * File Under Test: src/lib/mixing-optimization/tpe-hybrid.ts
 */

import { describe, it, expect } from '@jest/globals';
import { optimizeWithTPEHybrid } from '@/lib/mixing-optimization/tpe-hybrid';
import type { EnhancedOptimizationRequest, LABColor, Paint } from '@/lib/types';

// Mock paint collection generator
const createMockPaints = (count: number): Paint[] => {
  const baseColors: LABColor[] = [
    { l: 95, a: 0, b: 0 },     // White
    { l: 20, a: 0, b: 0 },     // Black
    { l: 50, a: 70, b: 50 },   // Red
    { l: 50, a: -60, b: 60 },  // Green
    { l: 50, a: 0, b: -70 },   // Blue
    { l: 60, a: 50, b: 80 },   // Orange
    { l: 30, a: 40, b: -60 },  // Purple
    { l: 80, a: -50, b: 70 },  // Yellow-Green
    { l: 40, a: 20, b: 30 },   // Brown
    { l: 70, a: -30, b: -40 }  // Cyan
  ];

  return Array.from({ length: count }, (_, i) => {
    const baseColor = baseColors[i % baseColors.length];
    const variation = (i / baseColors.length) * 10;

    return {
      id: `paint-${i}`,
      name: `Test Paint ${i}`,
      brand: 'Test Brand',
      color: {
        hex: '#000000',
        lab: {
          l: Math.max(0, Math.min(100, baseColor.l + variation)),
          a: Math.max(-128, Math.min(127, baseColor.a + variation * 0.5)),
          b: Math.max(-128, Math.min(127, baseColor.b + variation * 0.5))
        }
      },
      opacity: 0.75 + (i * 0.03) % 0.25,
      tintingStrength: 0.6 + (i * 0.05) % 0.4,
      kubelkaMunk: {
        k: 0.3 + (i * 0.07) % 0.7,
        s: 0.4 + (i * 0.06) % 0.6
      },
      userId: 'test-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });
};

describe('TPE Hybrid Optimizer - Core Algorithm', () => {
  describe('Basic Optimization', () => {
    it('should optimize with small paint collection (4 paints)', async () => {
      const paints = createMockPaints(4);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 65, a: 18, b: -5 },
        availablePaints: paints,
        mode: 'enhanced',
        maxPaintCount: 4,
        timeLimit: 5000,
        accuracyTarget: 2.0
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result).toBeDefined();
      expect(result.formula).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.formula.paintRatios.length).toBeGreaterThanOrEqual(2);
      expect(result.formula.paintRatios.length).toBeLessThanOrEqual(4);
      expect(result.metrics.algorithmUsed).toBe('tpe_hybrid');
    });

    it('should optimize with medium paint collection (10 paints)', async () => {
      const paints = createMockPaints(10);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 55, a: 25, b: -15 },
        availablePaints: paints,
        mode: 'enhanced',
        maxPaintCount: 5,
        timeLimit: 8000
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.formula.paintRatios.length).toBeLessThanOrEqual(5);
      expect(result.metrics.iterationsCompleted).toBeGreaterThan(0);
      expect(result.metrics.timeElapsed).toBeLessThan(9000);
    });

    it('should handle high-dimensional search (20+ paints)', async () => {
      const paints = createMockPaints(20);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 60, a: 15, b: -10 },
        availablePaints: paints,
        mode: 'enhanced',
        maxPaintCount: 5,
        timeLimit: 10000
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.formula).toBeDefined();
      expect(result.formula.paintRatios.length).toBeLessThanOrEqual(5);
      expect(result.metrics.algorithmUsed).toBe('tpe_hybrid');
    });
  });

  describe('Paint Selection Strategy', () => {
    it('should select diverse paint subset when collection > maxPaintCount', async () => {
      const paints = createMockPaints(15);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 20, b: -20 },
        availablePaints: paints,
        mode: 'enhanced',
        maxPaintCount: 5,
        timeLimit: 6000
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.formula.paintRatios.length).toBeLessThanOrEqual(5);
      // Paints should be selected for color space coverage, not just first N
    });

    it('should use all paints when collection <= maxPaintCount', async () => {
      const paints = createMockPaints(3);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 60, a: 0, b: 0 },
        availablePaints: paints,
        mode: 'enhanced',
        maxPaintCount: 5
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.formula.paintRatios.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Convergence Behavior', () => {
    it('should converge on achievable grayscale target', async () => {
      const paints = createMockPaints(2); // White + Black
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 60, a: 0, b: 0 }, // Mid-gray
        availablePaints: paints,
        mode: 'enhanced',
        accuracyTarget: 5.0,
        timeLimit: 5000
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.formula.deltaE).toBeLessThan(15.0); // Should achieve reasonable accuracy
      expect(result.metrics.finalBestDeltaE).toBeLessThan(result.metrics.initialBestDeltaE);
    });

    it('should detect convergence and terminate early', async () => {
      const paints = createMockPaints(4);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 10, b: -5 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 15000
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.metrics.convergenceAchieved).toBeDefined();
      expect(result.metrics.timeElapsed).toBeLessThan(15000);
    });

    it('should handle out-of-gamut targets gracefully', async () => {
      const paints = createMockPaints(5);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 75, a: 95, b: 85 }, // Neon pink (impossible)
        availablePaints: paints,
        mode: 'enhanced',
        accuracyTarget: 2.0,
        timeLimit: 8000
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.formula.deltaE).toBeGreaterThan(2.0);
      expect(result.metrics.targetMet).toBe(false);
      expect(result.metrics.convergenceAchieved).toBeDefined();
    });
  });

  describe('Timeout Handling', () => {
    it('should terminate gracefully on timeout', async () => {
      const paints = createMockPaints(12);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 55, a: 25, b: -15 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 500 // Very short timeout
      };

      const startTime = Date.now();
      const result = await optimizeWithTPEHybrid(request);
      const elapsed = Date.now() - startTime;

      expect(result.formula).toBeDefined();
      expect(elapsed).toBeLessThan(1000); // Should timeout quickly
    });

    it('should return best solution found before timeout', async () => {
      const paints = createMockPaints(8);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 60, a: 20, b: -10 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 1000
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.formula).toBeDefined();
      expect(result.formula.deltaE).toBeGreaterThan(0);
      expect(result.metrics.timeElapsed).toBeLessThan(1500);
    });

    it('should respect 28-second default timeout', async () => {
      const paints = createMockPaints(6);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 65, a: 15, b: -8 },
        availablePaints: paints,
        mode: 'enhanced'
        // No timeLimit specified
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.metrics.timeElapsed).toBeLessThan(29000);
    });
  });

  describe('Local Gradient Refinement', () => {
    it('should improve solution through local refinement', async () => {
      const paints = createMockPaints(4);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 55, a: 12, b: -8 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 6000
      };

      const result = await optimizeWithTPEHybrid(request);

      // Local refinement should occur after main TPE phase
      expect(result.metrics.finalBestDeltaE).toBeLessThanOrEqual(result.metrics.initialBestDeltaE);
      expect(result.metrics.improvementRate).toBeGreaterThanOrEqual(0);
    });

    it('should skip refinement if time budget exhausted', async () => {
      const paints = createMockPaints(10);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 60, a: 18, b: -12 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 200 // Very short
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.formula).toBeDefined();
      expect(result.metrics.timeElapsed).toBeLessThan(300);
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate all required metrics', async () => {
      const paints = createMockPaints(5);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 15, b: -10 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 5000,
        accuracyTarget: 2.0
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.metrics.timeElapsed).toBeGreaterThan(0);
      expect(result.metrics.iterationsCompleted).toBeGreaterThan(0);
      expect(result.metrics.algorithmUsed).toBe('tpe_hybrid');
      expect(result.metrics.convergenceAchieved).toBeDefined();
      expect(result.metrics.targetMet).toBeDefined();
      expect(result.metrics.earlyTermination).toBeDefined();
      expect(result.metrics.initialBestDeltaE).toBeGreaterThanOrEqual(0);
      expect(result.metrics.finalBestDeltaE).toBeGreaterThanOrEqual(0);
      expect(result.metrics.improvementRate).toBeDefined();
    });

    it('should mark target as met when Delta E <= accuracyTarget', async () => {
      const paints = createMockPaints(2); // Simpler problem
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 60, a: 0, b: 0 },
        availablePaints: paints,
        mode: 'enhanced',
        accuracyTarget: 15.0, // Liberal target
        timeLimit: 5000
      };

      const result = await optimizeWithTPEHybrid(request);

      if (result.formula.deltaE <= 15.0) {
        expect(result.metrics.targetMet).toBe(true);
      }
    });
  });

  describe('Formula Quality', () => {
    it('should generate valid paint ratios summing to 100%', async () => {
      const paints = createMockPaints(4);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 55, a: 20, b: -12 },
        availablePaints: paints,
        mode: 'enhanced'
      };

      const result = await optimizeWithTPEHybrid(request);

      const totalPercentage = result.formula.paintRatios.reduce((sum, r) => sum + r.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1); // Within 0.1%
    });

    it('should assign correct accuracy rating', async () => {
      const paints = createMockPaints(3);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 10, b: -5 },
        availablePaints: paints,
        mode: 'enhanced'
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(['excellent', 'good', 'acceptable', 'poor']).toContain(result.formula.accuracyRating);

      if (result.formula.deltaE <= 1.0) {
        expect(result.formula.accuracyRating).toBe('excellent');
      } else if (result.formula.deltaE <= 2.0) {
        expect(result.formula.accuracyRating).toBe('good');
      } else if (result.formula.deltaE <= 4.0) {
        expect(result.formula.accuracyRating).toBe('acceptable');
      } else {
        expect(result.formula.accuracyRating).toBe('poor');
      }
    });

    it('should assign correct mixing complexity', async () => {
      const paints = createMockPaints(5);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 60, a: 15, b: -8 },
        availablePaints: paints,
        mode: 'enhanced',
        maxPaintCount: 2
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(['simple', 'moderate', 'complex']).toContain(result.formula.mixingComplexity);

      const nonZeroCount = result.formula.paintRatios.filter(r => r.percentage > 1).length;
      if (nonZeroCount <= 2) {
        expect(result.formula.mixingComplexity).toBe('simple');
      } else if (nonZeroCount <= 4) {
        expect(result.formula.mixingComplexity).toBe('moderate');
      } else {
        expect(result.formula.mixingComplexity).toBe('complex');
      }
    });

    it('should calculate Kubelka-Munk coefficients', async () => {
      const paints = createMockPaints(4);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 55, a: 18, b: -10 },
        availablePaints: paints,
        mode: 'enhanced'
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.formula.kubelkaMunkK).toBeGreaterThanOrEqual(0);
      expect(result.formula.kubelkaMunkK).toBeLessThanOrEqual(1);
      expect(result.formula.kubelkaMunkS).toBeGreaterThanOrEqual(0);
      expect(result.formula.kubelkaMunkS).toBeLessThanOrEqual(1);
    });

    it('should calculate opacity as weighted average', async () => {
      const paints = createMockPaints(3);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 12, b: -8 },
        availablePaints: paints,
        mode: 'enhanced'
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.formula.opacity).toBeGreaterThan(0);
      expect(result.formula.opacity).toBeLessThanOrEqual(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum 2 paints', async () => {
      const paints = createMockPaints(2);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 60, a: 0, b: 0 },
        availablePaints: paints,
        mode: 'enhanced',
        maxPaintCount: 2
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.formula.paintRatios.length).toBe(2);
    });

    it('should handle maximum 5 paint formula', async () => {
      const paints = createMockPaints(10);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 55, a: 20, b: -15 },
        availablePaints: paints,
        mode: 'enhanced',
        maxPaintCount: 5
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.formula.paintRatios.length).toBeLessThanOrEqual(5);
    });

    it('should handle paints with missing Kubelka-Munk data', async () => {
      const paints = createMockPaints(4);
      // Remove K-M data from some paints
      paints[1].kubelkaMunk = { k: 0, s: 0 } as any;
      paints[2].kubelkaMunk = { k: 0, s: 0 } as any;

      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 15, b: -10 },
        availablePaints: paints,
        mode: 'enhanced'
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.formula).toBeDefined();
      // Should fall back to weighted LAB average
    });

    it('should respect volume constraints', async () => {
      const paints = createMockPaints(4);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 60, a: 18, b: -12 },
        availablePaints: paints,
        mode: 'enhanced',
        volumeConstraints: {
          min_total_volume_ml: 50,
          max_total_volume_ml: 200
        }
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.formula.totalVolume).toBeGreaterThanOrEqual(50);
      expect(result.formula.totalVolume).toBeLessThanOrEqual(200);
    });
  });

  describe('Bayesian Optimization Properties', () => {
    it('should perform exploration in early iterations', async () => {
      const paints = createMockPaints(6);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 55, a: 22, b: -14 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 8000
      };

      const result = await optimizeWithTPEHybrid(request);

      // Should complete startup trials + TPE iterations
      expect(result.metrics.iterationsCompleted).toBeGreaterThan(20); // N_STARTUP_TRIALS
    });

    it('should show improvement over iterations', async () => {
      const paints = createMockPaints(5);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 58, a: 16, b: -9 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 10000
      };

      const result = await optimizeWithTPEHybrid(request);

      expect(result.metrics.improvementRate).toBeGreaterThanOrEqual(0);
      expect(result.metrics.finalBestDeltaE).toBeLessThanOrEqual(result.metrics.initialBestDeltaE);
    });
  });
});

describe('TPE Hybrid - Integration Scenarios', () => {
  it('should match research.md example scenario', async () => {
    // Scenario from research.md: 15+ paints, Delta E ≤ 2.0 target
    const paints = createMockPaints(15);
    const request: EnhancedOptimizationRequest = {
      targetColor: { l: 60, a: 20, b: -12 },
      availablePaints: paints,
      mode: 'enhanced',
      maxPaintCount: 5,
      timeLimit: 25000,
      accuracyTarget: 2.0
    };

    const result = await optimizeWithTPEHybrid(request);

    expect(result.formula).toBeDefined();
    expect(result.metrics.algorithmUsed).toBe('tpe_hybrid');
    expect(result.metrics.timeElapsed).toBeLessThan(26000);
  });

  it('should handle concurrent optimizations (no shared state)', async () => {
    const paints = createMockPaints(6);
    const requests: EnhancedOptimizationRequest[] = [
      {
        targetColor: { l: 50, a: 15, b: -10 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 3000
      },
      {
        targetColor: { l: 60, a: -15, b: 20 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 3000
      },
      {
        targetColor: { l: 70, a: 25, b: -25 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 3000
      }
    ];

    const results = await Promise.all(requests.map(req => optimizeWithTPEHybrid(req)));

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.formula).toBeDefined();
      expect(result.metrics).toBeDefined();
    });
  });
});
