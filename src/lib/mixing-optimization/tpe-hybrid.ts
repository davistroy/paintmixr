/**
 * TPE Hybrid Refinement (T024)
 *
 * Tree-structured Parzen Estimator (TPE) hybrid refinement algorithm for
 * enhanced color accuracy optimization. Works in conjunction with Differential
 * Evolution to achieve Delta E ≤ 2.0 with intelligent parameter space exploration.
 *
 * Based on Bergstra et al. TPE algorithm with modifications for paint mixing
 * constraints and continuous optimization space refinement.
 */

import { Matrix } from 'ml-matrix';
import { LABColor, VolumeConstraints, OptimizationPaint } from '../../types/mixing';
import {
  OptimizationMethod,
  OptimizationResult,
  OptimizationConstraints,
  OptimizationObjective,
  OptimizationParameters,
  ConvergenceMetrics
} from '../../types/optimization';
import { calculateCIEDE2000 } from '../color-science/delta-e-ciede2000';
import { mixLABColors } from '../color-science/lab-enhanced';

// TPE specific constants
export const TPE_CONSTANTS = {
  // Algorithm parameters
  MIN_SAMPLES_FOR_TPE: 20,          // Minimum samples before TPE kicks in
  GOOD_SAMPLES_RATIO: 0.15,         // Top 15% samples for good distribution
  N_STARTUP_JOBS: 10,               // Random samples before TPE
  N_EI_CANDIDATES: 24,              // Expected improvement candidates

  // Gaussian mixture parameters
  DEFAULT_BANDWIDTH: 0.1,           // KDE bandwidth
  MIN_BANDWIDTH: 0.01,              // Minimum bandwidth
  MAX_BANDWIDTH: 1.0,               // Maximum bandwidth
  BANDWIDTH_FACTOR: 1.0,            // Bandwidth scaling factor

  // Acquisition function parameters
  XI_EXPLORATION: 0.01,             // Exploration parameter for EI
  KAPPA_UCB: 2.576,                 // UCB confidence parameter (99%)
  ALPHA_QUANTILE: 0.1,              // Quantile for probability improvement

  // Optimization parameters
  MAX_ITERATIONS: 500,              // Maximum TPE iterations
  CONVERGENCE_PATIENCE: 25,         // Patience for convergence
  IMPROVEMENT_THRESHOLD: 1e-6,      // Minimum improvement threshold

  // Hybrid parameters
  DE_TO_TPE_TRANSITION: 0.3,        // Transition ratio (30% DE, 70% TPE)
  REFINEMENT_RADIUS: 0.2,           // Search radius around DE solution
  LOCAL_SEARCH_ITERATIONS: 50,      // Local refinement iterations

  // Precision parameters
  VOLUME_PRECISION: 0.1,            // Milliliter precision
  PARAMETER_PRECISION: 1e-6,        // Parameter precision
  FITNESS_PRECISION: 1e-8           // Fitness precision
} as const;

