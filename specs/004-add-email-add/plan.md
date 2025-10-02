# Implementation Plan: Email/Password Authentication

**Branch**: `004-add-email-add` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/davistroy/dev/paintmixr/specs/004-add-email-add/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → SUCCESS: Spec loaded
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → SUCCESS: All clarifications resolved
   → Detected Project Type: Web application (Next.js + Supabase)
   → Set Structure Decision: Next.js App Router with src/ structure
3. Fill the Constitution Check section
   → PASS: Authentication feature aligns with security and testing requirements
4. Evaluate Constitution Check section
   → No violations detected
   → Update Progress Tracking: Initial Constitution Check ✓
5. Execute Phase 0 → research.md
   → SUCCESS: Supabase Auth best practices researched
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → SUCCESS: All artifacts generated
7. Re-evaluate Constitution Check section
   → PASS: Design complies with all principles
   → Update Progress Tracking: Post-Design Constitution Check ✓
8. Plan Phase 2 → Describe task generation approach
   → Ready for /tasks command
9. STOP - Ready for /tasks command
```

## Summary
Add email/password authentication as an alternative to OAuth providers (Google, Microsoft, Facebook) for the PaintMixr application. Admin-only user provisioning via Supabase Console with no self-registration capability. Implements Supabase Auth best practices including rate limiting (5 failed attempts = 15-30 min lockout), case-insensitive email handling, and generic error messages to prevent user enumeration. Uses Supabase's built-in `signInWithPassword()` method and auth hooks to block unauthorized signups.

## Technical Context
**Language/Version**: TypeScript 5.9.2, Next.js 14.2.33, React 18.3.1
**Primary Dependencies**:
- @supabase/ssr ^0.7.0 (SSR-safe Supabase client)
- @supabase/supabase-js ^2.50.0 (Supabase Auth SDK)
- zod ^3.24.1 (input validation)
- react-hook-form ^7.54.0 (form handling)

**Storage**: Supabase Auth (managed user authentication service)
**Testing**: Jest (unit), Cypress (E2E), jest-axe (accessibility)
**Target Platform**: Web (Next.js 14 App Router, deployed on Vercel)
**Project Type**: Web application - Next.js frontend with Supabase backend
**Performance Goals**:
- Authentication response < 5 seconds (per NFR-001)
- UI interactions at 60fps (constitutional requirement)
- WCAG 2.1 AA compliance

**Constraints**:
- No self-registration UI elements
- OAuth takes precedence over email/password for same email
- Case-insensitive email matching (normalize to lowercase)
- No password strength requirements
- Admin-only password resets
- Generic "Invalid credentials" error for all auth failures

**Scale/Scope**:
- Single sign-in page modification
- Add email/password form component
- Implement rate limiting via Supabase Auth hooks
- E2E tests for authentication flow
- No new database tables (uses Supabase Auth managed tables)

**User-Provided Requirements**: Use Supabase best practices and latest patterns including:
- Disable self-signup via auth hooks
- Server-side authentication validation
- PKCE flow for enhanced security
- Case-insensitive email normalization
- Rate limiting for brute force protection

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I - Color Accuracy First**: N/A - Authentication feature does not involve color calculations or display

**Principle II - Documentation Currency**: PASS - Supabase documentation fetched via WebFetch from official docs (https://supabase.com/docs/guides/auth/passwords, https://supabase.com/docs/reference/javascript/auth-signinwithpassword)

**Principle III - Test-First Development**: PASS - TDD approach planned with Jest unit tests for validation logic, Cypress E2E tests for sign-in flow, tests written before implementation

**Principle IV - Type Safety & Validation**: PASS - TypeScript strict mode enforced, Zod schemas for email/password validation, proper type guards for auth state

**Principle V - Performance & Accessibility**: PASS - 5-second auth response target, WCAG 2.1 AA compliance (4.5:1 contrast, keyboard navigation, screen reader support, 44px touch targets), 60fps UI interactions

**Principle VI - Real-World Testing**: PASS - Cypress E2E tests for critical flows (valid login, invalid credentials, account lockout), accessibility testing with jest-axe, rate limit testing

**Production Standards Compliance**: PASS - Supabase Auth secure session management, Row Level Security for user data, input sanitization with Zod, rate limiting via auth hooks, error boundary handling

*No constitutional violations. Feature is authentication-focused and complies with testing, security, and accessibility requirements.*

## Project Structure

### Documentation (this feature)
```
specs/004-add-email-add/
├── spec.md              # Feature specification
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output - Supabase Auth patterns
├── data-model.md        # Phase 1 output - Auth entities
├── quickstart.md        # Phase 1 output - Integration examples
├── contracts/           # Phase 1 output - API contracts
│   └── auth-endpoints.md
└── tasks.md             # Phase 2 output (/tasks command - NOT created yet)
```

### Source Code (repository root)
```
src/
├── app/
│   ├── auth/
│   │   └── signin/
│   │       └── page.tsx              # [MODIFY] Add email/password form
│   └── api/
│       └── auth/
│           ├── email-signin/
│           │   └── route.ts          # [NEW] Server-side email auth endpoint
│           └── callback/
│               └── route.ts          # [EXISTING] OAuth callback handler
│
├── components/
│   └── auth/
│       ├── SignInButton.tsx          # [EXISTING] OAuth buttons
│       ├── EmailPasswordForm.tsx     # [NEW] Email/password input form
│       └── AuthErrorDisplay.tsx      # [NEW] Generic error messaging
│
├── lib/
│   └── auth/
│       ├── supabase-client.ts        # [MODIFY] Add signInWithPassword wrapper
│       ├── supabase-server.ts        # [EXISTING] Server auth validation
│       ├── validation.ts             # [NEW] Zod schemas for email/password
│       └── rate-limit.ts             # [NEW] Client-side lockout tracking
│
└── types/
    └── auth.ts                       # [NEW] Auth-specific TypeScript types
