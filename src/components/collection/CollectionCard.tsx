'use client';

import React from 'react';
import type { PaintCollectionRow } from '@/lib/database/database.types';

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

interface CollectionCardProps {
  collection: PaintCollectionRow;
  isSelected: boolean;
  statistics?: CollectionStatistics;
  showStatistics: boolean;
  onSelect: (collection: PaintCollectionRow) => void;
  onEdit: (collection: PaintCollectionRow) => void;
  onDelete: (collection: PaintCollectionRow) => void;
}

export default function CollectionCard({
  collection,
  isSelected,
  statistics,
  showStatistics,
  onSelect,
  onEdit,
  onDelete
}: CollectionCardProps) {
  const formattedStats = statistics
    ? {
        paintCount: statistics.paint_count,
        totalVolume: `${statistics.total_volume_ml.toFixed(0)}ml`,
        totalValue: `$${statistics.total_value.toFixed(2)}`,
        avgCost: `$${statistics.average_cost_per_ml.toFixed(3)}/ml`,
        brands: statistics.brands.length,
        verified: `${statistics.color_verified_count}/${statistics.paint_count}`,
        calibrated: `${statistics.calibrated_count}/${statistics.paint_count}`
      }
    : null;

  return (
    <div
      className={`collection-card relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      onClick={() => onSelect(collection)}
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
            {collection.color_space} • Updated{' '}
            {new Date(collection.updated_at).toLocaleDateString()}
          </p>
        </div>

        {/* Action menu */}
        <div className="flex space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(collection);
            }}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(collection);
            }}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
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
      {collection.tags && Array.isArray(collection.tags) && (collection.tags as string[]).length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-1">
            {(collection.tags as string[]).map((tag) => (
              <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
