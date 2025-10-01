# Tasks: Deploy to Vercel with OAuth Authentication

**Input**: Design documents from `/home/davistroy/dev/paintmixr/specs/003-deploy-to-vercel/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓
**Feature Branch**: `003-deploy-to-vercel`
**Tech Stack**: Next.js 14.2.33, TypeScript 5.x, Supabase Auth, Vercel

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: Next.js, Supabase, Vercel, TypeScript
   → Structure: Next.js App Router, src/ directory
2. Load optional design documents ✓
   → data-model.md: No new entities (Supabase Auth managed)
   → contracts/: auth-api.yaml, vercel-config.yaml
   → research.md: OAuth security decisions
   → quickstart.md: 8 integration test scenarios
3. Generate tasks by category:
   → Setup: OAuth apps, Supabase config, Vercel integration
   → Tests: Cypress E2E for OAuth flows (TDD)
   → Core: Auth UI, API routes, middleware
   → Integration: Vercel deployment, environment variables
   → Polish: Error handling, loading states, documentation
4. Apply task rules:
   → Different test files = [P] for parallel
   → UI components = [P] (different files)
   → API routes depend on utilities (sequential)
5. Number tasks sequentially (T001-T039) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- **[Manual]**: Requires external configuration (OAuth apps, Vercel dashboard)

## Path Conventions
Using Next.js App Router structure:
- Auth pages: `src/app/auth/`
- API routes: `src/app/api/auth/`
- Components: `src/components/auth/`
- Utilities: `src/lib/auth/`
- Tests: `cypress/e2e/`, `__tests__/`

---

## Phase 3.1: Setup & Configuration

### OAuth Provider Setup (Manual Configuration)
- [ ] **T001** [Manual] Create Google OAuth 2.0 Client ID in Google Cloud Console
  - Navigate to APIs & Services → Credentials
  - Create OAuth 2.0 Client ID (Web application)
  - Add authorized redirect URI: `https://[project-ref].supabase.co/auth/v1/callback`
  - Save Client ID and Client Secret for T008

- [ ] **T002** [Manual] Create Microsoft Azure AD App Registration
  - Navigate to Azure Portal → Azure Active Directory → App registrations
  - Register new application (Web)
  - Add redirect URI: `https://[project-ref].supabase.co/auth/v1/callback`
  - Create client secret in Certificates & secrets
  - Save Application (client) ID and secret for T008

- [ ] **T003** [Manual] Create Facebook App for OAuth
  - Navigate to Facebook Developers → Create App
  - Select "Consumer" app type
  - Configure Facebook Login product
  - Add valid OAuth redirect URI: `https://[project-ref].supabase.co/auth/v1/callback`
  - Save App ID and App Secret for T008

### Supabase Configuration (Manual)
- [ ] **T004** [Manual] Enable OAuth providers in Supabase Dashboard
  - Navigate to Authentication → Providers
  - Enable Google: Add Client ID and Secret from T001
  - Enable Azure (Microsoft): Add Application ID and Secret from T002
  - Enable Facebook: Add App ID and Secret from T003
  - Verify callback URL matches: `https://[project-ref].supabase.co/auth/v1/callback`

- [ ] **T005** [Manual] Configure JWT expiry to 24 hours in Supabase
  - Navigate to Project Settings → Auth
  - Set JWT expiry: 86400 seconds (24 hours)
  - Enable "Auto Refresh Token": Yes
  - Save settings

### Vercel Setup (Manual)
- [ ] **T006** [Manual] Connect GitHub repository to Vercel
  - Navigate to Vercel Dashboard → Add New Project
  - Import GitHub repository: `davistroy/paintmixr`
  - Framework preset: Next.js
  - Root directory: `./` (repository root)
  - Build command: `npm run build`
  - Output directory: `.next`
  - Install command: `npm install`
  - Connect and deploy

- [ ] **T007** [Manual] Configure production branch and preview settings
  - Navigate to Vercel Project Settings → Git
  - Production Branch: `main`
  - Preview Deployments: All branches (enabled)
  - Automatic deployments: Enabled
  - PR Comments: Enabled (Vercel bot will comment with preview URLs)

