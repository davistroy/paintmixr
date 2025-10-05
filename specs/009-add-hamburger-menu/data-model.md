# Data Model: Hamburger Navigation Menu

**Feature**: 009-add-hamburger-menu
**Date**: 2025-10-05
**Phase**: 1 - Design

## Entities

### 1. DebugLogEntry

Represents a single logged application event captured during Debug Mode.

**Fields**:
- `id`: string (UUID) - Unique identifier for the log entry
- `timestamp`: number - Unix timestamp (milliseconds since epoch) when event occurred
- `level`: 'info' | 'warn' | 'error' | 'debug' - Severity level of the event
- `category`: 'api' | 'user' | 'state' | 'error' - Type of application action
- `message`: string - Human-readable description of the event (1-500 characters)
- `metadata`: Record<string, unknown> | undefined - Optional structured data (JSON-serializable)

**Validation Rules** (Zod schema):
```typescript
import { z } from 'zod';

export const debugLogEntrySchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number().int().positive(),
  level: z.enum(['info', 'warn', 'error', 'debug']),
  category: z.enum(['api', 'user', 'state', 'error']),
  message: z.string().min(1).max(500),
  metadata: z.record(z.unknown()).optional(),
});

export type DebugLogEntry = z.infer<typeof debugLogEntrySchema>;
```

**Size Estimation**:
- Base fields: ~80 bytes (id=36, timestamp=8, level=5, category=5, message=100 avg)
- Metadata: ~220 bytes avg (varies by event type)
- **Total per entry**: ~300 bytes
- **5MB capacity**: ~17,000 entries

**Lifecycle**:
1. Created when Debug Mode enabled and event occurs
2. Stored in circular buffer (in-memory)
3. Removed via FIFO when buffer exceeds 5MB
4. Cleared when Debug Mode toggled off or page refresh

**Relationships**:
- Contained by: `DebugSession` (one-to-many)

### 2. DebugSession

Collection of log entries captured during a single Debug Mode activation.

**Fields**:
- `sessionId`: string (UUID) - Unique identifier for the debug session
- `startTime`: number - Unix timestamp when Debug Mode was enabled
- `endTime`: number | null - Unix timestamp when Debug Mode was disabled (null if active)
- `entries`: DebugLogEntry[] - Array of log entries (ordered by timestamp)
- `totalSize`: number - Cached byte size of all entries (for FIFO check)

**Validation Rules**:
```typescript
export const debugSessionSchema = z.object({
  sessionId: z.string().uuid(),
  startTime: z.number().int().positive(),
  endTime: z.number().int().positive().nullable(),
  entries: z.array(debugLogEntrySchema),
  totalSize: z.number().int().min(0).max(5 * 1024 * 1024), // 5MB max
});

export type DebugSession = z.infer<typeof debugSessionSchema>;
```

**State Transitions**:
```
[Idle] ---(User toggles Debug Mode ON)---> [Active]
[Active] ---(User toggles Debug Mode OFF)---> [Completed]
[Active] ---(Page refresh/navigation)---> [Terminated] (data lost)
[Completed] ---(User downloads logs)---> [Archived]
```

**Invariants**:
- `entries` must be sorted by `timestamp` ascending
- `totalSize` must equal sum of byte sizes of all entries
- `endTime` ≥ `startTime` (if not null)

**Lifecycle**:
1. Created when user toggles Debug Mode ON
2. Accumulates entries during active session
3. Ends when user toggles Debug Mode OFF
4. Destroyed on page refresh/navigation (session-scoped)

**Relationships**:
- Contains: `DebugLogEntry[]` (one-to-many)

### 3. AppMetadata

Static application information displayed in About dialog.

**Fields**:
- `version`: string - Semantic version (e.g., "1.2.3") from package.json
- `releaseDate`: string - ISO 8601 date string (e.g., "2025-10-05")
- `developers`: string[] - Array of developer names/credits
- `githubUrl`: string - HTTPS URL to GitHub repository

**Validation Rules**:
```typescript
export const appMetadataSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/), // Semantic versioning
  releaseDate: z.string().datetime(), // ISO 8601
  developers: z.array(z.string().min(1)).min(1),
  githubUrl: z.string().url().startsWith('https://github.com/'),
});

export type AppMetadata = z.infer<typeof appMetadataSchema>;
```

**Source**:
- Read from `package.json` + environment variables at build time
- Immutable after build (no runtime updates)

**Lifecycle**:
- Loaded once at application startup
- Cached in memory for entire session
- No mutations or state transitions

### 4. MenuState

UI state for hamburger menu open/closed status.

**Fields**:
- `isOpen`: boolean - Whether menu dropdown is currently visible
- `isDebugModeEnabled`: boolean - Whether Debug Mode is currently active
- `isModalOpen`: boolean - Whether any modal/dialog is currently open (hides menu)

**Validation Rules**:
```typescript
export const menuStateSchema = z.object({
  isOpen: z.boolean(),
  isDebugModeEnabled: z.boolean(),
  isModalOpen: z.boolean(),
});

export type MenuState = z.infer<typeof menuStateSchema>;
```

