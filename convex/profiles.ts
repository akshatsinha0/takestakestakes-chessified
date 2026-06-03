import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod'
import { zQuery, zMutation } from './lib/functions'
import { getAuthUserId, requireAuthUserId } from './lib/identity'
import {
  DEFAULT_RATING,
  DEFAULT_AVATAR_URL,
  DEFAULT_BIO,
} from './lib/constants'

/*
(1.) Exposes the player-profile API the client depends on for identity-bound gameplay data.
     `getCurrentProfile` reads the signed-in user's profile (or null when anonymous or not
     yet provisioned); `ensureProfile` idempotently creates the profile on first sign-in;
     `updateProfile` edits the user-controlled fields. Every function resolves the caller
     through the shared identity helpers so authorization is uniform and not re-derived here.
(2.) `ensureProfile` is idempotent by design: it looks the profile up via the `by_userId`
     index and returns the existing id if present, otherwise inserts a new row seeded from
     the centralized defaults. This makes it safe to call after every successful sign-in or
     sign-up without risking duplicate profiles, which matters because Convex has no native
     unique constraint to fall back on.
(3.) `updateProfile` accepts the full set of editable fields as required values rather than
     optional partial updates, matching the project rule against optional/undefined: the
     edit form submits current values for unchanged fields, so the mutation always writes a
     fully determined document and never has to reason about "absent means keep".
(4.) Reads use `withIndex('by_userId')` exclusively, never `.filter()`, so the per-request
     profile lookup stays logarithmic as the player base grows.

This module is the bridge between Better Auth identities and the chess domain's notion of a
player. Keeping profile provisioning idempotent and centralized means the React auth layer
can treat "ensure a profile exists" as a fire-and-forget step after authentication, while
gameplay code can assume a profile is reachable by user id. Editable fields are explicitly
enumerated so the write surface is auditable and the form contract is unambiguous; ratings
and presence are intentionally excluded here because they are mutated by gameplay and
presence systems, not by user edits, which keeps authority over each field with the system
that owns it.
*/

export const directory = zQuery({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query('profiles').collect()
    return profiles.sort((first, second) => second.rating - first.rating)
  },
})

export const byUserId = zQuery({
  args: { userId: z.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .unique()
  },
})

export const getCurrentProfile = zQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (userId === null) {
      return null
    }
    return await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .unique()
  },
})

export const ensureProfile = zMutation({
  args: { username: z.string() },
  returns: zid('profiles'),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const existing = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .unique()
    if (existing !== null) {
      return existing._id
    }
    return await ctx.db.insert('profiles', {
      userId,
      username: args.username,
      rating: DEFAULT_RATING,
      avatarUrl: DEFAULT_AVATAR_URL,
      bio: DEFAULT_BIO,
      lastActive: Date.now(),
    })
  },
})

export const updateProfile = zMutation({
  args: {
    username: z.string(),
    bio: z.string(),
    avatarUrl: z.string(),
  },
  returns: z.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .unique()
    if (profile === null) {
      return null
    }
    await ctx.db.patch(profile._id, {
      username: args.username,
      bio: args.bio,
      avatarUrl: args.avatarUrl,
    })
    return null
  },
})
