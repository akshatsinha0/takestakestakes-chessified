-- Create games table for matchmaking and gameplay
CREATE TABLE IF NOT EXISTS public.games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    white_player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    black_player_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('waiting', 'in_progress', 'completed', 'abandoned')),
    time_control TEXT NOT NULL,
    board_state TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    current_turn TEXT NOT NULL DEFAULT 'white' CHECK (current_turn IN ('white', 'black')),
    white_time_remaining INTEGER NOT NULL,
    black_time_remaining INTEGER NOT NULL,
    increment INTEGER DEFAULT 0,
    winner UUID REFERENCES auth.users(id),
    result TEXT CHECK (result IN ('checkmate', 'resignation', 'timeout', 'draw', 'stalemate')),
    moves JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster matchmaking queries
CREATE INDEX IF NOT EXISTS idx_games_status_time ON public.games(status, time_control, created_at);
CREATE INDEX IF NOT EXISTS idx_games_white_player ON public.games(white_player_id);
CREATE INDEX IF NOT EXISTS idx_games_black_player ON public.games(black_player_id);

-- Enable Row Level Security
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view games they're part of
CREATE POLICY "Users can view their own games" ON public.games
    FOR SELECT
    USING (
        auth.uid() = white_player_id OR 
        auth.uid() = black_player_id OR
        status = 'waiting'
    );

-- Policy: Users can create games
CREATE POLICY "Users can create games" ON public.games
    FOR INSERT
    WITH CHECK (auth.uid() = white_player_id);

-- Policy: Users can update games they're part of
CREATE POLICY "Users can update their games" ON public.games
    FOR UPDATE
    USING (
        auth.uid() = white_player_id OR 
        auth.uid() = black_player_id
    );

-- Policy: Users can delete their waiting games
CREATE POLICY "Users can delete their waiting games" ON public.games
    FOR DELETE
    USING (
        auth.uid() = white_player_id AND 
        status = 'waiting' AND 
        black_player_id IS NULL
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
