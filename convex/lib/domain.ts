import { z } from 'zod'

/*
(1.) This module is the ONLY location in the entire codebase where the categorical string
     literals of the chess domain are written. Every status, color, result, and request
     state is declared once as a frozen named object (e.g. `GameStatus.WAITING`), so all
     other code, on both the Convex backend and the React frontend, references a named
     member and never an inline string. Hardcoded literals such as 'waiting' or 'white'
     appearing anywhere else are by definition a defect.
(2.) For each category the Zod schema is derived from its object's values via the typed
     `valuesOf` helper feeding `z.enum`, so the validator's accepted set is generated from
     the same source that supplies the named accessors; the two cannot drift. `z.enum` (not
     `z.nativeEnum`) is used because it is the form `zodToConvex` lowers into a Convex
     `v.union(v.literal(...))`. The TypeScript type is then inferred from the Zod schema with
     `z.infer`, so one declaration yields a runtime validator, a static union type, and
     ergonomic value accessors at once.
(3.) A value and a type intentionally share each name (e.g. `PieceColor` the object and
     `PieceColor` the type) because they occupy different declaration spaces; call sites use
     `PieceColor.WHITE` for the value and `PieceColor` for annotations without ambiguity.
(4.) The file imports only `zod`, which is environment-neutral, so it is safe to import from
     server functions, the Convex schema, and browser components alike without dragging any
     server-only dependency into the client bundle.

This module is the shared vocabulary that lets validation, persistence, and presentation
agree on a single set of legal values. Centralizing the literals here means a domain change
(adding a result, renaming a status) is one edit that propagates through the Zod schemas,
the inferred types, the Convex table validators built on top of them, and every UI branch,
which is the property that keeps the model consistent as features multiply. The conversion
of these Zod schemas into Convex validators is deliberately NOT done here; it lives at the
persistence boundary so this file stays free of backend dependencies and reusable from any
context.
*/

export const PieceColor = {
  WHITE: 'white',
  BLACK: 'black',
} as const

export const GameStatus = {
  WAITING: 'waiting',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
} as const

export const GameResult = {
  WHITE_WINS: 'white_wins',
  BLACK_WINS: 'black_wins',
  DRAW: 'draw',
  ABANDONED: 'abandoned',
} as const

export const GameEndReason = {
  CHECKMATE: 'checkmate',
  STALEMATE: 'stalemate',
  THREEFOLD_REPETITION: 'threefold_repetition',
  INSUFFICIENT_MATERIAL: 'insufficient_material',
  FIFTY_MOVE_RULE: 'fifty_move_rule',
  RESIGNATION: 'resignation',
  DRAW_AGREEMENT: 'draw_agreement',
} as const

export const RequestStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
} as const

export const FriendStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const

const valuesOf = <T extends Record<string, string>>(
  source: T,
): [T[keyof T], ...T[keyof T][]] =>
  Object.values(source) as [T[keyof T], ...T[keyof T][]]

export const zPieceColor = z.enum(valuesOf(PieceColor))
export const zGameStatus = z.enum(valuesOf(GameStatus))
export const zGameResult = z.enum(valuesOf(GameResult))
export const zGameEndReason = z.enum(valuesOf(GameEndReason))
export const zRequestStatus = z.enum(valuesOf(RequestStatus))
export const zFriendStatus = z.enum(valuesOf(FriendStatus))

export type PieceColor = z.infer<typeof zPieceColor>
export type GameStatus = z.infer<typeof zGameStatus>
export type GameResult = z.infer<typeof zGameResult>
export type GameEndReason = z.infer<typeof zGameEndReason>
export type RequestStatus = z.infer<typeof zRequestStatus>
export type FriendStatus = z.infer<typeof zFriendStatus>
