'use client';

import React from 'react';
import { PaintCollectionRow as PaintCollection } from '@/lib/database/database.types';

export interface CollectionFormData {
  name: string;
  description: string;
  color_space: 'sRGB' | 'Adobe_RGB' | 'ProPhoto_RGB' | 'Lab';
  is_default: boolean;
  tags: string[];
}

interface CollectionFormModalProps {
  isOpen: boolean;
  editingCollection: PaintCollection | null;
  formData: CollectionFormData;
  onFormDataChange: (field: keyof CollectionFormData, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function CollectionFormModal({
  isOpen,
  editingCollection,
  formData,
  onFormDataChange,
  onSubmit,
  onCancel
}: CollectionFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingCollection ? 'Edit Collection' : 'Create New Collection'}
          </h3>

          <form onSubmit={onSubmit} className="space-y-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => onFormDataChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color Space
              </label>
              <select
                value={formData.color_space}
                onChange={(e) => onFormDataChange('color_space', e.target.value)}
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
                  onChange={(e) => onFormDataChange('is_default', e.target.checked)}
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
                onClick={onCancel}
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
  );
}
