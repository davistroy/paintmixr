/**
 * Optimization Engine Types (T019)
 *
 * Type definitions for the AccuracyOptimizationEngine with support for
 * Differential Evolution, TPE hybrid optimization, and constraint handling
 * for enhanced color accuracy targeting Delta E ≤ 2.0.
 *
 * Based on data-model.md AccuracyOptimizationEngine specifications and
 * research.md optimization algorithm requirements.
 */

import { LABColor } from './mixing';

// Main optimization engine interface
export interface AccuracyOptimizationEngine {
  /** Engine identifier */
  id: string;
  /** Engine name/description */
  name: string;
  /** Supported optimization methods */
  supported_methods: OptimizationMethod[];
  /** Engine configuration */
  config: OptimizationEngineConfig;
  /** Current optimization state */
  state: OptimizationEngineState;
  /** Performance statistics */
  performance_stats: OptimizationPerformanceStats;
}

// Available optimization methods
export interface OptimizationMethod {
  /** Method identifier */
  method_id: string;
  /** Method name */
  name: string;
  /** Method description */
  description: string;
  /** Algorithm family */
  algorithm_family: AlgorithmFamily;
  /** Suitable problem characteristics */
  suitable_for: ProblemCharacteristics;
  /** Performance characteristics */
  performance_profile: PerformanceProfile;
  /** Configuration parameters */
  parameters: OptimizationParameters;
}

// Algorithm families
export type AlgorithmFamily =
  | 'differential_evolution'    // Differential Evolution variants
  | 'particle_swarm'           // Particle Swarm Optimization
  | 'genetic_algorithm'        // Genetic Algorithm variants
  | 'bayesian_optimization'    // Bayesian optimization (TPE, GP)
  | 'gradient_based'           // Gradient-based methods
  | 'hybrid'                   // Hybrid combinations
  | 'heuristic'                // Custom heuristics
  | 'exhaustive'               // Brute force methods
  | 'monte_carlo';             // Monte Carlo methods

// Problem characteristics for method selection
export interface ProblemCharacteristics {
  /** Number of paint components (dimensions) */
  dimensionality: DimensionalityRange;
  /** Search space complexity */
  search_space_complexity: ComplexityLevel;
  /** Constraint density */
  constraint_density: ConstraintDensity;
  /** Required accuracy level */
  accuracy_requirement: AccuracyLevel;
  /** Performance requirements */
  performance_requirement: PerformanceRequirement;
  /** Objective function smoothness */
  objective_smoothness: SmoothnessLevel;
}

// Dimensionality ranges
export type DimensionalityRange = 'low' | 'medium' | 'high' | 'very_high'; // 2-3, 4-6, 7-10, 10+

// Complexity levels
export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'very_complex';

// Constraint density levels
export type ConstraintDensity = 'sparse' | 'moderate' | 'dense' | 'very_dense';

// Accuracy requirement levels
export type AccuracyLevel = 'standard' | 'high' | 'very_high' | 'extreme';

// Performance requirement levels
export type PerformanceRequirement = 'relaxed' | 'moderate' | 'strict' | 'real_time';

// Objective function smoothness
export type SmoothnessLevel = 'smooth' | 'moderately_smooth' | 'rough' | 'very_rough';

// Performance profile for optimization methods
export interface PerformanceProfile {
  /** Expected convergence speed */
  convergence_speed: ConvergenceSpeed;
  /** Solution quality expectation */
  solution_quality: SolutionQuality;
  /** Computational cost */
  computational_cost: ComputationalCost;
  /** Memory requirements */
  memory_requirements: MemoryRequirements;
  /** Scalability characteristics */
  scalability: ScalabilityProfile;
  /** Robustness to noise */
  noise_tolerance: NoiseToleranceLevel;
}

