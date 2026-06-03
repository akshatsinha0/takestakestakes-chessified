import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod'
import { ConvexError } from 'convex/values'
import { zQuery, zMutation } from './lib/functions'
import { requireAuthUserId } from './lib/identity'
import { computeNewRating } from './lib/elo'
import { GameStatus, zGameResult, GameResult } from './lib/domain'
import { DEFAULT_RATING, SCORE_WIN, SCORE_DRAW, SCORE_LOSS } from './lib/constants'
import type { MutationCtx } from './_generated/server'

/*
(1.) Owns aggregate player statistics and game finalization. `getForUser` reads a player's
     stats row, and `completeGame` atomically ends an in-progress game and updates BOTH players'
     ratings and stats from its result, replacing the former external rating Edge Function with
     an in-transaction mutation.
(2.) `completeGame` derives each side's Elo score from the result, computes new ratings with the
     shared Elo helper using each player's pre-game rating against the opponent's, and writes the
     finished game plus both rating/stat updates in one transaction, so ratings and game status
     can never diverge.
(3.) `applyPlayerOutcome` upserts a player's stats: it seeds a default row on first completion,
     extends or resets the win streak based on whether that player won, tracks the longest streak,
     and records the highest rating ever reached, keeping per-player history consistent.
(4.) Only a participant may finalize a game and only while it is in progress, preventing replays
     or third-party tampering; a draw carries a null winner, which resets both win streaks.

This module concentrates the end-of-game economy: outcome scoring, rating exchange, and streak
accounting. Performing all of it in a single mutation guarantees a completed game's recorded
result, both players' ratings, and their stats are mutually consistent for every observer, and
isolating the Elo math in its own helper keeps this function focused on orchestration and
persistence.
*/

const scoreForWhite = (result: GameResult): number => {
  if (result === GameResult.WhiteWins) return SCORE_WIN
  if (result === GameResult.BlackWins) return SCORE_LOSS
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

    const whiteId = game.whitePlayerId
    const blackId = game.blackPlayerId
    const whiteScore = scoreForWhite(args.result)
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
      args.result === GameResult.WhiteWins
        ? whiteId
        : args.result === GameResult.BlackWins
          ? blackId
          : null

    await ctx.db.patch(args.gameId, {
      status: GameStatus.Completed,
      result: args.result,
      winnerId,
      finishedAt: Date.now(),
    })

    if (whiteId !== null) {
      await applyPlayerOutcome(
        ctx,
        whiteId,
        computeNewRating(whiteRating, blackRating, whiteScore),
        args.result === GameResult.WhiteWins,
      )
    }
    if (blackId !== null) {
      await applyPlayerOutcome(
        ctx,
        blackId,
        computeNewRating(blackRating, whiteRating, SCORE_WIN - whiteScore),
        args.result === GameResult.BlackWins,
      )
    }
    return null
  },
})
