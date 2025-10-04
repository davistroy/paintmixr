import { z } from 'zod';

export const OpticalPropertiesSchema = z.object({
  k_coefficients: z.array(z.number()).length(3),
  s_coefficients: z.array(z.number()).length(3),
  surface_reflectance: z.number().min(0).max(1),
  refractive_index: z.number().min(1).max(3),
  pigment_density: z.number().min(0).max(1),
  transparency: z.number().min(0).max(1),
  film_thickness_optimal: z.number().min(0.01).max(1.0),
  spectral_data: z.record(z.string(), z.number()).optional(),
  measurement_conditions: z.object({
    illuminant: z.string().default('D65'),
    observer: z.string().default('CIE_1931_2_DEGREE'),
    geometry: z.string().default('45_0'),
    measurement_date: z.date().optional(),
    calibration_standard: z.string().optional()
  }).optional()
});

export const LABColorSchema = z.object({
  l: z.number().min(0).max(100),
  a: z.number().min(-128).max(127),
  b: z.number().min(-128).max(127),
  measurement_conditions: z.object({
    illuminant: z.string().default('D65'),
    observer: z.string().default('CIE_1931_2_DEGREE')
  }).optional()
});

export const RGBColorSchema = z.object({
  r: z.number().int().min(0).max(255),
  g: z.number().int().min(0).max(255),
  b: z.number().int().min(0).max(255)
});

export const EnhancedPaintSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  collection_id: z.string().uuid().optional(),

  // Basic paint information
  name: z.string().min(1).max(255),
  brand: z.string().min(1).max(100),
  product_line: z.string().max(100).optional(),
  color_code: z.string().max(50).optional(),
  finish_type: z.enum(['matte', 'satin', 'semi_gloss', 'gloss', 'high_gloss']),

  // Visual representation
  lab_color: LABColorSchema,
  rgb_color: RGBColorSchema,
  hex_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),

  // Enhanced optical properties
  optical_properties: OpticalPropertiesSchema,

  // Physical properties
  volume_ml: z.number().min(0).max(10000),
  cost_per_ml: z.number().min(0).max(1000),
  viscosity: z.number().min(0).max(10000).optional(),
  density_g_per_ml: z.number().min(0.5).max(3.0).optional(),

  // Mixing characteristics
  mixing_compatibility: z.array(z.string()).default([]),
  mixing_restrictions: z.array(z.string()).default([]),
  drying_time_minutes: z.number().int().min(0).max(10080).optional(), // up to 1 week
  coverage_sqm_per_liter: z.number().min(0).max(50).optional(),

  // Color accuracy metrics
  delta_e_tolerance: z.number().min(0).max(10).default(2.0),
  color_stability_rating: z.number().int().min(1).max(5).default(3),
  lightfastness_rating: z.number().int().min(1).max(8).optional(),

  // Usage tracking
  times_used: z.number().int().min(0).default(0),
  total_volume_mixed: z.number().min(0).default(0),
  last_used_at: z.date().optional(),

  // Quality control
  color_accuracy_verified: z.boolean().default(false),
  optical_properties_calibrated: z.boolean().default(false),
  calibration_date: z.date().optional(),
  quality_control_notes: z.string().max(1000).optional(),

  // Metadata
  tags: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional(),
  purchase_date: z.date().optional(),
  expiry_date: z.date().optional(),
  supplier: z.string().max(255).optional(),

  // System fields
  created_at: z.date(),
  updated_at: z.date(),
  version: z.number().int().min(1).default(1),

  // Archive/soft delete
  archived: z.boolean().default(false),
  archived_at: z.date().optional(),
  archived_reason: z.string().max(500).optional()
});

export const EnhancedPaintCreateSchema = EnhancedPaintSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  times_used: true,
  total_volume_mixed: true,
  last_used_at: true,
  archived: true,
  archived_at: true
});

export const EnhancedPaintUpdateSchema = EnhancedPaintCreateSchema.partial();

export const PaintCollectionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  color_space: z.enum(['sRGB', 'Adobe_RGB', 'ProPhoto_RGB', 'Lab']).default('sRGB'),
  is_default: z.boolean().default(false),
  paint_count: z.number().int().min(0).default(0),
  total_volume_ml: z.number().min(0).default(0),
  average_cost_per_ml: z.number().min(0).default(0),
  tags: z.array(z.string()).default([]),
  created_at: z.date(),
  updated_at: z.date(),
  archived: z.boolean().default(false)
});