// Performance characteristics types
export type ConvergenceSpeed = 'very_slow' | 'slow' | 'moderate' | 'fast' | 'very_fast';
export type SolutionQuality = 'poor' | 'fair' | 'good' | 'very_good' | 'excellent';
export type ComputationalCost = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
export type MemoryRequirements = 'minimal' | 'low' | 'moderate' | 'high' | 'very_high';
export type NoiseToleranceLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

// Scalability profile
export interface ScalabilityProfile {
  /** Dimensional scalability */
  dimension_scalability: ScalabilityLevel;
  /** Population/sample scalability */
  population_scalability: ScalabilityLevel;
  /** Constraint scalability */
  constraint_scalability: ScalabilityLevel;
  /** Parallel processing support */
  parallel_support: ParallelSupportLevel;
}

// Scalability levels
export type ScalabilityLevel = 'poor' | 'limited' | 'good' | 'excellent';
export type ParallelSupportLevel = 'none' | 'limited' | 'good' | 'excellent';

// Optimization parameters configuration
export interface OptimizationParameters {
  /** Population size (for population-based algorithms) */
  population_size?: number;
  /** Maximum iterations/generations */
  max_iterations?: number;
  /** Convergence tolerance */
  convergence_tolerance?: number;
  /** Crossover probability (for evolutionary algorithms) */
  crossover_probability?: number;
  /** Mutation probability */
  mutation_probability?: number;
  /** Learning rate (for gradient-based methods) */
  learning_rate?: number;
  /** Acquisition function parameters (for Bayesian optimization) */
  acquisition_params?: AcquisitionParameters;
  /** Constraint handling method */
  constraint_handling?: ConstraintHandlingMethod;
  /** Random seed for reproducibility */
  random_seed?: number;
  /** Custom algorithm-specific parameters */
  custom_params?: Record<string, any>;
}

// Acquisition function parameters for Bayesian optimization
export interface AcquisitionParameters {
  /** Acquisition function type */
  function_type: AcquisitionFunctionType;
  /** Exploration-exploitation balance */
  exploration_weight: number;
  /** Number of acquisition candidates */
  candidate_count: number;
  /** Optimization method for acquisition */
  acquisition_optimizer: string;
}

// Acquisition function types
export type AcquisitionFunctionType =
  | 'expected_improvement'      // Expected Improvement (EI)
  | 'probability_improvement'   // Probability of Improvement (PI)
  | 'upper_confidence_bound'    // Upper Confidence Bound (UCB)
  | 'entropy_search'           // Entropy Search
  | 'knowledge_gradient';      // Knowledge Gradient

// Constraint handling methods
export type ConstraintHandlingMethod =
  | 'penalty_function'         // Penalty function method
  | 'barrier_method'          // Barrier/interior point method
  | 'augmented_lagrangian'    // Augmented Lagrangian
  | 'feasible_region'         // Restrict to feasible region
  | 'repair_mechanism'        // Repair infeasible solutions
  | 'death_penalty';          // Reject infeasible solutions

// Optimization engine configuration
export interface OptimizationEngineConfig {
  /** Default optimization method */
  default_method: string;
  /** Method selection strategy */
  method_selection_strategy: MethodSelectionStrategy;
  /** Performance budget constraints */
  performance_budgets: PerformanceBudgets;
  /** Quality thresholds */
  quality_thresholds: QualityThresholds;
  /** Constraint handling configuration */
  constraint_config: ConstraintConfiguration;
  /** Caching and persistence settings */
  caching_config: CachingConfiguration;
  /** Logging and monitoring settings */
  monitoring_config: MonitoringConfiguration;
}

// Method selection strategies
export type MethodSelectionStrategy =
  | 'user_specified'           // User explicitly chooses method
  | 'automatic'               // Engine chooses based on problem characteristics
  | 'portfolio'               // Run multiple methods and select best
  | 'adaptive'                // Switch methods based on progress
  | 'hybrid_sequential'       // Run methods in sequence
  | 'hybrid_parallel';        // Run methods in parallel

