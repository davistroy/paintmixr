'use client';

import React from 'react';

interface PaintCollectionFilters {
  [key: string]: any;
}

interface CollectionFiltersProps {
  filters: PaintCollectionFilters;
  sortField: string;
  onFilterChange: (field: keyof PaintCollectionFilters, value: any) => void;
  onSort: (field: string) => void;
}

export default function CollectionFilters({
  filters,
  sortField,
  onFilterChange,
  onSort
}: CollectionFiltersProps) {
  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <select
          value={filters.color_space || ''}
          onChange={(e) => onFilterChange('color_space', e.target.value || undefined)}
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
          value={sortField}
          onChange={(e) => onSort(e.target.value)}
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
            checked={filters.include_default}
            onChange={(e) => onFilterChange('include_default', e.target.checked)}
            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Include default</span>
        </label>
      </div>
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={filters.archived}
            onChange={(e) => onFilterChange('archived', e.target.checked)}
            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Show archived</span>
        </label>
      </div>
    </div>
  );
}