export const MixingHistorySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),

  // Target and result
  target_color: LABColorSchema,
  achieved_color: LABColorSchema,
  delta_e_achieved: z.number().min(0),

  // Recipe information
  paint_volumes: z.record(z.string(), z.number()),
  total_volume_ml: z.number().min(0),
  mixing_time_minutes: z.number().min(0),

  // Optimization details
  algorithm_used: z.string(),
  iterations_completed: z.number().int().min(0),
  optimization_time_ms: z.number().min(0),
  convergence_achieved: z.boolean(),

  // Quality metrics
  color_accuracy_score: z.number().min(0).max(10),
  mixing_efficiency_score: z.number().min(0).max(10),
  cost_effectiveness_score: z.number().min(0).max(10),

  // Usage context
  project_name: z.string().max(255).optional(),
  surface_type: z.string().max(100).optional(),
  application_method: z.string().max(100).optional(),
  environmental_conditions: z.object({
    temperature_c: z.number().optional(),
    humidity_percent: z.number().min(0).max(100).optional(),
    lighting_conditions: z.string().optional()
  }).optional(),

  // User feedback
  user_satisfaction_rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(2000).optional(),
  would_use_again: z.boolean().optional(),

  // System tracking
  created_at: z.date(),
  updated_at: z.date(),
  archived: z.boolean().default(false)
});

// Type exports
export type OpticalProperties = z.infer<typeof OpticalPropertiesSchema>;
export type LABColor = z.infer<typeof LABColorSchema>;
export type RGBColor = z.infer<typeof RGBColorSchema>;
export type EnhancedPaint = z.infer<typeof EnhancedPaintSchema>;
export type EnhancedPaintCreate = z.infer<typeof EnhancedPaintCreateSchema>;
export type EnhancedPaintUpdate = z.infer<typeof EnhancedPaintUpdateSchema>;
export type PaintCollection = z.infer<typeof PaintCollectionSchema>;
export type MixingHistory = z.infer<typeof MixingHistorySchema>;

// Database table definitions for Supabase
export const ENHANCED_PAINT_TABLE = 'paints' as any;
export const PAINT_COLLECTION_TABLE = 'paint_collections' as any;
export const MIXING_HISTORY_TABLE = 'mixing_history' as any;

// SQL for creating tables (for reference/migrations)
export const CREATE_ENHANCED_PAINTS_SQL = `
  CREATE TABLE IF NOT EXISTS enhanced_paints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES paint_collections(id) ON DELETE SET NULL,

    -- Basic information
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    product_line VARCHAR(100),
    color_code VARCHAR(50),
    finish_type VARCHAR(20) CHECK (finish_type IN ('matte', 'satin', 'semi_gloss', 'gloss', 'high_gloss')),

    -- Color representation
    lab_color JSONB NOT NULL,
    rgb_color JSONB NOT NULL,
    hex_color VARCHAR(7) NOT NULL,

    -- Optical properties
    optical_properties JSONB NOT NULL,

    -- Physical properties
    volume_ml DECIMAL(10,2) NOT NULL CHECK (volume_ml >= 0),
    cost_per_ml DECIMAL(8,4) NOT NULL CHECK (cost_per_ml >= 0),
    viscosity INTEGER,
    density_g_per_ml DECIMAL(4,2),

    -- Mixing characteristics
    mixing_compatibility JSONB DEFAULT '[]',
    mixing_restrictions JSONB DEFAULT '[]',
    drying_time_minutes INTEGER,
    coverage_sqm_per_liter DECIMAL(6,2),

    -- Color accuracy
    delta_e_tolerance DECIMAL(4,2) DEFAULT 2.0 CHECK (delta_e_tolerance >= 0),
    color_stability_rating INTEGER DEFAULT 3 CHECK (color_stability_rating BETWEEN 1 AND 5),
    lightfastness_rating INTEGER CHECK (lightfastness_rating BETWEEN 1 AND 8),

    -- Usage tracking
    times_used INTEGER DEFAULT 0 CHECK (times_used >= 0),
    total_volume_mixed DECIMAL(12,2) DEFAULT 0 CHECK (total_volume_mixed >= 0),
    last_used_at TIMESTAMPTZ,

    -- Quality control
    color_accuracy_verified BOOLEAN DEFAULT FALSE,
    optical_properties_calibrated BOOLEAN DEFAULT FALSE,
    calibration_date DATE,
    quality_control_notes TEXT,

    -- Metadata
    tags JSONB DEFAULT '[]',
    notes TEXT,
    purchase_date DATE,
    expiry_date DATE,
    supplier VARCHAR(255),

    -- System fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    version INTEGER DEFAULT 1,

    -- Archive
    archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_reason VARCHAR(500)
  );
`;

export const CREATE_PAINT_COLLECTIONS_SQL = `
  CREATE TABLE IF NOT EXISTS paint_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color_space VARCHAR(20) DEFAULT 'sRGB' CHECK (color_space IN ('sRGB', 'Adobe_RGB', 'ProPhoto_RGB', 'Lab')),
    is_default BOOLEAN DEFAULT FALSE,
    paint_count INTEGER DEFAULT 0,
    total_volume_ml DECIMAL(12,2) DEFAULT 0,
    average_cost_per_ml DECIMAL(8,4) DEFAULT 0,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived BOOLEAN DEFAULT FALSE,

    UNIQUE(user_id, name) WHERE NOT archived
  );
`;

