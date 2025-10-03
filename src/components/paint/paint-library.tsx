'use client';

import React, { useState } from 'react';
import { EnhancedPaintRow } from '@/lib/database/database.types';
import { LABColor } from '@/lib/color-science/types';
import { labToHex } from '@/lib/color-science';
import { usePaintLibrary } from '@/hooks/usePaintLibrary';
import PaintCard from './PaintCard';
import PaintFormModal, { PaintFormData } from './PaintFormModal';
import PaintPagination from './PaintPagination';

interface PaintLibraryProps {
  collectionId?: string;
  onPaintSelect?: (paints: EnhancedPaintRow[]) => void;
  onPaintUpdate?: (paint: EnhancedPaintRow) => void;
  multiSelect?: boolean;
  showFilters?: boolean;
  className?: string;
}

export default function PaintLibrary({
  collectionId,
  onPaintSelect,
  onPaintUpdate,
  multiSelect = false,
  showFilters = true,
  className = ''
}: PaintLibraryProps) {
  const {
    state,
    handlePaintSelect,
    handlePageChange,
    savePaint
  } = usePaintLibrary({
    collectionId,
    onPaintSelect,
    onPaintUpdate,
    multiSelect
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPaint, setEditingPaint] = useState<EnhancedPaintRow | null>(null);
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

  // Handle form submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await savePaint(formData, editingPaint);

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
      // Error is already set in state by savePaint
    }
  };

  // Handle color change in form
  const handleColorChange = (color: LABColor) => {
    setFormData((prev) => ({
      ...prev,
      lab_l: color.l,
      lab_a: color.a,
      lab_b: color.b,
      hex_color: labToHex(color)
    }));
  };

  // Handle form data change
  const handleFormDataChange = (field: keyof PaintFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle edit paint
  const handleEditPaint = (paint: EnhancedPaintRow) => {
    const paintLAB = paint.lab_color as unknown as LABColor;
    setEditingPaint(paint);
    setFormData({
      name: paint.name,
      brand: paint.brand,
      hex_color: paint.hex_color,
      lab_l: paintLAB.l,
      lab_a: paintLAB.a,
      lab_b: paintLAB.b,
      volume_ml: paint.volume_ml,
      cost_per_ml: paint.cost_per_ml,
      finish_type: paint.finish_type,
      notes: paint.notes || '',
      collection_id: paint.collection_id || undefined
    });
    setShowAddForm(true);
  };

  // Handle cancel form
  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingPaint(null);
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
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Filters coming soon...</p>
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
            {state.paints.map((paint) => (
              <PaintCard
                key={paint.id}
                paint={paint}
                isSelected={state.selectedPaints.has(paint.id)}
                onSelect={handlePaintSelect}
                onEdit={handleEditPaint}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        <PaintPagination
          page={state.pagination.page}
          limit={state.pagination.limit}
          total={state.pagination.total}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Add/Edit Paint Modal */}
      <PaintFormModal
        isOpen={showAddForm}
        editingPaint={editingPaint}
        formData={formData}
        onFormDataChange={handleFormDataChange}
        onColorChange={handleColorChange}
        onSubmit={handleFormSubmit}
        onCancel={handleCancelForm}
      />
    </div>
  );
}
