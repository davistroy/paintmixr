-- Enhanced Paints Table
-- Stores detailed optical properties for accurate Kubelka-Munk mixing calculations
-- Created: 2025-09-30 (Feature 002: Enhanced Accuracy)

CREATE TABLE IF NOT EXISTS paints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    collection_id UUID, -- Foreign key constraint added after paint_collections table created

    -- Basic paint information
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    sku VARCHAR(100),
    finish_type VARCHAR(50) DEFAULT 'matte' CHECK (finish_type IN ('matte', 'satin', 'gloss', 'metallic')),

    -- Color values
    hex VARCHAR(7) NOT NULL CHECK (hex ~* '^#[0-9A-Fa-f]{6}$'),
    lab_l DECIMAL(7,4) NOT NULL CHECK (lab_l >= 0 AND lab_l <= 100),
    lab_a DECIMAL(7,4) NOT NULL CHECK (lab_a >= -128 AND lab_a <= 127),
    lab_b DECIMAL(7,4) NOT NULL CHECK (lab_b >= -128 AND lab_b <= 127),
    rgb_r INTEGER NOT NULL CHECK (rgb_r >= 0 AND rgb_r <= 255),
    rgb_g INTEGER NOT NULL CHECK (rgb_g >= 0 AND rgb_g <= 255),
    rgb_b INTEGER NOT NULL CHECK (rgb_b >= 0 AND rgb_b <= 255),

    -- Kubelka-Munk optical properties
    k_coefficient DECIMAL(10,6) CHECK (k_coefficient >= 0),
    s_coefficient DECIMAL(10,6) CHECK (s_coefficient >= 0),
    spectral_reflectance JSONB, -- Array of reflectance values at wavelengths 380-780nm (10nm intervals)
    optical_properties_calibrated BOOLEAN DEFAULT false,
    color_accuracy_verified BOOLEAN DEFAULT false,

    -- Physical properties
    opacity DECIMAL(3,2) DEFAULT 0.5 CHECK (opacity >= 0 AND opacity <= 1),
    tinting_strength DECIMAL(3,2) DEFAULT 1.0 CHECK (tinting_strength > 0 AND tinting_strength <= 10),
    drying_time_hours INTEGER DEFAULT 24 CHECK (drying_time_hours > 0),
    volume_ml DECIMAL(10,2) CHECK (volume_ml > 0),
    cost_per_ml DECIMAL(10,4) CHECK (cost_per_ml >= 0),

    -- Usage tracking
    times_used INTEGER DEFAULT 0 CHECK (times_used >= 0),
    last_used_at TIMESTAMPTZ,

    -- Quality control
    verification_notes TEXT,
    calibration_date TIMESTAMPTZ,
    calibration_method VARCHAR(100),

    -- Metadata
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes (will be supplemented by indexes_accuracy_optimization.sql)
CREATE INDEX IF NOT EXISTS idx_paints_user_id ON paints(user_id);
CREATE INDEX IF NOT EXISTS idx_paints_collection_id ON paints(collection_id);
CREATE INDEX IF NOT EXISTS idx_paints_archived ON paints(archived) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_paints_name_search ON paints USING gin(to_tsvector('english', name));

-- Enable RLS
ALTER TABLE paints ENABLE ROW LEVEL SECURITY;

-- RLS Policies for paints table
-- Users can view their own paints
CREATE POLICY "Users can view own paints"
    ON paints FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own paints
CREATE POLICY "Users can insert own paints"
    ON paints FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own paints
CREATE POLICY "Users can update own paints"
    ON paints FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own paints (soft delete via archived flag recommended)
CREATE POLICY "Users can delete own paints"
    ON paints FOR DELETE
    USING (auth.uid() = user_id);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_paints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER paints_updated_at_trigger
    BEFORE UPDATE ON paints
    FOR EACH ROW
    EXECUTE FUNCTION update_paints_updated_at();

-- Increment times_used when paint is used
CREATE OR REPLACE FUNCTION increment_paint_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE paints
    SET times_used = times_used + 1,
        last_used_at = NOW()
    WHERE id = NEW.paint_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE paints IS 'Enhanced paint database with optical properties for Kubelka-Munk calculations';
COMMENT ON COLUMN paints.spectral_reflectance IS 'Array of 41 reflectance values from 380-780nm at 10nm intervals';
COMMENT ON COLUMN paints.k_coefficient IS 'Kubelka-Munk absorption coefficient';
COMMENT ON COLUMN paints.s_coefficient IS 'Kubelka-Munk scattering coefficient';
COMMENT ON COLUMN paints.optical_properties_calibrated IS 'Whether K/S values are measured vs estimated';