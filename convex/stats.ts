import { z } from 'zod'
import { zQuery } from './lib/functions'

/*
(1.) Exposes aggregate player statistics as a read model. `getForUser` reads a player's stats row
     through the `by_userId` index and returns it (or null before the player's first completed game),
     with no scan, so it stays efficient as the user base grows.
(2.) This module deliberately holds NO game-completion mutation. Finalization is owned by the paths
     that can legitimately end a game: `moves.make` for board-driven endings (checkmate, stalemate)
     and `gameLifecycle` for resignation and draw agreement. Each routes through the shared
     `finalizeGame` helper, so stats are written there and only read here, which removes the former
     generic completion endpoint that let a participant submit an arbitrary result for themselves.

This module is the stats read surface and nothing more. Separating the read of accumulated results
from the write that produces them keeps authorization for ending a game concentrated in the two
endpoints that enforce how a game may end, and leaves this file a thin, side-effect-free query.
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
