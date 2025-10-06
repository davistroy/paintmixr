/**
 * Performance Metrics Collection System
 * Tracks optimization performance, accuracy metrics, and system health
 */

import { ColorOptimizationResult as OptimizationResult } from '@/lib/types';
import { logger } from '@/lib/logging/logger';

export interface PerformanceMetrics {
  optimization_id: string;
  user_id: string;
  timestamp: Date;

  // Performance metrics
  calculation_time_ms: number;
  algorithm_used: 'differential_evolution' | 'tpe_hybrid' | 'auto' | 'legacy';
  iterations_completed: number;
  convergence_achieved: boolean;

  // Accuracy metrics
  target_delta_e: number;
  achieved_delta_e: number;
  accuracy_target_met: boolean;
  color_space_coverage: number; // 0-1 representing how well paints cover target color

  // Resource utilization
  memory_usage_mb?: number;
  cpu_utilization_percent?: number;
  worker_thread_count: number;
  cache_hit_rate?: number;

  // Paint collection metrics
  paints_evaluated: number;
  paints_selected: number;
  collection_size: number;
  verified_paints_ratio: number;
  calibrated_paints_ratio: number;

  // Quality metrics
  solution_stability_score: number; // How consistent results are across runs
  color_mixing_complexity: number; // Number of paints in final mix
  volume_efficiency: number; // How well volumes were utilized
  cost_efficiency: number; // Cost per unit of accuracy improvement

  // System context
  concurrent_optimizations: number;
  system_load_factor: number;
  database_response_time_ms?: number;

  // User experience
  first_result_time_ms: number; // Time to first acceptable result
  user_satisfaction_predicted?: number; // ML-based satisfaction prediction
}

export interface SystemHealthMetrics {
  timestamp: Date;
  service_status: 'healthy' | 'degraded' | 'critical';

  // Performance indicators
  avg_optimization_time_ms: number;
  p95_optimization_time_ms: number;
  accuracy_success_rate: number; // % of optimizations meeting target Delta E

  // Resource health
  database_connection_pool_usage: number;
  worker_thread_pool_usage: number;
  memory_usage_percent: number;
  error_rate_percent: number;

  // Feature health
  enhanced_accuracy_availability: number; // % uptime
  legacy_fallback_usage_rate: number;
  cache_performance_score: number;

  // Predictive indicators
  performance_trend: 'improving' | 'stable' | 'degrading';
  capacity_utilization: number;
  estimated_time_to_capacity_limit?: number;
}

export interface OptimizationInsight {
  metric_type: 'performance' | 'accuracy' | 'user_experience' | 'system_health';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  automated_action_available: boolean;
  historical_context?: {
    trend_direction: 'up' | 'down' | 'stable';
    comparison_period: string;
    percentage_change: number;
  };
}

export class PerformanceMetricsCollector {
  private metricsBuffer: PerformanceMetrics[] = [];
  private readonly maxBufferSize = 1000;
  private readonly flushInterval = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor(private enableRealTimeCollection: boolean = true) {
    if (this.enableRealTimeCollection) {
      this.startPeriodicFlush();
    }
  }

  /**
   * Start tracking an optimization session
   */
  startOptimizationTracking(
    optimizationId: string,
    userId: string,
    availablePaintsCount: number
  ): OptimizationTracker {
    return new OptimizationTracker(
      optimizationId,
      userId,
      availablePaintsCount,
      this
    );
  }

  /**
   * Record completed optimization metrics
   */
  recordOptimizationMetrics(metrics: PerformanceMetrics) {
    this.metricsBuffer.push({
      ...metrics,
      timestamp: new Date()
    });

    // Auto-flush if buffer is full
    if (this.metricsBuffer.length >= this.maxBufferSize) {
      this.flushMetrics();
    }

    // Real-time anomaly detection
    if (this.enableRealTimeCollection) {
      this.detectPerformanceAnomalies(metrics);
    }
  }

  /**
   * Get current system health metrics
   */
  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    const recentMetrics = this.getRecentMetrics(300000); // Last 5 minutes

    if (recentMetrics.length === 0) {
      return this.getDefaultHealthMetrics();
    }

    const avgTime = recentMetrics.reduce((sum, m) => sum + m.calculation_time_ms, 0) / recentMetrics.length;
    const sortedTimes = recentMetrics.map(m => m.calculation_time_ms).sort((a, b) => a - b);
    const p95Time = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || avgTime;

    const accuracySuccessRate = recentMetrics.filter(m => m.accuracy_target_met).length / recentMetrics.length;

    const enhancedAccuracyCount = recentMetrics.filter(m =>
      m.algorithm_used === 'differential_evolution' || m.algorithm_used === 'tpe_hybrid'
    ).length;
    const enhancedAvailability = enhancedAccuracyCount / recentMetrics.length;

