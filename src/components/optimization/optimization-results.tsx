/**
 * Optimization Results Component
 * Displays detailed results from paint mixing optimization
 */

'use client';

import React, { useState, useMemo } from 'react';
import { LABColor } from '@/lib/color-science/types';
import { labToRgb, rgbToHex } from '@/lib/color-science';
import ResultsSummaryView from './ResultsSummaryView';
import PaintMixView from './PaintMixView';
import MixingInstructionsView from './MixingInstructionsView';

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

interface MixingInstruction {
  step: number;
  action: string;
  description: string;
  details: string;
  paintId?: string;
  volume?: number;
  color?: string;
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

  const targetHex = rgbToHex(labToRgb(targetColor));
  const achievedHex = achievedColor ? rgbToHex(labToRgb(achievedColor)) : '#000000';

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
    const instructions: MixingInstruction[] = [];

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
    if (deltaE <= 1.0) return { label: 'Excellent', color: 'bg-green-100 text-green-800', icon: 'Target' };
    if (deltaE <= 2.0) return { label: 'Very Good', color: 'bg-blue-100 text-blue-800', icon: 'Star' };
    if (deltaE <= 3.0) return { label: 'Good', color: 'bg-yellow-100 text-yellow-800', icon: 'Check' };
    if (deltaE <= 4.0) return { label: 'Acceptable', color: 'bg-orange-100 text-orange-800', icon: 'Warning' };
    return { label: 'Poor', color: 'bg-red-100 text-red-800', icon: 'X' };
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
          { id: 'summary', label: 'Summary' },
          { id: 'paints', label: 'Paint Mix' },
          { id: 'analysis', label: 'Analysis' },
          { id: 'instructions', label: 'Instructions' }
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
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary View */}
      {activeView === 'summary' && (
        <ResultsSummaryView
          deltaE={deltaE}
          quality={quality}
          paintCount={paintDetails.length}
          totalCost={metrics.totalCost}
          performance={performance}
          onSaveToHistory={onSaveToHistory}
          onCreateNewMix={onCreateNewMix}
        />
      )}

      {/* Paint Mix View */}
      {activeView === 'paints' && (
        <PaintMixView
          solution={solution}
          paintDetails={paintDetails}
          costPerMl={metrics.costPerMl}
        />
      )}

      {/* Analysis View - Simplified for space */}
      {activeView === 'analysis' && showDetailedAnalysis && (
        <div className="px-6 py-4 space-y-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Color Analysis</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="font-medium">Target (LAB)</div>
                <div>L*: {targetColor.l.toFixed(2)}</div>
                <div>a*: {targetColor.a.toFixed(2)}</div>
                <div>b*: {targetColor.b.toFixed(2)}</div>
              </div>
              {achievedColor && (
                <div className="space-y-2">
                  <div className="font-medium">Achieved (LAB)</div>
                  <div>L*: {achievedColor.l.toFixed(2)}</div>
                  <div>a*: {achievedColor.a.toFixed(2)}</div>
                  <div>b*: {achievedColor.b.toFixed(2)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instructions View */}
      {activeView === 'instructions' && (
        <MixingInstructionsView instructions={mixingInstructions} />
      )}
    </div>
  );
}
