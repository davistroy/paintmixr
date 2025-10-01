import { Paint } from '@/lib/types/paint';
import { Matrix } from 'ml-matrix';

export interface VolumeConstraints {
  min_total_volume: number;
  max_total_volume: number;
  min_paint_volume: number;
  max_paint_volume: number;
  precision: number;
  asymmetric_ratios: boolean;
}

export interface PaintAvailabilityConstraint {
  paint_id: string;
  available_volume: number;
  min_usage: number;
  max_usage: number;
  cost_per_ml: number;
  priority: number;
}

export interface MixingConstraint {
  constraint_type: 'volume' | 'availability' | 'compatibility' | 'cost' | 'custom';
  description: string;
  severity: 'hard' | 'soft';
  weight: number;
  check: (solution: number[], paints: Paint[]) => boolean;
  penalty: (solution: number[], paints: Paint[]) => number;
}

export interface ConstraintValidationResult {
  is_valid: boolean;
  violated_constraints: string[];
  penalty_score: number;
  feasibility_score: number;
  suggestions: string[];
}

export interface ConstraintBounds {
  lower_bounds: number[];
  upper_bounds: number[];
  linear_constraints?: Matrix;
  linear_bounds?: number[];
}

export class ConstraintValidator {
  private constraints: MixingConstraint[] = [];
  private volumeConstraints: VolumeConstraints;
  private availabilityConstraints: Map<string, PaintAvailabilityConstraint> = new Map();

  constructor(
    volumeConstraints: VolumeConstraints,
    availabilityConstraints: PaintAvailabilityConstraint[] = []
  ) {
    this.volumeConstraints = volumeConstraints;
    availabilityConstraints.forEach(constraint => {
      this.availabilityConstraints.set(constraint.paint_id, constraint);
    });
    this.initializeStandardConstraints();
  }

  private initializeStandardConstraints(): void {
    this.addVolumeConstraints();
    this.addAvailabilityConstraints();
    this.addPrecisionConstraints();
  }

  private addVolumeConstraints(): void {
    this.constraints.push({
      constraint_type: 'volume',
      description: 'Total volume within bounds',
      severity: 'hard',
      weight: 1.0,
      check: (solution: number[]) => {
        const totalVolume = solution.reduce((sum, vol) => sum + vol, 0);
        return totalVolume >= this.volumeConstraints.min_total_volume &&
               totalVolume <= this.volumeConstraints.max_total_volume;
      },
      penalty: (solution: number[]) => {
        const totalVolume = solution.reduce((sum, vol) => sum + vol, 0);
        if (totalVolume < this.volumeConstraints.min_total_volume) {
          return Math.pow(this.volumeConstraints.min_total_volume - totalVolume, 2);
        }
        if (totalVolume > this.volumeConstraints.max_total_volume) {
          return Math.pow(totalVolume - this.volumeConstraints.max_total_volume, 2);
        }
        return 0;
      }
    });

    this.constraints.push({
      constraint_type: 'volume',
      description: 'Individual paint volumes within bounds',
      severity: 'hard',
      weight: 1.0,
      check: (solution: number[]) => {
        return solution.every(vol =>
          vol >= this.volumeConstraints.min_paint_volume &&
          vol <= this.volumeConstraints.max_paint_volume
        );
      },
      penalty: (solution: number[]) => {
        let penalty = 0;
        solution.forEach(vol => {
          if (vol < this.volumeConstraints.min_paint_volume) {
            penalty += Math.pow(this.volumeConstraints.min_paint_volume - vol, 2);
          }
          if (vol > this.volumeConstraints.max_paint_volume) {
            penalty += Math.pow(vol - this.volumeConstraints.max_paint_volume, 2);
          }
        });
        return penalty;
      }
    });
  }

