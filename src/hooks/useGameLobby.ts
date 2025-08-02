import { useEffect, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, Game, GameInvitation } from '../lib/supabase'

export const useGameLobby = (userId: string | null) => {
  const [availableGames, setAvailableGames] = useState<Game[]>([])
  const [invitations, setInvitations] = useState<GameInvitation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    let gamesChannel: RealtimeChannel
    let invitationsChannel: RealtimeChannel

    const setupLobby = async () => {
      try {
        // Fetch available games
        const { data: gamesData, error: gamesError } = await supabase
          .from('games')
          .select(`
            *,
            creator:created_by(username, rating)
          `)
          .eq('status', 'waiting')
          .neq('created_by', userId)

        if (gamesError) throw gamesError
        setAvailableGames(gamesData || [])

        // Fetch pending invitations
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('game_invitations')
          .select(`
            *,
            from_user:from_user_id(username, rating)
          `)
          .eq('to_user_id', userId)
          .eq('status', 'pending')

        if (invitationsError) throw invitationsError
        setInvitations(invitationsData || [])

        // Subscribe to new games
        gamesChannel = supabase
          .channel('lobby-games')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'games',
              filter: `status=eq.waiting`
            },
            (payload) => {
              const newGame = payload.new as Game
              if (newGame.created_by !== userId) {
                setAvailableGames(prev => [...prev, newGame])
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'games'
            },
            (payload) => {
              const updatedGame = payload.new as Game
              setAvailableGames(prev => 
                prev.filter(game => game.id !== updatedGame.id)
              )
            }
          )
          .subscribe()

        // Subscribe to invitations
        invitationsChannel = supabase
          .channel('lobby-invitations')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'game_invitations',
              filter: `to_user_id=eq.${userId}`
            },
            (payload) => {
              setInvitations(prev => [...prev, payload.new as GameInvitation])
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'game_invitations',
              filter: `to_user_id=eq.${userId}`
            },
            (payload) => {
              const updatedInvitation = payload.new as GameInvitation
              setInvitations(prev => 
                prev.map(inv => 
                  inv.id === updatedInvitation.id ? updatedInvitation : inv
                )
              )
            }
          )
          .subscribe()

        setLoading(false)
      } catch (err) {
        console.error('Error setting up lobby:', err)
        setLoading(false)
      }
    }

    setupLobby()

    return () => {
      if (gamesChannel) supabase.removeChannel(gamesChannel)
      if (invitationsChannel) supabase.removeChannel(invitationsChannel)
    }
  }, [userId])

  const createGame = async (timeControl: string = '10+0') => {
    if (!userId) return { error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('games')
        .insert({
          created_by: userId,
          time_control: timeControl,
          white_player_id: userId
        })
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  const joinGame = async (gameId: string) => {
    if (!userId) return { error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('games')
        .update({
          opponent_id: userId,
          black_player_id: userId,
          status: 'in_progress'
        })
        .eq('id', gameId)
        .eq('status', 'waiting')
        .select()
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  const sendInvitation = async (toUserId: string, timeControl: string = '10+0', message?: string) => {
    if (!userId) return { error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('game_invitations')
        .insert({
          from_user_id: userId,
          to_user_id: toUserId,
          time_control: timeControl,
          message
        })
        .select()
        .single()

      if (error) throw error

      // Send notification
      await supabase.functions.invoke('send-game-notification', {
        body: {
          type: 'game_invitation',
          recipientId: toUserId,
          senderId: userId,
          message
        }
      })

      return { data, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  const respondToInvitation = async (invitationId: string, accept: boolean) => {
    if (!userId) return { error: 'Not authenticated' }

    try {
      const status = accept ? 'accepted' : 'declined'
      
      const { data: invitation, error: updateError } = await supabase
        .from('game_invitations')
        .update({ status })
        .eq('id', invitationId)
        .eq('to_user_id', userId)
        .select()
        .single()

      if (updateError) throw updateError

      if (accept) {
        // Create the game
        const { data: game, error: gameError } = await supabase
          .from('games')
          .insert({
            created_by: invitation.from_user_id,
            opponent_id: userId,
            white_player_id: invitation.from_user_id,
            black_player_id: userId,
            time_control: invitation.time_control,
            status: 'in_progress'
          })
          .select()
          .single()

        if (gameError) throw gameError
        return { data: game, error: null }
      }

      return { data: invitation, error: null }
    } catch (err) {
      return { data: null, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  return {
    availableGames,
    invitations,
    loading,
    createGame,
    joinGame,
    sendInvitation,
    respondToInvitation
  }
}