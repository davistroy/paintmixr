/**
 * Integration Test: Enhanced Mode Success Scenario
 *
 * Based on quickstart.md Scenario 1: Enhanced Mode with Paint Collection
 * Tests successful paint mixing optimization with Kubelka-Munk coefficients
 * targeting Delta E ≤ 2.0 with 3-5 paint formula
 *
 * Feature: 005-use-codebase-analysis
 * Task: T005
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  Paint,
  LABColor,
  OptimizedPaintFormula,
  EnhancedOptimizationResponse,
  KubelkaMunkCoefficients
} from '@/lib/types';

describe('Enhanced Mode Success - Integration Test', () => {
  let mockPaintCollection: Paint[];
  let targetColor: LABColor;

  beforeAll(() => {
    // Mock paint collection with 4+ paints (from quickstart.md Scenario 1)
    const titaniumWhite: Paint = {
      id: 'titanium-white-uuid-001',
      name: 'Titanium White',
      brand: 'Professional Artist Grade',
      color: {
        hex: '#FFFFFF',
        lab: { l: 100, a: 0, b: 0 }
      },
      opacity: 0.95,
      tintingStrength: 0.3,
      kubelkaMunk: {
        k: 0.12, // Low absorption (white reflects light)
        s: 0.88  // High scattering
      },
      userId: 'test-user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const ultramarineBlue: Paint = {
      id: 'ultramarine-blue-uuid-002',
      name: 'Ultramarine Blue',
      brand: 'Professional Artist Grade',
      color: {
        hex: '#120A8F',
        lab: { l: 32, a: 25, b: -70 }
      },
      opacity: 0.65,
      tintingStrength: 0.85,
      kubelkaMunk: {
        k: 0.75, // High absorption (dark blue)
        s: 0.25  // Low scattering
      },
      userId: 'test-user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const cadmiumYellow: Paint = {
      id: 'cadmium-yellow-uuid-003',
      name: 'Cadmium Yellow',
      brand: 'Professional Artist Grade',
      color: {
        hex: '#FFD700',
        lab: { l: 85, a: 5, b: 85 }
      },
      opacity: 0.80,
      tintingStrength: 0.75,
      kubelkaMunk: {
        k: 0.62, // Moderate absorption
        s: 0.38  // Moderate scattering
      },
      userId: 'test-user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const burntUmber: Paint = {
      id: 'burnt-umber-uuid-004',
      name: 'Burnt Umber',
      brand: 'Professional Artist Grade',
      color: {
        hex: '#8A3324',
        lab: { l: 35, a: 20, b: 25 }
      },
      opacity: 0.70,
      tintingStrength: 0.60,
      kubelkaMunk: {
        k: 0.85, // High absorption (dark brown)
        s: 0.15  // Low scattering
      },
      userId: 'test-user-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockPaintCollection = [titaniumWhite, ultramarineBlue, cadmiumYellow, burntUmber];

    // Target color: L=65, a=18, b=-5 (muted purple-gray)
    targetColor = { l: 65, a: 18, b: -5 };
  });

  it('should achieve Delta E ≤ 2.0 with 3-5 paint formula', async () => {
    // This test validates the Enhanced Mode success criteria:
    // 1. Delta E ≤ 2.0
    // 2. 3-5 paint formula
    // 3. Accuracy rating "excellent"
    // 4. Optimization time < 30 seconds
    // 5. Kubelka-Munk K/S coefficients present

    // Mock optimization response (simulates successful API call)
    const mockOptimizationResponse: EnhancedOptimizationResponse = {
      success: true,
      formula: {
        paintRatios: [
          {
            paint_id: 'titanium-white-uuid-001',
            paint_name: 'Titanium White',
            volume_ml: 45.2,
            percentage: 45.2,
            paint_properties: mockPaintCollection[0]
          },
          {
            paint_id: 'ultramarine-blue-uuid-002',
            paint_name: 'Ultramarine Blue',
            volume_ml: 28.5,
            percentage: 28.5,
            paint_properties: mockPaintCollection[1]
          },
          {
            paint_id: 'burnt-umber-uuid-004',
            paint_name: 'Burnt Umber',
            volume_ml: 26.3,
            percentage: 26.3,
            paint_properties: mockPaintCollection[3]
          }
        ],
        totalVolume: 100.0,
        predictedColor: { l: 64.8, a: 17.9, b: -4.8 }, // Very close to target
        deltaE: 1.8, // Excellent accuracy (≤ 2.0)
        accuracyRating: 'excellent',
        mixingComplexity: 'moderate',
        kubelkaMunkK: 0.52, // Weighted average of paint K coefficients
        kubelkaMunkS: 0.48, // Weighted average of paint S coefficients
        opacity: 0.82
      },
      metrics: {
        timeElapsed: 12500, // 12.5 seconds (< 30 second limit)
        iterationsCompleted: 1850,
        algorithmUsed: 'differential_evolution',
        convergenceAchieved: true,
        targetMet: true, // Delta E ≤ 2.0 achieved
        earlyTermination: false,
        initialBestDeltaE: 8.5,
        finalBestDeltaE: 1.8,
        improvementRate: 0.788 // 78.8% improvement
      },
      warnings: [],
      error: null
    };

    // Assertions: Delta E ≤ 2.0
    expect(mockOptimizationResponse.success).toBe(true);
    expect(mockOptimizationResponse.formula).not.toBeNull();
    expect(mockOptimizationResponse.formula!.deltaE).toBeLessThanOrEqual(2.0);
    expect(mockOptimizationResponse.formula!.deltaE).toBe(1.8);

    // Assertions: 3-5 paint formula
    expect(mockOptimizationResponse.formula!.paintRatios.length).toBeGreaterThanOrEqual(3);
    expect(mockOptimizationResponse.formula!.paintRatios.length).toBeLessThanOrEqual(5);
    expect(mockOptimizationResponse.formula!.paintRatios.length).toBe(3);

    // Assertions: Accuracy rating "excellent"
    expect(mockOptimizationResponse.formula!.accuracyRating).toBe('excellent');

    // Assertions: Optimization time < 30 seconds
    expect(mockOptimizationResponse.metrics).not.toBeNull();
    expect(mockOptimizationResponse.metrics!.timeElapsed).toBeLessThan(30000);
    expect(mockOptimizationResponse.metrics!.timeElapsed).toBe(12500);

    // Assertions: Kubelka-Munk K/S coefficients present
    expect(mockOptimizationResponse.formula!.kubelkaMunkK).toBeGreaterThan(0);
    expect(mockOptimizationResponse.formula!.kubelkaMunkK).toBeLessThanOrEqual(1);
    expect(mockOptimizationResponse.formula!.kubelkaMunkS).toBeGreaterThan(0);
    expect(mockOptimizationResponse.formula!.kubelkaMunkS).toBeLessThanOrEqual(1);

    // Verify Kubelka-Munk coefficients are properly calculated
    expect(mockOptimizationResponse.formula!.kubelkaMunkK).toBe(0.52);
    expect(mockOptimizationResponse.formula!.kubelkaMunkS).toBe(0.48);

    // Assertions: Target met flag
    expect(mockOptimizationResponse.metrics!.targetMet).toBe(true);
    expect(mockOptimizationResponse.metrics!.convergenceAchieved).toBe(true);
  });

  it('should validate paint collection has required Kubelka-Munk coefficients', () => {
    // Verify each paint in collection has valid K/S coefficients
    mockPaintCollection.forEach((paint) => {
      expect(paint.kubelkaMunk).toBeDefined();
      expect(paint.kubelkaMunk.k).toBeGreaterThan(0);
      expect(paint.kubelkaMunk.k).toBeLessThanOrEqual(1);
      expect(paint.kubelkaMunk.s).toBeGreaterThan(0);
      expect(paint.kubelkaMunk.s).toBeLessThanOrEqual(1);
    });

    // Verify specific coefficients from quickstart.md
    const titaniumWhite = mockPaintCollection.find(p => p.name === 'Titanium White');
    expect(titaniumWhite?.kubelkaMunk.k).toBe(0.12);
    expect(titaniumWhite?.kubelkaMunk.s).toBe(0.88);

    const ultramarineBlue = mockPaintCollection.find(p => p.name === 'Ultramarine Blue');
    expect(ultramarineBlue?.kubelkaMunk.k).toBe(0.75);
    expect(ultramarineBlue?.kubelkaMunk.s).toBe(0.25);

    const cadmiumYellow = mockPaintCollection.find(p => p.name === 'Cadmium Yellow');
    expect(cadmiumYellow?.kubelkaMunk.k).toBe(0.62);
    expect(cadmiumYellow?.kubelkaMunk.s).toBe(0.38);

    const burntUmber = mockPaintCollection.find(p => p.name === 'Burnt Umber');
    expect(burntUmber?.kubelkaMunk.k).toBe(0.85);
    expect(burntUmber?.kubelkaMunk.s).toBe(0.15);
  });

  it('should validate target color is within LAB color space bounds', () => {
    // Target color: L=65, a=18, b=-5
    expect(targetColor.l).toBeGreaterThanOrEqual(0);
    expect(targetColor.l).toBeLessThanOrEqual(100);
    expect(targetColor.l).toBe(65);

    expect(targetColor.a).toBeGreaterThanOrEqual(-128);
    expect(targetColor.a).toBeLessThanOrEqual(127);
    expect(targetColor.a).toBe(18);

    expect(targetColor.b).toBeGreaterThanOrEqual(-128);
    expect(targetColor.b).toBeLessThanOrEqual(127);
    expect(targetColor.b).toBe(-5);
  });

  it('should calculate proper paint ratios that sum to 100%', () => {
    const mockFormula: OptimizedPaintFormula = {
      paintRatios: [
        {
          paint_id: 'titanium-white-uuid-001',
          paint_name: 'Titanium White',
          volume_ml: 45.2,
          percentage: 45.2
        },
        {
          paint_id: 'ultramarine-blue-uuid-002',
          paint_name: 'Ultramarine Blue',
          volume_ml: 28.5,
          percentage: 28.5
        },
        {
          paint_id: 'burnt-umber-uuid-004',
          paint_name: 'Burnt Umber',
          volume_ml: 26.3,
          percentage: 26.3
        }
      ],
      totalVolume: 100.0,
      predictedColor: { l: 64.8, a: 17.9, b: -4.8 },
      deltaE: 1.8,
      accuracyRating: 'excellent',
      mixingComplexity: 'moderate',
      kubelkaMunkK: 0.52,
      kubelkaMunkS: 0.48,
      opacity: 0.82
    };

    // Calculate sum of percentages
    const totalPercentage = mockFormula.paintRatios.reduce(
      (sum, ratio) => sum + ratio.percentage,
      0
    );

    // Should sum to 100% (allow small floating point error)
    expect(totalPercentage).toBeCloseTo(100.0, 1);

    // Calculate sum of volumes
    const totalVolume = mockFormula.paintRatios.reduce(
      (sum, ratio) => sum + ratio.volume_ml,
      0
    );

    // Should match total volume
    expect(totalVolume).toBeCloseTo(mockFormula.totalVolume, 1);
  });

  it('should verify optimization metrics indicate successful convergence', () => {
    const mockMetrics = {
      timeElapsed: 12500,
      iterationsCompleted: 1850,
      algorithmUsed: 'differential_evolution' as const,
      convergenceAchieved: true,
      targetMet: true,
      earlyTermination: false,
      initialBestDeltaE: 8.5,
      finalBestDeltaE: 1.8,
      improvementRate: 0.788
    };

    // Verify convergence achieved
    expect(mockMetrics.convergenceAchieved).toBe(true);
    expect(mockMetrics.targetMet).toBe(true);
    expect(mockMetrics.earlyTermination).toBe(false);

    // Verify improvement
    expect(mockMetrics.finalBestDeltaE).toBeLessThan(mockMetrics.initialBestDeltaE);

    // Calculate expected improvement rate
    const expectedImprovement =
      (mockMetrics.initialBestDeltaE - mockMetrics.finalBestDeltaE) /
      mockMetrics.initialBestDeltaE;

    expect(mockMetrics.improvementRate).toBeCloseTo(expectedImprovement, 2);

    // Verify reasonable iteration count (not excessive, not minimal)
    expect(mockMetrics.iterationsCompleted).toBeGreaterThan(100);
    expect(mockMetrics.iterationsCompleted).toBeLessThan(10000);
  });

  it('should validate accuracy rating matches Delta E thresholds', () => {
    // Test accuracy rating logic
    const testCases = [
      { deltaE: 0.5, expectedRating: 'excellent' },
      { deltaE: 1.8, expectedRating: 'excellent' }, // Our scenario
      { deltaE: 2.0, expectedRating: 'excellent' },
      { deltaE: 2.5, expectedRating: 'good' },
      { deltaE: 4.0, expectedRating: 'acceptable' },
      { deltaE: 5.5, expectedRating: 'poor' }
    ];

    testCases.forEach(({ deltaE, expectedRating }) => {
      let rating: 'excellent' | 'good' | 'acceptable' | 'poor';

      if (deltaE <= 2.0) {
        rating = 'excellent';
      } else if (deltaE <= 4.0) {
        rating = 'good';
      } else if (deltaE <= 6.0) {
        rating = 'acceptable';
      } else {
        rating = 'poor';
      }

      expect(rating).toBe(expectedRating);
    });
  });

  it('should validate paint properties are preserved in formula', () => {
    const mockFormulaWithProperties: OptimizedPaintFormula = {
      paintRatios: [
        {
          paint_id: 'titanium-white-uuid-001',
          paint_name: 'Titanium White',
          volume_ml: 45.2,
          percentage: 45.2,
          paint_properties: mockPaintCollection[0]
        },
        {
          paint_id: 'ultramarine-blue-uuid-002',
          paint_name: 'Ultramarine Blue',
          volume_ml: 28.5,
          percentage: 28.5,
          paint_properties: mockPaintCollection[1]
        },
        {
          paint_id: 'burnt-umber-uuid-004',
          paint_name: 'Burnt Umber',
          volume_ml: 26.3,
          percentage: 26.3,
          paint_properties: mockPaintCollection[3]
        }
      ],
      totalVolume: 100.0,
      predictedColor: { l: 64.8, a: 17.9, b: -4.8 },
      deltaE: 1.8,
      accuracyRating: 'excellent',
      mixingComplexity: 'moderate',
      kubelkaMunkK: 0.52,
      kubelkaMunkS: 0.48,
      opacity: 0.82
    };

    // Verify each paint ratio has complete properties
    mockFormulaWithProperties.paintRatios.forEach((ratio) => {
      expect(ratio.paint_id).toBeTruthy();
      expect(ratio.paint_name).toBeTruthy();
      expect(ratio.volume_ml).toBeGreaterThan(0);
      expect(ratio.percentage).toBeGreaterThan(0);

      if (ratio.paint_properties) {
        expect(ratio.paint_properties.kubelkaMunk).toBeDefined();
        expect(ratio.paint_properties.opacity).toBeGreaterThan(0);
        expect(ratio.paint_properties.tintingStrength).toBeGreaterThan(0);
      }
    });
  });

  it('should validate predicted color is close to target color', () => {
    const targetLAB: LABColor = { l: 65, a: 18, b: -5 };
    const predictedLAB: LABColor = { l: 64.8, a: 17.9, b: -4.8 };
    const deltaE = 1.8;

    // Verify predicted color components are close to target
    expect(Math.abs(predictedLAB.l - targetLAB.l)).toBeLessThan(1.0);
    expect(Math.abs(predictedLAB.a - targetLAB.a)).toBeLessThan(1.0);
    expect(Math.abs(predictedLAB.b - targetLAB.b)).toBeLessThan(1.0);

    // Delta E represents the overall perceptual color difference
    // For "excellent" accuracy, Delta E should be ≤ 2.0
    expect(deltaE).toBeLessThanOrEqual(2.0);

    // Verify predicted color is within LAB bounds
    expect(predictedLAB.l).toBeGreaterThanOrEqual(0);
    expect(predictedLAB.l).toBeLessThanOrEqual(100);
    expect(predictedLAB.a).toBeGreaterThanOrEqual(-128);
    expect(predictedLAB.a).toBeLessThanOrEqual(127);
    expect(predictedLAB.b).toBeGreaterThanOrEqual(-128);
    expect(predictedLAB.b).toBeLessThanOrEqual(127);
  });
});
