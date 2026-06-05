import { useEffect, useRef, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { useMutation } from 'convex/react'
import { toast } from 'react-toastify'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import {
  PieceColor,
  GameStatus,
  GameResult,
  GameEndReason,
} from '../../../convex/lib/domain'
import {
  DEFAULT_RATING,
  SECONDS_PER_MINUTE,
} from '../../../convex/lib/constants'
import { sanToPieceGlyph, sanWithoutPieceLetter } from '../../lib/gameConfig'
import useChessSounds from '../../hooks/useChessSounds'
import { useAuth } from '../../context/AuthContext'
import './ChessboardSection.css'

/*
(1.) Renders the live online game IN PLACE on the dashboard using the same drag-and-drop board as
     local play, so a multiplayer game is played here rather than on a separate screen. It is shown
     by `ChessboardSection` whenever `games.currentForUser` returns an active game, and receives that
     composite (game, moves, both players) as a prop.
(2.) Moves are made by dragging; `onPieceDrop` validates the move locally with chess.js, then submits
     it through `moves.make` with a Convex optimistic update on `games.currentForUser`, so the moving
     player's board advances instantly while the authoritative result reconciles, and the opponent's
     board updates from the same reactive query. A move that ends the game carries its result so the
     completion is recorded atomically with the move.
(3.) Resignation and draw agreement are driven through the `gameLifecycle` mutations rather than the
     board: a player resigns or offers a draw from the action bar, and the single `drawOfferedBy`
     seat on the game decides whether the panel shows the offer-pending state to the offerer or the
     accept/decline prompt to the opponent, so the handshake is read straight from game data.
(4.) The move list pairs half-moves into numbered rows in the chess.com layout, deriving each move's
     piece glyph and notation from SAN through the shared `gameConfig` helpers and labeling each with
     the time that half-move consumed (`timeTaken`), while a one-second ticker drives the live clocks
     by subtracting elapsed time since `turnStartedAt` from the side to move.

This component is the online-game surface embedded in the dashboard. Co-locating the optimistic update
with the move submission keeps the board responsive, reading the single `currentForUser` query means
the game appears and disappears on the dashboard purely from data, and routing endings through the
lifecycle mutations keeps every way a game can finish converging on the same authoritative completion.
*/

interface GameComposite {
  game: Doc<'games'>
  moves: Doc<'moves'>[]
  whitePlayer: Doc<'profiles'> | null
  blackPlayer: Doc<'profiles'> | null
}

interface MoveRow {
  number: number
  white: Doc<'moves'>
  black: Doc<'moves'> | null
}

const formatClock = (seconds: number): string => {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / SECONDS_PER_MINUTE)
  const remainder = safe % SECONDS_PER_MINUTE
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

// Per-move elapsed time for the move list: sub-minute moves read as seconds
// ("4s"), longer thinks switch to minute:second so a long think is unambiguous.
const formatMoveTime = (seconds: number): string => {
  if (seconds < SECONDS_PER_MINUTE) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE)
  const remainder = seconds % SECONDS_PER_MINUTE
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

const toMoveRows = (moves: Doc<'moves'>[]): MoveRow[] => {
  const rows: MoveRow[] = []
  for (let index = 0; index < moves.length; index += 2) {
    rows.push({
      number: index / 2 + 1,
      white: moves[index],
      black: moves[index + 1] ?? null,
    })
  }
  return rows
}

// Inspects a completed position to produce the result and the precise reason it
// ended, so the completion records, for example, a stalemate draw distinctly
// from a draw by repetition rather than collapsing every draw into one label.
const readGameEnd = (
  probe: Chess,
): { result: GameResult; endReason: GameEndReason } | null => {
  if (!probe.isGameOver()) {
    return null
  }
  if (probe.isCheckmate()) {
    return {
      result:
        probe.turn() === 'w' ? GameResult.BLACK_WINS : GameResult.WHITE_WINS,
      endReason: GameEndReason.CHECKMATE,
    }
  }
  if (probe.isStalemate()) {
    return { result: GameResult.DRAW, endReason: GameEndReason.STALEMATE }
  }
  if (probe.isThreefoldRepetition()) {
    return {
      result: GameResult.DRAW,
      endReason: GameEndReason.THREEFOLD_REPETITION,
    }
  }
  if (probe.isInsufficientMaterial()) {
    return {
      result: GameResult.DRAW,
      endReason: GameEndReason.INSUFFICIENT_MATERIAL,
    }
  }
  return { result: GameResult.DRAW, endReason: GameEndReason.FIFTY_MOVE_RULE }
}

// Human-readable outcome shown in the status pill, phrased from the viewer's
// perspective so the loser of a resignation reads "You resigned" while the
// opponent reads that they won by it.
const describeOutcome = (
  result: Doc<'games'>['result'],
  endReason: Doc<'games'>['endReason'],
  viewerWon: boolean,
): string => {
  if (result === GameResult.DRAW) {
    if (endReason === GameEndReason.DRAW_AGREEMENT) return 'Draw by agreement'
    if (endReason === GameEndReason.STALEMATE) return 'Draw by stalemate'
    if (endReason === GameEndReason.THREEFOLD_REPETITION)
      return 'Draw by repetition'
    if (endReason === GameEndReason.INSUFFICIENT_MATERIAL)
      return 'Draw, insufficient material'
    if (endReason === GameEndReason.FIFTY_MOVE_RULE)
      return 'Draw, fifty-move rule'
    return 'Game drawn'
  }
  if (endReason === GameEndReason.RESIGNATION) {
    return viewerWon ? 'Opponent resigned, you win' : 'You resigned'
  }
  if (endReason === GameEndReason.CHECKMATE) {
    return viewerWon ? 'Checkmate, you win' : 'Checkmate, you lost'
  }
  return viewerWon ? 'You won' : 'You lost'
}

const MoveCell = ({
  move,
  colorKey,
}: {
  move: Doc<'moves'>
  colorKey: 'w' | 'b'
}) => (
  <span className='move-cell'>
    <span className='move-san'>
      <span className='piece-symbol'>
        {sanToPieceGlyph(move.san, colorKey)}
      </span>
      {sanWithoutPieceLetter(move.san)}
    </span>
    <span className='move-time'>{formatMoveTime(move.timeTaken)}</span>
  </span>
)

const MultiplayerBoard = ({ data }: { data: GameComposite }) => {
  const { user } = useAuth()
  const { playForSan } = useChessSounds()
  const [now, setNow] = useState(() => Date.now())
  const [confirmingResign, setConfirmingResign] = useState(false)
  // Tracks how many half-moves have already sounded and which finished game has
  // already been announced, so a cue fires once per new move and the end-of-game
  // toast fires once rather than on every reactive update.
  const soundedMoveCountRef = useRef(data.moves.length)
  const announcedGameRef = useRef<string | null>(null)

  const makeMove = useMutation(api.moves.make).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.games.currentForUser, {})
      if (!current || current.game.status !== GameStatus.IN_PROGRESS) {
        return
      }
      const nextTurn =
        current.game.currentTurn === PieceColor.WHITE
          ? PieceColor.BLACK
          : PieceColor.WHITE
      const optimisticMove = {
        _id: `optimistic-${current.moves.length}` as Id<'moves'>,
        _creationTime: Date.now(),
        gameId: current.game._id,
        moveNumber: current.moves.length + 1,
        playerColor: current.game.currentTurn,
        san: args.san,
        fen: args.fen,
        timeTaken: 0,
      }
      localStore.setQuery(
        api.games.currentForUser,
        {},
        {
          ...current,
          game: {
            ...current.game,
            boardState: args.fen,
            currentTurn: nextTurn,
            status: args.result ? GameStatus.COMPLETED : current.game.status,
            result: args.result ?? current.game.result,
            endReason: args.endReason ?? current.game.endReason,
            drawOfferedBy: null,
          },
          moves: [...current.moves, optimisticMove],
        },
      )
    },
  )

  const resign = useMutation(api.gameLifecycle.resign)
  const offerDraw = useMutation(api.gameLifecycle.offerDraw)
  const respondDraw = useMutation(api.gameLifecycle.respondDraw)

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(ticker)
  }, [])

  const { game, moves, whitePlayer, blackPlayer } = data
  const myColor =
    game.whitePlayerId === user?.id ? PieceColor.WHITE : PieceColor.BLACK
  const myPieceColor = myColor === PieceColor.WHITE ? 'w' : 'b'
  const isMyTurn =
    game.currentTurn === myColor && game.status === GameStatus.IN_PROGRESS

  const onPieceDrop = (sourceSquare: string, targetSquare: string) => {
    if (!isMyTurn) {
      return false
    }
    const probe = new Chess(game.boardState)
    try {
      const move = probe.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })
      const ending = readGameEnd(probe)
      void makeMove({
        gameId: game._id,
        san: move.san,
        fen: probe.fen(),
        result: ending?.result ?? null,
        endReason: ending?.endReason ?? null,
      })
      return true
    } catch {
      return false
    }
  }

  // The clock freezes the instant the game completes: a finished game debits no
  // further time, so both displayed clocks hold at their stored remaining values
  // rather than continuing to count down past the end.
  const elapsed =
    game.status === GameStatus.COMPLETED
      ? 0
      : Math.floor((now - game.turnStartedAt) / 1000)
  const liveWhite =
    game.currentTurn === PieceColor.WHITE
      ? game.whiteTimeRemaining - elapsed
      : game.whiteTimeRemaining
  const liveBlack =
    game.currentTurn === PieceColor.BLACK
      ? game.blackTimeRemaining - elapsed
      : game.blackTimeRemaining
  const opponent = myColor === PieceColor.WHITE ? blackPlayer : whitePlayer
  const me = myColor === PieceColor.WHITE ? whitePlayer : blackPlayer
  const opponentClock = myColor === PieceColor.WHITE ? liveBlack : liveWhite
  const myClock = myColor === PieceColor.WHITE ? liveWhite : liveBlack
  const isCompleted = game.status === GameStatus.COMPLETED
  const drawOfferedByMe =
    game.drawOfferedBy !== null && game.drawOfferedBy === user?.id
  const drawOfferedToMe =
    game.drawOfferedBy !== null && game.drawOfferedBy !== user?.id
  const moveRows = toMoveRows(moves)
  const viewerWon = game.winnerId === user?.id

  // Sound every newly-arrived half-move, whether it was played here or by the
  // opponent, since both reach this board only as a longer `moves` array from the
  // reactive query; the SAN of the latest move selects the cue.
  useEffect(() => {
    if (moves.length > soundedMoveCountRef.current) {
      const latest = moves[moves.length - 1]
      if (latest !== undefined) {
        playForSan(latest.san)
      }
    }
    soundedMoveCountRef.current = moves.length
  }, [moves, playForSan])

  // Announce the game's end once. Resignation and an agreed draw are surfaced as a
  // toast because, unlike a checkmate visible on the board, the opponent would
  // otherwise have no clear signal that the game ended off the board.
  useEffect(() => {
    if (!isCompleted || announcedGameRef.current === game._id) {
      return
    }
    announcedGameRef.current = game._id
    if (game.endReason === GameEndReason.RESIGNATION && viewerWon) {
      toast.info('Your opponent resigned. You win!')
    } else if (game.endReason === GameEndReason.DRAW_AGREEMENT) {
      toast.info('Draw agreed.')
    }
  }, [isCompleted, game._id, game.endReason, viewerWon])

  const statusText = isCompleted
    ? describeOutcome(game.result, game.endReason, viewerWon)
    : isMyTurn
      ? 'Your move'
      : "Opponent's move"

  return (
    <div className='chessboard-section theater-mode-active'>
      <div className='theater-mode'>
        <div className='board-and-players-container'>
          <div className='board-sidebar-wrapper'>
            <div className='chessboard-container'>
              <Chessboard
                id='MultiplayerBoard'
                position={game.boardState}
                onPieceDrop={onPieceDrop}
                boardOrientation={
                  myColor === PieceColor.BLACK ? 'black' : 'white'
                }
                isDraggablePiece={({ piece }) =>
                  isMyTurn && piece[0] === myPieceColor
                }
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 8px 16px var(--shadow-soft)',
                }}
                customDarkSquareStyle={{
                  backgroundColor: 'var(--brand-navy-400)',
                }}
                customLightSquareStyle={{
                  backgroundColor: 'var(--brand-gray-200)',
                }}
              />
            </div>
            <div className='players-sidebar'>
              <div className='player-info opponent'>
                <div className='player-details'>
                  <div className='player-name'>
                    {opponent?.username ?? 'Opponent'}
                  </div>
                  <div className='player-rating'>
                    {opponent?.rating ?? DEFAULT_RATING}
                  </div>
                </div>
                <div className='player-time'>{formatClock(opponentClock)}</div>
              </div>
              <div className='player-info user'>
                <div className='player-details'>
                  <div className='player-name'>{me?.username ?? 'You'}</div>
                  <div className='player-rating'>
                    {me?.rating ?? DEFAULT_RATING}
                  </div>
                </div>
                <div className='player-time'>{formatClock(myClock)}</div>
              </div>
            </div>
          </div>
          <div className='game-analysis-container'>
            <div className='analysis-panel'>
              <div className='analysis-header'>
                <span className='analysis-title'>Moves</span>
                <span
                  className={`game-status-pill ${isCompleted ? 'completed' : ''}`}
                >
                  {statusText}
                </span>
              </div>

              <div className='moves-list'>
                {moveRows.length === 0 ? (
                  <div className='moves-empty'>
                    No moves yet. Drag a piece to begin.
                  </div>
                ) : (
                  moveRows.map((row) => (
                    <div key={row.number} className='move-row'>
                      <span className='move-number'>{row.number}.</span>
                      <MoveCell move={row.white} colorKey='w' />
                      {row.black ? (
                        <MoveCell move={row.black} colorKey='b' />
                      ) : (
                        <span className='move-cell empty' />
                      )}
                    </div>
                  ))
                )}
              </div>

              {!isCompleted && (
                <div className='game-action-bar'>
                  {drawOfferedToMe ? (
                    <div className='action-prompt'>
                      <span className='action-prompt-text'>
                        Opponent offers a draw
                      </span>
                      <div className='action-buttons'>
                        <button
                          className='action-btn accept'
                          onClick={() =>
                            void respondDraw({ gameId: game._id, accept: true })
                          }
                        >
                          Accept
                        </button>
                        <button
                          className='action-btn'
                          onClick={() =>
                            void respondDraw({
                              gameId: game._id,
                              accept: false,
                            })
                          }
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ) : confirmingResign ? (
                    <div className='action-prompt'>
                      <span className='action-prompt-text'>
                        Resign this game?
                      </span>
                      <div className='action-buttons'>
                        <button
                          className='action-btn resign'
                          onClick={() => {
                            void resign({ gameId: game._id })
                            setConfirmingResign(false)
                          }}
                        >
                          Yes, resign
                        </button>
                        <button
                          className='action-btn'
                          onClick={() => setConfirmingResign(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className='action-buttons'>
                      <button
                        className='action-btn'
                        disabled={drawOfferedByMe}
                        onClick={() => void offerDraw({ gameId: game._id })}
                      >
                        {drawOfferedByMe ? 'Draw offered' : 'Offer draw'}
                      </button>
                      <button
                        className='action-btn resign'
                        onClick={() => setConfirmingResign(true)}
                      >
                        Resign
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MultiplayerBoard
