/**
 * Structured Logger (Pino)
 *
 * Centralized logging with severity levels, ISO timestamps, and context injection.
 *
 * Feature: 010-using-refactor-recommendations
 * Task: T035
 * Requirement: FR-020 (structured logging)
 */

import pino from 'pino'

// Detect environment
const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
const isBrowser = typeof window !== 'undefined'

// Configure logger based on environment
const logger = pino({
  level: isTest ? 'silent' : process.env.LOG_LEVEL || 'info',
  browser: isBrowser
    ? {
        asObject: true,
        write: {
          info: (o) => console.info(o),
          warn: (o) => console.warn(o),
          error: (o) => console.error(o),
          debug: (o) => console.debug(o),
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label }
    },
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
  ...(isDevelopment && !isBrowser
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
})

/**
 * Create a child logger with context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context)
}

/**
 * Log levels:
 * - debug: Detailed diagnostic information
 * - info: General informational messages
 * - warn: Warning messages for potentially harmful situations
 * - error: Error messages for error events
 */
export { logger }

/**
 * Convenience methods with context injection
 */
export const log = {
  debug: (message: string, context?: Record<string, unknown>) => {
    logger.debug(context || {}, message)
  },
  info: (message: string, context?: Record<string, unknown>) => {
    logger.info(context || {}, message)
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    logger.warn(context || {}, message)
  },
  error: (message: string, error?: Error | unknown, context?: Record<string, unknown>) => {
    logger.error(
      {
        ...context,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      },
      message
    )
  },
}
