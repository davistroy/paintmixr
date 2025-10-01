/**
 * Unit Tests for TPE Hybrid Algorithm
 * Tests the Tree-structured Parzen Estimator hybrid optimization
 */

import { TPEHybridOptimizer } from '../tpe-hybrid';
import { LABColor } from '@/lib/color-science/types';
import { PaintEntry } from '@/lib/database/types';

// Reuse mock paint data (subset for focused testing)
const mockPaints: PaintEntry[] = [
  {
    id: 'paint-1',
    name: 'Titanium White',
    brand: 'Professional',
    lab_l: 95.0, lab_a: -0.5, lab_b: 2.1,
    volume_ml: 100, cost_per_ml: 0.05,
    finish_type: 'matte', user_id: 'test-user', collection_id: 'test-collection',
    hex_color: '#F8F8FF', rgb_r: 248, rgb_g: 248, rgb_b: 255,
    pigment_info: null, lightfastness_rating: null, transparency_rating: null,
    granulation_rating: null, staining_rating: null, color_temperature: null,
    color_bias: null, mixing_ratios: null, color_accuracy_verified: true,
    optical_properties_calibrated: true, times_used: 5,
    last_used_at: new Date().toISOString(), purchase_date: new Date().toISOString(),
    notes: null, tags: [], archived: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  {
    id: 'paint-2',
    name: 'Ivory Black',
    brand: 'Professional',
    lab_l: 15.2, lab_a: 1.1, lab_b: 2.8,
    volume_ml: 85, cost_per_ml: 0.06,
    finish_type: 'matte', user_id: 'test-user', collection_id: 'test-collection',
    hex_color: '#2F2F2F', rgb_r: 47, rgb_g: 47, rgb_b: 47,
    pigment_info: null, lightfastness_rating: null, transparency_rating: null,
    granulation_rating: null, staining_rating: null, color_temperature: null,
    color_bias: null, mixing_ratios: null, color_accuracy_verified: true,
    optical_properties_calibrated: true, times_used: 8,
    last_used_at: new Date().toISOString(), purchase_date: new Date().toISOString(),
    notes: null, tags: [], archived: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  {
    id: 'paint-3',
    name: 'Vermillion',
    brand: 'Professional',
    lab_l: 48.5, lab_a: 65.2, lab_b: 52.1,
    volume_ml: 70, cost_per_ml: 0.11,
    finish_type: 'matte', user_id: 'test-user', collection_id: 'test-collection',
    hex_color: '#E34234', rgb_r: 227, rgb_g: 66, rgb_b: 52,
    pigment_info: null, lightfastness_rating: null, transparency_rating: null,
    granulation_rating: null, staining_rating: null, color_temperature: null,
    color_bias: null, mixing_ratios: null, color_accuracy_verified: true,
    optical_properties_calibrated: true, times_used: 4,
    last_used_at: new Date().toISOString(), purchase_date: new Date().toISOString(),
    notes: null, tags: [], archived: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  {
    id: 'paint-4',
    name: 'Prussian Blue',
    brand: 'Professional',
    lab_l: 23.8, lab_a: 14.5, lab_b: -47.2,
    volume_ml: 95, cost_per_ml: 0.08,
    finish_type: 'matte', user_id: 'test-user', collection_id: 'test-collection',
    hex_color: '#003153', rgb_r: 0, rgb_g: 49, rgb_b: 83,
    pigment_info: null, lightfastness_rating: null, transparency_rating: null,
    granulation_rating: null, staining_rating: null, color_temperature: null,
    color_bias: null, mixing_ratios: null, color_accuracy_verified: true,
    optical_properties_calibrated: true, times_used: 6,
    last_used_at: new Date().toISOString(), purchase_date: new Date().toISOString(),
    notes: null, tags: [], archived: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  {
    id: 'paint-5',
    name: 'Raw Umber',
    brand: 'Professional',
    lab_l: 35.6, lab_a: 8.7, lab_b: 19.3,
    volume_ml: 80, cost_per_ml: 0.07,
    finish_type: 'matte', user_id: 'test-user', collection_id: 'test-collection',
    hex_color: '#8B4513', rgb_r: 139, rgb_g: 69, rgb_b: 19,
    pigment_info: null, lightfastness_rating: null, transparency_rating: null,
    granulation_rating: null, staining_rating: null, color_temperature: null,
    color_bias: null, mixing_ratios: null, color_accuracy_verified: true,
    optical_properties_calibrated: true, times_used: 3,
    last_used_at: new Date().toISOString(), purchase_date: new Date().toISOString(),
    notes: null, tags: [], archived: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  {
    id: 'paint-6',
    name: 'Lemon Yellow',
    brand: 'Professional',
    lab_l: 82.3, lab_a: -6.1, lab_b: 78.9,
    volume_ml: 75, cost_per_ml: 0.09,
    finish_type: 'matte', user_id: 'test-user', collection_id: 'test-collection',
    hex_color: '#FFFF33', rgb_r: 255, rgb_g: 255, rgb_b: 51,
    pigment_info: null, lightfastness_rating: null, transparency_rating: null,
    granulation_rating: null, staining_rating: null, color_temperature: null,
    color_bias: null, mixing_ratios: null, color_accuracy_verified: true,
    optical_properties_calibrated: true, times_used: 7,
    last_used_at: new Date().toISOString(), purchase_date: new Date().toISOString(),
    notes: null, tags: [], archived: false,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }
];

describe('TPEHybridOptimizer', () => {
  let optimizer: TPEHybridOptimizer;

  beforeEach(() => {
    optimizer = new TPEHybridOptimizer();
  });

  describe('Initialization and Configuration', () => {
    test('should initialize with default configuration', () => {
      expect(optimizer).toBeInstanceOf(TPEHybridOptimizer);

      const config = optimizer.getConfiguration();
      expect(config.n_startup_trials).toBeGreaterThan(0);
      expect(config.n_warmup_steps).toBeGreaterThan(0);
      expect(config.n_ei_candidates).toBeGreaterThan(0);
      expect(config.gamma).toBeGreaterThan(0);
      expect(config.gamma).toBeLessThan(1);
    });

    test('should allow custom configuration', () => {
      const customConfig = {
        n_startup_trials: 25,
        n_warmup_steps: 15,
        n_ei_candidates: 48,
        gamma: 0.2,
        weights_above: [1.0],
        weights_below: [1.0],
        consider_prior: false,
        prior_weight: 0.8,
        consider_magic_clip: false,
        consider_endpoints: true,
        n_multivariate: 1,
        warn_independent_sampling: false
      };

      optimizer.configure(customConfig);
      const updatedConfig = optimizer.getConfiguration();

      expect(updatedConfig.n_startup_trials).toBe(25);
      expect(updatedConfig.gamma).toBe(0.2);
      expect(updatedConfig.consider_prior).toBe(false);
    });
  });

  describe('TPE Algorithm Performance', () => {
    const targetColor: LABColor = { L: 55.0, a: 25.0, b: -15.0 }; // Purple-ish tone

    test('should optimize with TPE strategy for high accuracy', async () => {
      const result = await optimizer.optimize({
        request_id: 'test-tpe-accuracy',
        target_color: targetColor,
        available_paints: mockPaints.map(paint => ({
          id: paint.id,
          name: paint.name,
          brand: paint.brand,
          lab_l: paint.lab_l,
          lab_a: paint.lab_a,
          lab_b: paint.lab_b,
          volume_ml: paint.volume_ml,
          cost_per_ml: paint.cost_per_ml,
          finish_type: paint.finish_type,
          optical_properties_calibrated: paint.optical_properties_calibrated || false
        })),
        volume_constraints: {
          total_volume_ml: 100,
          min_volume_per_paint_ml: 0.5,
          max_paint_count: 5,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 1.5,
          algorithm: 'tpe_hybrid',
          max_iterations: 150,
          time_limit_ms: 12000,
          quality_vs_speed: 'quality'
        }
      });

      expect(result.success).toBe(true);
      expect(result.solution.paint_volumes.length).toBeLessThanOrEqual(5);
      expect(result.solution.total_volume_ml).toBeCloseTo(100, 1);
      expect(result.quality_metrics.delta_e).toBeLessThan(3.0);

      // TPE should be effective at finding good combinations
      if (result.quality_metrics.delta_e < 2.0) {
        expect(result.performance_metrics.iterations_completed).toBeGreaterThan(20);
      }
    });

    test('should demonstrate adaptive sampling behavior', async () => {
      // Configure for more detailed sampling behavior
      optimizer.configure({
        n_startup_trials: 30, // More random exploration
        n_warmup_steps: 20,
        gamma: 0.25, // Balanced exploration/exploitation
        consider_prior: true,
        prior_weight: 1.0
      });

      const result = await optimizer.optimize({
        request_id: 'test-tpe-adaptive',
        target_color: { L: 40.0, a: 0.0, b: 0.0 }, // Neutral dark gray
        available_paints: mockPaints.slice(0, 4).map(paint => ({
          id: paint.id,
          name: paint.name,
          brand: paint.brand,
          lab_l: paint.lab_l,
          lab_a: paint.lab_a,
          lab_b: paint.lab_b,
          volume_ml: paint.volume_ml,
          cost_per_ml: paint.cost_per_ml,
          finish_type: paint.finish_type,
          optical_properties_calibrated: paint.optical_properties_calibrated || false
        })),
        volume_constraints: {
          total_volume_ml: 75,
          min_volume_per_paint_ml: 1.0,
          max_paint_count: 3,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 2.0,
          algorithm: 'tpe_hybrid',
          max_iterations: 100,
          time_limit_ms: 8000,
          quality_vs_speed: 'balanced'
        }
      });

      expect(result.success).toBe(true);

      // Should converge to a good solution with adaptive sampling
      expect(result.quality_metrics.delta_e).toBeLessThan(4.0);
      expect(result.performance_metrics.iterations_completed).toBeGreaterThan(30);
    });

    test('should handle complex multi-objective optimization', async () => {
      const result = await optimizer.optimize({
        request_id: 'test-tpe-multi-objective',
        target_color: { L: 65.0, a: 15.0, b: 35.0 }, // Warm light brown
        available_paints: mockPaints.map(paint => ({
          id: paint.id,
          name: paint.name,
          brand: paint.brand,
          lab_l: paint.lab_l,
          lab_a: paint.lab_a,
          lab_b: paint.lab_b,
          volume_ml: paint.volume_ml,
          cost_per_ml: paint.cost_per_ml,
          finish_type: paint.finish_type,
          optical_properties_calibrated: paint.optical_properties_calibrated || false
        })),
        volume_constraints: {
          total_volume_ml: 150,
          min_volume_per_paint_ml: 2.0,
          max_paint_count: 4,
          allow_waste: true // Allow some waste for better color matching
        },
        optimization_config: {
          target_delta_e: 1.8,
          algorithm: 'tpe_hybrid',
          max_iterations: 200,
          time_limit_ms: 15000,
          quality_vs_speed: 'quality'
        }
      });

      expect(result.success).toBe(true);
      expect(result.solution.paint_volumes.length).toBeLessThanOrEqual(4);

      // Should balance color accuracy with cost efficiency
      expect(result.quality_metrics.delta_e).toBeLessThan(3.5);
      expect(result.solution.cost_efficiency).toBeGreaterThan(0.6);

      // Check that volume constraints are respected
      result.solution.paint_volumes.forEach(pv => {
        expect(pv.volume_ml).toBeGreaterThanOrEqual(2.0);
      });
    });
  });

  describe('Bayesian Optimization Features', () => {
    test('should use acquisition function for sample selection', async () => {
      // Configure for observable acquisition function behavior
      optimizer.configure({
        n_startup_trials: 15, // Shorter random phase
        n_ei_candidates: 64, // More acquisition candidates
        gamma: 0.15, // More exploitation
        consider_endpoints: true
      });

      const result = await optimizer.optimize({
        request_id: 'test-acquisition-function',
        target_color: { L: 70.0, a: -10.0, b: 20.0 }, // Light greenish
        available_paints: mockPaints.slice(0, 5).map(paint => ({
          id: paint.id,
          name: paint.name,
          brand: paint.brand,
          lab_l: paint.lab_l,
          lab_a: paint.lab_a,
          lab_b: paint.lab_b,
          volume_ml: paint.volume_ml,
          cost_per_ml: paint.cost_per_ml,
          finish_type: paint.finish_type,
          optical_properties_calibrated: paint.optical_properties_calibrated || false
        })),
        volume_constraints: {
          total_volume_ml: 100,
          min_volume_per_paint_ml: 1.0,
          max_paint_count: 4,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 2.0,
          algorithm: 'tpe_hybrid',
          max_iterations: 80,
          time_limit_ms: 6000,
          quality_vs_speed: 'balanced'
        }
      });

      expect(result.success).toBe(true);

      // Acquisition function should lead to efficient convergence
      expect(result.performance_metrics.iterations_completed).toBeGreaterThan(15);
      expect(result.quality_metrics.delta_e).toBeLessThan(4.0);

      // Should show evidence of intelligent sampling (not purely random)
      const paintCount = result.solution.paint_volumes.length;
      expect(paintCount).toBeGreaterThan(1);
      expect(paintCount).toBeLessThanOrEqual(4);
    });

    test('should demonstrate exploration vs exploitation balance', async () => {
      // Test with high exploration (high gamma)
      optimizer.configure({
        n_startup_trials: 20,
        gamma: 0.4, // High exploration
        n_ei_candidates: 32
      });

      const explorationResult = await optimizer.optimize({
        request_id: 'test-exploration',
        target_color: { L: 50.0, a: 30.0, b: -20.0 },
        available_paints: mockPaints.slice(0, 4).map(paint => ({
          id: paint.id,
          name: paint.name,
          brand: paint.brand,
          lab_l: paint.lab_l,
          lab_a: paint.lab_a,
          lab_b: paint.lab_b,
          volume_ml: paint.volume_ml,
          cost_per_ml: paint.cost_per_ml,
          finish_type: paint.finish_type,
          optical_properties_calibrated: paint.optical_properties_calibrated || false
        })),
        volume_constraints: {
          total_volume_ml: 80,
          min_volume_per_paint_ml: 1.0,
          max_paint_count: 3,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 2.5,
          algorithm: 'tpe_hybrid',
          max_iterations: 60,
          time_limit_ms: 5000,
          quality_vs_speed: 'speed'
        }
      });

      expect(explorationResult.success).toBe(true);

      // High exploration should find diverse solutions
      expect(explorationResult.solution.paint_volumes.length).toBeGreaterThan(1);
      expect(explorationResult.quality_metrics.delta_e).toBeLessThan(5.0);
    });
  });

  describe('Edge Cases and Robustness', () => {
    test('should handle limited paint diversity', async () => {
      // Use only similar colors (whites and near-whites)
      const limitedPaints = [
        mockPaints[0], // White
        {
          ...mockPaints[0],
          id: 'paint-warm-white',
          name: 'Warm White',
          lab_l: 93.0, lab_a: 1.0, lab_b: 5.0 // Slightly warm white
        }
      ];

      const result = await optimizer.optimize({
        request_id: 'test-limited-diversity',
        target_color: { L: 94.0, a: 0.5, b: 3.5 }, // Between the two whites
        available_paints: limitedPaints.map(paint => ({
          id: paint.id,
          name: paint.name,
          brand: paint.brand,
          lab_l: paint.lab_l,
          lab_a: paint.lab_a,
          lab_b: paint.lab_b,
          volume_ml: paint.volume_ml,
          cost_per_ml: paint.cost_per_ml,
          finish_type: paint.finish_type,
          optical_properties_calibrated: paint.optical_properties_calibrated || false
        })),
        volume_constraints: {
          total_volume_ml: 50,
          min_volume_per_paint_ml: 1.0,
          max_paint_count: 2,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 1.0,
          algorithm: 'tpe_hybrid',
          max_iterations: 50,
          time_limit_ms: 4000,
          quality_vs_speed: 'quality'
        }
      });

      expect(result.success).toBe(true);
      expect(result.solution.paint_volumes.length).toBeLessThanOrEqual(2);
      expect(result.quality_metrics.delta_e).toBeLessThan(2.0); // Should achieve good accuracy
    });

    test('should handle extreme volume constraints', async () => {
      const result = await optimizer.optimize({
        request_id: 'test-extreme-volumes',
        target_color: { L: 60.0, a: 0.0, b: 0.0 }, // Neutral gray
        available_paints: mockPaints.slice(0, 3).map(paint => ({
          id: paint.id,
          name: paint.name,
          brand: paint.brand,
          lab_l: paint.lab_l,
          lab_a: paint.lab_a,
          lab_b: paint.lab_b,
          volume_ml: paint.volume_ml,
          cost_per_ml: paint.cost_per_ml,
          finish_type: paint.finish_type,
          optical_properties_calibrated: paint.optical_properties_calibrated || false
        })),
        volume_constraints: {
          total_volume_ml: 1000, // Very large volume
          min_volume_per_paint_ml: 50.0, // Large minimum
          max_paint_count: 3,
          allow_waste: true
        },
        optimization_config: {
          target_delta_e: 2.0,
          algorithm: 'tpe_hybrid',
          max_iterations: 100,
          time_limit_ms: 8000,
          quality_vs_speed: 'balanced'
        }
      });

      expect(result.success).toBe(true);
      expect(result.solution.total_volume_ml).toBeCloseTo(1000, 10);

      result.solution.paint_volumes.forEach(pv => {
        expect(pv.volume_ml).toBeGreaterThanOrEqual(50.0);
      });

      const totalUsed = result.solution.paint_volumes.reduce(
        (sum, pv) => sum + pv.volume_ml,
        0
      );
      expect(totalUsed).toBeCloseTo(1000, 10);
    });

    test('should maintain performance under time pressure', async () => {
      const startTime = Date.now();

      const result = await optimizer.optimize({
        request_id: 'test-time-pressure',
        target_color: { L: 45.0, a: 20.0, b: 25.0 },
        available_paints: mockPaints.map(paint => ({
          id: paint.id,
          name: paint.name,
          brand: paint.brand,
          lab_l: paint.lab_l,
          lab_a: paint.lab_a,
          lab_b: paint.lab_b,
          volume_ml: paint.volume_ml,
          cost_per_ml: paint.cost_per_ml,
          finish_type: paint.finish_type,
          optical_properties_calibrated: paint.optical_properties_calibrated || false
        })),
        volume_constraints: {
          total_volume_ml: 100,
          min_volume_per_paint_ml: 1.0,
          max_paint_count: 5,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 2.0,
          algorithm: 'tpe_hybrid',
          max_iterations: 300, // High iteration limit
          time_limit_ms: 2000, // Very tight time limit
          quality_vs_speed: 'speed'
        }
      });

      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(elapsed).toBeLessThan(3000); // Should respect time limit
      expect(result.quality_metrics.delta_e).toBeLessThan(5.0); // Should still get reasonable result
    });
  });

  describe('Statistical Properties', () => {
    test('should demonstrate consistent results with similar inputs', async () => {
      const targetColor = { L: 55.0, a: 10.0, b: 15.0 };
      const results: number[] = [];

      // Run multiple optimizations with same inputs
      for (let i = 0; i < 3; i++) {
        const result = await optimizer.optimize({
          request_id: `test-consistency-${i}`,
          target_color: targetColor,
          available_paints: mockPaints.slice(0, 4).map(paint => ({
            id: paint.id,
            name: paint.name,
            brand: paint.brand,
            lab_l: paint.lab_l,
            lab_a: paint.lab_a,
            lab_b: paint.lab_b,
            volume_ml: paint.volume_ml,
            cost_per_ml: paint.cost_per_ml,
            finish_type: paint.finish_type,
            optical_properties_calibrated: paint.optical_properties_calibrated || false
          })),
          volume_constraints: {
            total_volume_ml: 100,
            min_volume_per_paint_ml: 1.0,
            max_paint_count: 3,
            allow_waste: false
          },
          optimization_config: {
            target_delta_e: 2.0,
            algorithm: 'tpe_hybrid',
            max_iterations: 80,
            time_limit_ms: 6000,
            quality_vs_speed: 'balanced'
          }
        });

        expect(result.success).toBe(true);
        results.push(result.quality_metrics.delta_e);
      }

      // Results should be reasonably consistent (within expected variance)
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      const variance = results.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / results.length;
      const stdDev = Math.sqrt(variance);

      expect(stdDev).toBeLessThan(1.0); // Results shouldn't vary too wildly
      results.forEach(deltaE => {
        expect(deltaE).toBeLessThan(4.0); // All should achieve reasonable accuracy
      });
    });

    test('should show improvement with increased iterations', async () => {
      const baseConfig = {
        request_id: 'test-iteration-improvement',
        target_color: { L: 50.0, a: -15.0, b: 30.0 } as LABColor,
        available_paints: mockPaints.slice(0, 5).map(paint => ({
          id: paint.id,
          name: paint.name,
          brand: paint.brand,
          lab_l: paint.lab_l,
          lab_a: paint.lab_a,
          lab_b: paint.lab_b,
          volume_ml: paint.volume_ml,
          cost_per_ml: paint.cost_per_ml,
          finish_type: paint.finish_type,
          optical_properties_calibrated: paint.optical_properties_calibrated || false
        })),
        volume_constraints: {
          total_volume_ml: 100,
          min_volume_per_paint_ml: 1.0,
          max_paint_count: 4,
          allow_waste: false
        }
      };

      // Test with fewer iterations
      const quickResult = await optimizer.optimize({
        ...baseConfig,
        optimization_config: {
          target_delta_e: 2.0,
          algorithm: 'tpe_hybrid',
          max_iterations: 40,
          time_limit_ms: 4000,
          quality_vs_speed: 'speed'
        }
      });

      // Test with more iterations
      const thoroughResult = await optimizer.optimize({
        ...baseConfig,
        optimization_config: {
          target_delta_e: 2.0,
          algorithm: 'tpe_hybrid',
          max_iterations: 120,
          time_limit_ms: 10000,
          quality_vs_speed: 'quality'
        }
      });

      expect(quickResult.success).toBe(true);
      expect(thoroughResult.success).toBe(true);

      // More iterations should generally lead to better results
      // (allowing some tolerance due to stochastic nature)
      expect(thoroughResult.quality_metrics.delta_e).toBeLessThanOrEqual(
        quickResult.quality_metrics.delta_e + 0.5
      );

      expect(thoroughResult.performance_metrics.iterations_completed).toBeGreaterThan(
        quickResult.performance_metrics.iterations_completed
      );
    });
  });
});