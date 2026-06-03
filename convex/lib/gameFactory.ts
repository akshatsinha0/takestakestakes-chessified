import { parseTimeControl } from './time'
import { INITIAL_FEN } from './constants'
import { GameStatus, PieceColor } from './domain'
import type { Doc } from '../_generated/dataModel'

/*
(1.) Builds the complete field set for a brand-new, immediately-active game between two known
     players, used by both direct game creation and challenge acceptance so the two paths
     produce identical, fully-initialized game documents from one definition.
(2.) Colors are assigned randomly between the creator and the opponent, the clock is seeded
     from the parsed time control for both sides, the board starts from the canonical opening
     position, and `turnStartedAt` is set to the supplied `now` so white's clock begins the
     instant the game exists.
(3.) Every nullable slot that only becomes meaningful later (`result`, `winnerId`,
     `finishedAt`) is initialized to explicit `null` rather than left absent, so the returned
     object is a fully determined document shape with no optional fields.

This helper centralizes game construction so that the rules for seeding colors, clocks, and the
starting position live in exactly one place. Returning a plain field object rather than
performing the insert keeps it pure and lets each caller insert within its own transaction,
which is important because challenge acceptance also needs to update the invitation in the same
mutation. The return type is derived from the generated `games` document shape minus the system
fields, so the object stays in lockstep with the schema automatically.
*/

type NewGameFields = Omit<Doc<'games'>, '_id' | '_creationTime'>

export const buildActiveGame = (
  creatorId: string,
  opponentId: string,
  timeControl: string,
  now: number,
): NewGameFields => {
  const { initialSeconds, incrementSeconds } = parseTimeControl(timeControl)
  const creatorIsWhite = Math.random() < 0.5
  return {
    createdBy: creatorId,
    whitePlayerId: creatorIsWhite ? creatorId : opponentId,
    blackPlayerId: creatorIsWhite ? opponentId : creatorId,
    opponentId,
    status: GameStatus.InProgress,
    result: null,
    winnerId: null,
    timeControl,
    boardState: INITIAL_FEN,
    currentTurn: PieceColor.White,
    whiteTimeRemaining: initialSeconds,
    blackTimeRemaining: initialSeconds,
    increment: incrementSeconds,
    turnStartedAt: now,
    finishedAt: null,
  }
}
