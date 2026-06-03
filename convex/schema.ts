import { defineSchema, defineTable } from 'convex/server'
import { zodToConvexFields } from 'convex-helpers/server/zod'
import {
  profileFields,
  gameFields,
  moveFields,
  gameInvitationFields,
  userStatsFields,
  friendRequestFields,
} from './lib/tables'

/*
(1.) Composes the physical database from the Zod field records in `./lib/tables`, converting
     each to Convex validators with `zodToConvexFields`. The schema declares NO column shapes
     of its own and writes NO status, color, or id literal; it only names tables and their
     indexes, so the storage layer and the function-validation layer are generated from one
     Zod source and cannot drift.
(2.) Better Auth's identity tables (users, sessions, accounts, jwks) are owned by the
     registered component and are absent here; player references inside these tables are
     Better Auth subject ids defined in the field records, while in-app foreign keys are
     `zid('games')` document ids resolved through the same records.
(3.) Indexes encode their full field list in declared order and exist for exactly the access
     paths the app issues: matchmaking scans waiting games by `status` then `timeControl`,
     game screens load by player id, move lists load by `gameId` then `moveNumber`, and
     inboxes load by recipient. Handlers query through `withIndex` only, never `.filter()`,
     so reads stay logarithmic as the player base grows.
(4.) Creation time and document ids come from Convex's injected `_creationTime` and `_id`;
     no table carries a hand-maintained `created_at`/`updated_at`. Mutable gameplay timing
     lives in purpose-named columns inside the field records (`turnStartedAt`, `finishedAt`).

This module is the structural contract that the generated client types and every Convex
function consume. It keeps security-sensitive identity state (component-owned) separate from
high-churn gameplay state (ratings, clocks, presence) so each scales independently, and it
makes the joinable matchmaking state (`status`, the nullable `blackPlayerId` seat) directly
indexable, which is what allows a single transactional mutation to claim an open game without
the check-then-act race the previous Postgres implementation suffered. New tables attach by
adding a field record and one entry here, leaving existing access paths untouched.
*/

export default defineSchema({
  profiles: defineTable(zodToConvexFields(profileFields))
    .index('by_userId', ['userId'])
    .index('by_username', ['username']),

  games: defineTable(zodToConvexFields(gameFields))
    .index('by_status_and_timeControl', ['status', 'timeControl'])
    .index('by_whitePlayerId', ['whitePlayerId'])
    .index('by_blackPlayerId', ['blackPlayerId']),

  moves: defineTable(zodToConvexFields(moveFields)).index('by_game', [
    'gameId',
    'moveNumber',
  ]),

  gameInvitations: defineTable(zodToConvexFields(gameInvitationFields))
    .index('by_toUserId', ['toUserId'])
    .index('by_fromUserId', ['fromUserId']),

  userStats: defineTable(zodToConvexFields(userStatsFields)).index(
    'by_userId',
    ['userId'],
  ),

  friendRequests: defineTable(zodToConvexFields(friendRequestFields))
    .index('by_receiverId', ['receiverId'])
    .index('by_senderId', ['senderId']),
})
