# Setup Guide: Deploy to Vercel with OAuth Authentication

**Feature**: 003-deploy-to-vercel
**Status**: Manual configuration required before implementation
**Estimated Time**: 2-3 hours

## Prerequisites

- Access to Google Cloud Console
- Access to Microsoft Azure Portal
- Access to Facebook Developers
- Access to Supabase Dashboard (project admin)
- Access to Vercel account
- GitHub repository access (paintmixr)

---

## Task T001: Create Google OAuth 2.0 Client ID

**Platform**: Google Cloud Console
**URL**: https://console.cloud.google.com/apis/credentials

### Steps:
1. Navigate to Google Cloud Console
2. Select or create a project (e.g., "PaintMixr")
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure consent screen if prompted:
   - User Type: External
   - App name: PaintMixr
   - Support email: [your-email]
   - Scopes: email, profile (default)
6. Application type: **Web application**
7. Name: "PaintMixr Production"
8. Authorized redirect URIs:
   - `https://[your-supabase-project-ref].supabase.co/auth/v1/callback`
   - (Add more for preview/dev environments if needed)
9. Click **Create**
10. **Save** the Client ID and Client Secret

### Output:
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: [copy from console]
- `GOOGLE_CLIENT_SECRET`: [copy from console - keep secret]

---

## Task T002: Create Microsoft Azure AD App Registration

**Platform**: Microsoft Azure Portal
**URL**: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps

### Steps:
1. Navigate to Azure Portal
2. Go to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Name: "PaintMixr"
5. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
6. Redirect URI:
   - Platform: **Web**
   - URI: `https://[your-supabase-project-ref].supabase.co/auth/v1/callback`
