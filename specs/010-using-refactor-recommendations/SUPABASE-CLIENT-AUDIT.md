# Supabase Client Usage Audit Report

**Feature**: 010-using-refactor-recommendations
**Task**: T045
**Date**: 2025-10-05
**Auditor**: Claude Code

## Executive Summary

Audited all API routes for correct Supabase client usage. Found **8 routes** incorrectly using Admin client for user-facing operations, which bypasses Row Level Security (RLS) policies.

## ✅ Correct Usage

### Routes using Route Handler Client (Correct)
1. `/api/optimize/route.ts` - Uses `createClient` from route-handler
2. `/api/paints/route.ts` - Uses `createClient` from route-handler

### Routes using Admin Client (Justified)
1. `/api/auth/admin/clear-lockout/route.ts` - Admin endpoint, requires bypass of RLS
2. `/api/auth/lockout-status/route.ts` - Reads user metadata (Admin API required)
3. `/api/auth/email-signin/route.ts` - Updates user metadata for lockout tracking

## ❌ Incorrect Usage (Security Issues)

### Routes that MUST be fixed:
1. **`/api/paints/[id]/route.ts`** (GET, PATCH, DELETE)
   - Current: Uses Admin client
   - Risk: Bypasses RLS, users could access other users' paints
   - Fix: Replace with route handler client
   ```typescript
   - import { createClient as createAdminClient } from '@/lib/supabase/admin';
   + import { createClient } from '@/lib/supabase/route-handler';

   - const supabase = createAdminClient();
   + const supabase = await createClient();
   ```

2. **`/api/collections/route.ts`** (GET, POST, DELETE)
   - Current: Uses Admin client
   - Risk: Bypasses RLS, users could access other users' collections
   - Fix: Replace with route handler client

3. **`/api/collections/[id]/route.ts`** (GET, PATCH, DELETE)
   - Current: Uses Admin client
   - Risk: Bypasses RLS, users could access other users' collections
   - Fix: Replace with route handler client

4. **`/api/mixing-history/route.ts`** (GET, POST, DELETE)
   - Current: Uses Admin client
   - Risk: Bypasses RLS, users could access other users' mixing history
   - Fix: Replace with route handler client

## Impact Assessment

### Security Risk: HIGH
- **RLS Bypass**: Admin client bypasses all Row Level Security policies
- **Data Exposure**: Users could potentially access other users' private data
- **Attack Vector**: Malicious users could craft requests to access/modify unauthorized data

### Affected Data:
- User paint collections
- User paint metadata (volume, cost, tags)
- User mixing history
- User collections

## Remediation Plan

### Immediate Actions (Priority 1)
1. Replace Admin client with Route Handler client in all 4 affected routes
2. Verify RLS policies are correctly configured for all tables
3. Test that user isolation works correctly after fix

### Testing Strategy
1. **Unit Tests**: Mock Supabase client to verify correct client is used
2. **Integration Tests**: Verify RLS policies block cross-user access
3. **E2E Tests**: Attempt to access other users' data (should fail)

### Verification Checklist
- [ ] All user-facing routes use route handler client
- [ ] Admin client only used in `/api/auth/admin/` endpoints
- [ ] RLS policies tested for all affected tables
- [ ] Integration tests pass
- [ ] No console warnings about missing user context

## Best Practices for Future Development

### When to use each client:

**Route Handler Client** (`@/lib/supabase/route-handler`)
- ✅ User-scoped operations (CRUD on user data)
- ✅ All authenticated endpoints
- ✅ Any route that should respect RLS
- Example: `/api/paints`, `/api/sessions`, `/api/collections`

**Admin Client** (`@/lib/supabase/admin`)
- ✅ Admin-only operations
- ✅ Updating user metadata (`auth.users.user_metadata`)
- ✅ System-level operations (analytics, migrations)
- ⚠️ Never for user-facing data operations
- Example: `/api/auth/admin/*`, lockout management

**Server Client** (`@/lib/supabase/server`)
- ✅ Server components
- ✅ Static page generation
- ❌ Not for API routes (use route handler client)

**Browser Client** (`@/lib/supabase/client`)
- ✅ Client components
- ✅ User interactions in browser
- ❌ Never on server-side

## References
- CLAUDE.md: "Supabase Client Pattern in API Routes (CRITICAL)"
- Feature 006: Bug fixes from E2E testing
- Constitutional Principle IV: Security & Privacy First
