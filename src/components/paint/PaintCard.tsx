'use client';

import React from 'react';
import { EnhancedPaintRow } from '@/lib/database/database.types';
import { LABColor } from '@/lib/color-science/types';
import { deltaE2000 } from '@/lib/color-science';

interface PaintCardProps {
  paint: EnhancedPaintRow;
  isSelected: boolean;
  similarityTarget?: LABColor;
  onSelect: (paintId: string, selected: boolean) => void;
  onEdit: (paint: EnhancedPaintRow) => void;
}

export default function PaintCard({
  paint,
  isSelected,
  similarityTarget,
  onSelect,
  onEdit
}: PaintCardProps) {
  const paintLAB = paint.lab_color as unknown as LABColor;
  const similarityScore = similarityTarget && paintLAB
    ? deltaE2000(paintLAB, similarityTarget)
    : null;

  return (
    <div
      className={`paint-card relative border-2 rounded-lg p-4 cursor-pointer transition-all group ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onSelect(paint.id, !isSelected)}
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
            <span
              className={`px-2 py-1 rounded-full ${
                similarityScore <= 2
                  ? 'bg-green-100 text-green-800'
                  : similarityScore <= 4
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              ΔE = {similarityScore.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* Edit button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit(paint);
        }}
        className="absolute top-2 left-2 w-6 h-6 bg-white rounded-full shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>
    </div>
  );
}