- [ ] **T008** [Manual] Add environment variables to Vercel Dashboard
  - Navigate to Project Settings → Environment Variables
  - Add the following variables (specify target: Production, Preview, Development):
    ```
    # Public variables (all environments)
    NEXT_PUBLIC_SUPABASE_URL = https://[project-ref].supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY = [anon-key from Supabase]
    NEXT_PUBLIC_APP_URL = https://[production-domain] (Production)
    NEXT_PUBLIC_APP_URL = https://$VERCEL_URL (Preview)
    NEXT_PUBLIC_APP_URL = http://localhost:3000 (Development)

    # Encrypted secrets (Production + Preview only)
    GOOGLE_CLIENT_SECRET = [from T001] (Type: Encrypted)
    MICROSOFT_CLIENT_SECRET = [from T002] (Type: Encrypted)
    FACEBOOK_APP_SECRET = [from T003] (Type: Encrypted)
    ```
  - Save all variables

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation in Phase 3.3**

### Cypress E2E Tests (OAuth Flows)
- [ ] **T009** [P] Write Cypress test for Google OAuth flow
  - File: `cypress/e2e/oauth-google.cy.ts`
  - Test: User clicks "Sign in with Google" → redirects to Google → authenticates → returns with session
  - Verify: User menu visible, session cookie set, paint collection accessible
  - Expected: **FAIL** (no sign-in page exists yet)

- [ ] **T010** [P] Write Cypress test for Microsoft OAuth flow
  - File: `cypress/e2e/oauth-microsoft.cy.ts`
  - Test: User clicks "Sign in with Microsoft" → redirects to Microsoft → authenticates → returns with session
  - Verify: Session persists across page refresh
  - Expected: **FAIL** (no sign-in page exists yet)

- [ ] **T011** [P] Write Cypress test for Facebook OAuth flow
  - File: `cypress/e2e/oauth-facebook.cy.ts`
  - Test: User clicks "Sign in with Facebook" → redirects to Facebook → authenticates → returns with session
  - Verify: User can sign out successfully
  - Expected: **FAIL** (no sign-in page exists yet)

- [ ] **T012** [P] Write Cypress test for account merging
  - File: `cypress/e2e/account-merging.cy.ts`
  - Test: User signs in with Google (email: test@example.com) → signs out → signs in with Microsoft (same email)
  - Verify: Same `user_id` in database, paint collections preserved
  - Verify: `auth.identities` has 2 rows (google + azure) with same `user_id`
  - Expected: **FAIL** (OAuth not implemented yet)

- [ ] **T013** [P] Write Cypress test for session expiration
  - File: `cypress/e2e/session-management.cy.ts`
  - Test: User signs in → manually expire session (set `not_after` to past) → refresh page
  - Verify: Redirected to sign-in page, prompted to re-authenticate
  - Verify: New 24-hour session created after re-auth
  - Expected: **FAIL** (middleware not implemented yet)

- [ ] **T014** [P] Write Cypress test for protected route middleware
  - File: `cypress/e2e/protected-routes.cy.ts`
  - Test: Unauthenticated user attempts to access `/` → redirected to `/auth/signin`
  - Test: Authenticated user can access protected routes
  - Expected: **FAIL** (middleware not implemented yet)

### Jest Unit Tests (Session Utilities)
- [ ] **T015** Write Jest test for session validation utility
  - File: `__tests__/auth/session-validation.test.ts`
  - Test: `validateSession()` returns user for valid session
  - Test: `validateSession()` returns null for expired session
  - Test: `validateSession()` handles missing session cookie
  - Expected: **FAIL** (utility not implemented yet)

---

## Phase 3.3: Core Implementation (ONLY after tests T009-T015 are failing)

### Auth Utilities (Must complete before UI components)
- [ ] **T016** Create client-side Supabase client
  - File: `src/lib/auth/supabase-client.ts`
  - Export: `createClientComponentClient()` function
  - Uses `@supabase/supabase-js` with browser storage
  - Configuration: Read from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **T017** Create server-side Supabase client
  - File: `src/lib/auth/supabase-server.ts`
  - Export: `createServerComponentClient()` and `createRouteHandlerClient()` functions
  - Uses Next.js cookies for session management
  - Configuration: Same as T016 but server-side

- [ ] **T018** Create session validation utilities
  - File: `src/lib/auth/session-manager.ts`
  - Export: `validateSession(supabase)`, `refreshSession(supabase)`, `getUser(supabase)`
  - Implement logic tested in T015
  - Use Supabase Auth API methods

### Auth UI Components [P] (Can run in parallel - different files)
- [ ] **T019** [P] Create sign-in page with OAuth buttons
  - File: `src/app/auth/signin/page.tsx`
  - UI: Display 3 OAuth provider buttons (Google, Microsoft, Facebook)
  - Use `supabase.auth.signInWithOAuth({ provider })` on button click
  - Redirect options: `{ redirectTo: '${window.location.origin}/auth/callback' }`
  - Styling: Tailwind CSS, Radix UI Button components

