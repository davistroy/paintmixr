/**
 * Optimization Controls Component
 * Advanced controls for paint mixing optimization with real-time feedback
 */

'use client';

import React, { useState, useCallback } from 'react';
import { VolumeConstraints } from '@/lib/color-science/types';

interface OptimizationConfig {
  algorithm: 'differential_evolution' | 'tpe_hybrid' | 'auto';
  max_iterations: number;
  target_delta_e: number;
  time_limit_ms: number;
  require_color_verification: boolean;
  require_calibration: boolean;
}

interface PaintFilters {
  collection_id?: string;
  available_only: boolean;
  min_volume_ml?: number;
  verified_only: boolean;
  calibrated_only: boolean;
  excluded_paint_ids: string[];
}

interface OptimizationControlsProps {
  onOptimize: (config: OptimizationConfig, constraints: VolumeConstraints, filters: PaintFilters) => void;
  isOptimizing: boolean;
  availableCollections: Array<{ id: string; name: string; paint_count: number }>;
  availablePaints: number;
  className?: string;
  defaultConfig?: Partial<OptimizationConfig>;
  defaultConstraints?: Partial<VolumeConstraints>;
  defaultFilters?: Partial<PaintFilters>;
}

const ALGORITHM_DESCRIPTIONS = {
  auto: 'Automatically selects the best algorithm based on problem complexity',
  differential_evolution: 'Robust global optimization, slower but more thorough',
  tpe_hybrid: 'Fast optimization with machine learning acceleration'
} as const;

const PRESET_CONFIGURATIONS = {
  speed: {
    name: 'Speed Optimized',
    algorithm: 'tpe_hybrid' as const,
    max_iterations: 1000,
    target_delta_e: 2.5,
    time_limit_ms: 5000
  },
  accuracy: {
    name: 'Maximum Accuracy',
    algorithm: 'differential_evolution' as const,
    max_iterations: 5000,
    target_delta_e: 1.0,
    time_limit_ms: 15000
  },
  balanced: {
    name: 'Balanced',
    algorithm: 'auto' as const,
    max_iterations: 2000,
    target_delta_e: 2.0,
    time_limit_ms: 10000
  }
} as const;