**State Transitions**:
```
Menu Open/Close:
[Closed] ---(User clicks hamburger icon)---> [Open]
[Open] ---(User clicks menu item)---> [Closed]
[Open] ---(User clicks outside menu)---> [Closed]
[Open] ---(User presses ESC key)---> [Closed]

Debug Mode Toggle:
[Disabled] ---(User clicks "Debug Mode" in menu)---> [Enabled]
[Enabled] ---(User clicks "Debug Mode" in menu)---> [Disabled]

Modal Interaction:
[Menu Visible] ---(Modal opens)---> [Menu Hidden]
[Menu Hidden] ---(Modal closes)---> [Menu Visible]
```

**Invariants**:
- If `isModalOpen === true`, then `isOpen` must be `false` (menu hidden when modal open)
- `isDebugModeEnabled` persists only within current page session

**Lifecycle**:
- Created when component mounts
- Updated via user interactions (clicks, keyboard)
- Reset on page navigation (except `isDebugModeEnabled` due to session-scoped requirement)

## Relationships Diagram

```
┌─────────────────┐
│  MenuState      │
│                 │
│  - isOpen       │
│  - isDebugMode  │──────┐
│  - isModalOpen  │      │
└─────────────────┘      │
                         │ Controls visibility of
                         │
                         ▼
              ┌──────────────────────┐
              │  DebugSession        │
              │                      │
              │  - sessionId         │
              │  - startTime         │
              │  - endTime           │
              │  - totalSize         │
              └──────────────────────┘
                         │
                         │ Contains (1:N)
                         │
                         ▼
              ┌──────────────────────┐
              │  DebugLogEntry       │
              │                      │
              │  - id                │
              │  - timestamp         │
              │  - level             │
              │  - category          │
              │  - message           │
              │  - metadata          │
              └──────────────────────┘

┌─────────────────┐
│  AppMetadata    │  (Static, read-only)
│                 │
│  - version      │
│  - releaseDate  │
│  - developers   │
│  - githubUrl    │
└─────────────────┘
```

## Storage Layer

| Entity | Storage Location | Persistence | Max Size |
|--------|------------------|-------------|----------|
| DebugLogEntry | In-memory (circular buffer) | Session-scoped | ~300 bytes each |
| DebugSession | In-memory (React Context) | Session-scoped | 5MB max total |
| AppMetadata | In-memory (module constant) | Application lifetime | ~500 bytes |
| MenuState | React component state | Component lifetime | ~50 bytes |

**No database tables required** - All data is ephemeral or build-time static.

## Data Flow

### Debug Mode Activation Flow
```
1. User clicks "Debug Mode" in menu
2. MenuState.isDebugModeEnabled = true
3. DebugSession created with new sessionId
4. Event interceptors activate (fetch, clicks, state changes)
5. Events → DebugLogEntry → DebugSession.entries.push()
6. If totalSize > 5MB: Remove oldest entry (FIFO)
7. UI updates to show debug console (last 10 entries)
```

### Log Download Flow
```
1. User clicks "Download Logs" button
2. DebugSession.entries serialized to plain text
3. Format: "{timestamp} [{level}] {category}: {message} {metadata}\n"
4. Blob created with MIME type "text/plain"
5. Browser download triggered (filename: "paintmixr-debug-{sessionId}.txt")
```

### About Dialog Flow
```
1. User clicks "About" in menu
2. AppMetadata loaded from module constant
3. Dialog renders metadata fields
4. User closes dialog (no state mutation)
```

### Logout Flow
```
1. User clicks "Logout" in menu
2. Supabase Auth signOut() called
3. Server invalidates session token
4. Client redirects to /auth/signin
5. All in-memory state (MenuState, DebugSession) destroyed via page unload
```

## Type Safety Guarantees

All entities have:
1. **Zod runtime validation schemas** - Catch invalid data at runtime
2. **TypeScript type definitions** - Catch type errors at compile time
3. **Type guards** - Safe type narrowing in conditional logic

Example type guard:
```typescript
export function isDebugLogEntry(value: unknown): value is DebugLogEntry {
  return debugLogEntrySchema.safeParse(value).success;
}
```

## Performance Considerations

1. **Circular Buffer Efficiency**:
   - Amortized O(1) insert (array push)
   - O(1) FIFO removal (array shift with size check)
   - O(n) size calculation (cached, recalculated on mutation)

2. **UI Update Throttling**:
   - Debug console re-renders debounced to 100ms
   - Prevents UI lag during high-frequency logging (10-50 events/sec)

3. **Memory Footprint**:
   - 5MB max for DebugSession (enforced via FIFO)
   - ~500 bytes for AppMetadata (static, one-time allocation)
   - ~50 bytes for MenuState (negligible)
   - **Total**: <6MB worst case

## Validation Strategy

- **At data creation**: Zod schema validation before adding to buffer
- **At download**: Re-validate entire session before serialization
- **At component mount**: Validate AppMetadata from package.json

If validation fails → Log error to console, skip entry, continue operation
