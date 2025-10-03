'use client';

import React from 'react';
import { EnhancedPaintRow } from '@/lib/database/database.types';
import { LABColor } from '@/lib/color-science/types';
import ColorPicker from '@/components/ui/color-picker';

export interface PaintFormData {
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

interface PaintFormModalProps {
  isOpen: boolean;
  editingPaint: EnhancedPaintRow | null;
  formData: PaintFormData;
  onFormDataChange: (field: keyof PaintFormData, value: any) => void;
  onColorChange: (color: LABColor) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function PaintFormModal({
  isOpen,
  editingPaint,
  formData,
  onFormDataChange,
  onColorChange,
  onSubmit,
  onCancel
}: PaintFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingPaint ? 'Edit Paint' : 'Add New Paint'}
          </h3>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => onFormDataChange('name', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => onFormDataChange('brand', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <ColorPicker
                initialColor={{ l: formData.lab_l, a: formData.lab_a, b: formData.lab_b }}
                onColorChange={onColorChange}
                size="sm"
                className="border border-gray-300 rounded-md"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volume (ml)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.volume_ml}
                  onChange={(e) =>
                    onFormDataChange('volume_ml', parseFloat(e.target.value) || 0)
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost per ml
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.cost_per_ml}
                  onChange={(e) =>
                    onFormDataChange('cost_per_ml', parseFloat(e.target.value) || 0)
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Finish Type
                </label>
                <select
                  value={formData.finish_type}
                  onChange={(e) => onFormDataChange('finish_type', e.target.value)}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => onFormDataChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
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
  );
}
