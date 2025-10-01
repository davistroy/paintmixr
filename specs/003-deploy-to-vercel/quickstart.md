# Quickstart: Deploy to Vercel with OAuth Authentication

**Feature**: 003-deploy-to-vercel
**Date**: 2025-10-01
**Purpose**: Integration test scenarios to validate OAuth and deployment functionality

## Prerequisites

- Supabase project configured with OAuth providers
- Vercel project connected to GitHub repository
- OAuth apps created (Google, Microsoft, Facebook)
- Environment variables configured in Vercel

## Scenario 1: New User Sign-In with Google

**Objective**: Verify Google OAuth flow creates user and establishes session

**Steps**:
1. Navigate to application URL (production or preview)
2. Verify redirect to `/auth/signin` (unauthenticated)
3. Click "Sign in with Google" button
4. **Expected**: Redirect to Google OAuth consent screen
5. Sign in with Google account (email: test@example.com)
6. Grant requested permissions (email, profile)
7. **Expected**: Redirect back to app at `/auth/callback`
8. **Expected**: Callback processes successfully
9. **Expected**: Final redirect to `/` with authenticated session
10. Verify user menu/profile displays
11. Verify paint collection is accessible
12. Check browser cookie: `sb-access-token` present (HTTP-only)

**Success Criteria**:
- ✅ User created in `auth.users` (verify in Supabase Dashboard)
- ✅ Identity created in `auth.identities` (provider: 'google')
- ✅ Session created in `auth.sessions` (24-hour expiry)
- ✅ User can access protected features
- ✅ OAuth flow completes in <5 seconds

**Rollback**: Delete test user from Supabase Dashboard

---

## Scenario 2: Account Merging - Same Email, Different Provider

**Objective**: Verify account merging when user signs in with Microsoft using same email

**Prerequisites**: User already signed in with Google (from Scenario 1)

**Steps**:
1. Click "Sign Out" button
2. **Expected**: Redirect to `/auth/signin`, session cleared
3. Click "Sign in with Microsoft" button
4. **Expected**: Redirect to Microsoft OAuth consent screen
5. Sign in with Microsoft account **using same email**: test@example.com
6. Grant requested permissions
7. **Expected**: Redirect back to app
8. **Expected**: Access same paint collection as before (not empty)
9. Navigate to paint collection
10. **Expected**: All paints from Google sign-in are visible

**Success Criteria**:
- ✅ Same `user_id` in `auth.users` (not a new user)
- ✅ Two identities linked: google + azure (Microsoft)
- ✅ Paint collections preserved across providers
- ✅ `auth.identities` shows 2 rows with same `user_id`

**Verification Query** (Supabase SQL Editor):
```sql
SELECT u.id, u.email, i.provider
FROM auth.users u
JOIN auth.identities i ON i.user_id = u.id
WHERE u.email = 'test@example.com';
```

**Expected Result**:
```
id                                   | email              | provider
-------------------------------------|--------------------|---------
uuid-1234-5678                       | test@example.com   | google
uuid-1234-5678                       | test@example.com   | azure
```

---

## Scenario 3: Session Expiry and Re-authentication

**Objective**: Verify 24-hour session expiry prompts for re-authentication

**Note**: This scenario requires time manipulation or waiting 24 hours

**Steps (Accelerated)**:
1. Sign in with any OAuth provider
2. Note session creation time
3. **Manual Step**: Update `auth.sessions.not_after` to be in the past (via Supabase Dashboard SQL Editor):
   ```sql
   UPDATE auth.sessions
   SET not_after = NOW() - INTERVAL '1 hour'
   WHERE user_id = '[test-user-id]';
   ```
4. Refresh application page
5. Attempt to access protected feature (e.g., save a paint)
6. **Expected**: Redirect to `/auth/signin` with message "Session expired"
7. Sign in again with same provider
8. **Expected**: New session created, full access restored

**Success Criteria**:
- ✅ Expired session does not grant access
- ✅ User prompted to re-authenticate
- ✅ Unsaved work warning displayed (if applicable)
- ✅ New 24-hour session created after re-auth

---

## Scenario 4: Production Deployment from Main Branch

**Objective**: Verify GitHub push to main triggers production deployment

