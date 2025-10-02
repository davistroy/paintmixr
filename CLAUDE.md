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

# Recent Technical Decisions (Last Updated: 2025-09-29)

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
