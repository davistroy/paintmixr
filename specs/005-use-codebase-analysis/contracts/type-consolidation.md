# API Contract: Type Consolidation & Strict Mode

**Feature**: 005-use-codebase-analysis
**Created**: 2025-10-02
**Purpose**: Define contracts for TypeScript type system improvements and strict mode migration

---

## Contract 1: Centralized Type Index

**Module**: `src/lib/types/index.ts`

**Description**: Single source of truth for all shared type interfaces used across the codebase. Eliminates duplicate type definitions and provides consistent imports.

**Requirements**: FR-015, FR-016, FR-017

### Exported Types

**Color Types**:
```typescript
/**
 * LAB color space representation (CIE 1976)
 * Used for accurate color calculations and Delta E measurements
 */
export interface LABColor {
  L: number // Lightness (0-100)
  a: number // Green-Red axis (-128 to 127)
  b: number // Blue-Yellow axis (-128 to 127)
}

/**
 * Validated color value with hex and LAB representations
 * Used throughout application for color accuracy (Delta E ≤ 4.0)
 */
export interface ColorValue {
  hex: string // Format: #RRGGBB (validated)
  lab: LABColor
}

/**
 * RGB color space representation (sRGB)
 * Used for display and conversion from hex
 */
export interface RGBColor {
  r: number // Red (0-255)
  g: number // Green (0-255)
  b: number // Blue (0-255)
}
```

**Paint Types**:
```typescript
/**
 * Kubelka-Munk coefficients for paint mixing simulation
 * k = absorption coefficient, s = scattering coefficient
 */
export interface KubelkaMunkCoefficients {
  k: number // Absorption (0-1)
  s: number // Scattering (0-1)
}

/**
 * Paint database entry with color accuracy metadata
 */
export interface Paint {
  id: string
  name: string
  brand: string
  color: ColorValue
  opacity: number // 0-1 (0 = transparent, 1 = opaque)
  tintingStrength: number // 0-1 (0 = weak, 1 = strong)
  kubelkaMunk: KubelkaMunkCoefficients
  userId: string // RLS isolation
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}
```

**Optimization Types** (Domain-Specific):
```typescript
/**
 * Volume constraints for optimization algorithm
 * Domain: Backend mixing calculations
 */
export interface OptimizationVolumeConstraints {
  minVolume: number // Milliliters
  maxVolume: number // Milliliters
  targetVolume?: number // Milliliters (optional)
  unit: 'ml' | 'oz' | 'gal'
}

/**
 * Volume constraints for UI form inputs
 * Domain: Frontend user input
 * Separate from OptimizationVolumeConstraints to handle string inputs
 */
export interface UIVolumeConstraints {
  minVolume: string // User input as string (validated later)
  maxVolume: string // User input as string
  targetVolume?: string // Optional user input
  displayUnit: string // Display format
}
```

**Session Types**:
```typescript
/**
 * User mixing session with save/load functionality
 */
export interface MixingSession {
  id: string
  userId: string
  name: string
  targetColor: ColorValue
  selectedPaints: string[] // Paint IDs
  mixingResult?: MixingResult
  isFavorite: boolean
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

/**
 * Mixing algorithm result with accuracy metrics
 */
export interface MixingResult {
  formula: PaintProportion[]
  achievedColor: ColorValue
  deltaE: number // Color accuracy (target: ≤ 4.0)
  totalVolume: number // Milliliters
  warnings: string[] // E.g., "Target color not achievable with selected paints"
}

/**
 * Individual paint proportion in mixing formula
 */
export interface PaintProportion {
  paintId: string
  paintName: string
  proportion: number // 0-1 (percentage of total mix)
  volume: number // Milliliters
}
```

**Authentication Types**:
```typescript
/**
 * Lockout metadata stored in auth.users.raw_user_meta_data
 */
export interface LockoutMetadata {
  failed_login_attempts: number // 0-5
  lockout_until: string | null // ISO 8601 timestamp or null
  last_failed_attempt: string | null // ISO 8601 timestamp or null
}

/**
 * Rate limit status for authentication endpoints
 */
export interface RateLimitStatus {
  rateLimited: boolean
  requestsRemaining: number // 0-5
  windowResetAt: Date // When window expires
  retryAfter: number // Seconds until retry allowed (if rate limited)
}
```

### Type Guards

```typescript
/**
 * Validate hex color format (#RRGGBB)
 */
export function isValidHexColor(hex: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hex)
}

/**
 * Type guard for ColorValue interface
 */
export function isColorValue(value: unknown): value is ColorValue {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.hex === 'string' &&
    isValidHexColor(obj.hex) &&
    typeof obj.lab === 'object' &&
    obj.lab !== null &&
    typeof (obj.lab as LABColor).L === 'number' &&
    typeof (obj.lab as LABColor).a === 'number' &&
    typeof (obj.lab as LABColor).b === 'number'
  )
}

/**
 * Type guard for LABColor interface
 */
export function isLABColor(value: unknown): value is LABColor {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.L === 'number' &&
    typeof obj.a === 'number' &&
    typeof obj.b === 'number' &&
    obj.L >= 0 && obj.L <= 100 &&
    obj.a >= -128 && obj.a <= 127 &&
    obj.b >= -128 && obj.b <= 127
  )
}
```

### Migration Rules

**Import Pattern** (all files must follow):
```typescript
// CORRECT: Import from centralized index
import { ColorValue, LABColor, Paint } from '@/lib/types'

// INCORRECT: Import from duplicate local definitions
import { ColorValue } from './types' // DELETE this file
```

