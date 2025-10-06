/**
 * Differential Evolution Optimizer (T012, T023)
 *
 * Enhanced Differential Evolution algorithm for color mixing optimization
 * targeting Delta E ≤ 2.0 with asymmetric volume ratios and milliliter precision.
 * Optimized for paint mixing applications with volume constraints and cost optimization.
 *
 * Based on Storn & Price differential evolution with enhancements for
 * constrained optimization and early convergence detection.
 *
 * Server-side compatible: NO Web Worker API dependencies.
 */

import {
  EnhancedOptimizationRequest,
  OptimizedPaintFormula,
  OptimizationPerformanceMetrics,
  PaintRatio
} from '@/lib/types';
import {
  LABColor,
  OptimizationPaint,
  ColorOptimizationResult
} from '@/lib/types';

// TODO: Define these types properly
type OptimizationConstraints = any;
type OptimizationObjective = any;
type ConvergenceMetrics = any;
type OptimizationResult = ColorOptimizationResult;
import { calculateCIEDE2000 } from '../color-science/delta-e-ciede2000';
import { mixLABColors } from '../color-science/lab-enhanced';

// Differential Evolution specific constants
export const DE_CONSTANTS = {
  // Population parameters
  MIN_POPULATION_SIZE: 20,
  MAX_POPULATION_SIZE: 200,
  POPULATION_MULTIPLIER: 10,        // Population size = dimensions × multiplier

  // DE parameters
  DEFAULT_F: 0.8,                   // Differential weight (scaling factor)
  DEFAULT_CR: 0.9,                  // Crossover probability
  F_MIN: 0.1,
  F_MAX: 2.0,
  CR_MIN: 0.0,
  CR_MAX: 1.0,

  // Convergence parameters
  MAX_ITERATIONS: 1000,
  MAX_STAGNATION: 50,               // Iterations without improvement
  CONVERGENCE_TOLERANCE: 1e-6,      // Fitness improvement threshold
  TARGET_FITNESS: 0.0001,           // Stop when fitness is very good

  // Constraint handling
  PENALTY_FACTOR: 1000.0,           // Penalty for constraint violations
  CONSTRAINT_TOLERANCE: 1e-6,       // Tolerance for constraint satisfaction

  // Precision parameters
  VOLUME_PRECISION: 0.1,            // Milliliter precision
  MIN_VOLUME_RATIO: 0.001,          // Minimum 0.1% volume ratio
  MAX_VOLUME_RATIO: 0.999,          // Maximum 99.9% volume ratio

  // Performance optimization
  EARLY_STOP_PATIENCE: 20,          // Early stopping patience
  ADAPTIVE_PARAMETERS: true,        // Enable adaptive F and CR
  ELITE_FRACTION: 0.1               // Fraction of elite individuals to preserve
} as const;

// DE strategy types
export type DEStrategy =
  | 'DE/rand/1/bin'        // Classic strategy
  | 'DE/best/1/bin'        // Best individual strategy
  | 'DE/current-to-best/1' // Current-to-best strategy
  | 'DE/rand/2/bin'        // Two-difference strategy
  | 'DE/best/2/bin'        // Best with two differences
  | 'adaptive';            // Adaptive strategy selection

// Individual in DE population
export interface DEIndividual {
  /** Decision variables (volume ratios) */
  variables: number[];
  /** Objective function value */
  fitness: number;
  /** Constraint violation measure */
  constraint_violation: number;
  /** Feasibility flag */
  is_feasible: boolean;
  /** Age (generations since creation) */
  age: number;
  /** Improvement history */
  improvement_history: number[];
}

// DE population
export interface DEPopulation {
  /** All individuals */
  individuals: DEIndividual[];
  /** Best individual found so far */
  best_individual: DEIndividual;
  /** Current generation number */
  generation: number;
  /** Population statistics */
  statistics: PopulationStatistics;
}

// Population statistics
export interface PopulationStatistics {
  /** Mean fitness */
  mean_fitness: number;
  /** Best fitness */
  best_fitness: number;
  /** Worst fitness */
  worst_fitness: number;
  /** Fitness standard deviation */
  fitness_std: number;
  /** Diversity measure */
  diversity: number;
  /** Feasible individuals count */
  feasible_count: number;
}

