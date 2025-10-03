# Data Model: Comprehensive Codebase Improvement

**Feature**: 005-use-codebase-analysis
**Created**: 2025-10-02
**Source**: Extracted from spec.md functional requirements

## Overview

This document defines the data structures and entities required to support critical security improvements, type consolidation, and code quality enhancements. Entities fall into three categories: Security Metadata (authentication state), Type Definition Entities (code architecture), and Code Quality Metrics (measurement).

---

## Security Metadata Entities

### Entity: Lockout Metadata

**Location**: `auth.users.raw_user_meta_data` (Supabase user metadata JSONB field)

**Purpose**: Track failed login attempts and enforce 15-minute account lockout after 5 failed attempts (FR-007, FR-008, FR-009, FR-009a)

**Fields**:
- `failed_login_attempts`: number (0-5, incremented atomically via PostgreSQL function)
- `lockout_until`: ISO 8601 timestamp string | null (set to current time + 15 minutes when threshold reached)
- `last_failed_attempt`: ISO 8601 timestamp string | null (updated on each failed attempt)

**State Transitions**:
1. **Initial State**: All fields null/0 for new user accounts
2. **Failed Attempt**: Increment `failed_login_attempts`, update `last_failed_attempt` timestamp
3. **Lockout Trigger**: When `failed_login_attempts` reaches 5, set `lockout_until` to current time + 15 minutes
4. **Lockout Active + Retry**: Reset `lockout_until` to current time + 15 minutes (FR-009a)
5. **Lockout Expired**: Clear all fields when `lockout_until` < current time (simplest approach per clarifications)
6. **Successful Login**: Clear all fields immediately

**Validation Rules**:
- `failed_login_attempts` must be 0-5 (enforced by atomic function logic)
- `lockout_until` must be future timestamp when set (enforced at creation)
- `last_failed_attempt` must be <= current time (enforced at creation)
- All updates must use atomic PostgreSQL operations to prevent race conditions (FR-008)

**Access Patterns**:
- **Read**: Check lockout status before authentication attempt (FR-003)
- **Write**: Increment counter via `increment_failed_login_attempts()` function (atomic)
- **Write**: Clear metadata via `clear_lockout_metadata()` function on successful login

---

### Entity: Rate Limit Record

**Location**: In-memory cache or Redis (implementation-specific, not persisted in database)

**Purpose**: Track authentication request rates per IP address using sliding window algorithm (FR-010, FR-011, FR-012)

**Fields**:
- `ip_address`: string (IPv4 or IPv6 address, primary key)
- `request_timestamps`: array of ISO 8601 timestamp strings (sliding window of attempts)
- `window_start`: ISO 8601 timestamp (start of current 15-minute window)
- `attempt_count`: number (requests within current window)

**State Transitions**:
1. **First Request**: Create record with single timestamp, window_start = current time, attempt_count = 1
2. **Subsequent Request Within Window**: Append timestamp, increment attempt_count
3. **Window Expiry**: Remove timestamps older than 15 minutes, recalculate attempt_count
4. **Rate Limit Exceeded**: Return 429 status with `Retry-After` header when attempt_count > 5 within 15-minute window
5. **Record Expiry**: Delete entire record when last timestamp > 15 minutes old (simplest approach per clarifications)

**Validation Rules**:
- `request_timestamps` must be sorted chronologically (enforced on insert)
- `attempt_count` must match length of `request_timestamps` array (enforced on update)
- `window_start` must be <= all timestamps in array (enforced on insert)
- Sliding window enforces continuous tracking for smoother rate enforcement (FR-012)

**Access Patterns**:
- **Read**: Check current attempt_count before processing authentication request
- **Write**: Append new timestamp on each authentication attempt
- **Cleanup**: Prune old timestamps on each read operation (sliding window maintenance)

---

### Entity: User Identity

**Location**: `auth.identities` table (Supabase Auth schema, read-only for application code)

**Purpose**: Track authentication provider linkages to enforce OAuth precedence (FR-004, FR-005, FR-006)

