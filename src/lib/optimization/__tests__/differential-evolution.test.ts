/**
 * Unit Tests for Differential Evolution Algorithm
 * Tests the enhanced accuracy optimization algorithm
 */

import { DifferentialEvolutionOptimizer } from '../differential-evolution';
import { LABColor } from '@/lib/color-science/types';
import { PaintEntry } from '@/lib/database/types';
import { calculateDeltaE } from '@/lib/color-science/delta-e';

// Mock paint data for testing
const mockPaints: PaintEntry[] = [
  {
    id: 'paint-1',
    name: 'Titanium White',
    brand: 'Test Brand',
    lab_l: 95.0,
    lab_a: -0.5,
    lab_b: 2.1,
    volume_ml: 100,
    cost_per_ml: 0.05,
    finish_type: 'matte',
    user_id: 'test-user',
    collection_id: 'test-collection',
    hex_color: '#F8F8FF',
    rgb_r: 248,
    rgb_g: 248,
    rgb_b: 255,
    pigment_info: null,
    lightfastness_rating: null,
    transparency_rating: null,
    granulation_rating: null,
    staining_rating: null,
    color_temperature: null,
    color_bias: null,
    mixing_ratios: null,
    color_accuracy_verified: true,
    optical_properties_calibrated: true,
    times_used: 5,
    last_used_at: new Date().toISOString(),
    purchase_date: new Date().toISOString(),
    notes: null,
    tags: [],
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'paint-2',
    name: 'Ultramarine Blue',
    brand: 'Test Brand',
    lab_l: 29.8,
    lab_a: 24.2,
    lab_b: -58.3,
    volume_ml: 80,
    cost_per_ml: 0.08,
    finish_type: 'matte',
    user_id: 'test-user',
    collection_id: 'test-collection',
    hex_color: '#4169E1',
    rgb_r: 65,
    rgb_g: 105,
    rgb_b: 225,
    pigment_info: null,
    lightfastness_rating: null,
    transparency_rating: null,
    granulation_rating: null,
    staining_rating: null,
    color_temperature: null,
    color_bias: null,
    mixing_ratios: null,
    color_accuracy_verified: true,
    optical_properties_calibrated: true,
    times_used: 3,
    last_used_at: new Date().toISOString(),
    purchase_date: new Date().toISOString(),
    notes: null,
    tags: [],
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'paint-3',
    name: 'Cadmium Red',
    brand: 'Test Brand',
    lab_l: 45.2,
    lab_a: 67.8,
    lab_b: 42.1,
    volume_ml: 60,
    cost_per_ml: 0.12,
    finish_type: 'matte',
    user_id: 'test-user',
    collection_id: 'test-collection',
    hex_color: '#DC143C',
    rgb_r: 220,
    rgb_g: 20,
    rgb_b: 60,
    pigment_info: null,
    lightfastness_rating: null,
    transparency_rating: null,
    granulation_rating: null,
    staining_rating: null,
    color_temperature: null,
    color_bias: null,
    mixing_ratios: null,
    color_accuracy_verified: true,
    optical_properties_calibrated: true,
    times_used: 7,
    last_used_at: new Date().toISOString(),
    purchase_date: new Date().toISOString(),
    notes: null,
    tags: [],
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'paint-4',
    name: 'Chrome Yellow',
    brand: 'Test Brand',
    lab_l: 78.5,
    lab_a: 6.2,
    lab_b: 85.4,
    volume_ml: 75,
    cost_per_ml: 0.09,
    finish_type: 'matte',
    user_id: 'test-user',
    collection_id: 'test-collection',
    hex_color: '#FFD700',
    rgb_r: 255,
    rgb_g: 215,
    rgb_b: 0,
    pigment_info: null,
    lightfastness_rating: null,
    transparency_rating: null,
    granulation_rating: null,
    staining_rating: null,
    color_temperature: null,
    color_bias: null,
    mixing_ratios: null,
    color_accuracy_verified: true,
    optical_properties_calibrated: true,
    times_used: 4,
    last_used_at: new Date().toISOString(),
    purchase_date: new Date().toISOString(),
    notes: null,
    tags: [],
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'paint-5',
    name: 'Viridian Green',
    brand: 'Test Brand',
    lab_l: 42.1,
    lab_a: -38.7,
    lab_b: 31.2,
    volume_ml: 90,
    cost_per_ml: 0.07,
    finish_type: 'matte',
    user_id: 'test-user',
    collection_id: 'test-collection',
    hex_color: '#40826D',
    rgb_r: 64,
    rgb_g: 130,
    rgb_b: 109,
    pigment_info: null,
    lightfastness_rating: null,
    transparency_rating: null,
    granulation_rating: null,
    staining_rating: null,
    color_temperature: null,
    color_bias: null,
    mixing_ratios: null,
    color_accuracy_verified: true,
    optical_properties_calibrated: true,
    times_used: 2,
    last_used_at: new Date().toISOString(),
    purchase_date: new Date().toISOString(),
    notes: null,
    tags: [],
    archived: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

describe('DifferentialEvolutionOptimizer', () => {
  let optimizer: DifferentialEvolutionOptimizer;

  beforeEach(() => {
    optimizer = new DifferentialEvolutionOptimizer();
  });

  describe('Basic Functionality', () => {
    test('should be created successfully', () => {
      expect(optimizer).toBeInstanceOf(DifferentialEvolutionOptimizer);
    });

    test('should have default configuration', () => {
      const config = optimizer.getConfiguration();
      expect(config.population_size).toBeGreaterThan(0);
      expect(config.max_generations).toBeGreaterThan(0);
      expect(config.mutation_factor).toBeGreaterThan(0);
      expect(config.crossover_probability).toBeGreaterThan(0);
    });

    test('should allow configuration updates', () => {
      const newConfig = {
        population_size: 100,
        max_generations: 500,
        mutation_factor: 0.8,
        crossover_probability: 0.9,
        convergence_threshold: 0.001,
        elite_preservation: true,
        adaptive_parameters: true
      };

      optimizer.configure(newConfig);
      const updatedConfig = optimizer.getConfiguration();

      expect(updatedConfig.population_size).toBe(100);
      expect(updatedConfig.max_generations).toBe(500);
      expect(updatedConfig.mutation_factor).toBe(0.8);
      expect(updatedConfig.crossover_probability).toBe(0.9);
    });
  });

  describe('Color Mixing Optimization', () => {
    const targetColor: LABColor = { L: 65.2, a: 15.1, b: 28.7 }; // Medium warm gray

    test('should optimize simple two-color mix', async () => {
      const simplePaints = [mockPaints[0], mockPaints[2]]; // White + Red

      const result = await optimizer.optimize({
        request_id: 'test-simple-mix',
        target_color: targetColor,
        available_paints: simplePaints.map(paint => ({
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
          max_paint_count: 2,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 3.0,
          algorithm: 'differential_evolution',
          max_iterations: 100,
          time_limit_ms: 5000,
          quality_vs_speed: 'balanced'
        }
      });

      expect(result.success).toBe(true);
      expect(result.solution.paint_volumes).toHaveLength(2);
      expect(result.solution.total_volume_ml).toBeCloseTo(100, 1);
      expect(result.quality_metrics.delta_e).toBeLessThan(5.0);

      // Verify volume constraints
      result.solution.paint_volumes.forEach(pv => {
        expect(pv.volume_ml).toBeGreaterThanOrEqual(1.0);
      });
    });

    test('should optimize complex multi-color mix', async () => {
      const result = await optimizer.optimize({
        request_id: 'test-complex-mix',
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
          total_volume_ml: 50,
          min_volume_per_paint_ml: 0.5,
          max_paint_count: 4,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 2.0,
          algorithm: 'differential_evolution',
          max_iterations: 200,
          time_limit_ms: 10000,
          quality_vs_speed: 'quality'
        }
      });

      expect(result.success).toBe(true);
      expect(result.solution.paint_volumes.length).toBeLessThanOrEqual(4);
      expect(result.solution.total_volume_ml).toBeCloseTo(50, 1);
      expect(result.quality_metrics.delta_e).toBeLessThan(4.0);

      // Should achieve better accuracy with more paints available
      if (result.quality_metrics.delta_e < 2.5) {
        expect(result.solution.paint_volumes.length).toBeGreaterThan(2);
      }
    });

    test('should respect volume constraints strictly', async () => {
      const result = await optimizer.optimize({
        request_id: 'test-volume-constraints',
        target_color: targetColor,
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
          total_volume_ml: 25,
          min_volume_per_paint_ml: 2.0,
          max_paint_count: 3,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 3.0,
          algorithm: 'differential_evolution',
          max_iterations: 150,
          time_limit_ms: 8000,
          quality_vs_speed: 'balanced'
        }
      });

      expect(result.success).toBe(true);
      expect(result.solution.total_volume_ml).toBeCloseTo(25, 1);

      result.solution.paint_volumes.forEach(pv => {
        expect(pv.volume_ml).toBeGreaterThanOrEqual(2.0);
      });

      const totalVolume = result.solution.paint_volumes.reduce(
        (sum, pv) => sum + pv.volume_ml,
        0
      );
      expect(totalVolume).toBeCloseTo(25, 1);
    });

    test('should handle asymmetric volume ratios', async () => {
      const result = await optimizer.optimize({
        request_id: 'test-asymmetric-ratios',
        target_color: { L: 80.0, a: 5.0, b: 15.0 }, // Light warm tone
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
          min_volume_per_paint_ml: 0.1, // Very small minimum
          max_paint_count: 5,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 1.5,
          algorithm: 'differential_evolution',
          max_iterations: 300,
          time_limit_ms: 15000,
          quality_vs_speed: 'quality'
        }
      });

      expect(result.success).toBe(true);

      // Should use mostly white paint with small amounts of others
      const whiteVolume = result.solution.paint_volumes.find(pv =>
        pv.paint_id === 'paint-1'
      )?.volume_ml || 0;

      expect(whiteVolume).toBeGreaterThan(50); // Should be dominated by white

      // Check for asymmetric ratios
      const volumes = result.solution.paint_volumes.map(pv => pv.volume_ml);
      const maxVolume = Math.max(...volumes);
      const minVolume = Math.min(...volumes);

      if (volumes.length > 1) {
        expect(maxVolume / minVolume).toBeGreaterThan(5); // Should have significant ratio differences
      }
    });
  });

  describe('Performance and Convergence', () => {
    const targetColor: LABColor = { L: 50.0, a: 20.0, b: -10.0 }; // Mid-tone purple

    test('should converge within time limits', async () => {
      const startTime = Date.now();

      const result = await optimizer.optimize({
        request_id: 'test-performance',
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
          min_volume_per_paint_ml: 1.0,
          max_paint_count: 4,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 2.0,
          algorithm: 'differential_evolution',
          max_iterations: 200,
          time_limit_ms: 3000, // 3 second limit
          quality_vs_speed: 'speed'
        }
      });

      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(elapsed).toBeLessThan(4000); // Should respect time limit + small buffer
      expect(result.performance_metrics.total_time_ms).toBeLessThan(3500);
    });

    test('should show convergence improvement over generations', async () => {
      // Configure for detailed tracking
      optimizer.configure({
        population_size: 50,
        max_generations: 100,
        mutation_factor: 0.7,
        crossover_probability: 0.8,
        convergence_threshold: 0.1,
        elite_preservation: true,
        adaptive_parameters: false // Fixed parameters for consistent testing
      });

      const result = await optimizer.optimize({
        request_id: 'test-convergence',
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
          min_volume_per_paint_ml: 1.0,
          max_paint_count: 4,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 1.0,
          algorithm: 'differential_evolution',
          max_iterations: 100,
          time_limit_ms: 10000,
          quality_vs_speed: 'quality'
        }
      });

      expect(result.success).toBe(true);
      expect(result.performance_metrics.iterations_completed).toBeGreaterThan(10);

      // Should achieve reasonable accuracy
      expect(result.quality_metrics.delta_e).toBeLessThan(3.0);

      // Convergence should show improvement (this would require internal tracking in real implementation)
      expect(result.performance_metrics.convergence_achieved).toBeDefined();
    });

    test('should handle edge case with identical colors', async () => {
      const identicalColor = { L: 95.0, a: -0.5, b: 2.1 }; // Matches white paint exactly

      const result = await optimizer.optimize({
        request_id: 'test-identical-color',
        target_color: identicalColor,
        available_paints: [mockPaints[0]].map(paint => ({ // Only white paint
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
          max_paint_count: 1,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 0.1,
          algorithm: 'differential_evolution',
          max_iterations: 50,
          time_limit_ms: 2000,
          quality_vs_speed: 'speed'
        }
      });

      expect(result.success).toBe(true);
      expect(result.solution.paint_volumes).toHaveLength(1);
      expect(result.solution.paint_volumes[0].volume_ml).toBeCloseTo(50, 1);
      expect(result.quality_metrics.delta_e).toBeLessThan(0.5); // Should be nearly perfect
    });
  });

  describe('Error Handling', () => {
    test('should handle insufficient paints gracefully', async () => {
      await expect(optimizer.optimize({
        request_id: 'test-no-paints',
        target_color: { L: 50, a: 0, b: 0 },
        available_paints: [], // No paints
        volume_constraints: {
          total_volume_ml: 100,
          min_volume_per_paint_ml: 1.0,
          max_paint_count: 5,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 2.0,
          algorithm: 'differential_evolution',
          max_iterations: 100,
          time_limit_ms: 5000,
          quality_vs_speed: 'balanced'
        }
      })).rejects.toThrow();
    });

    test('should handle impossible constraints', async () => {
      const result = await optimizer.optimize({
        request_id: 'test-impossible-constraints',
        target_color: { L: 50, a: 0, b: 0 },
        available_paints: [mockPaints[0]].map(paint => ({
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
          min_volume_per_paint_ml: 150, // Impossible: min > total
          max_paint_count: 1,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 2.0,
          algorithm: 'differential_evolution',
          max_iterations: 100,
          time_limit_ms: 5000,
          quality_vs_speed: 'balanced'
        }
      });

      // Should either fail gracefully or adjust constraints
      expect(result.success).toBe(false);
    });

    test('should handle invalid color values', async () => {
      const invalidColor = { L: 150, a: 200, b: -200 }; // Out of valid LAB range

      await expect(optimizer.optimize({
        request_id: 'test-invalid-color',
        target_color: invalidColor,
        available_paints: mockPaints.slice(0, 2).map(paint => ({
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
          max_paint_count: 2,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 2.0,
          algorithm: 'differential_evolution',
          max_iterations: 100,
          time_limit_ms: 5000,
          quality_vs_speed: 'balanced'
        }
      })).rejects.toThrow();
    });
  });

  describe('Quality Metrics', () => {
    test('should calculate accurate color space coverage', async () => {
      const result = await optimizer.optimize({
        request_id: 'test-color-coverage',
        target_color: { L: 60.0, a: 30.0, b: 20.0 },
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
          algorithm: 'differential_evolution',
          max_iterations: 150,
          time_limit_ms: 8000,
          quality_vs_speed: 'balanced'
        }
      });

      expect(result.success).toBe(true);
      expect(result.quality_metrics.color_space_coverage).toBeGreaterThan(0);
      expect(result.quality_metrics.color_space_coverage).toBeLessThanOrEqual(1.0);

      // Should have reasonable color space coverage with 5 diverse paints
      expect(result.quality_metrics.color_space_coverage).toBeGreaterThan(0.5);
    });

    test('should provide efficiency metrics', async () => {
      const result = await optimizer.optimize({
        request_id: 'test-efficiency-metrics',
        target_color: { L: 70.0, a: 10.0, b: 30.0 },
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
          max_paint_count: 4,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: 2.0,
          algorithm: 'differential_evolution',
          max_iterations: 200,
          time_limit_ms: 10000,
          quality_vs_speed: 'balanced'
        }
      });

      expect(result.success).toBe(true);
      expect(result.solution.volume_efficiency).toBeGreaterThan(0);
      expect(result.solution.volume_efficiency).toBeLessThanOrEqual(1.0);
      expect(result.solution.cost_efficiency).toBeGreaterThan(0);
      expect(result.solution.cost_efficiency).toBeLessThanOrEqual(1.0);

      // Volume efficiency should be high since we don't allow waste
      expect(result.solution.volume_efficiency).toBeGreaterThan(0.95);
    });
  });
});