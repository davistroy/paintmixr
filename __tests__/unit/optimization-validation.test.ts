/**
 * Optimization Validation Schemas Unit Tests (T024)
 * Feature: 007-enhanced-mode-1
 *
 * Tests for Zod validation schemas for Enhanced Optimization API including:
 * - LAB color schema validation (L: 0-100, a/b: -128-127)
 * - Paint schema validation (Kubelka-Munk coefficients 0-1)
 * - Volume constraints schema validation (min/max relationships)
 * - Enhanced optimization request schema (complete validation)
 * - Formula and metrics response schemas
 * - Custom refinements (constraint relationships)
 * - Error message formatting
 *
 * Target: >95% code coverage (validation is critical)
 * File Under Test: src/lib/mixing-optimization/validation.ts
 */

import { describe, it, expect } from '@jest/globals';
import { ZodError } from 'zod';
import {
  labColorSchema,
  kubelkaMunkCoefficientsSchema,
  colorValueSchema,
  paintSchema,
  volumeConstraintsSchema,
  enhancedOptimizationRequestSchema,
  paintRatioSchema,
  optimizedPaintFormulaSchema,
  optimizationPerformanceMetricsSchema,
  enhancedOptimizationResponseSchema,
  validateWithSchema,
  safeValidateWithSchema,
  formatZodError
} from '@/lib/mixing-optimization/validation';

describe('LAB Color Schema Validation', () => {
  describe('Valid LAB Colors', () => {
    it('should accept valid LAB color', () => {
      const color = { l: 50, a: 0, b: 0 };
      const result = labColorSchema.safeParse(color);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(color);
      }
    });

    it('should accept boundary values', () => {
      const colors = [
        { l: 0, a: -128, b: -128 },    // Minimum
        { l: 100, a: 127, b: 127 },    // Maximum
        { l: 0, a: 0, b: 0 },          // Black
        { l: 100, a: 0, b: 0 }         // White
      ];

      colors.forEach(color => {
        const result = labColorSchema.safeParse(color);
        expect(result.success).toBe(true);
      });
    });

    it('should accept decimal values', () => {
      const color = { l: 65.5, a: 18.2, b: -5.7 };
      const result = labColorSchema.safeParse(color);

      expect(result.success).toBe(true);
    });
  });

  describe('Invalid LAB Colors', () => {
    it('should reject l < 0', () => {
      const color = { l: -10, a: 0, b: 0 };
      const result = labColorSchema.safeParse(color);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Lightness (l) must be >= 0');
      }
    });

    it('should reject l > 100', () => {
      const color = { l: 150, a: 0, b: 0 };
      const result = labColorSchema.safeParse(color);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('Lightness (l) must be <= 100');
      }
    });

    it('should reject a < -128', () => {
      const color = { l: 50, a: -200, b: 0 };
      const result = labColorSchema.safeParse(color);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('a-axis must be >= -128');
      }
    });

    it('should reject a > 127', () => {
      const color = { l: 50, a: 200, b: 0 };
      const result = labColorSchema.safeParse(color);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('a-axis must be <= 127');
      }
    });

    it('should reject b < -128', () => {
      const color = { l: 50, a: 0, b: -200 };
      const result = labColorSchema.safeParse(color);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('b-axis must be >= -128');
      }
    });

    it('should reject b > 127', () => {
      const color = { l: 50, a: 0, b: 200 };
      const result = labColorSchema.safeParse(color);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('b-axis must be <= 127');
      }
    });

    it('should reject missing fields', () => {
      const colors = [
        { a: 0, b: 0 },       // Missing l
        { l: 50, b: 0 },      // Missing a
        { l: 50, a: 0 }       // Missing b
      ];

      colors.forEach(color => {
        const result = labColorSchema.safeParse(color);
        expect(result.success).toBe(false);
      });
    });
  });
});