**Fields** (Supabase-managed, read-only):
- `user_id`: UUID (foreign key to auth.users.id)
- `provider`: string (e.g., "google", "email", "github")
- `provider_id`: string (provider-specific user identifier)
- `identity_data`: JSONB (provider-specific metadata)
- `created_at`: timestamp (identity creation time)
- `updated_at`: timestamp (last identity update)

**Query Patterns**:
```sql
-- Check if user has OAuth identity (blocks email/password login)
SELECT provider
FROM auth.identities
WHERE user_id = $1 AND provider != 'email'
LIMIT 1
```

**Validation Rules**:
- User with non-email provider identity MUST NOT authenticate via email/password (FR-005)
- Error message must specify detected provider: "This account uses {Provider} authentication. Please sign in with {Provider}." (FR-006)

**Access Patterns**:
- **Read**: Query before email/password authentication to detect OAuth precedence
- **Write**: None (managed by Supabase Auth, application code read-only)

---

## Type Definition Entities

### Entity: Canonical Type Definition

**Location**: Centralized type index file (e.g., `src/lib/types/index.ts`)

**Purpose**: Single source of truth for shared type interfaces to eliminate duplicate definitions (FR-015, FR-016, FR-017)

**Structure**:
```typescript
// Domain-specific type with clear namespace
export interface OptimizationVolumeConstraints {
  minVolume: number
  maxVolume: number
  targetVolume?: number
  unit: 'ml' | 'oz' | 'gal'
}

// UI-specific type with distinct name
export interface UIVolumeConstraints {
  minVolume: string // User input as string
  maxVolume: string
  targetVolume?: string
  displayUnit: string
}

// Shared utility type
export type ColorValue = {
  hex: string // Validated #RRGGBB format
  lab: LABColor // { L: number, a: number, b: number }
}
```

**Migration Rules**:
- Existing duplicate types must be renamed with domain prefix (e.g., `VolumeConstraints` → `OptimizationVolumeConstraints` vs `UIVolumeConstraints`)
- All imports must reference centralized type index (FR-017)
- TypeScript strict mode must catch incompatible usages at compile-time (FR-018)

**Validation Rules**:
- No duplicate type names within centralized index (enforced by TypeScript compiler)
- All exported types must have JSDoc comments documenting usage context
- Domain-specific types must include namespace prefix when multiple versions exist (FR-016)

---

### Entity: Supabase Client Pattern

**Location**: Modern client utilities (e.g., `src/lib/supabase/`)

**Purpose**: Exactly one modern Supabase client pattern per context (browser, server component, API route) using `@supabase/ssr` (FR-022, FR-023, FR-024)

**Client Types**:

1. **Browser Client** (`src/lib/supabase/client.ts`):
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

2. **Server Component Client** (`src/lib/supabase/server.ts`):
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set(name, value, options),
        remove: (name, options) => cookieStore.set(name, '', options)
      }
    }
  )
}
```

3. **API Route Client** (`src/lib/supabase/route-handler.ts`):
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set(name, value, options),
        remove: (name, options) => cookieStore.set(name, '', options)
      }
    }
  )
}
```

4. **Admin Client** (`src/lib/supabase/admin.ts`):
```typescript
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
```

**Migration Rules**:
- Legacy client files must be deleted (FR-022)
- All consuming code must be updated in single coordinated phase (breaking change acceptable)
- Build errors after deletion guide developers to correct patterns

**Validation Rules**:
- Session management must use cookie-based authentication exclusively (FR-024)
- Admin client must only be used for server-side user metadata operations
- Browser client must never access service role key

---

## Code Quality Metrics

### Metric: Type Coverage

**Definition**: Percentage of code with explicit type annotations (target: 100% with strict mode)

**Measurement**: TypeScript compiler with strict mode enabled (FR-018)

**Tracked Values**:
- Implicit `any` count (target: 0 in first-party code)
- Null/undefined safety violations (target: 0)
- Strict function type violations (target: 0)
- Uninitialized property errors (target: 0)

**Validation**: Build must fail if any strict mode violations exist (FR-025, FR-026)

---

### Metric: Code Duplication

