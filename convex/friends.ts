import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod'
import { ConvexError } from 'convex/values'
import { zQuery, zMutation } from './lib/functions'
import { requireAuthUserId } from './lib/identity'
import { FriendStatus } from './lib/domain'
import type { QueryCtx } from './_generated/server'

/*
(1.) Implements the social graph. `request` creates a pending friendship from the caller to a
     recipient, `respond` lets the recipient accept or reject it, `list` returns the caller's
     accepted friends' profiles, and `relationshipWith` reports the current edge between the
     caller and another user for rendering the correct action button.
(2.) `request` rejects self-friending and refuses to create a second edge when any request
     already exists in either direction, queried through the sender and receiver indexes, so the
     graph cannot accumulate duplicate or contradictory edges between the same pair.
(3.) `respond` verifies the caller is the request's recipient before changing its status, so only
     the addressed user can accept or reject, consistent with the authorization model used across
     the backend.
(4.) `list` resolves friendships from both directions (requests the caller sent and received) and
     returns the OTHER participant's profile in each accepted edge, because an accepted request is
     a single undirected friendship regardless of who initiated it.

This module owns the friendship lifecycle and keeps an accepted row as the canonical
representation of a friendship edge. Querying both index directions for membership and
duplicate-prevention avoids any table scan, and concentrating the "is there already an edge"
check in one place keeps the invariant (at most one edge per unordered pair) enforced uniformly.
*/

const edgeBetween = async (ctx: QueryCtx, userA: string, userB: string) => {
  const sent = await ctx.db
    .query('friendRequests')
    .withIndex('by_senderId', (q) => q.eq('senderId', userA))
    .collect()
  const received = await ctx.db
    .query('friendRequests')
    .withIndex('by_receiverId', (q) => q.eq('receiverId', userA))
    .collect()
  return [...sent, ...received].find(
    (edge) => edge.senderId === userB || edge.receiverId === userB,
  )
}

export const relationshipWith = zQuery({
  args: { userId: z.string() },
  handler: async (ctx, args) => {
    const me = await requireAuthUserId(ctx)
    return (await edgeBetween(ctx, me, args.userId)) ?? null
  },
})

export const request = zMutation({
  args: { receiverId: z.string() },
  returns: zid('friendRequests'),
  handler: async (ctx, args) => {
    const senderId = await requireAuthUserId(ctx)
    if (senderId === args.receiverId) {
      throw new ConvexError({
        code: 'INVALID',
        message: 'You cannot add yourself as a friend.',
      })
    }
    const existing = await edgeBetween(ctx, senderId, args.receiverId)
    if (existing !== undefined) {
      throw new ConvexError({
        code: 'ALREADY_EXISTS',
        message: 'A friend request already exists with this player.',
      })
    }
    return await ctx.db.insert('friendRequests', {
      senderId,
      receiverId: args.receiverId,
      status: FriendStatus.Pending,
    })
  },
})

export const respond = zMutation({
  args: { requestId: zid('friendRequests'), accept: z.boolean() },
  returns: z.null(),
  handler: async (ctx, args) => {
    const me = await requireAuthUserId(ctx)
    const friendRequest = await ctx.db.get(args.requestId)
    if (friendRequest === null || friendRequest.receiverId !== me) {
      throw new ConvexError({
        code: 'NOT_FOUND',
        message: 'Friend request not found.',
      })
    }
    await ctx.db.patch(friendRequest._id, {
      status: args.accept ? FriendStatus.Accepted : FriendStatus.Rejected,
    })
    return null
  },
})

export const incomingRequests = zQuery({
  args: {},
  handler: async (ctx) => {
    const me = await requireAuthUserId(ctx)
    const received = await ctx.db
      .query('friendRequests')
      .withIndex('by_receiverId', (q) => q.eq('receiverId', me))
      .collect()
    const pending = received.filter(
      (edge) => edge.status === FriendStatus.Pending,
    )
    return await Promise.all(
      pending.map(async (edge) => {
        const sender = await ctx.db
          .query('profiles')
          .withIndex('by_userId', (q) => q.eq('userId', edge.senderId))
          .unique()
        return { request: edge, sender }
      }),
    )
  },
})

export const remove = zMutation({
  args: { requestId: zid('friendRequests') },
  returns: z.null(),
  handler: async (ctx, args) => {
    const me = await requireAuthUserId(ctx)
    const edge = await ctx.db.get(args.requestId)
    if (edge && (edge.senderId === me || edge.receiverId === me)) {
      await ctx.db.delete(edge._id)
    }
    return null
  },
})

export const list = zQuery({
  args: {},
  handler: async (ctx) => {
    const me = await requireAuthUserId(ctx)
    const sent = await ctx.db
      .query('friendRequests')
      .withIndex('by_senderId', (q) => q.eq('senderId', me))
      .collect()
    const received = await ctx.db
      .query('friendRequests')
      .withIndex('by_receiverId', (q) => q.eq('receiverId', me))
      .collect()
    const accepted = [...sent, ...received].filter(
      (edge) => edge.status === FriendStatus.Accepted,
    )
    return await Promise.all(
      accepted.map(async (edge) => {
        const otherUserId = edge.senderId === me ? edge.receiverId : edge.senderId
        return await ctx.db
          .query('profiles')
          .withIndex('by_userId', (q) => q.eq('userId', otherUserId))
          .unique()
      }),
    )
  },
})
