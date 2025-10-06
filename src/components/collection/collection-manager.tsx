'use client';

import React, { useState } from 'react';
import { PaintCollectionRow as PaintCollection } from '@/lib/database/database.types';
import { useCollectionManager } from '@/hooks/useCollectionManager';
import CollectionCard from './CollectionCard';
import CollectionFilters from './CollectionFilters';
import CollectionFormModal, { CollectionFormData } from './CollectionFormModal';

interface CollectionManagerProps {
  onCollectionSelect?: (collection: PaintCollection) => void;
  onCollectionUpdate?: (collection: PaintCollection) => void;
  selectedCollectionId?: string;
  showStatistics?: boolean;
  className?: string;
}

export default function CollectionManager({
  onCollectionSelect,
  onCollectionUpdate,
  selectedCollectionId,
  showStatistics = true,
  className = ''
}: CollectionManagerProps) {
  const {
    state,
    collectionStats,
    handleFilterChange,
    handleSort,
    handlePageChange,
    saveCollection,
    deleteCollection
  } = useCollectionManager({
    onCollectionSelect,
    onCollectionUpdate,
    showStatistics
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCollection, setEditingCollection] = useState<PaintCollection | null>(null);
  const [formData, setFormData] = useState<CollectionFormData>({
    name: '',
    description: '',
    color_space: 'sRGB',
    is_default: false,
    tags: []
  });

  // Handle collection selection
  const handleCollectionSelect = (collection: PaintCollection) => {
    onCollectionSelect?.(collection);
  };

  // Handle form submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await saveCollection(formData, editingCollection);

      // Reset form
      setShowCreateForm(false);
      setEditingCollection(null);
      setFormData({
        name: '',
        description: '',
        color_space: 'sRGB',
        is_default: false,
        tags: []
      });
    } catch {
      // Error is already set in state by saveCollection
    }
  };

  // Handle form data change
  const handleFormDataChange = (field: keyof CollectionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle edit collection
  const handleEditCollection = (collection: PaintCollection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || '',
      color_space: collection.color_space,
      is_default: collection.is_default,
      tags: (collection.tags as string[]) || []
    });
    setShowCreateForm(true);
  };

  // Handle cancel form
  const handleCancelForm = () => {
    setShowCreateForm(false);
    setEditingCollection(null);
  };

  if (state.loading && state.collections.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-gray-500">Loading collections...</div>
      </div>
    );
  }

  return (
    <div className={`collection-manager bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Paint Collections</h2>
            <p className="text-sm text-gray-500">{state.pagination.total} collections</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              New Collection
            </button>
          </div>
        </div>

        {/* Filters */}
        <CollectionFilters
          filters={state.filters}
          sortField={state.sortField}
          onFilterChange={handleFilterChange}
          onSort={handleSort}
        />
      </div>

      {/* Error display */}
      {state.error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
          {state.error}
        </div>
      )}

      {/* Collections grid */}
      <div className="p-6">
        {state.collections.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No collections found. Create your first collection to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                isSelected={selectedCollectionId === collection.id}
                statistics={collectionStats[collection.id]}
                showStatistics={showStatistics}
                onSelect={handleCollectionSelect}
                onEdit={handleEditCollection}
                onDelete={deleteCollection}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {state.pagination.total > state.pagination.limit && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(state.pagination.page - 1) * state.pagination.limit + 1} to{' '}
              {Math.min(state.pagination.page * state.pagination.limit, state.pagination.total)}{' '}
              of {state.pagination.total} collections
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(state.pagination.page - 1)}
                disabled={state.pagination.page <= 1}
                className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(state.pagination.page + 1)}
                disabled={
                  state.pagination.page >=
                  Math.ceil(state.pagination.total / state.pagination.limit)
                }
                className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Collection Modal */}
      <CollectionFormModal
        isOpen={showCreateForm}
        editingCollection={editingCollection}
        formData={formData}
        onFormDataChange={handleFormDataChange}
        onSubmit={handleFormSubmit}
        onCancel={handleCancelForm}
      />
    </div>
  );
}
