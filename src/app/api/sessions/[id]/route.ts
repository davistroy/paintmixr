/**
 * GET /api/sessions/[id]
 * Get detailed mixing session by ID
 *
 * PATCH /api/sessions/[id]
 * Update mixing session metadata
 *
 * DELETE /api/sessions/[id]
 * Delete mixing session
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type {
  MixingSessionDetail,
  MixingSession,
  ErrorResponse,
} from '@/types/types'
import { SessionService } from '@/lib/supabase/sessions'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Validation schema for session ID
const SessionIdSchema = z.string().uuid('Invalid session ID format')

// Validation schema for PATCH updates
const UpdateSessionRequestSchema = z.object({
  custom_label: z.string().min(1).max(100).optional(),
  notes: z.string().max(1000).optional(),
  is_favorite: z.boolean().optional(),
}).refine(data => {
  // At least one field must be provided for update
  return data.custom_label !== undefined ||
         data.notes !== undefined ||
         data.is_favorite !== undefined
}, {
  message: 'At least one field must be provided for update',
})

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MixingSessionDetail | ErrorResponse>> {
  try {
    // Validate session ID
    const { id } = await params
    const sessionId = SessionIdSchema.parse(id)

    // Get session using service layer
    const session = await SessionService.getSession(sessionId)

    return NextResponse.json(session)

  } catch (error) {
    console.error('Session fetch error:', error)

    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid session ID',
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

      if (error.message === 'Session not found') {
        const errorResponse: ErrorResponse = {
          error: 'NOT_FOUND',
          message: 'Session not found',
        }
        return NextResponse.json(errorResponse, { status: 404 })
      }
    }

    const errorResponse: ErrorResponse = {
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch session',
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<MixingSession | ErrorResponse>> {
  try {
    // Validate session ID
    const { id } = await params
    const sessionId = SessionIdSchema.parse(id)

    // Parse and validate request body
    const body = await request.json()
    const validatedData = UpdateSessionRequestSchema.parse(body)

    // Update session using service layer
    const updatedSession = await SessionService.updateSession(sessionId, validatedData)

    return NextResponse.json(updatedSession)

  } catch (error) {
    console.error('Session update error:', error)

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

      if (error.message === 'Session not found') {
        const errorResponse: ErrorResponse = {
          error: 'NOT_FOUND',
          message: 'Session not found',
        }
        return NextResponse.json(errorResponse, { status: 404 })
      }
    }

    const errorResponse: ErrorResponse = {
      error: 'INTERNAL_ERROR',
      message: 'Failed to update session',
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<{ success: boolean } | ErrorResponse>> {
  try {
    // Validate session ID
    const { id } = await params
    const sessionId = SessionIdSchema.parse(id)

    // Delete session using service layer
    await SessionService.deleteSession(sessionId)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Session deletion error:', error)

    if (error instanceof z.ZodError) {
      const errorResponse: ErrorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Invalid session ID',
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

      if (error.message === 'Session not found') {
        const errorResponse: ErrorResponse = {
          error: 'NOT_FOUND',
          message: 'Session not found',
        }
        return NextResponse.json(errorResponse, { status: 404 })
      }
    }

    const errorResponse: ErrorResponse = {
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete session',
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'POST method not supported' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'METHOD_NOT_ALLOWED', message: 'PUT method not supported' },
    { status: 405 }
  )
}