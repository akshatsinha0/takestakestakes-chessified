import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { Chess, type Square } from 'chess.js'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { PieceColor, GameStatus } from '../../convex/lib/domain'
import { useAuth } from '../context/AuthContext'
import './Game.css'

/*
(1.) Renders one live game from the reactive `games.get` query and submits moves through the
     `moves.make` mutation. Convex reactivity replaces the former realtime subscription: when either
     player moves, the query re-delivers the new board and the component re-renders, so both clients
     stay in sync without any channel wiring.
(2.) The board position is derived synchronously from the query's stored FEN on every render, so the
     displayed position is always exactly the authoritative server state; move legality is checked
     locally with chess.js purely to drive the click-to-move interaction before submitting, while the
     server enforces turn order and clocks.
(3.) A one-second ticker derives the on-screen clock for the player to move by subtracting elapsed
     time since `turnStartedAt` from their stored remaining seconds, giving a live countdown without
     persisting every tick, since the authoritative debit happens server-side on the next move.
(4.) Interaction is gated to the local player's turn and color, and a missing or not-found game
     resolves to explicit loading and empty states rather than rendering against undefined data.

This page is the reactive board view. Deriving the position from server state each render and routing
moves through a single transactional mutation gives consistent multiplayer sync by construction, and
keeping the clock display local while the debit stays server-side avoids write amplification without
sacrificing an authoritative timer.
*/

const PIECE_SYMBOLS: Record<string, string> = {
  wp: '♙',
  wr: '♖',
  wn: '♘',
  wb: '♗',
  wq: '♕',
  wk: '♔',
  bp: '♟',
  br: '♜',
  bn: '♞',
  bb: '♝',
  bq: '♛',
  bk: '♚',
}

const formatClock = (seconds: number): string => {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  return `${minutes}:${(safe % 60).toString().padStart(2, '0')}`
}

const Game = () => {
  const { gameId } = useParams<{ gameId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const data = useQuery(
    api.games.get,
    gameId ? { gameId: gameId as Id<'games'> } : 'skip',
  )
  const submitMove = useMutation(api.moves.make)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<string[]>([])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(ticker)
  }, [])

  if (data === undefined) {
    return <div className='game-loading'>Loading game...</div>
  }
  if (data === null) {
    return <div className='game-loading'>Game not found.</div>
  }

  const { game, moves, whitePlayer, blackPlayer } = data
  const chess = new Chess(game.boardState)
  const myColor =
    game.whitePlayerId === user?.id ? PieceColor.White : PieceColor.Black
  const isFlipped = game.blackPlayerId === user?.id
  const isMyTurn =
    game.currentTurn === myColor && game.status === GameStatus.InProgress

  const clearSelection = () => {
    setSelectedSquare(null)
    setPossibleMoves([])
  }

  const handleSquareClick = (square: string) => {
    if (!isMyTurn) {
      return
    }
    if (selectedSquare && possibleMoves.includes(square)) {
      try {
        const move = chess.move({
          from: selectedSquare,
          to: square,
          promotion: 'q',
        })
        void submitMove({ gameId: game._id, san: move.san, fen: chess.fen() })
      } catch {
        // Illegal attempts are ignored; the board stays on authoritative server state.
      }
      clearSelection()
      return
    }
    const piece = chess.get(square as Square)
    const myPieceColor = myColor === PieceColor.White ? 'w' : 'b'
    if (piece && piece.color === myPieceColor) {
      setSelectedSquare(square)
      setPossibleMoves(
        chess
          .moves({ square: square as Square, verbose: true })
          .map((move) => move.to),
      )
    } else {
      clearSelection()
    }
  }

  const board = chess.board()
  const displayBoard = isFlipped ? [...board].toReversed() : board
  const elapsed = Math.floor((now - game.turnStartedAt) / 1000)
  const liveWhite =
    game.currentTurn === PieceColor.White
      ? game.whiteTimeRemaining - elapsed
      : game.whiteTimeRemaining
  const liveBlack =
    game.currentTurn === PieceColor.Black
      ? game.blackTimeRemaining - elapsed
      : game.blackTimeRemaining

  return (
    <div className='game-page'>
      <div className='game-header'>
        <button className='back-btn' onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
        <div className='game-info'>
          <span className='time-control'>{game.timeControl}</span>
          <span className='game-status'>{game.status.replace('_', ' ')}</span>
        </div>
      </div>
      <div className='game-content'>
        <div className='game-sidebar'>
          <div className='player-info black'>
            <div className='player-name'>
              {blackPlayer?.username ?? 'Waiting...'}
            </div>
            <div className='player-rating'>({blackPlayer?.rating ?? 1200})</div>
            <div className='player-time'>{formatClock(liveBlack)}</div>
          </div>
          <div className='move-history'>
            <h4>Moves</h4>
            <div className='moves-list'>
              {moves.map((move, index) => (
                <span key={move._id} className='move-notation'>
                  {Math.floor(index / 2) + 1}
                  {index % 2 === 0 ? '.' : ''} {move.san}
                </span>
              ))}
            </div>
          </div>
          <div className='player-info white'>
            <div className='player-name'>
              {whitePlayer?.username ?? 'Waiting...'}
            </div>
            <div className='player-rating'>({whitePlayer?.rating ?? 1200})</div>
            <div className='player-time'>{formatClock(liveWhite)}</div>
          </div>
        </div>
        <div className='board-container'>
          <div className='game-board'>
            {displayBoard.map((row, rankIndex) => {
              const actualRank = isFlipped ? rankIndex : 7 - rankIndex
              const displayRow = isFlipped ? [...row].toReversed() : row
              return displayRow.map((square, fileIndex) => {
                const actualFile = isFlipped ? 7 - fileIndex : fileIndex
                const notation =
                  String.fromCharCode(97 + actualFile) + (actualRank + 1)
                const isLight = (actualRank + actualFile) % 2 === 0
                const piece = square ? `${square.color}${square.type}` : null
                return (
                  <div
                    key={notation}
                    className={`game-square ${isLight ? 'light' : 'dark'} ${selectedSquare === notation ? 'selected' : ''} ${possibleMoves.includes(notation) ? 'possible-move' : ''}`}
                    onClick={() => handleSquareClick(notation)}
                  >
                    {piece && (
                      <div className={`game-piece ${piece}`}>
                        {PIECE_SYMBOLS[piece]}
                      </div>
                    )}
                    {possibleMoves.includes(notation) && (
                      <div className='move-indicator' />
                    )}
                  </div>
                )
              })
            })}
          </div>
          {isMyTurn && <div className='turn-indicator'>Your Turn</div>}
        </div>
      </div>
    </div>
  )
}

export default Game
