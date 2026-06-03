import { zCustomQuery, zCustomMutation } from 'convex-helpers/server/zod'
import { NoOp } from 'convex-helpers/server/customFunctions'
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from '../_generated/server'

/*
(1.) Centralizes the Zod-aware function builders so no feature module repeats the
     `zCustomQuery(query, NoOp)` wiring. Every app query/mutation is registered through
     `zQuery`/`zMutation` (public) or `zInternalQuery`/`zInternalMutation` (private), which
     accept Zod schemas for `args` and `returns` and run Zod validation before the handler
     executes, throwing a `ConvexError` carrying the `ZodError` on mismatch.
(2.) `NoOp` is the identity context transform: these builders add Zod validation WITHOUT
     injecting extra context. When cross-cutting context is later needed (resolving the
     current profile once per call, enforcing authentication uniformly), a single custom
     transform replaces `NoOp` here and every function inherits it, which is the reason the
     builders are defined centrally rather than ad hoc per module.
(3.) Public and internal variants are exported explicitly so call sites choose the correct
     exposure: `zQuery`/`zMutation` are reachable from the client, while `zInternalQuery`/
     `zInternalMutation` are callable only by other Convex functions (schedulers, triggers,
     server-to-server calls) and must be used for anything not meant for the public API.

This module is the single construction point for the project's server functions and the
mechanism that enforces the Zod-first validation convention uniformly. Importing a builder
from here guarantees consistent argument parsing, consistent error semantics, and one place
to evolve middleware behavior, so feature files stay focused on domain logic instead of
validation plumbing. It exports only builders and registers no functions itself, keeping it
route-free while still living under `convex/` where the generated `query`/`mutation`
primitives are available. The project standard routes every app function through these
builders; raw Convex validators are reserved for component-generated functions only.
*/

export const zQuery = zCustomQuery(query, NoOp)
export const zMutation = zCustomMutation(mutation, NoOp)
export const zInternalQuery = zCustomQuery(internalQuery, NoOp)
export const zInternalMutation = zCustomMutation(internalMutation, NoOp)
