# Technical Research: Dependency Migrations & Refactoring Patterns

**Feature**: Technical Debt Remediation & Code Quality Improvements
**Date**: 2025-10-05
**Scope**: Dependency updates (React 19, Next.js 15, Zod 4, Cypress 15), SWR caching, Supabase pooling, API DTOs, structured logging

---

## 1. React 19 Migration (18.3 → 19.2)

### Decision
Migrate to React 19.2 using automated codemods for common patterns, followed by manual TypeScript fixes and test validation.

### Rationale
- **Low risk**: Codebase already uses modern patterns (createRoot, TypeScript strict mode, no PropTypes)
- **Automated migration**: `npx codemod@latest react/19/migration-recipe` handles 90% of changes
- **Next.js 15 requirement**: React 19 is the stable release for Next.js 15
- **Type safety**: Existing TypeScript strict mode will catch breaking changes immediately

### Key Changes Required
1. **TypeScript updates**:
   - `useRef()` without arguments → `useRef(undefined)`
   - Update `@types/react` and `@types/react-dom` to `^19.0.0`
   - `ReactElement` props now default to `unknown` (was `any`)

2. **Test imports**:
   - `act` moved from `react-dom/test-utils` → `react`

3. **Removed APIs** (not used in codebase):
   - No PropTypes found (already TypeScript ✅)
   - No legacy Context API (already modern ✅)
   - No `findDOMNode` usage ✅

### Migration Steps
1. Run codemods: `npx codemod@latest react/19/migration-recipe` + `npx types-react-codemod@latest preset-19 ./src`
2. Update package.json: `react@^19.0.0`, `react-dom@^19.0.0`, `@types/react@^19.0.0`, `@types/react-dom@^19.0.0`
3. Fix TypeScript errors: Search for `useRef()` without arguments
4. Update test imports: `import {act} from 'react'`
5. Run validation: `npm run type-check && npm run test && npm run build`

### Alternatives Considered
- **Stay on React 18**: Rejected - Next.js 15 optimized for React 19
- **Gradual migration**: Rejected - React doesn't support mixed versions

---

## 2. Next.js 15 Migration (14.2 → 15.5)

### Decision
Migrate to Next.js 15.5 using async request APIs codemod, update configuration for Turbopack dev mode, and validate all async `params`/`searchParams`.

### Rationale
- **Critical breaking change**: `cookies()`, `headers()`, `params`, `searchParams` now async
- **Turbopack stable**: 15x faster dev builds for local development
- **React 19 support**: Required for React 19 compatibility

### Key Changes Required
1. **Asynchronous Request APIs** (CRITICAL):
   ```typescript
   // OLD (Next.js 14)
   const params = props.params
   const cookies = cookies()

   // NEW (Next.js 15)
   const params = await props.params
   const cookies = await cookies()
   ```

2. **Turbopack enablement**:
   - Update `package.json` script: `"dev": "next dev --turbopack"`
   - 15x faster dev builds (production builds still use Webpack)

3. **Deprecated features removed**:
   - `@next/font` → `next/font` (already using built-in ✅)
   - `runtime: 'experimental-edge'` → `runtime: 'edge'` (no usage found ✅)

### Migration Steps
1. Run codemod: `npx @next/codemod@latest next-async-request-api .`
2. Update package.json: `next@^15.1.8` + update dev script for Turbopack
3. Search and fix: All `page.tsx` files with `params`/`searchParams` must be async
4. Validate: `npm run build && npm run test:e2e`

### Alternatives Considered
- **Manual async migration**: Rejected - codemod handles 95% of cases
- **Skip Turbopack**: Rejected - 15x dev speed improvement is significant

---

## 3. Zod 4 Migration (3.25 → 4.1)

### Decision
Migrate to Zod 4.1 with manual refactoring for recursive schemas (replace `z.lazy()` with `get` accessors) and audit `.refine()` chains for new chainability.

