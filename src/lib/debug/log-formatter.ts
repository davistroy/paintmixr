import { DebugLogEntry } from '@/lib/debug/types'

/**
 * Format a single log entry as plain text
 * @param entry - The debug log entry to format
 * @returns Formatted string: "{ISO timestamp} [{level}] {category}: {message} {metadata JSON if present}"
 * @example
 * formatLogEntryText({
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   timestamp: 1696512615123,
 *   level: 'info',
 *   category: 'api',
 *   message: 'Fetch: /api/sessions',
 *   metadata: { status: 200 }
 * })
 * // Returns: "2025-10-05T10:30:15.123Z [info] api: Fetch: /api/sessions {"status":200}"
 */
export function formatLogEntryText(entry: DebugLogEntry): string {
  const timestamp = new Date(entry.timestamp).toISOString()
  const metadataStr = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : ''

  return `${timestamp} [${entry.level}] ${entry.category}: ${entry.message}${metadataStr}`
}

/**
 * Serialize an array of log entries to a complete text document
 * Includes header with total count and export timestamp
 * @param entries - Array of debug log entries in any order
 * @returns Multi-line text document with header and chronologically sorted entries
 * @example
 * serializeLogsToText([entry1, entry2])
 * // Returns:
 * // === PaintMixr Debug Logs ===
 * // Total Entries: 2
 * // Exported: 2025-10-05T10:30:15.123Z
 * // ============================
 * //
 * // 2025-10-05T10:30:14.000Z [info] api: First entry
 * // 2025-10-05T10:30:15.000Z [warn] user: Second entry
 */
export function serializeLogsToText(entries: DebugLogEntry[]): string {
  // Sort entries chronologically (oldest first)
  const sortedEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp)

  // Build header
  const exportTimestamp = new Date().toISOString()
  const header = [
    '=== PaintMixr Debug Logs ===',
    `Total Entries: ${entries.length}`,
    `Exported: ${exportTimestamp}`,
    '============================',
    '', // Blank line separator
  ].join('\n')

  // Format each entry
  const logLines = sortedEntries.map(formatLogEntryText).join('\n')

  return `${header}${logLines}`
}

/**
 * Download log entries as a text file
 * Creates a Blob, generates a download link, and triggers download in the browser
 * @param entries - Array of debug log entries to export
 * @param sessionId - Session identifier for the filename
 * @example
 * downloadLogsAsFile(logEntries, '123e4567-e89b-12d3-a456-426614174000')
 * // Downloads file: paintmixr-debug-123e4567-e89b-12d3-a456-426614174000.txt
 */
export function downloadLogsAsFile(entries: DebugLogEntry[], sessionId: string): void {
  // Serialize logs to text format
  const textContent = serializeLogsToText(entries)

  // Create Blob with plain text MIME type
  const blob = new Blob([textContent], { type: 'text/plain' })

  // Generate object URL
  const url = URL.createObjectURL(blob)

  // Create temporary anchor element
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `paintmixr-debug-${sessionId}.txt`

  // Trigger download
  document.body.appendChild(anchor)
  anchor.click()

  // Clean up
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
