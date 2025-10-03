/**
 * Paint Filters Settings Sub-component
 * Paint selection filters for optimization
 */

'use client';

import React from 'react';

interface PaintFilters {
  collection_id?: string;
  available_only: boolean;
  min_volume_ml?: number;
  verified_only: boolean;
  calibrated_only: boolean;
  excluded_paint_ids: string[];
}

interface PaintFiltersSettingsProps {
  filters: PaintFilters;
  onFiltersChange: (updates: Partial<PaintFilters>) => void;
  availableCollections: Array<{ id: string; name: string; paint_count: number }>;
  availablePaints: number;
}

export default function PaintFiltersSettings({
  filters,
  onFiltersChange,
  availableCollections,
  availablePaints
}: PaintFiltersSettingsProps) {
  return (
    <div className="px-6 py-4 space-y-6">
      {/* Collection Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Paint Collection
        </label>
        <select
          value={filters.collection_id || ''}
          onChange={(e) => onFiltersChange({ collection_id: e.target.value || undefined })}
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
            onChange={(e) => onFiltersChange({ available_only: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm">Available paints only (sufficient volume)</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.verified_only}
            onChange={(e) => onFiltersChange({ verified_only: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm">Color-verified paints only</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.calibrated_only}
            onChange={(e) => onFiltersChange({ calibrated_only: e.target.checked })}
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
          onChange={(e) => onFiltersChange({
            min_volume_ml: e.target.value ? parseFloat(e.target.value) : undefined
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="No minimum"
        />
      </div>
    </div>
  );
}