- [ ] **T020** [P] Create auth error page
  - File: `src/app/auth/error/page.tsx`
  - Display user-friendly error messages based on URL query param `?error=...`
  - Error types: `access_denied`, `server_error`, `oauth_failed`, `invalid_request`
  - Include "Try Again" button → redirect to `/auth/signin`

- [ ] **T021** [P] Create SignInButton component (3 variants)
  - File: `src/components/auth/SignInButton.tsx`
  - Props: `provider: 'google' | 'microsoft' | 'facebook'`
  - Displays provider-specific icon and text
  - Handles OAuth initiation via `supabase.auth.signInWithOAuth`
  - Loading state while redirecting

- [ ] **T022** [P] Create SignOutButton component
  - File: `src/components/auth/SignOutButton.tsx`
  - Calls `supabase.auth.signOut()` on click
  - Redirects to `/auth/signin` after sign-out
  - Shows confirmation dialog (optional enhancement)

- [ ] **T023** [P] Create AuthProvider context wrapper
  - File: `src/components/auth/AuthProvider.tsx`
  - Wraps app with Supabase session state
  - Exports `useAuth()` hook for accessing current user
  - Handles session refresh automatically
  - Provides `user`, `session`, `loading` state

### API Routes (Sequential - depend on utilities from T016-T018)
- [ ] **T024** Create OAuth callback route handler
  - File: `src/app/api/auth/callback/route.ts`
  - Handle GET request with OAuth `code` parameter
  - Exchange code for session using `supabase.auth.exchangeCodeForSession(code)`
  - Set session cookie (handled by Supabase client)
  - Redirect to `/` on success, `/auth/error?error=oauth_failed` on failure

- [ ] **T025** Create sign-out API route
  - File: `src/app/api/auth/signout/route.ts`
  - Handle POST request
  - Call `supabase.auth.signOut()`
  - Clear session cookie
  - Return 200 OK or redirect to `/auth/signin`

### Middleware (Depends on session utilities from T018)
- [ ] **T026** Create auth middleware for protected routes
  - File: `src/middleware.ts`
  - Check for valid session on all routes except `/auth/*` and `/api/auth/*`
  - If no valid session: redirect to `/auth/signin`
  - If valid session: continue to route
  - Use `createServerComponentClient()` from T017
  - Matcher config: `export const config = { matcher: ['/((?!auth|api/auth|_next/static|_next/image|favicon.ico).*)'] }`

### Update Existing Files (If needed)
- [ ] **T027** Update existing Supabase client (if needed)
  - File: `src/lib/database/supabase-client.ts`
  - Verify compatibility with new auth flow
  - Update to use cookies instead of localStorage if necessary
  - **Note**: May not be needed if already using proper client

---

## Phase 3.4: Integration & Deployment

### Vercel Configuration Files
- [ ] **T028** Create vercel.json configuration
  - File: `vercel.json` (repository root)
  - Configuration:
    ```json
    {
      "framework": "nextjs",
      "buildCommand": "npm run build",
      "devCommand": "npm run dev",
      "installCommand": "npm install",
      "headers": [
        {
          "source": "/(.*)",
          "headers": [
            { "key": "X-Frame-Options", "value": "DENY" },
            { "key": "X-Content-Type-Options", "value": "nosniff" },
            { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
          ]
        }
      ],
      "redirects": [
        { "source": "/signin", "destination": "/auth/signin", "permanent": true }
      ]
    }
    ```

- [ ] **T029** Update .env.local.example with OAuth variables
  - File: `.env.local.example` (repository root)
  - Add variables:
    ```
    # Existing
    NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]

    # New for OAuth
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    GOOGLE_CLIENT_SECRET=[your-google-secret]
    MICROSOFT_CLIENT_SECRET=[your-microsoft-secret]
    FACEBOOK_APP_SECRET=[your-facebook-secret]
    ```

### Testing Deployment
- [ ] **T030** Deploy to Vercel preview environment (test branch)
  - Create test branch: `git checkout -b test-oauth-deploy`
  - Push to GitHub: `git push origin test-oauth-deploy`
  - Verify: Vercel creates preview deployment automatically
  - Check deployment logs in Vercel dashboard
  - Expected build time: <5 minutes (per FR-015)