// DE optimization configuration
export interface DEConfig {
  /** DE strategy to use */
  strategy: DEStrategy;
  /** Population size (0 = auto-calculate) */
  population_size: number;
  /** Differential weight (scaling factor) */
  F: number;
  /** Crossover probability */
  CR: number;
  /** Maximum iterations */
  max_iterations: number;
  /** Maximum stagnation generations */
  max_stagnation: number;
  /** Convergence tolerance */
  convergence_tolerance: number;
  /** Enable adaptive parameters */
  adaptive_parameters: boolean;
  /** Random seed for reproducibility */
  random_seed?: number;
  /** Performance budget in milliseconds */
  time_budget_ms?: number;
}

// Differential Evolution optimizer class
export class DifferentialEvolutionOptimizer {
  private config!: DEConfig;
  private targetColor!: LABColor;
  private availablePaints!: OptimizationPaint[];
  private constraints!: OptimizationConstraints;
  private objective!: OptimizationObjective;
  private population!: DEPopulation;
  private convergenceHistory!: ConvergenceMetrics[];
  private startTime!: number;
  private rng!: () => number;

  constructor(
    targetColor: LABColor,
    availablePaints: OptimizationPaint[],
    constraints: OptimizationConstraints,
    config: Partial<DEConfig> = {}
  ) {
    this.targetColor = targetColor;
    this.availablePaints = availablePaints;
    this.constraints = constraints;

    // Configure DE parameters
    this.config = {
      strategy: 'adaptive',
      population_size: 0, // Will be calculated
      F: DE_CONSTANTS.DEFAULT_F,
      CR: DE_CONSTANTS.DEFAULT_CR,
      max_iterations: DE_CONSTANTS.MAX_ITERATIONS,
      max_stagnation: DE_CONSTANTS.MAX_STAGNATION,
      convergence_tolerance: DE_CONSTANTS.CONVERGENCE_TOLERANCE,
      adaptive_parameters: DE_CONSTANTS.ADAPTIVE_PARAMETERS,
      ...config
    };

    // Initialize RNG
    this.rng = this.config.random_seed !== undefined
      ? this.createSeededRNG(this.config.random_seed)
      : Math.random;

    // Calculate population size if not specified
    if (this.config.population_size <= 0) {
      this.config.population_size = Math.min(
        DE_CONSTANTS.MAX_POPULATION_SIZE,
        Math.max(DE_CONSTANTS.MIN_POPULATION_SIZE, availablePaints.length * DE_CONSTANTS.POPULATION_MULTIPLIER)
      );
    }

    this.convergenceHistory = [];
    this.startTime = 0;

    // Initialize objective function
    this.objective = this.createObjectiveFunction();
  }

  // Main optimization method
  public optimize(): OptimizationResult {
    this.startTime = Date.now();

    try {
      // Initialize population
      this.initializePopulation();

      // Main evolution loop
      const result = this.evolvePopulation();

      // Convert best individual to result
      return this.createOptimizationResult(result);

    } catch (error) {
      return {
        success: false,
        error_message: `Differential Evolution optimization failed: ${error}`,
        best_individual: null,
        convergence_metrics: this.convergenceHistory,
        computation_time_ms: Date.now() - this.startTime,
        iterations_completed: this.population?.generation || 0
      } as any;
    }
  }

  // Initialize population with diverse individuals
  private initializePopulation(): void {
    const individuals: DEIndividual[] = [];

    for (let i = 0; i < this.config.population_size; i++) {
      const variables = this.generateRandomIndividual();
      const fitness = this.evaluateFitness(variables);
      const constraintViolation = this.evaluateConstraints(variables);

      individuals.push({
        variables: [...variables],
        fitness: fitness,
        constraint_violation: constraintViolation,
        is_feasible: constraintViolation <= DE_CONSTANTS.CONSTRAINT_TOLERANCE,
        age: 0,
        improvement_history: [fitness]
      });
    }

    // Find best individual
    const bestIdx = this.findBestIndividual(individuals);

    this.population = {
      individuals: individuals,
      best_individual: { ...individuals[bestIdx] },
      generation: 0,
      statistics: this.calculatePopulationStatistics(individuals)
    };
  }