// TPE sample point
export interface TPESample {
  /** Parameter values */
  parameters: number[];
  /** Objective function value */
  value: number;
  /** Constraint violation measure */
  constraint_violation: number;
  /** Sample quality (good/bad) */
  is_good: boolean;
  /** Sample weight for distribution fitting */
  weight: number;
  /** Iteration when sample was generated */
  iteration: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

// Gaussian component for mixture model
export interface GaussianComponent {
  /** Mean vector */
  mean: number[];
  /** Covariance matrix */
  covariance: Matrix;
  /** Component weight */
  weight: number;
  /** Bandwidth parameters */
  bandwidth: number[];
}

// TPE distributions
export interface TPEDistribution {
  /** Good samples distribution (l(x)) */
  good_distribution: GaussianComponent[];
  /** Bad samples distribution (g(x)) */
  bad_distribution: GaussianComponent[];
  /** Number of samples used */
  n_samples: number;
  /** Distribution quality score */
  quality_score: number;
}

// Expected Improvement result
export interface EIResult {
  /** Expected improvement value */
  ei_value: number;
  /** Predicted mean */
  predicted_mean: number;
  /** Predicted variance */
  predicted_variance: number;
  /** Improvement probability */
  improvement_probability: number;
  /** Confidence interval */
  confidence_interval: [number, number];
}

// TPE optimization configuration
export interface TPEConfig {
  /** Number of startup samples */
  n_startup_samples: number;
  /** Ratio of good samples */
  good_samples_ratio: number;
  /** Number of EI candidates per iteration */
  n_ei_candidates: number;
  /** Bandwidth for KDE */
  bandwidth: number;
  /** Acquisition function type */
  acquisition_function: 'ei' | 'pi' | 'ucb' | 'adaptive';
  /** Maximum iterations */
  max_iterations: number;
  /** Convergence patience */
  convergence_patience: number;
  /** Random seed */
  random_seed?: number;
  /** Enable local refinement */
  enable_local_refinement: boolean;
}

// TPE Hybrid optimizer class
export class TPEHybridOptimizer {
  private config: TPEConfig;
  private targetColor: LABColor;
  private availablePaints: OptimizationPaint[];
  private constraints: OptimizationConstraints;
  private objective: OptimizationObjective;
  private samples: TPESample[];
  private bestSample: TPESample | null;
  private convergenceHistory: ConvergenceMetrics[];
  private currentDistribution: TPEDistribution | null;
  private startTime: number;
  private rng: () => number;

  constructor(
    targetColor: LABColor,
    availablePaints: OptimizationPaint[],
    constraints: OptimizationConstraints,
    config: Partial<TPEConfig> = {}
  ) {
    this.targetColor = targetColor;
    this.availablePaints = availablePaints;
    this.constraints = constraints;

    // Configure TPE parameters
    this.config = {
      n_startup_samples: TPE_CONSTANTS.N_STARTUP_JOBS,
      good_samples_ratio: TPE_CONSTANTS.GOOD_SAMPLES_RATIO,
      n_ei_candidates: TPE_CONSTANTS.N_EI_CANDIDATES,
      bandwidth: TPE_CONSTANTS.DEFAULT_BANDWIDTH,
      acquisition_function: 'ei',
      max_iterations: TPE_CONSTANTS.MAX_ITERATIONS,
      convergence_patience: TPE_CONSTANTS.CONVERGENCE_PATIENCE,
      enable_local_refinement: true,
      ...config
    };

    // Initialize RNG
    this.rng = this.config.random_seed !== undefined
      ? this.createSeededRNG(this.config.random_seed)
      : Math.random;

    this.samples = [];
    this.bestSample = null;
    this.convergenceHistory = [];
    this.currentDistribution = null;
    this.startTime = 0;

    // Initialize objective function
    this.objective = this.createObjectiveFunction();
  }

  // Main optimization method
  public optimize(initialSamples?: TPESample[]): OptimizationResult {
    this.startTime = Date.now();

    try {
      // Initialize with provided samples or generate startup samples
      if (initialSamples && initialSamples.length > 0) {
        this.samples = [...initialSamples];
        this.classifySamples();
      } else {
        this.generateStartupSamples();
      }

      // Main TPE optimization loop
      const result = this.runTPEOptimization();

      // Apply local refinement if enabled
      if (this.config.enable_local_refinement && this.bestSample) {
        this.applyLocalRefinement();
      }

      // Convert best sample to result
      return this.createOptimizationResult();

    } catch (error) {
      return {
        success: false,
        error_message: `TPE optimization failed: ${error}`,
        best_individual: null,
        convergence_metrics: this.convergenceHistory,
        computation_time_ms: Date.now() - this.startTime,
        iterations_completed: this.samples.length
      };
    }
  }