7. Click **Register**
8. Note the **Application (client) ID**
9. Go to **Certificates & secrets** → **New client secret**
10. Description: "PaintMixr Production"
11. Expires: 24 months (or custom)
12. Click **Add**
13. **Save** the secret value immediately (it won't be shown again)

### Output:
- `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`: [Application (client) ID]
- `MICROSOFT_CLIENT_SECRET`: [Client secret value]

---

## Task T003: Create Facebook App for OAuth

**Platform**: Facebook Developers
**URL**: https://developers.facebook.com/apps

### Steps:
1. Navigate to Facebook Developers
2. Click **Create App**
3. Use case: **Authenticate and request data from users with Facebook Login**
4. App type: **Consumer**
5. App name: "PaintMixr"
6. Contact email: [your-email]
7. Click **Create App**
8. Go to **Settings** → **Basic**
9. Note the **App ID** and **App Secret**
10. Go to **Facebook Login** → **Settings**
11. Valid OAuth Redirect URIs:
    - `https://[your-supabase-project-ref].supabase.co/auth/v1/callback`
12. Click **Save Changes**
13. Set app to **Live** mode (top toggle)

### Output:
- `NEXT_PUBLIC_FACEBOOK_APP_ID`: [App ID]
- `FACEBOOK_APP_SECRET`: [App Secret]

---

## Task T004: Enable OAuth Providers in Supabase Dashboard

**Platform**: Supabase Dashboard
**URL**: https://app.supabase.com/project/[your-project]/auth/providers

### Steps:

### Google Provider:
1. Navigate to **Authentication** → **Providers**
2. Find **Google** in the list
3. Toggle **Enable Sign in with Google**
4. Paste `NEXT_PUBLIC_GOOGLE_CLIENT_ID` into **Client ID**
5. Paste `GOOGLE_CLIENT_SECRET` into **Client Secret**
6. Click **Save**

### Microsoft (Azure) Provider:
1. Find **Azure** in the provider list
2. Toggle **Enable Sign in with Azure**
3. Paste `NEXT_PUBLIC_MICROSOFT_CLIENT_ID` into **Client ID**
4. Paste `MICROSOFT_CLIENT_SECRET` into **Client Secret**
5. Azure Tenant: `common` (for personal + work accounts)
6. Click **Save**

### Facebook Provider:
1. Find **Facebook** in the provider list
2. Toggle **Enable Sign in with Facebook**
3. Paste `NEXT_PUBLIC_FACEBOOK_APP_ID` into **Client ID**
4. Paste `FACEBOOK_APP_SECRET` into **Client Secret**
5. Click **Save**

### Verification:
- All three providers should show green "Enabled" status
- Test URLs should be generated automatically

---

## Task T005: Configure JWT Expiry to 24 Hours

**Platform**: Supabase Dashboard
**URL**: https://app.supabase.com/project/[your-project]/auth/settings

### Steps:
1. Navigate to **Authentication** → **Settings**
2. Scroll to **Security** section
3. Find **JWT expiry (seconds)**
4. Change value to: `86400` (24 hours)
5. Click **Save**
6. Verify **Refresh token expiry** is longer (default: 2,592,000 seconds = 30 days)

### Output:
- JWT expiry: 86400 seconds (24 hours) ✓
- Refresh token expiry: 2,592,000 seconds (30 days) ✓

---

## Task T006: Connect GitHub Repository to Vercel

**Platform**: Vercel Dashboard
**URL**: https://vercel.com/new

### Steps:
1. Log in to Vercel
2. Click **Add New** → **Project**
3. Select **Import Git Repository**
4. If not connected, click **Connect GitHub Account**
5. Authorize Vercel to access GitHub
6. Search for `paintmixr` repository
7. Click **Import**

### Project Configuration:
- Framework Preset: **Next.js**
- Root Directory: `./` (leave default)
- Build Command: `npm run build` (auto-detected)
- Output Directory: `.next` (auto-detected)
- Install Command: `npm install` (auto-detected)
- Node Version: 22.x

### Do NOT deploy yet:
- Click **Skip** or cancel - we need to add environment variables first (T008)

---

## Task T007: Configure Production Branch and Preview Settings

**Platform**: Vercel Dashboard
**URL**: https://vercel.com/[your-account]/paintmixr/settings/git

### Steps:
1. Go to project **Settings** → **Git**
2. **Production Branch**: Set to `main`
3. **Preview Deployments**: Enable for all branches
4. **Automatic Deployments**:
   - Enable for production branch: ✓
   - Enable for preview branches: ✓
5. **Comment on Pull Requests**: Enable ✓
6. **Deployment Protection**: None (for now)
7. Click **Save**

### Verification:
- Production branch: `main` ✓
- Preview deployments: All branches ✓
- Auto-deploy on push: Enabled ✓

---

## Task T008: Add Environment Variables to Vercel Dashboard

**Platform**: Vercel Dashboard
**URL**: https://vercel.com/[your-account]/paintmixr/settings/environment-variables

### Steps:

Add each variable below with appropriate environment targets:

### Supabase Variables (Public):
1. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: `https://[your-project-ref].supabase.co`
   - Targets: ✓ Production ✓ Preview ✓ Development
   - Type: Plain Text

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: [your-anon-key from Supabase Dashboard]
   - Targets: ✓ Production ✓ Preview ✓ Development
   - Type: Plain Text

### Google OAuth (Public + Secret):
3. **NEXT_PUBLIC_GOOGLE_CLIENT_ID**
   - Value: [from T001]
   - Targets: ✓ Production ✓ Preview ✓ Development
   - Type: Plain Text

4. **GOOGLE_CLIENT_SECRET**
   - Value: [from T001]
   - Targets: ✓ Production ✓ Preview
   - Type: **Encrypted** (Vercel marks as sensitive)

### Microsoft OAuth (Public + Secret):
5. **NEXT_PUBLIC_MICROSOFT_CLIENT_ID**
   - Value: [from T002]
   - Targets: ✓ Production ✓ Preview ✓ Development
   - Type: Plain Text

6. **MICROSOFT_CLIENT_SECRET**
   - Value: [from T002]
   - Targets: ✓ Production ✓ Preview
   - Type: **Encrypted**

### Facebook OAuth (Public + Secret):
7. **NEXT_PUBLIC_FACEBOOK_APP_ID**
   - Value: [from T003]
   - Targets: ✓ Production ✓ Preview ✓ Development
   - Type: Plain Text

8. **FACEBOOK_APP_SECRET**
   - Value: [from T003]
   - Targets: ✓ Production ✓ Preview
   - Type: **Encrypted**

### App URL (for OAuth redirects):
9. **NEXT_PUBLIC_APP_URL**
   - Production Value: `https://[your-vercel-domain].vercel.app`
   - Preview Value: `https://{{VERCEL_URL}}`
   - Development Value: `http://localhost:3000`
   - Targets: Configure separately per environment
   - Type: Plain Text

### Verification Checklist:
- [ ] 9 environment variables added
- [ ] Public variables use `NEXT_PUBLIC_` prefix
- [ ] Secrets marked as Encrypted
- [ ] All variables target appropriate environments
- [ ] Production URL matches Vercel domain

---

## Post-Setup Verification

After completing T001-T008, verify the setup:

### Supabase Dashboard:
- [ ] 3 OAuth providers enabled (Google, Microsoft, Facebook)
- [ ] JWT expiry set to 86400 seconds (24 hours)
- [ ] Callback URLs match across all providers

### Vercel Dashboard:
- [ ] GitHub repository connected
- [ ] Production branch set to `main`
- [ ] 9 environment variables configured
- [ ] Preview deployments enabled

### OAuth Provider Consoles:
- [ ] Google: Redirect URI includes Supabase callback
- [ ] Microsoft: Redirect URI includes Supabase callback
- [ ] Facebook: OAuth redirect URI configured, app in Live mode

---

## Troubleshooting

### Issue: OAuth redirect_uri_mismatch
**Cause**: Callback URL not registered in OAuth provider
**Fix**: Verify callback URL matches exactly: `https://[project-ref].supabase.co/auth/v1/callback`

### Issue: Vercel build fails with env var error
**Cause**: Environment variables not set or wrong target
**Fix**: Check Vercel Dashboard → Environment Variables → Verify targets

### Issue: Supabase OAuth not working
**Cause**: Provider credentials incorrect or provider not enabled
**Fix**: Re-check Client ID/Secret in Supabase Dashboard → Providers

---

## Next Steps

Once all manual setup tasks (T001-T008) are complete:

1. Update `.env.local.example` with new variables (T028)
2. Proceed to Phase 3.2: Tests First (T009-T015)
3. Begin implementation (T016+)

**Estimated setup time**: 2-3 hours
**Prerequisites status**: Ready for implementation after setup complete

---

## Reference Links

- Google Cloud Console: https://console.cloud.google.com
- Microsoft Azure Portal: https://portal.azure.com
- Facebook Developers: https://developers.facebook.com
- Supabase Dashboard: https://app.supabase.com
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Vercel Deployment Docs: https://vercel.com/docs/deployments

---

**Setup Guide Complete**
Proceed to implementation once all manual tasks are verified.
