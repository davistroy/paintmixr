import { z } from 'zod'

/**
 * Debug log entry schema
 * Validates individual log entries with constraints from data-model.md
 */
export const debugLogEntrySchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number().int().positive(),
  level: z.enum(['info', 'warn', 'error', 'debug']),
  category: z.enum(['api', 'user', 'state', 'error']),
  message: z.string().min(1).max(500),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type DebugLogEntry = z.infer<typeof debugLogEntrySchema>

/**
 * Debug session schema
 * Manages a collection of log entries with size constraints (5MB max)
 */
export const debugSessionSchema = z.object({
  sessionId: z.string().uuid(),
  startTime: z.number().int().positive(),
  endTime: z.number().int().positive().nullable(),
  entries: z.array(debugLogEntrySchema),
  totalSize: z.number().int().min(0).max(5 * 1024 * 1024), // 5MB in bytes
})

export type DebugSession = z.infer<typeof debugSessionSchema>

/**
 * App metadata schema
 * Contains application version and attribution information
 */
export const appMetadataSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semantic versioning (e.g., 1.0.0)'),
  releaseDate: z.string().datetime(), // ISO 8601 datetime
  developers: z.array(z.string()).min(1, 'At least one developer required'),
  githubUrl: z.string().url().startsWith('https://github.com/', 'GitHub URL must start with https://github.com/'),
})

export type AppMetadata = z.infer<typeof appMetadataSchema>

/**
 * Menu state schema
 * Tracks hamburger menu open/close state and debug mode toggle
 */
export const menuStateSchema = z.object({
  isOpen: z.boolean(),
  isDebugModeEnabled: z.boolean(),
  isModalOpen: z.boolean(),
})

export type MenuState = z.infer<typeof menuStateSchema>

/**
 * Type guard for DebugLogEntry
 * @param value - Unknown value to validate
 * @returns True if value is a valid DebugLogEntry
 */
export function isDebugLogEntry(value: unknown): value is DebugLogEntry {
  return debugLogEntrySchema.safeParse(value).success
}

/**
 * Type guard for DebugSession
 * @param value - Unknown value to validate
 * @returns True if value is a valid DebugSession
 */
export function isDebugSession(value: unknown): value is DebugSession {
  return debugSessionSchema.safeParse(value).success
}

/**
 * Type guard for AppMetadata
 * @param value - Unknown value to validate
 * @returns True if value is a valid AppMetadata
 */
export function isAppMetadata(value: unknown): value is AppMetadata {
  return appMetadataSchema.safeParse(value).success
}

/**
 * Type guard for MenuState
 * @param value - Unknown value to validate
 * @returns True if value is a valid MenuState
 */
export function isMenuState(value: unknown): value is MenuState {
  return menuStateSchema.safeParse(value).success
}