**Steps**:
1. Make a small code change (e.g., update README.md)
2. Commit and push to `main` branch:
   ```bash
   git add README.md
   git commit -m "Test deployment workflow"
   git push origin main
   ```
3. **Expected**: GitHub webhook triggers Vercel deployment
4. Monitor Vercel dashboard for deployment progress
5. **Expected**: Build completes in <5 minutes
6. Navigate to production URL
7. **Expected**: Changes are live
8. Verify OAuth still works (sign in with Google)
9. Check deployment logs (accessible to developers only)

**Success Criteria**:
- ✅ Deployment triggered automatically on push
- ✅ Build time <300 seconds (5 minutes)
- ✅ Zero downtime (previous version serves until new version ready)
- ✅ OAuth callbacks still function correctly
- ✅ Environment variables properly loaded

**Verification**:
```bash
# Check deployment status
vercel ls --prod

# View deployment logs (requires Vercel CLI + auth)
vercel logs [deployment-url]
```

---

## Scenario 5: Preview Deployment for Feature Branch

**Objective**: Verify feature branch push creates preview deployment

**Steps**:
1. Create new feature branch:
   ```bash
   git checkout -b test-preview-deploy
   ```
2. Make a visible change (e.g., add text to home page)
3. Commit and push:
   ```bash
   git add .
   git commit -m "Test preview deployment"
   git push origin test-preview-deploy
   ```
4. **Expected**: Vercel creates preview deployment
5. Check GitHub PR (if opened) for Vercel comment with preview URL
6. Navigate to preview URL
7. **Expected**: Changes visible in preview
8. Test OAuth with preview URL (may require preview OAuth apps)
9. Verify preview uses correct environment variables

**Success Criteria**:
- ✅ Preview deployment created automatically
- ✅ Unique URL generated: `https://paintmixr-[hash].vercel.app`
- ✅ Preview deployment isolated from production
- ✅ OAuth works (if preview OAuth apps configured)
- ✅ Vercel comments on PR with preview URL (if PR exists)

**Cleanup**:
```bash
git checkout main
git branch -D test-preview-deploy
git push origin --delete test-preview-deploy
```

---

## Scenario 6: Failed Build Rollback

**Objective**: Verify failed deployment keeps previous version live

**Steps**:
1. Introduce a deliberate build error (e.g., invalid TypeScript):
   ```typescript
   // src/app/page.tsx
   export default function Home() {
     const broken: number = "not a number";  // Type error
     return <div>Test</div>
   }
   ```
2. Commit and push to `main`:
   ```bash
   git add src/app/page.tsx
   git commit -m "Introduce build error"
   git push origin main
   ```
3. **Expected**: Vercel build fails
4. Navigate to production URL
5. **Expected**: Previous working version still live
6. **Expected**: GitHub commit status shows failure
7. Check Vercel dashboard for build logs
8. **Expected**: Error message clearly indicates type error

**Success Criteria**:
- ✅ Build fails (TypeScript strict mode catches error)
- ✅ Previous version remains accessible
- ✅ No downtime for end users
- ✅ Deployment logs show error details
- ✅ GitHub commit status = failure

**Cleanup**:
```bash
git revert HEAD
git push origin main
```

---

## Scenario 7: OAuth Provider Outage Handling

**Objective**: Verify graceful degradation when OAuth provider is unavailable

**Note**: Difficult to test without actually disrupting provider. Use mock/network throttle.

**Steps (Simulated)**:
1. Use browser DevTools → Network → Throttling → Offline
2. Navigate to `/auth/signin`
3. Click "Sign in with Google"
4. **Expected**: Browser shows network error OR timeout
5. Return to online mode
6. Click "Sign in with Google" again
7. **Expected**: OAuth flow completes successfully

**Alternative (Code-level test)**:
```typescript
// Cypress test with network stub
cy.intercept('GET', '**/authorize?provider=google', {
  forceNetworkError: true
})
```

**Success Criteria**:
- ✅ Application doesn't crash on provider outage
- ✅ User-friendly error message displayed
- ✅ Retry option available
- ✅ Other providers still accessible (fallback)

---

## Scenario 8: Concurrent Users (Load Test)

**Objective**: Verify application handles 10 concurrent users (NFR-001)