// Performance budget constraints
export interface PerformanceBudgets {
  /** Maximum calculation time in milliseconds */
  max_calculation_time_ms: number;
  /** Maximum memory usage in MB */
  max_memory_mb: number;
  /** Maximum function evaluations */
  max_function_evaluations: number;
  /** Maximum iterations */
  max_iterations: number;
  /** Early stopping criteria */
  early_stopping: EarlyStoppingCriteria;
}

// Early stopping criteria
export interface EarlyStoppingCriteria {
  /** Enable early stopping */
  enabled: boolean;
  /** Minimum improvement threshold */
  min_improvement: number;
  /** Patience (iterations without improvement) */
  patience_iterations: number;
  /** Time-based stopping */
  time_based_stopping: boolean;
  /** Quality-based stopping */
  quality_based_stopping: boolean;
}

// Quality thresholds for optimization
export interface QualityThresholds {
  /** Target Delta E accuracy */
  target_delta_e: number;
  /** Acceptable Delta E accuracy */
  acceptable_delta_e: number;
  /** Minimum acceptable accuracy */
  minimum_delta_e: number;
  /** Convergence tolerance */
  convergence_tolerance: number;
  /** Solution diversity requirements */
  diversity_requirements: DiversityRequirements;
}

// Solution diversity requirements
export interface DiversityRequirements {
  /** Require diverse solutions */
  require_diversity: boolean;
  /** Minimum solution distance */
  min_solution_distance: number;
  /** Number of diverse solutions */
  diverse_solution_count: number;
  /** Diversity metric */
  diversity_metric: DiversityMetric;
}

// Diversity metrics
export type DiversityMetric = 'euclidean_distance' | 'color_distance' | 'ratio_difference';

// Constraint configuration
export interface ConstraintConfiguration {
  /** Volume constraint handling */
  volume_constraints: VolumeConstraintHandling;
  /** Color gamut constraints */
  gamut_constraints: GamutConstraintHandling;
  /** Physical constraints */
  physical_constraints: PhysicalConstraintHandling;
  /** User preference constraints */
  preference_constraints: PreferenceConstraintHandling;
  /** Constraint violation tolerance */
  violation_tolerance: ConstraintViolationTolerance;
}

// Volume constraint handling
export interface VolumeConstraintHandling {
  /** Constraint handling method */
  method: ConstraintHandlingMethod;
  /** Scaling strategy */
  scaling_strategy: VolumeScalingStrategy;
  /** Minimum component volume enforcement */
  min_component_enforcement: MinVolumeEnforcement;
  /** Precision rounding strategy */
  precision_rounding: PrecisionRoundingStrategy;
}

// Volume scaling strategies
export type VolumeScalingStrategy = 'proportional' | 'priority_based' | 'optimization_based';

// Minimum volume enforcement
export interface MinVolumeEnforcement {
  /** Enforcement method */
  method: 'hard_constraint' | 'soft_penalty' | 'adaptive';
  /** Minimum volume threshold */
  threshold_ml: number;
  /** Penalty weight */
  penalty_weight: number;
}

// Precision rounding strategies
export type PrecisionRoundingStrategy = 'nearest' | 'conservative' | 'aggressive' | 'optimal';

// Gamut constraint handling
export interface GamutConstraintHandling {
  /** Gamut checking method */
  checking_method: GamutCheckingMethod;
  /** Out-of-gamut handling */
  out_of_gamut_handling: OutOfGamutHandling;
  /** Gamut expansion allowance */
  expansion_allowance: number;
}

// Gamut checking methods
export type GamutCheckingMethod = 'theoretical' | 'empirical' | 'hybrid' | 'disabled';

// Out-of-gamut handling strategies
export type OutOfGamutHandling = 'reject' | 'project' | 'approximate' | 'warn';

// Physical constraint handling
export interface PhysicalConstraintHandling {
  /** Paint availability constraints */
  availability_constraints: boolean;
  /** Cost constraints */
  cost_constraints: CostConstraintHandling;
  /** Time constraints */
  time_constraints: TimeConstraintHandling;
  /** Equipment constraints */
  equipment_constraints: boolean;
}

