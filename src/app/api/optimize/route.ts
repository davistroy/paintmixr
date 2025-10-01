/**
 * Enhanced Color Optimization API with Web Worker integration
 * Provides real-time paint mixing optimization targeting Delta E ≤ 2.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/database/supabase-client';
import { EnhancedPaintRepository } from '@/lib/database/repositories/enhanced-paint-repository';
import { OptimizationClient } from '@/lib/workers/optimization-client';
import { LABColor, Paint, VolumeConstraints } from '@/lib/color-science/types';
import { z } from 'zod';

const LABColorSchema = z.object({
  L: z.number().min(0).max(100),
  a: z.number().min(-128).max(127),
  b: z.number().min(-128).max(127)
});

const VolumeConstraintsSchema = z.object({
  min_total_volume_ml: z.number().min(0.1).default(1.0),
  max_total_volume_ml: z.number().min(1).max(10000).default(1000),
  precision_ml: z.number().min(0.1).max(1.0).default(0.1),
  max_paint_count: z.number().min(2).max(20).default(10),
  min_paint_volume_ml: z.number().min(0.1).default(0.5),
  asymmetric_ratios: z.boolean().default(true)
});

const OptimizationConfigSchema = z.object({
  algorithm: z.enum(['differential_evolution', 'tpe_hybrid', 'auto']).default('auto'),
  max_iterations: z.number().min(100).max(10000).default(2000),
  target_delta_e: z.number().min(0.1).max(5.0).default(2.0),
  time_limit_ms: z.number().min(1000).max(30000).default(10000),
  require_color_verification: z.boolean().default(false),
  require_calibration: z.boolean().default(false)
});

const OptimizationRequestSchema = z.object({
  target_color: LABColorSchema,
  volume_constraints: VolumeConstraintsSchema.optional(),
  optimization_config: OptimizationConfigSchema.optional(),
  paint_filters: z.object({
    collection_id: z.string().uuid().optional(),
    available_only: z.boolean().default(true),
    min_volume_ml: z.number().min(0).optional(),
    verified_only: z.boolean().default(false),
    calibrated_only: z.boolean().default(false),
    excluded_paint_ids: z.array(z.string().uuid()).optional()
  }).optional(),
  save_to_history: z.boolean().default(true),
  project_metadata: z.object({
    project_name: z.string().optional(),
    surface_type: z.string().optional(),
    application_method: z.string().optional(),
    environmental_conditions: z.object({
      temperature_c: z.number().optional(),
      humidity_percent: z.number().optional(),
      lighting_conditions: z.string().optional()
    }).optional()
  }).optional()
});

async function getCurrentUser(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Global optimization client instance
let optimizationClient: OptimizationClient | null = null;

function getOptimizationClient(): OptimizationClient {
  if (!optimizationClient) {
    optimizationClient = new OptimizationClient();
  }
  return optimizationClient;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const user = await getCurrentUser(supabase);

    const body = await request.json();
    const requestData = OptimizationRequestSchema.parse(body);

    // Get user's available paints
    const repository = new EnhancedPaintRepository(supabase);
    const paintFilters = {
      archived: false,
      ...requestData.paint_filters,
      ...(requestData.paint_filters?.min_volume_ml && {
        min_volume: requestData.paint_filters.min_volume_ml
      }),
      ...(requestData.paint_filters?.verified_only && {
        color_verified: true
      }),
      ...(requestData.paint_filters?.calibrated_only && {
        calibrated: true
      })
    };

    const paintsResult = await repository.getUserPaints(user.id, paintFilters, {
      page: 1,
      limit: 100,
      sort_field: 'last_used_at',
      sort_direction: 'desc'
    });

    if (paintsResult.error) {
      return NextResponse.json(
        {
          error: {
            code: 'PAINT_FETCH_ERROR',
            message: 'Failed to fetch user paints',
            details: paintsResult.error.message
          }
        },
        { status: 500 }
      );
    }

    let availablePaints = paintsResult.data || [];

    // Filter out excluded paints
    if (requestData.paint_filters?.excluded_paint_ids?.length) {
      availablePaints = availablePaints.filter(
        paint => !requestData.paint_filters?.excluded_paint_ids?.includes(paint.id)
      );
    }

    // Filter by collection if specified
    if (requestData.paint_filters?.collection_id) {
      availablePaints = availablePaints.filter(
        paint => paint.collection_id === requestData.paint_filters?.collection_id
      );
    }

    if (availablePaints.length < 2) {
      return NextResponse.json(
        {
          error: {
            code: 'INSUFFICIENT_PAINTS',
            message: 'At least 2 paints are required for optimization',
            details: `Found ${availablePaints.length} paints matching criteria`
          }
        },
        { status: 400 }
      );
    }

    // Prepare optimization request
    const volumeConstraints: VolumeConstraints = {
      min_total_volume_ml: 1.0,
      max_total_volume_ml: 1000.0,
      precision_ml: 0.1,
      max_paint_count: 10,
      min_paint_volume_ml: 0.5,
      asymmetric_ratios: true,
      ...requestData.volume_constraints
    };

    const optimizationConfig = {
      algorithm: 'auto' as const,
      max_iterations: 2000,
      target_delta_e: 2.0,
      time_limit_ms: 10000,
      ...requestData.optimization_config
    };

    // Convert database paints to optimization format
    const paints: Paint[] = availablePaints.map(paint => ({
      id: paint.id,
      name: paint.name,
      brand: paint.brand,
      lab_color: paint.lab_color as LABColor,
      rgb_color: paint.rgb_color as { r: number; g: number; b: number },
      hex_color: paint.hex_color,
      optical_properties: paint.optical_properties as any,
      volume_ml: paint.volume_ml,
      cost_per_ml: paint.cost_per_ml,
      finish_type: paint.finish_type,
      mixing_compatibility: paint.mixing_compatibility as string[],
      mixing_restrictions: paint.mixing_restrictions as string[]
    }));

    // Perform optimization using Web Worker
    const optimizationClient = getOptimizationClient();
    const optimizationRequest = {
      request_id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      target_color: requestData.target_color,
      available_paints: paints,
      volume_constraints: volumeConstraints,
      optimization_config: optimizationConfig
    };

    const result = await optimizationClient.optimize(optimizationRequest);

    // Save to mixing history if requested
    if (requestData.save_to_history && result.success && result.solution) {
      try {
        const historyData = {
          user_id: user.id,
          target_color: requestData.target_color,
          achieved_color: result.achieved_color,
          delta_e_achieved: result.delta_e_achieved,
          paint_volumes: result.solution.paint_volumes,
          total_volume_ml: Object.values(result.solution.paint_volumes).reduce((sum, vol) => sum + vol, 0),
          mixing_time_minutes: Math.round(result.optimization_time_ms / 60000 * 100) / 100,
          algorithm_used: result.algorithm_used || optimizationConfig.algorithm,
          iterations_completed: result.iterations_completed || 0,
          optimization_time_ms: result.optimization_time_ms,
          convergence_achieved: result.delta_e_achieved <= optimizationConfig.target_delta_e,
          color_accuracy_score: Math.max(0, 100 - (result.delta_e_achieved / optimizationConfig.target_delta_e) * 100),
          project_name: requestData.project_metadata?.project_name,
          surface_type: requestData.project_metadata?.surface_type,
          application_method: requestData.project_metadata?.application_method,
          environmental_conditions: requestData.project_metadata?.environmental_conditions || null
        };

        await repository.saveMixingHistory(historyData);
      } catch (historyError) {
        console.warn('Failed to save mixing history:', historyError);
        // Don't fail the optimization if history saving fails
      }
    }

    // Update paint usage statistics
    if (result.success && result.solution) {
      try {
        const paintUpdates = Object.entries(result.solution.paint_volumes).map(([paintId, volume]) => ({
          paintId,
          volume
        }));

        await Promise.all(
          paintUpdates.map(({ paintId, volume }) =>
            repository.updatePaintUsageStats(paintId, user.id, volume)
          )
        );
      } catch (usageError) {
        console.warn('Failed to update paint usage stats:', usageError);
      }
    }

    return NextResponse.json({
      data: {
        optimization_id: optimizationRequest.request_id,
        success: result.success,
        target_color: requestData.target_color,
        achieved_color: result.achieved_color,
        delta_e_achieved: result.delta_e_achieved,
        solution: result.solution,
        performance: {
          optimization_time_ms: result.optimization_time_ms,
          iterations_completed: result.iterations_completed,
          algorithm_used: result.algorithm_used,
          convergence_achieved: result.delta_e_achieved <= optimizationConfig.target_delta_e
        },
        paint_details: result.solution ? Object.keys(result.solution.paint_volumes).map(paintId => {
          const paint = availablePaints.find(p => p.id === paintId);
          return {
            id: paintId,
            name: paint?.name,
            brand: paint?.brand,
            volume_ml: result.solution?.paint_volumes[paintId],
            percentage: ((result.solution?.paint_volumes[paintId] || 0) / Object.values(result.solution?.paint_volumes || {}).reduce((sum, vol) => sum + vol, 1)) * 100
          };
        }) : [],
        quality_metrics: {
          color_accuracy_score: result.success ? Math.max(0, 100 - (result.delta_e_achieved / optimizationConfig.target_delta_e) * 100) : 0,
          meets_target: result.delta_e_achieved <= optimizationConfig.target_delta_e,
          cost_effectiveness: result.solution ? Object.entries(result.solution.paint_volumes).reduce(
            (total, [paintId, volume]) => {
              const paint = availablePaints.find(p => p.id === paintId);
              return total + (paint?.cost_per_ml || 0) * volume;
            }, 0
          ) : 0
        }
      },
      meta: {
        request_id: optimizationRequest.request_id,
        processed_at: new Date().toISOString(),
        paints_evaluated: paints.length,
        constraints_applied: Object.keys(volumeConstraints).length,
        saved_to_history: requestData.save_to_history && result.success
      }
    });

  } catch (error) {
    console.error('POST /api/optimize error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid optimization request',
            details: error.errors
          }
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Optimization failed' } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const user = await getCurrentUser(supabase);

    const url = new URL(request.url);
    const optimizationId = url.searchParams.get('id');

    if (optimizationId) {
      // Get specific optimization result (if we implemented caching)
      return NextResponse.json({
        error: { code: 'NOT_IMPLEMENTED', message: 'Optimization result caching not implemented' }
      }, { status: 501 });
    }

    // Return optimization capabilities and user statistics
    const repository = new EnhancedPaintRepository(supabase);
    const paintsResult = await repository.getUserPaints(user.id, { archived: false }, { page: 1, limit: 1 });

    const userStats = await repository.getUserPaintStats(user.id);

    return NextResponse.json({
      data: {
        capabilities: {
          max_delta_e_target: 0.5,
          min_delta_e_target: 2.0,
          supported_algorithms: ['differential_evolution', 'tpe_hybrid', 'auto'],
          max_paint_count: 20,
          precision_ml: 0.1,
          asymmetric_ratios_supported: true,
          real_time_optimization: true,
          web_worker_enabled: true
        },
        user_context: {
          available_paints: paintsResult.pagination?.total_count || 0,
          total_optimizations: userStats?.mixing_sessions || 0,
          average_accuracy: userStats?.average_delta_e || 0,
          most_used_brand: userStats?.most_used_brand,
          total_paint_volume: userStats?.total_volume_ml || 0
        },
        performance_targets: {
          target_delta_e: 2.0,
          max_optimization_time_ms: 10000,
          typical_optimization_time_ms: 3000,
          success_rate_target: 95
        }
      },
      meta: {
        api_version: '1.0',
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('GET /api/optimize error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}