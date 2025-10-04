# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Specify-based project** using a structured approach to feature development. The project follows a phase-based development methodology with clear workflows for specification, planning, and implementation.

## Development Workflow Commands

### Core Slash Commands
Available commands through Claude's SlashCommand tool:

- `/specify [description]` - Create feature specification from natural language
- `/clarify` - Identify underspecified areas and ask clarification questions
- `/plan` - Generate implementation plan with architecture and contracts
- `/tasks` - Create actionable task list from design artifacts
- `/implement` - Execute implementation following generated tasks
- `/analyze` - Analyze consistency across spec, plan, and tasks
- `/constitution` - Create/update project constitution

### Development Scripts
Key scripts in `.specify/scripts/bash/`:

- `create-new-feature.sh` - Initialize new feature branch and structure
- `setup-plan.sh` - Prepare planning environment
- `check-prerequisites.sh` - Validate required documents exist
- `update-agent-context.sh` - Update agent-specific guidance files

## Project Structure

### Documentation Architecture
```
specs/[###-feature]/
├── spec.md          # Feature specification (from /specify)
├── plan.md          # Implementation plan (from /plan)
├── research.md      # Technical research (from /plan)
├── data-model.md    # Entity definitions (from /plan)
├── quickstart.md    # Integration scenarios (from /plan)
├── contracts/       # API specifications (from /plan)
└── tasks.md         # Actionable task list (from /tasks)
```

### Constitutional Framework
- Constitution file: `.specify/memory/constitution.md`
- Contains project principles and constraints
- Must be checked during planning phase
- Violations require explicit justification

### Templates System
Located in `.specify/templates/`:
- `spec-template.md` - Feature specification structure
- `plan-template.md` - Implementation planning template
- `tasks-template.md` - Task generation template
- `agent-file-template.md` - Agent context template

## Feature Development Process