  // Refine existing DE solution using TPE
  public refineDesolution(deSolution: number[], deRadius: number = TPE_CONSTANTS.REFINEMENT_RADIUS): OptimizationResult {
    this.startTime = Date.now();

    try {
      // Generate samples around DE solution
      this.generateRefinementSamples(deSolution, deRadius);

      // Run TPE with focused search
      const localConfig = { ...this.config };
      localConfig.max_iterations = TPE_CONSTANTS.LOCAL_SEARCH_ITERATIONS;

      const result = this.runTPEOptimization();

      return this.createOptimizationResult();

    } catch (error) {
      return {
        success: false,
        error_message: `TPE refinement failed: ${error}`,
        best_individual: null,
        convergence_metrics: this.convergenceHistory,
        computation_time_ms: Date.now() - this.startTime,
        iterations_completed: this.samples.length
      };
    }
  }

  // Generate startup samples using random sampling
  private generateStartupSamples(): void {
    for (let i = 0; i < this.config.n_startup_samples; i++) {
      const parameters = this.generateRandomParameters();
      const value = this.evaluateObjective(parameters);
      const constraintViolation = this.evaluateConstraints(parameters);

      const sample: TPESample = {
        parameters: [...parameters],
        value: value,
        constraint_violation: constraintViolation,
        is_good: false, // Will be classified later
        weight: 1.0,
        iteration: i
      };

      this.samples.push(sample);
    }

    this.classifySamples();
    this.updateBestSample();
  }

  // Generate refinement samples around DE solution
  private generateRefinementSamples(center: number[], radius: number): void {
    const nSamples = Math.max(this.config.n_startup_samples, TPE_CONSTANTS.MIN_SAMPLES_FOR_TPE);

    for (let i = 0; i < nSamples; i++) {
      const parameters = this.generateParametersAroundCenter(center, radius);
      const value = this.evaluateObjective(parameters);
      const constraintViolation = this.evaluateConstraints(parameters);

      const sample: TPESample = {
        parameters: [...parameters],
        value: value,
        constraint_violation: constraintViolation,
        is_good: false, // Will be classified later
        weight: 1.0,
        iteration: i
      };

      this.samples.push(sample);
    }

    this.classifySamples();
    this.updateBestSample();
  }

  // Main TPE optimization loop
  private runTPEOptimization(): TPESample {
    let patienceCount = 0;
    let lastBestValue = this.bestSample?.value || Infinity;

    for (let iteration = this.samples.length; iteration < this.config.max_iterations; iteration++) {
      // Build TPE distributions if we have enough samples
      if (this.samples.length >= TPE_CONSTANTS.MIN_SAMPLES_FOR_TPE) {
        this.buildTPEDistributions();

        // Generate candidates using acquisition function
        const candidates = this.generateEICandidates();

        // Evaluate best candidate
        const bestCandidate = candidates.reduce((best, current) =>
          current.ei_value > best.ei_value ? current : best);

        // Create new sample
        const newSample = this.createSampleFromCandidate(bestCandidate, iteration);
        this.samples.push(newSample);

      } else {
        // Generate random sample if not enough data for TPE
        const parameters = this.generateRandomParameters();
        const value = this.evaluateObjective(parameters);
        const constraintViolation = this.evaluateConstraints(parameters);

        const newSample: TPESample = {
          parameters: [...parameters],
          value: value,
          constraint_violation: constraintViolation,
          is_good: false,
          weight: 1.0,
          iteration: iteration
        };

        this.samples.push(newSample);
      }

      // Update classifications and best sample
      this.classifySamples();
      const improved = this.updateBestSample();

      // Record convergence metrics
      const metrics = this.createConvergenceMetrics(iteration);
      this.convergenceHistory.push(metrics);

      // Check for convergence
      if (this.bestSample && Math.abs(this.bestSample.value - lastBestValue) < TPE_CONSTANTS.IMPROVEMENT_THRESHOLD) {
        patienceCount++;
        if (patienceCount >= this.config.convergence_patience) {
          break;
        }
      } else {
        patienceCount = 0;
        lastBestValue = this.bestSample?.value || Infinity;
      }

      // Early stopping for very good solutions
      if (this.bestSample && this.bestSample.value <= 0.5) {
        break;
      }
    }

    return this.bestSample || this.samples[0];
  }