  // Generate random individual (volume ratios)
  private generateRandomIndividual(): number[] {
    const variables: number[] = [];
    let remainingVolume = 1.0;

    // Generate random ratios for all but last paint
    for (let i = 0; i < this.availablePaints.length - 1; i++) {
      const maxRatio = Math.min(
        DE_CONSTANTS.MAX_VOLUME_RATIO,
        remainingVolume - DE_CONSTANTS.MIN_VOLUME_RATIO * (this.availablePaints.length - i - 1)
      );
      const minRatio = DE_CONSTANTS.MIN_VOLUME_RATIO;

      if (maxRatio <= minRatio) {
        variables.push(minRatio);
        remainingVolume -= minRatio;
      } else {
        const ratio = minRatio + this.rng() * (maxRatio - minRatio);
        variables.push(ratio);
        remainingVolume -= ratio;
      }
    }

    // Last paint gets remaining volume
    variables.push(Math.max(DE_CONSTANTS.MIN_VOLUME_RATIO, remainingVolume));

    // Normalize to ensure sum = 1
    const sum = variables.reduce((a, b) => a + b, 0);
    return variables.map(v => v / sum);
  }

  // Main evolution loop
  private evolvePopulation(): DEIndividual {
    let stagnationCount = 0;
    let lastBestFitness = this.population.best_individual.fitness;

    while (this.population.generation < this.config.max_iterations) {
      // Check time budget
      if (this.config.time_budget_ms &&
          Date.now() - this.startTime > this.config.time_budget_ms) {
        break;
      }

      // Evolve one generation
      this.evolveGeneration();

      // Update convergence history
      const metrics = this.createConvergenceMetrics();
      this.convergenceHistory.push(metrics);

      // Check for early termination
      if (this.population.best_individual.fitness <= DE_CONSTANTS.TARGET_FITNESS) {
        break;
      }

      // Check for stagnation
      if (Math.abs(this.population.best_individual.fitness - lastBestFitness) < this.config.convergence_tolerance) {
        stagnationCount++;
        if (stagnationCount >= this.config.max_stagnation) {
          break;
        }
      } else {
        stagnationCount = 0;
        lastBestFitness = this.population.best_individual.fitness;
      }

      this.population.generation++;
    }

    return this.population.best_individual;
  }

  // Evolve one generation
  private evolveGeneration(): boolean {
    const newIndividuals: DEIndividual[] = [];
    let improvementCount = 0;

    for (let i = 0; i < this.population.individuals.length; i++) {
      const target = this.population.individuals[i];

      // Generate trial individual
      const trial = this.generateTrialIndividual(i);

      // Selection
      if (this.isTrialBetter(trial, target)) {
        newIndividuals.push(trial);
        improvementCount++;
      } else {
        // Increment age of unchanged individual
        target.age++;
        newIndividuals.push(target);
      }
    }

    // Update population
    this.population.individuals = newIndividuals;
    this.population.statistics = this.calculatePopulationStatistics(newIndividuals);

    // Update best individual
    const bestIdx = this.findBestIndividual(newIndividuals);
    if (this.isTrialBetter(newIndividuals[bestIdx], this.population.best_individual)) {
      this.population.best_individual = { ...newIndividuals[bestIdx] };
    }

    // Adaptive parameter adjustment
    if (this.config.adaptive_parameters) {
      this.adaptParameters(improvementCount / this.population.individuals.length);
    }

    return improvementCount > 0;
  }

  // Generate trial individual using DE strategy
  private generateTrialIndividual(targetIndex: number): DEIndividual {
    const target = this.population.individuals[targetIndex];
    let trial: number[];

    switch (this.config.strategy) {
      case 'DE/rand/1/bin':
        trial = this.deRand1Bin();
        break;
      case 'DE/best/1/bin':
        trial = this.deBest1Bin();
        break;
      case 'DE/current-to-best/1':
        trial = this.deCurrentToBest1(target);
        break;
      case 'DE/rand/2/bin':
        trial = this.deRand2Bin();
        break;
      case 'DE/best/2/bin':
        trial = this.deBest2Bin();
        break;
      case 'adaptive':
      default:
        trial = this.adaptiveStrategy(target);
        break;
    }

    // Apply crossover
    trial = this.applyCrossover(target.variables, trial);

    // Ensure constraints and normalize
    trial = this.repairAndNormalize(trial);

    // Evaluate trial
    const fitness = this.evaluateFitness(trial);
    const constraintViolation = this.evaluateConstraints(trial);

    return {
      variables: trial,
      fitness: fitness,
      constraint_violation: constraintViolation,
      is_feasible: constraintViolation <= DE_CONSTANTS.CONSTRAINT_TOLERANCE,
      age: 0,
      improvement_history: [fitness]
    };
  }

