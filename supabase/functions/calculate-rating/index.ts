import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RatingCalculationRequest {
  gameId: string;
  winnerId?: string;
  result: 'white_wins' | 'black_wins' | 'draw';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { gameId, winnerId, result }: RatingCalculationRequest = await req.json()

    // Get game details
    const { data: game, error: gameError } = await supabaseClient
      .from('games')
      .select(`
        *,
        white_player:white_player_id(id, rating),
        black_player:black_player_id(id, rating)
      `)
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      throw new Error('Game not found')
    }

    const whitePlayer = game.white_player
    const blackPlayer = game.black_player

    if (!whitePlayer || !blackPlayer) {
      throw new Error('Players not found')
    }

    // Calculate new ratings using ELO algorithm
    const K = 32 // K-factor for rating calculation
    
    const whiteRating = whitePlayer.rating
    const blackRating = blackPlayer.rating
    
    // Expected scores
    const whiteExpected = 1 / (1 + Math.pow(10, (blackRating - whiteRating) / 400))
    const blackExpected = 1 / (1 + Math.pow(10, (whiteRating - blackRating) / 400))
    
    // Actual scores based on result
    let whiteScore: number
    let blackScore: number
    
    switch (result) {
      case 'white_wins':
        whiteScore = 1
        blackScore = 0
        break
      case 'black_wins':
        whiteScore = 0
        blackScore = 1
        break
      case 'draw':
        whiteScore = 0.5
        blackScore = 0.5
        break
      default:
        throw new Error('Invalid result')
    }
    
    // Calculate new ratings
    const newWhiteRating = Math.round(whiteRating + K * (whiteScore - whiteExpected))
    const newBlackRating = Math.round(blackRating + K * (blackScore - blackExpected))
    
    // Update player ratings
    const { error: updateWhiteError } = await supabaseClient
      .from('profiles')
      .update({ 
        rating: newWhiteRating,
        games_played: whitePlayer.games_played + 1,
        games_won: whitePlayer.games_won + (whiteScore === 1 ? 1 : 0),
        games_lost: whitePlayer.games_lost + (whiteScore === 0 ? 1 : 0),
        games_drawn: whitePlayer.games_drawn + (whiteScore === 0.5 ? 1 : 0)
      })
      .eq('id', whitePlayer.id)

    const { error: updateBlackError } = await supabaseClient
      .from('profiles')
      .update({ 
        rating: newBlackRating,
        games_played: blackPlayer.games_played + 1,
        games_won: blackPlayer.games_won + (blackScore === 1 ? 1 : 0),
        games_lost: blackPlayer.games_lost + (blackScore === 0 ? 1 : 0),
        games_drawn: blackPlayer.games_drawn + (blackScore === 0.5 ? 1 : 0)
      })
      .eq('id', blackPlayer.id)

    if (updateWhiteError || updateBlackError) {
      throw new Error('Failed to update player ratings')
    }

    // Update user stats
    await supabaseClient
      .from('user_stats')
      .update({ 
        highest_rating: Math.max(whitePlayer.highest_rating || 1200, newWhiteRating),
        updated_at: new Date().toISOString()
      })
      .eq('id', whitePlayer.id)

    await supabaseClient
      .from('user_stats')
      .update({ 
        highest_rating: Math.max(blackPlayer.highest_rating || 1200, newBlackRating),
        updated_at: new Date().toISOString()
      })
      .eq('id', blackPlayer.id)

    return new Response(
      JSON.stringify({
        success: true,
        ratings: {
          white: { old: whiteRating, new: newWhiteRating },
          black: { old: blackRating, new: newBlackRating }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})