  // Build TPE distributions from samples
  private buildTPEDistributions(): void {
    const feasibleSamples = this.samples.filter(s => s.constraint_violation <= TPE_CONSTANTS.PARAMETER_PRECISION);

    if (feasibleSamples.length < TPE_CONSTANTS.MIN_SAMPLES_FOR_TPE) {
      this.currentDistribution = null;
      return;
    }

    // Sort samples by objective value
    const sortedSamples = [...feasibleSamples].sort((a, b) => a.value - b.value);
    const nGood = Math.max(1, Math.floor(sortedSamples.length * this.config.good_samples_ratio));

    const goodSamples = sortedSamples.slice(0, nGood);
    const badSamples = sortedSamples.slice(nGood);

    // Build Gaussian mixture models
    const goodDistribution = this.fitGaussianMixture(goodSamples);
    const badDistribution = this.fitGaussianMixture(badSamples);

    this.currentDistribution = {
      good_distribution: goodDistribution,
      bad_distribution: badDistribution,
      n_samples: feasibleSamples.length,
      quality_score: this.calculateDistributionQuality(goodDistribution, badDistribution)
    };
  }

  // Fit Gaussian mixture model to samples
  private fitGaussianMixture(samples: TPESample[]): GaussianComponent[] {
    if (samples.length === 0) return [];

    const dim = this.availablePaints.length;

    // For small sample sizes, use single Gaussian
    if (samples.length < 5) {
      const mean = this.calculateMean(samples.map(s => s.parameters));
      const covariance = this.calculateCovariance(samples.map(s => s.parameters), mean);
      const bandwidth = this.calculateBandwidth(samples.length, dim);

      return [{
        mean: mean,
        covariance: covariance,
        weight: 1.0,
        bandwidth: new Array(dim).fill(bandwidth)
      }];
    }

    // For larger samples, fit multiple components using EM-like approach
    return this.fitMultipleGaussians(samples);
  }

  // Fit multiple Gaussian components
  private fitMultipleGaussians(samples: TPESample[]): GaussianComponent[] {
    const nComponents = Math.min(3, Math.floor(samples.length / 3));
    const components: GaussianComponent[] = [];

    // Initialize components with k-means-like clustering
    const clusters = this.clusterSamples(samples, nComponents);

    for (const cluster of clusters) {
      if (cluster.length === 0) continue;

      const mean = this.calculateMean(cluster.map(s => s.parameters));
      const covariance = this.calculateCovariance(cluster.map(s => s.parameters), mean);
      const weight = cluster.length / samples.length;
      const bandwidth = this.calculateBandwidth(cluster.length, mean.length);

      components.push({
        mean: mean,
        covariance: covariance,
        weight: weight,
        bandwidth: new Array(mean.length).fill(bandwidth)
      });
    }

    return components;
  }

  // Generate Expected Improvement candidates
  private generateEICandidates(): Array<{ parameters: number[]; ei_value: number }> {
    if (!this.currentDistribution) {
      // Fallback to random candidates
      return Array.from({ length: this.config.n_ei_candidates }, () => ({
        parameters: this.generateRandomParameters(),
        ei_value: this.rng()
      }));
    }

    const candidates: Array<{ parameters: number[]; ei_value: number }> = [];

    for (let i = 0; i < this.config.n_ei_candidates; i++) {
      // Sample from good distribution with some noise
      const parameters = this.sampleFromGoodDistribution();

      // Calculate Expected Improvement
      const ei = this.calculateExpectedImprovement(parameters);

      candidates.push({
        parameters: parameters,
        ei_value: ei.ei_value
      });
    }

    return candidates;
  }

  // Sample parameters from good distribution
  private sampleFromGoodDistribution(): number[] {
    if (!this.currentDistribution || this.currentDistribution.good_distribution.length === 0) {
      return this.generateRandomParameters();
    }

    // Select component based on weights
    const components = this.currentDistribution.good_distribution;
    const totalWeight = components.reduce((sum, comp) => sum + comp.weight, 0);
    const r = this.rng() * totalWeight;

    let cumulativeWeight = 0;
    let selectedComponent = components[0];

    for (const component of components) {
      cumulativeWeight += component.weight;
      if (r <= cumulativeWeight) {
        selectedComponent = component;
        break;
      }
    }

    // Sample from selected Gaussian component
    return this.sampleFromGaussian(selectedComponent);
  }

