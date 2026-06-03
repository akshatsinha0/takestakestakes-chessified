/*
(1.) Holds the non-categorical domain constants of the application in one place so that
     literal values such as the starting position, the default rating, or the invitation
     lifetime are never retyped at a call site. Categorical values (statuses, colors,
     results) live in `./domain`; this file complements it with scalar configuration.
(2.) `INITIAL_FEN` is the standard chess starting position in Forsyth-Edwards Notation and
     is the single seed every new game's `boardState` is created from, guaranteeing all
     games begin from an identical, validated position rather than ad hoc strings.
(3.) `DEFAULT_RATING` seeds both a new profile's `rating` and its `highestRating`, keeping
     the new-player baseline consistent across profile creation and stats initialization.
(4.) `INVITATION_TTL_MS` defines how long a direct challenge remains acceptable; expiry is
     computed as creation time plus this window so the value is owned here and not spread
     across challenge creation and cleanup logic.
(5.) `SECONDS_PER_MINUTE` makes the time-control parser (e.g. "5+3" minutes) explicit and
     unit-correct instead of embedding a bare 60 in arithmetic.

This module concentrates the tunable numeric and string defaults that govern game creation,
profile bootstrapping, and challenge expiry. Centralizing them means product decisions
(starting rating, challenge window) change in exactly one location and propagate to every
consumer, and it keeps feature functions free of unexplained magic values, which both
improves readability and removes a class of drift bugs where two code paths assume different
defaults. The constants are environment-neutral and side-effect-free, so any server function
can import them without ordering concerns.
*/

export const INITIAL_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export const DEFAULT_RATING = 1200

export const DEFAULT_AVATAR_URL = ''

export const DEFAULT_BIO = ''

export const INVITATION_TTL_MS = 5 * 60 * 1000

export const SECONDS_PER_MINUTE = 60

export const ELO_K_FACTOR = 32

export const ELO_DIVISOR = 400

export const SCORE_WIN = 1

export const SCORE_DRAW = 0.5

export const SCORE_LOSS = 0

export const ONLINE_THRESHOLD_MS = 2 * 60 * 1000