**Tools**: Artillery, k6, or manual multi-browser test

**Steps (Manual)**:
1. Open 10 browser windows/tabs (or use 10 devices)
2. In each window:
   - Navigate to production URL
   - Sign in with OAuth (can use same or different accounts)
   - Browse paint collection
   - Perform color match operation
3. Monitor Vercel analytics for concurrent requests
4. **Expected**: All users experience responsive UI (<500ms API responses)

**Success Criteria**:
- ✅ 10 concurrent OAuth sign-ins complete successfully
- ✅ No 429 (rate limit) or 503 (overload) errors
- ✅ Average response time <500ms
- ✅ All paint collections load correctly
- ✅ No session conflicts between users

**Automated Test** (Artillery example):
```yaml
config:
  target: 'https://paintmixr.vercel.app'
  phases:
    - duration: 60
      arrivalRate: 10  # 10 users/sec
scenarios:
  - name: "OAuth and browse"
    flow:
      - get:
          url: "/"
      - get:
          url: "/auth/signin"
```

---

## Environment-Specific Testing

### Production
- URL: `https://paintmixr.vercel.app`
- OAuth Callback: `https://paintmixr.vercel.app/auth/callback`
- Environment: Production env vars
- Database: Production Supabase

### Preview
- URL: `https://paintmixr-[git-hash].vercel.app`
- OAuth Callback: `https://paintmixr-[git-hash].vercel.app/auth/callback`
- Environment: Preview env vars (may differ from production)
- Database: Same as production (shared Supabase)

### Local Development
- URL: `http://localhost:3000`
- OAuth Callback: `http://localhost:3000/auth/callback`
- Environment: `.env.local` file
- Database: Production Supabase (or local Supabase instance)

---

## Common Issues & Resolutions

### OAuth Redirect Mismatch
**Symptom**: "redirect_uri_mismatch" error
**Cause**: OAuth callback URL not registered in provider
**Fix**: Add callback URL to OAuth app configuration

### Session Not Persisting
**Symptom**: User redirected to sign-in after refresh
**Cause**: Cookie not being set (SameSite/Secure issues)
**Fix**: Verify HTTPS in production, check cookie settings

### Build Timeout
**Symptom**: Deployment exceeds 5 minutes
**Cause**: Slow npm install or large dependencies
**Fix**: Optimize dependencies, use Vercel build cache

### Environment Variables Not Loading
**Symptom**: Undefined `process.env.NEXT_PUBLIC_*`
**Cause**: Variables not set in Vercel dashboard
**Fix**: Add variables to correct environment (production/preview)

---

## Post-Deployment Checklist

After completing all scenarios:

- [ ] All 3 OAuth providers functional (Google, Microsoft, Facebook)
- [ ] Account merging works for matching emails
- [ ] Sessions expire after 24 hours
- [ ] Production deploys on `main` push in <5 minutes
- [ ] Preview deploys on feature branch push
- [ ] Failed builds don't affect live site
- [ ] 10 concurrent users supported
- [ ] All paint collections accessible after OAuth
- [ ] Deployment logs accessible to developers
- [ ] HTTPS enforced (redirects from HTTP)
- [ ] Session cookies are HTTP-only and Secure

---

## Success Metrics

**Performance**:
- OAuth sign-in: <5 seconds end-to-end
- Deployment time: <300 seconds (5 minutes)
- API response time: <500ms
- Page load time: <2 seconds

**Reliability**:
- OAuth success rate: >99%
- Deployment success rate: >95%
- Session persistence: 24 hours
- Zero downtime during deployments

**Security**:
- HTTPS enforced: 100%
- HTTP-only cookies: Yes
- PKCE enabled: Yes (via Supabase Auth)
- State validation: Yes (via Supabase Auth)

---

## Rollback Procedure

If issues discovered post-deployment:

1. Navigate to Vercel dashboard
2. Select project → Deployments
3. Find last known good deployment
4. Click "..." → "Promote to Production"
5. Confirm promotion
6. **Expected**: Instant rollback (<30 seconds)
7. Investigate issue in preview environment
8. Fix and redeploy

---

**End of Quickstart Scenarios**

All scenarios validated → Feature ready for production