  // DE/rand/1/bin strategy
  private deRand1Bin(): number[] {
    const indices = this.selectRandomIndices(3);
    const [r1, r2, r3] = indices.map(i => this.population.individuals[i].variables);

    const trial: number[] = [];
    for (let j = 0; j < this.availablePaints.length; j++) {
      trial.push(r1[j] + this.config.F * (r2[j] - r3[j]));
    }

    return trial;
  }

  // DE/best/1/bin strategy
  private deBest1Bin(): number[] {
    const indices = this.selectRandomIndices(2);
    const [r1, r2] = indices.map(i => this.population.individuals[i].variables);
    const best = this.population.best_individual.variables;

    const trial: number[] = [];
    for (let j = 0; j < this.availablePaints.length; j++) {
      trial.push(best[j] + this.config.F * (r1[j] - r2[j]));
    }

    return trial;
  }

  // DE/current-to-best/1 strategy
  private deCurrentToBest1(target: DEIndividual): number[] {
    const indices = this.selectRandomIndices(2);
    const [r1, r2] = indices.map(i => this.population.individuals[i].variables);
    const best = this.population.best_individual.variables;
    const current = target.variables;

    const trial: number[] = [];
    for (let j = 0; j < this.availablePaints.length; j++) {
      trial.push(current[j] + this.config.F * (best[j] - current[j]) + this.config.F * (r1[j] - r2[j]));
    }

    return trial;
  }

  // DE/rand/2/bin strategy
  private deRand2Bin(): number[] {
    const indices = this.selectRandomIndices(5);
    const [r1, r2, r3, r4, r5] = indices.map(i => this.population.individuals[i].variables);

    const trial: number[] = [];
    for (let j = 0; j < this.availablePaints.length; j++) {
      trial.push(r1[j] + this.config.F * (r2[j] - r3[j]) + this.config.F * (r4[j] - r5[j]));
    }

    return trial;
  }

  // DE/best/2/bin strategy
  private deBest2Bin(): number[] {
    const indices = this.selectRandomIndices(4);
    const [r1, r2, r3, r4] = indices.map(i => this.population.individuals[i].variables);
    const best = this.population.best_individual.variables;

    const trial: number[] = [];
    for (let j = 0; j < this.availablePaints.length; j++) {
      trial.push(best[j] + this.config.F * (r1[j] - r2[j]) + this.config.F * (r3[j] - r4[j]));
    }

    return trial;
  }

  // Adaptive strategy selection
  private adaptiveStrategy(target: DEIndividual): number[] {
    // Choose strategy based on population diversity and individual performance
    const diversity = this.population.statistics.diversity;
    const relativePerformance = target.fitness / this.population.statistics.mean_fitness;

    if (diversity > 0.5 && relativePerformance > 1.2) {
      // High diversity, poor performance -> exploration
      return this.deRand1Bin();
    } else if (diversity < 0.2) {
      // Low diversity -> exploitation
      return this.deBest1Bin();
    } else {
      // Balanced approach
      return this.deCurrentToBest1(target);
    }
  }

  // Apply crossover operation
  private applyCrossover(target: number[], donor: number[]): number[] {
    const trial: number[] = [];
    const jRand = Math.floor(this.rng() * target.length);

    for (let j = 0; j < target.length; j++) {
      if (this.rng() < this.config.CR || j === jRand) {
        trial.push(donor[j]);
      } else {
        trial.push(target[j]);
      }
    }

    return trial;
  }

  // Repair and normalize trial individual
  private repairAndNormalize(trial: number[]): number[] {
    // Clamp to valid range
    const clamped = trial.map(v => Math.max(DE_CONSTANTS.MIN_VOLUME_RATIO, Math.min(DE_CONSTANTS.MAX_VOLUME_RATIO, v)));

    // Normalize to sum = 1
    const sum = clamped.reduce((a, b) => a + b, 0);
    const normalized = clamped.map(v => v / sum);

    // Apply volume precision
    const precision = DE_CONSTANTS.VOLUME_PRECISION;
    return normalized.map(v => Math.round(v / precision) * precision);
  }

  // Select random indices for mutation
  private selectRandomIndices(count: number): number[] {
    const indices: number[] = [];
    const populationSize = this.population.individuals.length;

    while (indices.length < count) {
      const idx = Math.floor(this.rng() * populationSize);
      if (!indices.includes(idx)) {
        indices.push(idx);
      }
    }

    return indices;
  }

