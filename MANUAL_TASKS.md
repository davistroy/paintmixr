# Manual Tasks Checklist - Deploy to Vercel with OAuth

## ✅ Automated Tasks (COMPLETED by Claude)

- [x] Created `vercel.json` configuration
- [x] Updated `.env.local.example` with OAuth variables
- [x] Installed `@supabase/ssr` dependency
- [x] Created all auth utility files
- [x] Created all UI components
- [x] Created API routes
- [x] Created middleware for route protection
- [x] Created comprehensive test suite
- [x] Created `DEPLOYMENT.md` guide
- [x] Created GitHub Actions CI workflow
- [x] Verified Vercel CLI installed (v48.1.6)
- [x] Verified you're logged in as: `davistroy`

---

## 👤 YOUR MANUAL TASKS

**Estimated Time**: ~90 minutes total

---

### Phase 1: OAuth Provider Setup (45 minutes)

#### Task 1: Create Google OAuth App (10 min)
**Where**: https://console.cloud.google.com/apis/credentials

**Steps**:
1. Create or select project
2. Create OAuth 2.0 Client ID
3. Configure consent screen (if needed)
4. Application type: Web application
5. Add redirect URI: `https://[your-supabase-ref].supabase.co/auth/v1/callback`
6. Save Client ID and Client Secret

**Save These Values**:
```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=[your-value].apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-[your-value]
```

---

#### Task 2: Create Microsoft OAuth App (15 min)
**Where**: https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps

