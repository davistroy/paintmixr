/**
 * Paint Collections API for managing user paint collections
 * Provides collection management with automatic statistics calculation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@/lib/supabase/admin';
import { EnhancedPaintRepository } from '@/lib/database/repositories/enhanced-paint-repository';
import { z } from 'zod';

const QueryParamsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort_field: z.enum(['name', 'created_at', 'updated_at', 'paint_count', 'total_volume_ml', 'average_cost_per_ml']).default('updated_at'),
  sort_direction: z.enum(['asc', 'desc']).default('desc'),
  color_space: z.enum(['sRGB', 'Adobe_RGB', 'ProPhoto_RGB', 'Lab']).optional(),
  include_default: z.coerce.boolean().default(true),
  archived: z.coerce.boolean().default(false),
  min_paint_count: z.coerce.number().min(0).optional(),
  max_paint_count: z.coerce.number().min(0).optional(),
  tags: z.string().transform(val => val ? val.split(',') : undefined).optional()
});

const PaintCollectionCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  color_space: z.enum(['sRGB', 'Adobe_RGB', 'ProPhoto_RGB', 'Lab']).default('sRGB'),
  is_default: z.boolean().default(false),
  tags: z.array(z.string()).optional()
});

const PaintCollectionUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  color_space: z.enum(['sRGB', 'Adobe_RGB', 'ProPhoto_RGB', 'Lab']).optional(),
  is_default: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  archived: z.boolean().optional()
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
    const filters: any = {
      archived: parsedParams.archived
    };

    if (parsedParams.color_space) {
      filters.color_space = parsedParams.color_space;
    }
    if (parsedParams.min_paint_count !== undefined) {
      filters.min_paint_count = parsedParams.min_paint_count;
    }
    if (parsedParams.max_paint_count !== undefined) {
      filters.max_paint_count = parsedParams.max_paint_count;
    }
    if (parsedParams.tags) {
      filters.tags = parsedParams.tags;
    }
    if (!parsedParams.include_default) {
      filters.is_default = false;
    }

    const pagination = {
      page: parsedParams.page,
      limit: parsedParams.limit,
      sort_field: parsedParams.sort_field,
      sort_direction: parsedParams.sort_direction
    };

    const repository = new EnhancedPaintRepository(supabase);
    const result = await repository.getUserCollections(user.id, filters, pagination);

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

    // Calculate summary statistics
    const collections = result.data || [];
    const summary = collections.length > 0 ? {
      total_collections: collections.length,
      total_paints: collections.reduce((sum, c) => sum + c.paint_count, 0),
      total_volume_ml: collections.reduce((sum, c) => sum + c.total_volume_ml, 0),
      average_collection_size: collections.reduce((sum, c) => sum + c.paint_count, 0) / collections.length,
      color_spaces_used: [...new Set(collections.map(c => c.color_space))],
      most_used_color_space: collections.reduce((acc, c) => {
        acc[c.color_space] = (acc[c.color_space] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    } : null;

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
      summary,
      meta: {
        total_collections: result.pagination.total_count,
        filters_applied: Object.keys(filters).filter(key => filters[key] !== undefined).length,
        query_timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('GET /api/collections error:', error);

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
    const collectionData = PaintCollectionCreateSchema.parse(body);

    const repository = new EnhancedPaintRepository(supabase);

    // Check if user is trying to create a default collection when one already exists
    if (collectionData.is_default) {
      const existingDefault = await repository.getUserCollections(
        user.id,
        { is_default: true, archived: false },
        { page: 1, limit: 1 }
      );

      if (existingDefault.data && existingDefault.data.length > 0) {
        return NextResponse.json(
          {
            error: {
              code: 'DEFAULT_COLLECTION_EXISTS',
              message: 'A default collection already exists. Please update the existing one or create a non-default collection.'
            }
          },
          { status: 409 }
        );
      }
    }

    // Check for duplicate collection names
    const existingCollections = await repository.getUserCollections(
      user.id,
      { archived: false },
      { page: 1, limit: 100 }
    );

    if (existingCollections.data?.some(c => c.name.toLowerCase() === collectionData.name.toLowerCase())) {
      return NextResponse.json(
        {
          error: {
            code: 'DUPLICATE_COLLECTION_NAME',
            message: 'A collection with this name already exists'
          }
        },
        { status: 409 }
      );
    }

    const result = await repository.createCollection({
      name: collectionData.name,
      description: collectionData.description || null,
      color_space: collectionData.color_space,
      is_default: collectionData.is_default,
      tags: collectionData.tags || null,
      user_id: user.id,
      paint_count: 0,
      total_volume_ml: 0,
      average_cost_per_ml: 0
    });

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

    return NextResponse.json(
      {
        data: result.data,
        meta: {
          created_at: result.data?.created_at,
          collection_id: result.data?.id
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('POST /api/collections error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid collection data',
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

// Bulk operations for collections
export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const user = await getCurrentUser(supabase);

    const body = await request.json();
    const { collection_ids, updates, operation } = body;

    if (!Array.isArray(collection_ids) || collection_ids.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'collection_ids array is required' } },
        { status: 400 }
      );
    }

    if (collection_ids.length > 20) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Maximum 20 collections can be updated at once' } },
        { status: 400 }
      );
    }

    // Validate collection IDs are UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!collection_ids.every((id: string) => uuidRegex.test(id))) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid collection ID format' } },
        { status: 400 }
      );
    }

    const repository = new EnhancedPaintRepository(supabase);

    let result;

    switch (operation) {
      case 'archive':
        result = await repository.bulkArchiveCollections(collection_ids, user.id);
        break;

      case 'restore':
        result = await repository.bulkRestoreCollections(collection_ids, user.id);
        break;

      case 'update':
        if (!updates) {
          return NextResponse.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Updates object required for update operation' } },
            { status: 400 }
          );
        }
        const validatedUpdates = PaintCollectionUpdateSchema.parse(updates);
        result = await repository.bulkUpdateCollections(collection_ids, user.id, validatedUpdates);
        break;

      case 'delete':
        result = await repository.bulkDeleteCollections(collection_ids, user.id);
        break;

      default:
        return NextResponse.json(
          { error: { code: 'INVALID_OPERATION', message: 'Operation must be one of: archive, restore, update, delete' } },
          { status: 400 }
        );
    }

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
        operation,
        affected_count: result.data?.length || 0,
        processed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('PUT /api/collections error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid bulk operation data',
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

export async function DELETE() {
  return NextResponse.json(
    { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use DELETE /api/collections/[id] for individual collection deletion' } },
    { status: 405 }
  );
}