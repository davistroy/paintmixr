# Deployment Guide: PaintMixr to Vercel with OAuth

This guide covers deploying PaintMixr to Vercel with full OAuth authentication (Google, Microsoft, Facebook).

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Vercel account ([sign up free](https://vercel.com))
- ✅ GitHub account with repository access
- ✅ Supabase project running
- ✅ Google Cloud account
- ✅ Microsoft Azure account
- ✅ Facebook Developer account

**Time Required**: ~90 minutes for first-time setup

---

## Phase 1: OAuth Provider Setup (45 minutes)

### Step 1: Google OAuth (10 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create or select a project
3. Click **Create Credentials** → **OAuth 2.0 Client ID**
4. If prompted, configure OAuth consent screen:
   - App name: **PaintMixr**
   - User support email: your email
   - Scopes: email, profile (default)
   - Publishing status: Testing (for development)
5. Application type: **Web application**
6. Name: **PaintMixr Production**
7. **Authorized redirect URIs**: Add these URLs:
   ```
   https://[your-supabase-ref].supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback (for development)
   ```
8. Click **Create**
9. **Save these values**:
   ```
   Client ID: [something].apps.googleusercontent.com
   Client secret: GOCSPX-[something]
   ```

### Step 2: Microsoft OAuth (15 minutes)

1. Go to [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps)
2. Click **New registration**
3. Name: **PaintMixr**
4. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts**
5. Redirect URI:
   - Platform: **Web**
   - URI: `https://[your-supabase-ref].supabase.co/auth/v1/callback`
6. Click **Register**
7. Note the **Application (client) ID**
8. Go to **Certificates & secrets** → **New client secret**
9. Description: **PaintMixr Production**
10. Expires: 24 months
11. Click **Add**
12. **IMPORTANT**: Copy the secret **Value** immediately (won't be shown again)
13. **Save these values**:
    ```
    Application (client) ID: [guid]
    Client secret value: [secret]
    ```

### Step 3: Facebook OAuth (10 minutes)

1. Go to [Facebook Developers](https://developers.facebook.com/apps)
2. Click **Create App**
3. Use case: **Authenticate and request data from users with Facebook Login**
4. App type: **Consumer**
5. App name: **PaintMixr**
6. Contact email: your email
7. Click **Create App**
8. Go to **Settings** → **Basic**
9. Note the **App ID** and **App Secret**
10. Add **Facebook Login** product:
    - Dashboard → Add Product → Facebook Login → Set Up
11. Go to **Facebook Login** → **Settings**
12. **Valid OAuth Redirect URIs**:
    ```
    https://[your-supabase-ref].supabase.co/auth/v1/callback
    http://localhost:3000/auth/callback
    ```
13. Click **Save Changes**
14. **IMPORTANT**: Toggle app to **Live** mode (top bar)
15. **Save these values**:
    ```
    App ID: [numeric-id]
    App Secret: [secret]
    ```

### Step 4: Configure Supabase Auth (10 minutes)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Authentication** → **Providers**

#### Enable Google:
- Toggle **Enable Sign in with Google**
- Client ID: [paste from Step 1]
- Client Secret: [paste from Step 1]
- Click **Save**

#### Enable Microsoft (Azure):
- Toggle **Enable Sign in with Azure**
- Client ID: [paste from Step 2]
- Client Secret: [paste from Step 2]
- Azure Tenant: `common` (for personal + work accounts)
- Click **Save**

#### Enable Facebook:
- Toggle **Enable Sign in with Facebook**
- Client ID: [paste from Step 3 - App ID]
- Client Secret: [paste from Step 3 - App Secret]
- Click **Save**

#### Set Session Duration:
1. Go to **Authentication** → **Settings**
2. Scroll to **Security** section
3. **JWT expiry (seconds)**: Change to `86400` (24 hours)
4. Click **Save**

**✅ OAuth Setup Complete!**

---

## Phase 2: Vercel Deployment (30 minutes)

### Method A: Vercel CLI (Recommended - Automated)

#### Step 1: Link Project (2 minutes)
```bash
cd /home/davistroy/dev/paintmixr
vercel link
```
- Select scope: `davistroy`
- Link to existing project? **No**
- Project name: `paintmixr` (or your choice)
- Directory: `./` (default)
- Override settings? **No**

#### Step 2: Add Environment Variables (20 minutes)

Run these commands and paste values when prompted:

```bash
# Supabase
vercel env add NEXT_PUBLIC_SUPABASE_URL production preview
# Paste: https://[your-ref].supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview
# Paste: [your-anon-key from Supabase Dashboard]

# Google OAuth
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production preview
# Paste: [client-id from Step 1]

vercel env add GOOGLE_CLIENT_SECRET production preview
# Paste: [client-secret from Step 1]

# Microsoft OAuth
vercel env add NEXT_PUBLIC_MICROSOFT_CLIENT_ID production preview
# Paste: [application-id from Step 2]

vercel env add MICROSOFT_CLIENT_SECRET production preview
# Paste: [client-secret from Step 2]

# Facebook OAuth
vercel env add NEXT_PUBLIC_FACEBOOK_APP_ID production preview
# Paste: [app-id from Step 3]

vercel env add FACEBOOK_APP_SECRET production preview
# Paste: [app-secret from Step 3]

# App URL (set after first deploy)
vercel env add NEXT_PUBLIC_APP_URL production
# Paste: https://paintmixr.vercel.app (or your domain)

vercel env add NEXT_PUBLIC_APP_URL preview
# Paste: https://{{VERCEL_URL}} (automatic preview URL)
```

#### Step 3: Deploy (5 minutes)
```bash
# Deploy to production
vercel --prod

# Or deploy to preview first
vercel

# Monitor deployment
vercel logs
```

### Method B: Vercel Dashboard (Alternative)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository: `davistroy/paintmixr`
3. Configure project:
   - Framework Preset: **Next.js** (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. **Before deploying**, click **Environment Variables**
5. Add all variables from `.env.local.example`:
   - Mark secrets (without `NEXT_PUBLIC_`) as **Encrypted**
   - Select appropriate targets (Production, Preview, Development)
6. Click **Deploy**

---

## Phase 3: Post-Deployment Setup (10 minutes)

### Step 1: Update OAuth Redirect URLs

After deployment, you have a production URL. Add it to OAuth providers:

#### Google Cloud Console:
- Authorized redirect URIs: Add `https://your-domain.vercel.app/auth/callback`

#### Azure Portal:
- Redirect URIs: Add `https://your-domain.vercel.app/auth/callback`

#### Facebook Developers:
- Valid OAuth Redirect URIs: Add `https://your-domain.vercel.app/auth/callback`

### Step 2: Update NEXT_PUBLIC_APP_URL

```bash
vercel env rm NEXT_PUBLIC_APP_URL production
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://your-actual-domain.vercel.app
```

### Step 3: Redeploy
```bash
vercel --prod
```

---

## Phase 4: Validation & Testing (15 minutes)

### Test OAuth Flows

1. Visit your Vercel deployment URL
2. Should redirect to `/auth/signin`
3. Test each provider:

**Google:**
- Click "Sign in with Google"
- Select Google account
- Grant permissions
- Should redirect back to app
- ✅ Verify user menu shows your email

**Microsoft:**
- Sign out
- Click "Sign in with Microsoft"
- Select Microsoft account (personal or work)
- Grant permissions
- ✅ Verify same user (account merged by email)

**Facebook:**
- Sign out
- Click "Sign in with Facebook"
- Authorize app
- ✅ Verify account merges if same email

### Verify Account Merging

1. Go to Supabase Dashboard → Authentication → Users
2. Click your user
3. Check **Identities** tab
4. ✅ Should see all 3 providers linked

### Test Session Duration

1. Sign in
2. Wait 5 minutes
3. Refresh page
4. ✅ Should still be signed in
5. Come back after 24+ hours
6. ✅ Should prompt for re-authentication

---

## Troubleshooting

### "redirect_uri_mismatch" Error
**Fix**: Ensure OAuth redirect URIs in provider console match exactly:
```
https://[supabase-ref].supabase.co/auth/v1/callback
```

### Build Failures
```bash
# Check build logs
vercel logs [deployment-url]

# Common fixes:
npm install  # Ensure dependencies installed
npm run build  # Test build locally
```

### Environment Variables Not Loading
```bash
# Verify variables are set
vercel env ls

# Pull variables to local
vercel env pull

# Check .env.local matches
cat .env.local
```

### Session Not Persisting
- Check HTTPS is enabled (Vercel does this automatically)
- Verify cookies are being set (check DevTools → Application → Cookies)
- Ensure `NEXT_PUBLIC_SUPABASE_URL` is correct

---

## Continuous Deployment

### Automatic Deployments

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: All other branches and pull requests

### Manual Deployment
```bash
# Deploy current branch to preview
vercel

# Deploy to production
vercel --prod

# Deploy specific branch
git checkout feature-branch
vercel
```

### Monitoring
```bash
# List deployments
vercel ls

# Get deployment details
vercel inspect [deployment-url]

# Stream logs
vercel logs [deployment-url] --follow
```

---

## Security Checklist

After deployment, verify:

- [ ] All OAuth secrets marked as "Encrypted" in Vercel
- [ ] `.env.local` file in `.gitignore` (never committed)
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] Session cookies are HTTP-only (implemented in code)
- [ ] JWT expiry set to 24 hours in Supabase
- [ ] OAuth apps restricted to authorized domains
- [ ] Facebook app in "Live" mode (not Development)

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Setup Guide](./specs/003-deploy-to-vercel/SETUP_GUIDE.md) - Detailed OAuth setup

---

## Support

If you encounter issues:
1. Check Vercel deployment logs: `vercel logs`
2. Check Supabase Auth logs: Dashboard → Logs
3. Verify environment variables: `vercel env ls`
4. Review this guide's Troubleshooting section
5. Check [GitHub Issues](https://github.com/davistroy/paintmixr/issues)

---

**Deployment Complete!** 🎉

Your PaintMixr app is now live with OAuth authentication.