```

**Structure Decision**: Next.js App Router with src/ directory structure. Authentication components placed in `src/app/auth/signin/` with supporting client-side form components in `src/components/auth/`. Server-side auth logic in `src/lib/auth/` following existing pattern. API route at `src/app/api/auth/email-signin/` for server-side validation before calling Supabase.

## Phase 0: Outline & Research

### Research Tasks Completed
1. **Supabase Auth password-based authentication**
   - Method: `signInWithPassword({ email, password })`
   - Returns: `{ data: { session, user }, error }`
   - Error handling: Generic error messages (doesn't distinguish between non-existent account, wrong password, or social-only account)

2. **Disabling self-signup**
   - Approach: Use "before-user-created" auth hook
   - Implementation: HTTP endpoint or Postgres function that rejects all signups
   - User creation: Admin-only via Supabase Console or Admin API

3. **Rate limiting & account lockout**
   - Supabase built-in: 2 emails per hour (for email sending)
   - Custom lockout: Track failed attempts in client-side state + server-side metadata
   - Implementation: Store failed attempt count in auth.users metadata field

4. **Case-insensitive email handling**
   - Supabase Auth: Emails are case-insensitive by default
   - Client-side: Normalize to lowercase before API call
   - Storage: Always stored lowercase in auth.users table

5. **OAuth precedence**
   - Check: Query auth.identities table for OAuth providers
   - Block: Reject email/password signin if OAuth identity exists
   - Implementation: Server-side check in API route before calling signInWithPassword

**Output**: Research consolidated in `research.md`

## Phase 1: Design & Contracts

### Data Model
- **Auth User (Supabase managed)**: Existing `auth.users` table
  - email (text, unique, lowercase normalized)
  - encrypted_password (text, bcrypt hashed)
  - email_confirmed_at (timestamp)
  - created_at (timestamp)
  - updated_at (timestamp)
  - raw_user_meta_data (jsonb) - store failed_login_attempts, lockout_until

- **Auth Identity (Supabase managed)**: Existing `auth.identities` table
  - user_id (uuid, FK to auth.users)
  - provider (text: 'email', 'google', 'azure', 'facebook')
  - created_at (timestamp)

### API Contracts
Located in `contracts/auth-endpoints.md`:

1. **POST /api/auth/email-signin**
   - Request: `{ email: string, password: string }`
   - Response Success: `{ success: true, redirectUrl: string }`
   - Response Error: `{ success: false, error: string }`
   - Validation: Zod schema, email format, OAuth precedence check
   - Rate limit: Check lockout metadata, enforce 5-attempt rule

2. **Supabase signInWithPassword** (client-side via wrapper)
   - Called after server-side validation passes
   - Error handling: Map to generic "Invalid credentials" message
   - Session: Automatically managed by Supabase SSR

### Integration Points (quickstart.md)
1. Modify sign-in page to include EmailPasswordForm component
2. Add server-side validation API route
3. Implement auth hooks to block signups
4. Add E2E tests for authentication flows
5. Update CLAUDE.md with email auth patterns

## Phase 2: Task Generation Approach
*Phase 2 executed by /tasks command - planning approach only*

### Task Breakdown Strategy
1. **Setup Phase** (T001-T003)
   - Create type definitions
   - Create Zod validation schemas
   - Set up auth hooks infrastructure

2. **Core Implementation** (T004-T010)
   - Implement EmailPasswordForm component (TDD)
   - Add signInWithPassword wrapper to supabase-client.ts
   - Create server-side validation API route
   - Implement OAuth precedence check
   - Add rate limiting logic

3. **UI Integration** (T011-T013)
   - Modify signin page.tsx to include email form
   - Add error display component
   - Implement accessibility features (ARIA labels, keyboard nav)

4. **Testing** (T014-T018)
   - Write Jest unit tests for validation
   - Write Cypress E2E tests for auth flows
   - Test account lockout behavior
   - Test OAuth precedence blocking
   - Accessibility testing with jest-axe

5. **Documentation** (T019-T020)
   - Update CLAUDE.md with email auth patterns
   - Update README with admin user provisioning instructions

### Dependency Ordering
- Types → Validation → Components → API Routes → Integration → Tests
- Parallel tracks: Component tests can run alongside API route tests
- E2E tests depend on full integration completion

### Test-First Markers
- All tasks prefixed [TDD] require test creation before implementation
- Example: "[TDD] Implement email validation schema" → write failing test first
- Cypress tests written after component integration (integration test approach)

## Progress Tracking

- [x] Initial Constitution Check
- [x] Phase 0: Research complete → research.md created
- [x] Phase 1: Design complete → data-model.md, contracts/, quickstart.md created
- [x] Post-Design Constitution Check
- [x] Phase 2: Task approach planned
- [ ] Phase 2: tasks.md generation (requires /tasks command)
- [ ] Phase 3-4: Implementation (requires /implement or manual execution)

## Artifacts Generated

1. **research.md** - Supabase Auth patterns, rate limiting approaches, case handling
2. **data-model.md** - Auth entities and relationships
3. **contracts/auth-endpoints.md** - API contract specifications
4. **quickstart.md** - Integration scenarios and examples
5. **CLAUDE.md update** - Email auth development guidance (incremental update)

## Next Steps

Run `/tasks` command to generate executable task list (`tasks.md`) from this implementation plan.

**Estimated Complexity**: Medium
- 5 new files, 3 file modifications
- ~800 lines of code (components, validation, tests)
- 15-20 tasks total
- 2-3 day implementation timeline

---

**Plan Status**: ✅ COMPLETE - Ready for task generation
