'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PaintCollectionRow as PaintCollection } from '@/lib/database/database.types';
import { LABColor } from '@/lib/types';
import { labToHex as labToHex } from '@/lib/color-science';

type PaintEntry = any;
type OptimizationResult = any;
import ColorPicker from '@/components/ui/color-picker';
import OptimizationControls from '@/components/optimization/optimization-controls';
import EnhancedModeResults from '@/components/optimization/EnhancedModeResults';
import PaintLibrary from '@/components/paint/paint-library';
import CollectionManager from '@/components/collection/collection-manager';
import { apiGet, apiPost } from '@/lib/api/client';
import { EnhancedOptimizationResponse } from '@/lib/types';

interface DashboardState {
  targetColor: LABColor;
  selectedCollection: PaintCollection | null;
  selectedPaints: PaintEntry[];
  optimizationResult: OptimizationResult | null;
  isOptimizing: boolean;
  optimizationHistory: OptimizationResult[];
  activeTab: 'optimize' | 'library' | 'collections' | 'history';
  recentMixes: any[];
  mode: 'standard' | 'enhanced';
  showProgress: boolean;
  progressMessage: string;
}

interface OptimizationConfig {
  algorithm: 'auto' | 'differential_evolution' | 'tpe_hybrid';
  target_delta_e: number;
  max_iterations: number;
  time_limit_ms: number;
  population_size?: number;
  asymmetric_ratios: boolean;
  volume_precision_ml: number;
  quality_vs_speed: 'quality' | 'balanced' | 'speed';
}

interface VolumeConstraints {
  total_volume_ml: number;
  min_volume_per_paint_ml: number;
  max_paint_count: number;
  allow_waste: boolean;
}

