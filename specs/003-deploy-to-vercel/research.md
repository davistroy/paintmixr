# Research: Deploy to Vercel with OAuth Authentication

**Feature**: 003-deploy-to-vercel
**Date**: 2025-10-01
**Status**: Complete

## Research Questions Resolved

### 1. OAuth Security (FR-008): PKCE, State Validation, Security Best Practices

**Question**: What OAuth security requirements does Supabase Auth implement (PKCE, state validation)?

**Decision**: Use Supabase Auth built-in security features - PKCE and state validation are handled automatically

**Rationale**:
- Supabase Auth implements OAuth 2.0 with PKCE (Proof Key for Code Exchange) by default for all OAuth providers
- State parameter validation is built-in to prevent CSRF attacks
- OAuth flow: `/authorize` → Provider → `/callback` with automatic token exchange
- No manual PKCE or state implementation needed - handled by Supabase Auth server
- Tokens are automatically validated and sessions created securely

**Implementation Approach**:
```typescript
// Client-side: Supabase automatically handles PKCE
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google', // or 'azure' (Microsoft), 'facebook'
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
    scopes: 'email' // default, can add more
  }
})
```

**Security Features Confirmed**:
- ✅ PKCE enabled by default (RFC 7636)
- ✅ State parameter for CSRF protection
- ✅ Nonce support for additional security
- ✅ Token refresh handling
- ✅ Secure session storage

**Alternatives Considered**:
- Manual OAuth implementation: Rejected - reinventing the wheel, higher security risk
- NextAuth.js: Rejected - Supabase Auth already integrated, avoid dependency conflicts

**Sources**:
- Supabase Auth GitHub: OAuth provider setup and callback handling
- Supabase Auth API: `/authorize` and `/callback` endpoints
- OAuth 2.0 RFC 7636 (PKCE specification)

---

### 2. Environment Variables (FR-012): Vercel Configuration Requirements

**Question**: Which environment variables beyond existing .env.local are needed for Vercel deployment?

**Decision**: Use Vercel environment variables for OAuth secrets and Supabase credentials, with environment-specific targeting

**Required Environment Variables**:

**Supabase Credentials** (already in .env.local):
```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
```

**OAuth Provider Secrets** (NEW - add to Vercel):
```env
# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=[from Google Cloud Console]
GOOGLE_CLIENT_SECRET=[secret - encrypted in Vercel]

# Microsoft OAuth
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=[from Azure Portal]
MICROSOFT_CLIENT_SECRET=[secret - encrypted in Vercel]

# Facebook OAuth
NEXT_PUBLIC_FACEBOOK_APP_ID=[from Facebook Developers]
FACEBOOK_APP_SECRET=[secret - encrypted in Vercel]
```

**Vercel System Variables** (auto-populated):
```env
VERCEL_URL=[deployment-url].vercel.app
VERCEL_ENV=production|preview|development
VERCEL_GIT_COMMIT_SHA=[commit-hash]
VERCEL_GIT_COMMIT_REF=[branch-name]
```

**Rationale**:
- Public variables (`NEXT_PUBLIC_*`) exposed to browser for OAuth initiation
- Secret variables (without prefix) encrypted by Vercel, server-side only
- Vercel system variables enable deployment-aware behavior
- Environment targeting (production/preview/development) for different OAuth callback URLs

**Environment Targeting Strategy**:
- **Production**: Real OAuth app credentials
- **Preview**: Same as production OR separate preview OAuth apps
- **Development**: Local OAuth apps or mock providers

**Configuration in Vercel Dashboard**:
1. Project Settings → Environment Variables
2. Add each variable with appropriate target (Production, Preview, Development)
3. Mark secrets as "Encrypted" type
4. Configure OAuth callback URLs in each provider:
   - Production: `https://[domain].com/auth/callback`
   - Preview: `https://[project]-[hash].vercel.app/auth/callback`

**Alternatives Considered**:
- Storing secrets in code: Rejected - security risk
- Using .env.local for all environments: Rejected - not deployed to Vercel
- Manual secret injection via CI/CD: Rejected - Vercel handles this natively

**Sources**:
- Vercel Environment Variables documentation
- Vercel Framework Environment Variables (Next.js specific)
- Vercel Project Management API examples
- Supabase Auth external provider configuration

---

### 3. Supabase OAuth Provider Configuration

**Question**: How to configure Google, Microsoft, and Facebook OAuth in Supabase?

**Decision**: Configure each provider in Supabase Dashboard with Vercel callback URLs

**Configuration Steps per Provider**:

**Google (via Google Cloud Console)**:
1. Create OAuth 2.0 Client ID
2. Add authorized redirect URI: `https://[project-ref].supabase.co/auth/v1/callback`
3. Configure in Supabase Dashboard → Authentication → Providers → Google
4. Enable provider, add Client ID and Secret
5. Additional scopes: `email`, `profile` (default)

**Microsoft (via Azure Portal)**:
1. Register application in Azure AD
2. Add redirect URI: `https://[project-ref].supabase.co/auth/v1/callback`
3. Configure in Supabase Dashboard → Authentication → Providers → Azure
4. Enable provider, add Application (client) ID and Secret
5. Additional scopes: `email`, `profile`, `openid`

**Facebook (via Facebook Developers)**:
1. Create Facebook App
2. Add OAuth redirect URI: `https://[project-ref].supabase.co/auth/v1/callback`
3. Configure in Supabase Dashboard → Authentication → Providers → Facebook
4. Enable provider, add App ID and App Secret
5. Request email permission

