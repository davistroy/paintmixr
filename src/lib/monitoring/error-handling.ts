/**
 * Enhanced Error Handling and Graceful Fallbacks
 * Provides comprehensive error handling for optimization failures
 */

import { ColorOptimizationResult as OptimizationResult } from '@/lib/types';
import { LABColor } from '@/lib/color-science/types';
import { globalMetricsCollector } from './performance-metrics';
import { logger } from '@/lib/logging/logger';

export interface OptimizationError extends Error {
  code: OptimizationErrorCode;
  context: OptimizationErrorContext;
  recoverable: boolean;
  fallbackAvailable: boolean;
  userMessage: string;
  technicalDetails: string;
}

export enum OptimizationErrorCode {
  // Input validation errors
  INVALID_TARGET_COLOR = 'INVALID_TARGET_COLOR',
  INVALID_VOLUME_CONSTRAINTS = 'INVALID_VOLUME_CONSTRAINTS',
  INSUFFICIENT_PAINT_COLLECTION = 'INSUFFICIENT_PAINT_COLLECTION',

  // Algorithm errors
  ALGORITHM_CONVERGENCE_FAILED = 'ALGORITHM_CONVERGENCE_FAILED',
  ALGORITHM_TIMEOUT = 'ALGORITHM_TIMEOUT',
  ALGORITHM_RESOURCE_EXHAUSTED = 'ALGORITHM_RESOURCE_EXHAUSTED',
  ALGORITHM_NUMERICAL_INSTABILITY = 'ALGORITHM_NUMERICAL_INSTABILITY',

  // System errors
  WORKER_THREAD_FAILURE = 'WORKER_THREAD_FAILURE',
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXTERNAL_SERVICE_UNAVAILABLE',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',

  // Paint data errors
  PAINT_DATA_CORRUPTED = 'PAINT_DATA_CORRUPTED',
  PAINT_CALIBRATION_MISSING = 'PAINT_CALIBRATION_MISSING',
  PAINT_COLOR_SPACE_MISMATCH = 'PAINT_COLOR_SPACE_MISMATCH',

  // Configuration errors
  INVALID_OPTIMIZATION_CONFIG = 'INVALID_OPTIMIZATION_CONFIG',
  UNSUPPORTED_ALGORITHM = 'UNSUPPORTED_ALGORITHM',
  FEATURE_DISABLED = 'FEATURE_DISABLED'
}

export interface OptimizationErrorContext {
  optimization_id: string;
  user_id: string;
  algorithm_attempted: string;
  target_color: LABColor;
  available_paints_count: number;
  volume_constraints?: any;
  system_state: {
    memory_usage_mb: number;
    active_optimizations: number;
    worker_thread_count: number;
  };
  timestamp: Date;
}

export interface FallbackStrategy {
  name: string;
  description: string;
  expected_accuracy_degradation: number;
  expected_performance_impact: number;
  user_notification_required: boolean;
  execute: (context: OptimizationErrorContext) => Promise<OptimizationResult | null>;
}

export class OptimizationErrorHandler {
  private fallbackStrategies: Map<OptimizationErrorCode, FallbackStrategy[]> = new Map();
  private errorMetrics: Map<OptimizationErrorCode, { count: number; lastOccurrence: Date }> = new Map();

  constructor() {
    this.initializeFallbackStrategies();
  }

