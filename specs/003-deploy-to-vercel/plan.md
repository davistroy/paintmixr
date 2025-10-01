# Implementation Plan: Deploy to Vercel with OAuth Authentication

**Branch**: `003-deploy-to-vercel` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/davistroy/dev/paintmixr/specs/003-deploy-to-vercel/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✓
2. Fill Technical Context ✓
3. Fill Constitution Check ✓
4. Evaluate Constitution Check → Initial PASS
5. Execute Phase 0 → research.md (in progress)
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
7. Re-evaluate Constitution Check
8. Plan Phase 2 → Describe task generation
9. STOP - Ready for /tasks command
```

## Summary
Deploy PaintMixr to Vercel with OAuth authentication (Google, Microsoft, Facebook) and continuous deployment from GitHub. Configure Supabase Auth for social login with account merging by email. Set up Vercel integration for automatic production deployments from main branch and preview deployments for pull requests. Support 10 concurrent users with <5 minute deployment windows and 24-hour session duration.

## Technical Context
**Language/Version**: TypeScript 5.x, Next.js 14.2.33, Node.js 22+
**Primary Dependencies**: @supabase/supabase-js 2.50.0, @supabase/auth-helpers-nextjs (for OAuth), Vercel CLI
**Storage**: Supabase PostgreSQL with Row Level Security
**Testing**: Jest, Cypress E2E for OAuth flows and session management
**Target Platform**: Vercel serverless platform, browser (Chrome/Firefox/Safari latest)
**Project Type**: Web (Next.js App Router with Supabase backend)
**Performance Goals**: <500ms OAuth redirect latency, <5 min deployment time, 10 concurrent users
**Constraints**: 24-hour session duration, developer-only deployment logs, email-based account merging
**Scale/Scope**: Small team (1-10 users), 3 OAuth providers, GitHub Actions + Vercel integration

**Remaining Clarifications to Resolve**:
- FR-008: OAuth security best practices (PKCE, state validation) - Research Supabase Auth built-in security
- FR-012: Environment variables needed - Research Vercel environment variable requirements

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Principle I - Color Accuracy First**: N/A - This feature does not modify color calculation algorithms or display logic

**Principle II - Documentation Currency**: PASS - Will use Context7 MCP for Supabase Auth, Vercel, and Next.js documentation research

**Principle III - Test-First Development**: PASS - Cypress E2E tests for OAuth flows, Jest tests for session validation, tests written before implementation

**Principle IV - Type Safety & Validation**: PASS - TypeScript strict mode, Zod validation for OAuth callback parameters and environment variables

**Principle V - Performance & Accessibility**: PASS - OAuth flows must not block UI, existing WCAG 2.1 AA compliance maintained, no performance impact on color calculations

**Principle VI - Real-World Testing**: PASS - Cypress E2E tests for complete OAuth flows (Google/Microsoft/Facebook), session expiration testing, deployment verification tests

**Production Standards Compliance**: PASS - Supabase RLS for user data, HTTPS via Vercel, session management with 24-hour duration, deployment security via Vercel authentication

*No constitutional violations*

## Project Structure

### Documentation (this feature)
```
specs/003-deploy-to-vercel/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── auth-api.yaml    # OAuth endpoints
│   └── deployment-api.yaml  # Vercel configuration
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── callback/route.ts         # OAuth callback handler
│   │       └── signout/route.ts          # Sign out endpoint
│   ├── auth/
│   │   ├── signin/page.tsx              # Sign-in page with OAuth buttons
│   │   └── error/page.tsx               # Auth error page
│   └── middleware.ts                     # Auth middleware for protected routes
├── components/
│   └── auth/
│       ├── AuthProvider.tsx              # Supabase Auth context provider
│       ├── SignInButton.tsx              # OAuth provider buttons
│       └── SignOutButton.tsx             # Sign out component
├── lib/
│   ├── auth/
│   │   ├── supabase-client.ts           # Client-side Supabase client
│   │   ├── supabase-server.ts           # Server-side Supabase client
│   │   └── session-manager.ts           # Session validation utilities
│   └── database/
│       └── supabase-client.ts            # Existing, update if needed