// Cost constraint handling
export interface CostConstraintHandling {
  /** Enable cost constraints */
  enabled: boolean;
  /** Maximum cost per formula */
  max_cost_usd: number;
  /** Cost optimization weight */
  optimization_weight: number;
  /** Cost penalty function */
  penalty_function: PenaltyFunctionType;
}

// Time constraint handling
export interface TimeConstraintHandling {
  /** Enable time constraints */
  enabled: boolean;
  /** Maximum mixing time */
  max_mixing_time_minutes: number;
  /** Time optimization weight */
  optimization_weight: number;
}

// Penalty function types
export type PenaltyFunctionType = 'linear' | 'quadratic' | 'exponential' | 'logarithmic';

// Preference constraint handling
export interface PreferenceConstraintHandling {
  /** Paint preference weights */
  paint_preferences: Record<string, number>;
  /** Color preference regions */
  color_preferences: ColorPreferenceRegion[];
  /** Mixing complexity preferences */
  complexity_preferences: ComplexityPreference;
}

// Color preference regions
export interface ColorPreferenceRegion {
  /** Region center in LAB space */
  center: LABColor;
  /** Region radius */
  radius: number;
  /** Preference weight */
  weight: number;
  /** Region description */
  description: string;
}

// Mixing complexity preferences
export interface ComplexityPreference {
  /** Preferred number of components */
  preferred_component_count: number;
  /** Maximum complexity tolerance */
  max_complexity_score: number;
  /** Simplicity reward weight */
  simplicity_weight: number;
}

// Constraint violation tolerance
export interface ConstraintViolationTolerance {
  /** Volume constraint tolerance */
  volume_tolerance_ml: number;
  /** Color constraint tolerance */
  color_tolerance_delta_e: number;
  /** Cost constraint tolerance */
  cost_tolerance_percentage: number;
  /** Time constraint tolerance */
  time_tolerance_percentage: number;
}

// Caching configuration
export interface CachingConfiguration {
  /** Enable result caching */
  enable_caching: boolean;
  /** Cache size limit */
  max_cache_entries: number;
  /** Cache expiration time */
  cache_expiration_hours: number;
  /** Cache key strategy */
  key_strategy: CacheKeyStrategy;
  /** Cache invalidation rules */
  invalidation_rules: CacheInvalidationRule[];
}

// Cache key strategies
export type CacheKeyStrategy = 'exact_match' | 'fuzzy_match' | 'parameter_hash' | 'composite';

// Cache invalidation rules
export interface CacheInvalidationRule {
  /** Rule trigger */
  trigger: CacheInvalidationTrigger;
  /** Rule action */
  action: CacheInvalidationAction;
  /** Rule parameters */
  parameters: Record<string, any>;
}

// Cache invalidation triggers and actions
export type CacheInvalidationTrigger = 'time_based' | 'usage_based' | 'parameter_change';
export type CacheInvalidationAction = 'remove_entry' | 'mark_stale' | 'refresh';

// Monitoring configuration
export interface MonitoringConfiguration {
  /** Enable performance monitoring */
  enable_monitoring: boolean;
  /** Monitoring level */
  monitoring_level: MonitoringLevel;
  /** Performance metrics to track */
  tracked_metrics: PerformanceMetricType[];
  /** Logging configuration */
  logging_config: LoggingConfiguration;
  /** Alert configuration */
  alert_config: AlertConfiguration;
}

// Monitoring levels
export type MonitoringLevel = 'minimal' | 'standard' | 'detailed' | 'debug';

// Performance metric types
export type PerformanceMetricType =
  | 'execution_time'
  | 'memory_usage'
  | 'convergence_rate'
  | 'solution_quality'
  | 'function_evaluations'
  | 'cache_hit_rate';

// Logging configuration
export interface LoggingConfiguration {
  /** Log level */
  log_level: LogLevel;
  /** Log destinations */
  destinations: LogDestination[];
  /** Log rotation settings */
  rotation_settings: LogRotationSettings;
}

// Log levels and destinations
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';
export type LogDestination = 'console' | 'file' | 'database' | 'remote';

// Log rotation settings
export interface LogRotationSettings {
  /** Maximum log file size */
  max_file_size_mb: number;
  /** Number of files to retain */
  retain_files: number;
  /** Rotation interval */
  rotation_interval: RotationInterval;
}

// Rotation intervals
export type RotationInterval = 'hourly' | 'daily' | 'weekly' | 'monthly';

// Alert configuration
export interface AlertConfiguration {
  /** Enable alerts */
  enabled: boolean;
  /** Alert thresholds */
  thresholds: AlertThreshold[];
  /** Alert destinations */
  destinations: AlertDestination[];
}

// Alert thresholds
export interface AlertThreshold {
  /** Metric to monitor */
  metric: PerformanceMetricType;
  /** Threshold value */
  threshold_value: number;
  /** Comparison operator */
  operator: ComparisonOperator;
  /** Alert severity */
  severity: AlertSeverity;
}

// Comparison operators and alert severity
export type ComparisonOperator = 'greater_than' | 'less_than' | 'equal_to' | 'not_equal_to';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

// Alert destinations
export type AlertDestination = 'console' | 'email' | 'webhook' | 'database';

// Optimization engine state
export interface OptimizationEngineState {
  /** Current state */
  current_state: EngineState;
  /** Active optimizations */
  active_optimizations: ActiveOptimization[];
  /** Engine statistics */
  statistics: EngineStatistics;
  /** Resource usage */
  resource_usage: ResourceUsage;
}

// Engine states
export type EngineState = 'idle' | 'initializing' | 'optimizing' | 'finalizing' | 'error';

// Active optimization tracking
export interface ActiveOptimization {
  /** Optimization ID */
  id: string;
  /** Method being used */
  method: string;
  /** Start time */
  started_at: Date;
  /** Current progress */
  progress: OptimizationProgress;
  /** Current best solution */
  current_best: OptimizationSolution;
  /** Resource usage */
  resource_usage: ResourceUsage;
}

// Optimization progress tracking
export interface OptimizationProgress {
  /** Current iteration */
  current_iteration: number;
  /** Maximum iterations */
  max_iterations: number;
  /** Progress percentage */
  progress_percentage: number;
  /** Estimated time remaining */
  estimated_time_remaining_ms: number;
  /** Convergence status */
  convergence_status: ConvergenceStatus;
}

// Convergence status
export type ConvergenceStatus = 'not_started' | 'converging' | 'converged' | 'stalled' | 'failed';

// Optimization solution representation
export interface OptimizationSolution {
  /** Solution ID */
  id: string;
  /** Paint volumes (indexed by paint_id) */
  paint_volumes: Record<string, number>;
  /** Objective function value (Delta E) */
  objective_value: number;
  /** Constraint violations */
  constraint_violations: ConstraintViolation[];
  /** Solution quality metrics */
  quality_metrics: SolutionQualityMetrics;
  /** Solution timestamp */
  created_at: Date;
}

// Constraint violation tracking
export interface ConstraintViolation {
  /** Constraint identifier */
  constraint_id: string;
  /** Violation type */
  violation_type: ViolationType;
  /** Violation magnitude */
  violation_magnitude: number;
  /** Violation description */
  description: string;
  /** Suggested fix */
  suggested_fix: string;
}

// Violation types
export type ViolationType = 'volume' | 'gamut' | 'cost' | 'time' | 'availability' | 'preference';

// Solution quality metrics
export interface SolutionQualityMetrics {
  /** Color accuracy (Delta E) */
  color_accuracy: number;
  /** Volume constraint satisfaction */
  volume_satisfaction: number;
  /** Cost efficiency */
  cost_efficiency: number;
  /** Mixing complexity */
  mixing_complexity: number;
  /** Overall quality score */
  overall_score: number;
}

