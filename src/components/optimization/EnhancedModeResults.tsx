/**
 * Enhanced Mode Results Component (T020)
 * Feature: 007-enhanced-mode-1
 *
 * Displays optimization results from Enhanced Mode API with:
 * - 2-5 paint formula display
 * - Delta E accuracy badge (excellent/good/acceptable/poor)
 * - Kubelka-Munk coefficients
 * - Performance metrics
 * - Warning messages
 */

'use client';

import React from 'react';
import { EnhancedOptimizationResponse, LABColor } from '@/lib/types';
import { labToRgb, rgbToHex } from '@/lib/color-science';

interface EnhancedModeResultsProps {
  response: EnhancedOptimizationResponse;
  targetColor: LABColor;
  onSaveToHistory?: () => void;
  onNewOptimization?: () => void;
  className?: string;
}

export default function EnhancedModeResults({
  response,
  targetColor,
  onSaveToHistory,
  onNewOptimization,
  className = ''
}: EnhancedModeResultsProps) {
  if (!response.success || !response.formula || !response.metrics) {
    return (
      <div className={`bg-white border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">😔</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Optimization Failed</h3>
          <p className="text-gray-600 mb-4">{response.error || 'Unable to find suitable paint mixture'}</p>
          {response.warnings && response.warnings.length > 0 && (
            <div className="mt-4 space-y-2">
              {response.warnings.map((warning, idx) => (
                <div key={idx} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                  {warning}
                </div>
              ))}
            </div>
          )}
          {onNewOptimization && (
            <button
              onClick={onNewOptimization}
              className="mt-6 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Try Different Settings
            </button>
          )}
        </div>
      </div>
    );
  }

  const { formula, metrics, warnings } = response;
  const targetHex = rgbToHex(labToRgb(targetColor));
  const achievedHex = rgbToHex(labToRgb(formula.predictedColor));

  // T020: Accuracy badge color-coding
  const getAccuracyVariant = (rating: 'excellent' | 'good' | 'acceptable' | 'poor') => {
    switch (rating) {
      case 'excellent':
        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' };
      case 'good':
        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' };
      case 'acceptable':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' };
      case 'poor':
        return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' };
    }
  };

  const accuracyBadge = getAccuracyVariant(formula.accuracyRating);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Header with Color Comparison and Accuracy Badge */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Optimized Formula</h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${accuracyBadge.bg} ${accuracyBadge.text} ${accuracyBadge.border}`}>
                {formula.accuracyRating.toUpperCase()}
              </span>
              <span className="text-sm text-gray-500">ΔE = {formula.deltaE.toFixed(2)}</span>
            </div>
          </div>

          {/* Color comparison swatches */}
          <div className="flex items-center space-x-3">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-lg border-2 border-gray-300 shadow-sm"
                style={{ backgroundColor: targetHex }}
                title="Target Color"
              />
              <div className="text-xs text-gray-500 mt-1">Target</div>
            </div>
            <div className="text-gray-400 text-2xl">→</div>
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-lg border-2 border-gray-300 shadow-sm"
                style={{ backgroundColor: achievedHex }}
                title="Achieved Color"
              />
              <div className="text-xs text-gray-500 mt-1">Result</div>
            </div>
          </div>
        </div>
      </div>

      {/* T020: Formula Table with 2-5 paint rows */}
      <div className="px-6 py-4">
        <h4 className="font-medium text-gray-900 mb-3">Paint Mixture</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paint
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Volume (ml)
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {formula.paintRatios.map((ratio) => (
                <tr key={ratio.paint_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {ratio.paint_name || ratio.paint_id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right font-mono">
                    {ratio.volume_ml.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right font-mono">
                    {ratio.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
              <tr>
                <td className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right font-mono">
                  {formula.totalVolume.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right font-mono">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* T020: Kubelka-Munk Coefficients and Opacity */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <h4 className="font-medium text-gray-900 mb-3">Color Properties</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">K (Absorption)</div>
            <div className="font-mono font-medium text-gray-900">{formula.kubelkaMunkK.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">S (Scattering)</div>
            <div className="font-mono font-medium text-gray-900">{formula.kubelkaMunkS.toFixed(3)}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Opacity</div>
            <div className="font-mono font-medium text-gray-900">{(formula.opacity * 100).toFixed(0)}%</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Complexity</div>
            <div className="flex items-center space-x-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                formula.mixingComplexity === 'simple'
                  ? 'bg-green-100 text-green-800'
                  : formula.mixingComplexity === 'moderate'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {formula.mixingComplexity}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* T020: Performance Metrics */}
      <div className="px-6 py-4 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-3">Performance Metrics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Algorithm</div>
            <div className="font-medium text-gray-900">
              {metrics.algorithmUsed.replace('_', ' ').toUpperCase()}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Time Elapsed</div>
            <div className="font-mono font-medium text-gray-900">
              {(metrics.timeElapsed / 1000).toFixed(2)}s
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Iterations</div>
            <div className="font-mono font-medium text-gray-900">
              {metrics.iterationsCompleted.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Convergence</div>
            <div className="flex items-center space-x-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                metrics.convergenceAchieved
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {metrics.convergenceAchieved ? 'Achieved' : 'Not achieved'}
              </span>
            </div>
          </div>
        </div>

        {/* Additional metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-4">
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Target Met</div>
            <div className="flex items-center space-x-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                metrics.targetMet ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {metrics.targetMet ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Improvement Rate</div>
            <div className="font-mono font-medium text-gray-900">
              {(metrics.improvementRate * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Delta E Range</div>
            <div className="font-mono text-xs text-gray-700">
              {metrics.initialBestDeltaE.toFixed(2)} → {metrics.finalBestDeltaE.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* T020: Warnings Display */}
      {warnings && warnings.length > 0 && (
        <div className="px-6 py-4 border-t border-yellow-200 bg-yellow-50">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Optimization Warnings</h4>
              <ul className="list-disc pl-5 space-y-1">
                {warnings.map((warning, idx) => (
                  <li key={idx} className="text-sm text-yellow-700">{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
        {onNewOptimization && (
          <button
            onClick={onNewOptimization}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            New Optimization
          </button>
        )}
        {onSaveToHistory && (
          <button
            onClick={onSaveToHistory}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save to History
          </button>
        )}
      </div>
    </div>
  );
}