  // Check if trial is better than target
  private isTrialBetter(trial: DEIndividual, target: DEIndividual): boolean {
    // Feasible solutions are always better than infeasible ones
    if (trial.is_feasible && !target.is_feasible) return true;
    if (!trial.is_feasible && target.is_feasible) return false;

    // Both feasible: compare fitness
    if (trial.is_feasible && target.is_feasible) {
      return trial.fitness < target.fitness;
    }

    // Both infeasible: compare constraint violation
    return trial.constraint_violation < target.constraint_violation;
  }

  // Find best individual in population
  private findBestIndividual(individuals: DEIndividual[]): number {
    let bestIdx = 0;

    for (let i = 1; i < individuals.length; i++) {
      if (this.isTrialBetter(individuals[i], individuals[bestIdx])) {
        bestIdx = i;
      }
    }

    return bestIdx;
  }

  // Evaluate fitness function
  private evaluateFitness(variables: number[]): number {
    try {
      // Calculate mixed color
      const colors = this.availablePaints.map(paint => paint.color_space || paint.lab);
      const mixedColor = mixLABColors(colors.filter((c): c is LABColor => c !== undefined), variables);

      // Calculate Delta E
      const deltaE = calculateCIEDE2000(this.targetColor, mixedColor).delta_e;

      // Add cost penalty if specified
      let costPenalty = 0;
      if (this.objective.cost_weight > 0) {
        const totalCost = this.availablePaints.reduce((sum, paint, i) =>
          sum + (paint.cost_per_ml || 0) * variables[i] * this.constraints.volume_constraints.min_total_volume_ml, 0);
        costPenalty = this.objective.cost_weight * totalCost;
      }

      return deltaE + costPenalty;

    } catch {
      return Number.MAX_VALUE; // Invalid solution
    }
  }

  // Evaluate constraint violations
  private evaluateConstraints(variables: number[]): number {
    let violation = 0;

    // Volume ratio constraints
    const sum = variables.reduce((a, b) => a + b, 0);
    violation += Math.abs(sum - 1.0) * DE_CONSTANTS.PENALTY_FACTOR;

    // Individual volume constraints
    for (let i = 0; i < variables.length; i++) {
      if (variables[i] < DE_CONSTANTS.MIN_VOLUME_RATIO) {
        violation += (DE_CONSTANTS.MIN_VOLUME_RATIO - variables[i]) * DE_CONSTANTS.PENALTY_FACTOR;
      }
      if (variables[i] > DE_CONSTANTS.MAX_VOLUME_RATIO) {
        violation += (variables[i] - DE_CONSTANTS.MAX_VOLUME_RATIO) * DE_CONSTANTS.PENALTY_FACTOR;
      }
    }

    // Volume availability constraints
    const totalVolume = this.constraints.volume_constraints.min_total_volume_ml;
    for (let i = 0; i < this.availablePaints.length; i++) {
      const requiredVolume = variables[i] * totalVolume;
      const availableVolume = this.availablePaints[i].available_volume_ml;
      if (availableVolume !== undefined && requiredVolume > availableVolume) {
        violation += (requiredVolume - availableVolume) * DE_CONSTANTS.PENALTY_FACTOR;
      }
    }

    return violation;
  }

  // Calculate population statistics
  private calculatePopulationStatistics(individuals: DEIndividual[]): PopulationStatistics {
    const fitnesses = individuals.map(ind => ind.fitness);
    const meanFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    const bestFitness = Math.min(...fitnesses);
    const worstFitness = Math.max(...fitnesses);

    // Calculate standard deviation
    const variance = fitnesses.reduce((sum, fitness) => sum + Math.pow(fitness - meanFitness, 2), 0) / fitnesses.length;
    const fitnessStd = Math.sqrt(variance);

    // Calculate diversity (average pairwise distance)
    let totalDistance = 0;
    let pairCount = 0;

    for (let i = 0; i < individuals.length - 1; i++) {
      for (let j = i + 1; j < individuals.length; j++) {
        const distance = this.calculateEuclideanDistance(individuals[i].variables, individuals[j].variables);
        totalDistance += distance;
        pairCount++;
      }
    }

    const diversity = pairCount > 0 ? totalDistance / pairCount : 0;
    const feasibleCount = individuals.filter(ind => ind.is_feasible).length;

    return {
      mean_fitness: meanFitness,
      best_fitness: bestFitness,
      worst_fitness: worstFitness,
      fitness_std: fitnessStd,
      diversity: diversity,
      feasible_count: feasibleCount
    };
  }