export default function PaintMixingDashboard() {
  const [state, setState] = useState<DashboardState>({
    targetColor: { l: 50, a: 0, b: 0 },
    selectedCollection: null,
    selectedPaints: [],
    optimizationResult: null,
    isOptimizing: false,
    optimizationHistory: [],
    activeTab: 'optimize',
    recentMixes: [],
    mode: 'standard',
    showProgress: false,
    progressMessage: ''
  });

  const [optimizationConfig, setOptimizationConfig] = useState<OptimizationConfig>({
    algorithm: 'auto',
    target_delta_e: 2.0,
    max_iterations: 1000,
    time_limit_ms: 30000,
    asymmetric_ratios: true,
    volume_precision_ml: 0.1,
    quality_vs_speed: 'balanced'
  });

  const [volumeConstraints, setVolumeConstraints] = useState<VolumeConstraints>({
    total_volume_ml: 100,
    min_volume_per_paint_ml: 0.5,
    max_paint_count: 8,
    allow_waste: false
  });

  // Load initial data
  useEffect(() => {
    loadDefaultCollection();
    loadRecentMixes();
    loadOptimizationHistory();
  }, []);

  // T018: Progress indicator with 5s/15s timers
  useEffect(() => {
    if (!state.isOptimizing) {
      setState(prev => ({ ...prev, showProgress: false, progressMessage: '' }));
      return;
    }

    // Show progress indicator after 5 seconds
    const timer1 = setTimeout(() => {
      setState(prev => ({
        ...prev,
        showProgress: true,
        progressMessage: state.mode === 'enhanced'
          ? 'Optimizing formula... This may take up to 30 seconds in Enhanced Mode'
          : 'Optimizing formula...'
      }));
    }, 5000);

    // Update message at 15 seconds
    const timer2 = setTimeout(() => {
      setState(prev => ({
        ...prev,
        progressMessage: 'Still optimizing... Finding best paint combination'
      }));
    }, 15000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [state.isOptimizing, state.mode]);

  const loadDefaultCollection = async () => {
    try {
      const response = await apiGet<PaintCollection[]>('/api/collections?include_default=true&limit=1');

      if (response.data && response.data.length > 0) {
        setState(prev => ({ ...prev, selectedCollection: response.data![0] }));
      } else if (response.error) {
        console.error('Failed to load default collection:', response.error.message);
      }
    } catch (error) {
      console.error('Failed to load default collection:', error);
    }
  };

  const loadRecentMixes = async () => {
    try {
      const response = await apiGet<any[]>('/api/mixing-history?limit=5&sort_field=created_at&sort_direction=desc');

      if (response.data) {
        setState(prev => ({ ...prev, recentMixes: response.data! }));
      } else if (response.error) {
        console.error('Failed to load recent mixes:', response.error.message);
      }
    } catch (error) {
      console.error('Failed to load recent mixes:', error);
    }
  };

  const loadOptimizationHistory = async () => {
    try {
      const response = await apiGet<OptimizationResult[]>('/api/mixing-history?limit=10&type=optimization');

      if (response.data) {
        setState(prev => ({ ...prev, optimizationHistory: response.data! }));
      } else if (response.error) {
        console.error('Failed to load optimization history:', response.error.message);
      }
    } catch (error) {
      console.error('Failed to load optimization history:', error);
    }
  };

  // Save mixing result helper (defined first to avoid circular dependency)
  const saveMixingResult = useCallback(async (result: OptimizationResult) => {
    try {
      await apiPost('/api/mixing-history', {
        target_color: state.targetColor,
        result_colors: [result.achieved_color],
        paint_mixture: result.solution?.paint_volumes || result.formula?.paintRatios,
        delta_e_achieved: result.quality_metrics?.delta_e || result.formula?.deltaE,
        optimization_time_ms: result.performance_metrics?.total_time_ms || result.metrics?.timeElapsed,
        total_volume_ml: result.solution?.total_volume_ml || result.formula?.totalVolume,
        total_cost: result.solution?.total_cost || 0,
        collection_id: state.selectedCollection?.id,
        optimization_config: optimizationConfig,
        volume_constraints: volumeConstraints,
        notes: `Auto-generated mix (${state.mode} mode)`
      });
    } catch (error) {
      console.error('Failed to save mixing result:', error);
    }
  }, [state.targetColor, state.selectedCollection, state.mode, optimizationConfig, volumeConstraints]);

  // T019: Handle color optimization with Enhanced Mode support
  const handleOptimize = useCallback(async () => {
    if (state.selectedPaints.length === 0) {
      alert('Please select at least one paint for optimization.');
      return;
    }

    setState(prev => ({ ...prev, isOptimizing: true, optimizationResult: null }));

    try {
      // Build Enhanced Mode API request (T019)
      const optimizationRequest = {
        targetColor: state.targetColor, // LABColor format
        availablePaints: state.selectedPaints.map(paint => paint.id), // Paint IDs only
        mode: state.mode, // 'standard' | 'enhanced'
        maxPaintCount: state.mode === 'enhanced' ? 5 : 3,
        timeLimit: state.mode === 'enhanced' ? 28000 : 10000,
        accuracyTarget: state.mode === 'enhanced' ? 2.0 : 5.0,
        volumeConstraints: {
          min_total_volume_ml: volumeConstraints.total_volume_ml * 0.9,
          max_total_volume_ml: volumeConstraints.total_volume_ml * 1.1,
          minimum_component_volume_ml: volumeConstraints.min_volume_per_paint_ml,
          allow_scaling: !volumeConstraints.allow_waste
        }
      };

      const response = await apiPost<any>(
        '/api/optimize',
        optimizationRequest
      );

      if (response.error) {
        throw new Error(response.error.message || 'Optimization failed');
      }

      const result = response.data!;

      // Check for warnings from Enhanced Mode
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Optimization warnings:', result.warnings);
      }

      setState(prev => ({
        ...prev,
        optimizationResult: result,
        optimizationHistory: [result, ...prev.optimizationHistory.slice(0, 9)]
      }));

      // Save to mixing history
      await saveMixingResult(result);

    } catch (error) {
      console.error('Optimization error:', error);
      alert(error instanceof Error ? error.message : 'Optimization failed');
    } finally {
      setState(prev => ({ ...prev, isOptimizing: false }));
    }
  }, [state.targetColor, state.selectedPaints, state.selectedCollection, state.mode, optimizationConfig, volumeConstraints, saveMixingResult]);

  // Handle paint selection from library
  const handlePaintSelection = (paints: PaintEntry[]) => {
    setState(prev => ({ ...prev, selectedPaints: paints }));
  };

  // Handle collection selection
  const handleCollectionSelect = (collection: PaintCollection) => {
    setState(prev => ({
      ...prev,
      selectedCollection: collection,
      selectedPaints: [] // Clear selected paints when changing collections
    }));
  };

  // Calculate optimization readiness
  const isOptimizationReady = state.selectedPaints.length > 0 && !state.isOptimizing;
  const targetHex = labToHex(state.targetColor);

  return (
    <div className="paint-mixing-dashboard min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">PaintMixr</h1>

              {/* T017: Enhanced Mode Toggle */}
              <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <label
                  htmlFor="enhanced-mode-toggle"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  {state.mode === 'enhanced' ? 'Enhanced Mode' : 'Standard Mode'}
                </label>
                <button
                  id="enhanced-mode-toggle"
                  role="switch"
                  aria-checked={state.mode === 'enhanced'}
                  aria-label="Toggle Enhanced Accuracy Mode"
                  onClick={() => setState(prev => ({
                    ...prev,
                    mode: prev.mode === 'enhanced' ? 'standard' : 'enhanced'
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    state.mode === 'enhanced' ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      state.mode === 'enhanced' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <button
                  aria-label="Enhanced Mode Information"
                  title={state.mode === 'enhanced'
                    ? 'Enhanced Mode: Delta E ≤ 2.0, 2-5 paint formulas, 30s processing'
                    : 'Standard Mode: Delta E ≤ 5.0, 2-3 paint formulas, faster processing'}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {state.selectedCollection && (
                <span className="text-sm text-gray-600">
                  Collection: <span className="font-medium">{state.selectedCollection.name}</span>
                </span>
              )}

              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${state.mode === 'enhanced' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                  <span>Target: ΔE ≤ {state.mode === 'enhanced' ? '2.0' : '5.0'}</span>
                  <span className="text-xs text-gray-400">
                    ({state.mode === 'enhanced' ? '2-5 paints' : '2-3 paints'})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'optimize', label: 'Color Mixing', count: state.selectedPaints.length },
              { id: 'library', label: 'Paint Library', count: null },
              { id: 'collections', label: 'Collections', count: null },
              { id: 'history', label: 'History', count: state.recentMixes.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setState(prev => ({ ...prev, activeTab: tab.id as any }))}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  state.activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className="ml-2 bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Optimize Tab */}
        {state.activeTab === 'optimize' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Target Color & Controls */}
            <div className="space-y-6">
              {/* Target Color Selection */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Target Color</h3>
                <ColorPicker
                  initialColor={state.targetColor}
                  onColorChange={(color) => setState(prev => ({ ...prev, targetColor: color }))}
                  size="lg"
                  showPreview={true}
                  allowManualInput={true}
                  referenceColor={state.optimizationResult?.achieved_color}
                  showDeltaE={!!state.optimizationResult}
                />

                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm text-gray-600">
                    <div>Target: {targetHex}</div>
                    <div>LAB: L*{state.targetColor.l.toFixed(1)} a*{state.targetColor.a.toFixed(1)} b*{state.targetColor.b.toFixed(1)}</div>
                  </div>
                </div>
              </div>

              {/* Optimization Controls */}
              {React.createElement(OptimizationControls as any, {
                config: optimizationConfig,
                constraints: volumeConstraints,
                onConfigChange: setOptimizationConfig,
                onConstraintsChange: setVolumeConstraints,
                selectedPaintCount: state.selectedPaints.length,
                className: "bg-white rounded-lg shadow"
              })}

              {/* Optimize Button */}
              <button
                onClick={handleOptimize}
                disabled={!isOptimizationReady}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isOptimizationReady
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {state.isOptimizing ? (
                  <div className="flex flex-col items-center justify-center space-y-2" role="status" aria-live="polite">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Optimizing...</span>
                    </div>
                    {state.showProgress && (
                      <span className="text-xs text-blue-100">{state.progressMessage}</span>
                    )}
                  </div>
                ) : (
                  `Optimize Color Mix (${state.selectedPaints.length} paints)`
                )}
              </button>

              {/* Quick Stats */}
              {state.selectedPaints.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Selected Paints</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Count:</span>
                      <span className="ml-2 font-medium">{state.selectedPaints.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Volume:</span>
                      <span className="ml-2 font-medium">
                        {state.selectedPaints.reduce((sum, p) => sum + p.volume_ml, 0).toFixed(0)}ml
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Avg Cost:</span>
                      <span className="ml-2 font-medium">
                        ${(state.selectedPaints.reduce((sum, p) => sum + p.cost_per_ml, 0) / state.selectedPaints.length).toFixed(3)}/ml
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Brands:</span>
                      <span className="ml-2 font-medium">
                        {new Set(state.selectedPaints.map(p => p.brand)).size}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Middle Column: Paint Selection */}
            <div>
              <PaintLibrary
                collectionId={state.selectedCollection?.id}
                onPaintSelect={handlePaintSelection}
                multiSelect={true}
                showFilters={true}
                className="h-full"
              />
            </div>

            {/* Right Column: Results */}
            <div>
              {state.optimizationResult ? (
                <EnhancedModeResults
                  response={state.optimizationResult as EnhancedOptimizationResponse}
                  targetColor={state.targetColor}
                  onSaveToHistory={() => {/* Already saved */}}
                  onNewOptimization={() => setState(prev => ({ ...prev, optimizationResult: null }))}
                  className="h-full"
                />
              ) : (
                <div className="bg-white rounded-lg shadow p-8 text-center h-96 flex items-center justify-center">
                  <div className="text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 3v18M21 11h-6M21 7h-6M21 15h-6" />
                    </svg>
                    <p className="text-sm">Select paints and click optimize to see results</p>
                    <p className="text-xs mt-2 text-gray-400">
                      {state.mode === 'enhanced' ? 'Enhanced Mode: 2-5 paints, ΔE ≤ 2.0' : 'Standard Mode: 2-3 paints, ΔE ≤ 5.0'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Library Tab */}
        {state.activeTab === 'library' && (
          <PaintLibrary
            collectionId={state.selectedCollection?.id}
            onPaintSelect={handlePaintSelection}
            multiSelect={true}
            showFilters={true}
          />
        )}

        {/* Collections Tab */}
        {state.activeTab === 'collections' && (
          <CollectionManager
            onCollectionSelect={handleCollectionSelect}
            selectedCollectionId={state.selectedCollection?.id}
            showStatistics={true}
          />
        )}

        {/* History Tab */}
        {state.activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Mixing History</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Your latest color mixing experiments and optimizations
                </p>
              </div>

              <div className="p-6">
                {state.recentMixes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No mixing history yet. Start optimizing colors to build your history.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {state.recentMixes.map((mix, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className="w-8 h-8 rounded-full border border-gray-300"
                              style={{ backgroundColor: labToHex(mix.target_color) }}
                            />
                            <div>
                              <p className="font-medium text-gray-900">
                                ΔE {mix.delta_e_achieved?.toFixed(2)} • {mix.total_volume_ml}ml
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(mix.created_at).toLocaleDateString()} • ${mix.total_cost?.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-900">{mix.optimization_time_ms}ms</p>
                            <p className="text-xs text-gray-500">{mix.paint_mixture?.length || 0} paints</p>
                          </div>
                        </div>

                        {mix.notes && (
                          <p className="text-sm text-gray-600 mt-2">{mix.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}