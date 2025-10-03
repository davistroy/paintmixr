import { useState, useCallback, useEffect } from 'react';
import { EnhancedPaintRow } from '@/lib/database/database.types';
import { apiGet, apiPost, apiPut } from '@/lib/api/client';
import { PaintFormData } from '@/components/paint/PaintFormModal';

interface UsePaintLibraryProps {
  collectionId?: string;
  onPaintSelect?: (paints: EnhancedPaintRow[]) => void;
  onPaintUpdate?: (paint: EnhancedPaintRow) => void;
  multiSelect?: boolean;
}

interface LocalPaintFilters {
  search: string;
  brands: string[];
  finish_types: string[];
  min_volume_ml?: number;
  max_volume_ml?: number;
  min_cost_per_ml?: number;
  max_cost_per_ml?: number;
  color_similar_to?: any;
  delta_e_threshold?: number;
  collection_id?: string;
  archived: boolean;
}

interface PaintLibraryState {
  paints: EnhancedPaintRow[];
  loading: boolean;
  error: string | null;
  filters: LocalPaintFilters;
  selectedPaints: Set<string>;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export function usePaintLibrary({
  collectionId,
  onPaintSelect,
  onPaintUpdate,
  multiSelect = false
}: UsePaintLibraryProps) {
  const [state, setState] = useState<PaintLibraryState>({
    paints: [],
    loading: true,
    error: null,
    filters: {
      search: '',
      brands: [],
      finish_types: [],
      min_volume_ml: undefined,
      max_volume_ml: undefined,
      min_cost_per_ml: undefined,
      max_cost_per_ml: undefined,
      color_similar_to: undefined,
      delta_e_threshold: undefined,
      collection_id: collectionId,
      archived: false
    },
    selectedPaints: new Set(),
    sortField: 'name',
    sortDirection: 'asc',
    pagination: { page: 1, limit: 20, total: 0 }
  });

  // Load paints from API
  const loadPaints = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams({
        page: state.pagination.page.toString(),
        limit: state.pagination.limit.toString(),
        sort_field: state.sortField,
        sort_direction: state.sortDirection
      });

      // Add filters
      if (state.filters.search) params.append('search', state.filters.search);
      if (state.filters.brands.length > 0)
        params.append('brands', state.filters.brands.join(','));
      if (state.filters.finish_types.length > 0)
        params.append('finish_types', state.filters.finish_types.join(','));
      if (state.filters.min_volume_ml !== undefined)
        params.append('min_volume_ml', state.filters.min_volume_ml.toString());
      if (state.filters.max_volume_ml !== undefined)
        params.append('max_volume_ml', state.filters.max_volume_ml.toString());
      if (state.filters.min_cost_per_ml !== undefined)
        params.append('min_cost_per_ml', state.filters.min_cost_per_ml.toString());
      if (state.filters.max_cost_per_ml !== undefined)
        params.append('max_cost_per_ml', state.filters.max_cost_per_ml.toString());
      if (state.filters.color_similar_to) {
        params.append('color_similar_to', JSON.stringify(state.filters.color_similar_to));
        if (state.filters.delta_e_threshold)
          params.append('delta_e_threshold', state.filters.delta_e_threshold.toString());
      }
      if (state.filters.collection_id)
        params.append('collection_id', state.filters.collection_id);
      params.append('archived', state.filters.archived.toString());

      const response = await apiGet<{
        data: EnhancedPaintRow[];
        pagination: { total_count: number };
      }>(`/api/paints?${params.toString()}`);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to load paints');
      }

      setState((prev) => ({
        ...prev,
        paints: response.data?.data || [],
        pagination: {
          ...prev.pagination,
          total: response.data?.pagination?.total_count || 0
        },
        loading: false
      }));
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
    state.filters
  ]);

  // Load paints when component mounts or dependencies change
  useEffect(() => {
    loadPaints();
  }, [loadPaints]);

  // Handle paint selection
  const handlePaintSelect = (paintId: string, selected: boolean) => {
    setState((prev) => {
      const newSelected = new Set(prev.selectedPaints);

      if (multiSelect) {
        if (selected) {
          newSelected.add(paintId);
        } else {
          newSelected.delete(paintId);
        }
      } else {
        newSelected.clear();
        if (selected) {
          newSelected.add(paintId);
        }
      }

      const selectedPaintEntries = prev.paints.filter((p) => newSelected.has(p.id));
      onPaintSelect?.(selectedPaintEntries);

      return { ...prev, selectedPaints: newSelected };
    });
  };

  // Handle filter changes
  const handleFilterChange = (field: keyof LocalPaintFilters, value: any) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, [field]: value },
      pagination: { ...prev.pagination, page: 1 }
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setState((prev) => ({
      ...prev,
      filters: {
        search: '',
        brands: [],
        finish_types: [],
        min_volume_ml: undefined,
        max_volume_ml: undefined,
        min_cost_per_ml: undefined,
        max_cost_per_ml: undefined,
        color_similar_to: undefined,
        delta_e_threshold: undefined,
        collection_id: collectionId,
        archived: false
      },
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

  // Save paint (create or update)
  const savePaint = async (formData: PaintFormData, editingPaint: EnhancedPaintRow | null) => {
    try {
      const url = `/api/paints${editingPaint ? `/${editingPaint.id}` : ''}`;
      const response = editingPaint
        ? await apiPut<{ data: EnhancedPaintRow }>(url, formData)
        : await apiPost<{ data: EnhancedPaintRow }>(url, formData);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to save paint');
      }

      // Refresh paint list
      await loadPaints();

      // Notify parent of update
      if (editingPaint && onPaintUpdate && response.data?.data) {
        onPaintUpdate(response.data.data);
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

  return {
    state,
    handlePaintSelect,
    handleFilterChange,
    clearFilters,
    handleSort,
    handlePageChange,
    savePaint,
    loadPaints
  };
}
