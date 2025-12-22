-- ============================================
-- FIXED VERSION - Drops existing policies first
-- ============================================

-- Add last_active column to existing profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add missing columns to existing games table
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

-- Update constraints
ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_status_check;
ALTER TABLE public.games ADD CONSTRAINT games_status_check 
  CHECK (status IN ('waiting', 'in_progress', 'game_over', 'completed', 'abandoned'));

ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_current_turn_check;
ALTER TABLE public.games ADD CONSTRAINT games_current_turn_check 
  CHECK (current_turn IN ('white', 'black'));

ALTER TABLE public.games DROP CONSTRAINT IF EXISTS games_result_check;
ALTER TABLE public.games ADD CONSTRAINT games_result_check 
  CHECK (result IN ('checkmate', 'resignation', 'timeout', 'draw', 'stalemate', NULL));

-- Create game_invitations table
CREATE TABLE IF NOT EXISTS public.game_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  time_control TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes')
);

-- Create game_history table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_last_active ON public.profiles(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_games_status_time ON public.games(status, time_control, created_at);
CREATE INDEX IF NOT EXISTS idx_games_white_player ON public.games(white_player_id);
CREATE INDEX IF NOT EXISTS idx_games_black_player ON public.games(black_player_id);
CREATE INDEX IF NOT EXISTS idx_invitations_to_user ON public.game_invitations(to_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.game_invitations(status);
CREATE INDEX IF NOT EXISTS idx_game_history_white_player ON public.game_history(white_player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_black_player ON public.game_history(black_player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_completed ON public.game_history(completed_at DESC);

-- Enable RLS
ALTER TABLE public.game_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Games policies
DROP POLICY IF EXISTS "Game participants can view" ON public.games;
DROP POLICY IF EXISTS "Game participants can insert" ON public.games;
DROP POLICY IF EXISTS "Game participants can update" ON public.games;
DROP POLICY IF EXISTS "Users can view games they participate in or waiting games" ON public.games;
DROP POLICY IF EXISTS "Users can create their own games" ON public.games;
DROP POLICY IF EXISTS "Game participants can update games" ON public.games;
DROP POLICY IF EXISTS "Users can delete their waiting games" ON public.games;

-- Moves policies
DROP POLICY IF EXISTS "Game participants can view moves" ON public.moves;
DROP POLICY IF EXISTS "Game participants can insert moves" ON public.moves;

-- Game invitations policies
DROP POLICY IF EXISTS "Users can view invitations sent to them or from them" ON public.game_invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON public.game_invitations;
DROP POLICY IF EXISTS "Recipients can update invitations" ON public.game_invitations;

-- Game history policies
DROP POLICY IF EXISTS "Users can view their game history" ON public.game_history;

-- ============================================
-- CREATE NEW POLICIES
-- ============================================

-- PROFILES
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

-- GAMES
CREATE POLICY "Users can view games they participate in or waiting games"
  ON public.games FOR SELECT
  USING (
    auth.uid() = created_by OR
    auth.uid() = opponent_id OR
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id OR
    status = 'waiting'
  );

CREATE POLICY "Users can create their own games"
  ON public.games FOR INSERT
  WITH CHECK (auth.uid() = created_by OR auth.uid() = white_player_id);

CREATE POLICY "Game participants can update games"
  ON public.games FOR UPDATE
  USING (
    auth.uid() = created_by OR
    auth.uid() = opponent_id OR
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id
  );

CREATE POLICY "Users can delete their waiting games"
  ON public.games FOR DELETE
  USING (
    (auth.uid() = created_by OR auth.uid() = white_player_id) AND 
    status = 'waiting' AND 
    (black_player_id IS NULL OR opponent_id IS NULL)
  );

-- MOVES
CREATE POLICY "Game participants can view moves"
  ON public.moves FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = moves.game_id
      AND (
        games.created_by = auth.uid() OR 
        games.opponent_id = auth.uid() OR
        games.white_player_id = auth.uid() OR
        games.black_player_id = auth.uid()
      )
    )
  );

CREATE POLICY "Game participants can insert moves"
  ON public.moves FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.games
      WHERE games.id = game_id
      AND (
        games.created_by = auth.uid() OR 
        games.opponent_id = auth.uid() OR
        games.white_player_id = auth.uid() OR
        games.black_player_id = auth.uid()
      )
    )
  );

-- GAME INVITATIONS
CREATE POLICY "Users can view invitations sent to them or from them"
  ON public.game_invitations FOR SELECT
  USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

CREATE POLICY "Users can create invitations"
  ON public.game_invitations FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Recipients can update invitations"
  ON public.game_invitations FOR UPDATE
  USING (auth.uid() = to_user_id);

-- GAME HISTORY
CREATE POLICY "Users can view their game history"
  ON public.game_history FOR SELECT
  USING (auth.uid() = white_player_id OR auth.uid() = black_player_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_games_updated_at ON public.games;
CREATE TRIGGER update_games_updated_at 
  BEFORE UPDATE ON public.games
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS draw_offered_by UUID REFERENCES auth.users(id);

-- ============================================
-- FRIEND REQUESTS TABLE
-- ============================================

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON public.friend_requests(status);

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own friend requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can update their received requests" ON public.friend_requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.friend_requests;

-- RLS Policies
CREATE POLICY "Users can view their own friend requests"
  ON public.friend_requests FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
  ON public.friend_requests FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received requests"
  ON public.friend_requests FOR UPDATE
  USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own requests"
  ON public.friend_requests FOR DELETE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_friend_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS friend_requests_updated_at ON public.friend_requests;
CREATE TRIGGER friend_requests_updated_at
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_friend_requests_updated_at();
