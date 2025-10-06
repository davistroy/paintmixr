# Data Model: Technical Debt Remediation

**Feature**: 010-using-refactor-recommendations
**Date**: 2025-10-05

---

## Entity Definitions

### 1. Type Definition
**Purpose**: Centralized TypeScript type/interface in `@/lib/types`, used across frontend and backend

**Attributes**:
- `name`: string - Type/interface name (e.g., "ColorValue", "Paint", "MixingFormula")
- `location`: string - File path in `/src/lib/types/` (e.g., "index.ts", "color.ts")
- `exports`: string[] - Exported type names from the file
- `usageCount`: number - Number of import statements across codebase
- `duplicates`: string[] - List of duplicate locations to be removed (e.g., "/src/types/types.ts")

**Validation Rules**:
- All exports must be TypeScript types, interfaces, or type guards
- No duplicate type names across centralized location
- All imports must use `@/lib/types` alias

**State Transitions**:
1. Duplicate → Consolidated (move all types to `/src/lib/types/index.ts`)
2. Consolidated → Validated (zero TypeScript errors, all imports updated)

---

### 2. API DTO (Data Transfer Object)
**Purpose**: API-layer type that decouples frontend from database schema

**Attributes**:
- `name`: string - DTO interface name (e.g., "PaintDTO", "SessionDTO")
- `sourceEntity`: string - Supabase database type (e.g., "EnhancedPaintRow")
- `targetDomain`: string - Frontend domain type (e.g., "Paint")
- `fields`: object - DTO field definitions
  - `id`: string (UUID)
  - `mappedFields`: Record<string, any> - Transformed fields from database
- `mapperFunction`: string - Function name for Entity→DTO conversion (e.g., "toPaintDTO")

**Validation Rules**:
- DTO must not expose internal database structure (no `_id`, `created_at` unless needed)
- All fields must be JSON-serializable
- Mapper function must be pure (no side effects)

**Relationships**:
- `sourceEntity` (1:1) → Supabase database table row type
- `targetDomain` (1:1) → Frontend component prop type

---

### 3. Performance Baseline
**Purpose**: JSON file containing p95/p99 metrics for color calculations and optimization algorithms

**Attributes**:
- `category`: string - Metric category ("colorCalculations", "optimization", "database")
- `operation`: string - Specific operation (e.g., "lab_to_hex", "delta_e_ciede2000", "differential_evolution_3paints")
- `p95`: number - 95th percentile latency in milliseconds
- `p99`: number - 99th percentile latency in milliseconds
- `sampleSize`: number - Number of measurements for baseline
- `recordedAt`: ISO 8601 timestamp - When baseline was established

**Validation Rules**:
- p95 < p99 (95th percentile must be faster than 99th)
- Color calculations: p95 < 500ms (constitutional requirement)
- API requests: p95 < 200ms (FR-016 requirement)
- Database queries: p95 < 100ms (FR-017 requirement)

**Storage**:
- Location: `__tests__/performance/baselines.json`
- Format: JSON with nested structure by category

---

### 4. Structured Log Entry
**Purpose**: Logged event with severity, message, context (user ID, request ID), and timestamp

**Attributes**:
- `severity`: enum - "ERROR" | "WARN" | "INFO" | "DEBUG"
- `message`: string - Human-readable log message
- `context`: object - Request/user context
  - `requestId`: string (UUID) - Unique request identifier
  - `userId`: string (UUID) - Authenticated user ID (optional)
  - `path`: string - API route path
- `metadata`: Record<string, any> - Additional structured data (e.g., `{ deltaE: 1.8, paintCount: 3 }`)
- `timestamp`: ISO 8601 string - Log entry time

**Validation Rules**:
- Severity must be one of four levels
- Message must be non-empty string
- Context.requestId must be unique per request
- Timestamp must be in ISO 8601 format

**State Transitions**:
1. Created (in-memory) → Flushed (stdout/stderr)
2. Flushed → Collected (external log aggregator, deferred to future sprint per FR-022)

---

### 5. Security Policy
**Purpose**: Rate limit rules, input sanitization rules (CSRF skipped for single-user app)

