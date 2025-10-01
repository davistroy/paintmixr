# Data Model: Enhanced Color Accuracy Optimization

**Feature**: Enhanced Color Accuracy Optimization
**Date**: 2025-09-29
**Prerequisites**: research.md complete

## Enhanced Entity Definitions

### 1. Enhanced Mixing Formula

**Purpose**: Represents optimized paint combinations with asymmetric volume ratios targeting Delta E ≤ 2.0 accuracy

**Fields**:
```typescript
interface EnhancedMixingFormula {
  id: string                           // UUID primary key
  user_id: string                      // Foreign key to auth.users
  target_color: LABColor               // Target color in LAB space
  formula_version: 'standard' | 'enhanced'  // Backward compatibility flag

  // Enhanced accuracy fields
  achieved_delta_e: number             // Actual Delta E achieved (≤ 2.0 target)
  optimization_algorithm: 'differential_evolution' | 'tpe_hybrid'
  calculation_time_ms: number         // Performance tracking

  // Asymmetric paint volumes
  paint_components: PaintComponent[]   // Array of paint/volume pairs
  total_volume_ml: number             // Total formula volume in ml
  volume_constraints: VolumeConstraints // Min/max volume limits applied

  // Validation and metadata
  accuracy_tier: 'excellent' | 'good' | 'acceptable'  // ≤2.0, ≤4.0, >4.0
  formula_reproducibility_score: number  // Consistency metric (0-1)
  warnings: string[]                   // Volume/accuracy warnings

  created_at: Date
  updated_at: Date
}

interface PaintComponent {
  paint_id: string                     // Foreign key to paint colors
  volume_ml: number                    // Exact volume in milliliters
  percentage: number                   // Ratio within total formula
  is_below_minimum_threshold: boolean  // Flags volumes < 5.0ml
}

interface VolumeConstraints {
  min_total_volume_ml: number          // User-specified minimum
  max_total_volume_ml: number          // User-specified maximum
  individual_paint_minimums: Record<string, number>  // Per-paint minimums
  allow_scaling: boolean               // Whether to scale up small volumes
}
```

**Relationships**:
- Belongs to User (via user_id)
- References multiple Paint Colors (via paint_components)
- Has one Precision Volume Calculation
- Can have multiple Accuracy Optimization sessions

**Validation Rules**:
- `achieved_delta_e` MUST be ≥ 0
- `total_volume_ml` MUST be > 0
- Each `paint_component.volume_ml` MUST be ≥ 0.1ml (technical minimum)
- Sum of component percentages MUST equal 100%
- `calculation_time_ms` MUST be < 2000ms (performance limit)

**State Transitions**:
- Draft → Calculating → Optimized → Validated
- Can revert to Calculating for refinement
- Failed state for impossible color combinations

### 2. Precision Volume Calculation

**Purpose**: Contains milliliter-precise measurements and practical mixing guidelines

**Fields**:
```typescript
interface PrecisionVolumeCalculation {
  id: string                           // UUID primary key
  formula_id: string                   // Foreign key to Enhanced Mixing Formula

  // Precision measurements
  measured_components: MeasuredComponent[]
  measurement_precision: number        // Precision level (0.1ml, 1.0ml, etc.)
  scaling_factor: number              // Applied scaling for minimum volumes

  // Practical guidelines
  mixing_order: string[]               // Optimal order for adding paints
  mixing_instructions: string          // Step-by-step mixing guide
  equipment_recommendations: string[]  // Suggested measuring tools

  // Quality assurance
  expected_result_lab: LABColor        // Theoretical result color
  validation_checkpoints: ValidationCheckpoint[]

  created_at: Date
}

interface MeasuredComponent {
  paint_id: string
  theoretical_volume_ml: number        // Calculated optimal volume
  practical_volume_ml: number         // Rounded to measurable precision
  measurement_tool: string            // Suggested measuring device
  order_sequence: number              // Order in mixing process
}

interface ValidationCheckpoint {
  step: number                         // Mixing step number
  expected_color_lab: LABColor         // Expected color at this step
  tolerance_delta_e: number           // Acceptable variance at checkpoint
  visual_cue: string                  // Human-readable color description
}
```

**Relationships**:
- Belongs to Enhanced Mixing Formula (1:1)
- References Paint Colors (via measured_components)

**Validation Rules**:
- `practical_volume_ml` MUST be ≥ theoretical volume (no undershooting)
- `scaling_factor` MUST be ≥ 1.0
- Mixing order MUST include all components exactly once
- Validation checkpoints MUST be in sequential order

### 3. Accuracy Optimization Engine

**Purpose**: Manages enhanced color matching algorithms, Delta E validation, and optimization strategies