### Rationale
- **Recursive schema improvement**: New `get` accessor pattern is more type-safe
- **Refinement chainability**: `.refine()` can now chain with validators (`.min()`, `.max()`)
- **Performance**: Dramatically faster for complex `.omit()`/`.extend()` chains
- **No automatic migration**: Must manually update recursive schemas

### Key Changes Required
1. **Recursive schemas** (rare in codebase):
   ```typescript
   // OLD (Zod 3)
   const Category = z.lazy(() => z.object({
     name: z.string(),
     subcategories: z.array(Category)
   }))

   // NEW (Zod 4)
   const Category = z.object({
     name: z.string(),
     get subcategories() { return z.array(Category) }
   })
   ```

2. **Refinement chains** (verify behavior):
   - Zod 4: `.refine()` is chainable with `.min()`, `.max()`, etc.
   - Audit existing `.refine()` usage for new type behavior

3. **Metadata support**:
   - New `.meta()` method for schema documentation
   - Auto-integrated with `z.toJSONSchema()`

### Migration Steps
1. Update package.json: `zod@^4.1.0`
2. Search for `z.lazy()` → refactor to `get` accessors
3. Audit all `.refine()` calls for chainability changes
4. Run validation: `npm run type-check && npm run test`

### Alternatives Considered
- **Coexistence strategy** (`zod/v3`, `zod/v4`): Rejected - adds complexity, codebase is small
- **Stay on Zod 3**: Rejected - misses performance improvements and new features

---

## 4. Cypress 15 Migration (13.17 → 15.3)

### Decision
Update to Cypress 15.3 with Node.js version verification and Webpack 5 confirmation. No breaking API changes affect the codebase.

### Rationale
- **Low risk**: No breaking API usage detected (`cy.exec().code`, `SelectorPlayground`, `cy.origin()`)
- **Node.js requirement**: Must use Node 20, 22, or 24+ (drop 18/23 support)
- **Performance**: JIT compilation enabled by default
- **Security**: Patches multiple vulnerabilities

### Key Changes Required
1. **Node.js version check**: Verify `node -v` ≥ 20
2. **Webpack 5 verification**: Confirm `webpack@^5` installed (Next.js 14 defaults to v5 ✅)
3. **Package update**: `cypress@^15.3.2`

### Migration Steps
1. Verify Node.js version: `node -v` (must be 20, 22, or 24+)
2. Update package.json: `cypress@^15.3.2`
3. Run test suite: `npm run test:e2e`

### Alternatives Considered
- **Stay on Cypress 13**: Rejected - misses security patches and performance improvements

---

## 5. SWR Library for API Caching

### Decision
Implement SWR library for stale-while-revalidate pattern with global `SWRProvider` configuration, `dedupingInterval: 5000ms`, and `revalidateOnFocus: true`.

### Rationale
- **Automatic cache management**: Built-in deduplication, revalidation, and optimistic updates
- **Next.js App Router compatible**: Works with server components via client component wrapper
- **Performance**: 5s deduplication interval prevents redundant requests

### Implementation Pattern
```typescript
// src/lib/providers/SWRProvider.tsx
'use client'
import { SWRConfig } from 'swr'

export const SWRProvider = ({ children }) => {
  return <SWRConfig value={{
    dedupingInterval: 5000,      // 5s deduplication
    revalidateOnFocus: true,     // Auto-revalidate on tab focus
    fetcher: (url) => fetch(url).then(r => r.json())
  }}>{children}</SWRConfig>
}
```

### Best Practices
- **Never write to cache directly**: Use `mutate()` API
- **Optimistic updates**: Use `optimisticData` option for instant UI
- **Conditional fetching**: Pass `null` as key to skip requests
- **Immutable data**: Use `useSWRImmutable` for static resources

### Alternatives Considered
- **React Query**: Rejected - more complex setup, SWR is simpler for personal app
- **Manual fetch caching**: Rejected - reinvents wheel, error-prone

---

## 6. Supabase Connection Pooling