  // Sample from Gaussian component
  private sampleFromGaussian(component: GaussianComponent): number[] {
    const dim = component.mean.length;
    const sample: number[] = [];

    // Generate independent normal samples (simplified)
    for (let i = 0; i < dim; i++) {
      const u1 = this.rng();
      const u2 = this.rng();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      sample.push(component.mean[i] + z * component.bandwidth[i]);
    }

    return this.normalizeAndClamp(sample);
  }

  // Calculate Expected Improvement
  private calculateExpectedImprovement(parameters: number[]): EIResult {
    if (!this.bestSample) {
      return {
        ei_value: 1.0,
        predicted_mean: 0,
        predicted_variance: 1.0,
        improvement_probability: 1.0,
        confidence_interval: [0, 1]
      };
    }

    const currentBest = this.bestSample.value;

    // Estimate mean and variance using TPE distributions
    const { mean, variance } = this.estimateMeanAndVariance(parameters);

    // Calculate improvement
    const improvement = Math.max(0, currentBest - mean - TPE_CONSTANTS.XI_EXPLORATION);
    const sigma = Math.sqrt(variance);

    let ei = 0;
    let pi = 0;

    if (sigma > 0) {
      const z = improvement / sigma;
      ei = improvement * this.normalCDF(z) + sigma * this.normalPDF(z);
      pi = this.normalCDF(z);
    }

    return {
      ei_value: ei,
      predicted_mean: mean,
      predicted_variance: variance,
      improvement_probability: pi,
      confidence_interval: [mean - 1.96 * sigma, mean + 1.96 * sigma]
    };
  }

  // Estimate mean and variance for parameters
  private estimateMeanAndVariance(parameters: number[]): { mean: number; variance: number } {
    if (!this.currentDistribution) {
      return { mean: 0, variance: 1 };
    }

    // Calculate likelihood ratio l(x)/g(x)
    const goodLikelihood = this.evaluateGaussianMixture(parameters, this.currentDistribution.good_distribution);
    const badLikelihood = this.evaluateGaussianMixture(parameters, this.currentDistribution.bad_distribution);

    const likelihood = badLikelihood > 0 ? goodLikelihood / badLikelihood : goodLikelihood;

    // Estimate based on TPE theory
    const mean = this.bestSample ? this.bestSample.value * (1 - likelihood) : 0;
    const variance = Math.max(0.01, likelihood * (1 - likelihood));

    return { mean, variance };
  }

  // Evaluate Gaussian mixture probability
  private evaluateGaussianMixture(parameters: number[], components: GaussianComponent[]): number {
    if (components.length === 0) return 1e-10;

    let probability = 0;

    for (const component of components) {
      const density = this.evaluateGaussianDensity(parameters, component);
      probability += component.weight * density;
    }

    return Math.max(1e-10, probability);
  }

  // Evaluate Gaussian density
  private evaluateGaussianDensity(parameters: number[], component: GaussianComponent): number {
    const diff = parameters.map((x, i) => x - component.mean[i]);
    const dim = parameters.length;

    // Simplified diagonal covariance
    let quadForm = 0;
    let logDet = 0;

    for (let i = 0; i < dim; i++) {
      const variance = Math.max(1e-6, component.bandwidth[i] * component.bandwidth[i]);
      quadForm += (diff[i] * diff[i]) / variance;
      logDet += Math.log(variance);
    }

    const normalization = -0.5 * (dim * Math.log(2 * Math.PI) + logDet);
    return Math.exp(normalization - 0.5 * quadForm);
  }

