'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Download } from 'lucide-react'
import { useDebug } from '@/contexts/DebugContext'

/**
 * DebugConsole Component
 *
 * Displays the last 10 debug log entries with auto-scroll, text wrapping toggle,
 * and log download functionality. Controlled by Debug Mode state from DebugContext.
 *
 * Features:
 * - Auto-scroll to newest entry when logs are added
 * - Text wrapping toggle (default: horizontal scroll)
 * - Download logs button (disabled when no logs exist)
 * - Accessibility: ARIA role="log", aria-live="polite"
 * - Performance: React.memo to prevent unnecessary re-renders
 *
 * @example
 * ```tsx
 * const { isDebugEnabled } = useDebug()
 * <DebugConsole isVisible={isDebugEnabled} />
 * ```
 */

interface DebugConsoleProps {
  /** Controls visibility of debug console */
  isVisible: boolean
  /** Optional close handler */
  onClose?: () => void
  /** Optional Tailwind classes */
  className?: string
}

export const DebugConsole = React.memo<DebugConsoleProps>(function DebugConsole({
  isVisible,
  className = '',
}) {
  const { visibleEntries, downloadLogs } = useDebug()
  const [wrapText, setWrapText] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [debouncedEntries, setDebouncedEntries] = useState(visibleEntries)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce entry updates to 100ms batch window for performance
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedEntries(visibleEntries)
    }, 100)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [visibleEntries])

  // Auto-scroll to bottom when new entry added
  useEffect(() => {
    if (scrollRef.current && debouncedEntries.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [debouncedEntries.length])

  // Memoize event handlers for performance
  const handleWrapTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setWrapText(e.target.checked)
  }, [])

  const handleDownloadLogs = useCallback(() => {
    downloadLogs()
  }, [downloadLogs])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-100 border-t border-gray-700 shadow-lg z-40 ${className}`}
      data-testid="debug-console"
      role="log"
      aria-live="polite"
      aria-label="Debug console"
    >
      {/* Log container - fixed height ~300px (10 lines visible) */}
      <div
        ref={scrollRef}
        data-testid="log-container"
        className="h-[300px] overflow-y-auto font-mono text-xs sm:text-xs p-2 sm:p-4 space-y-1"
        style={{
          overflowX: wrapText ? 'hidden' : 'auto',
          whiteSpace: wrapText ? 'pre-wrap' : 'pre',
          fontSize: wrapText ? '0.75rem' : 'max(0.75rem, 12px)', // Ensure minimum readability
        }}
      >
        {debouncedEntries.length === 0 ? (
          <div className="text-gray-500 italic">No debug logs yet. Logs will appear here when debug mode is active.</div>
        ) : (
          debouncedEntries.map((entry, index) => (
            <div
              key={`${entry.sessionId}-${entry.timestamp}-${index}`}
              data-testid={`log-entry-${entry.sessionId}-${index}`}
              className="text-gray-300"
            >
              <span className="text-gray-500">[{entry.timestamp}]</span>{' '}
              <span className="text-gray-100">{entry.message}</span>
              {entry.data && Object.keys(entry.data).length > 0 && (
                <span className="text-blue-400"> {JSON.stringify(entry.data)}</span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 px-2 sm:px-4 py-2 bg-gray-800 border-t border-gray-700">
        {/* Wrap Text checkbox */}
        <label className="flex items-center gap-2 text-sm cursor-pointer min-h-[44px] sm:min-h-0">
          <input
            type="checkbox"
            checked={wrapText}
            onChange={handleWrapTextChange}
            data-testid="wrap-text-checkbox"
            aria-label="Toggle text wrapping"
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
          />
          <span>Wrap Text</span>
        </label>

        {/* Download Logs button */}
        <button
          onClick={handleDownloadLogs}
          disabled={debouncedEntries.length === 0}
          data-testid="download-logs-button"
          className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 disabled:hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800"
          aria-label="Download debug logs"
        >
          <Download className="w-4 h-4" />
          <span>Download Logs</span>
        </button>
      </div>
    </div>
  )
})
