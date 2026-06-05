import { computeNewRating } from './elo'
import { GameStatus, GameResult } from './domain'
import type { GameEndReason } from './domain'
import { DEFAULT_RATING, SCORE_WIN, SCORE_DRAW, SCORE_LOSS } from './constants'
import type { MutationCtx } from '../_generated/server'
import type { Doc } from '../_generated/dataModel'

/*
(1.) Single, reusable game-finalization routine shared by the move mutation (when a move ends
     the game) and the `gameLifecycle` resignation and draw-agreement mutations. Centralizing it
     guarantees a game ends identically no matter how it ends, and prevents the rating/stat logic
     from being duplicated between the call sites.
(2.) `finalizeGame` runs inside the caller's transaction: it stamps the game completed with its
     result, the reason it ended, winner, and finish time, then exchanges Elo from their pre-game
     ratings and updates each player's stats. Because it shares the caller's transaction, recording
     the final move and completing the game are atomic when invoked from `moves.make`, and a
     resignation or accepted draw likewise completes in one transaction with no intermediate state.
(3.) `applyPlayerOutcome` upserts a player's stats: it seeds a default row on first completion,
     extends or resets the win streak by whether that player won, and tracks the longest streak and
     highest rating reached. A null-winner draw resets both streaks.
(4.) Scores derive from the result via `scoreForWhite`; black's score is the zero-sum complement,
     so a single result value drives a symmetric, conserving rating exchange.

This module is the end-of-game economy in one place. Keeping outcome scoring, rating exchange, and
streak accounting here lets every path that can end a game converge on identical, consistent
bookkeeping, and the shared-transaction design is what makes move-and-complete atomic.
*/

const scoreForWhite = (result: GameResult): number => {
  if (result === GameResult.WHITE_WINS) return SCORE_WIN
  if (result === GameResult.BLACK_WINS) return SCORE_LOSS
  return SCORE_DRAW
}

const applyPlayerOutcome = async (
  ctx: MutationCtx,
  userId: string,
  newRating: number,
  didWin: boolean,
) => {
  const profile = await ctx.db
    .query('profiles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .unique()
  if (profile !== null) {
    await ctx.db.patch(profile._id, { rating: newRating })
  }
  const stats = await ctx.db
    .query('userStats')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .unique()
  const nextWinStreak = didWin ? (stats?.winStreak ?? 0) + 1 : 0
  const highestRating = Math.max(stats?.highestRating ?? newRating, newRating)
  const longestWinStreak = Math.max(stats?.longestWinStreak ?? 0, nextWinStreak)
  if (stats === null) {
    await ctx.db.insert('userStats', {
      userId,
      highestRating,
      favoriteOpening: null,
      winStreak: nextWinStreak,
      longestWinStreak,
      puzzlesSolved: 0,
      lessonsCompleted: 0,
      tournamentsPlayed: 0,
    })
    return
  }
  await ctx.db.patch(stats._id, {
    highestRating,
    winStreak: nextWinStreak,
    longestWinStreak,
  })
}

export const finalizeGame = async (
  ctx: MutationCtx,
  game: Doc<'games'>,
  result: GameResult,
  endReason: GameEndReason,
) => {
  const whiteId = game.whitePlayerId
  const blackId = game.blackPlayerId
  const whiteScore = scoreForWhite(result)

  const whiteProfile = whiteId
    ? await ctx.db
        .query('profiles')
        .withIndex('by_userId', (q) => q.eq('userId', whiteId))
        .unique()
    : null
  const blackProfile = blackId
    ? await ctx.db
        .query('profiles')
        .withIndex('by_userId', (q) => q.eq('userId', blackId))
        .unique()
    : null
  const whiteRating = whiteProfile?.rating ?? DEFAULT_RATING
  const blackRating = blackProfile?.rating ?? DEFAULT_RATING

  const winnerId =
    result === GameResult.WHITE_WINS
      ? whiteId
      : result === GameResult.BLACK_WINS
        ? blackId
        : null

  await ctx.db.patch(game._id, {
    status: GameStatus.COMPLETED,
    result,
    endReason,
    winnerId,
    finishedAt: Date.now(),
  })

  if (whiteId !== null) {
    await applyPlayerOutcome(
      ctx,
      whiteId,
      computeNewRating(whiteRating, blackRating, whiteScore),
      result === GameResult.WHITE_WINS,
    )
  }
  if (blackId !== null) {
    await applyPlayerOutcome(
      ctx,
      blackId,
      computeNewRating(blackRating, whiteRating, SCORE_WIN - whiteScore),
      result === GameResult.BLACK_WINS,
    )
  }
}
