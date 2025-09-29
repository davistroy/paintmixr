import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

interface ErrorContext {
  endpoint: string
  method: string
  timestamp: string
  userAgent?: string
  ip?: string
  requestId: string
}

interface ApiError {
  code: string
  message: string
  details?: any
  context: ErrorContext
}

export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly details?: any

  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.isOperational = true
    this.details = details

    Error.captureStackTrace(this, this.constructor)
  }
}

// Predefined error types
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', 500, details)
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`External service error (${service}): ${message}`, 'EXTERNAL_SERVICE_ERROR', 502)
  }
}

// Error logging utility
class ErrorLogger {
  static log(error: Error, context: ErrorContext): void {
    const errorLog = {
      timestamp: context.timestamp,
      level: error instanceof AppError && error.statusCode < 500 ? 'warn' : 'error',
      message: error.message,
      code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
      statusCode: error instanceof AppError ? error.statusCode : 500,
      stack: error.stack,
      context,
      details: error instanceof AppError ? error.details : undefined,
    }

    // In production, you'd send this to a logging service
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', JSON.stringify(errorLog, null, 2))
    } else {
      // Production logging (e.g., Winston, Datadog, etc.)
      console.error(JSON.stringify(errorLog))
    }
  }
}

// Request ID generator
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Error response formatter
function formatErrorResponse(error: Error, context: ErrorContext): ApiError {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      context,
    }
  }

  if (error instanceof ZodError) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: {
        issues: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      },
      context,
    }
  }

  // Generic error (don't expose internal details in production)
  return {
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development'
      ? error.message
      : 'An internal error occurred',
    context,
  }
}

// Main error handler middleware
export function withErrorHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const requestId = generateRequestId()
    const errorContext: ErrorContext = {
      endpoint: req.nextUrl.pathname,
      method: req.method,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent') || undefined,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      requestId,
    }

    try {
      // Add request ID to headers for tracing
      const response = await handler(req, context)
      response.headers.set('x-request-id', requestId)
      return response
    } catch (error) {
      const err = error as Error

      // Log the error
      ErrorLogger.log(err, errorContext)

      // Format error response
      const apiError = formatErrorResponse(err, errorContext)
      const statusCode = err instanceof AppError ? err.statusCode : 500

      return NextResponse.json(apiError, {
        status: statusCode,
        headers: {
          'x-request-id': requestId,
        },
      })
    }
  }
}

// Async wrapper for better error handling
export function asyncHandler<T extends any[]>(
  fn: (...args: T) => Promise<NextResponse>
) {
  return (...args: T): Promise<NextResponse> => {
    return Promise.resolve(fn(...args)).catch((error) => {
      // This will be caught by the withErrorHandler middleware
      throw error
    })
  }
}

// Validation helper
export function validateRequest<T>(
  schema: any, // Zod schema
  data: unknown
): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('Request validation failed', {
        issues: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      })
    }
    throw error
  }
}

// Database operation wrapper
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    // Map database-specific errors
    const message = error instanceof Error ? error.message : 'Unknown database error'

    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      throw new ConflictError('Resource already exists', { originalError: message })
    }

    if (message.includes('not found') || message.includes('no rows')) {
      throw new NotFoundError(operationName)
    }

    throw new DatabaseError(`Database operation failed: ${operationName}`, {
      originalError: message
    })
  }
}

// External API wrapper
export async function withExternalServiceErrorHandling<T>(
  operation: () => Promise<T>,
  serviceName: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown service error'
    throw new ExternalServiceError(serviceName, message)
  }
}

// Rate limiting helper (basic implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): void {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return
  }

  if (record.count >= maxRequests) {
    throw new RateLimitError(`Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds`)
  }

  record.count++
}

// Cleanup old rate limit records
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of Array.from(rateLimitMap.entries())) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 60000) // Clean up every minute