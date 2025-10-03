'use client';

import React from 'react';

interface UIFilters {
  search: string;
  brands: string[];
  finish_types: string[];
}

interface PaintFiltersProps {
  filters: UIFilters;
  onFilterChange: (field: keyof UIFilters, value: any) => void;
  onClearFilters: () => void;
}

export default function PaintFilters({
  filters,
  onFilterChange,
  onClearFilters
}: PaintFiltersProps) {
  return (
    <>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <input
            type="text"
            placeholder="Search paints..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                const brands = [...filters.brands, e.target.value];
                onFilterChange('brands', brands);
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
                const finishTypes = [...filters.finish_types, e.target.value];
                onFilterChange('finish_types', finishTypes);
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
            onClick={onClearFilters}
            className="w-full px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Active filters */}
      {(filters.brands.length > 0 || filters.finish_types.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {filters.brands.map((brand) => (
            <span
              key={brand}
              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              Brand: {brand}
              <button
                onClick={() => {
                  const brands = filters.brands.filter((b) => b !== brand);
                  onFilterChange('brands', brands);
                }}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
          {filters.finish_types.map((finish) => (
            <span
              key={finish}
              className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
            >
              Finish: {finish}
              <button
                onClick={() => {
                  const finishTypes = filters.finish_types.filter((f) => f !== finish);
                  onFilterChange('finish_types', finishTypes);
                }}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
