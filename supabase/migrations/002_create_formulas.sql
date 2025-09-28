-- Create mixing_formulas table
-- This table stores the paint mixing formulas associated with sessions
CREATE TABLE IF NOT EXISTS mixing_formulas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES mixing_sessions(id) ON DELETE CASCADE,

    -- Formula properties
    total_volume_ml INTEGER NOT NULL CHECK (total_volume_ml >= 100 AND total_volume_ml <= 1000),
    mixing_order TEXT[], -- Optional recommended mixing sequence

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mixing_formulas_session_id ON mixing_formulas(session_id);

-- Ensure one formula per session (business rule)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mixing_formulas_unique_session ON mixing_formulas(session_id);

-- Add comments for documentation
COMMENT ON TABLE mixing_formulas IS 'Stores paint mixing formulas with total volume and mixing order';
COMMENT ON COLUMN mixing_formulas.session_id IS 'References the session this formula belongs to';
COMMENT ON COLUMN mixing_formulas.total_volume_ml IS 'Total volume of paint mixture in milliliters (100-1000ml)';
COMMENT ON COLUMN mixing_formulas.mixing_order IS 'Optional array of paint IDs in recommended mixing order';