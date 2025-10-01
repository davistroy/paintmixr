-- Paint Collections Table
-- Organizes user paints into logical groupings
-- Created: 2025-09-30 (Feature 002: Enhanced Accuracy)

CREATE TABLE IF NOT EXISTS paint_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Collection metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,

    -- Color space configuration
    color_space VARCHAR(50) DEFAULT 'LAB' CHECK (color_space IN ('LAB', 'RGB', 'HSL', 'XYZ')),
    color_space_settings JSONB DEFAULT '{}'::jsonb,

    -- Statistics (calculated fields)
    paint_count INTEGER DEFAULT 0 CHECK (paint_count >= 0),
    avg_delta_e DECIMAL(6,3),
    last_optimization_at TIMESTAMPTZ,

    -- Organization
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    sort_order INTEGER DEFAULT 0,

    -- Metadata
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON paint_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_archived ON paint_collections(archived) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_collections_is_default ON paint_collections(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_collections_tags ON paint_collections USING gin(tags);

-- Enable RLS
ALTER TABLE paint_collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for paint_collections table
-- Users can view their own collections
CREATE POLICY "Users can view own collections"
    ON paint_collections FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own collections
CREATE POLICY "Users can insert own collections"
    ON paint_collections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own collections
CREATE POLICY "Users can update own collections"
    ON paint_collections FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own collections
CREATE POLICY "Users can delete own collections"
    ON paint_collections FOR DELETE
    USING (auth.uid() = user_id);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collections_updated_at_trigger
    BEFORE UPDATE ON paint_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_collections_updated_at();

-- Update paint_count when paints are added/removed
CREATE OR REPLACE FUNCTION update_collection_paint_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.collection_id IS NOT NULL THEN
            UPDATE paint_collections
            SET paint_count = (
                SELECT COUNT(*)
                FROM paints
                WHERE collection_id = NEW.collection_id
                AND archived = false
            )
            WHERE id = NEW.collection_id;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.collection_id IS DISTINCT FROM NEW.collection_id) THEN
        IF OLD.collection_id IS NOT NULL THEN
            UPDATE paint_collections
            SET paint_count = (
                SELECT COUNT(*)
                FROM paints
                WHERE collection_id = OLD.collection_id
                AND archived = false
            )
            WHERE id = OLD.collection_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER paint_collection_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON paints
    FOR EACH ROW
    EXECUTE FUNCTION update_collection_paint_count();

-- Ensure only one default collection per user
CREATE OR REPLACE FUNCTION ensure_single_default_collection()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE paint_collections
        SET is_default = false
        WHERE user_id = NEW.user_id
        AND id != NEW.id
        AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_trigger
    BEFORE INSERT OR UPDATE ON paint_collections
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_single_default_collection();

-- Add foreign key constraint to paints table now that paint_collections exists
ALTER TABLE paints
ADD CONSTRAINT fk_paints_collection
FOREIGN KEY (collection_id)
REFERENCES paint_collections(id)
ON DELETE SET NULL;

-- Comments
COMMENT ON TABLE paint_collections IS 'User-defined paint collection groupings for organized mixing workflows';
COMMENT ON COLUMN paint_collections.is_default IS 'The default collection used for new paints';
COMMENT ON COLUMN paint_collections.color_space IS 'Primary color space for optimization calculations';
COMMENT ON COLUMN paint_collections.paint_count IS 'Cached count of active paints in collection';