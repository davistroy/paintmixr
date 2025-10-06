/**
 * Shared API Route Helpers
 * Common patterns for authentication, error handling, and validation
 */

import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logging/logger';

/**
 * Get the current authenticated user
 * @throws Error if user is not authenticated
 */
export async function getCurrentUser(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user;
}

/**
 * Create admin Supabase client and get current user in one call
 * @returns Object with supabase client and authenticated user
 * @throws Error if user is not authenticated
 */
export async function getAuthenticatedContext() {
  const supabase = createAdminClient();
  const user = await getCurrentUser(supabase);
  return { supabase, user };
}

/**
 * Standard error response types
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'FORBIDDEN';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const statusMap: Record<ApiErrorCode, number> = {
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
  };

  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status: statusMap[code] }
  );
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, unknown>
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({
    data,
    ...(meta && { meta }),
  });
}

/**
 * Handle common API route errors
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  logger.error('API error:', error);

  // Zod validation error
  if (error instanceof z.ZodError) {
    return createErrorResponse('VALIDATION_ERROR', 'Validation failed', error.issues);
  }

  // Unauthorized error
  if (error instanceof Error && error.message === 'Unauthorized') {
    return createErrorResponse('UNAUTHORIZED', 'Authentication required');
  }

  // Generic error
  return createErrorResponse('INTERNAL_ERROR', 'Internal server error');
}

/**
 * Common validation schemas
 */
export const UuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Validate UUID parameter (commonly used for [id] routes)
 */
export function validateUuid(id: string, fieldName: string = 'ID'): string {
  return z.string().uuid(`Invalid ${fieldName} format`).parse(id);
}

/**
 * Parse and validate JSON body
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}

/**
 * Handle repository result with standard error mapping
 */
export function handleRepositoryResult<T>(
  result: { data?: T; error?: { code: string; message: string } },
  notFoundMessage: string = 'Resource not found'
): NextResponse<ApiSuccessResponse<T> | ApiErrorResponse> {
  if (result.error) {
    const code = result.error.code === 'NOT_FOUND' ? 'NOT_FOUND' : 'INTERNAL_ERROR';
    return createErrorResponse(code as ApiErrorCode, result.error.message);
  }

  if (!result.data) {
    return createErrorResponse('NOT_FOUND', notFoundMessage);
  }

  return createSuccessResponse(result.data);
}

/**
 * Wrap async route handler with error handling
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
