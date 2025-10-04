# Data Model: Enhanced Accuracy Mode

**Feature**: 007-enhanced-mode-1
**Date**: 2025-10-04

## Overview

This document defines the data entities, validation rules, and state transitions for Enhanced Accuracy Mode server-side optimization.

---

## Entities

### 1. EnhancedOptimizationRequest

Represents a server-side color matching optimization request targeting Delta E ≤ 2.0 accuracy.

#### Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `targetColor` | `LABColor` | Yes | `l: 0-100, a: -128-127, b: -128-127` | Target color to match in CIE LAB space |
| `availablePaints` | `Paint[]` | Yes | `length >= 2, length <= 100` | User's paint collection with optical properties |
| `mode` | `'standard' \| 'enhanced'` | Yes | Enum validation | Optimization mode selector |
| `volumeConstraints` | `VolumeConstraints` | No | See VolumeConstraints validation | Total volume and component limits |
| `maxPaintCount` | `number` | No | `2-5` | Maximum paints in formula (default: 5) |
| `timeLimit` | `number` | No | `1000-30000` ms | Optimization timeout (default: 28000ms) |
| `accuracyTarget` | `number` | No | `> 0` | Target Delta E (default: 2.0 for enhanced, 5.0 for standard) |

#### TypeScript Definition

```typescript
interface EnhancedOptimizationRequest {
  targetColor: LABColor;
  availablePaints: Paint[];
  mode: 'standard' | 'enhanced';
  volumeConstraints?: VolumeConstraints;
  maxPaintCount?: number;
  timeLimit?: number;
  accuracyTarget?: number;
}
```

#### Validation Rules (Zod Schema)

```typescript
const enhancedOptimizationRequestSchema = z.object({
  targetColor: labColorSchema,
  availablePaints: z.array(paintSchema).min(2).max(100),
  mode: z.enum(['standard', 'enhanced']),
  volumeConstraints: volumeConstraintsSchema.optional(),
  maxPaintCount: z.number().int().min(2).max(5).default(5),
  timeLimit: z.number().int().min(1000).max(30000).default(28000),
  accuracyTarget: z.number().positive().default(2.0)
});
```

---

### 2. OptimizedPaintFormula

Represents the result of Enhanced mode optimization with 2-5 paint components.

#### Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `paintRatios` | `PaintRatio[]` | Yes | `length: 2-5` | Paint components with volumes and percentages |
| `totalVolume` | `number` | Yes | `> 0` | Total formula volume in milliliters |
| `predictedColor` | `LABColor` | Yes | Valid LAB | Kubelka-Munk predicted color |
| `deltaE` | `number` | Yes | `>= 0` | CIE 2000 Delta E from target |
| `accuracyRating` | `'excellent' \| 'good' \| 'acceptable' \| 'poor'` | Yes | Enum | User-facing accuracy indicator |
| `mixingComplexity` | `'simple' \| 'moderate' \| 'complex'` | Yes | Enum | Formula complexity (2-3 paints = simple, 4-5 = moderate/complex) |
| `kubelkaMunkK` | `number` | Yes | `0-1` | Absorption coefficient |
| `kubelkaMunkS` | `number` | Yes | `0-1` | Scattering coefficient |
| `opacity` | `number` | Yes | `0-1` | Mixed paint opacity |

#### TypeScript Definition

```typescript
interface OptimizedPaintFormula {
  paintRatios: PaintRatio[];
  totalVolume: number;
  predictedColor: LABColor;
  deltaE: number;
  accuracyRating: 'excellent' | 'good' | 'acceptable' | 'poor';
  mixingComplexity: 'simple' | 'moderate' | 'complex';
  kubelkaMunkK: number;
  kubelkaMunkS: number;
  opacity: number;
}
```

#### Derived Fields

- **accuracyRating**: `deltaE <= 2.0 ? 'excellent' : deltaE <= 4.0 ? 'good' : deltaE <= 6.0 ? 'acceptable' : 'poor'`
- **mixingComplexity**: `paintRatios.length <= 2 ? 'simple' : paintRatios.length <= 3 ? 'moderate' : 'complex'`

---

### 3. OptimizationPerformanceMetrics

Tracking data for optimization quality and convergence.

#### Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `timeElapsed` | `number` | Yes | `> 0` | Milliseconds elapsed during optimization |
| `iterationsCompleted` | `number` | Yes | `>= 0` | Number of optimization iterations |
| `algorithmUsed` | `'differential_evolution' \| 'tpe_hybrid' \| 'auto'` | Yes | Enum | Selected optimization algorithm |
| `convergenceAchieved` | `boolean` | Yes | - | Whether optimization converged before timeout |
| `targetMet` | `boolean` | Yes | - | Whether Delta E ≤ accuracyTarget |
| `earlyTermination` | `boolean` | Yes | - | Whether timeout forced early stop |
| `initialBestDeltaE` | `number` | Yes | `>= 0` | Best Delta E at start (greedy selection) |
| `finalBestDeltaE` | `number` | Yes | `>= 0` | Best Delta E at completion |
| `improvementRate` | `number` | Yes | - | `(initialBestDeltaE - finalBestDeltaE) / initialBestDeltaE` |

#### TypeScript Definition

```typescript
interface OptimizationPerformanceMetrics {
  timeElapsed: number;
  iterationsCompleted: number;
  algorithmUsed: 'differential_evolution' | 'tpe_hybrid' | 'auto';
  convergenceAchieved: boolean;
  targetMet: boolean;
  earlyTermination: boolean;
  initialBestDeltaE: number;
  finalBestDeltaE: number;
  improvementRate: number;
}
```