- [ ] **T031** Run quickstart Scenario 5 (preview deployment validation)
  - Navigate to preview URL from Vercel
  - Execute quickstart.md Scenario 5 steps
  - Verify OAuth works in preview environment
  - Verify environment variables loaded correctly
  - Document preview URL for testing

- [ ] **T032** Deploy to Vercel production (merge to main)
  - Merge test branch to main: `git checkout main && git merge test-oauth-deploy`
  - Push to GitHub: `git push origin main`
  - Verify: Vercel deploys to production automatically
  - Monitor deployment in Vercel dashboard
  - Expected build time: <5 minutes

- [ ] **T033** Run quickstart Scenarios 1-4 (production validation)
  - Execute quickstart.md Scenario 1: New user Google OAuth
  - Execute quickstart.md Scenario 2: Account merging
  - Execute quickstart.md Scenario 3: Session expiry
  - Execute quickstart.md Scenario 4: Production deployment verification
  - Document any issues found

---

## Phase 3.5: Polish & Validation

### Error Handling & UX Improvements [P]
- [ ] **T034** [P] Add loading states to OAuth buttons
  - File: `src/components/auth/SignInButton.tsx`
  - Show spinner during OAuth redirect
  - Disable button while loading
  - Add "Signing in..." text

- [ ] **T035** [P] Add error handling to callback route
  - File: `src/app/api/auth/callback/route.ts`
  - Handle network errors gracefully
  - Log errors to console with context
  - Return user-friendly error messages

- [ ] **T036** [P] Add session refresh logic
  - File: `src/components/auth/AuthProvider.tsx`
  - Implement automatic token refresh before expiry
  - Handle refresh failures (prompt re-auth)
  - Use `supabase.auth.onAuthStateChange()` listener

### Documentation & Testing [P]
- [ ] **T037** [P] Update README with deployment instructions
  - File: `README.md`
  - Add "Deployment" section with:
    - OAuth app setup steps (links to T001-T003)
    - Supabase configuration (T004-T005)
    - Vercel setup (T006-T008)
    - Environment variables reference
    - Common troubleshooting issues

- [ ] **T038** Run full E2E test suite validation
  - Execute all Cypress tests: `npm run test:e2e`
  - Verify all tests pass (T009-T014)
  - Check test coverage report
  - Expected: 100% pass rate for OAuth flows

- [ ] **T039** Verify accessibility compliance
  - Run accessibility tests: `npm run test:accessibility`
  - Check WCAG 2.1 AA compliance on auth pages
  - Verify keyboard navigation works
  - Test screen reader compatibility
  - Expected: No critical violations

---

## Dependencies

### Critical Path (Must be sequential)
```
Setup (T001-T008) → Tests (T009-T015) → Utilities (T016-T018) → Implementation (T019-T027) → Deployment (T028-T033) → Polish (T034-T039)
```

### Detailed Dependencies
- **T001-T008** (Setup): No dependencies, but must complete before testing in production
- **T009-T015** (Tests): Can start after understanding requirements, must FAIL initially
- **T016-T018** (Utilities): Blocks T019-T027 (UI and routes depend on utilities)
- **T019-T023** (UI Components): Depend on T016 (client), can run in parallel with each other
- **T024-T025** (API Routes): Depend on T016-T018, sequential (same directory)
- **T026** (Middleware): Depends on T017-T018
- **T027**: May not be needed, check compatibility first
- **T028-T029** (Config): Can run anytime, but needed for T030
- **T030-T033** (Deployment): Sequential, depends on T016-T027 being complete
- **T034-T039** (Polish): Depend on core implementation, can run in parallel

### Blocking Relationships
```
T016,T017,T018 BLOCKS T019,T020,T021,T022,T023
T017,T018 BLOCKS T024,T025,T026
T016-T027 BLOCKS T030
T030 BLOCKS T031
T031 BLOCKS T032
T032 BLOCKS T033
```

---

## Parallel Execution Examples

### Example 1: OAuth Provider Setup (Manual, can coordinate in parallel)
```bash
# Have 3 team members work simultaneously:
Team Member 1: Execute T001 (Google OAuth app)
Team Member 2: Execute T002 (Microsoft Azure app)
Team Member 3: Execute T003 (Facebook app)
# Then one person executes T004 (configure all in Supabase)
```