  // Calculate Euclidean distance between two individuals
  private calculateEuclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  // Adaptive parameter adjustment
  private adaptParameters(successRate: number): void {
    if (!this.config.adaptive_parameters) return;

    // Adjust F based on success rate
    if (successRate > 0.2) {
      // High success rate -> decrease F (more exploitation)
      this.config.F = Math.max(DE_CONSTANTS.F_MIN, this.config.F * 0.95);
    } else if (successRate < 0.05) {
      // Low success rate -> increase F (more exploration)
      this.config.F = Math.min(DE_CONSTANTS.F_MAX, this.config.F * 1.05);
    }

    // Adjust CR based on diversity
    const diversity = this.population.statistics.diversity;
    if (diversity > 0.5) {
      // High diversity -> decrease CR (preserve diversity)
      this.config.CR = Math.max(DE_CONSTANTS.CR_MIN, this.config.CR * 0.98);
    } else if (diversity < 0.1) {
      // Low diversity -> increase CR (promote exploration)
      this.config.CR = Math.min(DE_CONSTANTS.CR_MAX, this.config.CR * 1.02);
    }
  }

  // Create objective function
  private createObjectiveFunction(): OptimizationObjective {
    return {
      primary_metric: 'delta_e',
      target_delta_e: this.constraints.accuracy_target || 2.0,
      cost_weight: 0.1,
      complexity_weight: 0.05,
      availability_weight: 0.1
    };
  }

  // Create convergence metrics
  private createConvergenceMetrics(): ConvergenceMetrics {
    return {
      generation: this.population.generation,
      best_fitness: this.population.best_individual.fitness,
      mean_fitness: this.population.statistics.mean_fitness,
      fitness_std: this.population.statistics.fitness_std,
      diversity: this.population.statistics.diversity,
      feasible_ratio: this.population.statistics.feasible_count / this.population.individuals.length,
      convergence_rate: this.convergenceHistory.length > 1
        ? this.convergenceHistory[this.convergenceHistory.length - 1].best_fitness - this.convergenceHistory[0].best_fitness
        : 0,
      elapsed_time_ms: Date.now() - this.startTime
    };
  }

  // Create final optimization result
  private createOptimizationResult(bestIndividual: DEIndividual): OptimizationResult {
    const colors = this.availablePaints.map(paint => paint.color_space || paint.lab);
    const mixedColor = mixLABColors(colors.filter((c): c is LABColor => c !== undefined), bestIndividual.variables);
    const deltaE = calculateCIEDE2000(this.targetColor, mixedColor);

    return {
      success: true,
      error_message: undefined,
      best_individual: {
        variables: bestIndividual.variables,
        fitness: bestIndividual.fitness,
        constraint_violation: bestIndividual.constraint_violation,
        mixed_color: mixedColor,
        achieved_delta_e: deltaE.delta_e,
        cost_estimate: this.calculateCost(bestIndividual.variables),
        feasible: bestIndividual.is_feasible
      },
      convergence_metrics: this.convergenceHistory,
      computation_time_ms: Date.now() - this.startTime,
      iterations_completed: this.population.generation
    } as any;
  }

  // Calculate total cost for solution
  private calculateCost(variables: number[]): number {
    const totalVolume = this.constraints.volume_constraints.min_total_volume_ml;
    return this.availablePaints.reduce((sum, paint, i) =>
      sum + (paint.cost_per_ml || 0) * variables[i] * totalVolume, 0);
  }

  // Create seeded random number generator
  private createSeededRNG(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % Math.pow(2, 32);
      return state / Math.pow(2, 32);
    };
  }
}

// Factory function to create DE optimizer
export const createDifferentialEvolutionOptimizer = (
  targetColor: LABColor,
  availablePaints: OptimizationPaint[],
  constraints: OptimizationConstraints,
  config?: Partial<DEConfig>
): DifferentialEvolutionOptimizer => {
  return new DifferentialEvolutionOptimizer(targetColor, availablePaints, constraints, config);
};

// Utility function for quick optimization
export const optimizeWithDE = (
  targetColor: LABColor,
  availablePaints: OptimizationPaint[],
  constraints: OptimizationConstraints,
  config?: Partial<DEConfig>
): OptimizationResult => {
  const optimizer = createDifferentialEvolutionOptimizer(targetColor, availablePaints, constraints, config);
  return optimizer.optimize();
};

// ============================================================================
// SERVER-SIDE OPTIMIZATION FUNCTION (T012)
// ============================================================================

