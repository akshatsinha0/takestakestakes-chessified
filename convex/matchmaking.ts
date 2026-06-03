import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod'
import { zMutation } from './lib/functions'
import { requireAuthUserId } from './lib/identity'
import { parseTimeControl } from './lib/time'
import { INITIAL_FEN } from './lib/constants'
import { GameStatus, PieceColor } from './lib/domain'

/*
(1.) `quickMatch` pairs the caller with a waiting opponent at the requested time control, or
     opens a new waiting game if none exists, and returns the game id either way. The lookup
     uses the `by_status_and_timeControl` index to read only waiting games of the right cadence
     and excludes the caller's own open game so a player never matches themselves.
(2.) Because the entire find-or-create runs inside a single Convex mutation transaction, the
     check-then-act race that the previous Supabase implementation suffered is eliminated: two
     players calling simultaneously cannot both claim the same open seat, since the second
     transaction observes the first's write and falls through to creating its own game.
(3.) Joining an open game seats the caller as black, records them as the opponent, flips the
     status to in progress, and resets `turnStartedAt` to now so white's clock begins at the
     moment the game becomes live rather than when it was opened.
(4.) `leaveQueue` withdraws the caller from matchmaking by deleting their still-waiting games,
     identified through the player index and confirmed to have no opponent, so a cancelled
     search leaves no orphan game behind.

This module is the public matchmaking surface and the clearest beneficiary of Convex's
transactional mutations. Expressing "join an existing waiting game or create one" as one
atomic operation removes an entire class of concurrency bugs by construction rather than by
retry logic. Clocks and starting position are seeded from the shared parsers and constants so a
matched game is indistinguishable from any other created game, and queue withdrawal is scoped
strictly to the caller's own unmatched games.
*/

export const quickMatch = zMutation({
  args: { timeControl: z.string() },
  returns: zid('games'),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const now = Date.now()

    const waitingGames = await ctx.db
      .query('games')
      .withIndex('by_status_and_timeControl', (q) =>
        q.eq('status', GameStatus.Waiting).eq('timeControl', args.timeControl),
      )
      .collect()
    const openGame = waitingGames.find(
      (game) => game.whitePlayerId !== userId && game.blackPlayerId === null,
    )

    if (openGame !== undefined) {
      await ctx.db.patch(openGame._id, {
        blackPlayerId: userId,
        opponentId: userId,
        status: GameStatus.InProgress,
        turnStartedAt: now,
      })
      return openGame._id
    }

    const { initialSeconds, incrementSeconds } = parseTimeControl(
      args.timeControl,
    )
    return await ctx.db.insert('games', {
      createdBy: userId,
      whitePlayerId: userId,
      blackPlayerId: null,
      opponentId: null,
      status: GameStatus.Waiting,
      result: null,
      winnerId: null,
      timeControl: args.timeControl,
      boardState: INITIAL_FEN,
      currentTurn: PieceColor.White,
      whiteTimeRemaining: initialSeconds,
      blackTimeRemaining: initialSeconds,
      increment: incrementSeconds,
      turnStartedAt: now,
      finishedAt: null,
    })
  },
})

export const leaveQueue = zMutation({
  args: {},
  returns: z.null(),
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx)
    const myWaitingGames = await ctx.db
      .query('games')
      .withIndex('by_whitePlayerId', (q) => q.eq('whitePlayerId', userId))
      .collect()
    for (const game of myWaitingGames) {
      if (game.status === GameStatus.Waiting && game.blackPlayerId === null) {
        await ctx.db.delete(game._id)
      }
    }
    return null
  },
})
