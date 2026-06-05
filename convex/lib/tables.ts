import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod'
import {
  zPieceColor,
  zGameStatus,
  zGameResult,
  zGameEndReason,
  zRequestStatus,
  zFriendStatus,
} from './domain'

/*
(1.) Declares each persisted table's column shape ONCE as a record of Zod validators. These
     same records are consumed in two places: `convex/schema.ts` converts them to Convex
     validators via `zodToConvexFields` to define the physical tables, and feature
     functions reuse them (whole, `.pick`ed, or `.partial`ed through `z.object`) to validate
     arguments and return values. A column therefore has a single definition that governs
     both storage and the API contract, so the two can never disagree.
(2.) Absence is expressed with explicit `z.null()` unions (`nullableString`/`nullableNumber`)
     rather than optional/undefined fields, matching the project rule that every document
     has a fully determined shape; an unfilled opponent seat is `null`, never missing.
(3.) Categorical columns reference the shared Zod enums from `./domain`, so no status,
     color, or result literal is written here either. In-app foreign keys use `zid('games')`
     for compile-time-checked document ids, while cross-boundary player references are
     `z.string()` Better Auth subject ids that do not correspond to an app table.
(4.) System columns (`_id`, `_creationTime`) are intentionally omitted; Convex injects them,
     and creation time is read from `_creationTime` rather than a hand-kept timestamp.

This module is the schema-and-validation seam of the backend. By expressing table shapes in
Zod and deriving the Convex validators from them, the project keeps Zod as the single
validation language across persistence and function boundaries while still producing native
Convex table definitions. Reusing these records in function signatures means a new field is
added in exactly one place and immediately becomes storable, queryable, and validated at the
API edge. The records hold structure only, with no logic or environment-specific code, so
they compose freely into larger or narrower argument schemas as features require.
*/

const nullableString = z.union([z.string(), z.null()])
const nullableNumber = z.union([z.number(), z.null()])

export const profileFields = {
  userId: z.string(),
  username: z.string(),
  rating: z.number(),
  avatarUrl: z.string(),
  bio: z.string(),
  lastActive: z.number(),
}

export const gameFields = {
  createdBy: z.string(),
  whitePlayerId: nullableString,
  blackPlayerId: nullableString,
  opponentId: nullableString,
  status: zGameStatus,
  result: z.union([zGameResult, z.null()]),
  endReason: z.union([zGameEndReason, z.null()]),
  winnerId: nullableString,
  drawOfferedBy: nullableString,
  timeControl: z.string(),
  boardState: z.string(),
  currentTurn: zPieceColor,
  whiteTimeRemaining: z.number(),
  blackTimeRemaining: z.number(),
  increment: z.number(),
  turnStartedAt: z.number(),
  finishedAt: nullableNumber,
}

export const moveFields = {
  gameId: zid('games'),
  moveNumber: z.number(),
  playerColor: zPieceColor,
  san: z.string(),
  fen: z.string(),
  timeTaken: z.number(),
}

export const gameInvitationFields = {
  fromUserId: z.string(),
  toUserId: z.string(),
  timeControl: z.string(),
  message: z.string(),
  status: zRequestStatus,
  expiresAt: z.number(),
}

export const userStatsFields = {
  userId: z.string(),
  highestRating: z.number(),
  favoriteOpening: nullableString,
  winStreak: z.number(),
  longestWinStreak: z.number(),
  puzzlesSolved: z.number(),
  lessonsCompleted: z.number(),
  tournamentsPlayed: z.number(),
}

export const friendRequestFields = {
  senderId: z.string(),
  receiverId: z.string(),
  status: zFriendStatus,
}
