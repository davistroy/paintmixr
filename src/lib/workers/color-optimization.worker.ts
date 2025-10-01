import { DifferentialEvolutionOptimizer } from '@/lib/mixing-optimization/differential-evolution';
import { TPEHybridOptimizer } from '@/lib/mixing-optimization/tpe-hybrid';
import { ConstraintValidator, VolumeConstraints, PaintAvailabilityConstraint } from '@/lib/mixing-optimization/constraints';
import { predictMixedColor } from '@/lib/color-science/kubelka-munk-enhanced';
import { calculateCIEDE2000Enhanced } from '@/lib/color-science/delta-e-ciede2000';
import { LABColor } from '@/lib/color-science/lab-enhanced';
import { Paint } from '@/lib/types/paint';

export interface OptimizationRequest {
  request_id: string;
  target_color: LABColor;
  available_paints: Paint[];
  volume_constraints: VolumeConstraints;
  availability_constraints: PaintAvailabilityConstraint[];
  optimization_config: {
    algorithm: 'differential_evolution' | 'tpe_hybrid' | 'auto';
    max_iterations: number;
    target_delta_e: number;
    time_limit_ms: number;
    population_size?: number;
    convergence_threshold?: number;
    parallel_workers?: number;
  };
  preferences: {
    prioritize_accuracy: boolean;
    prioritize_cost: boolean;
    prioritize_speed: boolean;
    allow_asymmetric_ratios: boolean;
  };
}

export interface OptimizationResult {
  request_id: string;
  success: boolean;
  best_solution: {
    volumes: number[];
    predicted_color: LABColor;
    delta_e: number;
    total_volume: number;
    cost: number;
    mixing_time_estimate: number;
  };
  optimization_stats: {
    iterations_completed: number;
    time_elapsed_ms: number;
    convergence_achieved: boolean;
    algorithm_used: string;
    population_diversity: number;
  };
  alternative_solutions: Array<{
    volumes: number[];
    delta_e: number;
    cost: number;
    trade_off_score: number;
  }>;
  validation_result: {
    is_feasible: boolean;
    constraint_violations: string[];
    suggestions: string[];
  };
  error?: string;
}

export interface ProgressUpdate {
  request_id: string;
  progress: number;
  current_best_delta_e: number;
  iterations_completed: number;
  time_elapsed_ms: number;
  estimated_time_remaining_ms: number;
}

class ColorOptimizationWorker {
  private deOptimizer: DifferentialEvolutionOptimizer | null = null;
  private tpeOptimizer: TPEHybridOptimizer | null = null;
  private constraintValidator: ConstraintValidator | null = null;
  private currentRequest: OptimizationRequest | null = null;
  private startTime: number = 0;
  private shouldStop: boolean = false;

  constructor() {
    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    self.onmessage = (event: MessageEvent) => {
      const { type, data } = event.data;

      switch (type) {
        case 'OPTIMIZE':
          this.handleOptimizationRequest(data as OptimizationRequest);
          break;
        case 'STOP':
          this.handleStopRequest();
          break;
        case 'PING':
          this.sendMessage('PONG', { timestamp: Date.now() });
          break;
        default:
          console.warn('Unknown message type:', type);
      }
    };
  }