  // Apply local refinement around best solution
  private applyLocalRefinement(): void {
    if (!this.bestSample) return;

    const center = this.bestSample.parameters;
    const refinementRadius = 0.05; // 5% local search
    const nRefinementSamples = 20;

    for (let i = 0; i < nRefinementSamples; i++) {
      const parameters = this.generateParametersAroundCenter(center, refinementRadius);
      const value = this.evaluateObjective(parameters);
      const constraintViolation = this.evaluateConstraints(parameters);

      const refinementSample: TPESample = {
        parameters: [...parameters],
        value: value,
        constraint_violation: constraintViolation,
        is_good: false,
        weight: 1.0,
        iteration: this.samples.length
      };

      this.samples.push(refinementSample);
    }

    this.classifySamples();
    this.updateBestSample();
  }

  // Generate random parameters
  private generateRandomParameters(): number[] {
    const parameters: number[] = [];
    let remainingVolume = 1.0;

    for (let i = 0; i < this.availablePaints.length - 1; i++) {
      const maxRatio = remainingVolume - (this.availablePaints.length - i - 1) * 0.001;
      const ratio = 0.001 + this.rng() * (maxRatio - 0.001);
      parameters.push(ratio);
      remainingVolume -= ratio;
    }

    parameters.push(Math.max(0.001, remainingVolume));

    return this.normalizeAndClamp(parameters);
  }

  // Generate parameters around center point
  private generateParametersAroundCenter(center: number[], radius: number): number[] {
    const parameters: number[] = [];

    for (let i = 0; i < center.length; i++) {
      const noise = (this.rng() - 0.5) * 2 * radius;
      parameters.push(center[i] + noise);
    }

    return this.normalizeAndClamp(parameters);
  }

  // Normalize and clamp parameters
  private normalizeAndClamp(parameters: number[]): number[] {
    // Clamp to valid range
    const clamped = parameters.map(v => Math.max(0.001, Math.min(0.999, v)));

    // Normalize to sum = 1
    const sum = clamped.reduce((a, b) => a + b, 0);
    const normalized = clamped.map(v => v / sum);

    // Apply volume precision
    const precision = TPE_CONSTANTS.VOLUME_PRECISION;
    return normalized.map(v => Math.round(v / precision) * precision);
  }

  // Utility methods for statistical calculations
  private calculateMean(points: number[][]): number[] {
    if (points.length === 0) return [];

    const dim = points[0].length;
    const mean = new Array(dim).fill(0);

    for (const point of points) {
      for (let i = 0; i < dim; i++) {
        mean[i] += point[i];
      }
    }

    return mean.map(v => v / points.length);
  }

  private calculateCovariance(points: number[][], mean: number[]): Matrix {
    if (points.length === 0) return Matrix.eye(mean.length);

    const dim = mean.length;
    const cov = Matrix.zeros(dim, dim);

    for (const point of points) {
      const diff = point.map((x, i) => x - mean[i]);
      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
          cov.set(i, j, cov.get(i, j) + diff[i] * diff[j]);
        }
      }
    }

