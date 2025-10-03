/**
 * Algorithm Settings Sub-component
 * Algorithm configuration for optimization controls
 */

'use client';

import React from 'react';

interface OptimizationConfig {
  algorithm: 'differential_evolution' | 'tpe_hybrid' | 'auto';
  max_iterations: number;
  target_delta_e: number;
  time_limit_ms: number;
  require_color_verification: boolean;
  require_calibration: boolean;
}

interface AlgorithmSettingsProps {
  config: OptimizationConfig;
  onConfigChange: (updates: Partial<OptimizationConfig>) => void;
}

const ALGORITHM_DESCRIPTIONS = {
  auto: 'Automatically selects the best algorithm based on problem complexity',
  differential_evolution: 'Robust global optimization, slower but more thorough',
  tpe_hybrid: 'Fast optimization with machine learning acceleration'
} as const;

export default function AlgorithmSettings({ config, onConfigChange }: AlgorithmSettingsProps) {
  return (
    <div className="px-6 py-4 space-y-6">
      {/* Algorithm Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Optimization Algorithm
        </label>
        <div className="space-y-3">
          {Object.entries(ALGORITHM_DESCRIPTIONS).map(([alg, description]) => (
            <label key={alg} className="flex items-start">
              <input
                type="radio"
                name="algorithm"
                value={alg}
                checked={config.algorithm === alg}
                onChange={(e) => onConfigChange({ algorithm: e.target.value as any })}
                className="mt-1 mr-3"
              />
              <div>
                <div className="font-medium capitalize">{alg.replace('_', ' ')}</div>
                <div className="text-sm text-gray-500">{description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Target Delta E */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Target Delta E: {config.target_delta_e.toFixed(1)}
        </label>
        <input
          type="range"
          min="0.5"
          max="4.0"
          step="0.1"
          value={config.target_delta_e}
          onChange={(e) => onConfigChange({ target_delta_e: parseFloat(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0.5 (Highest)</span>
          <span>2.0 (Target)</span>
          <span>4.0 (Acceptable)</span>
        </div>
      </div>

      {/* Max Iterations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Maximum Iterations: {config.max_iterations.toLocaleString()}
        </label>
        <input
          type="range"
          min="500"
          max="10000"
          step="100"
          value={config.max_iterations}
          onChange={(e) => onConfigChange({ max_iterations: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Time Limit */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time Limit: {(config.time_limit_ms / 1000).toFixed(1)}s
        </label>
        <input
          type="range"
          min="2000"
          max="30000"
          step="1000"
          value={config.time_limit_ms}
          onChange={(e) => onConfigChange({ time_limit_ms: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Quality Requirements */}
      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.require_color_verification}
            onChange={(e) => onConfigChange({ require_color_verification: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm">Require color-verified paints only</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.require_calibration}
            onChange={(e) => onConfigChange({ require_calibration: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm">Require calibrated optical properties</span>
        </label>
      </div>
    </div>
  );
}