**Definition**: Token-based similarity score from AST analysis measuring duplicate patterns (target: reduce by 40-50%)

**Measurement**: jscpd tool with token-based mode and AST analysis

**Configuration**:
```json
{
  "threshold": 5,
  "minTokens": 50,
  "minLines": 5,
  "mode": "strict",
  "format": ["typescript", "tsx"],
  "ignore": ["**/*.test.ts", "**/*.spec.ts", "node_modules/**"]
}
```

**Tracked Values**:
- Total duplicate tokens (baseline vs current)
- Duplicate percentage (target: reduce from ~60% to 30-35%)
- Number of duplicate blocks (target: reduce by 50%)

---

### Metric: Component Size

**Definition**: Average lines per component file (target: under 300 lines)

**Measurement**: Line count per `.tsx` component file

**Tracked Values**:
- Files over 500 lines (target: 0, must be refactored per FR-030)
- Files over 300 lines (target: minimize)
- Average component size (target: under 250 lines)

**Refactoring Strategies** (both allowed per clarifications):
- Sub-component extraction (split into smaller focused components)
- Utility function extraction (extract logic into hooks/utilities)

---

### Metric: Test Coverage

**Definition**: Percentage of code covered by automated tests (target: 90%+ for critical paths with branch/condition coverage)

**Measurement**: Jest coverage reports with branch/condition metrics

**Tracked Values**:
- Line coverage (target: 90%+)
- Branch coverage (target: 90%+)
- Condition coverage (target: 90%+)
- Function coverage (target: 95%+)

**Critical Paths** (must achieve 90%+ coverage per FR-037):
- Authentication flows (email/password, OAuth, lockout, rate limiting)
- Color science calculations (color space conversions, Delta E, mixing algorithms)
- Paint mixing optimization (constraint solving, volume calculations)

---

### Metric: Test Assertion Coverage

**Definition**: Percentage of tests with meaningful assertions vs placeholders (target: 95%+)

**Measurement**: Manual audit + automated detection of placeholder patterns

**Placeholder Patterns** (must be converted to `.skip()` per FR-035):
```typescript
// Placeholder test (INVALID after this feature)
test('should do something', () => {
  // TODO: implement
})

// Converted to skip (VALID)
test.skip('should do something', () => {
  // TODO: implement constraint validation logic
})
```

**Tracked Values**:
- Total test count
- Placeholder test count (target: 0 active)
- Skipped test count with TODO comments (acceptable)
- False positive tests (always pass, must be fixed per FR-036)

---

## Relationships

```
User (auth.users)
  ├── 1:1 Lockout Metadata (raw_user_meta_data JSONB field)
  ├── 1:N User Identity (auth.identities table)
  └── 1:1 Rate Limit Record (by IP address, transient)

Canonical Type Definition
  ├── Imported by → Supabase Client Pattern
  ├── Imported by → API Client utilities
  └── Imported by → Component modules

Code Quality Metrics
  ├── Type Coverage → enforces TypeScript strict mode compliance
  ├── Code Duplication → drives shared utility extraction
  ├── Component Size → triggers refactoring when exceeded
  ├── Test Coverage → validates critical path protection
  └── Test Assertion Coverage → ensures test quality
```

---

## Migration Impact

### Breaking Changes
1. **Type Consolidation**: Imports must be updated to use centralized type index (FR-017)
2. **Supabase Clients**: Legacy client files deleted, all consumers must migrate (FR-022)
3. **Component Refactoring**: Files over 500 lines split, imports may change (FR-030)

### Data Migrations
- **Lockout Metadata**: Existing `auth.users.raw_user_meta_data` may have partial/inconsistent lockout fields → Must be normalized to standard schema
- **Rate Limit Records**: No persistence required, fresh start acceptable (in-memory/Redis)

### Validation Strategy
- TypeScript compiler enforces type consolidation at build time (FR-025)
- Integration tests validate lockout/rate-limiting behavior end-to-end (FR-038)
- E2E tests validate all authentication flows with security controls (FR-038)

---

**Version**: 1.0.0
**Last Updated**: 2025-10-02