**Steps**:
1. New registration
2. Name: PaintMixr
3. Accounts: Any organizational directory + personal
4. Redirect URI: `https://[your-supabase-ref].supabase.co/auth/v1/callback`
5. Note Application (client) ID
6. Create client secret
7. **COPY SECRET VALUE IMMEDIATELY** (won't show again)

**Save These Values**:
```bash
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=[guid]
MICROSOFT_CLIENT_SECRET=[secret-value]
```

---

#### Task 3: Create Facebook OAuth App (10 min)
**Where**: https://developers.facebook.com/apps

**Steps**:
1. Create App → Consumer → Facebook Login
2. Name: PaintMixr
3. Note App ID and App Secret
4. Add Facebook Login product
5. Settings → Valid OAuth Redirect URIs: `https://[your-supabase-ref].supabase.co/auth/v1/callback`
6. **IMPORTANT**: Set app to "Live" mode

**Save These Values**:
```bash
NEXT_PUBLIC_FACEBOOK_APP_ID=[numeric-id]
FACEBOOK_APP_SECRET=[secret]
```

---

#### Task 4: Configure Supabase Auth (10 min)
**Where**: https://app.supabase.com/project/[your-project]/auth/providers

**Steps**:
1. Enable Google provider:
   - Paste Google Client ID
   - Paste Google Client Secret
   - Save

2. Enable Azure provider:
   - Paste Microsoft Client ID
   - Paste Microsoft Client Secret
   - Azure Tenant: `common`
   - Save

3. Enable Facebook provider:
   - Paste Facebook App ID
   - Paste Facebook App Secret
   - Save

4. Set JWT expiry:
   - Go to Authentication → Settings
   - JWT expiry (seconds): `86400` (24 hours)
   - Save

**Verification**:
- [ ] All 3 providers show "Enabled" status
- [ ] JWT expiry set to 86400 seconds

---

### Phase 2: Vercel Deployment (30 minutes)

#### Task 5: Deploy Using Vercel CLI (30 min)

**Step 5a: Link Project** (2 min)
```bash
cd /home/davistroy/dev/paintmixr
vercel link
```
- Scope: `davistroy`
- Link to existing? **No**
- Project name: `paintmixr`
- Directory: `./`

**Step 5b: Add Environment Variables** (20 min)

Run each command and paste your values:

```bash
# Supabase Configuration
vercel env add NEXT_PUBLIC_SUPABASE_URL production preview
# Paste your Supabase URL

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview
# Paste your anon key

# Google OAuth
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production preview
# Paste from Task 1

vercel env add GOOGLE_CLIENT_SECRET production preview
# Paste from Task 1

# Microsoft OAuth
vercel env add NEXT_PUBLIC_MICROSOFT_CLIENT_ID production preview
# Paste from Task 2

vercel env add MICROSOFT_CLIENT_SECRET production preview
# Paste from Task 2

# Facebook OAuth
vercel env add NEXT_PUBLIC_FACEBOOK_APP_ID production preview
# Paste from Task 3

vercel env add FACEBOOK_APP_SECRET production preview
# Paste from Task 3

# App URL (set after first deploy - see Step 5d)
```

**Step 5c: Deploy to Preview** (3 min)
```bash
vercel
```
- Note the preview URL: `https://paintmixr-[hash].vercel.app`

**Step 5d: Deploy to Production** (5 min)
```bash
vercel --prod
```
- Note your production URL: `https://paintmixr.vercel.app`

**Step 5e: Set App URL** (2 min)
```bash
# Production
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://paintmixr.vercel.app (your actual URL)

# Preview (uses automatic Vercel URL)
vercel env add NEXT_PUBLIC_APP_URL preview
# Enter: https://{{VERCEL_URL}}
```

**Step 5f: Redeploy with App URL** (2 min)
```bash
vercel --prod
```

---

### Phase 3: Post-Deployment (15 minutes)

#### Task 6: Update OAuth Redirect URLs (10 min)

Now that you have your production URL, add it to all OAuth providers:

**Google Cloud Console**:
- Go to your OAuth 2.0 Client ID
- Authorized redirect URIs → Add:
  - `https://paintmixr.vercel.app/auth/callback`

**Azure Portal**:
- Go to your App registration → Authentication
- Redirect URIs → Add:
  - `https://paintmixr.vercel.app/auth/callback`

**Facebook Developers**:
- Go to Facebook Login → Settings
- Valid OAuth Redirect URIs → Add:
  - `https://paintmixr.vercel.app/auth/callback`

---

#### Task 7: Test OAuth Flows (5 min)

Visit: `https://paintmixr.vercel.app`

**Test each provider**:
1. Click "Sign in with Google"
   - [ ] Redirects to Google
   - [ ] Sign in completes
   - [ ] Returns to app
   - [ ] User menu visible

2. Sign out, then "Sign in with Microsoft"
   - [ ] Works with same email
   - [ ] Account merges (same user_id)

3. Sign out, then "Sign in with Facebook"
   - [ ] Works with same email
   - [ ] All 3 providers linked

**Verify in Supabase**:
- Dashboard → Authentication → Users → Your User
- Identities tab should show: google, azure, facebook

---

### Phase 4: Validation (Optional - 15 min)

#### Task 8: Run Test Scenarios

Follow scenarios in: `specs/003-deploy-to-vercel/quickstart.md`

Key tests:
- [ ] Scenario 1: New user sign-in (Google)
- [ ] Scenario 2: Account merging (Microsoft, same email)
- [ ] Scenario 3: Session expires after 24 hours
- [ ] Scenario 8: 10 concurrent users

---

## 🎯 QUICK START (If You're Ready Now)

**Run these commands in order**:

```bash
# 1. Link to Vercel
vercel link

# 2. Add Supabase env vars (paste your values when prompted)
vercel env add NEXT_PUBLIC_SUPABASE_URL production preview
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production preview

# 3. Add OAuth env vars (paste values from Tasks 1-3)
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production preview
vercel env add GOOGLE_CLIENT_SECRET production preview
vercel env add NEXT_PUBLIC_MICROSOFT_CLIENT_ID production preview
vercel env add MICROSOFT_CLIENT_SECRET production preview
vercel env add NEXT_PUBLIC_FACEBOOK_APP_ID production preview
vercel env add FACEBOOK_APP_SECRET production preview

# 4. Deploy to production
vercel --prod

# 5. Set app URL (use your actual Vercel URL)
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add NEXT_PUBLIC_APP_URL preview

# 6. Redeploy
vercel --prod

# 7. Monitor deployment
vercel logs --follow
```

---

## 📊 Progress Tracking

### OAuth Setup
- [ ] Google OAuth app created
- [ ] Microsoft OAuth app created
- [ ] Facebook OAuth app created
- [ ] Supabase providers configured
- [ ] JWT expiry set to 24 hours

### Vercel Deployment
- [ ] Project linked to Vercel
- [ ] Environment variables added
- [ ] Deployed to preview
- [ ] Deployed to production
- [ ] App URL configured

### Post-Deployment
- [ ] OAuth redirect URLs updated
- [ ] All 3 providers tested
- [ ] Account merging verified
- [ ] Session duration tested

---

## 🆘 If You Get Stuck

**Common Issues**:

1. **"redirect_uri_mismatch"**
   - Verify Supabase callback URL: `https://[ref].supabase.co/auth/v1/callback`
   - Check it's added to ALL OAuth providers

2. **Build fails**
   - Run `npm run build` locally first
   - Check `vercel logs [url]`

3. **Env vars not loading**
   - Run `vercel env ls` to verify
   - Ensure correct targets (production/preview)

4. **OAuth not working**
   - Check Supabase Dashboard → Auth → Providers
   - Verify all secrets entered correctly
   - Check provider status (Facebook must be "Live")

**Need help?** Check `DEPLOYMENT.md` for detailed troubleshooting.

---

## ✨ After Completion

Once all tasks complete:
1. Your app is live at: `https://paintmixr.vercel.app`
2. OAuth works with Google, Microsoft, Facebook
3. Accounts merge automatically by email
4. Sessions last 24 hours
5. Continuous deployment set up (push to main → auto-deploy)

**Next steps**:
- Share the URL
- Add custom domain (optional)
- Monitor via `vercel logs`
- Deploy updates: `git push` (auto-deploys)

---

**Total Estimated Time**: ~90 minutes
**Current Status**: Ready to start manual tasks
**Automation Complete**: 26/39 tasks done automatically

Good luck! 🚀