---

### 4. EnhancedOptimizationResponse

Complete API response structure for `/api/optimize` endpoint.

#### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | `boolean` | Yes | Overall operation success |
| `formula` | `OptimizedPaintFormula \| null` | Yes | Optimized formula (null if error) |
| `metrics` | `OptimizationPerformanceMetrics \| null` | Yes | Performance tracking data |
| `warnings` | `string[]` | Yes | Non-fatal warnings (empty array if none) |
| `error` | `string \| null` | No | Error message if success=false |

#### TypeScript Definition

```typescript
interface EnhancedOptimizationResponse {
  success: boolean;
  formula: OptimizedPaintFormula | null;
  metrics: OptimizationPerformanceMetrics | null;
  warnings: string[];
  error?: string | null;
}
```

#### State Transitions

```
Request Received
    ↓
[Validation]
    ├─ Invalid → { success: false, error: "Validation message" }
    └─ Valid → Continue
    ↓
[Optimization Execution]
    ├─ Timeout → { success: true, formula: bestSoFar, warnings: ["Partial result"] }
    ├─ Error → { success: false, error: "Optimization failed" }
    └─ Complete → Continue
    ↓
[Result Evaluation]
    ├─ Delta E ≤ 2.0 → { success: true, targetMet: true }
    ├─ Delta E > 2.0 → { success: true, targetMet: false, warnings: ["Target not met"] }
    └─ Return response
```

---

## Supporting Types (Existing)

### LABColor
```typescript
interface LABColor {
  l: number; // 0-100 (lightness)
  a: number; // -128-127 (green-red)
  b: number; // -128-127 (blue-yellow)
}
```

### Paint
```typescript
interface Paint {
  id: string;
  name: string;
  k_coefficient: number; // 0-1 (absorption)
  s_coefficient: number; // 0-1 (scattering)
  opacity: number; // 0-1
  tinting_strength: number; // 0-1
  lab_values: LABColor;
  mass_tone_lab: LABColor;
  undertone_lab: LABColor;
  transparency_index: number;
}
```

### PaintRatio
```typescript
interface PaintRatio {
  paint_id: string;
  paint_name?: string;
  volume_ml: number;
  percentage: number;
  paint_properties?: Paint;
}
```

### VolumeConstraints
```typescript
interface VolumeConstraints {
  min_total_volume_ml: number;
  max_total_volume_ml: number;
  minimum_component_volume_ml?: number;
  maximum_component_volume_ml?: number;
  allow_scaling?: boolean;
}
```

---

## Validation Examples

### Valid Enhanced Request
```json
{
  "targetColor": { "l": 65, "a": 18, "b": -5 },
  "availablePaints": [
    { "id": "p1", "name": "Titanium White", ... },
    { "id": "p2", "name": "Ultramarine Blue", ... },
    { "id": "p3", "name": "Cadmium Yellow", ... }
  ],
  "mode": "enhanced",
  "maxPaintCount": 5,
  "timeLimit": 28000,
  "accuracyTarget": 2.0
}
```

### Valid Enhanced Response
```json
{
  "success": true,
  "formula": {
    "paintRatios": [
      { "paint_id": "p1", "paint_name": "Titanium White", "volume_ml": 50, "percentage": 50 },
      { "paint_id": "p2", "paint_name": "Ultramarine Blue", "volume_ml": 30, "percentage": 30 },
      { "paint_id": "p3", "paint_name": "Cadmium Yellow", "volume_ml": 20, "percentage": 20 }
    ],
    "totalVolume": 100,
    "predictedColor": { "l": 64.8, "a": 17.9, "b": -4.8 },
    "deltaE": 0.5,
    "accuracyRating": "excellent",
    "mixingComplexity": "moderate",
    "kubelkaMunkK": 0.42,
    "kubelkaMunkS": 0.68,
    "opacity": 0.85
  },
  "metrics": {
    "timeElapsed": 15234,
    "iterationsCompleted": 342,
    "algorithmUsed": "tpe_hybrid",
    "convergenceAchieved": true,
    "targetMet": true,
    "earlyTermination": false,
    "initialBestDeltaE": 8.2,
    "finalBestDeltaE": 0.5,
    "improvementRate": 0.939
  },
  "warnings": []
}
```

---

## Database Schema Changes

**No database migrations required.** All optimization data structures are ephemeral (request/response only). Existing paint collection tables remain unchanged.

**Existing Tables Used**:
- `paints` - User paint collections (already has K/S coefficients, LAB values)
- `paint_collections` - Paint collection metadata
- `mixing_history` - Optional: Store successful formulas for user reference

---

## Constraints & Invariants

1. **Paint Count**: `2 <= paintRatios.length <= 5` (enforced by maxPaintCount)
2. **Volume Sum**: `sum(paintRatios[].volume_ml) === totalVolume` (within 0.01ml tolerance)
3. **Percentage Sum**: `sum(paintRatios[].percentage) === 100` (within 0.1% tolerance)
4. **Delta E Non-Negative**: `deltaE >= 0` always
5. **Timeout Limit**: `timeElapsed <= timeLimit + 2000` (2-second buffer for cleanup)
6. **Accuracy Rating Mapping**:
   - `excellent`: deltaE <= 2.0
   - `good`: 2.0 < deltaE <= 4.0
   - `acceptable`: 4.0 < deltaE <= 6.0
   - `poor`: deltaE > 6.0

---

**Based on Spec**: `specs/007-enhanced-mode-1/spec.md`
**Research Reference**: `specs/007-enhanced-mode-1/research.md`