**Fields**:
```typescript
interface AccuracyOptimizationEngine {
  id: string                           // UUID primary key
  session_id: string                   // Groups optimization attempts
  formula_id: string                   // Foreign key to Enhanced Mixing Formula

  // Algorithm configuration
  optimization_method: OptimizationMethod
  algorithm_parameters: AlgorithmParameters
  performance_budget_ms: number        // Time limit for optimization

  // Optimization results
  iterations_completed: number         // Optimization iterations run
  best_delta_e_achieved: number       // Best result found
  convergence_history: ConvergencePoint[]
  fallback_strategies_used: string[]  // Applied when target unreachable

  // Performance metrics
  calculation_time_ms: number         // Actual time taken
  memory_usage_mb: number             // Peak memory usage
  worker_thread_used: boolean         // Whether Web Worker was available

  created_at: Date
}

enum OptimizationMethod {
  DIFFERENTIAL_EVOLUTION = 'differential_evolution',
  TPE_HYBRID = 'tpe_hybrid',
  FALLBACK_GRADIENT = 'fallback_gradient'
}

interface AlgorithmParameters {
  population_size: number              // DE population size
  max_iterations: number              // Maximum optimization iterations
  tolerance: number                   // Convergence tolerance
  constraint_handling: 'penalty' | 'repair' | 'barrier'
  parallel_workers: number            // Number of parallel evaluations
}

interface ConvergencePoint {
  iteration: number
  best_delta_e: number
  current_solution: number[]          // Paint ratios at this iteration
  improvement_rate: number            // Rate of improvement
  timestamp: Date
}
```

**Relationships**:
- Belongs to Enhanced Mixing Formula (1:many)
- Can reference previous optimization sessions for learning

**Validation Rules**:
- `performance_budget_ms` MUST be ≤ 500ms for interactive calculations
- `best_delta_e_achieved` MUST be > 0
- `iterations_completed` MUST be ≤ algorithm_parameters.max_iterations
- Convergence history MUST be chronologically ordered

## Extended Entities (Building on Existing)

### 4. Enhanced Color Value (extends existing ColorValue)

**New Fields**:
```typescript
interface EnhancedColorValue extends ColorValue {
  // Enhanced accuracy metadata
  measurement_method: 'spectrophotometer' | 'colorimeter' | 'visual' | 'calculated'
  delta_e_confidence_interval: [number, number]  // Statistical confidence range
  metamerism_index: number            // Color matching across illuminants

  // Kubelka-Munk enhanced coefficients
  enhanced_k_coefficients: number[]   // Wavelength-specific absorption
  enhanced_s_coefficients: number[]   // Wavelength-specific scattering
  surface_reflection_factor: number   // Surface correction factor
  substrate_type: string              // Base material characteristics
}
```

### 5. Enhanced Paint Color (extends existing PaintColor)

**New Fields**:
```typescript
interface EnhancedPaintColor extends PaintColor {
  // Enhanced mixing properties
  minimum_viable_volume_ml: number    // Paint-specific minimum (default 5.0ml)
  maximum_recommended_ratio: number   // Upper limit to prevent dominance
  mixing_stability_score: number     // How well it mixes with others (0-1)

  // Advanced color science
  enhanced_kubelka_munk: EnhancedKMCoefficients
  color_temperature_sensitivity: number  // Variation under different lights
  aging_stability: number             // Color stability over time (0-1)

  // Compatibility matrix
  compatible_paints: string[]         // IDs of paints that mix well
  incompatible_paints: string[]       // IDs to avoid mixing with
  mixing_warnings: string[]           // Special handling notes
}

interface EnhancedKMCoefficients {
  k_masstone: number[]                // Absorption in masstone
  s_masstone: number[]                // Scattering in masstone
  k_tint: number[]                    // Absorption at 40% tint
  s_tint: number[]                    // Scattering at 40% tint
  wavelength_range: [number, number]  // Measurement wavelength range
  measurement_date: Date              // When coefficients were determined
  calibration_standard: string       // Reference standard used
}
```

## Database Schema Considerations

### Indexing Strategy
- Index on `user_id` for user-specific queries
- Index on `achieved_delta_e` for accuracy-based filtering
- Index on `created_at` for chronological queries
- Composite index on `(user_id, accuracy_tier)` for dashboard queries

### Row Level Security (RLS) Policies
- Users can only access their own Enhanced Mixing Formulas
- Paint Color data is read-only for users, admin-writable
- Optimization Engine data follows formula ownership

### Migration Strategy
- Maintain backward compatibility with existing ColorValue/PaintColor
- Add new fields as optional with sensible defaults
- Provide migration script to populate enhanced coefficients
- Graceful fallback for formulas without enhanced data

---
*Data model design complete: 2025-09-29*
*Ready for API contract generation*