/**
 * Server-side differential evolution optimization for Enhanced Accuracy Mode.
 *
 * This function is compatible with Vercel serverless functions and has NO
 * Web Worker API dependencies (no postMessage, self, importScripts, etc.).
 *
 * Algorithm Parameters (from research.md):
 * - Population size: 10 × number of paints
 * - Mutation factor (F): 0.8
 * - Crossover rate (CR): 0.7
 * - Convergence: When improvement < 1% for 50 iterations OR timeout
 * - Constraint handling: Reject solutions with paint ratios outside [0,1] or sum ≠ 1.0
 *
 * @param request - Enhanced optimization request with target color, paints, and constraints
 * @returns Promise resolving to optimized formula and performance metrics
 *
 * @example
 * ```typescript
 * const result = await optimizeWithDifferentialEvolution({
 *   targetColor: { l: 65, a: 18, b: -5 },
 *   availablePaints: userPaints,
 *   mode: 'enhanced',
 *   maxPaintCount: 5,
 *   timeLimit: 28000,
 *   accuracyTarget: 2.0
 * });
 *
 * logger.info(result.formula.deltaE); // Delta E ≤ 2.0
 * logger.info(result.metrics.convergenceAchieved); // true/false
 * ```
 */
export async function optimizeWithDifferentialEvolution(
  request: EnhancedOptimizationRequest
): Promise<{
  formula: OptimizedPaintFormula;
  metrics: OptimizationPerformanceMetrics;
}> {
  const startTime = Date.now();
  const timeLimit = request.timeLimit || 28000; // Default 28 seconds (2s buffer before 30s Vercel timeout)
  const accuracyTarget = request.accuracyTarget || (request.mode === 'enhanced' ? 2.0 : 5.0);
  const maxPaintCount = request.maxPaintCount || 5;

  // Validate inputs
  if (request.availablePaints.length < 2) {
    throw new Error('At least 2 paints required for optimization');
  }
  if (maxPaintCount < 2 || maxPaintCount > 5) {
    throw new Error('maxPaintCount must be between 2 and 5');
  }

  // Convert Paint[] to OptimizationPaint[] for compatibility with existing optimizer
  const optimizationPaints: OptimizationPaint[] = request.availablePaints.map(paint => ({
    id: paint.id,
    name: paint.name,
    brand: paint.brand,
    lab: paint.color.lab,
    color_space: paint.color.lab,
    k_coefficient: paint.kubelkaMunk.k,
    s_coefficient: paint.kubelkaMunk.s,
    tinting_strength: paint.tintingStrength,
    available_volume_ml: 1000, // Assume unlimited for now
    cost_per_ml: 0.1, // Placeholder cost
    opacity: paint.opacity,
    pigment_properties: {
      scattering_coefficient: paint.kubelkaMunk.s,
      absorption_coefficient: paint.kubelkaMunk.k,
      surface_reflection: 0.04,
      pigment_density: 1.0,
      lightfastness_rating: 7,
      composition_category: 'synthetic'
    }
  }));

  // Create constraints object
  const constraints: OptimizationConstraints = {
    volume_constraints: request.volumeConstraints || {
      min_total_volume_ml: 100,
      max_total_volume_ml: 500,
      allow_scaling: true,
      minimum_component_volume_ml: 1,
      maximum_component_volume_ml: 500
    },
    accuracy_target: accuracyTarget,
    max_paint_count: maxPaintCount
  };

  // Configure DE optimizer
  const populationSize = Math.min(
    DE_CONSTANTS.MAX_POPULATION_SIZE,
    Math.max(DE_CONSTANTS.MIN_POPULATION_SIZE, optimizationPaints.length * DE_CONSTANTS.POPULATION_MULTIPLIER)
  );

  const deConfig: Partial<DEConfig> = {
    strategy: 'adaptive',
    population_size: populationSize,
    F: 0.8, // Mutation factor from research.md
    CR: 0.7, // Crossover rate from research.md
    max_iterations: 1000,
    max_stagnation: 50, // Convergence threshold from research.md
    convergence_tolerance: 0.01, // 1% improvement threshold
    adaptive_parameters: true,
    time_budget_ms: timeLimit
  };

  // Track initial best Delta E for improvement rate calculation
  let initialBestDeltaE = Number.MAX_VALUE;
  let iterationsCompleted = 0;
  let convergenceAchieved = false;

  try {
    // Run differential evolution optimization
    const optimizer = new DifferentialEvolutionOptimizer(
      request.targetColor,
      optimizationPaints,
      constraints,
      deConfig
    );

    const result = optimizer.optimize();

    // Extract results from ColorOptimizationResult
    const typedResult = result as any; // Type assertion for compatibility with legacy type
    const bestSolution = typedResult.best_individual;
    if (!bestSolution) {
      throw new Error('Optimization failed to produce a solution');
    }

    iterationsCompleted = typedResult.iterations_completed || 0;
    const finalBestDeltaE = bestSolution.achieved_delta_e;
    initialBestDeltaE = typedResult.convergence_metrics?.[0]?.best_fitness || finalBestDeltaE;

    // Calculate convergence based on target achievement
    convergenceAchieved = finalBestDeltaE <= accuracyTarget;

    // Convert solution to paint ratios
    const paintRatios: PaintRatio[] = bestSolution.variables
      .map((ratio: number, index: number) => ({
        paint_id: optimizationPaints[index].id,
        paint_name: optimizationPaints[index].name,
        volume_ml: ratio * (constraints.volume_constraints.min_total_volume_ml || 100),
        percentage: ratio * 100,
        paint_properties: request.availablePaints[index]
      }))
      .filter((ratio: any) => ratio.percentage > 0.1) // Filter out negligible components
      .sort((a: any, b: any) => b.percentage - a.percentage) // Sort by percentage descending
      .slice(0, maxPaintCount); // Limit to maxPaintCount

    // Normalize percentages to sum to 100
    const totalPercentage = paintRatios.reduce((sum, r) => sum + r.percentage, 0);
    paintRatios.forEach((r: any) => {
      r.percentage = (r.percentage / totalPercentage) * 100;
      r.volume_ml = (r.percentage / 100) * (constraints.volume_constraints.min_total_volume_ml || 100);
    });

    // Calculate total volume
    const totalVolume = paintRatios.reduce((sum, r) => sum + r.volume_ml, 0);

    // Determine accuracy rating
    let accuracyRating: 'excellent' | 'good' | 'acceptable' | 'poor';
    if (finalBestDeltaE <= 2.0) accuracyRating = 'excellent';
    else if (finalBestDeltaE <= 4.0) accuracyRating = 'good';
    else if (finalBestDeltaE <= 6.0) accuracyRating = 'acceptable';
    else accuracyRating = 'poor';

    // Determine mixing complexity
    let mixingComplexity: 'simple' | 'moderate' | 'complex';
    if (paintRatios.length <= 2) mixingComplexity = 'simple';
    else if (paintRatios.length <= 3) mixingComplexity = 'moderate';
    else mixingComplexity = 'complex';

    // Calculate weighted average Kubelka-Munk coefficients
    const totalK = paintRatios.reduce((sum, r: any) =>
      sum + (r.paint_properties?.kubelkaMunk.k || 0) * (r.percentage / 100), 0);
    const totalS = paintRatios.reduce((sum, r: any) =>
      sum + (r.paint_properties?.kubelkaMunk.s || 0) * (r.percentage / 100), 0);
    const avgOpacity = paintRatios.reduce((sum, r: any) =>
      sum + (r.paint_properties?.opacity || 0.8) * (r.percentage / 100), 0);

    // Build formula
    const formula: OptimizedPaintFormula = {
      paintRatios,
      totalVolume,
      predictedColor: bestSolution.mixed_color,
      deltaE: finalBestDeltaE,
      accuracyRating,
      mixingComplexity,
      kubelkaMunkK: totalK,
      kubelkaMunkS: totalS,
      opacity: avgOpacity
    };

    // Build metrics
    const timeElapsed = Date.now() - startTime;
    const earlyTermination = timeElapsed >= timeLimit;
    const targetMet = finalBestDeltaE <= accuracyTarget;
    const improvementRate = initialBestDeltaE > 0
      ? (initialBestDeltaE - finalBestDeltaE) / initialBestDeltaE
      : 0;

    const metrics: OptimizationPerformanceMetrics = {
      timeElapsed,
      iterationsCompleted,
      algorithmUsed: 'differential_evolution',
      convergenceAchieved,
      targetMet,
      earlyTermination,
      initialBestDeltaE,
      finalBestDeltaE,
      improvementRate
    };

    return { formula, metrics };

  } catch (error) {
    // Handle optimization errors gracefully
    const timeElapsed = Date.now() - startTime;

    throw new Error(
      `Differential Evolution optimization failed after ${timeElapsed}ms: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}