import { useEffect, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, Game, Move } from '../lib/supabase'

export const useGameSubscription = (gameId: string | null) => {
  const [game, setGame] = useState<Game | null>(null)
  const [moves, setMoves] = useState<Move[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!gameId) {
      setLoading(false)
      return
    }

    let gameChannel: RealtimeChannel
    let movesChannel: RealtimeChannel

    const setupSubscriptions = async () => {
      try {
        // Fetch initial game data
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select(`
            *,
            white_player:white_player_id(id, username, rating),
            black_player:black_player_id(id, username, rating)
          `)
          .eq('id', gameId)
          .single()

        if (gameError) throw gameError
        setGame(gameData)

        // Fetch initial moves
        const { data: movesData, error: movesError } = await supabase
          .from('moves')
          .select('*')
          .eq('game_id', gameId)
          .order('move_number', { ascending: true })

        if (movesError) throw movesError
        setMoves(movesData || [])

        // Subscribe to game updates
        gameChannel = supabase
          .channel(`game:${gameId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'games',
              filter: `id=eq.${gameId}`
            },
            (payload) => {
              console.log('Game updated:', payload)
              setGame(prev => prev ? { ...prev, ...payload.new } : null)
            }
          )
          .subscribe()

        // Subscribe to new moves
        movesChannel = supabase
          .channel(`moves:${gameId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'moves',
              filter: `game_id=eq.${gameId}`
            },
            (payload) => {
              console.log('New move:', payload)
              setMoves(prev => [...prev, payload.new as Move])
            }
          )
          .subscribe()

        setLoading(false)
      } catch (err) {
        console.error('Error setting up game subscription:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    setupSubscriptions()

    return () => {
      if (gameChannel) {
        supabase.removeChannel(gameChannel)
      }
      if (movesChannel) {
        supabase.removeChannel(movesChannel)
      }
    }
  }, [gameId])

  const makeMove = async (san: string, fen: string, timeTaken: number) => {
    if (!game || !gameId) return { error: 'No active game' }

    try {
      const moveNumber = moves.length + 1
      const playerColor = game.current_turn

      // Insert the move
      const { data: moveData, error: moveError } = await supabase
        .from('moves')
        .insert({
          game_id: gameId,
          move_number: moveNumber,
          san
        })
        .select()
        .single()

      if (moveError) throw moveError

      // Update game state
      const nextTurn = playerColor === 'white' ? 'black' : 'white'
      const timeUpdate = playerColor === 'white' 
        ? { white_time_remaining: game.white_time_remaining - timeTaken }
        : { black_time_remaining: game.black_time_remaining - timeTaken }

      const { error: gameError } = await supabase
        .from('games')
        .update({
          board_state: fen,
          current_turn: nextTurn,
          ...timeUpdate,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId)

      if (gameError) throw gameError

      return { data: moveData, error: null }
    } catch (err) {
      console.error('Error making move:', err)
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  const updateGameStatus = async (status: Game['status'], result?: Game['result'], winnerId?: string) => {
    if (!gameId) return { error: 'No active game' }

    try {
      const updates: Partial<Game> = {
        status,
        updated_at: new Date().toISOString()
      }

      if (result) updates.result = result
      if (winnerId) updates.winner_id = winnerId
      if (status === 'completed') updates.finished_at = new Date().toISOString()

      const { error } = await supabase
        .from('games')
        .update(updates)
        .eq('id', gameId)

      if (error) throw error

      // If game is completed, calculate ratings
      if (status === 'completed' && result) {
        await supabase.functions.invoke('calculate-rating', {
          body: {
            gameId,
            winnerId,
            result
          }
        })
      }

      return { error: null }
    } catch (err) {
      console.error('Error updating game status:', err)
      return { error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  return {
    game,
    moves,
    loading,
    error,
    makeMove,
    updateGameStatus
  }
}