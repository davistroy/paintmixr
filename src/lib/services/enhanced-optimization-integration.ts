/**
 * Enhanced Optimization Integration Service
 * Connects the new enhanced accuracy system with existing paint collection workflows
 */

import { LABColor } from '@/lib/color-science/types';
import { ColorOptimizationResult as OptimizationResult } from '@/types/mixing';
import { EnhancedPaintRepository } from '@/lib/database/repositories/enhanced-paint-repository';
import { getOptimizationClient } from '@/lib/workers/optimization-client';
import { deltaE2000 as calculateDeltaE, hexToLab } from '@/lib/color-science';

interface LegacyMixingFormula {
  id: string;
  target_color_hex: string;
  paint_ratios: { paint_id: string; ratio: number }[];
  total_volume_ml: number;
  created_at: string;
  accuracy_delta_e?: number;
}

interface EnhancedOptimizationRequest {
  target_color: LABColor;
  collection_id?: string;
  volume_constraints?: {
    total_volume_ml: number;
    min_volume_per_paint_ml: number;
    max_paint_count: number;
    allow_waste: boolean;
  };
  optimization_config?: {
    target_delta_e: number;
    algorithm: 'auto' | 'differential_evolution' | 'tpe_hybrid';
    max_iterations: number;
    time_limit_ms: number;
    quality_vs_speed: 'quality' | 'balanced' | 'speed';
  };
  fallback_to_legacy?: boolean;
}

interface OptimizationIntegrationResult {
  success: boolean;
  result?: OptimizationResult;
  legacy_fallback?: LegacyMixingFormula;
  performance_metrics: {
    enhanced_optimization_time_ms?: number;
    legacy_fallback_time_ms?: number;
    total_time_ms: number;
    accuracy_improvement?: number; // Delta E improvement over legacy
  };
  recommendations?: {
    upgrade_paint_accuracy?: boolean;
    calibrate_optical_properties?: boolean;
    expand_paint_collection?: boolean;
  };
}

export class EnhancedOptimizationIntegration {
  private repository: EnhancedPaintRepository;
  private optimizationClient: ReturnType<typeof getOptimizationClient>;

  constructor(supabaseClient: any) {
    this.repository = new EnhancedPaintRepository(supabaseClient);
    this.optimizationClient = getOptimizationClient();
  }

