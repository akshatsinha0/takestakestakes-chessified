import { useEffect, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { PieceColor, GameStatus, GameResult } from '../../../convex/lib/domain'
import { DEFAULT_RATING } from '../../../convex/lib/constants'
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
(3.) Dragging is gated to the local player's own pieces on their turn, and the board is oriented to
     the player's color, so each side sees the position from their perspective and cannot move out of
     turn or move the opponent's pieces.
(4.) A one-second ticker drives the on-screen clocks by subtracting elapsed time since `turnStartedAt`
     from the active side's stored seconds; the authoritative debit happens server-side on the next
     move, so the display stays live without per-tick writes.

This component is the online-game surface embedded in the dashboard. Co-locating the optimistic update
with the move submission keeps the board responsive, and reading the single `currentForUser` query
means the game appears and disappears on the dashboard purely from data, with no navigation.
*/

interface GameComposite {
  game: Doc<'games'>
  moves: Doc<'moves'>[]
  whitePlayer: Doc<'profiles'> | null
  blackPlayer: Doc<'profiles'> | null
}

const formatClock = (seconds: number): string => {
  const safe = Math.max(0, seconds)
  return `${Math.floor(safe / 60)}:${(safe % 60).toString().padStart(2, '0')}`
}

const MultiplayerBoard = ({ data }: { data: GameComposite }) => {
  const { user } = useAuth()
  const [now, setNow] = useState(() => Date.now())

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
          },
          moves: [...current.moves, optimisticMove],
        },
      )
    },
  )

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
      const result = probe.isGameOver()
        ? probe.isCheckmate()
          ? probe.turn() === 'w'
            ? GameResult.BLACK_WINS
            : GameResult.WHITE_WINS
          : GameResult.DRAW
        : null
      void makeMove({
        gameId: game._id,
        san: move.san,
        fen: probe.fen(),
        result,
      })
      return true
    } catch {
      return false
    }
  }

  const elapsed = Math.floor((now - game.turnStartedAt) / 1000)
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
                <span className='analysis-title'>
                  {isCompleted
                    ? game.result === GameResult.DRAW
                      ? 'Game drawn'
                      : game.winnerId === user?.id
                        ? 'You won!'
                        : 'You lost'
                    : isMyTurn
                      ? 'Your move'
                      : "Opponent's move"}
                </span>
              </div>
              <div className='moves-container'>
                {moves.length === 0 ? (
                  <div className='moves-empty'>No moves yet.</div>
                ) : (
                  moves.map((move, index) => (
                    <span key={move._id} className='move-notation'>
                      {index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ''}
                      {move.san}{' '}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MultiplayerBoard
