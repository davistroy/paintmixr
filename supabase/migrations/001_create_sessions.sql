-- Create mixing_sessions table
-- This table stores all color matching and ratio prediction sessions
CREATE TABLE IF NOT EXISTS mixing_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_type TEXT NOT NULL CHECK (session_type IN ('color_matching', 'ratio_prediction')),

    -- Target color information
    target_color_hex TEXT CHECK (target_color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    target_color_lab_l NUMERIC(5,2) CHECK (target_color_lab_l >= 0 AND target_color_lab_l <= 100),
    target_color_lab_a NUMERIC(6,2) CHECK (target_color_lab_a >= -128 AND target_color_lab_a <= 127),
    target_color_lab_b NUMERIC(6,2) CHECK (target_color_lab_b >= -128 AND target_color_lab_b <= 127),

    -- Input method tracking
    input_method TEXT NOT NULL CHECK (input_method IN ('hex', 'picker', 'image')),
    image_url TEXT,

    -- Calculated result color
    calculated_color_hex TEXT CHECK (calculated_color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    calculated_color_lab_l NUMERIC(5,2) CHECK (calculated_color_lab_l >= 0 AND calculated_color_lab_l <= 100),
    calculated_color_lab_a NUMERIC(6,2) CHECK (calculated_color_lab_a >= -128 AND calculated_color_lab_a <= 127),
    calculated_color_lab_b NUMERIC(6,2) CHECK (calculated_color_lab_b >= -128 AND calculated_color_lab_b <= 127),

    -- Color accuracy measurement
    delta_e NUMERIC(6,3) CHECK (delta_e >= 0),

    -- User customization
    custom_label TEXT,
    notes TEXT,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mixing_sessions_user_id ON mixing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mixing_sessions_session_type ON mixing_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_mixing_sessions_is_favorite ON mixing_sessions(is_favorite);
CREATE INDEX IF NOT EXISTS idx_mixing_sessions_created_at ON mixing_sessions(created_at DESC);

-- Create composite index for user queries
CREATE INDEX IF NOT EXISTS idx_mixing_sessions_user_queries ON mixing_sessions(user_id, session_type, is_favorite, created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mixing_sessions_updated_at
    BEFORE UPDATE ON mixing_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE mixing_sessions IS 'Stores all color matching and ratio prediction sessions';
COMMENT ON COLUMN mixing_sessions.session_type IS 'Type of session: color_matching or ratio_prediction';
COMMENT ON COLUMN mixing_sessions.target_color_hex IS 'Target color in hex format (#RRGGBB)';
COMMENT ON COLUMN mixing_sessions.target_color_lab_l IS 'Target color L* value in LAB color space (0-100)';
COMMENT ON COLUMN mixing_sessions.target_color_lab_a IS 'Target color a* value in LAB color space (-128 to 127)';
COMMENT ON COLUMN mixing_sessions.target_color_lab_b IS 'Target color b* value in LAB color space (-128 to 127)';
COMMENT ON COLUMN mixing_sessions.input_method IS 'How the color was input: hex, picker, or image';
COMMENT ON COLUMN mixing_sessions.delta_e IS 'CIE 2000 Delta E color difference between target and calculated color';
COMMENT ON COLUMN mixing_sessions.custom_label IS 'User-defined name for the session';
COMMENT ON COLUMN mixing_sessions.is_favorite IS 'Whether the user has marked this session as favorite';