    return cov.div(points.length - 1);
  }

  private calculateBandwidth(nSamples: number, dim: number): number {
    // Scott's rule with modifications
    const bandwidth = Math.pow(nSamples, -1 / (dim + 4)) * TPE_CONSTANTS.BANDWIDTH_FACTOR;
    return Math.max(TPE_CONSTANTS.MIN_BANDWIDTH, Math.min(TPE_CONSTANTS.MAX_BANDWIDTH, bandwidth));
  }

  private clusterSamples(samples: TPESample[], nClusters: number): TPESample[][] {
    // Simplified k-means clustering
    const clusters: TPESample[][] = Array.from({ length: nClusters }, () => []);

    // Initialize cluster centers randomly
    const centers: number[][] = [];
    for (let i = 0; i < nClusters; i++) {
      const randomIndex = Math.floor(this.rng() * samples.length);
      centers.push([...samples[randomIndex].parameters]);
    }

    // Assign samples to closest clusters
    for (const sample of samples) {
      let minDist = Infinity;
      let closestCluster = 0;

      for (let i = 0; i < nClusters; i++) {
        const dist = this.euclideanDistance(sample.parameters, centers[i]);
        if (dist < minDist) {
          minDist = dist;
          closestCluster = i;
        }
      }

      clusters[closestCluster].push(sample);
    }

    return clusters;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  private normalCDF(x: number): number {
    // Approximation of standard normal CDF
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1 + sign * y);
  }

  private normalPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  }

  private calculateDistributionQuality(good: GaussianComponent[], bad: GaussianComponent[]): number {
    // Simple quality measure based on separation
    if (good.length === 0 || bad.length === 0) return 0;

    let totalSeparation = 0;
    let pairCount = 0;

    for (const goodComp of good) {
      for (const badComp of bad) {
        const distance = this.euclideanDistance(goodComp.mean, badComp.mean);
        totalSeparation += distance;
        pairCount++;
      }
    }

    return pairCount > 0 ? totalSeparation / pairCount : 0;
  }

  // Evaluation methods
  private evaluateObjective(parameters: number[]): number {
    try {
      const colors = this.availablePaints.map(paint => paint.color_space);
      const mixedColor = mixLABColors(colors, parameters);
      const deltaE = calculateCIEDE2000(this.targetColor, mixedColor).delta_e;

      // Add cost penalty if specified
      let costPenalty = 0;
      if (this.objective.cost_weight > 0) {
        const totalCost = this.availablePaints.reduce((sum, paint, i) =>
          sum + paint.cost_per_ml * parameters[i] * this.constraints.volume_constraints.min_total_volume_ml, 0);
        costPenalty = this.objective.cost_weight * totalCost;
      }

      return deltaE + costPenalty;

    } catch (error) {
      return Number.MAX_VALUE;
    }
  }

  private evaluateConstraints(parameters: number[]): number {
    let violation = 0;

    // Sum constraint
    const sum = parameters.reduce((a, b) => a + b, 0);
    violation += Math.abs(sum - 1.0);

    // Individual bounds
    for (const param of parameters) {
      if (param < 0.001) violation += 0.001 - param;
      if (param > 0.999) violation += param - 0.999;
    }

    return violation;
  }

  // Sample classification and management
  private classifySamples(): void {
    const feasibleSamples = this.samples.filter(s => s.constraint_violation <= TPE_CONSTANTS.PARAMETER_PRECISION);

    if (feasibleSamples.length < 2) {
      // Not enough samples for classification
      return;
    }

    // Sort by objective value
    const sorted = [...feasibleSamples].sort((a, b) => a.value - b.value);
    const nGood = Math.max(1, Math.floor(sorted.length * this.config.good_samples_ratio));

    // Mark good samples
    for (let i = 0; i < this.samples.length; i++) {
      const sample = this.samples[i];
      const goodIndex = sorted.slice(0, nGood).findIndex(s => s === sample);
      sample.is_good = goodIndex >= 0;
    }
  }

  private updateBestSample(): boolean {
    const feasibleSamples = this.samples.filter(s => s.constraint_violation <= TPE_CONSTANTS.PARAMETER_PRECISION);

    if (feasibleSamples.length === 0) {
      return false;
    }

    const currentBest = feasibleSamples.reduce((best, current) =>
      current.value < best.value ? current : best);

    if (!this.bestSample || currentBest.value < this.bestSample.value) {
      this.bestSample = { ...currentBest };
      return true;
    }

    return false;
  }

  private createSampleFromCandidate(candidate: { parameters: number[]; ei_value: number }, iteration: number): TPESample {
    const value = this.evaluateObjective(candidate.parameters);
    const constraintViolation = this.evaluateConstraints(candidate.parameters);

    return {
      parameters: [...candidate.parameters],
      value: value,
      constraint_violation: constraintViolation,
      is_good: false,
      weight: 1.0,
      iteration: iteration,
      metadata: { ei_value: candidate.ei_value }
    };
  }

  // Result creation methods
  private createObjectiveFunction(): OptimizationObjective {
    return {
      primary_metric: 'delta_e',
      target_delta_e: this.constraints.accuracy_target || 2.0,
      cost_weight: 0.1,
      complexity_weight: 0.05,
      availability_weight: 0.1
    };
  }

  private createConvergenceMetrics(iteration: number): ConvergenceMetrics {
    const feasibleSamples = this.samples.filter(s => s.constraint_violation <= TPE_CONSTANTS.PARAMETER_PRECISION);

    return {
      generation: iteration,
      best_fitness: this.bestSample?.value || Infinity,
      mean_fitness: feasibleSamples.length > 0
        ? feasibleSamples.reduce((sum, s) => sum + s.value, 0) / feasibleSamples.length
        : Infinity,
      fitness_std: this.calculateFitnessStd(feasibleSamples),
      diversity: this.calculateDiversity(feasibleSamples),
      feasible_ratio: feasibleSamples.length / this.samples.length,
      convergence_rate: this.calculateConvergenceRate(),
      elapsed_time_ms: Date.now() - this.startTime
    };
  }

  private calculateFitnessStd(samples: TPESample[]): number {
    if (samples.length < 2) return 0;

    const mean = samples.reduce((sum, s) => sum + s.value, 0) / samples.length;
    const variance = samples.reduce((sum, s) => sum + Math.pow(s.value - mean, 2), 0) / samples.length;

    return Math.sqrt(variance);
  }

  private calculateDiversity(samples: TPESample[]): number {
    if (samples.length < 2) return 0;

    let totalDistance = 0;
    let pairCount = 0;

    for (let i = 0; i < samples.length - 1; i++) {
      for (let j = i + 1; j < samples.length; j++) {
        totalDistance += this.euclideanDistance(samples[i].parameters, samples[j].parameters);
        pairCount++;
      }
    }

    return pairCount > 0 ? totalDistance / pairCount : 0;
  }

  private calculateConvergenceRate(): number {
    if (this.convergenceHistory.length < 2) return 0;

    const firstFitness = this.convergenceHistory[0].best_fitness;
    const lastFitness = this.convergenceHistory[this.convergenceHistory.length - 1].best_fitness;

    return firstFitness - lastFitness;
  }

  private createOptimizationResult(): OptimizationResult {
    if (!this.bestSample) {
      return {
        success: false,
        error_message: 'No feasible solution found',
        best_individual: null,
        convergence_metrics: this.convergenceHistory,
        computation_time_ms: Date.now() - this.startTime,
        iterations_completed: this.samples.length
      };
    }

    const colors = this.availablePaints.map(paint => paint.color_space);
    const mixedColor = mixLABColors(colors, this.bestSample.parameters);
    const deltaE = calculateCIEDE2000(this.targetColor, mixedColor);

    return {
      success: true,
      error_message: null,
      best_individual: {
        variables: this.bestSample.parameters,
        fitness: this.bestSample.value,
        constraint_violation: this.bestSample.constraint_violation,
        mixed_color: mixedColor,
        achieved_delta_e: deltaE.delta_e,
        cost_estimate: this.calculateCost(this.bestSample.parameters),
        feasible: this.bestSample.constraint_violation <= TPE_CONSTANTS.PARAMETER_PRECISION
      },
      convergence_metrics: this.convergenceHistory,
      computation_time_ms: Date.now() - this.startTime,
      iterations_completed: this.samples.length
    };
  }

  private calculateCost(parameters: number[]): number {
    const totalVolume = this.constraints.volume_constraints.min_total_volume_ml;
    return this.availablePaints.reduce((sum, paint, i) =>
      sum + paint.cost_per_ml * parameters[i] * totalVolume, 0);
  }

  private createSeededRNG(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % Math.pow(2, 32);
      return state / Math.pow(2, 32);
    };
  }
}

// Factory functions
export const createTPEHybridOptimizer = (
  targetColor: LABColor,
  availablePaints: OptimizationPaint[],
  constraints: OptimizationConstraints,
  config?: Partial<TPEConfig>
): TPEHybridOptimizer => {
  return new TPEHybridOptimizer(targetColor, availablePaints, constraints, config);
};

export const optimizeWithTPE = (
  targetColor: LABColor,
  availablePaints: OptimizationPaint[],
  constraints: OptimizationConstraints,
  config?: Partial<TPEConfig>
): OptimizationResult => {
  const optimizer = createTPEHybridOptimizer(targetColor, availablePaints, constraints, config);
  return optimizer.optimize();
};