  private addAvailabilityConstraints(): void {
    this.constraints.push({
      constraint_type: 'availability',
      description: 'Paint availability limits',
      severity: 'hard',
      weight: 1.0,
      check: (solution: number[], paints: Paint[]) => {
        return solution.every((vol, index) => {
          const paint = paints[index];
          const constraint = this.availabilityConstraints.get(paint.id);
          if (!constraint) return true;
          return vol <= constraint.available_volume &&
                 vol >= constraint.min_usage &&
                 vol <= constraint.max_usage;
        });
      },
      penalty: (solution: number[], paints: Paint[]) => {
        let penalty = 0;
        solution.forEach((vol, index) => {
          const paint = paints[index];
          const constraint = this.availabilityConstraints.get(paint.id);
          if (!constraint) return;

          if (vol > constraint.available_volume) {
            penalty += Math.pow(vol - constraint.available_volume, 2) * 10;
          }
          if (vol < constraint.min_usage) {
            penalty += Math.pow(constraint.min_usage - vol, 2);
          }
          if (vol > constraint.max_usage) {
            penalty += Math.pow(vol - constraint.max_usage, 2);
          }
        });
        return penalty;
      }
    });
  }

  private addPrecisionConstraints(): void {
    this.constraints.push({
      constraint_type: 'volume',
      description: 'Volume precision requirements',
      severity: 'soft',
      weight: 0.1,
      check: (solution: number[]) => {
        return solution.every(vol => {
          const rounded = Math.round(vol / this.volumeConstraints.precision) * this.volumeConstraints.precision;
          return Math.abs(vol - rounded) < 1e-6;
        });
      },
      penalty: (solution: number[]) => {
        let penalty = 0;
        solution.forEach(vol => {
          const rounded = Math.round(vol / this.volumeConstraints.precision) * this.volumeConstraints.precision;
          penalty += Math.abs(vol - rounded);
        });
        return penalty * 0.1;
      }
    });
  }

  addCustomConstraint(constraint: MixingConstraint): void {
    this.constraints.push(constraint);
  }

  removeConstraint(description: string): boolean {
    const index = this.constraints.findIndex(c => c.description === description);
    if (index >= 0) {
      this.constraints.splice(index, 1);
      return true;
    }
    return false;
  }

  validate(solution: number[], paints: Paint[]): ConstraintValidationResult {
    const violatedConstraints: string[] = [];
    let totalPenalty = 0;
    let hardConstraintViolations = 0;

    this.constraints.forEach(constraint => {
      const isValid = constraint.check(solution, paints);
      if (!isValid) {
        violatedConstraints.push(constraint.description);
        if (constraint.severity === 'hard') {
          hardConstraintViolations++;
        }
      }

      const penalty = constraint.penalty(solution, paints) * constraint.weight;
      totalPenalty += penalty;
    });

    const feasibilityScore = Math.max(0, 1 - (hardConstraintViolations / this.constraints.filter(c => c.severity === 'hard').length));
    const suggestions = this.generateSuggestions(solution, paints, violatedConstraints);

    return {
      is_valid: violatedConstraints.length === 0,
      violated_constraints: violatedConstraints,
      penalty_score: totalPenalty,
      feasibility_score,
      suggestions
    };
  }

  private generateSuggestions(solution: number[], paints: Paint[], violations: string[]): string[] {
    const suggestions: string[] = [];

    if (violations.includes('Total volume within bounds')) {
      const totalVolume = solution.reduce((sum, vol) => sum + vol, 0);
      if (totalVolume < this.volumeConstraints.min_total_volume) {
        suggestions.push(`Increase total volume by ${(this.volumeConstraints.min_total_volume - totalVolume).toFixed(1)}ml`);
      } else {
        suggestions.push(`Reduce total volume by ${(totalVolume - this.volumeConstraints.max_total_volume).toFixed(1)}ml`);
      }
    }

    if (violations.includes('Individual paint volumes within bounds')) {
      solution.forEach((vol, index) => {
        if (vol < this.volumeConstraints.min_paint_volume) {
          suggestions.push(`Increase ${paints[index]?.name || `paint ${index}`} volume to at least ${this.volumeConstraints.min_paint_volume}ml`);
        }
        if (vol > this.volumeConstraints.max_paint_volume) {
          suggestions.push(`Reduce ${paints[index]?.name || `paint ${index}`} volume to at most ${this.volumeConstraints.max_paint_volume}ml`);
        }
      });
    }

    if (violations.includes('Paint availability limits')) {
      solution.forEach((vol, index) => {
        const paint = paints[index];
        const constraint = this.availabilityConstraints.get(paint?.id || '');
        if (constraint && vol > constraint.available_volume) {
          suggestions.push(`${paint?.name || `Paint ${index}`} exceeds available volume (${constraint.available_volume}ml)`);
        }
      });
    }

    return suggestions;
  }