### Decision
Configure Supabase connection pooling with Transaction mode (port 6543) for Next.js API routes, `connection_limit=1` for serverless, and separate Session mode (port 5432) for migrations.

### Rationale
- **Serverless optimization**: Transaction mode shares connections across clients (200+ concurrent)
- **Prepared statement compatibility**: `?pgbouncer=true` parameter disables prepared statements
- **Connection limit**: Start with `connection_limit=1` for Vercel serverless functions

### Configuration
**Environment Variables** (`.env.local`):
```bash
# API routes (Transaction mode, port 6543)
DATABASE_URL="postgres://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Migrations (Session mode, port 5432)
DIRECT_URL="postgres://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

**Pool Sizing**:
- Default pool size: 40% of `max_connections` (e.g., 24/60)
- Application connection limit: Start with 1, increase only if needed

### Alternatives Considered
- **Session mode for API routes**: Rejected - exhausts connections quickly (1 per client)
- **No pooling**: Rejected - risks "Max client connections reached" errors under load

---

## 7. API DTO Pattern

### Decision
Implement Data Transfer Objects (DTOs) to decouple frontend types from Supabase database schema, with mapper functions for Entity→DTO→Domain transformations.

### Rationale
- **Resilience**: UI immune to backend schema changes (column renames, additions)
- **Type safety**: Compile-time guarantees via TypeScript interfaces
- **Performance**: Shape data to include only required fields

### Implementation Pattern
```typescript
// src/lib/api/dtos/paint.dto.ts
export interface PaintDTO {
  id: string
  name: string
  brand: string
  color: { hex: string; lab: { l: number; a: number; b: number } }
}

// src/lib/api/mappers/paint-mapper.ts
export function toPaintDTO(row: EnhancedPaintRow): PaintDTO {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    color: {
      hex: row.hex,
      lab: { l: row.lab_l, a: row.lab_a, b: row.lab_b }
    }
  }
}
```

### Best Practices
- **Transform at boundaries**: Map DTO→Domain in API client
- **Centralize mappers**: One file per domain (e.g., `paint-mapper.ts`)
- **Validate DTOs**: Use Zod schemas for runtime validation

### Alternatives Considered
- **Direct database types**: Rejected - tight coupling, breaking changes cascade
- **Mapper libraries** (AutoMapper): Rejected - unnecessary for TypeScript

---

## 8. Structured Logging

### Decision
Implement Pino logger for Next.js serverless functions with severity levels (ERROR, WARN, INFO, DEBUG), child loggers for request context, and synchronous logging only.

### Rationale
- **Serverless optimized**: Pino is fastest JSON logger, synchronous to prevent log loss
- **Context injection**: Child loggers automatically add `requestId`, `userId`, `path`
- **Minimal overhead**: 6x faster than Winston, no async logging issues

### Implementation Pattern
```typescript
// src/lib/logging/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ severity: label.toUpperCase() })
  },
  base: { env: process.env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
})

// API route usage
const requestLogger = logger.child({
  requestId: crypto.randomUUID(),
  userId: user.id,
  path: req.url,
})
requestLogger.info({ deltaE: 1.8 }, 'Optimization completed')
```

### Severity Levels
- **ERROR**: Critical failures (500s, exceptions)
- **WARN**: Non-critical issues (429 rate limits, deprecations)
- **INFO**: Business events (optimization started, session saved)
- **DEBUG**: Development only (algorithm iterations)

### Alternatives Considered
- **Winston**: Rejected - async logging can drop logs on serverless termination
- **console.log replacement**: Rejected - no structured data, hard to query

---

## Summary

All dependency migrations use automated tooling (codemods) where available, with manual validation for breaking changes. The refactoring patterns (SWR, DTOs, Pino) are industry-standard solutions optimized for Next.js serverless deployment. No constitutional violations - all changes preserve existing color accuracy architecture and testing standards.

**Estimated migration time**: 4-6 hours (2h dependencies, 2h patterns, 2h validation)