### Example 2: Test Generation (T009-T014)
```typescript
// Launch all Cypress test generation in parallel:
// Terminal 1:
Task: "Write Cypress test for Google OAuth in cypress/e2e/oauth-google.cy.ts"

// Terminal 2:
Task: "Write Cypress test for Microsoft OAuth in cypress/e2e/oauth-microsoft.cy.ts"

// Terminal 3:
Task: "Write Cypress test for Facebook OAuth in cypress/e2e/oauth-facebook.cy.ts"

// Terminal 4:
Task: "Write Cypress test for account merging in cypress/e2e/account-merging.cy.ts"

// Terminal 5:
Task: "Write Cypress test for session management in cypress/e2e/session-management.cy.ts"

// Terminal 6:
Task: "Write Cypress test for protected routes in cypress/e2e/protected-routes.cy.ts"

// Terminal 7:
Task: "Write Jest test for session validation in __tests__/auth/session-validation.test.ts"
```

### Example 3: UI Components (T019-T023)
```typescript
// After T016-T018 complete, launch UI tasks in parallel:
// All independent files, no conflicts:
Task: "Create sign-in page in src/app/auth/signin/page.tsx"
Task: "Create error page in src/app/auth/error/page.tsx"
Task: "Create SignInButton component in src/components/auth/SignInButton.tsx"
Task: "Create SignOutButton component in src/components/auth/SignOutButton.tsx"
Task: "Create AuthProvider in src/components/auth/AuthProvider.tsx"
```

### Example 4: Polish Tasks (T034-T039)
```typescript
// After deployment complete, polish in parallel:
Task: "Add loading states to SignInButton.tsx"
Task: "Add error handling to callback route"
Task: "Add session refresh logic to AuthProvider"
Task: "Update README with deployment instructions"
// Then run validation tasks T038-T039 sequentially
```

---

## Notes

### Execution Guidelines
- [P] tasks = different files, no dependencies, safe to run in parallel
- [Manual] tasks = require external services (Google Cloud Console, Vercel Dashboard, etc.)
- Verify tests fail (T009-T015) before implementing core functionality
- Commit after each task for clean git history
- Run `npm run lint` and `npm run type-check` after file changes

### Testing Strategy
- Write tests FIRST (T009-T015)
- Tests must FAIL initially
- Implementation tasks (T016-T027) make tests pass
- Validate with quickstart scenarios (T031, T033)
- Run full suite before considering feature complete (T038-T039)

### Common Pitfalls to Avoid
- ❌ Implementing before tests are written
- ❌ Marking same-file tasks as [P]
- ❌ Forgetting to configure OAuth redirect URIs
- ❌ Using wrong environment variables in preview vs production
- ❌ Skipping manual setup tasks (T001-T008)

### Constitutional Compliance
- ✅ Principle II: Context7 used for Supabase & Vercel documentation research
- ✅ Principle III: TDD enforced (T009-T015 before T016-T027)
- ✅ Principle IV: TypeScript strict mode (all files *.ts/*.tsx)
- ✅ Principle VI: Cypress E2E tests for all OAuth workflows
- ✅ Production Standards: HTTPS via Vercel, RLS via Supabase, 24-hour sessions

---

## Task Generation Rules Applied

1. **From Contracts** (auth-api.yaml, vercel-config.yaml):
   - Each endpoint → API route task (T024-T025)
   - Each OAuth flow → Cypress test (T009-T011)
   - Deployment config → Vercel setup tasks (T006-T008, T028-T029)

2. **From Data Model** (data-model.md):
   - No new entities created (Supabase Auth managed)
   - Session management → utility tasks (T016-T018)

3. **From User Stories** (quickstart.md):
   - Each scenario → integration test (T009-T014)
   - Deployment scenarios → validation tasks (T030-T033)

4. **Ordering Applied**:
   - Setup → Tests → Utilities → UI → API → Middleware → Deployment → Polish
   - Dependencies enforced via blocking relationships

---

## Validation Checklist

- [x] All contracts have corresponding tests (auth-api.yaml → T009-T015)
- [x] All tests come before implementation (T009-T015 before T016-T027)
- [x] Parallel tasks truly independent (checked file paths)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD workflow enforced (tests must fail first)
- [x] Quickstart scenarios mapped to validation tasks

---

**Total Tasks**: 39 (7 manual setup + 7 tests + 12 implementation + 6 deployment + 6 polish + 1 optional)

**Estimated Completion Time**:
- Manual setup: 2-3 hours (T001-T008)
- Test generation: 4-6 hours (T009-T015)
- Implementation: 8-12 hours (T016-T027)
- Deployment: 2-3 hours (T028-T033)
- Polish: 3-4 hours (T034-T039)
- **Total**: 19-28 hours (2-4 days for 1 developer)

**Ready for execution**. Proceed with T001 or execute `/implement` command.
