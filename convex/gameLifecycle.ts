import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod'
import { ConvexError } from 'convex/values'
import { zMutation } from './lib/functions'
import { requireAuthUserId } from './lib/identity'
import { GameStatus, GameResult, PieceColor } from './lib/domain'
import { finalizeGame } from './lib/completion'
import type { MutationCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
import type { Id } from './_generated/dataModel'

/*
(1.) Holds the player-initiated game endings that are NOT moves: resignation and the two halves
     of a draw agreement (offer and response). Move-driven endings (checkmate, stalemate) finalize
     inside `moves.make`; these endings have no associated board change, so they live here and reuse
     the same shared `finalizeGame` helper, which guarantees a game ends with identical result,
     winner, Elo, and stat bookkeeping no matter which path triggers it.
(2.) Every mutation funnels through `requireActiveParticipant`, which loads the game and rejects the
     call unless it is in progress and the caller occupies one of the two seats. Authorization is
     therefore server-side and uniform, so a spectator or a player in a finished game can never drive
     a transition, regardless of what the client sends.
(3.) `resign` derives the result from the resigner's color rather than accepting a result argument,
     so a resigning player can only ever hand the win to the opponent and never fabricate a win or a
     draw for themselves. This is the property the previous generic completion endpoint lacked.
(4.) A draw needs mutual consent, modeled as a single `drawOfferedBy` slot on the game. `offerDraw`
     stamps the caller into that slot, `respondDraw` finalizes a draw when the OTHER player accepts
     or clears the slot when they decline; a player cannot answer their own offer, and a move clears
     the slot in `moves.make`, so an offer is implicitly withdrawn the instant the position changes.

This module is the non-move half of the game-ending surface. Keeping resignation and draw agreement
out of the move write path keeps `moves.make` focused on board progression, while routing both through
`finalizeGame` keeps the end-of-game economy in one place. Expressing the draw handshake as one
nullable seat rather than a separate offers table keeps the protocol atomic with the game row and free
of orphaned offers, since the offer lives and dies with the game document it belongs to.
*/

const requireActiveParticipant = async (
  ctx: MutationCtx,
  gameId: Id<'games'>,
  userId: string,
): Promise<Doc<'games'>> => {
  const game = await ctx.db.get(gameId)
  if (game === null || game.status !== GameStatus.IN_PROGRESS) {
    throw new ConvexError({
      code: 'GAME_NOT_ACTIVE',
      message: 'This game is not in progress.',
    })
  }
  if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: 'Only a participant can act on this game.',
    })
  }
  return game
}

export const resign = zMutation({
  args: { gameId: zid('games') },
  returns: z.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const game = await requireActiveParticipant(ctx, args.gameId, userId)
    const resignerIsWhite = game.whitePlayerId === userId
    const result = resignerIsWhite
      ? GameResult.BLACK_WINS
      : GameResult.WHITE_WINS
    await finalizeGame(ctx, game, result)
    return null
  },
})

export const offerDraw = zMutation({
  args: { gameId: zid('games') },
  returns: z.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const game = await requireActiveParticipant(ctx, args.gameId, userId)
    // Re-offering by the same player is a no-op; only write when the slot changes.
    if (game.drawOfferedBy !== userId) {
      await ctx.db.patch(game._id, { drawOfferedBy: userId })
    }
    return null
  },
})

export const respondDraw = zMutation({
  args: { gameId: zid('games'), accept: z.boolean() },
  returns: z.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const game = await requireActiveParticipant(ctx, args.gameId, userId)
    if (game.drawOfferedBy === null) {
      throw new ConvexError({
        code: 'NO_DRAW_OFFER',
        message: 'There is no draw offer to respond to.',
      })
    }
    if (game.drawOfferedBy === userId) {
      throw new ConvexError({
        code: 'OWN_DRAW_OFFER',
        message: 'You cannot respond to your own draw offer.',
      })
    }
    if (args.accept) {
      await finalizeGame(ctx, game, GameResult.DRAW)
    } else {
      await ctx.db.patch(game._id, { drawOfferedBy: null })
    }
    return null
  },
})
