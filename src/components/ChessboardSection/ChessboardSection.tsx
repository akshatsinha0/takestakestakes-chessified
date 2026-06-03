import { useState, useEffect, useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import ChessboardControls from './ChessboardControls'
import useChessSounds from '../../hooks/useChessSounds'
import './ChessboardSection.css'

/*
(1.) Renders the local practice board for the dashboard's "play yourself" and "play a bot" modes.
     Authoritative online games are handled by the reactive `/game/:gameId` page, so this component
     deliberately holds no server state and no Supabase coupling; it is a self-contained chess.js
     surface for offline play and analysis.
(2.) Moves are applied to a chess.js instance held in state, with sound cues for moves, captures,
     castles, and checks, and a running move list; game-over conditions are detected locally to label
     the result without any persistence.
(3.) Bot replies are generated from the legal move set with a strength bias derived from the selected
     bot's rating (random for beginners, capture/check/center-preferring as rating rises), scheduled
     shortly after the human move so the board visibly alternates.
(4.) The board orientation, theater, and focus toggles are delegated to `ChessboardControls`, and the
     submit/exit actions simply reset local state and return to the dashboard, since practice games are
     intentionally not recorded.

This component is the offline counterpart to the online game page. Removing its former multiplayer and
database logic eliminates a redundant, parallel game engine and a source of state divergence, leaving a
focused local board whose only inputs are the practice-mode props passed by the dashboard.
*/

interface ChessboardSectionProps {
  playYourselfMode?: boolean
  onExitPlayYourself?: () => void
  playBotMode?: boolean
  selectedBot?: { name?: string; rating?: number } | null
  botTimeControl?: { minutes?: number } | null
  onExitBotMode?: () => void
}

const DEFAULT_RATING = 1200
const BOT_MOVE_DELAY_MS = 500
const CENTER_SQUARES = ['e4', 'e5', 'd4', 'd5', 'c4', 'c5', 'f4', 'f5']

const pickBotMove = (game: Chess, rating: number) => {
  const moves = game.moves({ verbose: true })
  if (moves.length === 0) {
    return null
  }
  const captures = moves.filter((move) => move.captured)
  const checks = moves.filter((move) => move.san.includes('+'))
  const central = moves.filter((move) => CENTER_SQUARES.includes(move.to))
  const preferred =
    rating < 1000
      ? moves
      : rating < 1300
        ? [...captures, ...moves]
        : rating < 1600
          ? [...captures, ...checks, ...moves]
          : [...captures, ...checks, ...central, ...moves]
  return preferred[Math.floor(Math.random() * Math.min(preferred.length, moves.length))] ?? moves[0]
}

const ChessboardSection = ({
  playYourselfMode = false,
  onExitPlayYourself,
  playBotMode = false,
  selectedBot,
  botTimeControl,
  onExitBotMode,
}: ChessboardSectionProps) => {
  const { profile } = useAuth()
  const [game, setGame] = useState(() => new Chess())
  const [moves, setMoves] = useState<string[]>([])
  const [isBoardFlipped, setIsBoardFlipped] = useState(false)
  const [isTheaterMode, setIsTheaterMode] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [gameStatus, setGameStatus] = useState('')
  const movesContainerRef = useRef<HTMLDivElement>(null)
  const { playMove, playCapture, playCastle, playCheck } = useChessSounds()

  useEffect(() => {
    if (playYourselfMode || playBotMode) {
      setIsTheaterMode(true)
      setGame(new Chess())
      setMoves([])
      setGameStatus('')
    }
  }, [playYourselfMode, playBotMode, botTimeControl])

  useEffect(() => {
    if (movesContainerRef.current) {
      movesContainerRef.current.scrollTop =
        movesContainerRef.current.scrollHeight
    }
  }, [moves.length])

  const applyMove = (move: { from: string; to: string; promotion: 'q' }) => {
    const next = new Chess(game.fen())
    try {
      const result = next.move(move)
      if (result.captured) {
        playCapture()
      } else if (result.san.includes('O-O')) {
        playCastle()
      } else {
        playMove()
      }
      if (next.isCheck()) {
        playCheck()
      }
      setMoves((previous) => [...previous, result.san])
      if (next.isGameOver()) {
        setGameStatus('GAME OVER')
      }
      setGame(next)
      return result
    } catch {
      return null
    }
  }

  const handleDrop = (sourceSquare: string, targetSquare: string) => {
    const result = applyMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    })
    if (!result) {
      return false
    }
    if (playBotMode && !game.isGameOver()) {
      const rating = selectedBot?.rating ?? DEFAULT_RATING
      setTimeout(() => {
        setGame((current) => {
          if (current.isGameOver()) {
            return current
          }
          const botMove = pickBotMove(current, rating)
          if (!botMove) {
            return current
          }
          const next = new Chess(current.fen())
          const played = next.move({
            from: botMove.from,
            to: botMove.to,
            promotion: 'q',
          })
          setMoves((previous) => [...previous, played.san])
          if (next.isGameOver()) {
            setGameStatus('GAME OVER')
          }
          return next
        })
      }, BOT_MOVE_DELAY_MS)
    }
    return true
  }

  const handleExit = () => {
    setGame(new Chess())
    setMoves([])
    setGameStatus('')
    setIsTheaterMode(false)
    if (playYourselfMode && onExitPlayYourself) {
      onExitPlayYourself()
    }
    if (playBotMode && onExitBotMode) {
      onExitBotMode()
    }
  }

  const opponentName = playBotMode ? selectedBot?.name ?? 'Bot' : 'You'
  const opponentRating = playBotMode
    ? selectedBot?.rating ?? DEFAULT_RATING
    : profile?.rating ?? DEFAULT_RATING

  return (
    <div
      className={`chessboard-section ${isTheaterMode ? 'theater-mode-active' : ''} ${isFocusMode ? 'focus-mode-active' : ''}`}
    >
      <div className="theater-mode">
        <div className="board-and-players-container">
          <div className="board-sidebar-wrapper">
            <div className="chessboard-container">
              <ChessboardControls
                isTheaterMode={isTheaterMode}
                isFocusMode={isFocusMode}
                isBoardFlipped={isBoardFlipped}
                onToggleTheaterMode={() => setIsTheaterMode((on) => !on)}
                onToggleFocusMode={() => setIsFocusMode((on) => !on)}
                onFlipBoard={() => setIsBoardFlipped((on) => !on)}
                onOpenSettings={() => undefined}
              />
              <Chessboard
                id="PlayChess"
                position={game.fen()}
                onPieceDrop={handleDrop}
                boardOrientation={isBoardFlipped ? 'black' : 'white'}
                customBoardStyle={{
                  borderRadius: '8px',
                  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                }}
                customDarkSquareStyle={{ backgroundColor: '#7b8a9b' }}
                customLightSquareStyle={{ backgroundColor: '#e2e8f0' }}
              />
            </div>
            <div className="players-sidebar">
              <div className="player-info opponent">
                <div className="player-details">
                  <div className="player-name">{opponentName}</div>
                  <div className="player-rating">{opponentRating}</div>
                </div>
              </div>
              <div className="player-info user">
                <div className="player-details">
                  <div className="player-name">{profile?.username ?? 'Guest'}</div>
                  <div className="player-rating">{profile?.rating ?? DEFAULT_RATING}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="game-analysis-container">
            <div className="analysis-panel">
              <div className="moves-container" ref={movesContainerRef}>
                {moves.map((san, index) => (
                  <span key={`${index}-${san}`} className="move-notation">
                    {index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ''}
                    {san}{' '}
                  </span>
                ))}
              </div>
              {gameStatus && <div className="game-status">{gameStatus}</div>}
            </div>
          </div>
        </div>
        {(playYourselfMode || playBotMode) && (
          <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
            <button className="review-btn" onClick={handleExit}>
              {playBotMode ? 'Exit Bot Game' : 'Exit'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChessboardSection
