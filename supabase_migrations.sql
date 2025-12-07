-- Modify existing games table to add matchmaking columns
-- Note: This assumes you already have a games table from the previous schema

-- Add new columns if they don't exist
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS white_player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS black_player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS time_control TEXT,
ADD COLUMN IF NOT EXISTS board_state TEXT DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
ADD COLUMN IF NOT EXISTS current_turn TEXT DEFAULT 'white',
ADD COLUMN IF NOT EXISTS white_time_remaining INTEGER,
ADD COLUMN IF NOT EXISTS black_time_remaining INTEGER,
ADD COLUMN IF NOT EXISTS increment INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS winner UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update status check constraint to include new statuses
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_status_check;
ALTER TABLE public.games ADD CONSTRAINT games_status_check 
    CHECK (status IN ('waiting', 'in_progress', 'game_over', 'completed', 'abandoned'));

-- Add check constraint for current_turn
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_current_turn_check;
ALTER TABLE public.games ADD CONSTRAINT games_current_turn_check 
    CHECK (current_turn IN ('white', 'black'));

-- Update result check constraint
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_result_check;
ALTER TABLE public.games ADD CONSTRAINT games_result_check 
    CHECK (result IN ('checkmate', 'resignation', 'timeout', 'draw', 'stalemate', NULL));

-- Create index for faster matchmaking queries
CREATE INDEX IF NOT EXISTS idx_games_status_time ON public.games(status, time_control, created_at);
CREATE INDEX IF NOT EXISTS idx_games_white_player ON public.games(white_player_id);
CREATE INDEX IF NOT EXISTS idx_games_black_player ON public.games(black_player_id);

-- Enable Row Level Security
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Game participants can view" ON public.games;
DROP POLICY IF EXISTS "Game participants can insert" ON public.games;
DROP POLICY IF EXISTS "Game participants can update" ON public.games;
DROP POLICY IF EXISTS "Users can view their own games" ON public.games;
DROP POLICY IF EXISTS "Users can create games" ON public.games;
DROP POLICY IF EXISTS "Users can update their games" ON public.games;
DROP POLICY IF EXISTS "Users can delete their waiting games" ON public.games;

-- Create new comprehensive policies
CREATE POLICY "Users can view games they participate in or waiting games" ON public.games
    FOR SELECT
    USING (
        auth.uid() = created_by OR
        auth.uid() = opponent_id OR
        auth.uid() = white_player_id OR 
        auth.uid() = black_player_id OR
        status = 'waiting'
    );

CREATE POLICY "Users can create their own games" ON public.games
    FOR INSERT
    WITH CHECK (
        auth.uid() = created_by OR
        auth.uid() = white_player_id
    );

CREATE POLICY "Game participants can update games" ON public.games
    FOR UPDATE
    USING (
        auth.uid() = created_by OR
        auth.uid() = opponent_id OR
        auth.uid() = white_player_id OR 
        auth.uid() = black_player_id
    );

CREATE POLICY "Users can delete their waiting games" ON public.games
    FOR DELETE
    USING (
        (auth.uid() = created_by OR auth.uid() = white_player_id) AND 
        status = 'waiting' AND 
        (black_player_id IS NULL OR opponent_id IS NULL)
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create game_history table for completed games
CREATE TABLE IF NOT EXISTS public.game_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    white_player_id UUID NOT NULL REFERENCES auth.users(id),
    black_player_id UUID NOT NULL REFERENCES auth.users(id),
    winner UUID REFERENCES auth.users(id),
    result TEXT NOT NULL,
    moves JSONB NOT NULL,
    white_rating_before INTEGER,
    black_rating_before INTEGER,
    white_rating_after INTEGER,
    black_rating_after INTEGER,
    time_control TEXT NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for game_history
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their game history
CREATE POLICY "Users can view their game history" ON public.game_history
    FOR SELECT
    USING (
        auth.uid() = white_player_id OR 
        auth.uid() = black_player_id
    );

-- Create indexes for game_history
CREATE INDEX IF NOT EXISTS idx_game_history_white_player ON public.game_history(white_player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_black_player ON public.game_history(black_player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_completed ON public.game_history(completed_at DESC);
