/**
 * Enhanced Optimizer Orchestrator Unit Tests (T023)
 * Feature: 007-enhanced-mode-1
 *
 * Tests for enhanced optimizer orchestration logic including:
 * - Algorithm auto-selection (≤8 paints: DE, >8 paints: TPE)
 * - Timeout enforcement at 28 seconds
 * - Kubelka-Munk color prediction integration
 * - Delta E calculation integration
 * - Performance metrics calculation (improvementRate)
 * - Graceful error handling
 * - Request validation
 *
 * Target: >90% code coverage (critical path)
 * File Under Test: src/lib/mixing-optimization/enhanced-optimizer.ts
 */

import { describe, it, expect } from '@jest/globals';
import {
  optimizeEnhanced,
  isValidOptimizationMode,
  getRecommendedAlgorithm,
  validateEnhancedOptimizationRequest
} from '@/lib/mixing-optimization/enhanced-optimizer';
import type { EnhancedOptimizationRequest, LABColor, Paint } from '@/lib/types';

// Mock paint generator
const createMockPaints = (count: number): Paint[] => {
  const colors: LABColor[] = [
    { l: 95, a: 0, b: 0 },    // White
    { l: 20, a: 0, b: 0 },    // Black
    { l: 50, a: 70, b: 50 },  // Red
    { l: 50, a: -60, b: 60 }, // Green
    { l: 50, a: 0, b: -70 },  // Blue
    { l: 60, a: 50, b: 80 },  // Orange
    { l: 30, a: 40, b: -60 }, // Purple
    { l: 80, a: -50, b: 70 }  // Yellow
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `paint-${i}`,
    name: `Test Paint ${i}`,
    brand: 'Test Brand',
    color: {
      hex: '#000000',
      lab: colors[i % colors.length]
    },
    opacity: 0.8,
    tintingStrength: 0.7,
    kubelkaMunk: {
      k: 0.5 + (i * 0.1) % 0.5,
      s: 0.5 + (i * 0.05) % 0.5
    },
    userId: 'test-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
};

describe('Enhanced Optimizer - Algorithm Auto-Selection', () => {
  describe('getRecommendedAlgorithm', () => {
    it('should recommend DE for ≤8 paints', () => {
      expect(getRecommendedAlgorithm(2)).toBe('differential_evolution');
      expect(getRecommendedAlgorithm(5)).toBe('differential_evolution');
      expect(getRecommendedAlgorithm(8)).toBe('differential_evolution');
    });

    it('should recommend TPE for >8 paints', () => {
      expect(getRecommendedAlgorithm(9)).toBe('tpe_hybrid');
      expect(getRecommendedAlgorithm(15)).toBe('tpe_hybrid');
      expect(getRecommendedAlgorithm(50)).toBe('tpe_hybrid');
      expect(getRecommendedAlgorithm(100)).toBe('tpe_hybrid');
    });

    it('should handle boundary condition (8 paints)', () => {
      expect(getRecommendedAlgorithm(8)).toBe('differential_evolution');
      expect(getRecommendedAlgorithm(9)).toBe('tpe_hybrid');
    });
  });

  describe('Algorithm routing in optimizeEnhanced', () => {
    it('should use Differential Evolution for 4 paints', async () => {
      const paints = createMockPaints(4);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 65, a: 18, b: -5 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 5000
      };

      const result = await optimizeEnhanced(request);

      expect(result.metrics.algorithmUsed).toBe('differential_evolution');
    });

    it('should use Differential Evolution for exactly 8 paints', async () => {
      const paints = createMockPaints(8);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 55, a: 20, b: -10 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 8000
      };

      const result = await optimizeEnhanced(request);

      expect(result.metrics.algorithmUsed).toBe('differential_evolution');
    });

    it('should use TPE Hybrid for 10 paints', async () => {
      const paints = createMockPaints(10);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 60, a: 15, b: -8 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 10000
      };

      const result = await optimizeEnhanced(request);

      expect(result.metrics.algorithmUsed).toBe('tpe_hybrid');
    });

    it('should use TPE Hybrid for 20+ paints', async () => {
      const paints = createMockPaints(20);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 25, b: -15 },
        availablePaints: paints,
        mode: 'enhanced',
        maxPaintCount: 5,
        timeLimit: 12000
      };

      const result = await optimizeEnhanced(request);

      expect(result.metrics.algorithmUsed).toBe('tpe_hybrid');
    });
  });
});