export default function OptimizationControls({
  onOptimize,
  isOptimizing,
  availableCollections = [],
  availablePaints = 0,
  className = '',
  defaultConfig,
  defaultConstraints,
  defaultFilters
}: OptimizationControlsProps) {
  const [config, setConfig] = useState<OptimizationConfig>({
    algorithm: 'auto',
    max_iterations: 2000,
    target_delta_e: 2.0,
    time_limit_ms: 10000,
    require_color_verification: false,
    require_calibration: false,
    ...defaultConfig
  });

  const [constraints, setConstraints] = useState<VolumeConstraints>({
    min_total_volume_ml: 1.0,
    max_total_volume_ml: 1000.0,
    precision_ml: 0.1,
    max_paint_count: 10,
    min_paint_volume_ml: 0.5,
    asymmetric_ratios: true,
    ...defaultConstraints
  });

  const [filters, setFilters] = useState<PaintFilters>({
    available_only: true,
    verified_only: false,
    calibrated_only: false,
    excluded_paint_ids: [],
    ...defaultFilters
  });

  const [activeSection, setActiveSection] = useState<'algorithm' | 'constraints' | 'filters'>('algorithm');
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [estimatedAccuracy, setEstimatedAccuracy] = useState<number>(0);

  // Calculate optimization estimates
  const updateEstimates = useCallback(() => {
    const baseTime = {
      auto: 3000,
      differential_evolution: 5000,
      tpe_hybrid: 2000
    }[config.algorithm];

    const complexityMultiplier = Math.min(2.0, constraints.max_paint_count / 5);
    const accuracyMultiplier = Math.max(0.5, (4 - config.target_delta_e) / 2);

    const estimatedTimeMs = Math.min(config.time_limit_ms, baseTime * complexityMultiplier * accuracyMultiplier);
    const estimatedAccuracyPercent = Math.max(70, 100 - (config.target_delta_e * 10));

    setEstimatedTime(estimatedTimeMs);
    setEstimatedAccuracy(estimatedAccuracyPercent);
  }, [config, constraints]);

  React.useEffect(() => {
    updateEstimates();
  }, [updateEstimates]);

  const handleConfigChange = (updates: Partial<OptimizationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleConstraintsChange = (updates: Partial<VolumeConstraints>) => {
    setConstraints(prev => ({ ...prev, ...updates }));
  };

  const handleFiltersChange = (updates: Partial<PaintFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  const applyPreset = (preset: keyof typeof PRESET_CONFIGURATIONS) => {
    const presetConfig = PRESET_CONFIGURATIONS[preset];
    handleConfigChange({
      algorithm: presetConfig.algorithm,
      max_iterations: presetConfig.max_iterations,
      target_delta_e: presetConfig.target_delta_e,
      time_limit_ms: presetConfig.time_limit_ms
    });
  };

  const handleOptimize = () => {
    onOptimize(config, constraints, filters);
  };

  const getAvailablePaintCount = () => {
    let count = availablePaints;

    if (filters.collection_id) {
      const collection = availableCollections.find(c => c.id === filters.collection_id);
      count = collection?.paint_count || 0;
    }

    if (filters.verified_only || filters.calibrated_only) {
      count = Math.floor(count * 0.7); // Estimate reduction
    }

    return count;
  };

  const canOptimize = getAvailablePaintCount() >= 2 && !isOptimizing;

  return (
    <div className={`optimization-controls bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Optimization Settings</h3>
            <p className="text-sm text-gray-500">
              Configure paint mixing optimization for Delta E ≤ {config.target_delta_e}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Available Paints</div>
            <div className="text-2xl font-bold text-blue-600">{getAvailablePaintCount()}</div>
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="px-6 py-4 bg-gray-50">
        <div className="text-sm font-medium text-gray-700 mb-3">Quick Presets</div>
        <div className="flex space-x-2">
          {Object.entries(PRESET_CONFIGURATIONS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key as keyof typeof PRESET_CONFIGURATIONS)}
              disabled={isOptimizing}
              className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'algorithm', label: 'Algorithm', icon: '⚡' },
          { id: 'constraints', label: 'Constraints', icon: '⚖️' },
          { id: 'filters', label: 'Paint Filters', icon: '🎨' }
        ].map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id as any)}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 ${
              activeSection === section.id
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-2">{section.icon}</span>
            {section.label}
          </button>
        ))}
      </div>

      {/* Algorithm Settings */}
      {activeSection === 'algorithm' && (
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
                    onChange={(e) => handleConfigChange({ algorithm: e.target.value as any })}
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
              onChange={(e) => handleConfigChange({ target_delta_e: parseFloat(e.target.value) })}
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
              onChange={(e) => handleConfigChange({ max_iterations: parseInt(e.target.value) })}
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
              onChange={(e) => handleConfigChange({ time_limit_ms: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          {/* Quality Requirements */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.require_color_verification}
                onChange={(e) => handleConfigChange({ require_color_verification: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Require color-verified paints only</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={config.require_calibration}
                onChange={(e) => handleConfigChange({ require_calibration: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Require calibrated optical properties</span>
            </label>
          </div>
        </div>
      )}

      {/* Volume Constraints */}
      {activeSection === 'constraints' && (
        <div className="px-6 py-4 space-y-6">
          {/* Total Volume Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Total Volume (ml)
              </label>
              <input
                type="number"
                min="0.1"
                max="10000"
                step="0.1"
                value={constraints.min_total_volume_ml}
                onChange={(e) => handleConstraintsChange({ min_total_volume_ml: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Total Volume (ml)
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                step="1"
                value={constraints.max_total_volume_ml}
                onChange={(e) => handleConstraintsChange({ max_total_volume_ml: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Precision and Paint Limits */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precision (ml)
              </label>
              <select
                value={constraints.precision_ml}
                onChange={(e) => handleConstraintsChange({ precision_ml: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="0.1">0.1ml (High)</option>
                <option value="0.5">0.5ml (Medium)</option>
                <option value="1.0">1.0ml (Low)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Paints
              </label>
              <input
                type="number"
                min="2"
                max="20"
                value={constraints.max_paint_count}
                onChange={(e) => handleConstraintsChange({ max_paint_count: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Paint Volume (ml)
              </label>
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={constraints.min_paint_volume_ml}
                onChange={(e) => handleConstraintsChange({ min_paint_volume_ml: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Asymmetric Ratios */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={constraints.asymmetric_ratios}
                onChange={(e) => handleConstraintsChange({ asymmetric_ratios: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-medium">Enable asymmetric volume ratios</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Allows paints to be mixed in unequal proportions for better color matching
            </p>
          </div>
        </div>
      )}

      {/* Paint Filters */}
      {activeSection === 'filters' && (
        <div className="px-6 py-4 space-y-6">
          {/* Collection Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paint Collection
            </label>
            <select
              value={filters.collection_id || ''}
              onChange={(e) => handleFiltersChange({ collection_id: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">All Collections ({availablePaints} paints)</option>
              {availableCollections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name} ({collection.paint_count} paints)
                </option>
              ))}
            </select>
          </div>

          {/* Quality Filters */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.available_only}
                onChange={(e) => handleFiltersChange({ available_only: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Available paints only (sufficient volume)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.verified_only}
                onChange={(e) => handleFiltersChange({ verified_only: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Color-verified paints only</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.calibrated_only}
                onChange={(e) => handleFiltersChange({ calibrated_only: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Calibrated paints only</span>
            </label>
          </div>

          {/* Minimum Volume Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Paint Volume (ml)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={filters.min_volume_ml || ''}
              onChange={(e) => handleFiltersChange({
                min_volume_ml: e.target.value ? parseFloat(e.target.value) : undefined
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="No minimum"
            />
          </div>
        </div>
      )}

      {/* Optimization Estimates */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{(estimatedTime / 1000).toFixed(1)}s</div>
            <div className="text-sm text-gray-600">Estimated Time</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{estimatedAccuracy.toFixed(0)}%</div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Optimize Button */}
      <div className="px-6 py-4 border-t border-gray-200">
        <button
          onClick={handleOptimize}
          disabled={!canOptimize}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isOptimizing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Optimizing...</span>
            </>
          ) : (
            <>
              <span>Start Optimization</span>
              <span className="text-blue-200">⚡</span>
            </>
          )}
        </button>

        {!canOptimize && !isOptimizing && (
          <p className="text-sm text-red-600 mt-2 text-center">
            {getAvailablePaintCount() < 2 ? 'At least 2 paints required' : 'Cannot optimize'}
          </p>
        )}
      </div>
    </div>
  );
}