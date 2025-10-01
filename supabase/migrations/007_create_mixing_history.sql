-- Mixing History Table
-- Tracks optimization algorithm performance and mixing results
-- Created: 2025-09-30 (Feature 002: Enhanced Accuracy)

CREATE TABLE IF NOT EXISTS mixing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES paint_collections(id) ON DELETE SET NULL,

    -- Target color
    target_hex VARCHAR(7) NOT NULL CHECK (target_hex ~* '^#[0-9A-Fa-f]{6}$'),
    target_lab_l DECIMAL(7,4) NOT NULL CHECK (target_lab_l >= 0 AND target_lab_l <= 100),
    target_lab_a DECIMAL(7,4) NOT NULL CHECK (target_lab_a >= -128 AND target_lab_a <= 127),
    target_lab_b DECIMAL(7,4) NOT NULL CHECK (target_lab_b >= -128 AND target_lab_b <= 127),

    -- Achieved color
    achieved_hex VARCHAR(7) NOT NULL CHECK (achieved_hex ~* '^#[0-9A-Fa-f]{6}$'),
    achieved_lab_l DECIMAL(7,4) NOT NULL CHECK (achieved_lab_l >= 0 AND achieved_lab_l <= 100),
    achieved_lab_a DECIMAL(7,4) NOT NULL CHECK (achieved_lab_a >= -128 AND achieved_lab_a <= 127),
    achieved_lab_b DECIMAL(7,4) NOT NULL CHECK (achieved_lab_b >= -128 AND achieved_lab_b <= 127),

    -- Accuracy metrics
    delta_e_achieved DECIMAL(6,3) NOT NULL CHECK (delta_e_achieved >= 0),
    delta_e_target DECIMAL(6,3) DEFAULT 2.0 CHECK (delta_e_target >= 0),
    accuracy_tier VARCHAR(20) CHECK (accuracy_tier IN ('excellent', 'good', 'fair', 'poor')),

    -- Optimization details
    optimization_algorithm VARCHAR(50) NOT NULL CHECK (optimization_algorithm IN ('differential_evolution', 'tpe_hybrid', 'legacy', 'manual')),
    optimization_time_ms INTEGER CHECK (optimization_time_ms >= 0),
    iterations_count INTEGER CHECK (iterations_count >= 0),
    convergence_achieved BOOLEAN DEFAULT false,

    -- Formula details
    paint_ids UUID[] NOT NULL,
    paint_ratios JSONB NOT NULL, -- Array of {paint_id, volume_ml, percentage}
    total_volume_ml DECIMAL(10,2) NOT NULL CHECK (total_volume_ml > 0),
    paint_count INTEGER NOT NULL CHECK (paint_count > 0 AND paint_count <= 10),

    -- Optimization constraints
    max_paints_constraint INTEGER DEFAULT 3,
    min_volume_per_paint_ml DECIMAL(10,2),
    max_volume_per_paint_ml DECIMAL(10,2),
    optimization_preference VARCHAR(20) DEFAULT 'accuracy' CHECK (optimization_preference IN ('accuracy', 'cost', 'simplicity')),

    -- Performance benchmarks
    kubelka_munk_calculation_ms INTEGER,
    delta_e_calculation_ms INTEGER,
    total_function_evaluations INTEGER,

    -- User interaction
    user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating >= 1 AND user_satisfaction_rating <= 5),
    user_notes TEXT,
    was_actually_mixed BOOLEAN DEFAULT false,
    actual_delta_e DECIMAL(6,3), -- If user measured the actual result

    -- Session tracking
    session_id UUID REFERENCES mixing_sessions(id) ON DELETE SET NULL,
    input_method VARCHAR(50),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mixing_history_user_id ON mixing_history(user_id);
CREATE INDEX IF NOT EXISTS idx_mixing_history_collection_id ON mixing_history(collection_id);
CREATE INDEX IF NOT EXISTS idx_mixing_history_created_at ON mixing_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mixing_history_delta_e ON mixing_history(delta_e_achieved);
CREATE INDEX IF NOT EXISTS idx_mixing_history_algorithm ON mixing_history(optimization_algorithm);
CREATE INDEX IF NOT EXISTS idx_mixing_history_session_id ON mixing_history(session_id);

-- Enable RLS
ALTER TABLE mixing_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mixing_history table
-- Users can view their own history
CREATE POLICY "Users can view own mixing history"
    ON mixing_history FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own history
CREATE POLICY "Users can insert own mixing history"
    ON mixing_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own history (for feedback)
CREATE POLICY "Users can update own mixing history"
    ON mixing_history FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own history
CREATE POLICY "Users can delete own mixing history"
    ON mixing_history FOR DELETE
    USING (auth.uid() = user_id);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_mixing_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mixing_history_updated_at_trigger
    BEFORE UPDATE ON mixing_history
    FOR EACH ROW
    EXECUTE FUNCTION update_mixing_history_updated_at();

-- Calculate accuracy tier based on Delta E
CREATE OR REPLACE FUNCTION calculate_accuracy_tier()
RETURNS TRIGGER AS $$
BEGIN
    NEW.accuracy_tier := CASE
        WHEN NEW.delta_e_achieved <= 2.0 THEN 'excellent'
        WHEN NEW.delta_e_achieved <= 5.0 THEN 'good'
        WHEN NEW.delta_e_achieved <= 10.0 THEN 'fair'
        ELSE 'poor'
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_accuracy_tier_trigger
    BEFORE INSERT OR UPDATE ON mixing_history
    FOR EACH ROW
    WHEN (NEW.delta_e_achieved IS NOT NULL)
    EXECUTE FUNCTION calculate_accuracy_tier();

-- Update collection's last optimization timestamp
CREATE OR REPLACE FUNCTION update_collection_last_optimization()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.collection_id IS NOT NULL THEN
        UPDATE paint_collections
        SET last_optimization_at = NEW.created_at,
            avg_delta_e = (
                SELECT AVG(delta_e_achieved)
                FROM mixing_history
                WHERE collection_id = NEW.collection_id
                AND created_at > NOW() - INTERVAL '30 days'
            )
        WHERE id = NEW.collection_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_collection_optimization_trigger
    AFTER INSERT ON mixing_history
    FOR EACH ROW
    EXECUTE FUNCTION update_collection_last_optimization();

-- Trigger paint usage increment (connects to paints table)
CREATE TRIGGER increment_paint_usage_trigger
    AFTER INSERT ON mixing_history
    FOR EACH ROW
    EXECUTE FUNCTION increment_paint_usage();

-- Comments
COMMENT ON TABLE mixing_history IS 'Optimization history for performance tracking and algorithm comparison';
COMMENT ON COLUMN mixing_history.delta_e_achieved IS 'CIE Delta E 2000 color difference between target and achieved';
COMMENT ON COLUMN mixing_history.optimization_algorithm IS 'Algorithm used: differential_evolution, tpe_hybrid, legacy, or manual';
COMMENT ON COLUMN mixing_history.paint_ratios IS 'JSON array of paint mixing formula with volumes and percentages';
COMMENT ON COLUMN mixing_history.actual_delta_e IS 'User-measured Delta E if they actually mixed and measured the color';