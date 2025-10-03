/**
 * Results Summary View Sub-component
 * Summary metrics and performance data
 */

'use client';

import React from 'react';

interface PerformanceMetrics {
  optimization_time_ms: number;
  iterations_completed: number;
  algorithm_used: string;
  convergence_achieved: boolean;
}

interface QualityMetrics {
  color_accuracy_score: number;
  meets_target: boolean;
  cost_effectiveness: number;
}

interface ResultsSummaryViewProps {
  deltaE: number;
  quality: QualityMetrics;
  paintCount: number;
  totalCost: number;
  performance: PerformanceMetrics;
  onSaveToHistory?: () => void;
  onCreateNewMix?: () => void;
}

export default function ResultsSummaryView({
  deltaE,
  quality,
  paintCount,
  totalCost,
  performance,
  onSaveToHistory,
  onCreateNewMix
}: ResultsSummaryViewProps) {
  return (
    <div className="px-6 py-4 space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{deltaE.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Delta E</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{quality.color_accuracy_score.toFixed(0)}%</div>
          <div className="text-sm text-gray-600">Accuracy</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{paintCount}</div>
          <div className="text-sm text-gray-600">Paints Used</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">${totalCost.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Total Cost</div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Performance</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Time:</span>
            <span className="ml-2 font-medium">{(performance.optimization_time_ms / 1000).toFixed(1)}s</span>
          </div>
          <div>
            <span className="text-gray-600">Algorithm:</span>
            <span className="ml-2 font-medium capitalize">{performance.algorithm_used.replace('_', ' ')}</span>
          </div>
          <div>
            <span className="text-gray-600">Iterations:</span>
            <span className="ml-2 font-medium">{performance.iterations_completed.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-600">Convergence:</span>
            <span className={`ml-2 font-medium ${performance.convergence_achieved ? 'text-green-600' : 'text-yellow-600'}`}>
              {performance.convergence_achieved ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex space-x-3">
        {onSaveToHistory && (
          <button
            onClick={onSaveToHistory}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
          >
            Save to History
          </button>
        )}
        {onCreateNewMix && (
          <button
            onClick={onCreateNewMix}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            New Mix
          </button>
        )}
      </div>
    </div>
  );
}
