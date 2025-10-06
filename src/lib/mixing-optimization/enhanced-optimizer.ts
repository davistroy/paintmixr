/**
 * Enhanced Optimizer Orchestrator (T014)
 * Feature: 007-enhanced-mode-1
 *
 * Main orchestrator for server-side paint mixing optimization.
 * Auto-selects algorithm based on paint count and routes to appropriate optimizer.
 *
 * Algorithm Selection Strategy (from research.md):
 * - ≤8 paints: Differential Evolution (speed-prioritized)
 * - >8 paints: TPE Hybrid (accuracy-prioritized)
 *
 * Server-side compatible: NO Web Worker API dependencies.
 * Vercel serverless compatible with 30-second timeout handling.
 */

import {
  EnhancedOptimizationRequest,
  OptimizedPaintFormula,
  OptimizationPerformanceMetrics
} from '@/lib/types';
import { optimizeWithDifferentialEvolution } from './differential-evolution';
import { optimizeWithTPEHybrid } from './tpe-hybrid';

/**
 * Main optimization function for Enhanced Accuracy Mode
 *
 * Auto-selects algorithm based on paint collection size:
 * - ≤8 paints: Uses Differential Evolution (faster convergence)
 * - >8 paints: Uses TPE Hybrid (better accuracy for high-dimensional spaces)
 *
 * @param request - Enhanced optimization request with target color, paints, and constraints
 * @returns Promise resolving to optimized formula and performance metrics
 *
 * @throws Error if optimization fails (e.g., invalid paints, timeout, algorithm crash)
 *
 * @example
 * ```typescript
 * const result = await optimizeEnhanced({
 *   targetColor: { l: 65, a: 18, b: -5 },
 *   availablePaints: userPaints,
 *   mode: 'enhanced',
 *   maxPaintCount: 5,
 *   timeLimit: 28000,
 *   accuracyTarget: 2.0
 * });
 *
 * logger.info(result.formula.deltaE); // Delta E ≤ 2.0
 * logger.info(result.metrics.algorithmUsed); // 'differential_evolution' or 'tpe_hybrid'
 * ```
 */
export async function optimizeEnhanced(
  request: EnhancedOptimizationRequest
): Promise<{
  formula: OptimizedPaintFormula;
  metrics: OptimizationPerformanceMetrics;
}> {
  const startTime = Date.now();

  // Validate request
  if (!request.availablePaints || request.availablePaints.length < 2) {
    throw new Error('At least 2 paints required for optimization');
  }

  if (request.maxPaintCount && (request.maxPaintCount < 2 || request.maxPaintCount > 5)) {
    throw new Error('maxPaintCount must be between 2 and 5');
  }

  // Auto-select algorithm based on paint count (research.md strategy)
  const paintCount = request.availablePaints.length;
  const algorithm = paintCount <= 8 ? 'differential_evolution' : 'tpe_hybrid';

  try {
    let result: {
      formula: OptimizedPaintFormula;
      metrics: OptimizationPerformanceMetrics;
    };

    // Route to appropriate optimizer
    if (algorithm === 'differential_evolution') {
      result = await optimizeWithDifferentialEvolution(request);
    } else {
      result = await optimizeWithTPEHybrid(request);
    }

    // Update algorithm tracking in metrics (may have been overridden by individual optimizer)
    if (result.metrics.algorithmUsed === 'auto') {
      result.metrics.algorithmUsed = algorithm;
    }

    return result;

  } catch (error) {
    // Calculate elapsed time for error metrics
    const timeElapsed = Date.now() - startTime;

    // Re-throw with context
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Enhanced optimization failed after ${timeElapsed}ms using ${algorithm}: ${errorMessage}`
    );
  }
}

/**
 * Optimization mode type guard
 * Validates that mode is either 'standard' or 'enhanced'
 */
export function isValidOptimizationMode(mode: unknown): mode is 'standard' | 'enhanced' {
  return mode === 'standard' || mode === 'enhanced';
}

/**
 * Get recommended algorithm for paint count
 * Exposed for testing and UI display purposes
 */
export function getRecommendedAlgorithm(paintCount: number): 'differential_evolution' | 'tpe_hybrid' {
  return paintCount <= 8 ? 'differential_evolution' : 'tpe_hybrid';
}

/**
 * Validate Enhanced Optimization Request
 * Performs runtime validation before passing to optimizer
 *
 * @throws Error if request is invalid
 */
export function validateEnhancedOptimizationRequest(request: EnhancedOptimizationRequest): void {
  // Target color validation
  if (!request.targetColor) {
    throw new Error('targetColor is required');
  }

  const { l, a, b } = request.targetColor;
  if (l < 0 || l > 100) {
    throw new Error('targetColor.l must be between 0 and 100');
  }
  if (a < -128 || a > 127) {
    throw new Error('targetColor.a must be between -128 and 127');
  }
  if (b < -128 || b > 127) {
    throw new Error('targetColor.b must be between -128 and 127');
  }

  // Available paints validation
  if (!Array.isArray(request.availablePaints)) {
    throw new Error('availablePaints must be an array');
  }
  if (request.availablePaints.length < 2) {
    throw new Error('At least 2 paints required for optimization');
  }
  if (request.availablePaints.length > 100) {
    throw new Error('Maximum 100 paints allowed for optimization');
  }

  // Mode validation
  if (!isValidOptimizationMode(request.mode)) {
    throw new Error('mode must be "standard" or "enhanced"');
  }

  // Optional parameters validation
  if (request.maxPaintCount !== undefined) {
    if (request.maxPaintCount < 2 || request.maxPaintCount > 5) {
      throw new Error('maxPaintCount must be between 2 and 5');
    }
  }

  if (request.timeLimit !== undefined) {
    if (request.timeLimit < 1000 || request.timeLimit > 30000) {
      throw new Error('timeLimit must be between 1000 and 30000 milliseconds');
    }
  }

  if (request.accuracyTarget !== undefined) {
    if (request.accuracyTarget <= 0) {
      throw new Error('accuracyTarget must be positive');
    }
  }

  // Volume constraints validation
  if (request.volumeConstraints) {
    const { min_total_volume_ml, max_total_volume_ml } = request.volumeConstraints;
    if (max_total_volume_ml < min_total_volume_ml) {
      throw new Error('max_total_volume_ml must be >= min_total_volume_ml');
    }
  }
}