  /**
   * Handle optimization error with automatic fallback strategies
   */
  async handleOptimizationError(
    error: Error,
    context: OptimizationErrorContext
  ): Promise<{
    recovered: boolean;
    result?: OptimizationResult;
    fallbackUsed?: string;
    userMessage: string;
    recommendedActions: string[];
  }> {
    const optimizationError = this.enhanceError(error, context);

    // Record error metrics
    this.recordErrorMetrics(optimizationError.code);

    // Log error details
    logger.error(`Optimization error [${optimizationError.code}]:`, {
      optimization_id: context.optimization_id,
      user_id: context.user_id,
      error: optimizationError.message,
      technical_details: optimizationError.technicalDetails
    });

    // Report to metrics collector
    globalMetricsCollector.recordOptimizationMetrics({
      optimization_id: context.optimization_id,
      user_id: context.user_id,
      timestamp: new Date(),
      calculation_time_ms: 0,
      algorithm_used: context.algorithm_attempted as any,
      iterations_completed: 0,
      convergence_achieved: false,
      target_delta_e: 2.0,
      achieved_delta_e: 999,
      accuracy_target_met: false,
      color_space_coverage: 0,
      memory_usage_mb: context.system_state.memory_usage_mb,
      worker_thread_count: context.system_state.worker_thread_count,
      paints_evaluated: 0,
      paints_selected: 0,
      collection_size: context.available_paints_count,
      verified_paints_ratio: 0,
      calibrated_paints_ratio: 0,
      solution_stability_score: 0,
      color_mixing_complexity: 0,
      volume_efficiency: 0,
      cost_efficiency: 0,
      concurrent_optimizations: context.system_state.active_optimizations,
      system_load_factor: this.calculateSystemLoadFactor(context),
      first_result_time_ms: 0
    });

    // Attempt fallback strategies
    if (optimizationError.fallbackAvailable && optimizationError.recoverable) {
      const fallbackResult = await this.attemptFallbackStrategies(optimizationError.code, context);

      if (fallbackResult.success) {
        return {
          recovered: true,
          result: fallbackResult.result!,
          fallbackUsed: fallbackResult.strategy,
          userMessage: this.getUserMessage(optimizationError, true),
          recommendedActions: this.getRecommendedActions(optimizationError)
        };
      }
    }

    // No recovery possible
    return {
      recovered: false,
      userMessage: this.getUserMessage(optimizationError, false),
      recommendedActions: this.getRecommendedActions(optimizationError)
    };
  }

  /**
   * Validate optimization request before processing
   */
  validateOptimizationRequest(
    targetColor: LABColor,
    availablePaints: any[],
    volumeConstraints?: any,
    _optimizationConfig?: any
  ): OptimizationError | null {
    // Validate target color
    if (!this.isValidLABColor(targetColor)) {
      return this.createOptimizationError(
        OptimizationErrorCode.INVALID_TARGET_COLOR,
        'Invalid target color values',
        'Target color must have valid L, a, b values within acceptable ranges'
      );
    }

    // Validate paint collection
    if (!availablePaints || availablePaints.length < 3) {
      return this.createOptimizationError(
        OptimizationErrorCode.INSUFFICIENT_PAINT_COLLECTION,
        'Not enough paints for optimization',
        'At least 3 paints are required for meaningful color mixing optimization'
      );
    }

    // Validate volume constraints
    if (volumeConstraints) {
      if (volumeConstraints.total_volume_ml <= 0 || volumeConstraints.total_volume_ml > 10000) {
        return this.createOptimizationError(
          OptimizationErrorCode.INVALID_VOLUME_CONSTRAINTS,
          'Invalid volume constraints',
          `Total volume ${volumeConstraints.total_volume_ml}ml is outside acceptable range (0.1-10000ml)`
        );
      }

      if (volumeConstraints.min_volume_per_paint_ml <= 0 ||
          volumeConstraints.min_volume_per_paint_ml > volumeConstraints.total_volume_ml / 2) {
        return this.createOptimizationError(
          OptimizationErrorCode.INVALID_VOLUME_CONSTRAINTS,
          'Invalid minimum paint volume',
          'Minimum paint volume must be positive and reasonable relative to total volume'
        );
      }
    }

    // Validate paint data integrity
    for (const paint of availablePaints) {
      if (!this.isValidLABColor({ l: paint.lab_l, a: paint.lab_a, b: paint.lab_b })) {
        return this.createOptimizationError(
          OptimizationErrorCode.PAINT_DATA_CORRUPTED,
          'Invalid paint color data detected',
          `Paint ${paint.id} has invalid LAB color values`
        );
      }

      if (!paint.volume_ml || paint.volume_ml <= 0) {
        return this.createOptimizationError(
          OptimizationErrorCode.PAINT_DATA_CORRUPTED,
          'Invalid paint volume data',
          `Paint ${paint.id} has invalid volume: ${paint.volume_ml}`
        );
      }
    }

    return null; // No validation errors
  }