  private async handleOptimizationRequest(request: OptimizationRequest): Promise<void> {
    try {
      this.currentRequest = request;
      this.shouldStop = false;
      this.startTime = Date.now();

      this.sendMessage('STARTED', { request_id: request.request_id });

      const result = await this.performOptimization(request);

      if (!this.shouldStop) {
        this.sendMessage('COMPLETED', result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown optimization error';
      this.sendMessage('ERROR', {
        request_id: request.request_id,
        error: errorMessage
      });
    } finally {
      this.cleanup();
    }
  }

  private async performOptimization(request: OptimizationRequest): Promise<OptimizationResult> {
    this.constraintValidator = new ConstraintValidator(
      request.volume_constraints,
      request.availability_constraints
    );

    const algorithm = this.selectOptimizationAlgorithm(request);

    let bestSolution: number[] = [];
    let bestDeltaE = Infinity;
    let iterations = 0;
    let convergenceAchieved = false;
    let populationDiversity = 0;

    const objectiveFunction = (volumes: number[]): number => {
      const validation = this.constraintValidator!.validate(volumes, request.available_paints);
      if (!validation.is_valid && validation.violated_constraints.some(v =>
        this.constraintValidator!['constraints'].find(c => c.description === v)?.severity === 'hard'
      )) {
        return 1000 + validation.penalty_score;
      }

      const predictedColor = this.predictColor(volumes, request.available_paints);
      const deltaE = calculateCIEDE2000Enhanced(request.target_color, predictedColor).delta_e;

      let score = deltaE;
      if (request.preferences.prioritize_cost) {
        score += this.constraintValidator!.calculateCostPenalty(volumes, request.available_paints) * 0.1;
      }
      score += validation.penalty_score;

      return score;
    };

    const progressCallback = (iter: number, bestScore: number, diversity: number) => {
      if (this.shouldStop) return false;

      iterations = iter;
      bestDeltaE = bestScore;
      populationDiversity = diversity;

      const elapsed = Date.now() - this.startTime;
      if (elapsed > request.optimization_config.time_limit_ms) {
        return false;
      }

      if (iter % 10 === 0) {
        const progress = Math.min(iter / request.optimization_config.max_iterations, elapsed / request.optimization_config.time_limit_ms);
        const estimatedRemaining = progress > 0.1 ? (elapsed / progress) - elapsed : request.optimization_config.time_limit_ms - elapsed;

        this.sendProgress({
          request_id: request.request_id,
          progress: progress * 100,
          current_best_delta_e: bestScore,
          iterations_completed: iter,
          time_elapsed_ms: elapsed,
          estimated_time_remaining_ms: Math.max(0, estimatedRemaining)
        });
      }

      convergenceAchieved = bestScore <= request.optimization_config.target_delta_e;
      return !convergenceAchieved;
    };

    if (algorithm === 'differential_evolution') {
      this.deOptimizer = new DifferentialEvolutionOptimizer({
        population_size: request.optimization_config.population_size || 50,
        max_iterations: request.optimization_config.max_iterations,
        convergence_threshold: request.optimization_config.convergence_threshold || 0.001,
        constraint_tolerance: 1e-6,
        adaptive_parameters: true,
        strategy: 'best_1_bin',
        crossover_probability: 0.8,
        differential_weight: 0.8
      });

      const bounds = this.constraintValidator.getBounds(request.available_paints);
      const deResult = await this.deOptimizer.optimize(
        objectiveFunction,
        bounds.lower_bounds,
        bounds.upper_bounds,
        progressCallback
      );

      bestSolution = deResult.best_solution;
      bestDeltaE = deResult.best_fitness;
    } else {
      this.tpeOptimizer = new TPEHybridOptimizer({
        n_startup_trials: 20,
        n_ei_candidates: 24,
        max_iterations: request.optimization_config.max_iterations,
        convergence_threshold: request.optimization_config.convergence_threshold || 0.001,
        gamma: 0.25,
        constraint_tolerance: 1e-6
      });

      const bounds = this.constraintValidator.getBounds(request.available_paints);
      const tpeResult = await this.tpeOptimizer.optimize(
        objectiveFunction,
        bounds.lower_bounds,
        bounds.upper_bounds,
        progressCallback
      );

      bestSolution = tpeResult.best_solution;
      bestDeltaE = tpeResult.best_fitness;
    }

    const finalValidation = this.constraintValidator.validate(bestSolution, request.available_paints);
    const predictedColor = this.predictColor(bestSolution, request.available_paints);
    const finalDeltaE = calculateCIEDE2000Enhanced(request.target_color, predictedColor).delta_e;
    const totalVolume = bestSolution.reduce((sum, vol) => sum + vol, 0);
    const cost = this.constraintValidator.calculateCostPenalty(bestSolution, request.available_paints);

    const alternativeSolutions = await this.generateAlternativeSolutions(
      request,
      objectiveFunction,
      5
    );

    return {
      request_id: request.request_id,
      success: finalDeltaE <= request.optimization_config.target_delta_e * 1.5,
      best_solution: {
        volumes: bestSolution,
        predicted_color: predictedColor,
        delta_e: finalDeltaE,
        total_volume: totalVolume,
        cost,
        mixing_time_estimate: this.estimateMixingTime(bestSolution)
      },
      optimization_stats: {
        iterations_completed: iterations,
        time_elapsed_ms: Date.now() - this.startTime,
        convergence_achieved,
        algorithm_used: algorithm,
        population_diversity: populationDiversity
      },
      alternative_solutions: alternativeSolutions,
      validation_result: {
        is_feasible: finalValidation.is_valid,
        constraint_violations: finalValidation.violated_constraints,
        suggestions: finalValidation.suggestions
      }
    };
  }

  private selectOptimizationAlgorithm(request: OptimizationRequest): 'differential_evolution' | 'tpe_hybrid' {
    if (request.optimization_config.algorithm !== 'auto') {
      return request.optimization_config.algorithm;
    }

    const paintCount = request.available_paints.length;
    const timeLimit = request.optimization_config.time_limit_ms;

    if (paintCount <= 8 && request.preferences.prioritize_speed) {
      return 'differential_evolution';
    }
    if (paintCount > 15 && timeLimit > 30000) {
      return 'tpe_hybrid';
    }
    if (request.preferences.prioritize_accuracy) {
      return 'tpe_hybrid';
    }

    return 'differential_evolution';
  }

  private predictColor(volumes: number[], paints: Paint[]): LABColor {
    const opticalProperties = paints.map((paint, index) => ({
      ...paint.optical_properties,
      volume_fraction: volumes[index] / volumes.reduce((sum, vol) => sum + vol, 0)
    }));

    const result = predictMixedColor(opticalProperties, volumes);
    return result.predicted_lab;
  }

  private async generateAlternativeSolutions(
    request: OptimizationRequest,
    objectiveFunction: (volumes: number[]) => number,
    count: number
  ): Promise<Array<{volumes: number[]; delta_e: number; cost: number; trade_off_score: number}>> {
    const alternatives: Array<{volumes: number[]; delta_e: number; cost: number; trade_off_score: number}> = [];
    const bounds = this.constraintValidator!.getBounds(request.available_paints);

    for (let i = 0; i < count && !this.shouldStop; i++) {
      const randomSolution = bounds.lower_bounds.map((min, index) => {
        const max = bounds.upper_bounds[index];
        return min + Math.random() * (max - min);
      });

      const projectedSolution = this.constraintValidator!.projectToFeasible(randomSolution, request.available_paints);
      const predictedColor = this.predictColor(projectedSolution, request.available_paints);
      const deltaE = calculateCIEDE2000Enhanced(request.target_color, predictedColor).delta_e;
      const cost = this.constraintValidator!.calculateCostPenalty(projectedSolution, request.available_paints);

      const tradeOffScore = deltaE * (request.preferences.prioritize_accuracy ? 2 : 1) +
                           cost * (request.preferences.prioritize_cost ? 0.5 : 0.1);

      alternatives.push({
        volumes: projectedSolution,
        delta_e: deltaE,
        cost,
        trade_off_score: tradeOffScore
      });
    }

    return alternatives.sort((a, b) => a.trade_off_score - b.trade_off_score).slice(0, 3);
  }

  private estimateMixingTime(volumes: number[]): number {
    const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
    const baseTime = 30;
    const volumeTime = totalVolume * 0.5;
    const complexityTime = volumes.filter(v => v > 0.1).length * 10;

    return baseTime + volumeTime + complexityTime;
  }

  private handleStopRequest(): void {
    this.shouldStop = true;
    if (this.currentRequest) {
      this.sendMessage('STOPPED', {
        request_id: this.currentRequest.request_id,
        message: 'Optimization stopped by user request'
      });
    }
  }

  private sendMessage(type: string, data: any): void {
    self.postMessage({ type, data });
  }

  private sendProgress(progress: ProgressUpdate): void {
    this.sendMessage('PROGRESS', progress);
  }

  private cleanup(): void {
    this.deOptimizer = null;
    this.tpeOptimizer = null;
    this.constraintValidator = null;
    this.currentRequest = null;
    this.shouldStop = false;
  }
}

const worker = new ColorOptimizationWorker();

export { worker };