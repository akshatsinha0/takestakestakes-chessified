/*
  # Chess Platform Database Schema

  1. New Tables
    - `profiles` - Public user profiles linked to auth.users
    - `games` - Chess game sessions and metadata
    - `moves` - Individual chess moves with real-time tracking
    - `game_invitations` - Game invitation system
    - `user_stats` - Player statistics and achievements

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Game participants can access shared game data
    - Public read access for leaderboards

  3. Real-time Features
    - Live move updates via subscriptions
    - Game status changes
    - Invitation notifications
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (public user data)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  avatar_url text,
  rating integer DEFAULT 1200,
  games_played integer DEFAULT 0,
  games_won integer DEFAULT 0,
  games_lost integer DEFAULT 0,
  games_drawn integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT rating_range CHECK (rating >= 100 AND rating <= 3000)
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  opponent_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'waiting' NOT NULL,
  result text,
  winner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  time_control text DEFAULT '10+0',
  board_state text DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  current_turn text DEFAULT 'white',
  white_player_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  black_player_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  white_time_remaining integer DEFAULT 600, -- 10 minutes in seconds
  black_time_remaining integer DEFAULT 600,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('waiting', 'in_progress', 'completed', 'abandoned')),
  CONSTRAINT valid_result CHECK (result IS NULL OR result IN ('white_wins', 'black_wins', 'draw', 'abandoned')),
  CONSTRAINT valid_turn CHECK (current_turn IN ('white', 'black'))
);

-- Create moves table
CREATE TABLE IF NOT EXISTS moves (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  move_number integer NOT NULL,
  player_color text NOT NULL,
  san text NOT NULL, -- Standard Algebraic Notation
  fen text NOT NULL, -- Board position after move
  time_taken numeric(5,2) DEFAULT 0, -- Time in seconds with 2 decimal places
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_color CHECK (player_color IN ('white', 'black')),
  CONSTRAINT positive_move_number CHECK (move_number > 0),
  CONSTRAINT positive_time CHECK (time_taken >= 0)
);

-- Create game invitations table
CREATE TABLE IF NOT EXISTS game_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  time_control text DEFAULT '10+0',
  message text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  CONSTRAINT valid_invitation_status CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  CONSTRAINT different_users CHECK (from_user_id != to_user_id)
);

-- Create user stats table for detailed analytics
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  highest_rating integer DEFAULT 1200,
  total_time_played interval DEFAULT '0 seconds',
  favorite_opening text,
  win_streak integer DEFAULT 0,
  longest_win_streak integer DEFAULT 0,
  puzzles_solved integer DEFAULT 0,
  lessons_completed integer DEFAULT 0,
  tournaments_played integer DEFAULT 0,
  last_active timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Games policies
CREATE POLICY "Users can view games they participate in"
  ON games FOR SELECT
  TO authenticated
  USING (
    auth.uid() = created_by OR 
    auth.uid() = opponent_id OR 
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id
  );

CREATE POLICY "Users can create games"
  ON games FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Game participants can update games"
  ON games FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR 
    auth.uid() = opponent_id OR 
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id
  );

-- Moves policies
CREATE POLICY "Users can view moves for their games"
  ON moves FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = moves.game_id 
      AND (
        auth.uid() = games.created_by OR 
        auth.uid() = games.opponent_id OR 
        auth.uid() = games.white_player_id OR 
        auth.uid() = games.black_player_id
      )
    )
  );

CREATE POLICY "Game participants can insert moves"
  ON moves FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = moves.game_id 
      AND (
        auth.uid() = games.white_player_id OR 
        auth.uid() = games.black_player_id
      )
    )
  );

-- Game invitations policies
CREATE POLICY "Users can view their invitations"
  ON game_invitations FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send invitations"
  ON game_invitations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Recipients can update invitations"
  ON game_invitations FOR UPDATE
  TO authenticated
  USING (auth.uid() = to_user_id);

-- User stats policies
CREATE POLICY "Users can view all user stats"
  ON user_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_created_by ON games(created_by);
CREATE INDEX IF NOT EXISTS idx_games_participants ON games(white_player_id, black_player_id);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_moves_game_move_number ON moves(game_id, move_number);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_invitations_to_user ON game_invitations(to_user_id, status);

-- Create functions for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'Player' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'avatar_url'
  );
  
  INSERT INTO public.user_stats (id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();