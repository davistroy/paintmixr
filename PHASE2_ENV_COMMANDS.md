# Phase 2: Environment Variable Commands

Copy and paste these commands **one at a time** in your terminal.

You'll be prompted to paste values. When you see "Enter value for...", paste the credential and press Enter.

---

## Supabase Variables (Pre-filled)

```bash
# 1. Supabase URL
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# When prompted, paste: https://rsqrykrrsekinzghcnmd.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_URL preview
# When prompted, paste: https://rsqrykrrsekinzghcnmd.supabase.co
```

```bash
# 2. Supabase Anon Key
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# When prompted, paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzcXJ5a3Jyc2VraW56Z2hjbm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzc4NzAsImV4cCI6MjA3NDY1Mzg3MH0.OtqyoqdxuSMVonpu-zqaLWxhKDUtj1sFm5I3eWn5p_c

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
# When prompted, paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzcXJ5a3Jyc2VraW56Z2hjbm1kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNzc4NzAsImV4cCI6MjA3NDY1Mzg3MH0.OtqyoqdxuSMVonpu-zqaLWxhKDUtj1sFm5I3eWn5p_c
```

---

## Google OAuth (Your Credentials)

```bash
# 3. Google Client ID
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production
# Paste your Google Client ID (ends with .apps.googleusercontent.com)

vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID preview
# Paste same value
```

```bash
# 4. Google Client Secret
vercel env add GOOGLE_CLIENT_SECRET production
# Paste your Google Client Secret (starts with GOCSPX-)

vercel env add GOOGLE_CLIENT_SECRET preview
# Paste same value
```

---

## Microsoft OAuth (Your Credentials)

```bash
# 5. Microsoft Client ID
vercel env add NEXT_PUBLIC_MICROSOFT_CLIENT_ID production
# Paste your Microsoft Application (client) ID (GUID format)

vercel env add NEXT_PUBLIC_MICROSOFT_CLIENT_ID preview
# Paste same value
```

```bash
# 6. Microsoft Client Secret
vercel env add MICROSOFT_CLIENT_SECRET production
# Paste your Microsoft Client Secret VALUE

vercel env add MICROSOFT_CLIENT_SECRET preview
# Paste same value
```

---

## Facebook OAuth (Your Credentials)

```bash
# 7. Facebook App ID
vercel env add NEXT_PUBLIC_FACEBOOK_APP_ID production
# Paste your Facebook App ID (numeric)

vercel env add NEXT_PUBLIC_FACEBOOK_APP_ID preview
# Paste same value
```

```bash
# 8. Facebook App Secret
vercel env add FACEBOOK_APP_SECRET production
# Paste your Facebook App Secret

vercel env add FACEBOOK_APP_SECRET preview
# Paste same value
```

---

## Verify All Variables Added

```bash
vercel env ls
```

You should see 8 environment variables listed.

---

**Total Commands**: 16 (8 variables × 2 environments each)
**Estimated Time**: 10-15 minutes

When complete, let me know and I'll proceed with deployment!