  /**
   * Get system health status for error context
   */
  getSystemHealthContext(): OptimizationErrorContext['system_state'] {
    const memoryUsage = process.memoryUsage();

    return {
      memory_usage_mb: memoryUsage.heapUsed / 1024 / 1024,
      active_optimizations: 1, // Would be tracked globally
      worker_thread_count: 1 // Would be retrieved from worker pool
    };
  }

  /**
   * Check if system can handle optimization request
   */
  checkSystemCapacity(): { available: boolean; reason?: string } {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;

    // Check memory constraints
    if (memoryUsageMB > 1024) { // 1GB threshold
      return {
        available: false,
        reason: 'High memory usage detected. Please try again in a few moments.'
      };
    }

    // Check if too many concurrent optimizations
    // This would be tracked globally in production
    const activeOptimizations = 1;
    if (activeOptimizations > 10) {
      return {
        available: false,
        reason: 'System at capacity. Please try again shortly.'
      };
    }

    return { available: true };
  }

  private initializeFallbackStrategies() {
    // Algorithm convergence failure fallbacks
    this.fallbackStrategies.set(OptimizationErrorCode.ALGORITHM_CONVERGENCE_FAILED, [
      {
        name: 'reduced_accuracy_retry',
        description: 'Retry with relaxed accuracy target',
        expected_accuracy_degradation: 0.5,
        expected_performance_impact: -0.3,
        user_notification_required: true,
        execute: async (_context) => {
          // Implementation would retry with higher Delta E target
          return null;
        }
      },
      {
        name: 'simplified_algorithm',
        description: 'Use simpler optimization algorithm',
        expected_accuracy_degradation: 1.0,
        expected_performance_impact: -0.5,
        user_notification_required: true,
        execute: async (_context) => {
          // Implementation would use legacy algorithm
          return null;
        }
      }
    ]);

    // Algorithm timeout fallbacks
    this.fallbackStrategies.set(OptimizationErrorCode.ALGORITHM_TIMEOUT, [
      {
        name: 'quick_approximation',
        description: 'Provide best available result from partial optimization',
        expected_accuracy_degradation: 1.5,
        expected_performance_impact: -0.8,
        user_notification_required: true,
        execute: async (_context) => {
          // Implementation would return partial results
          return null;
        }
      }
    ]);

    // Insufficient paint collection fallbacks
    this.fallbackStrategies.set(OptimizationErrorCode.INSUFFICIENT_PAINT_COLLECTION, [
      {
        name: 'single_paint_match',
        description: 'Find closest single paint match',
        expected_accuracy_degradation: 3.0,
        expected_performance_impact: -0.9,
        user_notification_required: true,
        execute: async (_context) => {
          // Implementation would find closest single paint
          return null;
        }
      }
    ]);
  }

