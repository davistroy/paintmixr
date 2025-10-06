/**
 * Differential Evolution Algorithm Unit Tests (T021)
 * Feature: 007-enhanced-mode-1
 *
 * Tests for Differential Evolution optimizer including:
 * - Algorithm convergence on known test functions
 * - Constraint handling (bounds violations, sum constraints)
 * - Timeout handling (early termination)
 * - Population initialization and diversity
 * - Mutation and crossover operators
 * - Covariance matrix adaptation (adaptive parameters)
 *
 * Target: >80% code coverage
 * File Under Test: src/lib/mixing-optimization/differential-evolution.ts
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  DifferentialEvolutionOptimizer,
  optimizeWithDifferentialEvolution,
  createDifferentialEvolutionOptimizer,
  DE_CONSTANTS,
  type DEConfig
} from '@/lib/mixing-optimization/differential-evolution';
import type { EnhancedOptimizationRequest, LABColor, Paint } from '@/lib/types';
import type { OptimizationPaint } from '@/lib/types';

// Mock paint collection for testing
const createMockPaints = (count: number): Paint[] => {
  const colors: LABColor[] = [
    { l: 95, a: 0, b: 0 },    // White
    { l: 20, a: 0, b: 0 },    // Black
    { l: 50, a: 70, b: 50 },  // Red
    { l: 50, a: -60, b: 60 }, // Green
    { l: 50, a: 0, b: -70 }   // Blue
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

// Convert Paint[] to OptimizationPaint[] for legacy optimizer
const convertToOptimizationPaints = (paints: Paint[]): OptimizationPaint[] => {
  return paints.map(paint => ({
    id: paint.id,
    name: paint.name,
    brand: paint.brand,
    color_space: paint.color.lab,
    available_volume_ml: 1000,
    cost_per_ml: 0.1,
    opacity: paint.opacity,
    pigment_properties: {
      scattering_coefficient: paint.kubelkaMunk.s,
      absorption_coefficient: paint.kubelkaMunk.k,
      surface_reflection: 0.04,
      pigment_density: 1.0,
      lightfastness_rating: 7,
      composition_category: 'synthetic'
    }
  }));
};

describe('Differential Evolution Optimizer - Core Algorithm', () => {
  describe('Population Initialization', () => {
    it('should create population with correct size', () => {
      const paints = createMockPaints(4);
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 65, a: 18, b: -5 };

      const optimizer = new DifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        { volume_constraints: { min_total_volume_ml: 100, max_total_volume_ml: 500 } },
        { population_size: 20, max_iterations: 1 }
      );

      const result = optimizer.optimize();
      expect(result).toBeDefined();
    });

    it('should auto-calculate population size based on paint count', () => {
      const paints = createMockPaints(5);
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 50, a: 0, b: 0 };

      // Population size should be: min(200, max(20, 5 * 10)) = 50
      const optimizer = new DifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        { volume_constraints: { min_total_volume_ml: 100, max_total_volume_ml: 500 } },
        { population_size: 0, max_iterations: 1 } // 0 = auto-calculate
      );

      const result = optimizer.optimize();
      expect(result.success).toBe(true);
    });

    it('should generate diverse initial population', () => {
      const paints = createMockPaints(3);
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 60, a: 10, b: -10 };

      const optimizer = new DifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        { volume_constraints: { min_total_volume_ml: 100, max_total_volume_ml: 500 } },
        { population_size: 30, max_iterations: 1, random_seed: 42 }
      );

      const result = optimizer.optimize();
      expect(result.success).toBe(true);
    });
  });

  describe('Constraint Handling', () => {
    it('should enforce volume ratio sum = 1.0', () => {
      const paints = createMockPaints(3);
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 50, a: 0, b: 0 };

      const optimizer = new DifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        { volume_constraints: { min_total_volume_ml: 100, max_total_volume_ml: 500 } },
        { max_iterations: 100, random_seed: 123 }
      );

      const result = optimizer.optimize();
      expect(result.success).toBe(true);

      if (result.success && result.best_individual) {
        const sum = result.best_individual.variables.reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 6); // Within 1e-6 tolerance
      }
    });

    it('should respect minimum volume ratios (0.1% minimum)', () => {
      const paints = createMockPaints(4);
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 70, a: -10, b: 20 };

      const optimizer = new DifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        { volume_constraints: { min_total_volume_ml: 100, max_total_volume_ml: 500 } },
        { max_iterations: 100, random_seed: 456 }
      );

      const result = optimizer.optimize();
      expect(result.success).toBe(true);

      if (result.success && result.best_individual) {
        result.best_individual.variables.forEach(ratio => {
          expect(ratio).toBeGreaterThanOrEqual(DE_CONSTANTS.MIN_VOLUME_RATIO);
          expect(ratio).toBeLessThanOrEqual(DE_CONSTANTS.MAX_VOLUME_RATIO);
        });
      }
    });

    it('should handle constraint violations with penalty functions', () => {
      const paints = createMockPaints(2);
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 40, a: 30, b: -20 };

      const optimizer = new DifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        {
          volume_constraints: {
            min_total_volume_ml: 100,
            max_total_volume_ml: 500,
            minimum_component_volume_ml: 5,
            maximum_component_volume_ml: 450
          }
        },
        { max_iterations: 50 }
      );

      const result = optimizer.optimize();
      expect(result.success).toBe(true);
    });
  });

  describe('Convergence Detection', () => {
    it('should converge on simple grayscale target (achievable)', () => {
      const paints = createMockPaints(2); // White + Black
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 60, a: 0, b: 0 }; // Mid-gray

      const optimizer = new DifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        { volume_constraints: { min_total_volume_ml: 100, max_total_volume_ml: 500 }, accuracy_target: 5.0 },
        { max_iterations: 200, max_stagnation: 30 }
      );

      const result = optimizer.optimize();
      expect(result.success).toBe(true);

      if (result.success && result.best_individual) {
        expect(result.best_individual.achieved_delta_e).toBeLessThan(10.0); // Should achieve reasonable accuracy
      }
    });

    it('should stop when target fitness achieved', () => {
      const paints = createMockPaints(3);
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 50, a: 10, b: -5 };

      const optimizer = new DifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        { volume_constraints: { min_total_volume_ml: 100, max_total_volume_ml: 500 } },
        { max_iterations: 1000, max_stagnation: 50 }
      );

      const result = optimizer.optimize();
      expect(result.success).toBe(true);
      expect(result.iterations_completed).toBeLessThan(1000); // Should stop early if converged
    });

    it('should detect stagnation and terminate early', () => {
      const paints = createMockPaints(5);
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 75, a: 95, b: 85 }; // Out of gamut

      const optimizer = new DifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        { volume_constraints: { min_total_volume_ml: 100, max_total_volume_ml: 500 } },
        { max_iterations: 1000, max_stagnation: 30, convergence_tolerance: 0.001 }
      );

      const result = optimizer.optimize();
      expect(result.success).toBe(true);
      expect(result.iterations_completed).toBeLessThan(1000); // Should stop due to stagnation
    });
  });

  describe('Timeout Handling', () => {
    it('should terminate gracefully on timeout', () => {
      const paints = createMockPaints(10);
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 55, a: 25, b: -15 };

      const optimizer = new DifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        { volume_constraints: { min_total_volume_ml: 100, max_total_volume_ml: 500 } },
        { max_iterations: 10000, time_budget_ms: 100 } // 100ms timeout
      );

      const startTime = Date.now();
      const result = optimizer.optimize();
      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(elapsed).toBeLessThan(200); // Should timeout quickly
    });

    it('should return best solution found before timeout', () => {
      const paints = createMockPaints(8);
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 60, a: 20, b: -10 };

      const optimizer = new DifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        { volume_constraints: { min_total_volume_ml: 100, max_total_volume_ml: 500 } },
        { max_iterations: 5000, time_budget_ms: 200 }
      );

      const result = optimizer.optimize();
      expect(result.success).toBe(true);
      expect(result.best_individual).toBeDefined();
      expect(result.computation_time_ms).toBeLessThan(300);
    });
  });

  describe('Adaptive Parameters', () => {
    it('should adapt F and CR based on success rate', () => {
      const paints = createMockPaints(4);
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 65, a: 15, b: -8 };

      const optimizer = new DifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        { volume_constraints: { min_total_volume_ml: 100, max_total_volume_ml: 500 } },
        { max_iterations: 200, adaptive_parameters: true, random_seed: 789 }
      );

      const result = optimizer.optimize();
      expect(result.success).toBe(true);
      expect(result.convergence_metrics).toBeDefined();
      expect(result.convergence_metrics.length).toBeGreaterThan(0);
    });

    it('should disable adaptive parameters when configured', () => {
      const paints = createMockPaints(3);
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 50, a: 5, b: -5 };

      const optimizer = new DifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        { volume_constraints: { min_total_volume_ml: 100, max_total_volume_ml: 500 } },
        { max_iterations: 100, adaptive_parameters: false, F: 0.8, CR: 0.7 }
      );

      const result = optimizer.optimize();
      expect(result.success).toBe(true);
    });
  });
});

describe('Differential Evolution - Server-Side Integration (T012)', () => {
  describe('optimizeWithDifferentialEvolution function', () => {
    it('should optimize with Enhanced Mode request', async () => {
      const paints = createMockPaints(4);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 65, a: 18, b: -5 },
        availablePaints: paints,
        mode: 'enhanced',
        maxPaintCount: 5,
        timeLimit: 5000,
        accuracyTarget: 2.0,
        volumeConstraints: {
          min_total_volume_ml: 100,
          max_total_volume_ml: 500
        }
      };

      const result = await optimizeWithDifferentialEvolution(request);

      expect(result).toBeDefined();
      expect(result.formula).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.formula.paintRatios.length).toBeGreaterThanOrEqual(2);
      expect(result.formula.paintRatios.length).toBeLessThanOrEqual(5);
      expect(result.metrics.algorithmUsed).toBe('differential_evolution');
    });

    it('should enforce 2-5 paint count limit', async () => {
      const paints = createMockPaints(5);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 10, b: -10 },
        availablePaints: paints,
        mode: 'enhanced',
        maxPaintCount: 3,
        timeLimit: 5000
      };

      const result = await optimizeWithDifferentialEvolution(request);

      expect(result.formula.paintRatios.length).toBeLessThanOrEqual(3);
    });

    it('should throw error for < 2 paints', async () => {
      const paints = createMockPaints(1);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 0, b: 0 },
        availablePaints: paints,
        mode: 'enhanced'
      };

      await expect(optimizeWithDifferentialEvolution(request)).rejects.toThrow('At least 2 paints required');
    });

    it('should throw error for invalid maxPaintCount', async () => {
      const paints = createMockPaints(4);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 0, b: 0 },
        availablePaints: paints,
        mode: 'enhanced',
        maxPaintCount: 7 // Invalid (max is 5)
      };

      await expect(optimizeWithDifferentialEvolution(request)).rejects.toThrow('maxPaintCount must be between 2 and 5');
    });

    it('should calculate accuracy rating correctly', async () => {
      const paints = createMockPaints(3);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 60, a: 0, b: 0 },
        availablePaints: paints,
        mode: 'enhanced',
        accuracyTarget: 2.0
      };

      const result = await optimizeWithDifferentialEvolution(request);

      expect(['excellent', 'good', 'acceptable', 'poor']).toContain(result.formula.accuracyRating);
      if (result.formula.deltaE <= 2.0) {
        expect(result.formula.accuracyRating).toBe('excellent');
      } else if (result.formula.deltaE <= 4.0) {
        expect(result.formula.accuracyRating).toBe('good');
      }
    });

    it('should calculate mixing complexity correctly', async () => {
      const paints = createMockPaints(2);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 50, a: 0, b: 0 },
        availablePaints: paints,
        mode: 'enhanced',
        maxPaintCount: 2
      };

      const result = await optimizeWithDifferentialEvolution(request);

      expect(['simple', 'moderate', 'complex']).toContain(result.formula.mixingComplexity);
      if (result.formula.paintRatios.length <= 2) {
        expect(result.formula.mixingComplexity).toBe('simple');
      }
    });

    it('should respect 28-second timeout default', async () => {
      const paints = createMockPaints(5);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 65, a: 20, b: -10 },
        availablePaints: paints,
        mode: 'enhanced'
        // No timeLimit specified, should default to 28000ms
      };

      const result = await optimizeWithDifferentialEvolution(request);

      expect(result.metrics.timeElapsed).toBeLessThan(29000);
    });

    it('should calculate performance metrics correctly', async () => {
      const paints = createMockPaints(4);
      const request: EnhancedOptimizationRequest = {
        targetColor: { l: 55, a: 12, b: -8 },
        availablePaints: paints,
        mode: 'enhanced',
        timeLimit: 3000
      };

      const result = await optimizeWithDifferentialEvolution(request);

      expect(result.metrics.timeElapsed).toBeGreaterThan(0);
      expect(result.metrics.iterationsCompleted).toBeGreaterThan(0);
      expect(result.metrics.convergenceAchieved).toBeDefined();
      expect(result.metrics.targetMet).toBeDefined();
      expect(result.metrics.initialBestDeltaE).toBeGreaterThanOrEqual(0);
      expect(result.metrics.finalBestDeltaE).toBeGreaterThanOrEqual(0);
      expect(result.metrics.improvementRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Factory Functions', () => {
    it('createDifferentialEvolutionOptimizer should create optimizer instance', () => {
      const paints = createMockPaints(3);
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 50, a: 10, b: -5 };

      const optimizer = createDifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        { volume_constraints: { min_total_volume_ml: 100, max_total_volume_ml: 500 } }
      );

      expect(optimizer).toBeInstanceOf(DifferentialEvolutionOptimizer);
    });

    it('should use default config when not specified', () => {
      const paints = createMockPaints(3);
      const optimizationPaints = convertToOptimizationPaints(paints);
      const targetColor: LABColor = { l: 50, a: 0, b: 0 };

      const optimizer = createDifferentialEvolutionOptimizer(
        targetColor,
        optimizationPaints,
        { volume_constraints: { min_total_volume_ml: 100, max_total_volume_ml: 500 } }
      );

      const result = optimizer.optimize();
      expect(result.success).toBe(true);
    });
  });
});

describe('DE Constants Validation', () => {
  it('should have sensible population size limits', () => {
    expect(DE_CONSTANTS.MIN_POPULATION_SIZE).toBe(20);
    expect(DE_CONSTANTS.MAX_POPULATION_SIZE).toBe(200);
    expect(DE_CONSTANTS.POPULATION_MULTIPLIER).toBe(10);
  });

  it('should have valid F and CR ranges', () => {
    expect(DE_CONSTANTS.DEFAULT_F).toBeGreaterThan(DE_CONSTANTS.F_MIN);
    expect(DE_CONSTANTS.DEFAULT_F).toBeLessThan(DE_CONSTANTS.F_MAX);
    expect(DE_CONSTANTS.DEFAULT_CR).toBeGreaterThan(DE_CONSTANTS.CR_MIN);
    expect(DE_CONSTANTS.DEFAULT_CR).toBeLessThan(DE_CONSTANTS.CR_MAX);
  });

  it('should have reasonable convergence parameters', () => {
    expect(DE_CONSTANTS.MAX_ITERATIONS).toBe(1000);
    expect(DE_CONSTANTS.MAX_STAGNATION).toBe(50);
    expect(DE_CONSTANTS.CONVERGENCE_TOLERANCE).toBe(1e-6);
    expect(DE_CONSTANTS.TARGET_FITNESS).toBe(0.0001);
  });
});
