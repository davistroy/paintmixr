/**
 * Enhanced Mixing Types (T017)
 *
 * Type definitions for enhanced color accuracy optimization with asymmetric
 * volume ratios and milliliter precision targeting Delta E ≤ 2.0.
 *
 * Based on data-model.md specifications for EnhancedMixingFormula,
 * PaintComponent, and VolumeConstraints entities.
 */

// Core LAB color space representation
export interface LABColor {
  /** Lightness (0-100) */
  l: number;
  /** Green-Red axis (-128 to 127) */
  a: number;
  /** Blue-Yellow axis (-128 to 127) */
  b: number;
}

// Paint component with precise volume measurements
export interface PaintComponent {
  /** Unique paint identifier */
  paint_id: string;
  /** Paint display name */
  paint_name: string;
  /** Precise volume in milliliters (0.1ml precision) */
  volume_ml: number;
  /** Percentage of total volume (0-100) */
  percentage: number;
  /** Mixing order for accurate color reproduction */
  mixing_order: number;
  /** Paint color in LAB space */
  paint_color: LABColor;
  /** Cost per milliliter in USD */
  cost_per_ml?: number;
  /** Available volume remaining in milliliters */
  available_volume_ml?: number;
}

// Volume constraint specifications
export interface VolumeConstraints {
  /** Minimum total volume required (ml) */
  min_total_volume_ml: number;
  /** Maximum total volume allowed (ml) */
  max_total_volume_ml: number;
  /** Allow automatic volume scaling */
  allow_scaling: boolean;
  /** Minimum volume per paint component (ml) */
  minimum_component_volume_ml?: number;
  /** Maximum volume per paint component (ml) */
  maximum_component_volume_ml?: number;
}

// Enhanced mixing formula with precision targeting
export interface EnhancedMixingFormula {
  /** Unique formula identifier */
  id: string;
  /** User-assigned formula name */
  name?: string;
  /** Target color in LAB space */
  target_color: LABColor;
  /** Achieved color in LAB space */
  achieved_color: LABColor;
  /** Delta E accuracy achieved (CIEDE2000) */
  achieved_delta_e: number;
  /** Target Delta E accuracy */
  target_delta_e: number;
  /** Total formula volume in milliliters */
  total_volume_ml: number;
  /** Paint components with precise measurements */
  paint_components: PaintComponent[];
  /** Volume constraints used */
  volume_constraints: VolumeConstraints;
  /** Estimated total cost in USD */
  estimated_cost: number;
  /** Estimated mixing time in minutes */
  mixing_time_estimate_minutes: number;
  /** Formula warnings and recommendations */
  warnings: string[];
  /** Creation timestamp */
  created_at: Date;
  /** Last modification timestamp */
  updated_at: Date;
  /** User ID who created the formula */
  user_id: string;
}

// Optimization request parameters
export interface ColorOptimizationRequest {
  /** Target color to achieve */
  target_color: LABColor;
  /** Available paint IDs for mixing */
  available_paints: string[];
  /** Volume constraints for the formula */
  volume_constraints: VolumeConstraints;
  /** Target Delta E accuracy (default: 2.0) */
  accuracy_target?: number;
  /** Maximum calculation time in milliseconds */
  performance_budget_ms?: number;
  /** Optimization method preference */
  optimization_method?: 'differential_evolution' | 'tpe_hybrid' | 'auto';
  /** Precision level for volume measurements */
  precision_level?: '0.1ml' | '0.5ml' | '1.0ml';
  /** User ID for personalized recommendations */
  user_id?: string;
}

// Optimization result with metadata
export interface ColorOptimizationResult {
  /** Generated enhanced mixing formula */
  formula: EnhancedMixingFormula;
  /** Optimization process metadata */
  optimization_metadata: OptimizationMetadata;
  /** Success indicator */
  success: boolean;
  /** Error message if optimization failed */
  error_message?: string;
}

// Optimization process metadata
export interface OptimizationMetadata {
  /** Algorithm used for optimization */
  algorithm_used: string;
  /** Number of iterations performed */
  iterations_performed: number;
  /** Convergence status */
  convergence_achieved: boolean;
  /** Performance metrics */
  performance_metrics: PerformanceMetrics;
  /** Color space coverage achieved */
  color_space_coverage: number;
}

// Performance tracking metrics
export interface PerformanceMetrics {
  /** Total calculation time in milliseconds */
  calculation_time_ms: number;
  /** Web Worker usage indicator */
  used_web_worker: boolean;
  /** Memory usage peak in MB */
  peak_memory_usage_mb?: number;
  /** Initial convergence time in milliseconds */
  initial_convergence_ms?: number;
  /** Final refinement time in milliseconds */
  final_refinement_ms?: number;
}

// Formula comparison for accuracy analysis
export interface FormulaComparison {
  /** Target color being compared */
  target_color: LABColor;
  /** Standard accuracy formula */
  current_formula: EnhancedMixingFormula;
  /** Enhanced accuracy formula */
  enhanced_formula: EnhancedMixingFormula;
  /** Improvement metrics */
  improvement_metrics: ImprovementMetrics;
}

// Improvement analysis metrics
export interface ImprovementMetrics {
  /** Delta E improvement (reduction) */
  delta_e_improvement: number;
  /** Percentage accuracy improvement */
  accuracy_improvement_percentage: number;
  /** Additional paints required */
  additional_paints_used: number;
  /** Cost increase for enhanced accuracy */
  cost_increase: number;
  /** Time increase for mixing */
  mixing_time_increase_minutes: number;
  /** Complexity score (1-10) */
  complexity_increase: number;
}

// Paint information extended for optimization
export interface OptimizationPaint {
  /** Unique paint identifier */
  id: string;
  /** Paint display name */
  name: string;
  /** Brand/manufacturer */
  brand: string;
  /** Paint color in LAB space */
  color_space: LABColor;
  /** Available volume in milliliters */
  available_volume_ml: number;
  /** Cost per milliliter in USD */
  cost_per_ml: number;
  /** Paint opacity/transparency (0-1) */
  opacity: number;
  /** Pigment characteristics for Kubelka-Munk */
  pigment_properties: PigmentProperties;
}

// Pigment properties for color science calculations
export interface PigmentProperties {
  /** Scattering coefficient (K) */
  scattering_coefficient: number;
  /** Absorption coefficient (S) */
  absorption_coefficient: number;
  /** Surface reflection factor */
  surface_reflection: number;
  /** Pigment density (g/ml) */
  pigment_density: number;
  /** Lightfastness rating (1-8) */
  lightfastness_rating: number;
  /** Chemical composition category */
  composition_category: 'organic' | 'inorganic' | 'synthetic' | 'natural';
}

// Validation result for mixed colors
export interface ColorValidationResult {
  /** Target color for validation */
  target_color: LABColor;
  /** Actually mixed color */
  mixed_color: LABColor;
  /** Validation results */
  validation_results: ValidationResults;
  /** Detailed color analysis */
  color_analysis: ColorAnalysis;
  /** Improvement suggestions */
  suggestions: string[];
}

// Color accuracy validation results
export interface ValidationResults {
  /** CIEDE2000 Delta E measurement */
  ciede2000_delta_e: number;
  /** CIE76 Delta E measurement (legacy) */
  cie76_delta_e: number;
  /** Meets enhanced accuracy target */
  meets_enhanced_target: boolean;
  /** Color accuracy grade (A+ to F) */
  accuracy_grade: string;
  /** Human-readable perceptual difference */
  perceptual_difference: string;
  /** Validation timestamp */
  validated_at: Date;
}

// Detailed color analysis breakdown
export interface ColorAnalysis {
  /** Lightness difference (ΔL*) */
  lightness_difference: number;
  /** Chroma difference (ΔC*) */
  chroma_difference: number;
  /** Hue difference (ΔH*) */
  hue_difference: number;
  /** Primary difference component */
  dominant_difference: 'lightness' | 'chroma' | 'hue';
  /** Color temperature difference (K) */
  temperature_difference_k?: number;
  /** Saturation difference percentage */
  saturation_difference_percentage?: number;
}

// Mixing session state for UI components
export interface MixingSession {
  /** Current session identifier */
  session_id: string;
  /** Target color being mixed */
  target_color: LABColor;
  /** Selected paint IDs */
  selected_paints: string[];
  /** Current formula being worked on */
  current_formula?: EnhancedMixingFormula;
  /** Session settings */
  settings: MixingSettings;
  /** Session history for undo/redo */
  history: MixingHistoryEntry[];
  /** Current step in mixing process */
  current_step: number;
  /** Session start time */
  started_at: Date;
  /** Last activity timestamp */
  last_activity_at: Date;
}

// User mixing preferences and settings
export interface MixingSettings {
  /** Default Delta E accuracy target */
  default_accuracy_target: number;
  /** Default precision level */
  default_precision_level: '0.1ml' | '0.5ml' | '1.0ml';
  /** Performance vs. accuracy preference (0-1) */
  performance_preference: number;
  /** Preferred optimization method */
  preferred_optimization_method: 'differential_evolution' | 'tpe_hybrid' | 'auto';
  /** Cost sensitivity (0-1) */
  cost_sensitivity: number;
  /** Show advanced options */
  show_advanced_options: boolean;
  /** Enable accessibility features */
  accessibility_enabled: boolean;
  /** Color vision filter preference */
  color_vision_filter?: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

// Mixing process history for tracking changes
export interface MixingHistoryEntry {
  /** History entry ID */
  id: string;
  /** Action performed */
  action: MixingAction;
  /** Previous state */
  previous_state: any;
  /** New state */
  new_state: any;
  /** User-friendly description */
  description: string;
  /** Timestamp of action */
  timestamp: Date;
  /** Can be undone */
  undoable: boolean;
}

// Types of mixing actions for history tracking
export type MixingAction =
  | 'color_changed'
  | 'paint_added'
  | 'paint_removed'
  | 'accuracy_target_changed'
  | 'volume_constraints_changed'
  | 'optimization_performed'
  | 'formula_saved'
  | 'formula_validated';

// Error types for mixing operations
export interface MixingError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Detailed error description */
  details?: string;
  /** Suggested solutions */
  suggestions?: string[];
  /** Error severity level */
  severity: 'info' | 'warning' | 'error' | 'critical';
  /** Associated data for debugging */
  context?: Record<string, any>;
}

// Common mixing error codes
export enum MixingErrorCode {
  INVALID_COLOR_SPACE = 'INVALID_COLOR_SPACE',
  INSUFFICIENT_PAINTS = 'INSUFFICIENT_PAINTS',
  VOLUME_CONSTRAINT_VIOLATION = 'VOLUME_CONSTRAINT_VIOLATION',
  OPTIMIZATION_TIMEOUT = 'OPTIMIZATION_TIMEOUT',
  IMPOSSIBLE_COLOR_TARGET = 'IMPOSSIBLE_COLOR_TARGET',
  PRECISION_LIMIT_EXCEEDED = 'PRECISION_LIMIT_EXCEEDED',
  COST_LIMIT_EXCEEDED = 'COST_LIMIT_EXCEEDED',
  PERFORMANCE_BUDGET_EXCEEDED = 'PERFORMANCE_BUDGET_EXCEEDED',
  INVALID_PAINT_DATA = 'INVALID_PAINT_DATA',
  CALCULATION_ERROR = 'CALCULATION_ERROR'
}

// Type guards for runtime validation
export const isLABColor = (obj: any): obj is LABColor => {
  return typeof obj === 'object' &&
    typeof obj.l === 'number' && obj.l >= 0 && obj.l <= 100 &&
    typeof obj.a === 'number' && obj.a >= -128 && obj.a <= 127 &&
    typeof obj.b === 'number' && obj.b >= -128 && obj.b <= 127;
};

export const isPaintComponent = (obj: any): obj is PaintComponent => {
  return typeof obj === 'object' &&
    typeof obj.paint_id === 'string' &&
    typeof obj.volume_ml === 'number' && obj.volume_ml > 0 &&
    typeof obj.percentage === 'number' && obj.percentage >= 0 && obj.percentage <= 100 &&
    typeof obj.mixing_order === 'number' && obj.mixing_order > 0;
};

export const isVolumeConstraints = (obj: any): obj is VolumeConstraints => {
  return typeof obj === 'object' &&
    typeof obj.min_total_volume_ml === 'number' && obj.min_total_volume_ml > 0 &&
    typeof obj.max_total_volume_ml === 'number' && obj.max_total_volume_ml > 0 &&
    obj.max_total_volume_ml >= obj.min_total_volume_ml &&
    typeof obj.allow_scaling === 'boolean';
};

export const isEnhancedMixingFormula = (obj: any): obj is EnhancedMixingFormula => {
  return typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    isLABColor(obj.target_color) &&
    isLABColor(obj.achieved_color) &&
    typeof obj.achieved_delta_e === 'number' &&
    typeof obj.total_volume_ml === 'number' &&
    Array.isArray(obj.paint_components) &&
    obj.paint_components.every(isPaintComponent) &&
    isVolumeConstraints(obj.volume_constraints);
};