import { useState, useCallback, useEffect } from 'react';
import { PaintCollectionRow as PaintCollection } from '@/lib/database/database.types';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/client';
import { CollectionFormData } from '@/components/collection/CollectionFormModal';

interface UseCollectionManagerProps {
  onCollectionSelect?: (collection: PaintCollection) => void;
  onCollectionUpdate?: (collection: PaintCollection) => void;
  showStatistics?: boolean;
}

interface CollectionManagerState {
  collections: PaintCollection[];
  loading: boolean;
  error: string | null;
  filters: any;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

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

export function useCollectionManager({
  showStatistics = true
}: UseCollectionManagerProps) {
  const [state, setState] = useState<CollectionManagerState>({
    collections: [],
    loading: true,
    error: null,
    filters: {
      color_space: undefined,
      include_default: true,
      archived: false,
      min_paint_count: undefined,
      max_paint_count: undefined,
      tags: []
    },
    sortField: 'updated_at',
    sortDirection: 'desc',
    pagination: { page: 1, limit: 12, total: 0 }
  });

  const [collectionStats, setCollectionStats] = useState<Record<string, CollectionStatistics>>(
    {}
  );

  // Load collections from API
  const loadCollections = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams({
        page: state.pagination.page.toString(),
        limit: state.pagination.limit.toString(),
        sort_field: state.sortField,
        sort_direction: state.sortDirection,
        include_default: state.filters.include_default.toString(),
        archived: state.filters.archived.toString()
      });

      if (state.filters.color_space) params.append('color_space', state.filters.color_space);
      if (state.filters.min_paint_count !== undefined)
        params.append('min_paint_count', state.filters.min_paint_count.toString());
      if (state.filters.max_paint_count !== undefined)
        params.append('max_paint_count', state.filters.max_paint_count.toString());
      if (state.filters.tags.length > 0)
        params.append('tags', state.filters.tags.join(','));

      const response = await apiGet<{
        data: PaintCollection[];
        pagination: { total_count: number };
      }>(`/api/collections?${params.toString()}`);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to load collections');
      }

      setState((prev) => ({
        ...prev,
        collections: response.data?.data || [],
        pagination: {
          ...prev.pagination,
          total: response.data?.pagination?.total_count || 0
        },
        loading: false
      }));

      // Load detailed statistics for each collection if needed
      if (showStatistics && response.data?.data) {
        const stats: Record<string, CollectionStatistics> = {};
        for (const collection of response.data.data) {
          try {
            const statsResponse = await apiGet<{
              data: { statistics: CollectionStatistics };
            }>(`/api/collections/${collection.id}`);
            if (statsResponse.data?.data?.statistics) {
              stats[collection.id] = statsResponse.data.data.statistics;
            }
          } catch (error) {
            console.warn(
              `Failed to load statistics for collection ${collection.id}:`,
              error
            );
          }
        }
        setCollectionStats(stats);
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
        loading: false
      }));
    }
  }, [
    state.pagination.page,
    state.pagination.limit,
    state.sortField,
    state.sortDirection,
    state.filters,
    showStatistics
  ]);

  // Load collections when component mounts or dependencies change
  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Handle filter changes
  const handleFilterChange = (field: keyof any, value: any) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, [field]: value },
      pagination: { ...prev.pagination, page: 1 }
    }));
  };

  // Handle sorting
  const handleSort = (field: string) => {
    setState((prev) => ({
      ...prev,
      sortField: field,
      sortDirection:
        prev.sortField === field && prev.sortDirection === 'asc' ? 'desc' : 'asc',
      pagination: { ...prev.pagination, page: 1 }
    }));
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setState((prev) => ({
      ...prev,
      pagination: { ...prev.pagination, page }
    }));
  };

  // Save collection (create or update)
  const saveCollection = async (
    formData: CollectionFormData,
    editingCollection: PaintCollection | null
  ) => {
    try {
      const url = `/api/collections${editingCollection ? `/${editingCollection.id}` : ''}`;
      const response = editingCollection
        ? await apiPut<{ data: PaintCollection }>(url, formData)
        : await apiPost<{ data: PaintCollection }>(url, formData);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to save collection');
      }

      // Refresh collections list
      await loadCollections();

      // Notify parent of update
      if (editingCollection && response.data?.data) {
        () => {};
      }

      return response.data?.data;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
      throw error;
    }
  };

  // Delete collection
  const deleteCollection = async (collection: PaintCollection) => {
    if (
      !confirm(
        `Are you sure you want to delete "${collection.name}"? This will archive the collection and its paints.`
      )
    ) {
      return;
    }

    try {
      const response = await apiDelete(`/api/collections/${collection.id}`);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete collection');
      }

      await loadCollections();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  return {
    state,
    collectionStats,
    handleFilterChange,
    handleSort,
    handlePageChange,
    saveCollection,
    deleteCollection,
    loadCollections
  };
}
