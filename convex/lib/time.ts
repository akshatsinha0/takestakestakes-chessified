import { SECONDS_PER_MINUTE } from './constants'

/*
(1.) Centralizes interpretation of the `"minutes+increment"` time-control string (for
     example `"5+3"`) into concrete seconds, so every game-creating path (matchmaking and
     direct challenges) derives identical initial clocks and increments from one parser
     rather than each splitting the string itself.
(2.) `parseTimeControl` is defensive: a missing or malformed increment segment resolves to
     zero, and the minutes segment is coerced through `Number.parseInt`, so an unexpected
     value yields a deterministic clock instead of `NaN` propagating into stored game state.
(3.) `clockAfterTurn` computes the authoritative post-move clock for the player who just
     moved: it subtracts the elapsed thinking time (now minus when their turn began), floors
     the result at zero so a clock never goes negative, and adds the increment. Keeping this
     calculation server-side and in one function is what makes the clock authoritative and
     immune to client tampering.

This module owns all time arithmetic for gameplay. Concentrating the time-control format and
the per-move clock update here means the rules of timekeeping are defined once and reused by
the mutations that create games and record moves, which removes the risk of two code paths
disagreeing about how much time a move costs. The functions are pure and take an explicit
`now` timestamp so callers supply the transaction's clock reading, keeping the logic
deterministic and straightforward to reason about.
*/

export type ParsedTimeControl = {
  initialSeconds: number
  incrementSeconds: number
}

export const parseTimeControl = (timeControl: string): ParsedTimeControl => {
  const [minutesPart, incrementPart] = timeControl.split('+')
  const minutes = Number.parseInt(minutesPart, 10) || 0
  const incrementSeconds = Number.parseInt(incrementPart, 10) || 0
  return {
    initialSeconds: minutes * SECONDS_PER_MINUTE,
    incrementSeconds,
  }
}

export const clockAfterTurn = (
  remainingSeconds: number,
  turnStartedAt: number,
  now: number,
  incrementSeconds: number,
): number => {
  const elapsedSeconds = Math.floor((now - turnStartedAt) / 1000)
  const afterSpend = Math.max(0, remainingSeconds - elapsedSeconds)
  return afterSpend + incrementSeconds
}
