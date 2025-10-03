/**
 * Shared Test Fixtures for Optimization Tests
 * Common test data and setup functions used across optimization tests
 */

import type { Paint, LABColor } from '@/lib/types';

/**
 * Create standard test paint with LAB color
 */
export function createTestPaint(
  id: string,
  name: string,
  lab: LABColor,
  overrides?: Partial<Paint>
): Paint {
  return {
    id,
    name,
    brand: 'Test Brand',
    color: {
      hex: '#000000', // Default hex, can be overridden
      lab,
    },
    volume_ml: 100,
    cost_per_ml: 0.1,
    opacity: 1,
    finish_type: 'matte',
    pigment_composition: [],
    kubelka_munk_coefficients: {
      scattering_coefficient: 0.5,
      absorption_coefficient: 0.5,
    },
    user_id: 'test-user',
    collection_id: 'test-collection',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived: false,
    color_accuracy_verified: true,
    optical_properties_calibrated: true,
    times_used: 0,
    last_used_at: null,
    version: 1,
    tags: [],
    ...overrides,
  };
}

/**
 * Standard test paint palette
 */
export const TEST_PAINTS = {
  WHITE: createTestPaint('white-1', 'Titanium White', { L: 95, a: 0, b: 0 }),
  BLACK: createTestPaint('black-1', 'Carbon Black', { L: 10, a: 0, b: 0 }),
  RED: createTestPaint('red-1', 'Cadmium Red', { L: 45, a: 65, b: 45 }),
  BLUE: createTestPaint('blue-1', 'Ultramarine Blue', { L: 35, a: 15, b: -55 }),
  YELLOW: createTestPaint('yellow-1', 'Cadmium Yellow', { L: 80, a: 5, b: 85 }),
  GREEN: createTestPaint('green-1', 'Phthalo Green', { L: 45, a: -50, b: 25 }),
};

/**
 * Standard test palette array
 */
export const STANDARD_PALETTE: Paint[] = [
  TEST_PAINTS.WHITE,
  TEST_PAINTS.BLACK,
  TEST_PAINTS.RED,
  TEST_PAINTS.BLUE,
  TEST_PAINTS.YELLOW,
];

/**
 * Extended test palette with more colors
 */
export const EXTENDED_PALETTE: Paint[] = [
  ...STANDARD_PALETTE,
  TEST_PAINTS.GREEN,
  createTestPaint('orange-1', 'Cadmium Orange', { L: 60, a: 45, b: 70 }),
  createTestPaint('purple-1', 'Dioxazine Purple', { L: 25, a: 35, b: -45 }),
];

/**
 * Common target colors for testing
 */
export const TARGET_COLORS = {
  MID_GRAY: { L: 50, a: 0, b: 0 } as LABColor,
  WARM_GRAY: { L: 50, a: 5, b: 10 } as LABColor,
  COOL_GRAY: { L: 50, a: -5, b: -10 } as LABColor,
  SKIN_TONE: { L: 65, a: 15, b: 25 } as LABColor,
  OLIVE_GREEN: { L: 40, a: -20, b: 30 } as LABColor,
  NAVY_BLUE: { L: 20, a: 10, b: -30 } as LABColor,
};

/**
 * Standard optimization constraints for testing
 */
export const STANDARD_CONSTRAINTS = {
  minRatio: 0.01,
  maxRatio: 1.0,
  maxColors: 5,
  minColors: 1,
  allowZeroRatios: true,
};

/**
 * Volume constraints for testing
 */
export const VOLUME_CONSTRAINTS = {
  targetVolume: 100,
  minVolume: 10,
  maxVolume: 1000,
};

/**
 * Validation helper: check if ratios sum to approximately 1
 */
export function validateRatiosSum(ratios: number[], tolerance: number = 0.001): boolean {
  const sum = ratios.reduce((acc, r) => acc + r, 0);
  return Math.abs(sum - 1) < tolerance;
}

/**
 * Validation helper: check if all ratios are within constraints
 */
export function validateRatiosRange(
  ratios: number[],
  minRatio: number,
  maxRatio: number
): boolean {
  return ratios.every((r) => r >= minRatio && r <= maxRatio);
}

/**
 * Calculate expected number of paints in result based on constraints
 */
export function getExpectedPaintCount(
  ratios: number[],
  allowZeroRatios: boolean,
  maxColors?: number
): number {
  const nonZeroCount = ratios.filter((r) => r > 0.001).length;
  if (maxColors) {
    return Math.min(nonZeroCount, maxColors);
  }
  return allowZeroRatios ? ratios.length : nonZeroCount;
}

/**
 * Mock optimization result for testing
 */
export interface MockOptimizationResult {
  ratios: number[];
  deltaE: number;
  paints: Paint[];
  iterations?: number;
  convergence?: boolean;
}

/**
 * Create mock optimization result
 */
export function createMockOptimizationResult(
  paints: Paint[],
  ratios: number[],
  deltaE: number = 2.5,
  overrides?: Partial<MockOptimizationResult>
): MockOptimizationResult {
  return {
    ratios,
    deltaE,
    paints,
    iterations: 100,
    convergence: true,
    ...overrides,
  };
}

/**
 * Assert that optimization result is valid
 */
export function assertValidOptimizationResult(
  result: MockOptimizationResult,
  constraints: typeof STANDARD_CONSTRAINTS
): void {
  // Check ratios sum to 1
  if (!validateRatiosSum(result.ratios)) {
    throw new Error(`Ratios sum to ${result.ratios.reduce((a, b) => a + b, 0)}, expected 1`);
  }

  // Check ratios within range
  if (!validateRatiosRange(result.ratios, constraints.minRatio, constraints.maxRatio)) {
    throw new Error('Ratios outside allowed range');
  }

  // Check max colors constraint
  const nonZeroCount = result.ratios.filter((r) => r > 0.001).length;
  if (constraints.maxColors && nonZeroCount > constraints.maxColors) {
    throw new Error(`Too many colors: ${nonZeroCount} > ${constraints.maxColors}`);
  }

  // Check Delta E is non-negative
  if (result.deltaE < 0) {
    throw new Error(`Delta E is negative: ${result.deltaE}`);
  }

  // Check paints and ratios match
  if (result.paints.length !== result.ratios.length) {
    throw new Error('Paints and ratios length mismatch');
  }
}
