import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod'
import { zQuery, zMutation } from './lib/functions'
import { requireAuthUserId } from './lib/identity'
import { buildActiveGame } from './lib/gameFactory'
import { GameStatus } from './lib/domain'
import type { QueryCtx } from './_generated/server'

/*
(1.) Exposes the game read/create API. `get` returns one game enriched with both players'
     profiles and its ordered move list in a single reactive query, so the board screen
     re-renders automatically whenever the game row or any move changes, replacing the former
     manual realtime subscription entirely.
(2.) `create` opens an already-active game between the caller and a chosen opponent (the path
     a accepted challenge takes). Side colors are assigned randomly, the clock is seeded from
     the parsed time control, and the board starts from the canonical opening position, so a
     created game is immediately playable with authoritative state.
(3.) `activeForUser` and `historyForUser` list a player's in-flight and finished games using
     the player indexes; both query white and black index slots and merge, because a player
     can occupy either color, and neither path uses `.filter()`.
(4.) Player profiles are resolved by the shared `loadPlayer` helper through the `by_userId`
     index, returning null for an unfilled seat rather than throwing, so a game waiting for an
     opponent still loads and renders.

This module is the read model and creation entry point for gameplay. Returning a fully
composed game (players plus moves) from one query keeps the client free of join logic and
guarantees a consistent snapshot per reactive update. Creation is a single transaction that
fixes colors, clocks, and starting position together, so a game can never exist in a
partially initialized state. Listing queries are index-driven to stay efficient as the game
table grows, and color-agnostic membership is handled by merging the two player indexes
rather than scanning.
*/

const loadPlayer = async (ctx: QueryCtx, userId: string | null) => {
  if (userId === null) {
    return null
  }
  return await ctx.db
    .query('profiles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .unique()
}

export const get = zQuery({
  args: { gameId: zid('games') },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId)
    if (game === null) {
      return null
    }
    const moves = await ctx.db
      .query('moves')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()
    const whitePlayer = await loadPlayer(ctx, game.whitePlayerId)
    const blackPlayer = await loadPlayer(ctx, game.blackPlayerId)
    return { game, moves, whitePlayer, blackPlayer }
  },
})

export const create = zMutation({
  args: { opponentId: z.string(), timeControl: z.string() },
  returns: zid('games'),
  handler: async (ctx, args) => {
    const creatorId = await requireAuthUserId(ctx)
    return await ctx.db.insert(
      'games',
      buildActiveGame(creatorId, args.opponentId, args.timeControl, Date.now()),
    )
  },
})

const gamesForPlayer = async (ctx: QueryCtx, userId: string) => {
  const asWhite = await ctx.db
    .query('games')
    .withIndex('by_whitePlayerId', (q) => q.eq('whitePlayerId', userId))
    .collect()
  const asBlack = await ctx.db
    .query('games')
    .withIndex('by_blackPlayerId', (q) => q.eq('blackPlayerId', userId))
    .collect()
  return [...asWhite, ...asBlack]
}

export const activeForUser = zQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx)
    const games = await gamesForPlayer(ctx, userId)
    return games.filter(
      (game) =>
        game.status === GameStatus.Waiting ||
        game.status === GameStatus.InProgress,
    )
  },
})

export const historyForUser = zQuery({
  args: { userId: z.string() },
  handler: async (ctx, args) => {
    const games = await gamesForPlayer(ctx, args.userId)
    return games
      .filter((game) => game.status === GameStatus.Completed)
      .sort((first, second) => second._creationTime - first._creationTime)
  },
})
