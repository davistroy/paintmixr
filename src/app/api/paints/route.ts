/**
 * Enhanced Paint API with Supabase integration
 * Supports CRUD operations for user paint collections
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@/lib/supabase/admin';
import { EnhancedPaintRepository } from '@/lib/database/repositories/enhanced-paint-repository';
import { EnhancedPaintCreateSchema } from '@/lib/database/models/enhanced-paint';
import { PaintFilters, PaginationOptions } from '@/lib/database/database.types';
import { z } from 'zod';

const QueryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort_field: z.enum(['name', 'brand', 'created_at', 'updated_at', 'last_used_at', 'times_used', 'volume_ml', 'cost_per_ml']).optional(),
  sort_direction: z.enum(['asc', 'desc']).default('desc'),
  brand: z.string().optional(),
  finish_type: z.enum(['matte', 'satin', 'semi_gloss', 'gloss', 'high_gloss']).optional(),
  collection_id: z.string().uuid().optional(),
  tags: z.string().transform(val => val ? val.split(',') : undefined).optional(),
  min_volume: z.coerce.number().min(0).optional(),
  max_volume: z.coerce.number().min(0).optional(),
  min_cost: z.coerce.number().min(0).optional(),
  max_cost: z.coerce.number().min(0).optional(),
  color_verified: z.coerce.boolean().optional(),
  calibrated: z.coerce.boolean().optional(),
  archived: z.coerce.boolean().default(false)
});

async function getCurrentUser(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const user = await getCurrentUser(supabase);

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());

    const parsedParams = QueryParamsSchema.parse(queryParams);

    // Build filters
    const filters: PaintFilters = {
      brand: parsedParams.brand,
      finish_type: parsedParams.finish_type,
      collection_id: parsedParams.collection_id,
      tags: parsedParams.tags,
      min_volume: parsedParams.min_volume,
      max_volume: parsedParams.max_volume,
      min_cost: parsedParams.min_cost,
      max_cost: parsedParams.max_cost,
      color_verified: parsedParams.color_verified,
      calibrated: parsedParams.calibrated,
      archived: parsedParams.archived
    };

    // Build pagination options
    const pagination: PaginationOptions = {
      page: parsedParams.page,
      limit: parsedParams.limit,
      sort_field: parsedParams.sort_field,
      sort_direction: parsedParams.sort_direction
    };

    const repository = new EnhancedPaintRepository(supabase);
    const result = await repository.getUserPaints(user.id, filters, pagination);

    if (result.error) {
      return NextResponse.json(
        {
          error: {
            code: result.error.code,
            message: result.error.message
          }
        },
        { status: result.error.code === 'NOT_FOUND' ? 404 : 500 }
      );
    }

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
      meta: {
        total_count: result.pagination.total_count,
        filters_applied: Object.keys(filters).filter(key => filters[key as keyof PaintFilters] !== undefined).length,
        cache_timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('GET /api/paints error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
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
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const user = await getCurrentUser(supabase);

    const body = await request.json();

    // Validate request body
    const paintData = EnhancedPaintCreateSchema.parse({
      ...body,
      user_id: user.id
    });

    const repository = new EnhancedPaintRepository(supabase);
    const result = await repository.createPaint(paintData as any);

    if (result.error) {
      return NextResponse.json(
        {
          error: {
            code: result.error.code,
            message: result.error.message
          }
        },
        { status: result.error.code === 'VALIDATION_ERROR' ? 400 : 500 }
      );
    }

    return NextResponse.json(
      {
        data: result.data,
        meta: {
          created_at: result.data?.created_at,
          version: result.data?.version
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('POST /api/paints error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid paint data',
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
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// Bulk operations endpoint
export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const user = await getCurrentUser(supabase);

    const body = await request.json();
    const { paint_ids, updates } = body;

    if (!Array.isArray(paint_ids) || paint_ids.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'paint_ids array is required' } },
        { status: 400 }
      );
    }

    if (paint_ids.length > 50) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Maximum 50 paints can be updated at once' } },
        { status: 400 }
      );
    }

    // Validate paint IDs are UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!paint_ids.every((id: string) => uuidRegex.test(id))) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid paint ID format' } },
        { status: 400 }
      );
    }

    const repository = new EnhancedPaintRepository(supabase);
    const result = await repository.bulkUpdatePaints(paint_ids, user.id, updates);

    if (result.error) {
      return NextResponse.json(
        {
          error: {
            code: result.error.code,
            message: result.error.message
          }
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: result.data,
      meta: {
        updated_count: result.data?.length || 0,
        updated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('PUT /api/paints error:', error);

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

export async function DELETE() {
  return NextResponse.json(
    { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use DELETE /api/paints/[id] for individual paint deletion' } },
    { status: 405 }
  );
}