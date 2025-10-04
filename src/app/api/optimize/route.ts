/**
 * POST /api/optimize - Enhanced Paint Mixing Optimization API (T016)
 * Feature: 007-enhanced-mode-1
 *
 * Server-side optimization endpoint supporting both Standard and Enhanced modes.
 * Validates requests, fetches user paints, and runs optimization algorithms.
 *
 * Enhanced Mode: Delta E ≤ 2.0, 2-5 paints, 30-second timeout
 * Standard Mode: Delta E ≤ 5.0, 2-3 paints, faster optimization
 *
 * Contract: /specs/007-enhanced-mode-1/contracts/optimize-api.yaml
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/route-handler';
import { optimizeEnhanced } from '@/lib/mixing-optimization/enhanced-optimizer';
import {
  enhancedOptimizationRequestSchema,
  formatZodError,
  safeValidateWithSchema
} from '@/lib/mixing-optimization/validation';
import {
  EnhancedOptimizationRequest,
  EnhancedOptimizationResponse,
  Paint
} from '@/lib/types';
import { z } from 'zod';

/**
 * Vercel serverless function timeout configuration
 * Max 30 seconds for Pro tier (algorithm uses 28s internally for 2s buffer)
 */
export const maxDuration = 30;

/**
 * POST /api/optimize
 *
 * Optimizes paint mixing formula to match target color.
 * Auto-selects algorithm based on paint count (≤8: DE, >8: TPE).
 *
 * @param request - NextRequest with EnhancedOptimizationRequest body
 * @returns NextResponse with EnhancedOptimizationResponse
 *
 * Error Responses:
 * - 400: Invalid request (validation failure)
 * - 401: Unauthorized (no user session)
 * - 404: Paint IDs not found in user's collection
 * - 500: Server error (algorithm crash, database error)
 * - 504: Gateway timeout (>30s)
 */
