/**
 * Volume Constraints Settings Sub-component
 * Volume and precision configuration for optimization
 */

'use client';

import React from 'react';
import { ExtendedVolumeConstraints } from '@/lib/types';

interface VolumeConstraintsSettingsProps {
  constraints: ExtendedVolumeConstraints;
  onConstraintsChange: (updates: Partial<ExtendedVolumeConstraints>) => void;
}

export default function VolumeConstraintsSettings({
  constraints,
  onConstraintsChange
}: VolumeConstraintsSettingsProps) {
  return (
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
            onChange={(e) => onConstraintsChange({ min_total_volume_ml: parseFloat(e.target.value) })}
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
            onChange={(e) => onConstraintsChange({ max_total_volume_ml: parseFloat(e.target.value) })}
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
            onChange={(e) => onConstraintsChange({ precision_ml: parseFloat(e.target.value) })}
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
            onChange={(e) => onConstraintsChange({ max_paint_count: parseInt(e.target.value) })}
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
            onChange={(e) => onConstraintsChange({ min_paint_volume_ml: parseFloat(e.target.value) })}
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
            onChange={(e) => onConstraintsChange({ asymmetric_ratios: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm font-medium">Enable asymmetric volume ratios</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          Allows paints to be mixed in unequal proportions for better color matching
        </p>
      </div>
    </div>
  );
}