describe('Kubelka-Munk Coefficients Schema Validation', () => {
  it('should accept valid K-M coefficients', () => {
    const km = { k: 0.5, s: 0.6 };
    const result = kubelkaMunkCoefficientsSchema.safeParse(km);

    expect(result.success).toBe(true);
  });

  it('should accept boundary values (0 and 1)', () => {
    const coefficients = [
      { k: 0, s: 0 },
      { k: 1, s: 1 },
      { k: 0, s: 1 },
      { k: 1, s: 0 }
    ];

    coefficients.forEach(km => {
      const result = kubelkaMunkCoefficientsSchema.safeParse(km);
      expect(result.success).toBe(true);
    });
  });

  it('should reject k < 0', () => {
    const km = { k: -0.1, s: 0.5 };
    const result = kubelkaMunkCoefficientsSchema.safeParse(km);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Absorption coefficient (k) must be >= 0');
    }
  });

  it('should reject k > 1', () => {
    const km = { k: 1.5, s: 0.5 };
    const result = kubelkaMunkCoefficientsSchema.safeParse(km);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Absorption coefficient (k) must be <= 1');
    }
  });

  it('should reject s < 0', () => {
    const km = { k: 0.5, s: -0.1 };
    const result = kubelkaMunkCoefficientsSchema.safeParse(km);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Scattering coefficient (s) must be >= 0');
    }
  });

  it('should reject s > 1', () => {
    const km = { k: 0.5, s: 1.5 };
    const result = kubelkaMunkCoefficientsSchema.safeParse(km);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Scattering coefficient (s) must be <= 1');
    }
  });
});

describe('Paint Schema Validation', () => {
  const validPaint = {
    id: 'paint-123',
    name: 'Titanium White',
    brand: 'Test Brand',
    color: {
      hex: '#FFFFFF',
      lab: { l: 95, a: 0, b: 0 }
    },
    opacity: 0.8,
    tintingStrength: 0.7,
    kubelkaMunk: { k: 0.5, s: 0.6 },
    userId: 'user-456',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  };

  it('should accept valid paint', () => {
    const result = paintSchema.safeParse(validPaint);
    expect(result.success).toBe(true);
  });

  it('should reject invalid hex color format', () => {
    const paint = { ...validPaint, color: { ...validPaint.color, hex: 'FFFFFF' } };
    const result = paintSchema.safeParse(paint);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('hex must be in format #RRGGBB');
    }
  });

  it('should reject opacity < 0', () => {
    const paint = { ...validPaint, opacity: -0.1 };
    const result = paintSchema.safeParse(paint);

    expect(result.success).toBe(false);
  });

  it('should reject opacity > 1', () => {
    const paint = { ...validPaint, opacity: 1.5 };
    const result = paintSchema.safeParse(paint);

    expect(result.success).toBe(false);
  });

  it('should reject tintingStrength < 0', () => {
    const paint = { ...validPaint, tintingStrength: -0.1 };
    const result = paintSchema.safeParse(paint);

    expect(result.success).toBe(false);
  });

  it('should reject tintingStrength > 1', () => {
    const paint = { ...validPaint, tintingStrength: 1.2 };
    const result = paintSchema.safeParse(paint);

    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const requiredFields = ['id', 'name', 'brand', 'color', 'opacity', 'tintingStrength', 'kubelkaMunk', 'userId'];

    requiredFields.forEach(field => {
      const paint = { ...validPaint };
      delete (paint as any)[field];
      const result = paintSchema.safeParse(paint);
      expect(result.success).toBe(false);
    });
  });
});

describe('Volume Constraints Schema Validation', () => {
  it('should accept valid volume constraints', () => {
    const constraints = {
      min_total_volume_ml: 100,
      max_total_volume_ml: 500,
      minimum_component_volume_ml: 5,
      maximum_component_volume_ml: 450,
      allow_scaling: true
    };

    const result = volumeConstraintsSchema.safeParse(constraints);
    expect(result.success).toBe(true);
  });

  it('should accept optional fields omitted', () => {
    const constraints = {
      min_total_volume_ml: 100,
      max_total_volume_ml: 500
    };

    const result = volumeConstraintsSchema.safeParse(constraints);
    expect(result.success).toBe(true);
  });

  it('should reject max < min total volume', () => {
    const constraints = {
      min_total_volume_ml: 500,
      max_total_volume_ml: 100
    };

    const result = volumeConstraintsSchema.safeParse(constraints);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('max_total_volume_ml must be >= min_total_volume_ml');
    }
  });

  it('should reject max < min component volume', () => {
    const constraints = {
      min_total_volume_ml: 100,
      max_total_volume_ml: 500,
      minimum_component_volume_ml: 50,
      maximum_component_volume_ml: 10
    };

    const result = volumeConstraintsSchema.safeParse(constraints);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('maximum_component_volume_ml must be >= minimum_component_volume_ml');
    }
  });

  it('should reject non-positive volumes', () => {
    const constraints = [
      { min_total_volume_ml: 0, max_total_volume_ml: 100 },
      { min_total_volume_ml: -50, max_total_volume_ml: 100 },
      { min_total_volume_ml: 100, max_total_volume_ml: 0 }
    ];

    constraints.forEach(c => {
      const result = volumeConstraintsSchema.safeParse(c);
      expect(result.success).toBe(false);
    });
  });
});

