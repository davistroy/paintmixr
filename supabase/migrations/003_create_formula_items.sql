-- Create formula_items table
-- This table stores individual paint components within a mixing formula
CREATE TABLE IF NOT EXISTS formula_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    formula_id UUID NOT NULL REFERENCES mixing_formulas(id) ON DELETE CASCADE,

    -- Paint identification (references external paint catalog)
    paint_id TEXT NOT NULL,

    -- Quantity information
    volume_ml NUMERIC(7,2) NOT NULL CHECK (volume_ml > 0),
    percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_formula_items_formula_id ON formula_items(formula_id);
CREATE INDEX IF NOT EXISTS idx_formula_items_paint_id ON formula_items(paint_id);

-- Create composite index for formula queries
CREATE INDEX IF NOT EXISTS idx_formula_items_formula_paint ON formula_items(formula_id, paint_id);

-- Ensure unique paint per formula (no duplicate paints in same formula)
CREATE UNIQUE INDEX IF NOT EXISTS idx_formula_items_unique_paint_per_formula ON formula_items(formula_id, paint_id);

-- Add constraint to ensure percentages in a formula sum to 100%
-- This will be enforced at the application level since PostgreSQL doesn't support
-- aggregate constraints across rows easily

-- Add comments for documentation
COMMENT ON TABLE formula_items IS 'Stores individual paint components within mixing formulas';
COMMENT ON COLUMN formula_items.formula_id IS 'References the formula this item belongs to';
COMMENT ON COLUMN formula_items.paint_id IS 'External paint catalog ID (e.g., cadmium-red-medium)';
COMMENT ON COLUMN formula_items.volume_ml IS 'Volume of this paint in the mixture (milliliters)';
COMMENT ON COLUMN formula_items.percentage IS 'Percentage of total volume for this paint (0-100%)';