  /**
   * Main entry point for enhanced optimization with automatic fallback
   */
  async optimizeWithIntegration(
    userId: string,
    request: EnhancedOptimizationRequest
  ): Promise<OptimizationIntegrationResult> {
    const startTime = Date.now();
    let enhancedResult: OptimizationResult | null = null;
    let legacyResult: LegacyMixingFormula | null = null;

    try {
      // Attempt enhanced optimization first
      const enhancedStartTime = Date.now();
      enhancedResult = await this.runEnhancedOptimization(userId, request);
      const enhancedTime = Date.now() - enhancedStartTime;

      // Check if enhanced optimization meets quality requirements
      const meetsQuality = enhancedResult.formula.achieved_delta_e <= (request.optimization_config?.target_delta_e || 2.0);
      const meetsPerformance = enhancedTime <= (request.optimization_config?.time_limit_ms || 30000);

      if (meetsQuality && meetsPerformance) {
        return {
          success: true,
          result: enhancedResult,
          performance_metrics: {
            enhanced_optimization_time_ms: enhancedTime,
            total_time_ms: Date.now() - startTime
          },
          recommendations: await this.generateRecommendations(userId, request, enhancedResult)
        };
      }

      // If enhanced optimization doesn't meet requirements and fallback is enabled
      if (request.fallback_to_legacy) {
        const legacyStartTime = Date.now();
        legacyResult = await this.runLegacyOptimization(userId, request);
        const legacyTime = Date.now() - legacyStartTime;

        const accuracyImprovement = legacyResult.accuracy_delta_e
          ? legacyResult.accuracy_delta_e - enhancedResult.formula.achieved_delta_e
          : undefined;

        return {
          success: true,
          result: enhancedResult,
          legacy_fallback: legacyResult,
          performance_metrics: {
            enhanced_optimization_time_ms: enhancedTime,
            legacy_fallback_time_ms: legacyTime,
            total_time_ms: Date.now() - startTime,
            accuracy_improvement: accuracyImprovement
          },
          recommendations: await this.generateRecommendations(userId, request, enhancedResult)
        };
      }

      return {
        success: true,
        result: enhancedResult,
        performance_metrics: {
          enhanced_optimization_time_ms: enhancedTime,
          total_time_ms: Date.now() - startTime
        },
        recommendations: await this.generateRecommendations(userId, request, enhancedResult)
      };

    } catch (error) {
      console.error('Enhanced optimization failed:', error);

      // Attempt legacy fallback if enabled
      if (request.fallback_to_legacy) {
        try {
          const legacyStartTime = Date.now();
          legacyResult = await this.runLegacyOptimization(userId, request);
          const legacyTime = Date.now() - legacyStartTime;

          return {
            success: true,
            legacy_fallback: legacyResult,
            performance_metrics: {
              legacy_fallback_time_ms: legacyTime,
              total_time_ms: Date.now() - startTime
            }
          };
        } catch (legacyError) {
          console.error('Legacy fallback also failed:', legacyError);
        }
      }

      return {
        success: false,
        performance_metrics: {
          total_time_ms: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Run enhanced optimization using new algorithms and accuracy targets
   */
  private async runEnhancedOptimization(
    userId: string,
    request: EnhancedOptimizationRequest
  ): Promise<OptimizationResult> {
    // Get available paints for optimization
    const paintsResult = await this.repository.getUserPaints(
      userId,
      {
        collection_id: request.collection_id,
        archived: false,
        color_verified: true // Prefer verified paints for enhanced accuracy
      },
      { page: 1, limit: 100, sort_field: 'created_at', sort_direction: 'desc' }
    );

    if (!paintsResult.data || paintsResult.data.length === 0) {
      throw new Error('No paints available for optimization');
    }

    // Prepare optimization request
    const optimizationRequest = {
      request_id: `enh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      target_color: request.target_color,
      available_paints: paintsResult.data.map(paint => {
        const labColor = paint.lab_color as unknown as LABColor;
        return {
          id: paint.id,
          name: paint.name,
          brand: paint.brand,
          lab_l: labColor.l,
          lab_a: labColor.a,
          lab_b: labColor.b,
          volume_ml: paint.volume_ml,
          cost_per_ml: paint.cost_per_ml,
          finish_type: paint.finish_type,
          pigment_info: paint.optical_properties as any,
          optical_properties_calibrated: paint.optical_properties_calibrated
        };
      }),
      volume_constraints: request.volume_constraints || {
        total_volume_ml: 100,
        min_volume_per_paint_ml: 0.5,
        max_paint_count: 8,
        allow_waste: false
      },
      optimization_config: request.optimization_config || {
        target_delta_e: 2.0,
        algorithm: 'auto',
        max_iterations: 1000,
        time_limit_ms: 30000,
        quality_vs_speed: 'balanced'
      },
      availability_constraints: [],
      preferences: {}
    } as any;

    // Execute optimization
    const result = await this.optimizationClient.optimize(optimizationRequest) as any as OptimizationResult;

    // Save optimization result to history
    await this.saveOptimizationResult(userId, request, result);

    return result;
  }

  /**
   * Run legacy optimization for backward compatibility
   */
  private async runLegacyOptimization(
    userId: string,
    request: EnhancedOptimizationRequest
  ): Promise<LegacyMixingFormula> {
    // This would integrate with existing legacy mixing algorithms
    // For now, we'll simulate a basic mixing approach

    const paintsResult = await this.repository.getUserPaints(
      userId,
      {
        collection_id: request.collection_id,
        archived: false
      },
      { page: 1, limit: 50, sort_field: 'times_used', sort_direction: 'desc' }
    );

    if (!paintsResult.data || paintsResult.data.length === 0) {
      throw new Error('No paints available for legacy optimization');
    }

    // Simple closest-color matching (legacy approach)
    const paints = paintsResult.data;
    let closestPaint = paints[0];
    let minDeltaE = Number.MAX_VALUE;

    for (const paint of paints) {
      const labColor = paint.lab_color as unknown as LABColor;
      const deltaE = calculateDeltaE(request.target_color, labColor);

      if (deltaE < minDeltaE) {
        minDeltaE = deltaE;
        closestPaint = paint;
      }
    }

    // Create legacy-style result
    const legacyResult: LegacyMixingFormula = {
      id: `legacy_${Date.now()}`,
      target_color_hex: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
      paint_ratios: [
        { paint_id: closestPaint.id, ratio: 1.0 }
      ],
      total_volume_ml: request.volume_constraints?.total_volume_ml || 100,
      created_at: new Date().toISOString(),
      accuracy_delta_e: minDeltaE
    };

    return legacyResult;
  }

  /**
   * Generate recommendations for improving accuracy
   */
  private async generateRecommendations(
    userId: string,
    request: EnhancedOptimizationRequest,
    _result: OptimizationResult
  ) {
    const recommendations: NonNullable<OptimizationIntegrationResult['recommendations']> = {};

    // Check if accuracy could be improved with verified paints
    const verifiedPaintsResult = await this.repository.getUserPaints(
      userId,
      {
        collection_id: request.collection_id,
        color_verified: true,
        archived: false
      },
      { page: 1, limit: 1 }
    );

    const totalPaintsResult = await this.repository.getUserPaints(
      userId,
      {
        collection_id: request.collection_id,
        archived: false
      },
      { page: 1, limit: 1 }
    );

    const verifiedRatio = (verifiedPaintsResult.pagination?.total_count || 0) /
                          (totalPaintsResult.pagination?.total_count || 1);

    if (verifiedRatio < 0.5) {
      recommendations.upgrade_paint_accuracy = true;
    }

    // Check for optical properties calibration
    const calibratedPaintsResult = await this.repository.getUserPaints(
      userId,
      {
        collection_id: request.collection_id,
        calibrated: true,
        archived: false
      },
      { page: 1, limit: 1 }
    );

    const calibratedRatio = (calibratedPaintsResult.pagination?.total_count || 0) /
                           (totalPaintsResult.pagination?.total_count || 1);

    if (calibratedRatio < 0.3) {
      recommendations.calibrate_optical_properties = true;
    }

    // Check if expanding collection would help
    if ((totalPaintsResult.pagination?.total_count || 0) < 20) {
      recommendations.expand_paint_collection = true;
    }

    return recommendations;
  }

  /**
   * Save optimization result to mixing history
   */
  private async saveOptimizationResult(
    userId: string,
    request: EnhancedOptimizationRequest,
    result: OptimizationResult
  ) {
    try {
      await this.repository.saveMixingHistory({
        user_id: userId,
        target_color: request.target_color,
        result_colors: [result.formula.achieved_color],
        paint_mixture: result.formula.paint_components.map(pc => ({
          paint_id: pc.paint_id,
          volume_ml: pc.volume_ml,
          percentage: pc.percentage
        })),
        delta_e_achieved: result.formula.achieved_delta_e,
        optimization_time_ms: result.optimization_metadata.performance_metrics.calculation_time_ms,
        algorithm_used: request.optimization_config?.algorithm || 'auto',
        total_volume_ml: result.formula.total_volume_ml,
        total_cost: result.formula.estimated_cost,
        collection_id: request.collection_id,
        optimization_config: request.optimization_config,
        volume_constraints: request.volume_constraints,
        notes: 'Enhanced accuracy optimization'
      });
    } catch (error) {
      console.error('Failed to save optimization result:', error);
      // Don't throw - this is not critical for the optimization itself
    }
  }

  /**
   * Migrate legacy mixing formulas to enhanced format
   */
  async migrateLegacyFormula(
    userId: string,
    legacyFormula: LegacyMixingFormula
  ): Promise<OptimizationIntegrationResult> {
    try {
      const targetColor = hexToLab(legacyFormula.target_color_hex);

      const enhancedRequest: EnhancedOptimizationRequest = {
        target_color: targetColor,
        volume_constraints: {
          total_volume_ml: legacyFormula.total_volume_ml,
          min_volume_per_paint_ml: 0.5,
          max_paint_count: legacyFormula.paint_ratios.length * 2,
          allow_waste: false
        },
        optimization_config: {
          target_delta_e: Math.min(2.0, legacyFormula.accuracy_delta_e || 4.0),
          algorithm: 'auto',
          max_iterations: 1000,
          time_limit_ms: 30000,
          quality_vs_speed: 'balanced'
        },
        fallback_to_legacy: false
      };

      return await this.optimizeWithIntegration(userId, enhancedRequest);

    } catch (error) {
      console.error('Legacy formula migration failed:', error);
      return {
        success: false,
        performance_metrics: {
          total_time_ms: 0
        }
      };
    }
  }

  /**
   * Compare enhanced vs legacy results for validation
   */
  async compareOptimizationMethods(
    userId: string,
    request: EnhancedOptimizationRequest
  ): Promise<{
    enhanced: OptimizationResult | null;
    legacy: LegacyMixingFormula | null;
    comparison: {
      accuracy_improvement: number;
      cost_difference: number;
      time_difference: number;
      recommendation: 'enhanced' | 'legacy' | 'equivalent';
    };
  }> {
    const enhancedStartTime = Date.now();
    let enhancedResult: OptimizationResult | null = null;
    let legacyResult: LegacyMixingFormula | null = null;

    try {
      enhancedResult = await this.runEnhancedOptimization(userId, request);
    } catch (error) {
      console.error('Enhanced optimization failed in comparison:', error);
    }
    const enhancedTime = Date.now() - enhancedStartTime;

    const legacyStartTime = Date.now();
    try {
      legacyResult = await this.runLegacyOptimization(userId, request);
    } catch (error) {
      console.error('Legacy optimization failed in comparison:', error);
    }
    const legacyTime = Date.now() - legacyStartTime;

    const comparison = {
      accuracy_improvement: enhancedResult && legacyResult
        ? (legacyResult.accuracy_delta_e || 4.0) - enhancedResult.formula.achieved_delta_e
        : 0,
      cost_difference: enhancedResult && legacyResult
        ? enhancedResult.formula.estimated_cost - (legacyResult.total_volume_ml * 0.1) // Estimate legacy cost
        : 0,
      time_difference: enhancedTime - legacyTime,
      recommendation: 'enhanced' as 'enhanced' | 'legacy' | 'equivalent'
    };

    // Determine recommendation based on comparison
    if (comparison.accuracy_improvement > 1.0 && comparison.time_difference < 10000) {
      comparison.recommendation = 'enhanced';
    } else if (comparison.accuracy_improvement < 0.5 && comparison.time_difference > 20000) {
      comparison.recommendation = 'legacy';
    } else {
      comparison.recommendation = 'equivalent';
    }

    return {
      enhanced: enhancedResult,
      legacy: legacyResult,
      comparison
    };
  }
}