export async function POST(request: NextRequest): Promise<NextResponse<EnhancedOptimizationResponse>> {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          formula: null,
          metrics: null,
          warnings: [],
          error: 'Authentication required'
        },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          formula: null,
          metrics: null,
          warnings: [],
          error: 'Invalid JSON in request body'
        },
        { status: 400 }
      );
    }

    // Build request schema that accepts paint IDs (string[]) instead of full Paint objects
    const requestSchemaForAPI = enhancedOptimizationRequestSchema;

    const validationResult = safeValidateWithSchema(requestSchemaForAPI, requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          formula: null,
          metrics: null,
          warnings: [],
          error: formatZodError(validationResult.error)
        },
        { status: 400 }
      );
    }

    const validatedRequest = validationResult.data;

    // 3. Fetch user's paints from database (RLS enforced)
    const paintIds = validatedRequest.availablePaints;

    const { data: paintsData, error: paintsError } = await supabase
      .from('paints')
      .select('*')
      .in('id', paintIds)
      .eq('user_id', user.id); // RLS enforcement - user can only access their paints

    if (paintsError) {
      console.error('Error fetching paints:', paintsError);
      return NextResponse.json(
        {
          success: false,
          formula: null,
          metrics: null,
          warnings: [],
          error: 'Failed to fetch paints from database'
        },
        { status: 500 }
      );
    }

    if (!paintsData || paintsData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          formula: null,
          metrics: null,
          warnings: [],
          error: 'No paints found with provided IDs. Ensure paint IDs belong to authenticated user.'
        },
        { status: 404 }
      );
    }

    // Check if all requested paints were found
    if (paintsData.length < paintIds.length) {
      const foundIds = new Set(paintsData.map((p: any) => p.id as string));
      const missingIds = paintIds.filter(id => !foundIds.has(id));
      return NextResponse.json(
        {
          success: false,
          formula: null,
          metrics: null,
          warnings: [],
          error: `Paint IDs not found: ${missingIds.join(', ')}`
        },
        { status: 404 }
      );
    }

    // Convert database records to Paint type (using type assertion for Supabase types)
    const paints: Paint[] = paintsData.map((p: any) => ({
      id: p.id as string,
      name: p.name as string,
      brand: p.brand as string,
      color: {
        hex: p.hex_color as string,
        lab: p.lab_color as { l: number; a: number; b: number }
      },
      opacity: p.opacity as number,
      tintingStrength: p.tinting_strength as number,
      kubelkaMunk: p.kubelka_munk as { k: number; s: number },
      userId: p.user_id as string,
      createdAt: p.created_at as string,
      updatedAt: p.updated_at as string
    }));

    // 4. Build EnhancedOptimizationRequest with Paint[] instead of string[]
    const optimizationRequest: EnhancedOptimizationRequest = {
      targetColor: validatedRequest.targetColor,
      availablePaints: paints, // Full Paint objects
      mode: validatedRequest.mode,
      volumeConstraints: validatedRequest.volumeConstraints,
      maxPaintCount: validatedRequest.maxPaintCount,
      timeLimit: validatedRequest.timeLimit,
      accuracyTarget: validatedRequest.accuracyTarget
    };

    // 5. Run optimization with timeout wrapper
    const timeLimit = validatedRequest.timeLimit || 28000;
    let result: { formula: any; metrics: any };

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Optimization timeout exceeded 30 seconds'));
        }, timeLimit + 2000); // 2s buffer beyond internal timeout
      });

      // Race optimization against timeout
      result = await Promise.race([
        optimizeEnhanced(optimizationRequest),
        timeoutPromise
      ]);

    } catch (optimizationError) {
      // Check if timeout error
      if (optimizationError instanceof Error && optimizationError.message.includes('timeout')) {
        return NextResponse.json(
          {
            success: false,
            formula: null,
            metrics: null,
            warnings: [],
            error: `Server timeout: Optimization exceeded ${timeLimit}ms limit`
          },
          { status: 504 }
        );
      }

      // Other optimization errors
      console.error('Optimization error:', optimizationError);
      return NextResponse.json(
        {
          success: false,
          formula: null,
          metrics: null,
          warnings: [],
          error: optimizationError instanceof Error
            ? `Optimization failed: ${optimizationError.message}`
            : 'Optimization failed: Unknown error'
        },
        { status: 500 }
      );
    }

    // 6. Build response with warnings
    const warnings: string[] = [];

    // Add timeout warning if early termination
    if (result.metrics.earlyTermination) {
      warnings.push(`Optimization timed out after ${result.metrics.timeElapsed}ms. Returning best result found.`);
    }

    // Add accuracy warning if target not met
    if (!result.metrics.targetMet) {
      const targetDeltaE = validatedRequest.accuracyTarget || (validatedRequest.mode === 'enhanced' ? 2.0 : 5.0);
      warnings.push(
        `Target Delta E ≤ ${targetDeltaE} not achieved (achieved: ${result.formula.deltaE.toFixed(2)}). ` +
        `Consider simplifying paint selection or using ${validatedRequest.mode === 'enhanced' ? 'Standard' : 'Enhanced'} mode.`
      );
    }

    // Add convergence warning if didn't converge
    if (!result.metrics.convergenceAchieved) {
      warnings.push('Algorithm did not fully converge. Result may be suboptimal.');
    }

    // 7. Return success response
    const response: EnhancedOptimizationResponse = {
      success: true,
      formula: result.formula,
      metrics: result.metrics,
      warnings,
      error: null
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    // Catch-all error handler
    console.error('Unexpected error in /api/optimize:', error);

    // Check for Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          formula: null,
          metrics: null,
          warnings: [],
          error: formatZodError(error)
        },
        { status: 400 }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        success: false,
        formula: null,
        metrics: null,
        warnings: [],
        error: error instanceof Error
          ? `Internal server error: ${error.message}`
          : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/optimize
 *
 * Returns API capabilities and optimization metadata.
 * Useful for clients to discover supported features.
 *
 * @returns NextResponse with API capabilities
 */
export async function GET() {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Return capabilities
    return NextResponse.json({
      success: true,
      capabilities: {
        modes: ['standard', 'enhanced'],
        algorithms: ['differential_evolution', 'tpe_hybrid', 'auto'],
        maxPaintCount: 5,
        minPaintCount: 2,
        maxTimeLimit: 30000,
        enhancedMode: {
          targetDeltaE: 2.0,
          maxPaints: 5,
          minPaints: 2
        },
        standardMode: {
          targetDeltaE: 5.0,
          maxPaints: 3,
          minPaints: 2
        }
      },
      meta: {
        apiVersion: '1.0',
        endpoint: '/api/optimize',
        documentation: '/specs/007-enhanced-mode-1/contracts/optimize-api.yaml'
      }
    }, { status: 200 });

  } catch (error) {
    console.error('GET /api/optimize error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
