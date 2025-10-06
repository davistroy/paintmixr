// @ts-nocheck
import { SupabaseClient } from '@supabase/supabase-js';
import {
  Database,
  EnhancedPaintRow,
  EnhancedPaintInsert,
  EnhancedPaintUpdate,
  PaintCollectionRow,
  PaintCollectionUpdate,
  PaintFilters,
  PaginationOptions,
  PaginatedResponse,
  DatabaseResponse,
  ColorSearchResult,
  MixingRecommendation,
  UserPaintStats,
  SortDirection
} from '../database.types';
import {
  LABColor,
  OpticalProperties,
  ENHANCED_PAINT_TABLE,
  PAINT_COLLECTION_TABLE
} from '../models/enhanced-paint';
import { calculateCIEDE2000 } from '@/lib/color-science/delta-e-ciede2000';
import { logger } from '@/lib/logging/logger';

export class EnhancedPaintRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async createPaint(paintData: EnhancedPaintInsert): Promise<DatabaseResponse<EnhancedPaintRow>> {
    try {
      const { data, error } = await this.supabase
        .from(ENHANCED_PAINT_TABLE)
        .insert({
          ...paintData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      // Update collection paint count if paint is assigned to a collection
      if (paintData.collection_id) {
        await this.updateCollectionStats(paintData.collection_id);
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to create paint'
        }
      };
    }
  }