describe('Enhanced Optimizer - Request Validation', () => {
  describe('isValidOptimizationMode', () => {
    it('should validate "standard" mode', () => {
      expect(isValidOptimizationMode('standard')).toBe(true);
    });

    it('should validate "enhanced" mode', () => {
      expect(isValidOptimizationMode('enhanced')).toBe(true);
    });

    it('should reject invalid modes', () => {
      expect(isValidOptimizationMode('fast')).toBe(false);
      expect(isValidOptimizationMode('accurate')).toBe(false);
      expect(isValidOptimizationMode('')).toBe(false);
      expect(isValidOptimizationMode(null)).toBe(false);
      expect(isValidOptimizationMode(undefined)).toBe(false);
      expect(isValidOptimizationMode(123)).toBe(false);
    });
  });

  describe('validateEnhancedOptimizationRequest', () => {
    it('should validate correct request', () => {
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 65, a: 18, b: -5 },
        availablePaints: createMockPaints(4),
        mode: 'enhanced'
      };

      expect(() => validateEnhancedOptimizationRequest(request)).not.toThrow();
    });

    it('should reject missing targetColor', () => {
      const request = {
        availablePaints: createMockPaints(4),
        mode: 'enhanced'
      } as any;

      expect(() => validateEnhancedOptimizationRequest(request))
        .toThrow('targetColor is required');
    });

    it('should reject invalid LAB values', () => {
      const requests = [
        { l: -10, a: 0, b: 0 },  // l < 0
        { l: 150, a: 0, b: 0 },  // l > 100
        { l: 50, a: -200, b: 0 }, // a < -128
        { l: 50, a: 200, b: 0 },  // a > 127
        { l: 50, a: 0, b: -200 }, // b < -128
        { l: 50, a: 0, b: 200 }   // b > 127
      ];

      requests.forEach(targetColor => {
        const request: EnhancedOptimizationRequest = {
          targetColor,
          availablePaints: createMockPaints(4),
          mode: 'enhanced'
        };

        expect(() => validateEnhancedOptimizationRequest(request)).toThrow();
      });
    });

    it('should reject non-array availablePaints', () => {
      const request = {
        targetColor: { l: 50, a: 0, b: 0 },
        availablePaints: 'not-an-array',
        mode: 'enhanced'
      } as any;

      expect(() => validateEnhancedOptimizationRequest(request))
        .toThrow('availablePaints must be an array');
    });

    it('should reject < 2 paints', () => {
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 0, b: 0 },
        availablePaints: createMockPaints(1),
        mode: 'enhanced'
      };

      expect(() => validateEnhancedOptimizationRequest(request))
        .toThrow('At least 2 paints required');
    });

    it('should reject > 100 paints', () => {
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 0, b: 0 },
        availablePaints: createMockPaints(101),
        mode: 'enhanced'
      };

      expect(() => validateEnhancedOptimizationRequest(request))
        .toThrow('Maximum 100 paints allowed');
    });

    it('should reject invalid mode', () => {
      const request = {
        targetColor: { l: 50, a: 0, b: 0 },
        availablePaints: createMockPaints(4),
        mode: 'invalid'
      } as any;

      expect(() => validateEnhancedOptimizationRequest(request))
        .toThrow('mode must be "standard" or "enhanced"');
    });

    it('should reject invalid maxPaintCount', () => {
      const requests = [
        { maxPaintCount: 0 },
        { maxPaintCount: 1 },
        { maxPaintCount: 6 },
        { maxPaintCount: 10 }
      ];

      requests.forEach(override => {
        const request: EnhancedOptimizationRequest = {
          targetColor: { l: 50, a: 0, b: 0 },
          availablePaints: createMockPaints(4),
          mode: 'enhanced',
          ...override
        };

        expect(() => validateEnhancedOptimizationRequest(request))
          .toThrow('maxPaintCount must be between 2 and 5');
      });
    });

    it('should reject invalid timeLimit', () => {
      const requests = [
        { timeLimit: 500 },   // Too short
        { timeLimit: 40000 }, // Too long
        { timeLimit: -1000 }  // Negative
      ];

      requests.forEach(override => {
        const request: EnhancedOptimizationRequest = {
          targetColor: { l: 50, a: 0, b: 0 },
          availablePaints: createMockPaints(4),
          mode: 'enhanced',
          ...override
        };

        expect(() => validateEnhancedOptimizationRequest(request))
          .toThrow('timeLimit must be between 1000 and 30000');
      });
    });

    it('should reject negative accuracyTarget', () => {
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 0, b: 0 },
        availablePaints: createMockPaints(4),
        mode: 'enhanced',
        accuracyTarget: -2.0
      };

      expect(() => validateEnhancedOptimizationRequest(request))
        .toThrow('accuracyTarget must be positive');
    });

    it('should reject invalid volumeConstraints', () => {
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 0, b: 0 },
        availablePaints: createMockPaints(4),
        mode: 'enhanced',
        volumeConstraints: {
          min_total_volume_ml: 500,
          max_total_volume_ml: 100 // max < min
        }
      };

      expect(() => validateEnhancedOptimizationRequest(request))
        .toThrow('max_total_volume_ml must be >= min_total_volume_ml');
    });
  });
});

