import { z } from 'zod'
import { zid } from 'convex-helpers/server/zod'
import { ConvexError } from 'convex/values'
import { zQuery, zMutation } from './lib/functions'
import { requireAuthUserId } from './lib/identity'
import { buildActiveGame } from './lib/gameFactory'
import { INVITATION_TTL_MS } from './lib/constants'
import { RequestStatus } from './lib/domain'
import type { MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

/*
(1.) Implements direct player-to-player challenges. `send` creates a pending invitation with a
     server-set expiry (`now + INVITATION_TTL_MS`); `inbox` returns the caller's still-valid
     pending invitations enriched with each sender's profile; `accept` and `decline` resolve an
     invitation addressed to the caller.
(2.) `accept` performs two writes in one transaction: it marks the invitation accepted and
     creates the in-progress game between the two players via the shared game factory, so an
     accepted challenge can never leave a dangling invitation without a game or vice versa.
(3.) Every resolving action verifies the caller is the invitation's recipient before mutating,
     so a user cannot accept or decline an invitation addressed to someone else; missing
     invitations raise a structured `ConvexError` the client can branch on.
(4.) `inbox` filters out expired invitations at read time using the stored `expiresAt`, so a
     stale challenge silently disappears from the recipient's view without a cleanup job, while
     the row remains for auditing.

This module is the challenge subsystem and a second consumer of the game factory, guaranteeing
that games born from challenges are identical in shape to those born from matchmaking or direct
creation. Bundling invitation resolution and game creation into single transactions provides the
same consistency guarantee the rest of the backend relies on, and recipient checks keep the
authorization model uniform with the other feature modules.
*/

export const send = zMutation({
  args: {
    toUserId: z.string(),
    timeControl: z.string(),
    message: z.string(),
  },
  returns: zid('gameInvitations'),
  handler: async (ctx, args) => {
    const fromUserId = await requireAuthUserId(ctx)
    return await ctx.db.insert('gameInvitations', {
      fromUserId,
      toUserId: args.toUserId,
      timeControl: args.timeControl,
      message: args.message,
      status: RequestStatus.PENDING,
      expiresAt: Date.now() + INVITATION_TTL_MS,
    })
  },
})

export const inbox = zQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx)
    const now = Date.now()
    const invitations = await ctx.db
      .query('gameInvitations')
      .withIndex('by_toUserId', (q) => q.eq('toUserId', userId))
      .collect()
    const pending = invitations.filter(
      (invitation) =>
        invitation.status === RequestStatus.PENDING &&
        invitation.expiresAt > now,
    )
    return await Promise.all(
      pending.map(async (invitation) => {
        const sender = await ctx.db
          .query('profiles')
          .withIndex('by_userId', (q) => q.eq('userId', invitation.fromUserId))
          .unique()
        return { invitation, sender }
      }),
    )
  },
})

const requireOwnedInvitation = async (
  ctx: MutationCtx,
  invitationId: Id<'gameInvitations'>,
  recipientId: string,
) => {
  const invitation = await ctx.db.get(invitationId)
  if (invitation === null || invitation.toUserId !== recipientId) {
    throw new ConvexError({
      code: 'NOT_FOUND',
      message: 'Invitation not found.',
    })
  }
  return invitation
}

export const accept = zMutation({
  args: { invitationId: zid('gameInvitations') },
  returns: zid('games'),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const invitation = await requireOwnedInvitation(
      ctx,
      args.invitationId,
      userId,
    )
    await ctx.db.patch(invitation._id, { status: RequestStatus.ACCEPTED })
    return await ctx.db.insert(
      'games',
      buildActiveGame(
        invitation.fromUserId,
        userId,
        invitation.timeControl,
        Date.now(),
      ),
    )
  },
})

export const decline = zMutation({
  args: { invitationId: zid('gameInvitations') },
  returns: z.null(),
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const invitation = await requireOwnedInvitation(
      ctx,
      args.invitationId,
      userId,
    )
    await ctx.db.patch(invitation._id, { status: RequestStatus.DECLINED })
    return null
  },
})
