'use client'

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { CircularBuffer } from '@/lib/debug/circular-buffer'
import { downloadLogsAsFile } from '@/lib/debug/log-formatter'
import { interceptFetch, interceptClicks, interceptErrors } from '@/lib/debug/event-interceptors'

/**
 * Debug log entry structure
 * Simplified from DebugLogEntry type for context API
 */
interface DebugLogEntry {
  sessionId: string
  timestamp: string
  message: string
  data?: Record<string, unknown>
}

/**
 * Debug context value interface
 */
interface DebugContextValue {
  /** Whether debug mode is currently enabled */
  isDebugEnabled: boolean
  /** Current debug session ID (null when disabled) */
  sessionId: string | null
  /** Last 10 log entries for UI display */
  visibleEntries: DebugLogEntry[]
  /** Enable debug mode and start new session */
  enableDebug: () => void
  /** Disable debug mode and clear session */
  disableDebug: () => void
  /** Log a debug entry (only works when debug is enabled) */
  log: (message: string, data?: Record<string, unknown>) => void
  /** Download all logs as a text file */
  downloadLogs: () => void
  /** Clear all log entries from buffer */
  clearLogs: () => void
}

const DebugContext = createContext<DebugContextValue | null>(null)

/**
 * DebugProvider - Manages debug mode state and log buffer
 *
 * Provides debug logging functionality with:
 * - Session management (enable/disable with UUID generation)
 * - Circular buffer for log storage (5MB max)
 * - Event interceptors for fetch, clicks, and errors
 * - Log download functionality
 *
 * @example
 * ```tsx
 * <DebugProvider>
 *   <App />
 * </DebugProvider>
 * ```
 */
export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [isDebugEnabled, setIsDebugEnabled] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [buffer, setBuffer] = useState<CircularBuffer<DebugLogEntry> | null>(null)
  const [cleanupFunctions, setCleanupFunctions] = useState<Array<() => void>>([])
  // Force re-render when buffer changes
  const [bufferVersion, setBufferVersion] = useState(0)

  /**
   * Generate a UUID v4 string
   * @returns UUID string
   */
  const generateUUID = useCallback((): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }, [])

  /**
   * Compute visible entries from buffer (last 10)
   */
  const visibleEntries = useMemo(() => {
    if (!buffer || !isDebugEnabled) {
      return []
    }
    const allEntries = buffer.getAll()
    return allEntries.slice(-10)
  }, [buffer, isDebugEnabled, bufferVersion])

  /**
   * Enable debug mode and create new session
   * - Generates new session ID
   * - Creates new circular buffer
   * - Activates event interceptors
   */
  const enableDebug = useCallback(() => {
    const newSessionId = generateUUID()
    const newBuffer = new CircularBuffer<DebugLogEntry>(5 * 1024 * 1024) // 5MB

    setSessionId(newSessionId)
    setBuffer(newBuffer)
    setIsDebugEnabled(true)

    // Activate event interceptors
    const cleanupFetch = interceptFetch((level, category, message, metadata) => {
      const entry: DebugLogEntry = {
        sessionId: newSessionId,
        timestamp: new Date().toISOString(),
        message: `[${level}] [${category}] ${message}`,
        data: metadata,
      }
      newBuffer.add(entry)
      setBufferVersion((v) => v + 1)
    })

    const cleanupClicks = interceptClicks((level, category, message, metadata) => {
      const entry: DebugLogEntry = {
        sessionId: newSessionId,
        timestamp: new Date().toISOString(),
        message: `[${level}] [${category}] ${message}`,
        data: metadata,
      }
      newBuffer.add(entry)
      setBufferVersion((v) => v + 1)
    })

    const cleanupErrors = interceptErrors((level, category, message, metadata) => {
      const entry: DebugLogEntry = {
        sessionId: newSessionId,
        timestamp: new Date().toISOString(),
        message: `[${level}] [${category}] ${message}`,
        data: metadata,
      }
      newBuffer.add(entry)
      setBufferVersion((v) => v + 1)
    })

    setCleanupFunctions([cleanupFetch, cleanupClicks, cleanupErrors])
  }, [generateUUID])

  /**
   * Disable debug mode and clear session
   * - Clears buffer
   * - Removes event interceptors
   * - Resets session ID
   */
  const disableDebug = useCallback(() => {
    // Clean up interceptors
    cleanupFunctions.forEach((cleanup) => cleanup())
    setCleanupFunctions([])

    // Clear buffer
    if (buffer) {
      buffer.clear()
    }

    setIsDebugEnabled(false)
    setSessionId(null)
    setBuffer(null)
    setBufferVersion(0)
  }, [buffer, cleanupFunctions])

  /**
   * Log a debug entry manually
   * @param message - Log message
   * @param data - Optional metadata object
   */
  const log = useCallback(
    (message: string, data?: Record<string, unknown>) => {
      if (!isDebugEnabled || !buffer || !sessionId) {
        return
      }

      const entry: DebugLogEntry = {
        sessionId,
        timestamp: new Date().toISOString(),
        message,
        data,
      }

      buffer.add(entry)
      setBufferVersion((v) => v + 1)
    },
    [isDebugEnabled, buffer, sessionId]
  )

  /**
   * Download all logs as a text file
   */
  const downloadLogs = useCallback(() => {
    if (!buffer || !sessionId) {
      return
    }

    const allEntries = buffer.getAll()
    if (allEntries.length === 0) {
      return
    }

    // Convert to format expected by downloadLogsAsFile
    const formattedEntries = allEntries.map((entry) => ({
      id: generateUUID(),
      timestamp: new Date(entry.timestamp).getTime(),
      level: 'info' as const,
      category: 'user' as const,
      message: entry.message,
      metadata: entry.data,
    }))

    downloadLogsAsFile(formattedEntries, sessionId)
  }, [buffer, sessionId, generateUUID])

  /**
   * Clear all log entries from buffer
   */
  const clearLogs = useCallback(() => {
    if (!buffer) {
      return
    }

    buffer.clear()
    setBufferVersion((v) => v + 1)
  }, [buffer])

  const value = useMemo(
    () => ({
      isDebugEnabled,
      sessionId,
      visibleEntries,
      enableDebug,
      disableDebug,
      log,
      downloadLogs,
      clearLogs,
    }),
    [isDebugEnabled, sessionId, visibleEntries, enableDebug, disableDebug, log, downloadLogs, clearLogs]
  )

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>
}

/**
 * useDebug hook - Access debug context
 *
 * @returns Debug context value
 * @throws Error if used outside DebugProvider
 *
 * @example
 * ```tsx
 * const { isDebugEnabled, enableDebug, log } = useDebug()
 *
 * // Enable debug mode
 * enableDebug()
 *
 * // Log a message
 * log('User clicked button', { buttonId: 'submit' })
 * ```
 */
export function useDebug(): DebugContextValue {
  const context = useContext(DebugContext)

  if (context === null) {
    throw new Error('useDebug must be used within a DebugProvider')
  }

  return context
}