// Engine statistics
export interface EngineStatistics {
  /** Total optimizations performed */
  total_optimizations: number;
  /** Successful optimizations */
  successful_optimizations: number;
  /** Average optimization time */
  average_optimization_time_ms: number;
  /** Average solution quality */
  average_solution_quality: number;
  /** Method usage statistics */
  method_usage_stats: Record<string, MethodUsageStats>;
  /** Performance trends */
  performance_trends: PerformanceTrend[];
}

// Method usage statistics
export interface MethodUsageStats {
  /** Usage count */
  usage_count: number;
  /** Success rate */
  success_rate: number;
  /** Average execution time */
  average_execution_time_ms: number;
  /** Average solution quality */
  average_solution_quality: number;
}

// Performance trends
export interface PerformanceTrend {
  /** Trend metric */
  metric: PerformanceMetricType;
  /** Trend direction */
  direction: TrendDirection;
  /** Trend magnitude */
  magnitude: number;
  /** Trend period */
  period_days: number;
}

// Trend directions
export type TrendDirection = 'improving' | 'stable' | 'degrading';

// Resource usage tracking
export interface ResourceUsage {
  /** CPU usage percentage */
  cpu_usage_percentage: number;
  /** Memory usage in MB */
  memory_usage_mb: number;
  /** Active threads */
  active_threads: number;
  /** Web Worker usage */
  web_worker_usage: WebWorkerUsage;
}

// Web Worker usage tracking
export interface WebWorkerUsage {
  /** Number of active workers */
  active_workers: number;
  /** Worker pool size */
  pool_size: number;
  /** Task queue length */
  queue_length: number;
  /** Worker efficiency */
  efficiency_percentage: number;
}

// Optimization performance statistics
export interface OptimizationPerformanceStats {
  /** Total execution time */
  total_execution_time_ms: number;
  /** Average execution time per optimization */
  avg_execution_time_ms: number;
  /** Fastest optimization time */
  fastest_optimization_ms: number;
  /** Slowest optimization time */
  slowest_optimization_ms: number;
  /** Success rate percentage */
  success_rate_percentage: number;
  /** Cache hit rate percentage */
  cache_hit_rate_percentage: number;
  /** Method performance breakdown */
  method_performance: Record<string, MethodPerformanceStats>;
}

// Method-specific performance statistics
export interface MethodPerformanceStats {
  /** Method identifier */
  method_id: string;
  /** Usage count */
  usage_count: number;
  /** Success count */
  success_count: number;
  /** Average execution time */
  avg_execution_time_ms: number;
  /** Average solution quality */
  avg_solution_quality: number;
  /** Best solution quality achieved */
  best_solution_quality: number;
  /** Convergence statistics */
  convergence_stats: ConvergenceStats;
}

// Convergence statistics
export interface ConvergenceStats {
  /** Average convergence time */
  avg_convergence_time_ms: number;
  /** Convergence rate */
  convergence_rate_percentage: number;
  /** Average iterations to convergence */
  avg_iterations_to_convergence: number;
  /** Convergence consistency */
  consistency_score: number;
}

// Type guards for optimization types
export const isOptimizationMethod = (obj: any): obj is OptimizationMethod => {
  return typeof obj === 'object' &&
    typeof obj.method_id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.algorithm_family === 'string' &&
    typeof obj.suitable_for === 'object' &&
    typeof obj.performance_profile === 'object';
};

export const isOptimizationSolution = (obj: any): obj is OptimizationSolution => {
  return typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.paint_volumes === 'object' &&
    typeof obj.objective_value === 'number' &&
    Array.isArray(obj.constraint_violations);
};

export const isAccuracyOptimizationEngine = (obj: any): obj is AccuracyOptimizationEngine => {
  return typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    Array.isArray(obj.supported_methods) &&
    obj.supported_methods.every(isOptimizationMethod) &&
    typeof obj.config === 'object' &&
    typeof obj.state === 'object';
};