  private enhanceError(error: Error, context: OptimizationErrorContext): OptimizationError {
    let code: OptimizationErrorCode;
    let recoverable = false;
    let fallbackAvailable = false;

    // Classify error based on message and context
    if (error.message.includes('timeout') || error.message.includes('time limit')) {
      code = OptimizationErrorCode.ALGORITHM_TIMEOUT;
      recoverable = true;
      fallbackAvailable = true;
    } else if (error.message.includes('convergence') || error.message.includes('no solution')) {
      code = OptimizationErrorCode.ALGORITHM_CONVERGENCE_FAILED;
      recoverable = true;
      fallbackAvailable = true;
    } else if (error.message.includes('memory') || error.message.includes('heap')) {
      code = OptimizationErrorCode.MEMORY_LIMIT_EXCEEDED;
      recoverable = true;
      fallbackAvailable = false;
    } else if (error.message.includes('worker') || error.message.includes('thread')) {
      code = OptimizationErrorCode.WORKER_THREAD_FAILURE;
      recoverable = true;
      fallbackAvailable = true;
    } else {
      code = OptimizationErrorCode.ALGORITHM_CONVERGENCE_FAILED; // Default
      recoverable = false;
      fallbackAvailable = false;
    }

    const enhancedError = error as OptimizationError;
    enhancedError.code = code;
    enhancedError.context = context;
    enhancedError.recoverable = recoverable;
    enhancedError.fallbackAvailable = fallbackAvailable;
    enhancedError.userMessage = this.getErrorUserMessage(code);
    enhancedError.technicalDetails = error.stack || error.message;

    return enhancedError;
  }

  private async attemptFallbackStrategies(
    errorCode: OptimizationErrorCode,
    context: OptimizationErrorContext
  ): Promise<{ success: boolean; result?: OptimizationResult; strategy?: string }> {
    const strategies = this.fallbackStrategies.get(errorCode) || [];

    for (const strategy of strategies) {
      try {
        logger.info(`Attempting fallback strategy: ${strategy.name}`);
        const result = await strategy.execute(context);

        if (result) {
          return {
            success: true,
            result,
            strategy: strategy.name
          };
        }
      } catch (fallbackError) {
        logger.error(`Fallback strategy ${strategy.name} failed:`, fallbackError);
      }
    }

    return { success: false };
  }

  private isValidLABColor(color: LABColor): boolean {
    return (
      typeof color.l === 'number' && color.l >= 0 && color.l <= 100 &&
      typeof color.a === 'number' && color.a >= -128 && color.a <= 127 &&
      typeof color.b === 'number' && color.b >= -128 && color.b <= 127 &&
      !isNaN(color.l) && !isNaN(color.a) && !isNaN(color.b)
    );
  }

  private createOptimizationError(
    code: OptimizationErrorCode,
    message: string,
    technicalDetails: string
  ): OptimizationError {
    const error = new Error(message) as OptimizationError;
    error.code = code;
    error.recoverable = false;
    error.fallbackAvailable = false;
    error.userMessage = this.getErrorUserMessage(code);
    error.technicalDetails = technicalDetails;
    return error;
  }