**Duplicate Resolution**:
1. Identify all duplicate type definitions using TypeScript compiler
2. Rename domain-specific types with namespace prefix (e.g., `OptimizationVolumeConstraints` vs `UIVolumeConstraints`)
3. Delete duplicate files after migration complete
4. Build errors guide developers to correct imports

---

## Contract 2: TypeScript Strict Mode Configuration

**File**: `tsconfig.json`

**Description**: Enable all TypeScript strict mode flags to catch null/undefined bugs, implicit any types, and uninitialized properties at compile-time.

**Requirements**: FR-018, FR-019, FR-020, FR-021, FR-021a

### Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": false
  }
}
```

### Expected Compiler Errors (Categories)

**Category 1: Null/Undefined Safety** (FR-021):
```typescript
// ERROR: Object is possibly 'null' or 'undefined'
const user = await getUserById(id)
console.log(user.email) // FAILS: user might be null

// FIX: Explicit null check
const user = await getUserById(id)
if (user === null) {
  throw new Error('User not found')
}
console.log(user.email) // OK: user is non-null
```

**Category 2: Implicit Any** (FR-019):
```typescript
// ERROR: Parameter 'data' implicitly has an 'any' type
function processData(data) { // FAILS: no type annotation
  return data.value
}

// FIX: Explicit type annotation
function processData(data: { value: string }): string {
  return data.value
}
```

**Category 3: Strict Function Types** (FR-020):
```typescript
// ERROR: Argument type is not assignable to parameter type
type Handler = (arg: string | number) => void
const handler: Handler = (arg: string) => console.log(arg) // FAILS: too specific

// FIX: Use correct parameter type
const handler: Handler = (arg: string | number) => console.log(arg)
```

**Category 4: Uninitialized Properties**:
```typescript
// ERROR: Property has no initializer and is not definitely assigned in constructor
class User {
  email: string // FAILS: not initialized
  constructor(id: string) {
    this.loadUser(id) // Async load doesn't satisfy compiler
  }
}

// FIX: Make property optional or initialize
class User {
  email?: string // OK: optional property
  constructor(id: string) {
    this.loadUser(id)
  }
}
```

### Suppression Policy (FR-021a)

**Allowed Suppressions** (liberal use for third-party libraries):
```typescript
// Third-party library with incorrect types
// @ts-expect-error - Supabase types missing 'metadata' field
const metadata = user.raw_user_meta_data.metadata

// Edge case where proper typing is impractical
// @ts-ignore - Dynamic property access from validated form data
const value = formData[fieldName]
```

**Forbidden Suppressions** (first-party code should be properly typed):
```typescript
// BAD: Using suppression to avoid fixing first-party code
// @ts-ignore
const user = getUserById(id)
console.log(user.email) // Should add proper null check instead
```

### Migration Strategy

**Incremental Approach**:
1. Enable strict mode in `tsconfig.json`
2. Run `npm run build` to collect all errors
3. Fix errors by category (null checks → implicit any → function types → uninitialized properties)
4. Use `@ts-expect-error` for third-party library issues only
5. Build must pass with 0 errors before merging (FR-025)

---

## Contract 3: Build Configuration (Zero Warnings/Errors)

**File**: `next.config.js`

**Description**: Production build configuration must NOT ignore TypeScript or ESLint errors. All warnings and errors must be fixed before deployment.

**Requirements**: FR-025, FR-026, FR-027

### Configuration

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false // MUST be false (FR-025)
  },
  eslint: {
    ignoreDuringBuilds: false // MUST be false (FR-026)
  },
  // ... other config
}

module.exports = nextConfig
```

### Build Validation

**Success Criteria**:
```bash
$ npm run build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization

# Exit code: 0
```

**Failure Criteria** (must be fixed):
```bash
$ npm run build
✗ Type error: Object is possibly 'null' (src/components/Auth.tsx:42)
✗ ESLint: 'userId' is defined but never used (src/lib/auth.ts:15)

# Exit code: 1 (build MUST fail)
```

### CI/CD Integration

**GitHub Actions** (example):
```yaml
- name: Type Check
  run: npm run build
  # Fails if TypeScript errors exist (FR-025)

- name: Lint Check
  run: npm run lint
  # Fails if ESLint errors exist (FR-026)
```

**Pre-commit Hook** (optional but recommended):
```bash
#!/bin/bash
npm run lint
npm run type-check
```

---

## Contract Testing Requirements

### Type Definition Tests

1. **Type Guard Validation**:
   - `isValidHexColor()` correctly validates hex format
   - `isColorValue()` catches invalid ColorValue objects
   - `isLABColor()` validates LAB color ranges

2. **Import Resolution**:
   - All type imports resolve to centralized index
   - No duplicate type definitions remain in codebase
   - Domain-specific types have unique names

### Strict Mode Tests

1. **Compiler Validation**:
   - Null/undefined access caught at compile-time
   - Implicit any types caught at compile-time
   - Uninitialized properties caught at compile-time

2. **Build Configuration**:
   - Build fails when TypeScript errors exist
   - Build fails when ESLint errors exist
   - No warnings in production build output

### Migration Tests

1. **Backward Compatibility**:
   - Existing functionality preserved after type consolidation
   - Color accuracy unaffected by strict mode changes
   - Authentication flows work with new type definitions

---

**Version**: 1.0.0
**Last Updated**: 2025-10-02
