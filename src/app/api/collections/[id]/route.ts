/**
 * Individual Paint Collection Management API
 * Handles CRUD operations for specific paint collections
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/route-handler';
import { EnhancedPaintRepository } from '@/lib/database/repositories/enhanced-paint-repository';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database/database.types';
import { logger } from '@/lib/logging/logger';
import { addCacheHeaders, addNoCacheHeaders } from '@/lib/contracts/api-headers';

const PaintCollectionUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  color_space: z.enum(['sRGB', 'Adobe_RGB', 'ProPhoto_RGB', 'Lab']).optional(),
  is_default: z.boolean().optional(),
  tags: z.array(z.string()).optional()
});

const CollectionIdSchema = z.string().uuid('Invalid collection ID format');

async function getCurrentUser(supabase: SupabaseClient<Database>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const user = await getCurrentUser(supabase);

    // Validate collection ID
    const collectionId = CollectionIdSchema.parse(params.id);

    const repository = new EnhancedPaintRepository(supabase);
    const result = await repository.getCollectionById(collectionId, user.id);

    if (result.error) {
      return NextResponse.json(
        {
          error: {
            code: result.error.code,
            message: result.error.message
          }
        },
        { headers: addCacheHeaders(), status: result.error.code === 'NOT_FOUND' ? 404 : 500 }
      );
    }

    if (!result.data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Collection not found' } },
        { headers: addCacheHeaders(), status: 404 }
      );
    }

    // Get collection paints for additional context
    const paintsResult = await repository.getUserPaints(
      user.id,
      { collection_id: collectionId, archived: false },
      { page: 1, limit: 100, sort_field: 'name', sort_direction: 'asc' }
    );

    const paints = paintsResult.data || [];

    // Calculate detailed collection statistics
    const collectionStats = paints.length > 0 ? {
      paint_count: paints.length,
      total_volume_ml: paints.reduce((sum, p) => sum + p.volume_ml, 0),
      total_value: paints.reduce((sum, p) => sum + (p.volume_ml * p.cost_per_ml), 0),
      average_cost_per_ml: paints.reduce((sum, p) => sum + p.cost_per_ml, 0) / paints.length,
      brands: [...new Set(paints.map(p => p.brand))],
      finish_types: [...new Set(paints.map(p => p.finish_type))],
      color_verified_count: paints.filter(p => p.color_accuracy_verified).length,
      calibrated_count: paints.filter(p => p.optical_properties_calibrated).length,
      last_used: paints.reduce((latest, p) => {
        if (!p.last_used_at) return latest;
        const paintDate = new Date(p.last_used_at);
        return !latest || paintDate > latest ? paintDate : latest;
      }, null as Date | null),
      most_used_paint: paints.reduce((mostUsed, p) =>
        !mostUsed || p.times_used > mostUsed.times_used ? p : mostUsed
      , paints[0] || null)
    } : {
      paint_count: 0,
      total_volume_ml: 0,
      total_value: 0,
      average_cost_per_ml: 0,
      brands: [],
      finish_types: [],
      color_verified_count: 0,
      calibrated_count: 0,
      last_used: null,
      most_used_paint: null
    };

    return NextResponse.json({
      data: {
        ...result.data,
        statistics: collectionStats,
        paints: paints.map(p => ({
          id: p.id,
          name: p.name,
          brand: p.brand,
          hex_color: p.hex_color,
          volume_ml: p.volume_ml,
          cost_per_ml: p.cost_per_ml,
          finish_type: p.finish_type,
          times_used: p.times_used,
          last_used_at: p.last_used_at,
          color_accuracy_verified: p.color_accuracy_verified,
          optical_properties_calibrated: p.optical_properties_calibrated
        }))
      },
      meta: {
        retrieved_at: new Date().toISOString(),
        collection_version: result.data.updated_at,
        paints_included: paints.length
      }
    }, { headers: addCacheHeaders() });

  } catch (error) {
    logger.error({ err: error }, 'GET /api/collections/[id] error');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid collection ID',
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

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const user = await getCurrentUser(supabase);

    // Validate collection ID
    const collectionId = CollectionIdSchema.parse(params.id);

    const body = await request.json();
    const updateData = PaintCollectionUpdateSchema.parse(body);

    const repository = new EnhancedPaintRepository(supabase);

    // If setting as default, check if another default exists
    if (updateData.is_default === true) {
      const existingDefault = await repository.getUserCollections(
        user.id,
        { is_default: true, archived: false },
        { page: 1, limit: 1 }
      );

      if (existingDefault.data && existingDefault.data.length > 0 && existingDefault.data[0].id !== collectionId) {
        // Unset the existing default collection
        await repository.updateCollection(existingDefault.data[0].id, user.id, { is_default: false });
      }
    }

    // Check for duplicate names if name is being updated
    if (updateData.name) {
      const existingCollections = await repository.getUserCollections(
        user.id,
        { archived: false },
        { page: 1, limit: 100 }
      );

      const duplicateName = existingCollections.data?.some(
        c => c.id !== collectionId && c.name.toLowerCase() === updateData.name!.toLowerCase()
      );

      if (duplicateName) {
        return NextResponse.json(
          {
            error: {
              code: 'DUPLICATE_COLLECTION_NAME',
              message: 'A collection with this name already exists'
            }
          },
          { headers: addNoCacheHeaders(), status: 409 }
        );
      }
    }

    const result = await repository.updateCollection(collectionId, user.id, updateData);

    if (result.error) {
      return NextResponse.json(
        {
          error: {
            code: result.error.code,
            message: result.error.message
          }
        },
        { headers: addNoCacheHeaders(), status: result.error.code === 'NOT_FOUND' ? 404 : 500 }
      );
    }

    return NextResponse.json({
      data: result.data,
      meta: {
        updated_at: result.data?.updated_at,
        collection_id: collectionId
      }
    }, { headers: addNoCacheHeaders() });

  } catch (error) {
    logger.error('PATCH /api/collections/[id] error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update data',
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

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const user = await getCurrentUser(supabase);

    // Validate collection ID
    const collectionId = CollectionIdSchema.parse(params.id);

    const url = new URL(request.url);
    const permanent = url.searchParams.get('permanent') === 'true';
    const move_paints_to = url.searchParams.get('move_paints_to');

    const repository = new EnhancedPaintRepository(supabase);

    // Check if collection exists and belongs to user
    const collectionResult = await repository.getCollectionById(collectionId, user.id);
    if (collectionResult.error || !collectionResult.data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Collection not found' } },
        { headers: addNoCacheHeaders(), status: 404 }
      );
    }

    // Check if this is the default collection
    if (collectionResult.data.is_default && !permanent) {
      return NextResponse.json(
        {
          error: {
            code: 'CANNOT_ARCHIVE_DEFAULT',
            message: 'Cannot archive default collection. Either make another collection default first, or use permanent deletion.'
          }
        },
        { headers: addNoCacheHeaders(), status: 400 }
      );
    }

    // Handle paint relocation if requested
    if (move_paints_to && move_paints_to !== collectionId) {
      // Validate destination collection
      const destinationResult = await repository.getCollectionById(move_paints_to, user.id);
      if (destinationResult.error || !destinationResult.data) {
        return NextResponse.json(
          { error: { code: 'INVALID_DESTINATION', message: 'Destination collection not found' } },
          { headers: addNoCacheHeaders(), status: 400 }
        );
      }

      // Move paints to destination collection
      await repository.movePaintsToCollection(collectionId, move_paints_to, user.id);
    } else if (!permanent) {
      // Archive all paints in the collection
      await repository.archivePaintsByCollection(collectionId, user.id, 'Collection archived');
    }

    let result;
    if (permanent) {
      // Hard delete - completely remove from database
      result = await repository.deleteCollection(collectionId, user.id);
    } else {
      // Soft delete - archive the collection
      result = await repository.archiveCollection(collectionId, user.id, 'Deleted by user');
    }

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

    return NextResponse.json({
      data: {
        deleted: true,
        permanent,
        collection_id: collectionId,
        paints_moved: move_paints_to ? true : false,
        destination_collection: move_paints_to
      },
      meta: {
        deleted_at: new Date().toISOString()
      }
    }, { headers: addNoCacheHeaders() });

  } catch (error) {
    logger.error('DELETE /api/collections/[id] error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid collection ID',
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