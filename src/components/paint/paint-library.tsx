'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PaintEntry, PaintFilters } from '@/lib/database/types';
import { LABColor } from '@/lib/color-science/types';
import { convertHexToLAB, convertLABtoHex } from '@/lib/color-science/color-utils';
import { calculateDeltaE } from '@/lib/color-science/delta-e';
import ColorPicker from '@/components/ui/color-picker';

interface PaintLibraryProps {
  collectionId?: string;
  onPaintSelect?: (paints: PaintEntry[]) => void;
  onPaintUpdate?: (paint: PaintEntry) => void;
  multiSelect?: boolean;
  showFilters?: boolean;
  className?: string;
}

interface PaintLibraryState {
  paints: PaintEntry[];
  loading: boolean;
  error: string | null;
  filters: PaintFilters;
  selectedPaints: Set<string>;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface PaintFormData {
  name: string;
  brand: string;
  hex_color: string;
  lab_l: number;
  lab_a: number;
  lab_b: number;
  volume_ml: number;
  cost_per_ml: number;
  finish_type: string;
  pigment_info?: string;
  notes?: string;
  collection_id?: string;
}

export default function PaintLibrary({
  collectionId,
  onPaintSelect,
  onPaintUpdate,
  multiSelect = false,
  showFilters = true,
  className = ''
}: PaintLibraryProps) {
  const [state, setState] = useState<PaintLibraryState>({
    paints: [],
    loading: true,
    error: null,
    filters: {
      search: '',
      brands: [],
      finish_types: [],
      min_volume_ml: undefined,
      max_volume_ml: undefined,
      min_cost_per_ml: undefined,
      max_cost_per_ml: undefined,
      color_similar_to: undefined,
      delta_e_threshold: undefined,
      collection_id: collectionId,
      archived: false
    },
    selectedPaints: new Set(),
    sortField: 'name',
    sortDirection: 'asc',
    pagination: { page: 1, limit: 20, total: 0 }
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPaint, setEditingPaint] = useState<PaintEntry | null>(null);
  const [formData, setFormData] = useState<PaintFormData>({
    name: '',
    brand: '',
    hex_color: '#ffffff',
    lab_l: 50,
    lab_a: 0,
    lab_b: 0,
    volume_ml: 100,
    cost_per_ml: 0.1,
    finish_type: 'matte',
    collection_id: collectionId
  });

  // Load paints from API
  const loadPaints = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams({
        page: state.pagination.page.toString(),
        limit: state.pagination.limit.toString(),
        sort_field: state.sortField,
        sort_direction: state.sortDirection
      });

      // Add filters
      if (state.filters.search) params.append('search', state.filters.search);
      if (state.filters.brands.length > 0) params.append('brands', state.filters.brands.join(','));
      if (state.filters.finish_types.length > 0) params.append('finish_types', state.filters.finish_types.join(','));
      if (state.filters.min_volume_ml !== undefined) params.append('min_volume_ml', state.filters.min_volume_ml.toString());
      if (state.filters.max_volume_ml !== undefined) params.append('max_volume_ml', state.filters.max_volume_ml.toString());
      if (state.filters.min_cost_per_ml !== undefined) params.append('min_cost_per_ml', state.filters.min_cost_per_ml.toString());
      if (state.filters.max_cost_per_ml !== undefined) params.append('max_cost_per_ml', state.filters.max_cost_per_ml.toString());
      if (state.filters.color_similar_to) {
        params.append('color_similar_to', JSON.stringify(state.filters.color_similar_to));
        if (state.filters.delta_e_threshold) params.append('delta_e_threshold', state.filters.delta_e_threshold.toString());
      }
      if (state.filters.collection_id) params.append('collection_id', state.filters.collection_id);
      params.append('archived', state.filters.archived.toString());

      const response = await fetch(`/api/paints?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load paints');
      }

      setState(prev => ({
        ...prev,
        paints: result.data || [],
        pagination: {
          ...prev.pagination,
          total: result.pagination?.total_count || 0
        },
        loading: false
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      }));
    }
  }, [state.pagination.page, state.pagination.limit, state.sortField, state.sortDirection, state.filters]);

  // Load paints when component mounts or dependencies change
  useEffect(() => {
    loadPaints();
  }, [loadPaints]);

  // Handle paint selection
  const handlePaintSelect = (paintId: string, selected: boolean) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedPaints);

      if (multiSelect) {
        if (selected) {
          newSelected.add(paintId);
        } else {
          newSelected.delete(paintId);
        }
      } else {
        newSelected.clear();
        if (selected) {
          newSelected.add(paintId);
        }
      }

      const selectedPaintEntries = prev.paints.filter(p => newSelected.has(p.id));
      onPaintSelect?.(selectedPaintEntries);

      return { ...prev, selectedPaints: newSelected };
    });
  };

  // Handle filter changes
  const handleFilterChange = (field: keyof PaintFilters, value: any) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [field]: value },
      pagination: { ...prev.pagination, page: 1 }
    }));
  };

  // Handle sorting
  const handleSort = (field: string) => {
    setState(prev => ({
      ...prev,
      sortField: field,
      sortDirection: prev.sortField === field && prev.sortDirection === 'asc' ? 'desc' : 'asc',
      pagination: { ...prev.pagination, page: 1 }
    }));
  };

  // Handle form submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingPaint ? `/api/paints/${editingPaint.id}` : '/api/paints';
      const method = editingPaint ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to save paint');
      }

      // Refresh paint list
      await loadPaints();

      // Notify parent of update
      if (editingPaint && onPaintUpdate) {
        onPaintUpdate(result.data);
      }

      // Reset form
      setShowAddForm(false);
      setEditingPaint(null);
      setFormData({
        name: '',
        brand: '',
        hex_color: '#ffffff',
        lab_l: 50,
        lab_a: 0,
        lab_b: 0,
        volume_ml: 100,
        cost_per_ml: 0.1,
        finish_type: 'matte',
        collection_id: collectionId
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Handle color change in form
  const handleColorChange = (color: LABColor) => {
    setFormData(prev => ({
      ...prev,
      lab_l: color.L,
      lab_a: color.a,
      lab_b: color.b,
      hex_color: convertLABtoHex(color)
    }));
  };

  // Calculate Delta E for color similarity
  const calculateSimilarity = (paint: PaintEntry, targetColor: LABColor) => {
    const paintColor: LABColor = {
      L: paint.lab_l,
      a: paint.lab_a,
      b: paint.lab_b
    };
    return calculateDeltaE(paintColor, targetColor);
  };

  if (state.loading && state.paints.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-gray-500">Loading paints...</div>
      </div>
    );
  }

  return (
    <div className={`paint-library bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Paint Library</h2>
            <p className="text-sm text-gray-500">
              {state.pagination.total} paints • {state.selectedPaints.size} selected
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Paint
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search paints..."
                value={state.filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const brands = [...state.filters.brands, e.target.value];
                    handleFilterChange('brands', brands);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Add brand filter...</option>
                <option value="Liquitex">Liquitex</option>
                <option value="Golden">Golden</option>
                <option value="Winsor & Newton">Winsor & Newton</option>
                <option value="Vallejo">Vallejo</option>
              </select>
            </div>
            <div>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    const finishTypes = [...state.filters.finish_types, e.target.value];
                    handleFilterChange('finish_types', finishTypes);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Add finish filter...</option>
                <option value="matte">Matte</option>
                <option value="satin">Satin</option>
                <option value="gloss">Gloss</option>
                <option value="metallic">Metallic</option>
              </select>
            </div>
            <div>
              <button
                onClick={() => handleFilterChange('filters', {
                  search: '',
                  brands: [],
                  finish_types: [],
                  min_volume_ml: undefined,
                  max_volume_ml: undefined,
                  min_cost_per_ml: undefined,
                  max_cost_per_ml: undefined,
                  color_similar_to: undefined,
                  delta_e_threshold: undefined,
                  collection_id: collectionId,
                  archived: false
                })}
                className="w-full px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Active filters */}
        {(state.filters.brands.length > 0 || state.filters.finish_types.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {state.filters.brands.map(brand => (
              <span key={brand} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Brand: {brand}
                <button
                  onClick={() => {
                    const brands = state.filters.brands.filter(b => b !== brand);
                    handleFilterChange('brands', brands);
                  }}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
            {state.filters.finish_types.map(finish => (
              <span key={finish} className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Finish: {finish}
                <button
                  onClick={() => {
                    const finishTypes = state.filters.finish_types.filter(f => f !== finish);
                    handleFilterChange('finish_types', finishTypes);
                  }}
                  className="ml-1 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Error display */}
      {state.error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          {state.error}
        </div>
      )}

      {/* Paint grid */}
      <div className="p-6">
        {state.paints.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No paints found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {state.paints.map(paint => {
              const isSelected = state.selectedPaints.has(paint.id);
              const similarityScore = state.filters.color_similar_to ?
                calculateSimilarity(paint, state.filters.color_similar_to) : null;

              return (
                <div
                  key={paint.id}
                  className={`paint-card border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handlePaintSelect(paint.id, !isSelected)}
                >
                  {/* Color swatch */}
                  <div
                    className="w-full h-16 rounded-lg border border-gray-200 mb-3"
                    style={{ backgroundColor: paint.hex_color }}
                  />

                  {/* Paint info */}
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-medium text-gray-900 truncate">{paint.name}</h3>
                      <p className="text-sm text-gray-600">{paint.brand}</p>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>{paint.volume_ml}ml</span>
                      <span>${paint.cost_per_ml.toFixed(3)}/ml</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span className="capitalize">{paint.finish_type}</span>
                      <span>Used {paint.times_used}x</span>
                    </div>

                    {similarityScore !== null && (
                      <div className="text-xs">
                        <span className={`px-2 py-1 rounded-full ${
                          similarityScore <= 2 ? 'bg-green-100 text-green-800' :
                          similarityScore <= 4 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          ΔE = {similarityScore.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Edit button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingPaint(paint);
                      setFormData({
                        name: paint.name,
                        brand: paint.brand,
                        hex_color: paint.hex_color,
                        lab_l: paint.lab_l,
                        lab_a: paint.lab_a,
                        lab_b: paint.lab_b,
                        volume_ml: paint.volume_ml,
                        cost_per_ml: paint.cost_per_ml,
                        finish_type: paint.finish_type,
                        pigment_info: paint.pigment_info || '',
                        notes: paint.notes || '',
                        collection_id: paint.collection_id
                      });
                      setShowAddForm(true);
                    }}
                    className="absolute top-2 left-2 w-6 h-6 bg-white rounded-full shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {state.pagination.total > state.pagination.limit && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((state.pagination.page - 1) * state.pagination.limit) + 1} to{' '}
              {Math.min(state.pagination.page * state.pagination.limit, state.pagination.total)} of{' '}
              {state.pagination.total} paints
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setState(prev => ({
                  ...prev,
                  pagination: { ...prev.pagination, page: prev.pagination.page - 1 }
                }))}
                disabled={state.pagination.page <= 1}
                className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setState(prev => ({
                  ...prev,
                  pagination: { ...prev.pagination, page: prev.pagination.page + 1 }
                }))}
                disabled={state.pagination.page >= Math.ceil(state.pagination.total / state.pagination.limit)}
                className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Paint Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingPaint ? 'Edit Paint' : 'Add New Paint'}
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Color picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                  <ColorPicker
                    initialColor={{ L: formData.lab_l, a: formData.lab_a, b: formData.lab_b }}
                    onColorChange={handleColorChange}
                    size="sm"
                    className="border border-gray-300 rounded-md"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Volume (ml)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.volume_ml}
                      onChange={(e) => setFormData(prev => ({ ...prev, volume_ml: parseFloat(e.target.value) || 0 }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost per ml</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={formData.cost_per_ml}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost_per_ml: parseFloat(e.target.value) || 0 }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Finish Type</label>
                    <select
                      value={formData.finish_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, finish_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="matte">Matte</option>
                      <option value="satin">Satin</option>
                      <option value="gloss">Gloss</option>
                      <option value="metallic">Metallic</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingPaint(null);
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingPaint ? 'Update Paint' : 'Add Paint'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}