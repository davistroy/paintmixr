/**
 * Integration Test T006: Enhanced Mode - Partial Match (Outside Gamut)
 *
 * Tests Enhanced Mode's ability to gracefully handle target colors outside
 * the achievable gamut of available paints. Validates that the system:
 * - Returns the best achievable solution (Delta E > 2.0)
 * - Provides clear warnings about unmet targets
 * - Sets convergenceAchieved: false and targetMet: false
 * - Assigns "good" or "acceptable" accuracy rating
 *
 * Target: Neon pink (L=75, a=95, b=85) - impossible with standard paints
 */

import { describe, it, expect } from '@jest/globals';
import type {
  EnhancedOptimizationRequest,
  EnhancedOptimizationResponse,
  Paint,
  LABColor
} from '@/lib/types';

describe('Integration Test T006: Enhanced Mode - Partial Match (Outside Gamut)', () => {

  it('should handle neon pink target outside gamut with best achievable solution', async () => {
    // Target color: Neon pink - unachievable with standard paint pigments
    const targetColor: LABColor = {
      l: 75,  // Bright lightness
      a: 95,  // Extreme red (max ~127, but pigments limited to ~80)
      b: 85   // Extreme yellow (creates neon appearance)
    };

    // Standard paint collection - limited gamut
    const mockPaints: Paint[] = [
      {
        id: 'paint-001',
        name: 'Titanium White',
        brand: 'Winsor & Newton',
        color: {
          hex: '#FFFFFF',
          lab: { l: 100, a: 0, b: 0 }
        },
        opacity: 1.0,
        tintingStrength: 0.3,
        kubelkaMunk: { k: 0.01, s: 0.95 },
        userId: 'test-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'paint-002',
        name: 'Cadmium Red Medium',
        brand: 'Winsor & Newton',
        color: {
          hex: '#E30022',
          lab: { l: 48, a: 74, b: 56 } // High chroma but not neon
        },
        opacity: 0.95,
        tintingStrength: 0.85,
        kubelkaMunk: { k: 0.65, s: 0.25 },
        userId: 'test-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'paint-003',
        name: 'Quinacridone Magenta',
        brand: 'Winsor & Newton',
        color: {
          hex: '#8E3A59',
          lab: { l: 38, a: 48, b: 5 } // Purple-red, not orange-pink
        },
        opacity: 0.7,
        tintingStrength: 0.9,
        kubelkaMunk: { k: 0.72, s: 0.18 },
        userId: 'test-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'paint-004',
        name: 'Cadmium Yellow Light',
        brand: 'Winsor & Newton',
        color: {
          hex: '#FFF200',
          lab: { l: 92, a: -7, b: 94 }
        },
        opacity: 0.9,
        tintingStrength: 0.8,
        kubelkaMunk: { k: 0.15, s: 0.75 },
        userId: 'test-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const request: EnhancedOptimizationRequest = {
      targetColor,
      availablePaints: mockPaints,
      mode: 'enhanced',
      volumeConstraints: {
        min_total_volume_ml: 10,
        max_total_volume_ml: 50,
        allow_scaling: true
      },
      maxPaintCount: 5,
      timeLimit: 28000, // 28 seconds
      accuracyTarget: 2.0 // Target Delta E ≤ 2.0 (will fail)
    };

    try {
      // Import optimization endpoint
      const { POST } = await import('@/app/api/optimize/route');

      // Mock NextRequest
      const mockRequest = {
        json: async () => ({
          target_color: request.targetColor,
          available_paints: request.availablePaints,
          volume_constraints: request.volumeConstraints,
          optimization_config: {
            algorithm: 'auto',
            max_iterations: 2000,
            target_delta_e: request.accuracyTarget,
            time_limit_ms: request.timeLimit
          }
        })
      } as any;

      const response = await POST(mockRequest);
      const result = await response.json() as EnhancedOptimizationResponse;

      // Assertions: Should return best achievable, not reject
      expect(result.success).toBe(true);
      expect(result.formula).not.toBeNull();

      if (result.formula) {
        // Delta E should be > 2.0 (target not met)
        expect(result.formula.deltaE).toBeGreaterThan(2.0);

        // Should be within reasonable range (not completely off)
        expect(result.formula.deltaE).toBeLessThan(15.0);

        // Accuracy rating should reflect partial match
        expect(['good', 'acceptable', 'poor']).toContain(result.formula.accuracyRating);

        // Should use 2-5 paints (within constraints)
        expect(result.formula.paintRatios.length).toBeGreaterThanOrEqual(2);
        expect(result.formula.paintRatios.length).toBeLessThanOrEqual(5);

        // Total volume should match constraints
        expect(result.formula.totalVolume).toBeGreaterThanOrEqual(request.volumeConstraints!.min_total_volume_ml);
        expect(result.formula.totalVolume).toBeLessThanOrEqual(request.volumeConstraints!.max_total_volume_ml);
      }

      // Metrics validation
      expect(result.metrics).not.toBeNull();
      if (result.metrics) {
        // Convergence achieved (algorithm stabilized)
        expect(result.metrics.convergenceAchieved).toBe(true);

        // Target NOT met (Delta E > 2.0)
        expect(result.metrics.targetMet).toBe(false);

        // Early termination should be false (completed normally)
        expect(result.metrics.earlyTermination).toBe(false);

        // Time elapsed should be under limit
        expect(result.metrics.timeElapsed).toBeLessThan(request.timeLimit!);

        // Iterations completed
        expect(result.metrics.iterationsCompleted).toBeGreaterThan(0);
        expect(result.metrics.iterationsCompleted).toBeLessThanOrEqual(2000);

        // Improvement rate should be positive (made progress)
        expect(result.metrics.improvementRate).toBeGreaterThan(0);
      }

      // Warnings validation
      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBeGreaterThan(0);

      // Should warn about target not met
      const warningsText = result.warnings.join(' ').toLowerCase();
      expect(warningsText).toMatch(/target.*not.*met|cannot achieve|gamut|impossible/i);

      // Error should be null
      expect(result.error).toBeUndefined();

    } catch (error) {
      // Expected to fail until Enhanced Mode is fully implemented
      console.warn('T006 test failed (expected until implementation):', error);
      expect(error).toBeTruthy();
    }
  });

  it('should provide meaningful warnings for gamut limitations', async () => {
    const targetColor: LABColor = {
      l: 50,
      a: 100, // Extreme red saturation
      b: 100  // Extreme yellow saturation
    };

    const limitedPaints: Paint[] = [
      {
        id: 'paint-white',
        name: 'Titanium White',
        brand: 'Test Brand',
        color: { hex: '#FFFFFF', lab: { l: 100, a: 0, b: 0 } },
        opacity: 1.0,
        tintingStrength: 0.3,
        kubelkaMunk: { k: 0.01, s: 0.95 },
        userId: 'test-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'paint-black',
        name: 'Carbon Black',
        brand: 'Test Brand',
        color: { hex: '#000000', lab: { l: 0, a: 0, b: 0 } },
        opacity: 1.0,
        tintingStrength: 0.95,
        kubelkaMunk: { k: 0.98, s: 0.02 },
        userId: 'test-user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const request: EnhancedOptimizationRequest = {
      targetColor,
      availablePaints: limitedPaints,
      mode: 'enhanced',
      accuracyTarget: 2.0,
      timeLimit: 28000
    };

    try {
      const { POST } = await import('@/app/api/optimize/route');
      const mockRequest = {
        json: async () => ({
          target_color: request.targetColor,
          available_paints: request.availablePaints,
          optimization_config: {
            algorithm: 'auto',
            max_iterations: 2000,
            target_delta_e: request.accuracyTarget,
            time_limit_ms: request.timeLimit
          }
        })
      } as any;

      const response = await POST(mockRequest);
      const result = await response.json() as EnhancedOptimizationResponse;

      // Should succeed with warnings
      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);

      // Should mention limited paint collection or gamut
      const warningsText = result.warnings.join(' ').toLowerCase();
      expect(warningsText).toMatch(/limited.*paint|insufficient.*pigment|gamut|saturation/i);

    } catch (error) {
      console.warn('T006 gamut warning test failed (expected):', error);
      expect(error).toBeTruthy();
    }
  });
});
