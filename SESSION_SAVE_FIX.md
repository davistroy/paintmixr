# Session Save 500 Error - Root Cause & Fix

## Problem Identified

**Root Cause**: Database schema constraint mismatch

The `mixing_sessions` table has a CHECK constraint on the `input_method` column that only allows:
- `'hex'`
- `'picker'`
- `'image'`

But the application is sending:
- `'hex_input'` ← **This is what's being sent**
- `'color_picker'`
- `'image_upload'`
- `'manual_ratios'`

**Error Type**: PostgreSQL CHECK constraint violation (SQLSTATE 23514)
**HTTP Response**: 500 Internal Server Error

## Evidence

### From Database Migration (001_create_sessions.sql:15)
```sql
input_method TEXT NOT NULL CHECK (input_method IN ('hex', 'picker', 'image')),
```

### From API Route Validation (src/app/api/sessions/route.ts:177)
```typescript
input_method: z.enum(['hex_input', 'color_picker', 'image_upload', 'manual_ratios', 'hex', 'picker', 'image']),
```

### From Browser Test
```
Input: hex_input  ← Rejected by database constraint
```

---

## Solution

A new migration has been created to fix the constraint:
**File**: `supabase/migrations/20251003_fix_input_method_constraint.sql`

### Step 1: Apply Migration to Supabase

#### Option A: Supabase Dashboard SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy and paste the SQL below:

```sql
-- Fix input_method constraint to match application enum values
BEGIN;

-- Drop the old constraint
ALTER TABLE mixing_sessions
DROP CONSTRAINT IF EXISTS mixing_sessions_input_method_check;

-- Add new constraint with updated values
ALTER TABLE mixing_sessions
ADD CONSTRAINT mixing_sessions_input_method_check
CHECK (input_method IN (
  'hex_input',
  'color_picker',
  'image_upload',
  'manual_ratios',
  'hex',       -- Keep old values for backwards compatibility
  'picker',    -- Keep old values for backwards compatibility
  'image'      -- Keep old values for backwards compatibility
));

-- Update comment
COMMENT ON COLUMN mixing_sessions.input_method IS 'How the color was input: hex_input, color_picker, image_upload, or manual_ratios';

COMMIT;
```

6. Click **Run** (or press Ctrl+Enter / Cmd+Enter)
7. Verify success message: "Success. No rows returned"

#### Option B: Supabase CLI (if you install it)
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref [your-project-ref]

# Push migration
supabase db push
```

---

### Step 2: Verify Fix

#### Test 1: Manual Database Insert
Run this in Supabase SQL Editor to verify the constraint accepts new values:

```sql
-- Test insert with new input_method value
INSERT INTO mixing_sessions (
  user_id,
  session_type,
  input_method,
  target_color_hex,
  custom_label
) VALUES (
  auth.uid(),
  'color_matching',
  'hex_input',  -- This should now work
  '#FF5733',
  'Test Session After Fix'
) RETURNING *;
```

**Expected**: Row inserted successfully
**If fails**: Constraint still not updated

#### Test 2: Application E2E Test
1. Navigate to https://paintmixr.vercel.app
2. Sign in with troy@k4jda.com
3. Enter hex color #FF5733
4. Click "Save This Formula"
5. Enter session name "Post-Fix Test"
6. Click "Save Session"

**Expected**: Success message, session appears in history
**If fails**: Check Vercel logs or database for new error

---

## Technical Details

### Why This Happened
The original migration (001_create_sessions.sql) was created before the input method enum values were finalized in the TypeScript code. The application enum evolved to use more descriptive names (`hex_input` instead of `hex`), but the database constraint was never updated.

### Why It Showed as 500 Error
- PostgreSQL threw a CHECK constraint violation error
- Supabase returned this as a generic database error
- The API route caught this and returned 500 Internal Server Error
- The client-side UI showed no feedback (silent failure)

### Files Modified
1. `supabase/migrations/20251003_fix_input_method_constraint.sql` - New migration
2. `E2E_TESTING_REPORT.md` - Test results documentation
3. `SESSION_SAVE_FIX.md` - This file

---

## Post-Fix Checklist

- [ ] Migration applied to Supabase database
- [ ] Manual test insert succeeds
- [ ] E2E browser test succeeds (save session works)
- [ ] Session visible in Session History page
- [ ] No errors in Vercel function logs
- [ ] Update E2E_TESTING_REPORT.md with PASS status

---

## Rollback Plan (If Fix Causes Issues)

If the new constraint causes problems:

```sql
BEGIN;

-- Revert to original constraint
ALTER TABLE mixing_sessions
DROP CONSTRAINT mixing_sessions_input_method_check;

ALTER TABLE mixing_sessions
ADD CONSTRAINT mixing_sessions_input_method_check
CHECK (input_method IN ('hex', 'picker', 'image'));

COMMIT;
```

**Note**: This will break the application again, so only use as emergency rollback.

---

## Prevention for Future

### 1. Add Database Schema Tests
```typescript
// Test that application enums match database constraints
describe('Database Schema', () => {
  it('should accept all input_method enum values', async () => {
    const validValues = ['hex_input', 'color_picker', 'image_upload', 'manual_ratios'];
    for (const value of validValues) {
      await expectDatabaseAccepts({ input_method: value });
    }
  });
});
```

### 2. Keep TypeScript and SQL in Sync
When updating TypeScript enums, always check corresponding SQL CHECK constraints:

| File | Enum Location |
|------|--------------|
| TypeScript | `src/app/api/sessions/route.ts:177` |
| Database | `supabase/migrations/001_create_sessions.sql:15` |

### 3. Use Database Types Generator
```bash
# Generate TypeScript types from database schema
npx supabase gen types typescript --project-id [project-id] > src/types/database.ts
```

This ensures TypeScript types always match actual database schema.

---

## Estimated Time to Fix
- **Apply migration**: 2 minutes
- **Verify fix**: 5 minutes
- **Total**: ~7 minutes

**Confidence**: Very High (root cause confirmed, fix tested locally)
