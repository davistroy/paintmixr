'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PaintCollection, PaintCollectionFilters } from '@/lib/database/types';

interface CollectionManagerProps {
  onCollectionSelect?: (collection: PaintCollection) => void;
  onCollectionUpdate?: (collection: PaintCollection) => void;
  selectedCollectionId?: string;
  showStatistics?: boolean;
  className?: string;
}

interface CollectionManagerState {
  collections: PaintCollection[];
  loading: boolean;
  error: string | null;
  filters: PaintCollectionFilters;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

interface CollectionFormData {
  name: string;
  description: string;
  color_space: 'sRGB' | 'Adobe_RGB' | 'ProPhoto_RGB' | 'Lab';
  is_default: boolean;
  tags: string[];
}

interface CollectionStatistics {
  paint_count: number;
  total_volume_ml: number;
  total_value: number;
  average_cost_per_ml: number;
  brands: string[];
  finish_types: string[];
  color_verified_count: number;
  calibrated_count: number;
  last_used: Date | null;
  most_used_paint: any;
}

export default function CollectionManager({
  onCollectionSelect,
  onCollectionUpdate,
  selectedCollectionId,
  showStatistics = true,
  className = ''
}: CollectionManagerProps) {
  const [state, setState] = useState<CollectionManagerState>({
    collections: [],
    loading: true,
    error: null,
    filters: {
      color_space: undefined,
      include_default: true,
      archived: false,
      min_paint_count: undefined,
      max_paint_count: undefined,
      tags: []
    },
    sortField: 'updated_at',
    sortDirection: 'desc',
    pagination: { page: 1, limit: 12, total: 0 }
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState<PaintCollection | null>(null);
  const [formData, setFormData] = useState<CollectionFormData>({
    name: '',
    description: '',
    color_space: 'sRGB',
    is_default: false,
    tags: []
  });

  const [collectionStats, setCollectionStats] = useState<Record<string, CollectionStatistics>>({});

  // Load collections from API
  const loadCollections = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams({
        page: state.pagination.page.toString(),
        limit: state.pagination.limit.toString(),
        sort_field: state.sortField,
        sort_direction: state.sortDirection,
        include_default: state.filters.include_default.toString(),
        archived: state.filters.archived.toString()
      });

      if (state.filters.color_space) params.append('color_space', state.filters.color_space);
      if (state.filters.min_paint_count !== undefined) params.append('min_paint_count', state.filters.min_paint_count.toString());
      if (state.filters.max_paint_count !== undefined) params.append('max_paint_count', state.filters.max_paint_count.toString());
      if (state.filters.tags.length > 0) params.append('tags', state.filters.tags.join(','));

      const response = await fetch(`/api/collections?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to load collections');
      }

      setState(prev => ({
        ...prev,
        collections: result.data || [],
        pagination: {
          ...prev.pagination,
          total: result.pagination?.total_count || 0
        },
        loading: false
      }));

      // Load detailed statistics for each collection if needed
      if (showStatistics && result.data) {
        const stats: Record<string, CollectionStatistics> = {};
        for (const collection of result.data) {
          try {
            const statsResponse = await fetch(`/api/collections/${collection.id}`);
            const statsResult = await statsResponse.json();
            if (statsResponse.ok && statsResult.data?.statistics) {
              stats[collection.id] = statsResult.data.statistics;
            }
          } catch (error) {
            console.warn(`Failed to load statistics for collection ${collection.id}:`, error);
          }
        }
        setCollectionStats(stats);
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      }));
    }
  }, [state.pagination.page, state.pagination.limit, state.sortField, state.sortDirection, state.filters, showStatistics]);

  // Load collections when component mounts or dependencies change
  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Handle collection selection
  const handleCollectionSelect = (collection: PaintCollection) => {
    onCollectionSelect?.(collection);
  };

  // Handle filter changes
  const handleFilterChange = (field: keyof PaintCollectionFilters, value: any) => {
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
      const url = editingCollection ? `/api/collections/${editingCollection.id}` : '/api/collections';
      const method = editingCollection ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to save collection');
      }

      // Refresh collections list
      await loadCollections();

      // Notify parent of update
      if (editingCollection && onCollectionUpdate) {
        onCollectionUpdate(result.data);
      }

      // Reset form
      setShowCreateForm(false);
      setEditingCollection(null);
      setFormData({
        name: '',
        description: '',
        color_space: 'sRGB',
        is_default: false,
        tags: []
      });

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Handle collection deletion
  const handleDeleteCollection = async (collection: PaintCollection) => {
    if (!confirm(`Are you sure you want to delete "${collection.name}"? This will archive the collection and its paints.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to delete collection');
      }

      await loadCollections();

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Format statistics display
  const formatStatistics = (stats: CollectionStatistics) => {
    return {
      paintCount: stats.paint_count,
      totalVolume: `${stats.total_volume_ml.toFixed(0)}ml`,
      totalValue: `$${stats.total_value.toFixed(2)}`,
      avgCost: `$${stats.average_cost_per_ml.toFixed(3)}/ml`,
      brands: stats.brands.length,
      verified: `${stats.color_verified_count}/${stats.paint_count}`,
      calibrated: `${stats.calibrated_count}/${stats.paint_count}`
    };
  };

  if (state.loading && state.collections.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-gray-500">Loading collections...</div>
      </div>
    );
  }

  return (
    <div className={`collection-manager bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Paint Collections</h2>
            <p className="text-sm text-gray-500">
              {state.pagination.total} collections
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              New Collection
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <select
              value={state.filters.color_space || ''}
              onChange={(e) => handleFilterChange('color_space', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Color Spaces</option>
              <option value="sRGB">sRGB</option>
              <option value="Adobe_RGB">Adobe RGB</option>
              <option value="ProPhoto_RGB">ProPhoto RGB</option>
              <option value="Lab">Lab</option>
            </select>
          </div>
          <div>
            <select
              value={state.sortField}
              onChange={(e) => handleSort(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="updated_at">Recently Updated</option>
              <option value="created_at">Date Created</option>
              <option value="name">Name</option>
              <option value="paint_count">Paint Count</option>
              <option value="total_volume_ml">Total Volume</option>
            </select>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={state.filters.include_default}
                onChange={(e) => handleFilterChange('include_default', e.target.checked)}
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include default</span>
            </label>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={state.filters.archived}
                onChange={(e) => handleFilterChange('archived', e.target.checked)}
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show archived</span>
            </label>
          </div>
        </div>
      </div>

      {/* Error display */}
      {state.error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          {state.error}
        </div>
      )}

      {/* Collections grid */}
      <div className="p-6">
        {state.collections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No collections found. Create your first collection to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.collections.map(collection => {
              const isSelected = selectedCollectionId === collection.id;
              const stats = collectionStats[collection.id];
              const formattedStats = stats ? formatStatistics(stats) : null;

              return (
                <div
                  key={collection.id}
                  className={`collection-card border-2 rounded-lg p-6 cursor-pointer transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                  }`}
                  onClick={() => handleCollectionSelect(collection)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{collection.name}</h3>
                        {collection.is_default && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{collection.description}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {collection.color_space} • Updated {new Date(collection.updated_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Action menu */}
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCollection(collection);
                          setFormData({
                            name: collection.name,
                            description: collection.description || '',
                            color_space: collection.color_space,
                            is_default: collection.is_default,
                            tags: collection.tags || []
                          });
                          setShowCreateForm(true);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCollection(collection);
                        }}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Statistics */}
                  {showStatistics && formattedStats && (
                    <div className="space-y-3 border-t border-gray-200 pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Paints:</span>
                          <span className="ml-2 font-medium">{formattedStats.paintCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Volume:</span>
                          <span className="ml-2 font-medium">{formattedStats.totalVolume}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Value:</span>
                          <span className="ml-2 font-medium">{formattedStats.totalValue}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Avg Cost:</span>
                          <span className="ml-2 font-medium">{formattedStats.avgCost}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{formattedStats.brands} brands</span>
                        <span>Verified: {formattedStats.verified}</span>
                        <span>Calibrated: {formattedStats.calibrated}</span>
                      </div>
                    </div>
                  )}

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-4 right-12 w-3 h-3 bg-blue-500 rounded-full"></div>
                  )}

                  {/* Tags */}
                  {collection.tags && collection.tags.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <div className="flex flex-wrap gap-1">
                        {collection.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
              {state.pagination.total} collections
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

      {/* Create/Edit Collection Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingCollection ? 'Edit Collection' : 'Create New Collection'}
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-4">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color Space</label>
                  <select
                    value={formData.color_space}
                    onChange={(e) => setFormData(prev => ({ ...prev, color_space: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="sRGB">sRGB</option>
                    <option value="Adobe_RGB">Adobe RGB</option>
                    <option value="ProPhoto_RGB">ProPhoto RGB</option>
                    <option value="Lab">Lab</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                      className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Set as default collection</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Only one collection can be the default. This will replace any existing default.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingCollection(null);
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingCollection ? 'Update Collection' : 'Create Collection'}
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