/**
 * Precision Calculation Types (T018)
 *
 * Type definitions for precision volume calculations with milliliter accuracy,
 * measurement tools, and mixing instructions for enhanced accuracy formulas.
 *
 * Based on data-model.md PrecisionVolumeCalculation and MeasuredComponent
 * specifications for 0.1ml precision targeting.
 */

import { LABColor, PaintComponent } from './mixing';

// Precision volume calculation result
export interface PrecisionVolumeCalculation {
  /** Associated formula ID */
  formula_id: string;
  /** Target total volume in milliliters */
  total_volume_ml: number;
  /** Precision level used */
  precision_level: PrecisionLevel;
  /** Measured components with practical adjustments */
  measured_components: MeasuredComponent[];
  /** Step-by-step mixing instructions */
  mixing_instructions: string[];
  /** Recommended measurement equipment */
  equipment_recommendations: string[];
  /** Accuracy assessment */
  accuracy_assessment: AccuracyAssessment;
  /** Calculation timestamp */
  calculated_at: Date;
  /** Total mixing time estimate */
  total_mixing_time_minutes: number;
}

// Precision levels for volume measurements
export type PrecisionLevel = '0.1ml' | '0.5ml' | '1.0ml';

// Precision level specifications
export interface PrecisionLevelSpec {
  /** Precision value in milliliters */
  precision_ml: number;
  /** Minimum measurable volume */
  minimum_volume_ml: number;
  /** Maximum practical volume for this precision */
  maximum_volume_ml: number;
  /** Required equipment accuracy */
  equipment_accuracy: string;
  /** Typical measurement error percentage */
  measurement_error_percentage: number;
}

// Measured component with practical volume adjustments
export interface MeasuredComponent {
  /** Base paint component information */
  paint_component: PaintComponent;
  /** Theoretical volume from optimization */
  theoretical_volume_ml: number;
  /** Practical volume adjusted for measurement */
  practical_volume_ml: number;
  /** Measurement adjustment applied */
  adjustment_applied: VolumeAdjustment;
  /** Recommended measurement tool */
  measurement_tool: MeasurementTool;
  /** Measurement accuracy specification */
  measurement_accuracy: string;
  /** Expected measurement error range */
  error_range_ml: number;
  /** Mixing instructions for this component */
  mixing_instructions: ComponentMixingInstructions;
}

// Volume adjustment strategies
export interface VolumeAdjustment {
  /** Type of adjustment applied */
  adjustment_type: VolumeAdjustmentType;
  /** Original volume before adjustment */
  original_volume_ml: number;
  /** Adjusted volume after rounding/correction */
  adjusted_volume_ml: number;
  /** Volume difference */
  difference_ml: number;
  /** Reason for adjustment */
  reason: string;
  /** Impact on color accuracy */
  accuracy_impact: number;
}

// Types of volume adjustments
export type VolumeAdjustmentType =
  | 'precision_rounding'      // Round to measurement precision
  | 'minimum_volume'         // Increase to minimum measurable volume
  | 'maximum_volume'         // Decrease to maximum practical volume
  | 'tool_limitation'        // Adjust for measurement tool limitations
  | 'practical_scaling'      // Scale for practical mixing
  | 'error_compensation';    // Compensate for known measurement errors

// Measurement tool specifications
export interface MeasurementTool {
  /** Tool identifier */
  id: string;
  /** Tool name/description */
  name: string;
  /** Tool category */
  category: MeasurementCategory;
  /** Minimum volume capacity */
  min_volume_ml: number;
  /** Maximum volume capacity */
  max_volume_ml: number;
  /** Measurement accuracy */
  accuracy_ml: number;
  /** Resolution/precision */
  resolution_ml: number;
  /** Cost range for procurement */
  cost_range_usd: [number, number];
  /** Skill level required */
  skill_level: SkillLevel;
  /** Usage instructions */
  usage_instructions: string[];
}