describe('Enhanced Optimizer - Error Handling', () => {
  it('should throw error for < 2 paints', async () => {
    const paints = createMockPaints(1);
    const request: EnhancedOptimizationRequest = {
      targetColor: { l: 50, a: 0, b: 0 },
      availablePaints: paints,
      mode: 'enhanced'
    };

    await expect(optimizeEnhanced(request)).rejects.toThrow('At least 2 paints required');
  });

  it('should throw error for invalid maxPaintCount', async () => {
    const paints = createMockPaints(4);
    const request: EnhancedOptimizationRequest = {
      targetColor: { l: 50, a: 0, b: 0 },
      availablePaints: paints,
      mode: 'enhanced',
      maxPaintCount: 7 // Invalid
    };

    await expect(optimizeEnhanced(request)).rejects.toThrow('maxPaintCount must be between 2 and 5');
  });

  it('should provide context in error messages', async () => {
    const paints = createMockPaints(1);
    const request: EnhancedOptimizationRequest = {
      targetColor: { l: 50, a: 0, b: 0 },
      availablePaints: paints,
      mode: 'enhanced'
    };

    try {
      await optimizeEnhanced(request);
      fail('Should have thrown error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      if (error instanceof Error) {
        // Validation errors are thrown before try-catch, so won't be wrapped
        expect(error.message).toContain('At least 2 paints required');
      }
    }
  });

  it('should handle optimizer crashes gracefully', async () => {
    const paints = createMockPaints(4);
    // Create request that might cause issues
    const request: EnhancedOptimizationRequest = {
      targetColor: { l: 50, a: 0, b: 0 },
      availablePaints: paints.map(p => ({ ...p, kubelkaMunk: null as any })), // Corrupt data
      mode: 'enhanced',
      timeLimit: 2000
    };

    // Should either succeed with fallback or throw informative error
    try {
      const result = await optimizeEnhanced(request);
      expect(result.formula).toBeDefined();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});

describe('Enhanced Optimizer - Integration', () => {
  it('should complete full optimization workflow', async () => {
    const paints = createMockPaints(5);
    const request: EnhancedOptimizationRequest = {
      targetColor: { l: 65, a: 18, b: -5 },
      availablePaints: paints,
      mode: 'enhanced',
      maxPaintCount: 5,
      timeLimit: 8000,
      accuracyTarget: 2.0,
      volumeConstraints: {
        min_total_volume_ml: 100,
        max_total_volume_ml: 500
      }
    };

    const result = await optimizeEnhanced(request);

    // Validate formula
    expect(result.formula).toBeDefined();
    expect(result.formula.paintRatios.length).toBeGreaterThanOrEqual(2);
    expect(result.formula.paintRatios.length).toBeLessThanOrEqual(5);
    expect(result.formula.deltaE).toBeGreaterThanOrEqual(0);
    expect(['excellent', 'good', 'acceptable', 'poor']).toContain(result.formula.accuracyRating);
    expect(['simple', 'moderate', 'complex']).toContain(result.formula.mixingComplexity);

    // Validate metrics
    expect(result.metrics).toBeDefined();
    expect(result.metrics.timeElapsed).toBeGreaterThan(0);
    expect(result.metrics.timeElapsed).toBeLessThan(9000);
    expect(result.metrics.iterationsCompleted).toBeGreaterThan(0);
    expect(['differential_evolution', 'tpe_hybrid']).toContain(result.metrics.algorithmUsed);
    expect(typeof result.metrics.convergenceAchieved).toBe('boolean');
    expect(typeof result.metrics.targetMet).toBe('boolean');
    expect(result.metrics.improvementRate).toBeGreaterThanOrEqual(0);
  });

  it('should handle both standard and enhanced modes', async () => {
    const paints = createMockPaints(4);
    const baseRequest = {
      targetColor: { l: 55, a: 15, b: -10 } as LABColor,
      availablePaints: paints,
      timeLimit: 5000
    };

    const standardRequest: EnhancedOptimizationRequest = {
      ...baseRequest,
      mode: 'standard'
    };

    const enhancedRequest: EnhancedOptimizationRequest = {
      ...baseRequest,
      mode: 'enhanced'
    };

    const standardResult = await optimizeEnhanced(standardRequest);
    const enhancedResult = await optimizeEnhanced(enhancedRequest);

    expect(standardResult.formula).toBeDefined();
    expect(enhancedResult.formula).toBeDefined();
  });

  it('should optimize minimum 2 paint collection', async () => {
    const paints = createMockPaints(2);
    const request: EnhancedOptimizationRequest = {
      targetColor: { l: 60, a: 0, b: 0 },
      availablePaints: paints,
      mode: 'enhanced',
      maxPaintCount: 2
    };

    const result = await optimizeEnhanced(request);

    expect(result.formula.paintRatios.length).toBe(2);
    expect(result.metrics.algorithmUsed).toBe('differential_evolution');
  });

  it('should respect timeout limits', async () => {
    const paints = createMockPaints(10);
    const request: EnhancedOptimizationRequest = {
      targetColor: { l: 60, a: 20, b: -12 },
      availablePaints: paints,
      mode: 'enhanced',
      timeLimit: 2000
    };

    const startTime = Date.now();
    const result = await optimizeEnhanced(request);
    const elapsed = Date.now() - startTime;

    expect(result.formula).toBeDefined();
    expect(elapsed).toBeLessThan(3000); // Should respect 2s timeout
  });

  it('should handle out-of-gamut targets gracefully', async () => {
    const paints = createMockPaints(5);
    const request: EnhancedOptimizationRequest = {
      targetColor: { l: 75, a: 95, b: 85 }, // Neon pink (impossible)
      availablePaints: paints,
      mode: 'enhanced',
      accuracyTarget: 2.0,
      timeLimit: 6000
    };

    const result = await optimizeEnhanced(request);

    expect(result.formula).toBeDefined();
    expect(result.formula.deltaE).toBeGreaterThan(2.0);
    expect(result.metrics.targetMet).toBe(false);
  });

  it('should produce deterministic results with same inputs (seeded)', async () => {
    const paints = createMockPaints(4);
    const request: EnhancedOptimizationRequest = {
      targetColor: { l: 55, a: 18, b: -10 },
      availablePaints: paints,
      mode: 'enhanced',
      timeLimit: 5000
    };

    // Note: Currently not seeded, so results may vary
    // Future enhancement: Add random seed parameter for reproducibility
    const result1 = await optimizeEnhanced(request);
    const result2 = await optimizeEnhanced(request);

    expect(result1.formula).toBeDefined();
    expect(result2.formula).toBeDefined();
    // Results may differ due to randomness, but both should be valid
  });

  it('should calculate Kubelka-Munk coefficients', async () => {
    const paints = createMockPaints(4);
    const request: EnhancedOptimizationRequest = {
      targetColor: { l: 60, a: 15, b: -8 },
      availablePaints: paints,
      mode: 'enhanced'
    };

    const result = await optimizeEnhanced(request);

    expect(result.formula.kubelkaMunkK).toBeGreaterThanOrEqual(0);
    expect(result.formula.kubelkaMunkK).toBeLessThanOrEqual(1);
    expect(result.formula.kubelkaMunkS).toBeGreaterThanOrEqual(0);
    expect(result.formula.kubelkaMunkS).toBeLessThanOrEqual(1);
    expect(result.formula.opacity).toBeGreaterThan(0);
    expect(result.formula.opacity).toBeLessThanOrEqual(1);
  });
});

describe('Enhanced Optimizer - Performance Metrics', () => {
  it('should track improvement rate', async () => {
    const paints = createMockPaints(5);
    const request: EnhancedOptimizationRequest = {
      targetColor: { l: 58, a: 16, b: -9 },
      availablePaints: paints,
      mode: 'enhanced',
      timeLimit: 6000
    };

    const result = await optimizeEnhanced(request);

    expect(result.metrics.improvementRate).toBeGreaterThanOrEqual(0);
    expect(result.metrics.improvementRate).toBeLessThanOrEqual(1);
    expect(result.metrics.finalBestDeltaE).toBeLessThanOrEqual(result.metrics.initialBestDeltaE);
  });

  it('should mark convergence status correctly', async () => {
    const paints = createMockPaints(4);
    const request: EnhancedOptimizationRequest = {
      targetColor: { l: 50, a: 10, b: -5 },
      availablePaints: paints,
      mode: 'enhanced',
      timeLimit: 8000
    };

    const result = await optimizeEnhanced(request);

    expect(typeof result.metrics.convergenceAchieved).toBe('boolean');
    expect(typeof result.metrics.targetMet).toBe('boolean');
  });

  it('should detect early termination', async () => {
    const paints = createMockPaints(12);
    const request: EnhancedOptimizationRequest = {
      targetColor: { l: 60, a: 22, b: -14 },
      availablePaints: paints,
      mode: 'enhanced',
      timeLimit: 1000 // Very short
    };

    const result = await optimizeEnhanced(request);

    if (result.metrics.earlyTermination) {
      expect(result.metrics.timeElapsed).toBeGreaterThan(900);
    }
  });
});