    return {
      timestamp: new Date(),
      service_status: this.determineServiceStatus(avgTime, accuracySuccessRate),
      avg_optimization_time_ms: Math.round(avgTime),
      p95_optimization_time_ms: Math.round(p95Time),
      accuracy_success_rate: Math.round(accuracySuccessRate * 100) / 100,
      database_connection_pool_usage: 0.7, // Would be retrieved from actual pool
      worker_thread_pool_usage: 0.4,
      memory_usage_percent: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100,
      error_rate_percent: 0.02, // Would be calculated from error logs
      enhanced_accuracy_availability: Math.round(enhancedAvailability * 100) / 100,
      legacy_fallback_usage_rate: Math.round((1 - enhancedAvailability) * 100) / 100,
      cache_performance_score: 0.85, // Would be retrieved from cache metrics
      performance_trend: this.calculatePerformanceTrend(recentMetrics),
      capacity_utilization: Math.min(0.95, (avgTime / 500) * 0.8) // Based on 500ms target
    };
  }

  /**
   * Generate optimization insights based on collected metrics
   */
  generateOptimizationInsights(lookbackHours: number = 24): OptimizationInsight[] {
    const insights: OptimizationInsight[] = [];
    const recentMetrics = this.getRecentMetrics(lookbackHours * 3600000);

    if (recentMetrics.length < 10) {
      return insights;
    }

    // Performance insights
    const avgTime = recentMetrics.reduce((sum, m) => sum + m.calculation_time_ms, 0) / recentMetrics.length;
    if (avgTime > 500) {
      insights.push({
        metric_type: 'performance',
        severity: avgTime > 2000 ? 'critical' : 'warning',
        title: 'Optimization Performance Degradation',
        description: `Average optimization time (${Math.round(avgTime)}ms) exceeds target of 500ms`,
        impact: 'Users experiencing slower paint mixing calculations',
        recommendation: 'Consider optimizing algorithms or scaling worker threads',
        automated_action_available: true,
        historical_context: {
          trend_direction: 'up',
          comparison_period: '24h',
          percentage_change: Math.round(((avgTime / 500) - 1) * 100)
        }
      });
    }

    // Accuracy insights
    const accuracyRate = recentMetrics.filter(m => m.accuracy_target_met).length / recentMetrics.length;
    if (accuracyRate < 0.85) {
      insights.push({
        metric_type: 'accuracy',
        severity: accuracyRate < 0.7 ? 'critical' : 'warning',
        title: 'Color Accuracy Target Miss Rate High',
        description: `Only ${Math.round(accuracyRate * 100)}% of optimizations meeting accuracy targets`,
        impact: 'Users receiving less accurate paint mixing recommendations',
        recommendation: 'Review paint collection quality and calibration status',
        automated_action_available: false,
        historical_context: {
          trend_direction: accuracyRate < 0.8 ? 'down' : 'stable',
          comparison_period: '24h',
          percentage_change: Math.round((1 - accuracyRate) * 100)
        }
      });
    }

    // Resource utilization insights
    const avgMemory = recentMetrics.reduce((sum, m) => sum + (m.memory_usage_mb || 0), 0) /
                     recentMetrics.filter(m => m.memory_usage_mb).length;
    if (avgMemory > 512) {
      insights.push({
        metric_type: 'system_health',
        severity: 'warning',
        title: 'High Memory Usage Detected',
        description: `Average memory usage (${Math.round(avgMemory)}MB) approaching limits`,
        impact: 'Risk of optimization failures due to resource constraints',
        recommendation: 'Implement memory optimization or increase available resources',
        automated_action_available: true
      });
    }

    return insights;
  }

  private getRecentMetrics(timeWindowMs: number): PerformanceMetrics[] {
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    return this.metricsBuffer.filter(m => m.timestamp >= cutoffTime);
  }

  private determineServiceStatus(avgTime: number, accuracyRate: number): 'healthy' | 'degraded' | 'critical' {
    if (avgTime > 2000 || accuracyRate < 0.7) return 'critical';
    if (avgTime > 1000 || accuracyRate < 0.85) return 'degraded';
    return 'healthy';
  }

  private calculatePerformanceTrend(metrics: PerformanceMetrics[]): 'improving' | 'stable' | 'degrading' {
    if (metrics.length < 20) return 'stable';

    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2));

    const firstAvg = firstHalf.reduce((sum, m) => sum + m.calculation_time_ms, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.calculation_time_ms, 0) / secondHalf.length;

    const changePct = (secondAvg - firstAvg) / firstAvg;

    if (changePct > 0.15) return 'degrading';
    if (changePct < -0.15) return 'improving';
    return 'stable';
  }

  private detectPerformanceAnomalies(metrics: PerformanceMetrics) {
    // Real-time anomaly detection logic
    if (metrics.calculation_time_ms > 5000) {
      logger.warn(`Performance anomaly detected: ${metrics.optimization_id} took ${metrics.calculation_time_ms}ms`);
    }

    if (metrics.achieved_delta_e > metrics.target_delta_e * 2) {
      logger.warn(`Accuracy anomaly detected: ${metrics.optimization_id} achieved ${metrics.achieved_delta_e} vs target ${metrics.target_delta_e}`);
    }
  }

  private getDefaultHealthMetrics(): SystemHealthMetrics {
    return {
      timestamp: new Date(),
      service_status: 'healthy',
      avg_optimization_time_ms: 350,
      p95_optimization_time_ms: 650,
      accuracy_success_rate: 0.92,
      database_connection_pool_usage: 0.3,
      worker_thread_pool_usage: 0.2,
      memory_usage_percent: 45,
      error_rate_percent: 0.01,
      enhanced_accuracy_availability: 0.95,
      legacy_fallback_usage_rate: 0.05,
      cache_performance_score: 0.88,
      performance_trend: 'stable',
      capacity_utilization: 0.4
    };
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      if (this.metricsBuffer.length > 0) {
        this.flushMetrics();
      }
    }, this.flushInterval);
  }

  private async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // In production, this would send to analytics service
      logger.info(`Flushing ${metricsToFlush.length} performance metrics`);

      // Could integrate with services like:
      // - DataDog, New Relic, or Grafana for metrics
      // - Custom analytics endpoint
      // - Database for historical analysis

    } catch (error) {
      logger.error('Failed to flush metrics:', error);
      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush);
    }
  }

  cleanup() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushMetrics(); // Final flush
  }
}