// Measurement tool categories
export type MeasurementCategory =
  | 'digital_scale'          // High-precision digital scales
  | 'syringe'               // Precision syringes
  | 'pipette'               // Laboratory pipettes
  | 'graduated_cylinder'    // Measuring cylinders
  | 'measuring_cup'         // Standard measuring cups
  | 'dispensing_system';    // Automated dispensing systems

// Skill levels for measurement tools
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';

// Component-specific mixing instructions
export interface ComponentMixingInstructions {
  /** Paint component ID */
  paint_id: string;
  /** Pre-mixing preparation steps */
  preparation_steps: string[];
  /** Measurement procedure */
  measurement_procedure: string[];
  /** Addition technique */
  addition_technique: string;
  /** Mixing technique for this component */
  mixing_technique: string;
  /** Visual cues for proper incorporation */
  visual_cues: string[];
  /** Common mistakes to avoid */
  warnings: string[];
  /** Estimated time for this component */
  component_time_minutes: number;
}

// Accuracy assessment for precision calculations
export interface AccuracyAssessment {
  /** Expected Delta E after precision adjustments */
  expected_delta_e: number;
  /** Delta E deviation from theoretical */
  delta_e_deviation: number;
  /** Overall accuracy grade */
  accuracy_grade: AccuracyGrade;
  /** Factors affecting accuracy */
  accuracy_factors: AccuracyFactor[];
  /** Recommendations for improvement */
  improvement_recommendations: string[];
  /** Confidence level in result */
  confidence_percentage: number;
}

// Accuracy grading system
export type AccuracyGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';

// Factors affecting measurement accuracy
export interface AccuracyFactor {
  /** Factor name */
  factor: string;
  /** Impact on accuracy (0-1) */
  impact: number;
  /** Factor description */
  description: string;
  /** Mitigation strategies */
  mitigation: string[];
}

// Equipment recommendation with detailed specifications
export interface EquipmentRecommendation {
  /** Equipment category */
  category: MeasurementCategory;
  /** Specific product recommendations */
  products: ProductRecommendation[];
  /** Required accuracy for formula */
  required_accuracy_ml: number;
  /** Justification for recommendation */
  justification: string;
  /** Alternative options */
  alternatives: ProductRecommendation[];
  /** Budget considerations */
  budget_range_usd: [number, number];
}

// Specific product recommendations
export interface ProductRecommendation {
  /** Product name */
  name: string;
  /** Brand/manufacturer */
  brand: string;
  /** Model number */
  model: string;
  /** Specifications */
  specifications: EquipmentSpecs;
  /** Estimated cost in USD */
  cost_usd: number;
  /** Where to purchase */
  purchase_sources: string[];
  /** User rating (1-5) */
  rating: number;
  /** Professional/hobby suitability */
  suitability: SkillLevel[];
}

// Equipment technical specifications
export interface EquipmentSpecs {
  /** Accuracy specification */
  accuracy: string;
  /** Resolution specification */
  resolution: string;
  /** Capacity range */
  capacity_range: string;
  /** Operating conditions */
  operating_conditions: string;
  /** Calibration requirements */
  calibration_requirements: string;
  /** Maintenance requirements */
  maintenance: string;
}

// Mixing sequence optimization
export interface MixingSequence {
  /** Sequence ID */
  id: string;
  /** Associated formula ID */
  formula_id: string;
  /** Ordered sequence of mixing steps */
  steps: MixingStep[];
  /** Total estimated time */
  total_time_minutes: number;
  /** Sequence optimization method */
  optimization_method: SequenceOptimizationMethod;
  /** Expected outcome quality */
  expected_quality_score: number;
}

// Individual mixing step
export interface MixingStep {
  /** Step number in sequence */
  step_number: number;
  /** Step type */
  step_type: MixingStepType;
  /** Paint components involved */
  paint_components: string[];
  /** Volume to be added/mixed */
  volume_ml: number;
  /** Detailed instructions */
  instructions: string;
  /** Duration for this step */
  duration_minutes: number;
  /** Visual indicators of completion */
  completion_indicators: string[];
  /** Quality check points */
  quality_checks: string[];
}