  private getErrorUserMessage(code: OptimizationErrorCode): string {
    const messages: Record<OptimizationErrorCode, string> = {
      [OptimizationErrorCode.INVALID_TARGET_COLOR]: 'The target color you selected is not valid. Please choose a different color.',
      [OptimizationErrorCode.INVALID_VOLUME_CONSTRAINTS]: 'The volume settings are not valid. Please check your volume requirements.',
      [OptimizationErrorCode.INSUFFICIENT_PAINT_COLLECTION]: 'You need at least 3 paints to create a color mix. Please add more paints to your collection.',
      [OptimizationErrorCode.ALGORITHM_CONVERGENCE_FAILED]: 'Unable to find a perfect color match with your current paint collection. We can try with reduced accuracy.',
      [OptimizationErrorCode.ALGORITHM_TIMEOUT]: 'The color mixing calculation is taking too long. We can provide a quick approximation instead.',
      [OptimizationErrorCode.ALGORITHM_RESOURCE_EXHAUSTED]: 'The system is currently under heavy load. Please try again in a few moments.',
      [OptimizationErrorCode.ALGORITHM_NUMERICAL_INSTABILITY]: 'There was a calculation error. Please try again or contact support if the problem persists.',
      [OptimizationErrorCode.WORKER_THREAD_FAILURE]: 'A background calculation process failed. Retrying with alternative method.',
      [OptimizationErrorCode.DATABASE_CONNECTION_FAILED]: 'Unable to access your paint collection data. Please check your connection and try again.',
      [OptimizationErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: 'Some advanced features are temporarily unavailable. Basic functionality will continue to work.',
      [OptimizationErrorCode.MEMORY_LIMIT_EXCEEDED]: 'The calculation requires too much memory. Please try with a smaller paint collection or simpler settings.',
      [OptimizationErrorCode.PAINT_DATA_CORRUPTED]: 'Some of your paint data appears to be corrupted. Please check and update your paint information.',
      [OptimizationErrorCode.PAINT_CALIBRATION_MISSING]: 'Some paints in your collection need color calibration for accurate results.',
      [OptimizationErrorCode.PAINT_COLOR_SPACE_MISMATCH]: 'Your paint colors are in different color spaces. Please ensure all paints use the same color format.',
      [OptimizationErrorCode.INVALID_OPTIMIZATION_CONFIG]: 'The optimization settings are not valid. Please check your preferences.',
      [OptimizationErrorCode.UNSUPPORTED_ALGORITHM]: 'The requested optimization method is not available. Using standard method instead.',
      [OptimizationErrorCode.FEATURE_DISABLED]: 'This advanced feature is currently disabled. Please try the standard color mixing method.'
    };

    return messages[code] || 'An unexpected error occurred during color mixing optimization.';
  }

  private getUserMessage(error: OptimizationError, recovered: boolean): string {
    if (recovered) {
      return `${error.userMessage} We've provided an alternative result.`;
    }
    return error.userMessage;
  }

  private getRecommendedActions(error: OptimizationError): string[] {
    const actions: Partial<Record<OptimizationErrorCode, string[]>> = {
      [OptimizationErrorCode.INSUFFICIENT_PAINT_COLLECTION]: [
        'Add more paints to your collection',
        'Try selecting paints that cover a wider color range',
        'Consider using paints from different color families'
      ],
      [OptimizationErrorCode.ALGORITHM_CONVERGENCE_FAILED]: [
        'Try a less precise color match (higher Delta E tolerance)',
        'Consider adding more paints near your target color',
        'Use the simplified mixing mode for faster results'
      ],
      [OptimizationErrorCode.PAINT_CALIBRATION_MISSING]: [
        'Calibrate your paint colors using the color accuracy tool',
        'Use verified paint data from the paint database',
        'Consider using professionally measured paint colors'
      ],
      [OptimizationErrorCode.MEMORY_LIMIT_EXCEEDED]: [
        'Reduce the number of paints in your active collection',
        'Use simpler optimization settings',
        'Close other browser tabs to free up memory'
      ]
    };

    return actions[error.code] || [
      'Try again in a few moments',
      'Contact support if the problem persists',
      'Check your internet connection'
    ];
  }

  private calculateSystemLoadFactor(context: OptimizationErrorContext): number {
    const { memory_usage_mb, active_optimizations, worker_thread_count } = context.system_state;

    const memoryLoad = Math.min(1.0, memory_usage_mb / 1024); // Normalize to 1GB
    const concurrencyLoad = Math.min(1.0, active_optimizations / 10); // Max 10 concurrent
    const threadLoad = Math.min(1.0, worker_thread_count / 8); // Max 8 threads

    return (memoryLoad + concurrencyLoad + threadLoad) / 3;
  }

  private recordErrorMetrics(code: OptimizationErrorCode) {
    const current = this.errorMetrics.get(code) || { count: 0, lastOccurrence: new Date() };
    this.errorMetrics.set(code, {
      count: current.count + 1,
      lastOccurrence: new Date()
    });
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(): { code: OptimizationErrorCode; count: number; lastOccurrence: Date }[] {
    return Array.from(this.errorMetrics.entries()).map(([code, metrics]) => ({
      code,
      ...metrics
    }));
  }
}

// Global error handler instance
export const globalErrorHandler = new OptimizationErrorHandler();