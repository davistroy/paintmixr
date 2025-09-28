-- Enable Row Level Security (RLS) for all tables
-- This ensures users can only access their own data

-- Enable RLS on mixing_sessions table
ALTER TABLE mixing_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sessions
CREATE POLICY "Users can view their own sessions" ON mixing_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert sessions for themselves
CREATE POLICY "Users can insert their own sessions" ON mixing_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own sessions
CREATE POLICY "Users can update their own sessions" ON mixing_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own sessions
CREATE POLICY "Users can delete their own sessions" ON mixing_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on mixing_formulas table
ALTER TABLE mixing_formulas ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see formulas for their own sessions
CREATE POLICY "Users can view formulas for their sessions" ON mixing_formulas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM mixing_sessions
            WHERE mixing_sessions.id = mixing_formulas.session_id
            AND mixing_sessions.user_id = auth.uid()
        )
    );

-- Policy: Users can only insert formulas for their own sessions
CREATE POLICY "Users can insert formulas for their sessions" ON mixing_formulas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM mixing_sessions
            WHERE mixing_sessions.id = mixing_formulas.session_id
            AND mixing_sessions.user_id = auth.uid()
        )
    );

-- Policy: Users can only update formulas for their own sessions
CREATE POLICY "Users can update formulas for their sessions" ON mixing_formulas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM mixing_sessions
            WHERE mixing_sessions.id = mixing_formulas.session_id
            AND mixing_sessions.user_id = auth.uid()
        )
    );

-- Policy: Users can only delete formulas for their own sessions
CREATE POLICY "Users can delete formulas for their sessions" ON mixing_formulas
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM mixing_sessions
            WHERE mixing_sessions.id = mixing_formulas.session_id
            AND mixing_sessions.user_id = auth.uid()
        )
    );

-- Enable RLS on formula_items table
ALTER TABLE formula_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see formula items for their own sessions
CREATE POLICY "Users can view formula items for their sessions" ON formula_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM mixing_formulas
            JOIN mixing_sessions ON mixing_sessions.id = mixing_formulas.session_id
            WHERE mixing_formulas.id = formula_items.formula_id
            AND mixing_sessions.user_id = auth.uid()
        )
    );

-- Policy: Users can only insert formula items for their own sessions
CREATE POLICY "Users can insert formula items for their sessions" ON formula_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM mixing_formulas
            JOIN mixing_sessions ON mixing_sessions.id = mixing_formulas.session_id
            WHERE mixing_formulas.id = formula_items.formula_id
            AND mixing_sessions.user_id = auth.uid()
        )
    );

-- Policy: Users can only update formula items for their own sessions
CREATE POLICY "Users can update formula items for their sessions" ON formula_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM mixing_formulas
            JOIN mixing_sessions ON mixing_sessions.id = mixing_formulas.session_id
            WHERE mixing_formulas.id = formula_items.formula_id
            AND mixing_sessions.user_id = auth.uid()
        )
    );

-- Policy: Users can only delete formula items for their own sessions
CREATE POLICY "Users can delete formula items for their sessions" ON formula_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM mixing_formulas
            JOIN mixing_sessions ON mixing_sessions.id = mixing_formulas.session_id
            WHERE mixing_formulas.id = formula_items.formula_id
            AND mixing_sessions.user_id = auth.uid()
        )
    );

-- Add comments for documentation
COMMENT ON POLICY "Users can view their own sessions" ON mixing_sessions IS 'RLS policy ensuring users only see their own mixing sessions';
COMMENT ON POLICY "Users can view formulas for their sessions" ON mixing_formulas IS 'RLS policy ensuring users only see formulas for their own sessions';
COMMENT ON POLICY "Users can view formula items for their sessions" ON formula_items IS 'RLS policy ensuring users only see formula items for their own sessions';