  getBounds(paints: Paint[]): ConstraintBounds {
    const lowerBounds: number[] = [];
    const upperBounds: number[] = [];

    paints.forEach((paint, index) => {
      let minVol = this.volumeConstraints.min_paint_volume;
      let maxVol = this.volumeConstraints.max_paint_volume;

      const constraint = this.availabilityConstraints.get(paint.id);
      if (constraint) {
        minVol = Math.max(minVol, constraint.min_usage);
        maxVol = Math.min(maxVol, Math.min(constraint.max_usage, constraint.available_volume));
      }

      lowerBounds.push(minVol);
      upperBounds.push(maxVol);
    });

    return {
      lower_bounds: lowerBounds,
      upper_bounds: upperBounds
    };
  }

  projectToFeasible(solution: number[], paints: Paint[]): number[] {
    const bounds = this.getBounds(paints);
    const projected = solution.map((vol, index) => {
      let newVol = Math.max(bounds.lower_bounds[index], Math.min(bounds.upper_bounds[index], vol));

      if (this.volumeConstraints.precision > 0) {
        newVol = Math.round(newVol / this.volumeConstraints.precision) * this.volumeConstraints.precision;
      }

      return newVol;
    });

    const totalVolume = projected.reduce((sum, vol) => sum + vol, 0);
    if (totalVolume < this.volumeConstraints.min_total_volume) {
      const scale = this.volumeConstraints.min_total_volume / totalVolume;
      return projected.map(vol => vol * scale);
    } else if (totalVolume > this.volumeConstraints.max_total_volume) {
      const scale = this.volumeConstraints.max_total_volume / totalVolume;
      return projected.map(vol => vol * scale);
    }

    return projected;
  }

  calculateCostPenalty(solution: number[], paints: Paint[]): number {
    let totalCost = 0;
    solution.forEach((vol, index) => {
      const paint = paints[index];
      const constraint = this.availabilityConstraints.get(paint?.id || '');
      if (constraint) {
        totalCost += vol * constraint.cost_per_ml;
      }
    });
    return totalCost;
  }

  getConstraintSummary(): { hard: number; soft: number; total: number } {
    const hard = this.constraints.filter(c => c.severity === 'hard').length;
    const soft = this.constraints.filter(c => c.severity === 'soft').length;
    return { hard, soft, total: this.constraints.length };
  }
}

export const createStandardConstraints = (
  minVolume: number = 5.0,
  maxVolume: number = 500.0,
  precision: number = 0.1,
  asymmetricRatios: boolean = true
): VolumeConstraints => {
  return {
    min_total_volume: minVolume,
    max_total_volume: maxVolume,
    min_paint_volume: precision,
    max_paint_volume: maxVolume * 0.95,
    precision,
    asymmetric_ratios: asymmetricRatios
  };
};

export const createAvailabilityConstraint = (
  paintId: string,
  availableVolume: number,
  costPerMl: number = 0.1,
  priority: number = 1
): PaintAvailabilityConstraint => {
  return {
    paint_id: paintId,
    available_volume: availableVolume,
    min_usage: 0.1,
    max_usage: availableVolume,
    cost_per_ml: costPerMl,
    priority
  };
};