### 1. Specification Phase
- Use `/specify [description]` to create initial spec
- Creates new feature branch (###-feature-name format)
- Generates `spec.md` with user scenarios and requirements

### 2. Clarification Phase
- Use `/clarify` if spec contains ambiguities
- Resolves unclear requirements before planning
- Updates spec with clarification sessions

### 3. Planning Phase
- Use `/plan` to generate implementation design
- Creates research.md, data-model.md, contracts/, quickstart.md
- Updates agent context file (CLAUDE.md)
- Validates against constitutional principles

### 4. Task Generation
- Use `/tasks` to create executable task list
- Generates dependency-ordered tasks
- Marks parallel tasks with [P] indicator
- Follows TDD approach (tests before implementation)

### 5. Implementation
- Use `/implement` to execute tasks systematically
- Follows phase-based execution (Setup → Tests → Core → Integration → Polish)
- Respects task dependencies and parallel execution rules

## Key Conventions

### Branch Naming
- Feature branches: `###-feature-name` (e.g., `001-user-auth`)
- Enforced by scripts when Git is available

### File Organization
- All feature docs in `specs/[branch-name]/`
- Source code structure determined during planning phase
- Agent context files updated incrementally

### Task Execution Rules
- Tests written before implementation (TDD)
- Parallel tasks [P] can run simultaneously
- Sequential tasks must complete in order
- Phase completion required before proceeding

### Error Handling
- Constitutional violations must be justified or resolved
- Missing prerequisites halt workflow
- All ambiguities must be clarified before implementation

## Agent Context Management

The `update-agent-context.sh` script maintains this CLAUDE.md file by:
- Adding new technology decisions from current plans
- Preserving manual additions between markers
- Keeping recent changes (last 3 features)
- Maintaining token efficiency (<150 lines)

This ensures future Claude instances have current project context without manual maintenance.

# Recent Technical Decisions (Last Updated: 2025-10-02)

## Constitutional Updates (v1.1.0)
- **NEW Principle VI**: Real-World Testing & Validation - Cypress E2E testing mandatory
- **Enhanced Color Accuracy**: Kubelka-Munk coefficients now required in paint database
- **Production Standards**: PWA compliance, Supabase RLS security, session management
- **Performance Requirements**: Sub-500ms color calculations, automated regression testing

## As-Built Technology Stack
- **Frontend**: Next.js 15, TypeScript strict mode, Radix UI, Tailwind CSS
- **Backend**: Supabase with Row Level Security policies
- **Testing**: Jest + Cypress E2E + WCAG accessibility testing
- **Color Science**: CIE 2000 Delta E, LAB color space, Kubelka-Munk mixing theory
- **Performance**: Web Workers for calculations, performance monitoring with baselines

## Key Implementation Patterns
- ColorValue interface with hex/LAB validation and type guards
- User-specific paint collections with RLS isolation
- Canvas-based image processing with extraction methods
- Performance budgets enforced (Lighthouse ≥90 for Performance/Accessibility)
- PWA manifest with offline capabilities

## Email/Password Authentication (Feature 004)

### Authentication Architecture
- **Server-side API Route Pattern**: All auth logic in `/api/auth/email-signin` route handler
  - Never call Supabase client directly from components for authentication
  - Validation happens server-side before Supabase calls
  - Generic error messages prevent user enumeration (NFR-004)
- **Supabase Auth Integration**: Uses `signInWithPassword()` method via route handler client
- **Session Management**: Automatic cookie-based sessions via `@supabase/ssr` package

### Validation Pattern (Zod)
```typescript
// src/lib/auth/validation.ts
export const emailSigninSchema = z.object({
  email: z.string().email().transform(val => val.toLowerCase().trim()),
  password: z.string().min(1)
})
```
- Email normalization (lowercase + trim) prevents duplicate accounts
- Client-side validation in React Hook Form + Zod resolver
- Server-side re-validation in API route (never trust client)

### Rate Limiting & Lockout
- **15-minute lockout after 5 failed attempts** (NFR-002)
- **Client-side tracking**: `localStorage` for immediate UI feedback (`src/lib/auth/rate-limit.ts`)
- **Server-side enforcement**: Metadata in `auth.users.user_metadata` via Admin API
- **Metadata helpers** (`src/lib/auth/metadata-helpers.ts`):
  ```typescript
  getLockoutMetadata(user) // Extract from user_metadata
  isUserLockedOut(metadata) // Check if locked + remaining time
  incrementFailedAttempts(metadata) // Update on auth failure
  clearLockout(metadata) // Reset on success
  ```
- **Important**: Use Supabase Admin client (service role key) to update metadata
- **Lockout fields**: `failed_login_attempts`, `lockout_until`, `last_failed_attempt`

### OAuth Precedence (FR-006)
- Query `auth.identities` table to check for non-email providers
- Block email/password signin if OAuth identity exists
- Return 403 with provider-specific message: "This account uses OAuth authentication. Please sign in with {Provider}."
- Prevents user confusion when multiple auth methods configured

### Security Best Practices
1. **No User Enumeration**: All auth errors return "Invalid credentials" (same message for wrong password, non-existent user, disabled account)
2. **Timing Attack Prevention**: Don't return early for non-existent users; always execute full auth flow
3. **Generic Error Codes**: Use codes like `account_locked`, `oauth_precedence` on client for UI, not in API responses
4. **Admin-Only Provisioning**: Auth hook blocks self-signup for email/password (Task T017)

### Component Pattern
```typescript
// EmailSigninForm component (src/components/auth/EmailSigninForm.tsx)
- React Hook Form + Zod validation
- Check localStorage lockout before submit
- POST to /api/auth/email-signin
- Display generic errors (no enumeration)
- Show lockout countdown timer (15 min)
```

### Common Pitfalls
1. **Don't use `raw_user_meta_data` in client queries** - Server-only metadata, use Admin API
2. **Never skip server-side validation** - Client validation is UX, not security
3. **Don't leak user existence** - Same error for "user not found" and "wrong password"
4. **Lockout must be server-enforced** - Client localStorage is for UX only
5. **Email case sensitivity** - Always normalize to lowercase (prevent duplicate@example.com and Duplicate@example.com)

### Testing Strategy
- **Unit tests**: Zod validation (36 tests), rate limiting logic (27 tests)
- **Component tests**: React Hook Form integration, lockout UI (37 tests)
- **Integration tests**: API route contract (28 error scenarios)
- **E2E tests**: Cypress full auth flow (13 scenarios)
- **Accessibility**: WCAG 2.1 AA compliance (36 tests, 4.5:1 contrast)
- **Performance**: Sub-5-second response time (NFR-001)

## Codebase Analysis & TypeScript Strict Mode (Feature 005) - COMPLETED 2025-10-02

### TypeScript Strict Mode Configuration
- **All strict flags enabled** (`tsconfig.json`):
  - `strict: true` (master flag)
  - `strictNullChecks: true` (catch null/undefined access)
  - `noImplicitAny: true` (require explicit types)
  - `strictFunctionTypes: true` (function parameter contravariance)
  - `noUnusedLocals: true` / `noUnusedParameters: true` (dead code detection)
- **Build enforcement**: Never use `ignoreBuildErrors: true` in `next.config.js`
- **Liberal suppressions allowed**: Use `@ts-expect-error` or `@ts-ignore` for third-party library issues

### Performance & Security Fixes
- **N+1 Query Prevention**: Always use `.eq('email', email)` filter in auth queries
  - Never fetch all users then filter in memory (O(n) → O(1) lookup)
  - Email index required on `auth.users.email` column
- **Atomic Lockout Counter**: Use database function `increment_failed_login_attempts()`
  - Prevents race conditions in concurrent failed auth attempts
  - Ensures exactly 5 attempts trigger lockout (not 6+ from race)
- **Lockout Timer Reset**: Attempting login during lockout resets timer to full 15 minutes
- **OAuth Precedence Check**: Query `auth.identities` table before email/password auth
  - Return 403 with provider name if non-email identity exists

### SSR-Safe Patterns
- **localStorage Guards**: Always check `typeof window !== 'undefined'` before access
  - Use `mounted` flag pattern in React components for SSR safety
  - Example: `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])`
- **Next.js 15 Async searchParams**: All page components must use `Promise<SearchParams>` type
  ```typescript
  export default async function Page({ searchParams }: { searchParams: Promise<{...}> }) {
    const params = await searchParams
  }
  ```

### Centralized Type System
- **Single source of truth**: `/src/lib/types/index.ts` exports all shared types
- **Import pattern**: Always use `import { ColorValue, Paint } from '@/lib/types'`
- **Domain-specific naming**: Incompatible duplicates renamed with domain prefix
  - `OptimizationVolumeConstraints` (backend) vs `UIVolumeConstraints` (frontend)
- **Type guards included**: `isColorValue()`, `isLABColor()`, `isValidHexColor()`

### Modern Supabase Clients (@supabase/ssr)
- **One pattern per context**:
  - Browser: `src/lib/supabase/client.ts` (createBrowserClient)
  - Server components: `src/lib/supabase/server.ts` (createServerClient)
  - API routes: `src/lib/supabase/route-handler.ts` (createServerClient)
  - Admin: `src/lib/supabase/admin.ts` (createClient with service role key)
- **Session management**: Cookie-based only (never localStorage)
- **Legacy patterns deleted**: No `@supabase/auth-helpers-nextjs` imports

### Shared Utilities & Code Reuse
- **API client** (`src/lib/api/client.ts`): Centralized fetch wrapper with error handling
- **Form schemas** (`src/lib/forms/schemas.ts`): Shared Zod validation schemas
- **Hooks** (`src/lib/hooks/`): Reusable pagination, filtering, data-fetching logic
- **Target**: 40-50% code duplication reduction (token-based AST analysis)

### Component Size Standards
- **Max 300 lines per component** (TSX files)
- **Refactoring strategies** (both allowed):
  - Sub-component extraction (EmailInput.tsx, PasswordInput.tsx)
  - Utility function extraction (validation.ts, metadata-helpers.ts)
- **Average component size**: Under 250 lines

### Test Coverage Requirements
- **Critical paths**: 90%+ coverage (lines, branches, functions, statements)
  - Authentication (`src/lib/auth/`)
  - Color science (`src/lib/color/`)
  - Mixing optimization (`src/lib/mixing/`)
- **No placeholder tests**: All `.skip()` tests must have TODO comments
- **Cypress E2E**: Full authentication flow (signin, rate limit, lockout, OAuth)

### Common Pitfalls
1. **Never fetch all users**: Use `.eq()` filter (N+1 query DoS vulnerability)
2. **SSR hydration**: Check `mounted` flag before rendering localStorage-dependent UI
3. **Async searchParams**: Next.js 15 requires `await searchParams` in page components
4. **Type imports**: Import from `@/lib/types`, never local type files
5. **Supabase clients**: Use modern `@supabase/ssr` patterns, never legacy helpers

## Bug Fixes from E2E Testing (Feature 006) - IN PROGRESS 2025-10-03

### Supabase Client Pattern in API Routes (CRITICAL)
- **NEVER use Admin client in user-facing API routes**
  - Admin client (`createAdminClient()`) uses service role key, cannot access session cookies
  - Route handler client (`createClient()` from route-handler.ts) accesses user session
- **Pattern for API routes**:
  ```typescript
  // WRONG - causes 401 for authenticated users
  const supabase = createAdminClient()

  // CORRECT - accesses user session from cookies
  import { createClient } from '@/lib/supabase/route-handler'
  const supabase = await createClient()  // Note: async
  ```
- **When to use each client**:
  - Route handler client: User-scoped API operations (`/api/optimize`, `/api/sessions`, etc.)
  - Admin client: Admin operations (update user metadata, bypass RLS)
  - Browser client: Client components
  - Server client: Server components

### Toast Notification System (UX Enhancement)
- **Library**: shadcn/ui Toast component (Radix UI primitive)
- **Installation**: `npx shadcn@latest add toast`
- **Components**:
  - `/src/components/ui/toast.tsx` - Toast primitive
  - `/src/components/ui/toaster.tsx` - Toast container (add to root layout)
  - `/src/hooks/use-toast.ts` - Toast hook
- **Usage pattern**:
  ```typescript
  import { useToast } from '@/hooks/use-toast'
  const { toast } = useToast()

  toast({
    title: "Session saved successfully",
    variant: "success",  // success | destructive | default
    duration: 3000,      // Auto-dismiss time in ms
  })
  ```
- **Accessibility**:
  - Success/default: ARIA `role="status"` (polite)
  - Destructive: ARIA `role="alert"` (assertive)
  - All toasts dismissible via ESC key
  - Color contrast ≥ 4.5:1 (WCAG 2.1 AA)

### Error Message Translation
- **Centralized utility**: `/src/lib/errors/user-messages.ts`
- **Pattern**: Translate HTTP status codes to user-friendly messages
  ```typescript
  const userMessage = translateApiError({
    status: error.response?.status,
    code: error.code,
  })
  // 401 → "Session expired. Please sign in again."
  // 500 → "Unable to complete request. Please try again."
  // NETWORK_ERROR → "Connection issue. Please check your internet connection."
  ```
- **NEVER show technical error codes to users** (401, 500, etc.)
- **Always log technical details to console** (for debugging)

### Retry Logic for Auth Failures
- **Single automatic retry with 500ms delay for 401 errors**
- **Pattern**:
  ```typescript
  try {
    const response = await fetch('/api/optimize', ...)
    if (response.status === 401 && retryCount === 0) {
      await new Promise(resolve => setTimeout(resolve, 500))
      return fetchWithAuthRetry(fetcher, retryCount + 1)
    }
    if (response.status === 401 && retryCount > 0) {
      window.location.href = '/auth/signin?reason=session_expired'
    }
  }
  ```
- **Rationale**: Handles transient auth token refresh, prevents infinite loops

### Session Expiration Handling
- **Query param pattern**: `/auth/signin?reason=session_expired`
- **Display toast on signin page based on reason param**
- **Extensible for other reasons** (account_locked, password_reset_required, etc.)

### Component Interface Enhancements (Backward Compatible)
- **SaveForm**: Added optional `onSuccess?: () => void` callback
  - Called after successful save and toast display
  - Parent uses to close dialog and refresh data
- **SessionCard**: Added optional `onDetailClick?: (sessionId: string) => void`
  - If undefined, shows toast: "Session details view coming soon"
  - If defined, parent handles navigation (for future implementation)

### Common Pitfalls (Bug Fixes)
1. **Admin client in API routes**: Always use route handler client for user operations
2. **Missing toast feedback**: Add success/error toasts for all async user actions
3. **Technical error messages**: Always translate to user-friendly messages
4. **Missing graceful degradation**: Unimplemented features should show "coming soon", not timeout