cypress/
├── e2e/
│   ├── oauth-google.cy.ts                # Google OAuth E2E test
│   ├── oauth-microsoft.cy.ts             # Microsoft OAuth E2E test
│   ├── oauth-facebook.cy.ts              # Facebook OAuth E2E test
│   ├── session-management.cy.ts          # Session expiration tests
│   └── account-merging.cy.ts             # Email-based account merge tests
└── support/
    └── auth-commands.ts                   # Custom Cypress commands

.github/workflows/
└── vercel-deploy.yml                      # GitHub Actions for Vercel

Root files:
├── vercel.json                            # Vercel deployment configuration
└── .env.local.example                     # Update with OAuth credentials
```

**Structure Decision**: Next.js App Router structure with dedicated auth routes and middleware. OAuth handling follows Next.js 14 server actions pattern with Supabase Auth integration. Vercel deployment configured via GitHub integration with automatic preview deployments.

## Phase 0: Outline & Research ✅ COMPLETE

**Output**: `/home/davistroy/dev/paintmixr/specs/003-deploy-to-vercel/research.md`

### Research Completed

1. **OAuth Security (FR-008)**: Supabase Auth handles PKCE and state validation automatically
2. **Environment Variables (FR-012)**: Documented required Vercel environment variables
3. **OAuth Provider Setup**: Google, Microsoft, Facebook configuration steps
4. **Account Merging**: Automatic email-based linking via Supabase Auth
5. **Session Duration**: 24-hour JWT expiry configured in Supabase
6. **Vercel Deployment**: GitHub integration with automatic CD
7. **Testing Strategy**: Cypress E2E with real/mock OAuth flows

**All clarifications resolved**. No NEEDS CLARIFICATION markers remain.

---

## Phase 1: Design & Contracts ✅ COMPLETE

**Outputs**:
- `/home/davistroy/dev/paintmixr/specs/003-deploy-to-vercel/data-model.md`
- `/home/davistroy/dev/paintmixr/specs/003-deploy-to-vercel/contracts/auth-api.yaml`
- `/home/davistroy/dev/paintmixr/specs/003-deploy-to-vercel/contracts/vercel-config.yaml`
- `/home/davistroy/dev/paintmixr/specs/003-deploy-to-vercel/quickstart.md`
- `/home/davistroy/dev/paintmixr/CLAUDE.md` (updated via script)

### Data Model Summary

No new application entities created. Feature leverages:
- `auth.users` (Supabase managed)
- `auth.identities` (Supabase managed - tracks multiple OAuth providers)
- `auth.sessions` (Supabase managed - 24-hour TTL)
- Existing application tables (`enhanced_paints`, etc.) already have `user_id` FK

Account merging: Automatic when email matches across providers.

### API Contracts Summary

**Auth Endpoints** (`contracts/auth-api.yaml`):
- `GET /auth/signin` - Sign-in page with OAuth buttons
- `GET /api/auth/callback` - OAuth callback handler (Supabase redirect)
- `POST /api/auth/signout` - Sign out and clear session
- `GET /auth/error` - Error page for OAuth failures

**Deployment Config** (`contracts/vercel-config.yaml`):
- Environment variables (public + encrypted)
- GitHub integration settings
- Deployment workflows (production + preview)
- Performance and security requirements

### Quickstart Scenarios Summary

8 integration test scenarios:
1. New user sign-in with Google
2. Account merging (Google + Microsoft, same email)
3. Session expiry and re-authentication
4. Production deployment from main branch
5. Preview deployment for feature branch
6. Failed build rollback
7. OAuth provider outage handling
8. Concurrent users load test (10 users)

### Agent Context Update

CLAUDE.md updated with:
- OAuth provider patterns (Google, Microsoft, Facebook)
- Supabase Auth integration
- Vercel deployment workflow
- Session management (24-hour duration)
- Account merging by email

---

## Phase 2: Task Planning Approach

**Task Generation Strategy** (to be executed by `/tasks` command):

### Setup Phase (Sequential)
1. Configure Google OAuth in Google Cloud Console [Manual]
2. Configure Microsoft OAuth in Azure Portal [Manual]
3. Configure Facebook OAuth in Facebook Developers [Manual]
4. Enable OAuth providers in Supabase Dashboard [Manual]
5. Set JWT expiry to 24 hours in Supabase [Manual]
6. Connect GitHub repository to Vercel [Manual]
7. Configure Vercel environment variables [Manual]

### Testing Phase (TDD - Before Implementation) [P = Parallel]
8. [P] Write Cypress test: Google OAuth flow
9. [P] Write Cypress test: Microsoft OAuth flow
10. [P] Write Cypress test: Facebook OAuth flow
11. [P] Write Cypress test: Account merging by email
12. [P] Write Cypress test: Session expiration handling
13. Write Jest test: Session validation utilities
14. Write Cypress test: Protected route middleware

### Implementation Phase - Auth UI [P]
15. [P] Create `/auth/signin` page with OAuth provider buttons
16. [P] Create `/auth/error` page for OAuth errors
17. [P] Create `SignInButton` component (3 variants)
18. [P] Create `SignOutButton` component
19. [P] Create `AuthProvider` context wrapper

### Implementation Phase - Auth Logic (Sequential dependencies)
20. Create `lib/auth/supabase-client.ts` - client-side Supabase client
21. Create `lib/auth/supabase-server.ts` - server-side Supabase client
22. Create `lib/auth/session-manager.ts` - session validation utilities
23. Create `/api/auth/callback/route.ts` - OAuth callback handler
24. Create `/api/auth/signout/route.ts` - sign-out endpoint
25. Create `src/middleware.ts` - auth middleware for protected routes
26. Update existing `lib/database/supabase-client.ts` if needed

### Vercel Deployment Phase (Sequential)
27. Create `vercel.json` configuration file
28. Update `.env.local.example` with OAuth variables
29. Deploy to Vercel preview environment (test branch)
30. Run quickstart Scenario 5 (preview deployment validation)
31. Deploy to Vercel production (merge to main)
32. Run quickstart Scenarios 1-4 (production validation)

### Polish & Documentation Phase [P]
33. [P] Add loading states to OAuth buttons
34. [P] Add error handling to callback route
35. [P] Add session refresh logic
36. [P] Update README with deployment instructions
37. [P] Create `.github/workflows/` if custom CI needed

**Ordering Strategy**:
- Setup tasks: Manual configuration, sequential
- Test tasks: Parallel where possible (independent test files)
- Implementation: Utilities before components, components before routes
- Deployment: Preview before production
- Polish: All parallel

**Estimated Output**: 37 tasks in tasks.md

**Dependencies**:
- Tasks 20-22 must complete before 23-25 (utilities before routes)
- Tasks 15-19 parallel but depend on Supabase client (20-21)
- Tasks 27-32 sequential (config → preview → production)
- Tasks 8-14 can all run in parallel (TDD test generation)

**Success Criteria**:
- All Cypress tests pass in CI
- All quickstart scenarios validate successfully
- Production deployment <5 minutes
- Zero constitutional violations

**IMPORTANT**: This phase is executed by the `/tasks` command, NOT by `/plan`

---

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/implement command or manual)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, verify deployment)

---

## Complexity Tracking

*No constitutional violations detected*

All principles satisfied:
- Uses existing Supabase + Next.js stack
- No custom OAuth implementation (uses Supabase Auth)
- TypeScript strict mode enforced
- TDD approach with Cypress E2E tests
- Performance requirements met (<500ms, <5 min deploys)

---

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete ✅
- [x] Phase 1: Design complete ✅
- [x] Phase 2: Task planning complete (approach documented) ✅
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS ✅
- [x] Post-Design Constitution Check: PASS ✅
- [x] All NEEDS CLARIFICATION resolved ✅
- [x] Complexity deviations documented: N/A (no violations) ✅

**Artifacts Generated**:
- [x] research.md
- [x] data-model.md
- [x] contracts/auth-api.yaml
- [x] contracts/vercel-config.yaml
- [x] quickstart.md
- [x] CLAUDE.md (updated)
- [x] plan.md (this file)

---

**Planning Complete**. Ready for `/tasks` command to generate tasks.md.

---
*Based on Constitution v1.1.0 - See `.specify/memory/constitution.md`*