// Types of mixing steps
export type MixingStepType =
  | 'base_preparation'       // Prepare base color
  | 'component_addition'     // Add paint component
  | 'initial_mixing'         // Initial incorporation
  | 'thorough_mixing'        // Complete homogenization
  | 'color_adjustment'       // Fine-tune color
  | 'quality_check'          // Check color accuracy
  | 'final_mixing';          // Final homogenization

// Sequence optimization methods
export type SequenceOptimizationMethod =
  | 'traditional'            // Traditional artist methods
  | 'scientific'             // Color science optimized
  | 'efficiency'             // Time-optimized
  | 'accuracy'               // Accuracy-optimized
  | 'hybrid';                // Balanced approach

// Measurement error analysis
export interface MeasurementErrorAnalysis {
  /** Formula ID being analyzed */
  formula_id: string;
  /** Expected measurement errors */
  expected_errors: ComponentError[];
  /** Error propagation analysis */
  error_propagation: ErrorPropagation;
  /** Sensitivity analysis */
  sensitivity_analysis: SensitivityAnalysis;
  /** Risk assessment */
  risk_assessment: RiskAssessment;
  /** Error mitigation strategies */
  mitigation_strategies: string[];
}

// Component-specific measurement errors
export interface ComponentError {
  /** Paint component ID */
  paint_id: string;
  /** Expected volume error (ml) */
  volume_error_ml: number;
  /** Error percentage of component volume */
  error_percentage: number;
  /** Error sources */
  error_sources: ErrorSource[];
  /** Impact on final color */
  color_impact: number;
}

// Sources of measurement error
export interface ErrorSource {
  /** Error source name */
  source: string;
  /** Error magnitude */
  magnitude_ml: number;
  /** Error type */
  type: ErrorType;
  /** Frequency of occurrence */
  frequency: ErrorFrequency;
  /** Mitigation difficulty */
  mitigation_difficulty: MitigationDifficulty;
}

// Types of measurement errors
export type ErrorType = 'systematic' | 'random' | 'human' | 'environmental' | 'equipment';

// Error frequency classifications
export type ErrorFrequency = 'rare' | 'occasional' | 'frequent' | 'constant';

// Mitigation difficulty levels
export type MitigationDifficulty = 'easy' | 'moderate' | 'difficult' | 'very_difficult';

// Error propagation through mixing process
export interface ErrorPropagation {
  /** Individual component errors */
  component_errors: number[];
  /** Combined error magnitude */
  combined_error_ml: number;
  /** Final color error estimate */
  final_color_error_delta_e: number;
  /** Error correlation matrix */
  correlation_matrix: number[][];
  /** Dominant error sources */
  dominant_sources: string[];
}

// Sensitivity analysis for measurement precision
export interface SensitivityAnalysis {
  /** Component sensitivity to volume changes */
  volume_sensitivity: ComponentSensitivity[];
  /** Most critical components */
  critical_components: string[];
  /** Tolerance recommendations */
  tolerance_recommendations: ToleranceRecommendation[];
  /** Robustness assessment */
  robustness_score: number;
}

// Component sensitivity to volume changes
export interface ComponentSensitivity {
  /** Paint component ID */
  paint_id: string;
  /** Delta E change per ml volume change */
  delta_e_per_ml: number;
  /** Sensitivity classification */
  sensitivity_level: SensitivityLevel;
  /** Recommended measurement precision */
  recommended_precision_ml: number;
  /** Impact on overall formula */
  formula_impact_weight: number;
}

// Sensitivity level classifications
export type SensitivityLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

// Tolerance recommendations
export interface ToleranceRecommendation {
  /** Component ID */
  paint_id: string;
  /** Maximum acceptable volume error */
  max_volume_error_ml: number;
  /** Maximum acceptable color error */
  max_color_error_delta_e: number;
  /** Confidence level */
  confidence_level: number;
  /** Justification */
  justification: string;
}

// Risk assessment for precision calculations
export interface RiskAssessment {
  /** Overall risk level */
  overall_risk: RiskLevel;
  /** Individual risk factors */
  risk_factors: RiskFactor[];
  /** Failure probability */
  failure_probability: number;
  /** Risk mitigation priority */
  mitigation_priority: MitigationPriority[];
  /** Contingency recommendations */
  contingency_plans: string[];
}

