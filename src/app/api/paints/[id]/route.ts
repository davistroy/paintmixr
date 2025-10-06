import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/route-handler';
import { EnhancedPaintRepository } from '@/lib/database/repositories/enhanced-paint-repository';
import { EnhancedPaintUpdateSchema } from '@/lib/database/models/enhanced-paint';
import { z } from 'zod';
import { logger } from '@/lib/logging/logger';
import { addCacheHeaders, addNoCacheHeaders } from '@/lib/contracts/api-headers';

async function getCurrentUser(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

const PaintIdSchema = z.string().uuid('Invalid paint ID format');

export async function GET(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();
    const user = await getCurrentUser(supabase);

    // Validate paint ID
    const paintId = PaintIdSchema.parse(params.id);

    const repository = new EnhancedPaintRepository(supabase);
    const result = await repository.getPaintById(paintId, user.id);

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
        { error: { code: 'NOT_FOUND', message: 'Paint not found' } },
        { headers: addCacheHeaders(), status: 404 }
      );
    }

    return NextResponse.json({
      data: result.data,
      meta: {
        retrieved_at: new Date().toISOString(),
        version: result.data.version
      }
    }, { headers: addCacheHeaders() });

  } catch (error) {
    logger.error({ error, route: 'GET /api/paints/[id]' }, 'API error');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid paint ID',
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

    // Validate paint ID
    const paintId = PaintIdSchema.parse(params.id);

    const body = await request.json();

    // Validate update data
    const updateData = EnhancedPaintUpdateSchema.parse(body);

    const repository = new EnhancedPaintRepository(supabase);
    const result = await repository.updatePaint(paintId, user.id, updateData as any);

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
        version: result.data?.version
      }
    }, { headers: addNoCacheHeaders() });

  } catch (error) {
    logger.error({ error, route: 'PATCH /api/paints/[id]' }, 'API error');

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

    // Validate paint ID
    const paintId = PaintIdSchema.parse(params.id);

    // Check for soft delete vs hard delete
    const url = new URL(request.url);
    const permanent = url.searchParams.get('permanent') === 'true';

    const repository = new EnhancedPaintRepository(supabase);

    let result;
    if (permanent) {
      // Hard delete - completely remove from database
      result = await repository.deletePaint(paintId, user.id);
    } else {
      // Soft delete - archive the paint
      const reason = url.searchParams.get('reason') || 'Deleted by user';
      const archiveResult = await repository.archivePaint(paintId, user.id, reason);
      result = { data: archiveResult.data ? true : false, error: archiveResult.error };
    }

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
      data: {
        deleted: true,
        permanent,
        paint_id: paintId
      },
      meta: {
        deleted_at: new Date().toISOString()
      }
    }, { headers: addNoCacheHeaders() });

  } catch (error) {
    logger.error({ error, route: 'DELETE /api/paints/[id]' }, 'API error');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid paint ID',
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