**Attributes**:
- `rateLimits`: object - Endpoint-specific rate limits
  - `endpoint`: string (e.g., "/api/optimize")
  - `maxRequests`: number (e.g., 5)
  - `windowMs`: number (e.g., 60000 for 1 minute)
  - `keyBy`: string - Rate limit key strategy ("userId", "ip")
- `sanitizationRules`: object[] - XSS prevention rules
  - `field`: string - Input field name (e.g., "custom_label", "paint_name")
  - `maxLength`: number - Maximum string length
  - `allowedChars`: regex - Allowed character pattern (e.g., `/^[a-zA-Z0-9\s\-_]+$/`)
  - `stripHtml`: boolean - Whether to remove HTML tags

**Validation Rules**:
- Rate limit maxRequests > 0
- Rate limit windowMs >= 1000 (minimum 1 second)
- Sanitization maxLength <= 500 (prevent DoS)
- CSRF protection skipped (FR-006: unnecessary for single-user app)

**Relationships**:
- Applied in API route middleware (rate limiting)
- Applied in Zod schemas (input sanitization)

---

### 6. Dependency Update Migration
**Purpose**: Step-by-step guide for updating major dependencies with breaking changes

**Attributes**:
- `dependency`: string - Package name (e.g., "react", "next", "zod")
- `fromVersion`: string - Current version (e.g., "18.3.1")
- `toVersion`: string - Target version (e.g., "19.2.0")
- `breakingChanges`: string[] - List of breaking changes
- `migrationSteps`: object[] - Ordered migration steps
  - `step`: number - Step order
  - `action`: string - Command or manual action (e.g., "Run codemod", "Update imports")
  - `command`: string (optional) - Shell command to execute
  - `validation`: string - How to verify success
- `estimatedTime`: number - Estimated time in minutes

**Validation Rules**:
- Migration steps must be ordered sequentially
- Each step must have validation criteria
- Estimated time must be > 0

**State Transitions**:
1. Planned (in research.md) → Executing (running migration steps)
2. Executing → Validated (all tests pass)
3. Validated → Complete (merged to main)

---

## Data Flow

### Type Consolidation Flow
```
1. Scan `/src/types/types.ts` for duplicates
2. Move unique types to `/src/lib/types/index.ts`
3. Update all imports: `from '@/types/types'` → `from '@/lib/types'`
4. Delete `/src/types/` directory
5. Validate: `npm run type-check` (zero errors)
```

### API DTO Flow
```
1. API route queries Supabase (returns EnhancedPaintRow)
2. Mapper function transforms Entity → DTO (toPaintDTO)
3. API route returns DTO as JSON
4. Frontend receives DTO, no knowledge of database schema
5. Type safety enforced at compile time
```

### Performance Baseline Flow
```
1. Run benchmark suite (100 iterations per operation)
2. Calculate p95/p99 from results
3. Write to `__tests__/performance/baselines.json`
4. Regression tests compare future runs to baseline
5. Fail CI if p95 exceeds baseline * 1.1 (10% tolerance)
```

### Structured Logging Flow
```
1. API route creates child logger with request context
2. Logger.info/warn/error called with message + metadata
3. Pino serializes to JSON stdout (synchronous)
4. Vercel captures logs (1 hour retention)
5. Future: External aggregator (Datadog/Logtail) - deferred per FR-022
```

---

## Relationships

- **Type Definition** → **API DTO**: DTOs use centralized types for field definitions
- **API DTO** → **Structured Log Entry**: Log entries use DTO types for metadata
- **Performance Baseline** → **Dependency Update Migration**: Baselines validate migration success
- **Security Policy** → **Structured Log Entry**: Log rate limit violations (WARN level)
- **Security Policy** → **API DTO**: Sanitization rules applied before DTO creation

---

## Storage Locations

| Entity | Storage | Format |
|--------|---------|--------|
| Type Definition | `/src/lib/types/index.ts` | TypeScript |
| API DTO | `/src/lib/api/dtos/*.dto.ts` | TypeScript |
| Performance Baseline | `__tests__/performance/baselines.json` | JSON |
| Structured Log Entry | stdout/stderr (Pino) | JSON Lines |
| Security Policy | `/src/lib/security/policies.ts` | TypeScript |
| Dependency Migration | `/specs/010-*/research.md` | Markdown |
