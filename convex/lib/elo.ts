import { ELO_K_FACTOR, ELO_DIVISOR } from './constants'

/*
(1.) Implements the standard Elo rating update so both players' new ratings after a completed
     game are derived from one definition rather than duplicated at each call site. `score` is
     the actual outcome for the player (1 win, 0.5 draw, 0 loss) supplied by the caller from the
     shared score constants.
(2.) The expected score is the logistic function of the rating difference over `ELO_DIVISOR`,
     and the rating change is `ELO_K_FACTOR` times the gap between actual and expected score,
     which is the canonical Elo formula; the result is rounded to a whole rating point because
     ratings are stored and displayed as integers.
(3.) The function is pure and symmetric: calling it once per player with their own rating, the
     opponent's rating, and their respective scores yields a zero-sum exchange, so no rating is
     created or destroyed beyond rounding.

This helper isolates the rating mathematics from the game-completion mutation that applies it,
keeping the formula testable in isolation and the tunable parameters (`K`, divisor) owned by the
constants module. Centralizing it guarantees that white and black are rated by the identical
rule and that any future change to the rating model is a single edit propagated to every
completed game.
*/

export const computeNewRating = (
  playerRating: number,
  opponentRating: number,
  score: number,
): number => {
  const expected =
    1 / (1 + 10 ** ((opponentRating - playerRating) / ELO_DIVISOR))
  return Math.round(playerRating + ELO_K_FACTOR * (score - expected))
}
