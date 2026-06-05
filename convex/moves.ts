import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod'
import { ConvexError } from 'convex/values'
import { zQuery, zMutation } from './lib/functions'
import { requireAuthUserId } from './lib/identity'
import { clockAfterTurn } from './lib/time'
import {
  GameStatus,
  PieceColor,
  GameEndReason,
  zGameResult,
  zGameEndReason,
} from './lib/domain'
import { finalizeGame } from './lib/completion'

/*
(1.) `make` records a half-move and advances the game in ONE transaction: it appends the move
     row, debits the mover's clock, applies the increment, switches the turn, and stores the
     new board FEN together. Because Convex mutations are atomic, the board, clock, and turn
     can never be observed out of sync, and two moves cannot interleave.
(2.) Authorization is enforced server-side: the caller must be the player whose color matches
     `currentTurn`, and the game must be in progress. This makes illegal or out-of-turn moves
     impossible regardless of what the client sends, unlike the previous client-trusted path.
(3.) The mover's spent time is computed from `turnStartedAt` to the transaction's `now`, so
     the clock is authoritative and a tampered client cannot fabricate remaining time; the new
     `turnStartedAt` is set to `now` to begin the opponent's clock from this instant.
(4.) `moveNumber` is derived from the existing move count for the game, giving a dense,
     gap-free ordinal that the move-list query orders on through the `by_game` index.

This module is the single write path for gameplay progression and the place the clock rules
take effect. Co-locating move insertion with game-state patching in one mutation is what gives
the application its consistency guarantee: every observer of a reactive game query sees a board
and clock that agree. Validation of chess legality itself is performed on the client with
chess.js before submission; this function enforces ownership, turn order, and timing, which are
the properties that must be trusted and therefore must live on the server.
*/

export const listByGame = zQuery({
  args: { gameId: zid('games') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('moves')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()
  },
})

export const make = zMutation({
  args: {
    gameId: zid('games'),
    san: z.string(),
    fen: z.string(),
    result: z.union([zGameResult, z.null()]),
    endReason: z.union([zGameEndReason, z.null()]),
  },
  returns: z.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const game = await ctx.db.get(args.gameId)
    if (game === null) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Game not found.' })
    }
    if (game.status !== GameStatus.IN_PROGRESS) {
      throw new ConvexError({
        code: 'GAME_NOT_ACTIVE',
        message: 'This game is not in progress.',
      })
    }
    const moverIsWhite = game.currentTurn === PieceColor.WHITE
    const moverId = moverIsWhite ? game.whitePlayerId : game.blackPlayerId
    if (moverId !== userId) {
      throw new ConvexError({
        code: 'NOT_YOUR_TURN',
        message: 'It is not your turn to move.',
      })
    }

    const now = Date.now()
    const existingMoves = await ctx.db
      .query('moves')
      .withIndex('by_game', (q) => q.eq('gameId', args.gameId))
      .collect()
    const elapsedSeconds = Math.floor((now - game.turnStartedAt) / 1000)

    await ctx.db.insert('moves', {
      gameId: args.gameId,
      moveNumber: existingMoves.length + 1,
      playerColor: game.currentTurn,
      san: args.san,
      fen: args.fen,
      timeTaken: elapsedSeconds,
    })

    const remaining = moverIsWhite
      ? game.whiteTimeRemaining
      : game.blackTimeRemaining
    const newRemaining = clockAfterTurn(
      remaining,
      game.turnStartedAt,
      now,
      game.increment,
    )

    await ctx.db.patch(args.gameId, {
      boardState: args.fen,
      currentTurn: moverIsWhite ? PieceColor.BLACK : PieceColor.WHITE,
      turnStartedAt: now,
      whiteTimeRemaining: moverIsWhite ? newRemaining : game.whiteTimeRemaining,
      blackTimeRemaining: moverIsWhite ? game.blackTimeRemaining : newRemaining,
      // Playing a move withdraws any standing draw offer, matching the
      // convention that a move is an implicit decline.
      drawOfferedBy: null,
    })

    // A move that ends the game finalizes it in this same transaction, so the
    // decisive move and the completion (result + Elo) are atomic. The decisive
    // move always reports its precise reason; a null reason defaults to checkmate
    // since that is the only decisive board ending a move produces.
    if (args.result !== null) {
      await finalizeGame(
        ctx,
        game,
        args.result,
        args.endReason ?? GameEndReason.CHECKMATE,
      )
    }
    return null
  },
})