/**
 * Optimization session tracker for detailed performance monitoring
 */
export class OptimizationTracker {
  private startTime: number;
  private checkpoints: { name: string; timestamp: number }[] = [];
  private resourceSnapshots: { memory: number; timestamp: number }[] = [];

  constructor(
    private optimizationId: string,
    private userId: string,
    private availablePaintsCount: number,
    private metricsCollector: PerformanceMetricsCollector
  ) {
    this.startTime = Date.now();
    this.checkpoint('optimization_started');
  }

  checkpoint(name: string) {
    const timestamp = Date.now();
    this.checkpoints.push({ name, timestamp });

    // Take resource snapshot
    const memoryUsage = process.memoryUsage();
    this.resourceSnapshots.push({
      memory: memoryUsage.heapUsed / 1024 / 1024, // MB
      timestamp
    });
  }

  complete(result: OptimizationResult, additionalMetrics?: Partial<PerformanceMetrics>) {
    const endTime = Date.now();
    const totalTime = endTime - this.startTime;

    this.checkpoint('optimization_completed');

    const metrics: PerformanceMetrics = {
      optimization_id: this.optimizationId,
      user_id: this.userId,
      timestamp: new Date(),
      calculation_time_ms: totalTime,
      algorithm_used: (result.optimization_metadata as any)?.algorithm_used || 'auto',
      iterations_completed: result.optimization_metadata?.performance_metrics?.iterations_completed || 0,
      convergence_achieved: result.optimization_metadata?.performance_metrics?.convergence_achieved || false,
      target_delta_e: result.formula.target_delta_e || 2.0,
      achieved_delta_e: result.formula.achieved_delta_e || result.formula.deltaE,
      accuracy_target_met: (result.formula.achieved_delta_e || result.formula.deltaE) <= (result.formula.target_delta_e || 2.0),
      color_space_coverage: (result.optimization_metadata as any)?.color_space_coverage || 0.8,
      memory_usage_mb: Math.max(...this.resourceSnapshots.map(s => s.memory)),
      worker_thread_count: 1, // Would be tracked from actual worker usage
      paints_evaluated: this.availablePaintsCount,
      paints_selected: result.formula.paint_components?.length || result.formula.paintRatios.length,
      collection_size: this.availablePaintsCount,
      verified_paints_ratio: 0.7, // Would be calculated from actual data
      calibrated_paints_ratio: 0.4,
      solution_stability_score: 0.85, // Would be calculated from multiple runs
      color_mixing_complexity: result.formula.paint_components?.length || result.formula.paintRatios.length,
      volume_efficiency: 0.9, // Would be calculated from actual data
      cost_efficiency: 0.8, // Would be calculated from actual data
      concurrent_optimizations: 1, // Would be tracked globally
      system_load_factor: 0.6,
      first_result_time_ms: totalTime, // Could track intermediate results
      ...additionalMetrics
    };

    this.metricsCollector.recordOptimizationMetrics(metrics);
  }

  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  getCheckpoints(): { name: string; elapsed: number; duration?: number }[] {
    return this.checkpoints.map((checkpoint, index) => ({
      name: checkpoint.name,
      elapsed: checkpoint.timestamp - this.startTime,
      duration: index > 0 ? checkpoint.timestamp - this.checkpoints[index - 1].timestamp : undefined
    }));
  }
}

// Global metrics collector instance
export const globalMetricsCollector = new PerformanceMetricsCollector();

// Cleanup on process exit
process.on('exit', () => globalMetricsCollector.cleanup());
process.on('SIGTERM', () => globalMetricsCollector.cleanup());