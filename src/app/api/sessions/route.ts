/**
 * GET /api/sessions
 * List mixing sessions for authenticated user with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type {
  SessionListResponse,
  ErrorResponse,
} from '@/types/types'
import { SessionService } from '@/lib/supabase/sessions'

const SessionListQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
  favorites_only: z.string().optional().transform(val => val === 'true'),
  session_type: z.enum(['color_matching', 'ratio_prediction']).optional(),
}).refine(data => {
  return data.limit >= 1 && data.limit <= 100
}, {
  message: 'Limit must be between 1 and 100',
  path: ['limit'],
}).refine(data => {
  return data.offset >= 0
}, {
  message: 'Offset must be non-negative',
  path: ['offset'],
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Extract and validate query parameters
    const queryParams = {
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      favorites_only: searchParams.get('favorites_only'),
      session_type: searchParams.get('session_type'),
    }

    const validatedParams = SessionListQuerySchema.parse(queryParams)

    // Get sessions using service layer
    const result = await SessionService.listSessions({
      limit: validatedParams.limit,
      offset: validatedParams.offset,
      favorites_only: validatedParams.favorites_only,
      session_type: validatedParams.session_type,
    })

    const response: SessionListResponse = {
      sessions: result.sessions,
      total_count: result.total_count,
      has_more: result.has_more,
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Sessions list error:', error)

    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: error.errors,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    if (error instanceof Error) {
      if (error.message === 'User not authenticated') {
        const errorResponse: ErrorResponse = {
          error: 'AUTHENTICATION_ERROR',
          message: 'Authentication required',
        }
        return NextResponse.json(errorResponse, { status: 401 })
      }
    }

    const errorResponse: ErrorResponse = {
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch sessions',
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request using the same schema as CreateSessionRequest
    const CreateSessionRequestSchema = z.object({
      session_type: z.enum(['color_matching', 'ratio_prediction']),
      input_method: z.enum(['color_picker', 'image_upload', 'manual_ratios']),
      target_color: z.object({
        hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format'),
        lab: z.object({
          l: z.number().min(0).max(100),
          a: z.number().min(-128).max(127),
          b: z.number().min(-128).max(127),
        }),
      }).optional(),
      calculated_color: z.object({
        hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format'),
        lab: z.object({
          l: z.number().min(0).max(100),
          a: z.number().min(-128).max(127),
          b: z.number().min(-128).max(127),
        }),
      }).optional(),
      delta_e: z.number().min(0).optional(),
      formula: z.object({
        total_volume_ml: z.number().min(0.1),
        paint_ratios: z.array(
          z.object({
            paint_id: z.string().min(1),
            paint_name: z.string().min(1).optional(),
            volume_ml: z.number().min(0.01),
            percentage: z.number().min(0.01).max(100),
          })
        ).min(1).max(5),
        mixing_order: z.array(z.string()).optional(),
      }).optional(),
      custom_label: z.string().min(1).max(100).optional(),
      notes: z.string().max(1000).optional(),
      image_url: z.string().url().optional(),
    })

    const validatedData = CreateSessionRequestSchema.parse(body)

    // Validate formula percentages sum to 100% if provided
    if (validatedData.formula) {
      const totalPercentage = validatedData.formula.paint_ratios.reduce(
        (sum, ratio) => sum + ratio.percentage,
        0
      )
      if (Math.abs(totalPercentage - 100) > 0.01) {
        const errorResponse: ErrorResponse = {
          error: 'VALIDATION_ERROR',
          message: 'Paint ratios must sum to 100%',
        }
        return NextResponse.json(errorResponse, { status: 400 })
      }
    }

    // Create session using service layer
    const session = await SessionService.createSession(validatedData)

    return NextResponse.json(session, { status: 201 })

  } catch (error) {
    console.error('Session creation error:', error)

    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors,
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    if (error instanceof Error) {
      if (error.message === 'User not authenticated') {
        const errorResponse: ErrorResponse = {
          error: 'AUTHENTICATION_ERROR',
          message: 'Authentication required',
        }
        return NextResponse.json(errorResponse, { status: 401 })
      }

      if (error.message.includes('Session type and input method are required')) {
        const errorResponse: ErrorResponse = {
          error: 'VALIDATION_ERROR',
          message: error.message,
        }
        return NextResponse.json(errorResponse, { status: 400 })
      }
    }

    const errorResponse: ErrorResponse = {
      error: 'INTERNAL_ERROR',
      message: 'Failed to create session',
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function PUT() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'PUT method not supported' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'DELETE method not supported' },
    { status: 405 }
  )
}