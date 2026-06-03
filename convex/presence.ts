import { z } from 'zod'
import { zQuery, zMutation } from './lib/functions'
import { getAuthUserId, requireAuthUserId } from './lib/identity'
import { ONLINE_THRESHOLD_MS } from './lib/constants'

/*
(1.) Provides lightweight presence. `heartbeat` stamps the caller's profile with the current
     time, and `onlinePlayers` returns the profiles whose last heartbeat falls inside the online
     window, ordered by rating, so the lobby can show who is currently available.
(2.) Presence is modeled as a recency check on `lastActive` rather than a separate connection
     table: a player is "online" when their most recent heartbeat is newer than
     `ONLINE_THRESHOLD_MS`, which needs no teardown logic because staleness alone marks a player
     offline once heartbeats stop.
(3.) `heartbeat` no-ops gracefully when the caller has no profile yet (it patches only an existing
     row), so a just-authenticated user mid-provisioning cannot error, and `onlinePlayers` excludes
     the caller so the list shows opponents rather than oneself.
(4.) The online list is sorted by rating descending in the handler after collecting candidate
     profiles, presenting stronger players first for matchmaking discovery.

This module is the presence subsystem and intentionally minimal: by deriving online status from a
single timestamp it avoids the complexity and cleanup burden of explicit session tracking while
remaining reactive, since any client subscribed to `onlinePlayers` re-renders as heartbeats land.
The threshold is owned by the constants module so the definition of "online" is tuned in one place.
*/

export const heartbeat = zMutation({
  args: {},
  returns: z.null(),
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx)
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .unique()
    if (profile !== null) {
      await ctx.db.patch(profile._id, { lastActive: Date.now() })
    }
    return null
  },
})

export const onlinePlayers = zQuery({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx)
    const cutoff = Date.now() - ONLINE_THRESHOLD_MS
    const profiles = await ctx.db.query('profiles').collect()
    return profiles
      .filter(
        (profile) => profile.userId !== me && profile.lastActive >= cutoff,
      )
      .sort((first, second) => second.rating - first.rating)
  },
})
