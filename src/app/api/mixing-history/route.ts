/**
 * Mixing History API for tracking paint optimization sessions
 * Provides analytics and historical data for user paint mixing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/route-handler';
import { EnhancedPaintRepository } from '@/lib/database/repositories/enhanced-paint-repository';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database/database.types';
import { logger } from '@/lib/logging/logger';
import { addCacheHeaders, addNoCacheHeaders } from '@/lib/contracts/api-headers';

const QueryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort_field: z.enum(['created_at', 'delta_e_achieved', 'color_accuracy_score', 'mixing_efficiency_score', 'user_satisfaction_rating']).default('created_at'),
  sort_direction: z.enum(['asc', 'desc']).default('desc'),
  project_name: z.string().optional(),
  algorithm_used: z.enum(['differential_evolution', 'tpe_hybrid', 'auto']).optional(),
  min_delta_e: z.coerce.number().min(0).optional(),
  max_delta_e: z.coerce.number().min(0).optional(),
  min_accuracy_score: z.coerce.number().min(0).max(100).optional(),
  convergence_only: z.coerce.boolean().optional(),
  surface_type: z.string().optional(),
  application_method: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  would_use_again: z.coerce.boolean().optional()
});

const MixingHistoryCreateSchema = z.object({
  target_color: z.object({
    L: z.number().min(0).max(100),
    a: z.number().min(-128).max(127),
    b: z.number().min(-128).max(127)
  }),
  achieved_color: z.object({
    L: z.number().min(0).max(100),
    a: z.number().min(-128).max(127),
    b: z.number().min(-128).max(127)
  }),
  delta_e_achieved: z.number().min(0),
  paint_volumes: z.record(z.string().uuid(), z.number().min(0)),
  total_volume_ml: z.number().min(0),
  mixing_time_minutes: z.number().min(0),
  algorithm_used: z.string(),
  iterations_completed: z.number().min(0),
  optimization_time_ms: z.number().min(0),
  convergence_achieved: z.boolean(),
  color_accuracy_score: z.number().min(0).max(100).optional(),
  mixing_efficiency_score: z.number().min(0).max(100).optional(),
  cost_effectiveness_score: z.number().min(0).max(100).optional(),
  project_name: z.string().optional(),
  surface_type: z.string().optional(),
  application_method: z.string().optional(),
  environmental_conditions: z.object({
    temperature_c: z.number().optional(),
    humidity_percent: z.number().optional(),
    lighting_conditions: z.string().optional()
  }).optional(),
  user_satisfaction_rating: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
  would_use_again: z.boolean().optional()
});

async function getCurrentUser(supabase: SupabaseClient<Database>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser(supabase);

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const parsedParams = QueryParamsSchema.parse(queryParams);

    // Build filters
    const filters: Record<string, unknown> = {
      archived: false
    };

    if (parsedParams.project_name) {
      filters.project_name = parsedParams.project_name;
    }
    if (parsedParams.algorithm_used) {
      filters.algorithm_used = parsedParams.algorithm_used;
    }
    if (parsedParams.min_delta_e !== undefined) {
      filters.min_delta_e = parsedParams.min_delta_e;
    }
    if (parsedParams.max_delta_e !== undefined) {
      filters.max_delta_e = parsedParams.max_delta_e;
    }
    if (parsedParams.min_accuracy_score !== undefined) {
      filters.min_accuracy_score = parsedParams.min_accuracy_score;
    }
    if (parsedParams.convergence_only !== undefined) {
      filters.convergence_achieved = parsedParams.convergence_only;
    }
    if (parsedParams.surface_type) {
      filters.surface_type = parsedParams.surface_type;
    }
    if (parsedParams.application_method) {
      filters.application_method = parsedParams.application_method;
    }
    if (parsedParams.date_from) {
      filters.date_from = parsedParams.date_from;
    }
    if (parsedParams.date_to) {
      filters.date_to = parsedParams.date_to;
    }
    if (parsedParams.would_use_again !== undefined) {
      filters.would_use_again = parsedParams.would_use_again;
    }

    const pagination = {
      page: parsedParams.page,
      limit: parsedParams.limit,
      sort_field: parsedParams.sort_field,
      sort_direction: parsedParams.sort_direction
    };

    const repository = new EnhancedPaintRepository(supabase);
    const result = await repository.getMixingHistory(user.id, filters, pagination);

    if (result.error) {
      return NextResponse.json(
        {
          error: {
            code: result.error.code,
            message: result.error.message
          }
        },
        { headers: addCacheHeaders(), status: 500 }
      );
    }

    // Calculate analytics for current page
    const sessions = result.data || [];
    const analytics = sessions.length > 0 ? {
      average_delta_e: sessions.reduce((sum, s) => sum + s.delta_e_achieved, 0) / sessions.length,
      average_accuracy_score: sessions.reduce((sum, s) => sum + (s.color_accuracy_score || 0), 0) / sessions.length,
      convergence_rate: (sessions.filter(s => s.convergence_achieved).length / sessions.length) * 100,
      most_used_algorithm: sessions.reduce((acc, s) => {
        acc[s.algorithm_used] = (acc[s.algorithm_used] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      total_volume_mixed: sessions.reduce((sum, s) => sum + s.total_volume_ml, 0),
      average_mixing_time: sessions.reduce((sum, s) => sum + s.mixing_time_minutes, 0) / sessions.length,
      user_satisfaction: sessions.filter(s => s.user_satisfaction_rating).length > 0
        ? sessions.reduce((sum, s) => sum + (s.user_satisfaction_rating || 0), 0) / sessions.filter(s => s.user_satisfaction_rating).length
        : null
    } : null;

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
      analytics,
      meta: {
        total_sessions: result.pagination.total_count,
        filters_applied: Object.keys(filters).filter(key => filters[key] !== undefined).length,
        query_timestamp: new Date().toISOString()
      }
    }, { headers: addCacheHeaders() });

  } catch (error) {
    logger.error('GET /api/mixing-history error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: error.issues
          }
        },
        { headers: addCacheHeaders(), status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { headers: addCacheHeaders(), status: 401 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { headers: addCacheHeaders(), status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser(supabase);

    const body = await request.json();
    const sessionData = MixingHistoryCreateSchema.parse(body);

    const repository = new EnhancedPaintRepository(supabase);
    const result = await repository.saveMixingHistory({
      ...sessionData,
      user_id: user.id
    });

    if (result.error) {
      return NextResponse.json(
        {
          error: {
            code: result.error.code,
            message: result.error.message
          }
        },
        { headers: addNoCacheHeaders(), status: 500 }
      );
    }

    // Update paint usage statistics
    try {
      await Promise.all(
        Object.entries(sessionData.paint_volumes).map(([paintId, volume]) =>
          repository.updatePaintUsageStats(paintId, user.id, volume)
        )
      );
    } catch (usageError) {
      logger.warn('Failed to update paint usage stats:', usageError);
      // Don't fail the request if usage stats update fails
    }

    return NextResponse.json(
      {
        data: result.data,
        meta: {
          created_at: result.data?.created_at,
          session_id: result.data?.id
        }
      },
      { headers: addNoCacheHeaders(), status: 201 }
    );

  } catch (error) {
    logger.error('POST /api/mixing-history error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid mixing session data',
            details: error.issues
          }
        },
        { headers: addNoCacheHeaders(), status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { headers: addNoCacheHeaders(), status: 401 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { headers: addNoCacheHeaders(), status: 500 }
    );
  }
}

// Analytics endpoint for dashboard metrics
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser(supabase);

    const url = new URL(request.url);
    const analyticsType = url.searchParams.get('analytics');

    if (!analyticsType) {
      return NextResponse.json(
        { error: { code: 'MISSING_PARAMETER', message: 'Analytics type required' } },
        { headers: addNoCacheHeaders(), status: 400 }
      );
    }

    const repository = new EnhancedPaintRepository(supabase);

    switch (analyticsType) {
      case 'performance-trends': {
        const performanceData = await repository.getPerformanceTrends(user.id);
        return NextResponse.json({ data: performanceData }, { headers: addNoCacheHeaders() });
      }

      case 'color-accuracy-distribution': {
        const accuracyData = await repository.getColorAccuracyDistribution(user.id);
        return NextResponse.json({ data: accuracyData }, { headers: addNoCacheHeaders() });
      }

      case 'algorithm-effectiveness': {
        const algorithmData = await repository.getAlgorithmEffectiveness(user.id);
        return NextResponse.json({ data: algorithmData }, { headers: addNoCacheHeaders() });
      }

      case 'cost-analysis': {
        const costData = await repository.getMixingCostAnalysis(user.id);
        return NextResponse.json({ data: costData }, { headers: addNoCacheHeaders() });
      }

      case 'project-summary': {
        const projectData = await repository.getProjectSummary(user.id);
        return NextResponse.json({ data: projectData }, { headers: addNoCacheHeaders() });
      }

      default:
        return NextResponse.json(
          { error: { code: 'INVALID_ANALYTICS_TYPE', message: 'Unsupported analytics type' } },
          { headers: addNoCacheHeaders(), status: 400 }
        );
    }

  } catch (error) {
    logger.error('PUT /api/mixing-history analytics error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { headers: addNoCacheHeaders(), status: 401 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Analytics request failed' } },
      { headers: addNoCacheHeaders(), status: 500 }
    );
  }
}