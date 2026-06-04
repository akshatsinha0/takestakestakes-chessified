import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod'
import { ConvexError } from 'convex/values'
import { zQuery, zMutation } from './lib/functions'
import { requireAuthUserId } from './lib/identity'
import { GameStatus, zGameResult } from './lib/domain'
import { finalizeGame } from './lib/completion'

/*
(1.) Exposes aggregate player statistics and the explicit game-completion entry point used by
     non-move endings (resignation, timeout, abort). `getForUser` reads a player's stats row;
     `completeGame` validates the caller and delegates the actual finalization to the shared
     `finalizeGame` helper so rating and stat bookkeeping is identical to a game that ends by a
     move recorded in `moves.make`.
(2.) `completeGame` only permits a participant to finalize a game that is still in progress, which
     prevents replays and third-party tampering; the heavy lifting (result, winner, Elo exchange,
     stat updates) lives once in `./lib/completion` and is reused here and by the move mutation.
(3.) A draw carries a null winner; the shared helper resets both win streaks accordingly.

This module is the stats read model plus the resignation/timeout completion path. Keeping the
finalization logic in the shared helper rather than inline guarantees one consistent end-of-game
economy regardless of how the game ends, and leaves this file focused on authorization and the
stats query.
*/

export const getForUser = zQuery({
  args: { userId: z.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('userStats')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .unique()
  },
})

export const completeGame = zMutation({
  args: { gameId: zid('games'), result: zGameResult },
  returns: z.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const game = await ctx.db.get(args.gameId)
    if (game === null || game.status !== GameStatus.InProgress) {
      throw new ConvexError({
        code: 'GAME_NOT_ACTIVE',
        message: 'This game cannot be completed.',
      })
    }
    const isParticipant =
      game.whitePlayerId === userId || game.blackPlayerId === userId
    if (!isParticipant) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Only a participant can complete this game.',
      })
    }
    await finalizeGame(ctx, game, args.result)
    return null
  },
})