  async getPaintById(paintId: string, userId: string): Promise<DatabaseResponse<EnhancedPaintRow>> {
    try {
      const { data, error } = await this.supabase
        .from(ENHANCED_PAINT_TABLE)
        .select(`
          *,
          paint_collections (
            id,
            name,
            color_space
          )
        `)
        .eq('id', paintId)
        .eq('user_id', userId)
        .eq('archived', false)
        .single();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to get paint'
        }
      };
    }
  }

  async getUserPaints(
    userId: string,
    filters: PaintFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<EnhancedPaintRow>> {
    try {
      let query = this.supabase
        .from(ENHANCED_PAINT_TABLE)
        .select(`
          *,
          paint_collections (
            id,
            name,
            color_space
          )
        `, { count: 'exact' })
        .eq('user_id', userId)
        .eq('archived', filters.archived ?? false);

      // Apply filters
      if (filters.brand) {
        query = query.eq('brand', filters.brand);
      }
      if (filters.finish_type) {
        query = query.eq('finish_type', filters.finish_type);
      }
      if (filters.collection_id) {
        query = query.eq('collection_id', filters.collection_id);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }
      if (filters.min_volume !== undefined) {
        query = query.gte('volume_ml', filters.min_volume);
      }
      if (filters.max_volume !== undefined) {
        query = query.lte('volume_ml', filters.max_volume);
      }
      if (filters.min_cost !== undefined) {
        query = query.gte('cost_per_ml', filters.min_cost);
      }
      if (filters.max_cost !== undefined) {
        query = query.lte('cost_per_ml', filters.max_cost);
      }
      if (filters.color_verified !== undefined) {
        query = query.eq('color_accuracy_verified', filters.color_verified);
      }
      if (filters.calibrated !== undefined) {
        query = query.eq('optical_properties_calibrated', filters.calibrated);
      }

      // Apply sorting
      const sortField = pagination.sort_field || 'updated_at';
      const sortDirection = pagination.sort_direction || 'desc';
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const offset = (pagination.page - 1) * pagination.limit;
      query = query.range(offset, offset + pagination.limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return {
          data: null,
          error: { code: error.code, message: error.message },
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total_count: 0,
            total_pages: 0,
            has_next: false,
            has_previous: false
          }
        };
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: data || [],
        error: null,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total_count: totalCount,
          total_pages: totalPages,
          has_next: pagination.page < totalPages,
          has_previous: pagination.page > 1
        }
      };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to get paints'
        },
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total_count: 0,
          total_pages: 0,
          has_next: false,
          has_previous: false
        }
      };
    }
  }

  async updatePaint(
    paintId: string,
    userId: string,
    updates: EnhancedPaintUpdate
  ): Promise<DatabaseResponse<EnhancedPaintRow>> {
    try {
      // First get the current paint to check collection changes
      const currentPaint = await this.getPaintById(paintId, userId);
      if (!currentPaint.data) {
        return { data: null, error: { code: 'NOT_FOUND', message: 'Paint not found' } };
      }

      const { data, error } = await this.supabase
        .from(ENHANCED_PAINT_TABLE)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          version: (currentPaint.data.version || 1) + 1
        })
        .eq('id', paintId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      // Update collection stats if collection changed
      if (updates.collection_id !== undefined) {
        if (currentPaint.data.collection_id) {
          await this.updateCollectionStats(currentPaint.data.collection_id);
        }
        if (updates.collection_id) {
          await this.updateCollectionStats(updates.collection_id);
        }
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to update paint'
        }
      };
    }
  }

  async deletePaint(paintId: string, userId: string): Promise<DatabaseResponse<boolean>> {
    try {
      // Get paint info before deletion for collection stats update
      const paint = await this.getPaintById(paintId, userId);

      const { error } = await this.supabase
        .from(ENHANCED_PAINT_TABLE)
        .delete()
        .eq('id', paintId)
        .eq('user_id', userId);

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      // Update collection stats if paint was in a collection
      if (paint.data?.collection_id) {
        await this.updateCollectionStats(paint.data.collection_id);
      }

      return { data: true, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to delete paint'
        }
      };
    }
  }

  async archivePaint(
    paintId: string,
    userId: string,
    reason?: string
  ): Promise<DatabaseResponse<EnhancedPaintRow>> {
    try {
      const { data, error } = await this.supabase
        .from(ENHANCED_PAINT_TABLE)
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', paintId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      // Update collection stats
      if (data.collection_id) {
        await this.updateCollectionStats(data.collection_id);
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to archive paint'
        }
      };
    }
  }

  async searchPaintsByColor(
    userId: string,
    targetColor: LABColor,
    maxDeltaE: number = 5.0,
    limit: number = 10
  ): Promise<DatabaseResponse<ColorSearchResult[]>> {
    try {
      const { data, error } = await this.supabase.rpc('search_paints_by_color', {
        user_uuid: userId,
        target_lab: targetColor,
        max_delta_e: maxDeltaE,
        limit_count: limit
      });

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data: data || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to search paints by color'
        }
      };
    }
  }

  async getMixingRecommendations(
    userId: string,
    targetColor: LABColor,
    maxPaints: number = 8
  ): Promise<DatabaseResponse<MixingRecommendation[]>> {
    try {
      const { data, error } = await this.supabase.rpc('get_mixing_recommendations', {
        user_uuid: userId,
        target_color: targetColor,
        max_paints: maxPaints
      });

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data: data || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to get mixing recommendations'
        }
      };
    }
  }

  async updatePaintUsage(
    paintId: string,
    volumeUsed: number
  ): Promise<DatabaseResponse<boolean>> {
    try {
      const { data, error } = await this.supabase.rpc('update_paint_usage_stats', {
        paint_uuid: paintId,
        volume_used: volumeUsed
      });

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data: data || false, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to update paint usage'
        }
      };
    }
  }

  async getUserStats(userId: string): Promise<DatabaseResponse<UserPaintStats>> {
    try {
      const { data, error } = await this.supabase.rpc('get_user_paint_stats', {
        user_uuid: userId
      });

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data: data?.[0] || null, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to get user stats'
        }
      };
    }
  }

  async getCollectionPaints(
    collectionId: string,
    userId: string,
    pagination: PaginationOptions = { page: 1, limit: 50 }
  ): Promise<PaginatedResponse<EnhancedPaintRow>> {
    return this.getUserPaints(
      userId,
      { collection_id: collectionId },
      pagination
    );
  }

  async updateOpticalProperties(
    paintId: string,
    userId: string,
    opticalProperties: OpticalProperties,
    calibrationNotes?: string
  ): Promise<DatabaseResponse<EnhancedPaintRow>> {
    try {
      const { data, error } = await this.supabase
        .from(ENHANCED_PAINT_TABLE)
        .update({
          optical_properties: opticalProperties as unknown as Database['public']['Tables']['enhanced_paints']['Update']['optical_properties'],
          optical_properties_calibrated: true,
          calibration_date: new Date().toISOString(),
          quality_control_notes: calibrationNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', paintId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to update optical properties'
        }
      };
    }
  }

  async verifyColorAccuracy(
    paintId: string,
    userId: string,
    measuredColor: LABColor,
    verificationNotes?: string
  ): Promise<DatabaseResponse<{ verified: boolean; delta_e: number }>> {
    try {
      // Get current paint data
      const paintResult = await this.getPaintById(paintId, userId);
      if (!paintResult.data) {
        return { data: null, error: { code: 'NOT_FOUND', message: 'Paint not found' } };
      }

      const currentLabColor = paintResult.data.lab_color as LABColor;
      const deltaEResult = calculateCIEDE2000(currentLabColor, measuredColor);
      const isVerified = deltaEResult.delta_e <= paintResult.data.delta_e_tolerance;

      // Update paint with verification status
      const { error } = await this.supabase
        .from(ENHANCED_PAINT_TABLE)
        .update({
          color_accuracy_verified: isVerified,
          calibration_date: new Date().toISOString(),
          quality_control_notes: verificationNotes || `Color verification: ΔE = ${deltaEResult.delta_e.toFixed(3)}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', paintId)
        .eq('user_id', userId);

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return {
        data: {
          verified: isVerified,
          delta_e: deltaEResult.delta_e
        },
        error: null
      };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to verify color accuracy'
        }
      };
    }
  }

  async bulkUpdatePaints(
    paintIds: string[],
    userId: string,
    updates: Partial<EnhancedPaintUpdate>
  ): Promise<DatabaseResponse<EnhancedPaintRow[]>> {
    try {
      const { data, error } = await this.supabase
        .from(ENHANCED_PAINT_TABLE)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .in('id', paintIds)
        .eq('user_id', userId)
        .select();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data: data || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to bulk update paints'
        }
      };
    }
  }

  // Collection Management Methods

  async createCollection(
    collectionData: Omit<PaintCollectionRow, 'id' | 'created_at' | 'updated_at' | 'archived' | 'archived_at'>
  ): Promise<DatabaseResponse<PaintCollectionRow>> {
    try {
      const { data, error } = await this.supabase
        .from(PAINT_COLLECTION_TABLE)
        .insert({
          ...collectionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          archived: false
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to create collection'
        }
      };
    }
  }

  async getCollectionById(
    collectionId: string,
    userId: string
  ): Promise<DatabaseResponse<PaintCollectionRow>> {
    try {
      const { data, error } = await this.supabase
        .from(PAINT_COLLECTION_TABLE)
        .select('*')
        .eq('id', collectionId)
        .eq('user_id', userId)
        .eq('archived', false)
        .single();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to get collection'
        }
      };
    }
  }

  async getUserCollections(
    userId: string,
    filters: {
      color_space?: string;
      is_default?: boolean;
      archived?: boolean;
      min_paint_count?: number;
      max_paint_count?: number;
      tags?: string[];
    } = {},
    pagination: {
      page: number;
      limit: number;
      sort_field?: string;
      sort_direction?: SortDirection;
    } = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<PaintCollectionRow>> {
    try {
      let query = this.supabase
        .from(PAINT_COLLECTION_TABLE)
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('archived', filters.archived ?? false);

      // Apply filters
      if (filters.color_space) {
        query = query.eq('color_space', filters.color_space as Database['public']['Enums']['color_space']);
      }
      if (filters.is_default !== undefined) {
        query = query.eq('is_default', filters.is_default);
      }
      if (filters.min_paint_count !== undefined) {
        query = query.gte('paint_count', filters.min_paint_count);
      }
      if (filters.max_paint_count !== undefined) {
        query = query.lte('paint_count', filters.max_paint_count);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      // Apply sorting
      const sortField = pagination.sort_field || 'updated_at';
      const sortDirection = pagination.sort_direction || 'desc';
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const offset = (pagination.page - 1) * pagination.limit;
      query = query.range(offset, offset + pagination.limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return {
          data: null,
          error: { code: error.code, message: error.message },
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total_count: 0,
            total_pages: 0,
            has_next: false,
            has_previous: false
          }
        };
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: data || [],
        error: null,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total_count: totalCount,
          total_pages: totalPages,
          has_next: pagination.page < totalPages,
          has_previous: pagination.page > 1
        }
      };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to get collections'
        },
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total_count: 0,
          total_pages: 0,
          has_next: false,
          has_previous: false
        }
      };
    }
  }

  async updateCollection(
    collectionId: string,
    userId: string,
    updates: Partial<PaintCollectionUpdate>
  ): Promise<DatabaseResponse<PaintCollectionRow>> {
    try {
      const { data, error } = await this.supabase
        .from(PAINT_COLLECTION_TABLE)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to update collection'
        }
      };
    }
  }

  async deleteCollection(
    collectionId: string,
    userId: string
  ): Promise<DatabaseResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from(PAINT_COLLECTION_TABLE)
        .delete()
        .eq('id', collectionId)
        .eq('user_id', userId);

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data: true, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to delete collection'
        }
      };
    }
  }

  async archiveCollection(
    collectionId: string,
    userId: string,
    _reason?: string
  ): Promise<DatabaseResponse<PaintCollectionRow>> {
    try {
      const { data, error } = await this.supabase
        .from(PAINT_COLLECTION_TABLE)
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', collectionId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to archive collection'
        }
      };
    }
  }

  async movePaintsToCollection(
    sourceCollectionId: string,
    destinationCollectionId: string,
    userId: string
  ): Promise<DatabaseResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from(ENHANCED_PAINT_TABLE)
        .update({
          collection_id: destinationCollectionId,
          updated_at: new Date().toISOString()
        })
        .eq('collection_id', sourceCollectionId)
        .eq('user_id', userId);

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      // Update stats for both collections
      await this.updateCollectionStats(sourceCollectionId);
      await this.updateCollectionStats(destinationCollectionId);

      return { data: true, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to move paints'
        }
      };
    }
  }

  async archivePaintsByCollection(
    collectionId: string,
    userId: string,
    reason?: string
  ): Promise<DatabaseResponse<boolean>> {
    try {
      const { error } = await this.supabase
        .from(ENHANCED_PAINT_TABLE)
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('collection_id', collectionId)
        .eq('user_id', userId);

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      // Update collection stats
      await this.updateCollectionStats(collectionId);

      return { data: true, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to archive paints'
        }
      };
    }
  }

  async bulkArchiveCollections(
    collectionIds: string[],
    userId: string
  ): Promise<DatabaseResponse<PaintCollectionRow[]>> {
    try {
      const { data, error } = await this.supabase
        .from(PAINT_COLLECTION_TABLE)
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .in('id', collectionIds)
        .eq('user_id', userId)
        .select();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data: data || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to bulk archive collections'
        }
      };
    }
  }

  async bulkRestoreCollections(
    collectionIds: string[],
    userId: string
  ): Promise<DatabaseResponse<PaintCollectionRow[]>> {
    try {
      const { data, error } = await this.supabase
        .from(PAINT_COLLECTION_TABLE)
        .update({
          archived: false,
          archived_at: null,
          updated_at: new Date().toISOString()
        })
        .in('id', collectionIds)
        .eq('user_id', userId)
        .select();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data: data || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to bulk restore collections'
        }
      };
    }
  }

  async bulkUpdateCollections(
    collectionIds: string[],
    userId: string,
    updates: Partial<PaintCollectionUpdate>
  ): Promise<DatabaseResponse<PaintCollectionRow[]>> {
    try {
      const { data, error } = await this.supabase
        .from(PAINT_COLLECTION_TABLE)
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .in('id', collectionIds)
        .eq('user_id', userId)
        .select();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data: data || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to bulk update collections'
        }
      };
    }
  }

  async bulkDeleteCollections(
    collectionIds: string[],
    userId: string
  ): Promise<DatabaseResponse<PaintCollectionRow[]>> {
    try {
      const { data, error } = await this.supabase
        .from(PAINT_COLLECTION_TABLE)
        .delete()
        .in('id', collectionIds)
        .eq('user_id', userId)
        .select();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data: data || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to bulk delete collections'
        }
      };
    }
  }

  private async updateCollectionStats(collectionId: string): Promise<void> {
    try {
      // Get collection paints stats
      const { data: paints } = await this.supabase
        .from(ENHANCED_PAINT_TABLE)
        .select('volume_ml, cost_per_ml')
        .eq('collection_id', collectionId)
        .eq('archived', false);

      if (paints && paints.length > 0) {
        const totalVolume = paints.reduce((sum, paint) => sum + paint.volume_ml, 0);
        const weightedCostSum = paints.reduce((sum, paint) => sum + (paint.cost_per_ml * paint.volume_ml), 0);
        const averageCost = totalVolume > 0 ? weightedCostSum / totalVolume : 0;

        await this.supabase
          .from(PAINT_COLLECTION_TABLE)
          .update({
            paint_count: paints.length,
            total_volume_ml: totalVolume,
            average_cost_per_ml: averageCost,
            updated_at: new Date().toISOString()
          })
          .eq('id', collectionId);
      } else {
        // No paints in collection
        await this.supabase
          .from(PAINT_COLLECTION_TABLE)
          .update({
            paint_count: 0,
            total_volume_ml: 0,
            average_cost_per_ml: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', collectionId);
      }
    } catch (error) {
      logger.error('Failed to update collection stats:', error);
    }
  }

  // Mixing History Methods

  async getMixingHistory(
    userId: string,
    filters: any = {},
    pagination: { page: number; limit: number; sort_field?: string; sort_direction?: SortDirection } = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<any>> {
    try {
      let query = this.supabase
        .from('mixing_history')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Apply filters
      if (filters.project_name) {
        query = query.eq('project_name', filters.project_name);
      }
      if (filters.algorithm_used) {
        query = query.eq('optimization_algorithm', filters.algorithm_used);
      }
      if (filters.min_delta_e !== undefined) {
        query = query.gte('delta_e_achieved', filters.min_delta_e);
      }
      if (filters.max_delta_e !== undefined) {
        query = query.lte('delta_e_achieved', filters.max_delta_e);
      }
      if (filters.convergence_achieved !== undefined) {
        query = query.eq('convergence_achieved', filters.convergence_achieved);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Apply sorting
      const sortField = pagination.sort_field || 'created_at';
      const sortDirection = pagination.sort_direction || 'desc';
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const offset = (pagination.page - 1) * pagination.limit;
      query = query.range(offset, offset + pagination.limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return {
          data: null,
          error: { code: error.code, message: error.message },
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total_count: 0,
            total_pages: 0,
            has_next: false,
            has_previous: false
          }
        };
      }

      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pagination.limit);

      return {
        data: data || [],
        error: null,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total_count: totalCount,
          total_pages: totalPages,
          has_next: pagination.page < totalPages,
          has_previous: pagination.page > 1
        }
      };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to get mixing history'
        },
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total_count: 0,
          total_pages: 0,
          has_next: false,
          has_previous: false
        }
      };
    }
  }

  async saveMixingHistory(sessionData: any): Promise<DatabaseResponse<any>> {
    try {
      const { data, error } = await this.supabase
        .from('mixing_history')
        .insert({
          user_id: sessionData.user_id,
          target_color: sessionData.target_color,
          achieved_color: sessionData.achieved_color,
          delta_e_achieved: sessionData.delta_e_achieved,
          paint_volumes: sessionData.paint_volumes,
          total_volume_ml: sessionData.total_volume_ml,
          mixing_time_minutes: sessionData.mixing_time_minutes || 0,
          algorithm_used: sessionData.algorithm_used,
          iterations_completed: sessionData.iterations_completed,
          optimization_time_ms: sessionData.optimization_time_ms,
          convergence_achieved: sessionData.convergence_achieved
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: { code: error.code, message: error.message } };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to save mixing history'
        }
      };
    }
  }

  async updatePaintUsageStats(
    _paintId: string,
    _userId: string,
    _volumeUsed: number
  ): Promise<DatabaseResponse<boolean>> {
    try {
      // This is a stub implementation
      // TODO: Implement actual paint usage tracking
      return { data: true, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to update paint usage stats'
        }
      };
    }
  }

  async getPerformanceTrends(_userId: string): Promise<any> {
    // Stub implementation
    return { data: [], error: null };
  }

  async getColorAccuracyDistribution(_userId: string): Promise<any> {
    // Stub implementation
    return { data: [], error: null };
  }

  async getAlgorithmEffectiveness(_userId: string): Promise<any> {
    // Stub implementation
    return { data: [], error: null };
  }

  async getMixingCostAnalysis(_userId: string): Promise<any> {
    // Stub implementation
    return { data: [], error: null };
  }

  async getProjectSummary(_userId: string): Promise<any> {
    // Stub implementation
    return { data: [], error: null };
  }
}