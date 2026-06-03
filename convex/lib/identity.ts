import { ConvexError } from 'convex/values'
import { authComponent } from '../auth'
import type { QueryCtx, MutationCtx } from '../_generated/server'

/*
(1.) Centralizes resolution of "who is calling" so every function reads the current user's
     identity through one pair of helpers instead of each reimplementing the lookup.
     `getAuthUserId` returns the Better Auth subject id of the signed-in user, or `null`
     when the request is anonymous; `requireAuthUserId` returns the same id but throws a
     `ConvexError` when no identity is present, for endpoints that must be authenticated.
(2.) Identity is obtained from `authComponent.safeGetAuthUser(ctx)`, the component's own
     accessor, rather than by reading `ctx.auth.getUserIdentity()` directly. This keeps the
     mapping from "Convex request" to "Better Auth user id" owned by the auth component, so
     any change to how identities are encoded in the JWT is absorbed here and the returned
     `_id` is always the value other tables store as their `userId`/player references.
(3.) The thrown `ConvexError` carries a structured payload (`code` plus `message`) so the
     client can branch on `UNAUTHENTICATED` programmatically while still surfacing a human
     message, without leaking server internals.
(4.) The context parameter is typed as the union of `QueryCtx` and `MutationCtx` so the same
     helpers serve read and write functions; they intentionally do not accept an action
     context, which has no database access and a different identity surface.

This module is the authorization seam the rest of the backend builds on. Reducing identity
resolution to `getAuthUserId`/`requireAuthUserId` means access checks across profiles,
games, challenges, and friends are expressed uniformly, and the decision of whether a path
tolerates anonymity (return null) or demands a user (throw) is explicit at each call site
rather than buried in duplicated boilerplate. Concentrating the component dependency here
also keeps feature modules from importing auth internals directly, preserving a clean
boundary that simplifies future changes such as adding role claims or impersonation.
*/

type AuthAwareCtx = QueryCtx | MutationCtx

export const UNAUTHENTICATED = 'UNAUTHENTICATED'

export async function getAuthUserId(
  ctx: AuthAwareCtx,
): Promise<string | null> {
  const user = await authComponent.safeGetAuthUser(ctx)
  return user?._id ?? null
}

export async function requireAuthUserId(ctx: AuthAwareCtx): Promise<string> {
  const userId = await getAuthUserId(ctx)
  if (userId === null) {
    throw new ConvexError({
      code: UNAUTHENTICATED,
      message: 'You must be signed in to perform this action.',
    })
  }
  return userId
}
