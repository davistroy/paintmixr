# Data Model: Paint Mixing Color App

**Date**: 2025-09-28
**Context**: Entity definitions and relationships for paint mixing application

## Core Entities

### PredefinedPaint
Represents a physical oil paint color available for mixing.

```typescript
interface PredefinedPaint {
  id: string;                    // Unique identifier
  name: string;                  // Paint name (e.g., "Cadmium Red Medium")
  brand: string;                 // Paint manufacturer
  hex_color: string;             // RGB representation (#RRGGBB)
  lab_l: number;                 // LAB L* component (0-100)
  lab_a: number;                 // LAB a* component (-128 to 127)
  lab_b: number;                 // LAB b* component (-128 to 127)

  // Kubelka-Munk optical properties
  k_coefficient: number;         // Absorption coefficient
  s_coefficient: number;         // Scattering coefficient
  opacity: number;               // Opacity level (0-1, 0=transparent, 1=opaque)
  tinting_strength: number;      // Relative tinting power (0-1)

  // Physical properties
  density: number;               // Paint density (g/ml) for volume calculations
  cost_per_ml: number;          // Optional cost tracking

  // Metadata
  created_at: timestamp;
  updated_at: timestamp;
}
```

**Validation Rules**:
- `hex_color` must match /^#[0-9A-Fa-f]{6}$/
- `lab_l` must be 0-100
- `lab_a`, `lab_b` must be -128 to 127
- `opacity`, `tinting_strength` must be 0-1
- `density` must be > 0
- `name` must be non-empty and unique per brand

### MixingSession
Represents a complete color matching or mixing prediction session.

```typescript
interface MixingSession {
  id: string;                    // UUID primary key
  user_id: string;              // Foreign key to auth.users (Supabase)
  session_type: 'color_matching' | 'ratio_prediction';

  // Input data
  target_color_hex?: string;     // Target color (for color_matching)
  target_color_lab_l?: number;   // LAB representation of target
  target_color_lab_a?: number;
  target_color_lab_b?: number;
  input_method: 'hex' | 'picker' | 'image';
  image_url?: string;           // Supabase Storage URL if image input

  // Results
  calculated_color_hex?: string; // Resulting color (for ratio_prediction)
  calculated_color_lab_l?: number;
  calculated_color_lab_a?: number;
  calculated_color_lab_b?: number;
  delta_e?: number;             // Color accuracy (CIE 2000)

  // User metadata
  custom_label?: string;        // User-provided session name
  notes?: string;               // Optional user notes
  is_favorite: boolean;         // User favorited session

  // Timestamps
  created_at: timestamp;
  updated_at: timestamp;
}
```

**Validation Rules**:
- Either target_color_* OR calculated_color_* must be set (depending on session_type)
- `custom_label` max 100 characters
- `notes` max 500 characters
- `delta_e` must be >= 0
- `image_url` must be valid Supabase Storage URL format

### MixingFormula
Represents the paint ratios for achieving a target color or predicting a result.

```typescript
interface MixingFormula {
  id: string;                    // UUID primary key
  session_id: string;           // Foreign key to MixingSession

  // Formula metadata
  total_volume_ml: number;      // Total mixed volume
  mixing_order?: string[];      // Recommended mixing sequence (paint IDs)

  created_at: timestamp;
}
```

**Validation Rules**:
- `total_volume_ml` must be 100-1000 (per requirements)
- `mixing_order` array length must match number of formula items

### FormulaItem
Represents individual paint amounts within a mixing formula.

```typescript
interface FormulaItem {
  id: string;                    // UUID primary key
  formula_id: string;           // Foreign key to MixingFormula
  paint_id: string;             // Foreign key to PredefinedPaint

  volume_ml: number;            // Paint volume in milliliters
  percentage: number;           // Percentage of total volume (calculated)

  created_at: timestamp;
}
```

**Validation Rules**:
- `volume_ml` must be > 0
- `percentage` must be 0-100
- Sum of all percentages per formula must equal 100
- Sum of all volume_ml per formula must equal formula.total_volume_ml

### ColorHistory (Optional Future Feature)
Tracks user's color preferences and frequently used combinations.

```typescript
interface ColorHistory {
  id: string;
  user_id: string;
  color_hex: string;
  frequency_count: number;
  last_used_at: timestamp;
  created_at: timestamp;
}
```

## Relationships

### Entity Relationship Diagram
```
Users (Supabase Auth)
├── MixingSession (1:many)
    ├── MixingFormula (1:1)
        └── FormulaItem (1:many)
            └── PredefinedPaint (many:1)

PredefinedPaint (static reference data)
└── FormulaItem (1:many)
```

### Foreign Key Constraints
- `MixingSession.user_id` → `auth.users.id` (CASCADE DELETE)
- `MixingFormula.session_id` → `MixingSession.id` (CASCADE DELETE)
- `FormulaItem.formula_id` → `MixingFormula.id` (CASCADE DELETE)
- `FormulaItem.paint_id` → `PredefinedPaint.id` (RESTRICT DELETE)

