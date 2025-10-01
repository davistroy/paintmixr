/**
 * Optimization Results Component
 * Displays detailed results from paint mixing optimization
 */

'use client';

import React, { useState, useMemo } from 'react';
import { LABColor } from '@/lib/color-science/types';
import { convertLABtoRGB, convertRGBtoHex } from '@/lib/color-science/color-utils';
import { calculateDeltaE } from '@/lib/color-science/delta-e';

interface PaintVolume {
  id: string;
  name: string;
  brand: string;
  volume_ml: number;
  percentage: number;
  hex_color: string;
  cost_per_ml: number;
}

interface OptimizationSolution {
  paint_volumes: Record<string, number>;
  total_volume_ml: number;
  predicted_color: LABColor;
  confidence_score: number;
}

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

interface OptimizationResultsProps {
  targetColor: LABColor;
  achievedColor?: LABColor;
  deltaE: number;
  solution?: OptimizationSolution;
  paintDetails: PaintVolume[];
  performance: PerformanceMetrics;
  quality: QualityMetrics;
  success: boolean;
  onSaveToHistory?: () => void;
  onCreateNewMix?: () => void;
  onAdjustTarget?: (newTarget: LABColor) => void;
  className?: string;
  showDetailedAnalysis?: boolean;
}

export default function OptimizationResults({
  targetColor,
  achievedColor,
  deltaE,
  solution,
  paintDetails,
  performance,
  quality,
  success,
  onSaveToHistory,
  onCreateNewMix,
  onAdjustTarget,
  className = '',
  showDetailedAnalysis = true
}: OptimizationResultsProps) {
  const [activeView, setActiveView] = useState<'summary' | 'paints' | 'analysis' | 'instructions'>('summary');
  const [showMixingInstructions, setShowMixingInstructions] = useState(false);

  const targetHex = convertRGBtoHex(convertLABtoRGB(targetColor));
  const achievedHex = achievedColor ? convertRGBtoHex(convertLABtoRGB(achievedColor)) : '#000000';

  // Calculate additional metrics
  const metrics = useMemo(() => {
    const totalCost = paintDetails.reduce((sum, paint) => sum + (paint.volume_ml * paint.cost_per_ml), 0);
    const costPerMl = solution ? totalCost / solution.total_volume_ml : 0;
    const dominantPaint = paintDetails.reduce((max, paint) =>
      paint.percentage > max.percentage ? paint : max, paintDetails[0]
    );

    return {
      totalCost,
      costPerMl,
      dominantPaint,
      complexity: paintDetails.length,
      efficiency: performance.optimization_time_ms > 0 ? (performance.iterations_completed / performance.optimization_time_ms) * 1000 : 0
    };
  }, [paintDetails, solution, performance]);

  // Generate mixing instructions
  const mixingInstructions = useMemo(() => {
    if (!solution || paintDetails.length === 0) return [];

    const sortedPaints = [...paintDetails].sort((a, b) => b.volume_ml - a.volume_ml);
    const instructions = [];

    instructions.push({
      step: 1,
      action: 'preparation',
      description: 'Clean mixing container and ensure accurate measuring tools',
      details: `Target volume: ${solution.total_volume_ml.toFixed(1)}ml`
    });

    sortedPaints.forEach((paint, index) => {
      const stepNumber = index + 2;
      const isBase = index === 0;

      instructions.push({
        step: stepNumber,
        action: isBase ? 'base' : 'add',
        description: `${isBase ? 'Start with base paint:' : 'Add paint:'} ${paint.name}`,
        details: `Measure ${paint.volume_ml.toFixed(1)}ml (${paint.percentage.toFixed(1)}%) of ${paint.brand} ${paint.name}`,
        paintId: paint.id,
        volume: paint.volume_ml,
        color: paint.hex_color
      });

      if (!isBase) {
        instructions.push({
          step: stepNumber + 0.5,
          action: 'mix',
          description: 'Mix thoroughly',
          details: 'Stir for 30-60 seconds until uniform color is achieved'
        });
      }
    });

    instructions.push({
      step: instructions.length + 1,
      action: 'verify',
      description: 'Color verification',
      details: 'Compare mixed color with target under proper lighting conditions'
    });

    return instructions;
  }, [solution, paintDetails]);

  const getAccuracyBadge = () => {
    if (deltaE <= 1.0) return { label: 'Excellent', color: 'bg-green-100 text-green-800', icon: '🎯' };
    if (deltaE <= 2.0) return { label: 'Very Good', color: 'bg-blue-100 text-blue-800', icon: '✨' };
    if (deltaE <= 3.0) return { label: 'Good', color: 'bg-yellow-100 text-yellow-800', icon: '✅' };
    if (deltaE <= 4.0) return { label: 'Acceptable', color: 'bg-orange-100 text-orange-800', icon: '⚠️' };
    return { label: 'Poor', color: 'bg-red-100 text-red-800', icon: '❌' };
  };

  const accuracyBadge = getAccuracyBadge();

  if (!success) {
    return (
      <div className={`optimization-results bg-white border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Optimization Failed</h3>
          <p className="text-gray-600 mb-4">
            Unable to find a suitable paint mixture for the target color.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <div>Delta E achieved: {deltaE.toFixed(2)}</div>
            <div>Time spent: {(performance.optimization_time_ms / 1000).toFixed(1)}s</div>
            <div>Iterations: {performance.iterations_completed.toLocaleString()}</div>
          </div>
          <div className="mt-6 space-x-3">
            <button
              onClick={onCreateNewMix}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Try Different Settings
            </button>
            {onAdjustTarget && (
              <button
                onClick={() => onAdjustTarget(targetColor)}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Adjust Target
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`optimization-results bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl">{accuracyBadge.icon}</div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Optimization Complete
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${accuracyBadge.color}`}>
                  {accuracyBadge.label}
                </span>
                <span className="text-sm text-gray-500">ΔE = {deltaE.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Color comparison */}
            <div className="flex items-center space-x-2">
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded border-2 border-gray-200"
                  style={{ backgroundColor: targetHex }}
                  title="Target Color"
                />
                <div className="text-xs text-gray-500 mt-1">Target</div>
              </div>
              <div className="text-gray-400">→</div>
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded border-2 border-gray-200"
                  style={{ backgroundColor: achievedHex }}
                  title="Achieved Color"
                />
                <div className="text-xs text-gray-500 mt-1">Result</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'summary', label: 'Summary', icon: '📊' },
          { id: 'paints', label: 'Paint Mix', icon: '🎨' },
          { id: 'analysis', label: 'Analysis', icon: '🔍' },
          { id: 'instructions', label: 'Instructions', icon: '📋' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 ${
              activeView === tab.id
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary View */}
      {activeView === 'summary' && (
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
              <div className="text-2xl font-bold text-purple-600">{paintDetails.length}</div>
              <div className="text-sm text-gray-600">Paints Used</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">${metrics.totalCost.toFixed(2)}</div>
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
                💾 Save to History
              </button>
            )}
            {onCreateNewMix && (
              <button
                onClick={onCreateNewMix}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                🔄 New Mix
              </button>
            )}
          </div>
        </div>
      )}

      {/* Paint Mix View */}
      {activeView === 'paints' && (
        <div className="px-6 py-4">
          {solution && (
            <div className="mb-4 text-center">
              <div className="text-lg font-medium">Total Volume: {solution.total_volume_ml.toFixed(1)} ml</div>
              <div className="text-sm text-gray-600">Cost per ml: ${metrics.costPerMl.toFixed(3)}</div>
            </div>
          )}

          <div className="space-y-3">
            {paintDetails.map((paint, index) => (
              <div key={paint.id} className="flex items-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center flex-1 space-x-4">
                  <div className="flex-shrink-0">
                    <div
                      className="w-12 h-12 rounded border-2 border-gray-200"
                      style={{ backgroundColor: paint.hex_color }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{paint.name}</div>
                    <div className="text-sm text-gray-600">{paint.brand}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{paint.volume_ml.toFixed(1)} ml</div>
                    <div className="text-sm text-gray-600">{paint.percentage.toFixed(1)}%</div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    ${(paint.volume_ml * paint.cost_per_ml).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Visual Mix Representation */}
          <div className="mt-6">
            <div className="text-sm font-medium text-gray-700 mb-2">Proportional Mix</div>
            <div className="flex rounded-lg overflow-hidden border border-gray-200" style={{ height: '40px' }}>
              {paintDetails.map((paint) => (
                <div
                  key={paint.id}
                  style={{
                    backgroundColor: paint.hex_color,
                    width: `${paint.percentage}%`
                  }}
                  title={`${paint.name}: ${paint.percentage.toFixed(1)}%`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analysis View */}
      {activeView === 'analysis' && showDetailedAnalysis && (
        <div className="px-6 py-4 space-y-6">
          {/* Color Analysis */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Color Analysis</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="font-medium">Target (LAB)</div>
                <div>L*: {targetColor.L.toFixed(2)}</div>
                <div>a*: {targetColor.a.toFixed(2)}</div>
                <div>b*: {targetColor.b.toFixed(2)}</div>
              </div>
              {achievedColor && (
                <div className="space-y-2">
                  <div className="font-medium">Achieved (LAB)</div>
                  <div>L*: {achievedColor.L.toFixed(2)}</div>
                  <div>a*: {achievedColor.a.toFixed(2)}</div>
                  <div>b*: {achievedColor.b.toFixed(2)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Quality Metrics */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Quality Assessment</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Color Accuracy</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, quality.color_accuracy_score)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{quality.color_accuracy_score.toFixed(0)}%</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cost Effectiveness</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (1000 - quality.cost_effectiveness) / 10)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">${metrics.costPerMl.toFixed(3)}/ml</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Complexity</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (metrics.complexity / 10) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{metrics.complexity} paints</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
            <div className="space-y-2 text-sm">
              {deltaE <= 2.0 ? (
                <div className="flex items-center text-green-600">
                  <span className="mr-2">✅</span>
                  Excellent color match achieved - ready for production
                </div>
              ) : deltaE <= 4.0 ? (
                <div className="flex items-center text-yellow-600">
                  <span className="mr-2">⚠️</span>
                  Good match - consider minor adjustments for critical applications
                </div>
              ) : (
                <div className="flex items-center text-red-600">
                  <span className="mr-2">❌</span>
                  Consider adjusting target color or adding more paints to collection
                </div>
              )}

              {metrics.complexity > 6 && (
                <div className="flex items-center text-orange-600">
                  <span className="mr-2">🔧</span>
                  Complex mix - consider simplifying for production efficiency
                </div>
              )}

              {metrics.totalCost > 50 && (
                <div className="flex items-center text-blue-600">
                  <span className="mr-2">💰</span>
                  High-cost mix - evaluate if alternative paints could reduce expense
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions View */}
      {activeView === 'instructions' && (
        <div className="px-6 py-4">
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📋 Mixing Instructions</h4>
            <p className="text-sm text-blue-700">
              Follow these steps carefully for accurate color reproduction.
              Use precise measurements and mix thoroughly between additions.
            </p>
          </div>

          <div className="space-y-4">
            {mixingInstructions.map((instruction, index) => (
              <div key={index} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {Math.floor(instruction.step)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{instruction.description}</div>
                  <div className="text-sm text-gray-600 mt-1">{instruction.details}</div>
                  {instruction.paintId && (
                    <div
                      className="inline-block w-4 h-4 rounded border border-gray-300 mt-2"
                      style={{ backgroundColor: instruction.color }}
                    />
                  )}
                </div>
                {instruction.volume && (
                  <div className="text-right">
                    <div className="font-medium text-blue-600">{instruction.volume.toFixed(1)} ml</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <h5 className="font-medium text-yellow-900 mb-2">⚠️ Important Notes</h5>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Ensure all paints are well-stirred before measuring</li>
              <li>• Use the same lighting conditions as your target assessment</li>
              <li>• Allow mixed paint to settle for 2-3 minutes before final evaluation</li>
              <li>• Test on a small area before full application</li>
              <li>• Record any deviations from instructions for future reference</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}