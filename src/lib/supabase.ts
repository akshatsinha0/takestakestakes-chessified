import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export interface Profile {
  id: string
  username: string
  avatar_url?: string
  rating: number
  created_at?: string
  updated_at?: string
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    storageKey: 'takestakestakes-auth',
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Database types
export interface Game {
  id: string
  created_by: string
  opponent_id?: string
  status: 'waiting' | 'in_progress' | 'completed' | 'abandoned'
  result?: 'white_wins' | 'black_wins' | 'draw' | 'abandoned'
  winner_id?: string
  time_control: string
  board_state: string
  current_turn: 'white' | 'black'
  white_player_id?: string
  black_player_id?: string
  white_time_remaining: number
  black_time_remaining: number
  created_at: string
  updated_at: string
  finished_at?: string
}

export interface Move {
  id: string
  game_id: string
  move_number: number
  player_color: 'white' | 'black'
  san: string
  fen: string
  time_taken: number
  created_at: string
}

export interface GameInvitation {
  id: string
  from_user_id: string
  to_user_id: string
  time_control: string
  message?: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  created_at: string
  expires_at: string
}

export interface UserStats {
  id: string
  highest_rating: number
  total_time_played: string
  favorite_opening?: string
  win_streak: number
  longest_win_streak: number
  puzzles_solved: number
  lessons_completed: number
  tournaments_played: number
  last_active: string
  created_at: string
  updated_at: string
}