describe('Enhanced Optimization Request Schema Validation', () => {
  const validRequest = {
    targetColor: { l: 65, a: 18, b: -5 },
    availablePaints: ['paint-1', 'paint-2', 'paint-3'],
    mode: 'enhanced' as const,
    volumeConstraints: {
      min_total_volume_ml: 100,
      max_total_volume_ml: 500
    },
    maxPaintCount: 5,
    timeLimit: 28000,
    accuracyTarget: 2.0
  };

  it('should accept valid request', () => {
    const result = enhancedOptimizationRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('should accept minimal request (only required fields)', () => {
    const request = {
      targetColor: { l: 50, a: 0, b: 0 },
      availablePaints: ['paint-1', 'paint-2'],
      mode: 'standard' as const
    };

    const result = enhancedOptimizationRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it('should accept both standard and enhanced modes', () => {
    const modes = ['standard', 'enhanced'] as const;

    modes.forEach(mode => {
      const request = { ...validRequest, mode };
      const result = enhancedOptimizationRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid mode', () => {
    const request = { ...validRequest, mode: 'fast' };
    const result = enhancedOptimizationRequestSchema.safeParse(request);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('mode must be "standard" or "enhanced"');
    }
  });

  it('should reject < 2 paints', () => {
    const request = { ...validRequest, availablePaints: ['paint-1'] };
    const result = enhancedOptimizationRequestSchema.safeParse(request);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('At least 2 paints required');
    }
  });

  it('should reject > 100 paints', () => {
    const request = { ...validRequest, availablePaints: Array(101).fill('paint-id') };
    const result = enhancedOptimizationRequestSchema.safeParse(request);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Maximum 100 paints allowed');
    }
  });

  it('should reject maxPaintCount < 2', () => {
    const request = { ...validRequest, maxPaintCount: 1 };
    const result = enhancedOptimizationRequestSchema.safeParse(request);

    expect(result.success).toBe(false);
  });

  it('should reject maxPaintCount > 5', () => {
    const request = { ...validRequest, maxPaintCount: 6 };
    const result = enhancedOptimizationRequestSchema.safeParse(request);

    expect(result.success).toBe(false);
  });

  it('should reject timeLimit > 30000ms', () => {
    const request = { ...validRequest, timeLimit: 35000 };
    const result = enhancedOptimizationRequestSchema.safeParse(request);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('timeLimit must not exceed 30000ms');
    }
  });

  it('should reject negative accuracyTarget', () => {
    const request = { ...validRequest, accuracyTarget: -1.0 };
    const result = enhancedOptimizationRequestSchema.safeParse(request);

    expect(result.success).toBe(false);
  });

  it('should reject empty paint ID', () => {
    const request = { ...validRequest, availablePaints: ['paint-1', '', 'paint-3'] };
    const result = enhancedOptimizationRequestSchema.safeParse(request);

    expect(result.success).toBe(false);
  });
});

describe('Optimized Paint Formula Schema Validation', () => {
  const validFormula = {
    paintRatios: [
      { paint_id: 'p1', volume_ml: 50, percentage: 50 },
      { paint_id: 'p2', volume_ml: 50, percentage: 50 }
    ],
    totalVolume: 100,
    predictedColor: { l: 65, a: 18, b: -5 },
    deltaE: 1.5,
    accuracyRating: 'excellent' as const,
    mixingComplexity: 'simple' as const,
    kubelkaMunkK: 0.5,
    kubelkaMunkS: 0.6,
    opacity: 0.8
  };

  it('should accept valid formula', () => {
    const result = optimizedPaintFormulaSchema.safeParse(validFormula);
    expect(result.success).toBe(true);
  });

  it('should accept 2-5 paint formulas', () => {
    const paintCounts = [2, 3, 4, 5];

    paintCounts.forEach(count => {
      const paintRatios = Array.from({ length: count }, (_, i) => ({
        paint_id: `p${i}`,
        volume_ml: 100 / count,
        percentage: 100 / count
      }));

      const formula = { ...validFormula, paintRatios };
      const result = optimizedPaintFormulaSchema.safeParse(formula);
      expect(result.success).toBe(true);
    });
  });

  it('should reject < 2 paints', () => {
    const formula = {
      ...validFormula,
      paintRatios: [{ paint_id: 'p1', volume_ml: 100, percentage: 100 }]
    };

    const result = optimizedPaintFormulaSchema.safeParse(formula);
    expect(result.success).toBe(false);
  });

  it('should reject > 5 paints', () => {
    const formula = {
      ...validFormula,
      paintRatios: Array(6).fill(0).map((_, i) => ({
        paint_id: `p${i}`,
        volume_ml: 100 / 6,
        percentage: 100 / 6
      }))
    };

    const result = optimizedPaintFormulaSchema.safeParse(formula);
    expect(result.success).toBe(false);
  });

  it('should accept all accuracy ratings', () => {
    const ratings = ['excellent', 'good', 'acceptable', 'poor'] as const;

    ratings.forEach(accuracyRating => {
      const formula = { ...validFormula, accuracyRating };
      const result = optimizedPaintFormulaSchema.safeParse(formula);
      expect(result.success).toBe(true);
    });
  });

  it('should accept all mixing complexities', () => {
    const complexities = ['simple', 'moderate', 'complex'] as const;

    complexities.forEach(mixingComplexity => {
      const formula = { ...validFormula, mixingComplexity };
      const result = optimizedPaintFormulaSchema.safeParse(formula);
      expect(result.success).toBe(true);
    });
  });

  it('should reject negative deltaE', () => {
    const formula = { ...validFormula, deltaE: -1.0 };
    const result = optimizedPaintFormulaSchema.safeParse(formula);

    expect(result.success).toBe(false);
  });

  it('should reject K-M coefficients outside [0, 1]', () => {
    const formulas = [
      { ...validFormula, kubelkaMunkK: -0.1 },
      { ...validFormula, kubelkaMunkK: 1.5 },
      { ...validFormula, kubelkaMunkS: -0.1 },
      { ...validFormula, kubelkaMunkS: 1.5 },
      { ...validFormula, opacity: -0.1 },
      { ...validFormula, opacity: 1.5 }
    ];

    formulas.forEach(formula => {
      const result = optimizedPaintFormulaSchema.safeParse(formula);
      expect(result.success).toBe(false);
    });
  });
});

describe('Optimization Performance Metrics Schema Validation', () => {
  const validMetrics = {
    timeElapsed: 5000,
    iterationsCompleted: 150,
    algorithmUsed: 'differential_evolution' as const,
    convergenceAchieved: true,
    targetMet: true,
    earlyTermination: false,
    initialBestDeltaE: 25.0,
    finalBestDeltaE: 1.5,
    improvementRate: 0.94
  };

  it('should accept valid metrics', () => {
    const result = optimizationPerformanceMetricsSchema.safeParse(validMetrics);
    expect(result.success).toBe(true);
  });

  it('should accept all algorithm types', () => {
    const algorithms = ['differential_evolution', 'tpe_hybrid', 'auto'] as const;

    algorithms.forEach(algorithmUsed => {
      const metrics = { ...validMetrics, algorithmUsed };
      const result = optimizationPerformanceMetricsSchema.safeParse(metrics);
      expect(result.success).toBe(true);
    });
  });

  it('should reject negative timeElapsed', () => {
    const metrics = { ...validMetrics, timeElapsed: -100 };
    const result = optimizationPerformanceMetricsSchema.safeParse(metrics);

    expect(result.success).toBe(false);
  });

  it('should reject negative iterationsCompleted', () => {
    const metrics = { ...validMetrics, iterationsCompleted: -10 };
    const result = optimizationPerformanceMetricsSchema.safeParse(metrics);

    expect(result.success).toBe(false);
  });

  it('should reject negative Delta E values', () => {
    const metricsVariants = [
      { ...validMetrics, initialBestDeltaE: -5.0 },
      { ...validMetrics, finalBestDeltaE: -1.0 }
    ];

    metricsVariants.forEach(metrics => {
      const result = optimizationPerformanceMetricsSchema.safeParse(metrics);
      expect(result.success).toBe(false);
    });
  });

  it('should accept non-integer iterations count', () => {
    const metrics = { ...validMetrics, iterationsCompleted: 150.5 };
    const result = optimizationPerformanceMetricsSchema.safeParse(metrics);

    expect(result.success).toBe(false); // Must be integer
  });
});

describe('Enhanced Optimization Response Schema Validation', () => {
  const validResponse = {
    success: true,
    formula: {
      paintRatios: [
        { paint_id: 'p1', volume_ml: 50, percentage: 50 },
        { paint_id: 'p2', volume_ml: 50, percentage: 50 }
      ],
      totalVolume: 100,
      predictedColor: { l: 65, a: 18, b: -5 },
      deltaE: 1.5,
      accuracyRating: 'excellent' as const,
      mixingComplexity: 'simple' as const,
      kubelkaMunkK: 0.5,
      kubelkaMunkS: 0.6,
      opacity: 0.8
    },
    metrics: {
      timeElapsed: 5000,
      iterationsCompleted: 150,
      algorithmUsed: 'differential_evolution' as const,
      convergenceAchieved: true,
      targetMet: true,
      earlyTermination: false,
      initialBestDeltaE: 25.0,
      finalBestDeltaE: 1.5,
      improvementRate: 0.94
    },
    warnings: []
  };

  it('should accept valid response', () => {
    const result = enhancedOptimizationResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should accept response with warnings', () => {
    const response = {
      ...validResponse,
      warnings: ['Target not met', 'Optimization timed out']
    };

    const result = enhancedOptimizationResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const response = {
      success: false,
      formula: null,
      metrics: null,
      warnings: [],
      error: 'Optimization failed: Invalid paints'
    };

    const result = enhancedOptimizationResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it('should accept null formula and metrics on error', () => {
    const response = {
      success: false,
      formula: null,
      metrics: null,
      warnings: ['Validation failed'],
      error: 'Invalid request'
    };

    const result = enhancedOptimizationResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe('Validation Helper Functions', () => {
  describe('validateWithSchema', () => {
    it('should return validated data on success', () => {
      const color = { l: 50, a: 0, b: 0 };
      const result = validateWithSchema(labColorSchema, color);

      expect(result).toEqual(color);
    });

    it('should throw ZodError on validation failure', () => {
      const color = { l: -10, a: 0, b: 0 };

      expect(() => validateWithSchema(labColorSchema, color)).toThrow(ZodError);
    });
  });

  describe('safeValidateWithSchema', () => {
    it('should return success object on valid data', () => {
      const color = { l: 50, a: 0, b: 0 };
      const result = safeValidateWithSchema(labColorSchema, color);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(color);
      }
    });

    it('should return error object on invalid data', () => {
      const color = { l: -10, a: 0, b: 0 };
      const result = safeValidateWithSchema(labColorSchema, color);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });
  });

  describe('formatZodError', () => {
    it('should format single error', () => {
      const color = { l: -10, a: 0, b: 0 };
      const result = labColorSchema.safeParse(color);

      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toContain('Validation failed');
        expect(formatted).toContain('l');
        expect(formatted).toContain('Lightness');
      }
    });

    it('should format multiple errors', () => {
      const paint = {
        id: '',
        name: '',
        brand: '',
        color: { hex: 'invalid', lab: { l: -10, a: 200, b: -200 } },
        opacity: 2.0,
        tintingStrength: -0.5,
        kubelkaMunk: { k: 2.0, s: -0.5 },
        userId: '',
        createdAt: '',
        updatedAt: ''
      };

      const result = paintSchema.safeParse(paint);

      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toContain('Validation failed');
        expect(formatted.length).toBeGreaterThan(50); // Multiple errors
      }
    });

    it('should handle nested path errors', () => {
      const request = {
        targetColor: { l: -10, a: 0, b: 0 },
        availablePaints: ['p1', 'p2'],
        mode: 'enhanced'
      };

      const result = enhancedOptimizationRequestSchema.safeParse(request);

      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted).toContain('targetColor');
        expect(formatted).toContain('l');
      }
    });
  });
});