// Risk level classifications
export type RiskLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

// Individual risk factors
export interface RiskFactor {
  /** Risk factor name */
  factor: string;
  /** Risk probability (0-1) */
  probability: number;
  /** Risk impact severity */
  impact: RiskImpact;
  /** Risk score (probability × impact) */
  risk_score: number;
  /** Mitigation strategies */
  mitigation_strategies: string[];
}

// Risk impact severity
export type RiskImpact = 'negligible' | 'minor' | 'moderate' | 'major' | 'severe';

// Mitigation priority levels
export interface MitigationPriority {
  /** Risk factor to mitigate */
  risk_factor: string;
  /** Priority level */
  priority: Priority;
  /** Required resources */
  required_resources: string[];
  /** Expected effectiveness */
  effectiveness: number;
  /** Implementation difficulty */
  implementation_difficulty: MitigationDifficulty;
}

// Priority levels
export type Priority = 'low' | 'medium' | 'high' | 'critical';

// Precision calculation configuration
export interface PrecisionCalculationConfig {
  /** Target precision level */
  target_precision: PrecisionLevel;
  /** Equipment availability */
  available_equipment: MeasurementTool[];
  /** User skill level */
  user_skill_level: SkillLevel;
  /** Budget constraints */
  budget_limit_usd?: number;
  /** Time constraints */
  time_limit_minutes?: number;
  /** Quality vs. efficiency preference (0-1) */
  quality_preference: number;
  /** Risk tolerance */
  risk_tolerance: RiskLevel;
}

// Utility functions for precision calculations
export const getPrecisionSpec = (level: PrecisionLevel): PrecisionLevelSpec => {
  const specs: Record<PrecisionLevel, PrecisionLevelSpec> = {
    '0.1ml': {
      precision_ml: 0.1,
      minimum_volume_ml: 0.1,
      maximum_volume_ml: 100.0,
      equipment_accuracy: '±0.05ml',
      measurement_error_percentage: 5.0
    },
    '0.5ml': {
      precision_ml: 0.5,
      minimum_volume_ml: 0.5,
      maximum_volume_ml: 500.0,
      equipment_accuracy: '±0.25ml',
      measurement_error_percentage: 10.0
    },
    '1.0ml': {
      precision_ml: 1.0,
      minimum_volume_ml: 1.0,
      maximum_volume_ml: 1000.0,
      equipment_accuracy: '±0.5ml',
      measurement_error_percentage: 15.0
    }
  };
  return specs[level];
};

export const getAccuracyGradeThresholds = (): Record<AccuracyGrade, [number, number]> => ({
  'A+': [0.0, 0.5],   // Exceptional accuracy
  'A':  [0.5, 1.0],   // Excellent accuracy
  'B+': [1.0, 1.5],   // Very good accuracy
  'B':  [1.5, 2.0],   // Good accuracy
  'C+': [2.0, 3.0],   // Acceptable accuracy
  'C':  [3.0, 4.0],   // Marginal accuracy
  'D':  [4.0, 6.0],   // Poor accuracy
  'F':  [6.0, 100.0]  // Unacceptable accuracy
});

// Type guards for precision calculations
export const isMeasuredComponent = (obj: any): obj is MeasuredComponent => {
  return typeof obj === 'object' &&
    typeof obj.theoretical_volume_ml === 'number' &&
    typeof obj.practical_volume_ml === 'number' &&
    typeof obj.measurement_tool === 'object' &&
    typeof obj.measurement_accuracy === 'string';
};

export const isPrecisionVolumeCalculation = (obj: any): obj is PrecisionVolumeCalculation => {
  return typeof obj === 'object' &&
    typeof obj.formula_id === 'string' &&
    typeof obj.total_volume_ml === 'number' &&
    Array.isArray(obj.measured_components) &&
    obj.measured_components.every(isMeasuredComponent) &&
    Array.isArray(obj.mixing_instructions) &&
    Array.isArray(obj.equipment_recommendations);
};