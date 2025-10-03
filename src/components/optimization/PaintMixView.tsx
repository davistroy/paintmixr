/**
 * Paint Mix View Sub-component
 * Displays paint mixture details
 */

'use client';

import React from 'react';

interface PaintVolume {
  id: string;
  name: string;
  brand: string;
  volume_ml: number;
  percentage: number;
  hex_color: string;
  cost_per_ml: number;
}

interface OptimizationSolution {
  total_volume_ml: number;
}

interface PaintMixViewProps {
  solution?: OptimizationSolution;
  paintDetails: PaintVolume[];
  costPerMl: number;
}

export default function PaintMixView({ solution, paintDetails, costPerMl }: PaintMixViewProps) {
  return (
    <div className="px-6 py-4">
      {solution && (
        <div className="mb-4 text-center">
          <div className="text-lg font-medium">Total Volume: {solution.total_volume_ml.toFixed(1)} ml</div>
          <div className="text-sm text-gray-600">Cost per ml: ${costPerMl.toFixed(3)}</div>
        </div>
      )}

      <div className="space-y-3">
        {paintDetails.map((paint) => (
          <div key={paint.id} className="flex items-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center flex-1 space-x-4">
              <div className="flex-shrink-0">
                <div
                  className="w-12 h-12 rounded border-2 border-gray-200"
                  style={{ backgroundColor: paint.hex_color }}
                />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">{paint.name}</div>
                <div className="text-sm text-gray-600">{paint.brand}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">{paint.volume_ml.toFixed(1)} ml</div>
                <div className="text-sm text-gray-600">{paint.percentage.toFixed(1)}%</div>
              </div>
              <div className="text-right text-sm text-gray-600">
                ${(paint.volume_ml * paint.cost_per_ml).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Mix Representation */}
      <div className="mt-6">
        <div className="text-sm font-medium text-gray-700 mb-2">Proportional Mix</div>
        <div className="flex rounded-lg overflow-hidden border border-gray-200" style={{ height: '40px' }}>
          {paintDetails.map((paint) => (
            <div
              key={paint.id}
              style={{
                backgroundColor: paint.hex_color,
                width: `${paint.percentage}%`
              }}
              title={`${paint.name}: ${paint.percentage.toFixed(1)}%`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