## Database Schema (PostgreSQL)

### Tables
```sql
-- PredefinedPaint stored in JSON file, not database table
-- Only user-generated data in database

CREATE TABLE mixing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('color_matching', 'ratio_prediction')),

  -- Input data
  target_color_hex TEXT CHECK (target_color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  target_color_lab_l DECIMAL(5,2) CHECK (target_color_lab_l BETWEEN 0 AND 100),
  target_color_lab_a DECIMAL(6,2) CHECK (target_color_lab_a BETWEEN -128 AND 127),
  target_color_lab_b DECIMAL(6,2) CHECK (target_color_lab_b BETWEEN -128 AND 127),
  input_method TEXT NOT NULL CHECK (input_method IN ('hex', 'picker', 'image')),
  image_url TEXT,

  -- Results
  calculated_color_hex TEXT CHECK (calculated_color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  calculated_color_lab_l DECIMAL(5,2) CHECK (calculated_color_lab_l BETWEEN 0 AND 100),
  calculated_color_lab_a DECIMAL(6,2) CHECK (calculated_color_lab_a BETWEEN -128 AND 127),
  calculated_color_lab_b DECIMAL(6,2) CHECK (calculated_color_lab_b BETWEEN -128 AND 127),
  delta_e DECIMAL(5,2) CHECK (delta_e >= 0),

  -- User metadata
  custom_label TEXT CHECK (LENGTH(custom_label) <= 100),
  notes TEXT CHECK (LENGTH(notes) <= 500),
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mixing_formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mixing_sessions(id) ON DELETE CASCADE,
  total_volume_ml INTEGER NOT NULL CHECK (total_volume_ml BETWEEN 100 AND 1000),
  mixing_order JSONB, -- Array of paint IDs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE formula_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_id UUID NOT NULL REFERENCES mixing_formulas(id) ON DELETE CASCADE,
  paint_id TEXT NOT NULL, -- References PredefinedPaint.id from JSON
  volume_ml DECIMAL(6,2) NOT NULL CHECK (volume_ml > 0),
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Indexes
```sql
-- Performance indexes
CREATE INDEX idx_mixing_sessions_user_id ON mixing_sessions(user_id);
CREATE INDEX idx_mixing_sessions_created_at ON mixing_sessions(created_at DESC);
CREATE INDEX idx_mixing_sessions_is_favorite ON mixing_sessions(user_id) WHERE is_favorite = TRUE;
CREATE INDEX idx_formula_items_paint_id ON formula_items(paint_id);

-- Unique constraints
CREATE UNIQUE INDEX idx_mixing_formulas_session_id ON mixing_formulas(session_id);
```

### Row Level Security (RLS)
```sql
-- Enable RLS
ALTER TABLE mixing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mixing_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE formula_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users see own sessions" ON mixing_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own formulas" ON mixing_formulas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mixing_sessions
      WHERE mixing_sessions.id = mixing_formulas.session_id
      AND mixing_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users see own formula items" ON formula_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM mixing_formulas
      JOIN mixing_sessions ON mixing_sessions.id = mixing_formulas.session_id
      WHERE mixing_formulas.id = formula_items.formula_id
      AND mixing_sessions.user_id = auth.uid()
    )
  );
```

## Data Validation

### Zod Schemas
```typescript
import { z } from 'zod';

export const PredefinedPaintSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().min(1),
  hex_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  lab_l: z.number().min(0).max(100),
  lab_a: z.number().min(-128).max(127),
  lab_b: z.number().min(-128).max(127),
  k_coefficient: z.number().positive(),
  s_coefficient: z.number().positive(),
  opacity: z.number().min(0).max(1),
  tinting_strength: z.number().min(0).max(1),
  density: z.number().positive(),
  cost_per_ml: z.number().nonnegative().optional(),
});

export const MixingSessionCreateSchema = z.object({
  session_type: z.enum(['color_matching', 'ratio_prediction']),
  target_color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  input_method: z.enum(['hex', 'picker', 'image']),
  image_url: z.string().url().optional(),
  custom_label: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const FormulaItemSchema = z.object({
  paint_id: z.string().min(1),
  volume_ml: z.number().positive(),
  percentage: z.number().min(0).max(100),
});
```

## State Transitions

### MixingSession Workflow
1. **Created**: User starts new session
2. **Input Provided**: Target color or mixing ratios entered
3. **Calculated**: Color matching or prediction completed
4. **Saved**: Session persisted with optional label
5. **Favorited**: User marks session as favorite (optional)

### Immutable Data
- Once saved, session data should not be modified
- New calculations create new sessions
- User can only update `custom_label`, `notes`, and `is_favorite`

This data model supports all functional requirements while maintaining data integrity and performance through proper indexing and constraints.