export const CREATE_MIXING_HISTORY_SQL = `
  CREATE TABLE IF NOT EXISTS mixing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    target_color JSONB NOT NULL,
    achieved_color JSONB NOT NULL,
    delta_e_achieved DECIMAL(6,3) NOT NULL CHECK (delta_e_achieved >= 0),

    paint_volumes JSONB NOT NULL,
    total_volume_ml DECIMAL(10,2) NOT NULL CHECK (total_volume_ml >= 0),
    mixing_time_minutes DECIMAL(8,2) NOT NULL CHECK (mixing_time_minutes >= 0),

    algorithm_used VARCHAR(100) NOT NULL,
    iterations_completed INTEGER NOT NULL CHECK (iterations_completed >= 0),
    optimization_time_ms INTEGER NOT NULL CHECK (optimization_time_ms >= 0),
    convergence_achieved BOOLEAN NOT NULL,

    color_accuracy_score DECIMAL(4,2) CHECK (color_accuracy_score BETWEEN 0 AND 10),
    mixing_efficiency_score DECIMAL(4,2) CHECK (mixing_efficiency_score BETWEEN 0 AND 10),
    cost_effectiveness_score DECIMAL(4,2) CHECK (cost_effectiveness_score BETWEEN 0 AND 10),

    project_name VARCHAR(255),
    surface_type VARCHAR(100),
    application_method VARCHAR(100),
    environmental_conditions JSONB,

    user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating BETWEEN 1 AND 5),
    notes TEXT,
    would_use_again BOOLEAN,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived BOOLEAN DEFAULT FALSE
  );
`;

// Indexes for performance
export const CREATE_INDEXES_SQL = `
  -- Enhanced paints indexes
  CREATE INDEX IF NOT EXISTS idx_enhanced_paints_user_id ON enhanced_paints(user_id) WHERE NOT archived;
  CREATE INDEX IF NOT EXISTS idx_enhanced_paints_collection_id ON enhanced_paints(collection_id) WHERE NOT archived;
  CREATE INDEX IF NOT EXISTS idx_enhanced_paints_brand ON enhanced_paints(brand) WHERE NOT archived;
  CREATE INDEX IF NOT EXISTS idx_enhanced_paints_finish_type ON enhanced_paints(finish_type) WHERE NOT archived;
  CREATE INDEX IF NOT EXISTS idx_enhanced_paints_tags ON enhanced_paints USING GIN(tags) WHERE NOT archived;
  CREATE INDEX IF NOT EXISTS idx_enhanced_paints_updated_at ON enhanced_paints(updated_at) WHERE NOT archived;

  -- Paint collections indexes
  CREATE INDEX IF NOT EXISTS idx_paint_collections_user_id ON paint_collections(user_id) WHERE NOT archived;
  CREATE INDEX IF NOT EXISTS idx_paint_collections_is_default ON paint_collections(user_id, is_default) WHERE NOT archived;

  -- Mixing history indexes
  CREATE INDEX IF NOT EXISTS idx_mixing_history_user_id ON mixing_history(user_id) WHERE NOT archived;
  CREATE INDEX IF NOT EXISTS idx_mixing_history_created_at ON mixing_history(created_at) WHERE NOT archived;
  CREATE INDEX IF NOT EXISTS idx_mixing_history_delta_e ON mixing_history(delta_e_achieved) WHERE NOT archived;
  CREATE INDEX IF NOT EXISTS idx_mixing_history_algorithm ON mixing_history(algorithm_used) WHERE NOT archived;
`;

// Row Level Security policies
export const RLS_POLICIES_SQL = `
  -- Enable RLS
  ALTER TABLE enhanced_paints ENABLE ROW LEVEL SECURITY;
  ALTER TABLE paint_collections ENABLE ROW LEVEL SECURITY;
  ALTER TABLE mixing_history ENABLE ROW LEVEL SECURITY;

  -- Enhanced paints policies
  CREATE POLICY "Users can view their own paints" ON enhanced_paints
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own paints" ON enhanced_paints
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own paints" ON enhanced_paints
    FOR UPDATE USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own paints" ON enhanced_paints
    FOR DELETE USING (auth.uid() = user_id);

  -- Paint collections policies
  CREATE POLICY "Users can view their own collections" ON paint_collections
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own collections" ON paint_collections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own collections" ON paint_collections
    FOR UPDATE USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own collections" ON paint_collections
    FOR DELETE USING (auth.uid() = user_id);

  -- Mixing history policies
  CREATE POLICY "Users can view their own mixing history" ON mixing_history
    FOR SELECT USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own mixing history" ON mixing_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update their own mixing history" ON mixing_history
    FOR UPDATE USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete their own mixing history" ON mixing_history
    FOR DELETE USING (auth.uid() = user_id);
`;