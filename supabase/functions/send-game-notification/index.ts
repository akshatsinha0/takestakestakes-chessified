import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  type: 'game_invitation' | 'game_started' | 'game_ended' | 'move_made';
  recipientId: string;
  senderId?: string;
  gameId?: string;
  message?: string;
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

    const { type, recipientId, senderId, gameId, message }: NotificationRequest = await req.json()

    // Get recipient profile
    const { data: recipient, error: recipientError } = await supabaseClient
      .from('profiles')
      .select('username, email')
      .eq('id', recipientId)
      .single()

    if (recipientError || !recipient) {
      throw new Error('Recipient not found')
    }

    let sender = null
    if (senderId) {
      const { data: senderData } = await supabaseClient
        .from('profiles')
        .select('username')
        .eq('id', senderId)
        .single()
      sender = senderData
    }

    // Create notification message based on type
    let notificationMessage = message || ''
    let subject = ''

    switch (type) {
      case 'game_invitation':
        subject = 'Chess Game Invitation'
        notificationMessage = `${sender?.username || 'A player'} has invited you to play chess!`
        break
      case 'game_started':
        subject = 'Chess Game Started'
        notificationMessage = `Your chess game with ${sender?.username || 'opponent'} has started!`
        break
      case 'game_ended':
        subject = 'Chess Game Completed'
        notificationMessage = `Your chess game has ended. Check the results!`
        break
      case 'move_made':
        subject = 'Your Turn'
        notificationMessage = `${sender?.username || 'Your opponent'} has made a move. It's your turn!`
        break
    }

    // Here you would integrate with your preferred email service
    // For now, we'll just log the notification
    console.log(`Notification for ${recipient.username}: ${notificationMessage}`)

    // You could also store notifications in a database table for in-app notifications
    // const { error: notificationError } = await supabaseClient
    //   .from('notifications')
    //   .insert({
    //     recipient_id: recipientId,
    //     sender_id: senderId,
    //     type: type,
    //     message: notificationMessage,
    //     game_id: gameId,
    //     read: false
    //   })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notification sent successfully'
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