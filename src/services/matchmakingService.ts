import { supabase } from '../lib/supabase';

export interface MatchmakingQueue {
  id: string;
  user_id: string;
  time_control: string;
  rating: number;
  created_at: string;
}

export interface Game {
  id: string;
  white_player_id: string;
  black_player_id: string | null;
  status: 'waiting' | 'in_progress' | 'completed';
  time_control: string;
  board_state: string;
  current_turn: 'white' | 'black';
  white_time_remaining: number;
  black_time_remaining: number;
  winner: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Add user to matchmaking queue
 */
export async function joinMatchmakingQueue(
  userId: string,
  timeControl: string,
  rating: number
): Promise<{ success: boolean; gameId?: string; error?: string }> {
  try {
    // First, check if there's an existing game waiting for an opponent
    const { data: waitingGames, error: searchError } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'waiting')
      .eq('time_control', timeControl)
      .neq('white_player_id', userId)
      .is('black_player_id', null)
      .order('created_at', { ascending: true })
      .limit(1);

    if (searchError) {
      console.error('Error searching for games:', searchError);
      throw searchError;
    }

    // If found a waiting game, join it
    if (waitingGames && waitingGames.length > 0) {
      const game = waitingGames[0];
      
      const { error: updateError } = await supabase
        .from('games')
        .update({
          black_player_id: userId,
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', game.id);

      if (updateError) {
        console.error('Error joining game:', updateError);
        throw updateError;
      }

      return { success: true, gameId: game.id };
    }

    // No waiting game found, create a new one
    const timeInSeconds = parseInt(timeControl.split('+')[0]) * 60;
    const increment = parseInt(timeControl.split('+')[1]) || 0;

    const { data: newGame, error: createError } = await supabase
      .from('games')
      .insert([
        {
          white_player_id: userId,
          black_player_id: null,
          status: 'waiting',
          time_control: timeControl,
          board_state: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          current_turn: 'white',
          white_time_remaining: timeInSeconds,
          black_time_remaining: timeInSeconds,
          increment: increment,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (createError) {
      console.error('Error creating game:', createError);
      throw createError;
    }

    return { success: true, gameId: newGame.id };
  } catch (error: any) {
    console.error('Matchmaking error:', error);
    return { success: false, error: error.message || 'Failed to join matchmaking' };
  }
}

/**
 * Leave matchmaking queue
 */
export async function leaveMatchmakingQueue(userId: string): Promise<void> {
  try {
    // Delete any waiting games created by this user
    await supabase
      .from('games')
      .delete()
      .eq('white_player_id', userId)
      .eq('status', 'waiting')
      .is('black_player_id', null);
  } catch (error) {
    console.error('Error leaving queue:', error);
  }
}

/**
 * Get game by ID
 */
export async function getGame(gameId: string): Promise<Game | null> {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching game:', error);
    return null;
  }
}

/**
 * Update game state
 */
export async function updateGameState(
  gameId: string,
  updates: Partial<Game>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('games')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating game:', error);
    return false;
  }
}

/**
 * Subscribe to game updates
 */
export function subscribeToGame(
  gameId: string,
  callback: (game: Game) => void
) {
  const subscription = supabase
    .channel(`game:${gameId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      },
      (payload) => {
        callback(payload.new as Game);
      }
    )
    .subscribe();

  return subscription;
}

/**
 * Get online players
 */
export async function getOnlinePlayers(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('rating', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching online players:', error);
    return [];
  }
}
