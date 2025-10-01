-- Performance indexes for enhanced color accuracy optimization queries
-- This migration adds indexes to optimize common query patterns for the enhanced accuracy system

-- Index for LAB color similarity searches (most performance-critical)
-- Used for finding paints within a specific Delta E range of target colors
CREATE INDEX IF NOT EXISTS idx_paints_lab_color_similarity
ON paints (lab_l, lab_a, lab_b)
WHERE archived = false;

-- Composite index for paint collection queries with color accuracy filters
-- Optimizes filtering by collection + color verification status
CREATE INDEX IF NOT EXISTS idx_paints_collection_accuracy
ON paints (collection_id, color_accuracy_verified, archived, created_at DESC);

-- Index for optimization history queries by performance metrics
-- Used for analyzing optimization trends and performance benchmarks
CREATE INDEX IF NOT EXISTS idx_mixing_history_performance
ON mixing_history (optimization_time_ms, delta_e_achieved, created_at DESC)
WHERE optimization_time_ms IS NOT NULL;

-- Index for finding paints by brand and optical properties
-- Optimizes queries for calibrated paints by specific brands
CREATE INDEX IF NOT EXISTS idx_paints_brand_optical
ON paints (brand, optical_properties_calibrated, finish_type)
WHERE archived = false;

-- Partial index for default collections with high paint counts
-- Optimizes loading default collection data for optimization workflows
CREATE INDEX IF NOT EXISTS idx_collections_default_active
ON paint_collections (is_default, paint_count DESC)
WHERE is_default = true AND archived = false;

-- Index for volume-based paint filtering during optimization
-- Used for finding paints within volume constraints
CREATE INDEX IF NOT EXISTS idx_paints_volume_cost
ON paints (volume_ml, cost_per_ml)
WHERE archived = false AND volume_ml > 0;

-- Index for mixing history queries by collection and time
-- Optimizes collection-specific history and analytics
CREATE INDEX IF NOT EXISTS idx_mixing_history_collection_time
ON mixing_history (collection_id, created_at DESC, delta_e_achieved);

-- Composite index for paint usage analytics
-- Used for calculating paint usage statistics and recommendations
CREATE INDEX IF NOT EXISTS idx_paints_usage_analytics
ON paints (collection_id, times_used DESC, last_used_at DESC)
WHERE archived = false;

-- Index for concurrent optimization request handling
-- Optimizes lookup of active optimization sessions
CREATE INDEX IF NOT EXISTS idx_optimization_sessions_active
ON mixing_history (user_id, created_at DESC)
WHERE optimization_time_ms IS NOT NULL
AND created_at > NOW() - INTERVAL '1 hour';

-- Index for color space filtering in collections
-- Optimizes queries filtering collections by color space
CREATE INDEX IF NOT EXISTS idx_collections_color_space
ON paint_collections (color_space, archived, updated_at DESC);

-- Partial index for high-accuracy verified paints
-- Optimizes finding the most accurate paints for precision mixing
CREATE INDEX IF NOT EXISTS idx_paints_high_accuracy
ON paints (lab_l, lab_a, lab_b, color_accuracy_verified)
WHERE color_accuracy_verified = true
AND optical_properties_calibrated = true
AND archived = false;

-- Index for paint search and filtering queries
-- Optimizes full-text search combined with filtering
CREATE INDEX IF NOT EXISTS idx_paints_search_filter
ON paints (name, brand, archived, collection_id);

-- Analyze tables to update query planner statistics
ANALYZE paints;
ANALYZE paint_collections;
ANALYZE mixing_history;

-- Comments for maintenance
COMMENT ON INDEX idx_paints_lab_color_similarity IS
'Critical for Delta E similarity searches - primary optimization bottleneck';

COMMENT ON INDEX idx_mixing_history_performance IS
'Used for performance benchmarking and regression detection';

COMMENT ON INDEX idx_paints_high_accuracy IS
'Optimizes finding premium paints for highest accuracy mixing (Delta E ≤ 2.0)';