**Rationale**:
- Supabase acts as OAuth proxy - single callback URL per provider
- Centralized provider management in Supabase Dashboard
- Automatic token refresh handled by Supabase
- No need to manage OAuth flows directly in application code

---

### 4. Account Merging by Email

**Question**: How does Supabase handle multiple OAuth providers for the same email address?

**Decision**: Supabase Auth automatically links identities when email matches

**Behavior**:
- User signs in with Google (email: user@example.com)
- User later signs in with Microsoft (same email: user@example.com)
- Supabase Auth links both providers to same user account
- User can sign in with either provider and access same data
- Tracked in `auth.identities` table (Supabase managed)

**Implementation**:
```typescript
// No special code needed - automatic in Supabase Auth
// User table has single user_id
// auth.identities tracks multiple providers linked to that user_id
```

**Requirements**:
- Email must be verified by OAuth provider
- Email must match exactly (case-insensitive)
- Users cannot manually link/unlink providers (Supabase handles this)

---

### 5. Session Duration Configuration

**Question**: How to configure 24-hour session duration in Supabase?

**Decision**: Configure JWT expiry in Supabase project settings

**Configuration**:
1. Supabase Dashboard → Project Settings → Auth
2. JWT Expiry: Set to 86400 seconds (24 hours)
3. Refresh Token Rotation: Enabled
4. Auto Refresh Token: Enabled

**Implementation**:
```typescript
// Supabase client automatically refreshes tokens before expiry
const supabase = createClientComponentClient()

// Session valid for 24 hours
// Automatically refreshes if user is active
// Prompts for re-auth if session fully expires
```

**Rationale**:
- 24 hours balances security (from clarification) with user convenience
- Auto-refresh prevents disruptive logouts during active use
- Explicit re-auth required after 24 hours of inactivity

---

### 6. Vercel Deployment Configuration

**Question**: How to set up GitHub + Vercel integration for continuous deployment?

**Decision**: Use Vercel GitHub integration with automatic deployments

**Setup Steps**:
1. Connect GitHub account to Vercel
2. Import repository (paintmixr)
3. Configure project:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
4. Add environment variables (see #2 above)
5. Configure deployment branches:
   - Production: `main` branch
   - Preview: All other branches and PRs

**Deployment Behavior**:
- Push to `main` → Production deployment (<5 min)
- Push to feature branch → Preview deployment with unique URL
- Open PR → Preview deployment + comment with URL
- Failed build → Previous version stays live

**Rationale**:
- Native GitHub integration - no custom CI/CD needed
- Automatic preview deployments for all branches
- Zero-downtime deployments (old version serves until new version ready)
- Meets <5 minute deployment requirement

**Alternatives Considered**:
- Manual deployment via Vercel CLI: Rejected - not continuous
- GitHub Actions + Vercel CLI: Rejected - redundant with native integration
- Other platforms (Netlify, AWS): Rejected - Vercel specified in requirements

---

### 7. Testing OAuth Flows with Cypress

**Question**: How to test OAuth redirects in Cypress E2E tests?

**Decision**: Use Cypress with test OAuth apps and intercept strategy

**Approach**:
1. Create separate OAuth apps for testing (Google/Microsoft/Facebook)
2. Configure test callback URLs
3. Use Cypress intercepts to mock OAuth responses in CI
4. Real OAuth flow for local/manual testing

**Implementation Pattern**:
```typescript
// cypress/e2e/oauth-google.cy.ts
describe('Google OAuth', () => {
  it('signs in with Google', () => {
    cy.visit('/auth/signin')
    cy.get('[data-testid="signin-google"]').click()
    // Cypress navigates through real OAuth flow
    // OR intercepts and mocks if in CI environment
    cy.url().should('include', '/')
    cy.get('[data-testid="user-menu"]').should('be.visible')
  })
})
```

**Rationale**:
- Real OAuth testing in local development
- Mocked OAuth in CI to avoid external dependencies
- Separate test OAuth apps prevent production data contamination

---

## Technology Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| OAuth Security | Supabase Auth (PKCE + state built-in) | Industry-standard, automatic, no custom implementation needed |
| Environment Variables | Vercel Dashboard (encrypted secrets) | Secure, environment-specific, native integration |
| OAuth Configuration | Supabase Dashboard (3 providers) | Centralized, automatic token refresh, managed proxy |
| Account Merging | Automatic by email (Supabase Auth) | Seamless UX, no manual linking required |
| Session Duration | 24 hours (JWT expiry setting) | Balanced security/convenience per clarification |
| Deployment | Vercel GitHub integration | Continuous deployment, preview URLs, <5 min deploys |
| Testing Strategy | Cypress E2E with real/mock OAuth | Real testing locally, mocked in CI |

---

## Dependencies Confirmed

**NPM Packages** (no additional installs needed):
- `@supabase/supabase-js@2.50.0` ✓ (already installed)
- `@supabase/auth-helpers-nextjs` - Consider adding for server-side helpers
- `next@14.2.33` ✓ (already installed)
- `cypress@13.15.2` ✓ (already installed)

**External Services**:
- Supabase project (existing) ✓
- Vercel account (to be set up)
- Google Cloud Console (OAuth app creation)
- Microsoft Azure Portal (OAuth app creation)
- Facebook Developers (OAuth app creation)

**GitHub Integration**:
- Repository: paintmixr (exists) ✓
- Vercel GitHub App (to be installed)

---

## Next Steps

Phase 0 complete. Proceed to Phase 1:
1. Create `data-model.md` - Entity definitions
2. Create `contracts/` - API specifications
3. Create `quickstart.md` - Integration test scenarios
4. Update `CLAUDE.md` - Agent context with OAuth patterns

All clarifications resolved. Ready for design phase.
