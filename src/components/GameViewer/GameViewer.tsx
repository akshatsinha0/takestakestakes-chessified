import { useState, useEffect } from 'react'
import { useQuery } from 'convex/react'
import { Chess } from 'chess.js'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import './GameViewer.css'

/*
(1.) Replays a completed game move by move. It loads the game's ordered moves from the reactive
     `moves.listByGame` query rather than expecting them embedded in the passed game, so the
     viewer composes cleanly with the history list which carries only the game record.
(2.) Navigation rebuilds the position by resetting a chess.js instance and replaying SAN up to the
     selected index, which keeps the displayed board exactly consistent with the recorded move
     sequence at any point and needs no stored intermediate FENs.
(3.) A `position` state string is updated alongside the move index purely to trigger re-render
     after the in-place chess instance mutates, keeping the board and the active move highlight in
     sync as the user steps through the game.

This component is a self-contained game review. Sourcing moves from a query keyed by game id means
the only input it needs is the game document, and replaying from SAN keeps the reconstruction
authoritative against the stored notation without depending on any per-move board snapshots.
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

const GameViewer = ({
  game,
  onClose,
}: {
  game: Doc<'games'>
  onClose: () => void
}) => {
  const moves = useQuery(api.moves.listByGame, { gameId: game._id }) ?? []
  const [chess] = useState(() => new Chess())
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [position, setPosition] = useState(() => chess.fen())

  useEffect(() => {
    chess.reset()
    setCurrentMoveIndex(-1)
    setPosition(chess.fen())
  }, [game._id, chess])

  const goToMove = (moveIndex: number) => {
    chess.reset()
    moves.slice(0, moveIndex + 1).forEach((move) => chess.move(move.san))
    setCurrentMoveIndex(moveIndex)
    setPosition(chess.fen())
  }

  void position

  const board = chess.board()

  return (
    <div className='game-viewer-overlay' onClick={onClose}>
      <div
        className='game-viewer-modal'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='game-viewer-header'>
          <h3>Game Review</h3>
          <button className='close-btn' onClick={onClose}>
            ×
          </button>
        </div>
        <div className='game-viewer-content'>
          <div className='board-section'>
            <div className='chess-board'>
              {board.map((row, rankIndex) =>
                row.map((square, fileIndex) => {
                  const isLight = (rankIndex + fileIndex) % 2 === 0
                  const piece = square ? `${square.color}${square.type}` : null
                  return (
                    <div
                      key={`${rankIndex}-${fileIndex}`}
                      className={`square ${isLight ? 'light' : 'dark'}`}
                    >
                      {piece && (
                        <div className={`piece ${piece}`}>
                          {PIECE_SYMBOLS[piece]}
                        </div>
                      )}
                    </div>
                  )
                }),
              )}
            </div>
            <div className='game-controls'>
              <button
                onClick={() => goToMove(-1)}
                disabled={currentMoveIndex === -1}
              >
                ⏮
              </button>
              <button
                onClick={() => goToMove(currentMoveIndex - 1)}
                disabled={currentMoveIndex === -1}
              >
                ◀
              </button>
              <button
                onClick={() => goToMove(currentMoveIndex + 1)}
                disabled={currentMoveIndex >= moves.length - 1}
              >
                ▶
              </button>
              <button
                onClick={() => goToMove(moves.length - 1)}
                disabled={currentMoveIndex >= moves.length - 1}
              >
                ⏭
              </button>
            </div>
          </div>
          <div className='moves-section'>
            <h4>Moves</h4>
            <div className='moves-list'>
              {moves.map((move, index) => (
                <div
                  key={move._id}
                  className={`move-item ${index === currentMoveIndex ? 'active' : ''}`}
                  onClick={() => goToMove(index)}
                >
                  <span className='move-number'>
                    {Math.floor(index / 2) + 1}
                    {index % 2 === 0 ? '.' : ''}
                  </span>
                  <span className='move-san'>{move.san}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameViewer
