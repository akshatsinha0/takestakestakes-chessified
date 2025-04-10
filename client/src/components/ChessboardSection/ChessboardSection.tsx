import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import './ChessboardSection.css';
import ChessboardControls from './ChessboardControls';
import useChessSounds from '../../hooks/useChessSounds';

const ChessboardSection: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isBoardFlipped, setIsBoardFlipped] = useState(false);
  const { playMove, playCapture, playCastle, playCheck } = useChessSounds();
  
  // Function to handle making a move
  const makeAMove = (move: any) => {
    const gameCopy = new Chess(game.fen());
    
    try {
      const result = gameCopy.move(move);
      
      // Play sound based on move type
      if (result.captured) {
        playCapture();
      } else if (result.san.includes('O-O')) { // Castling moves
        playCastle();
      } else {
        playMove();
      }

      // Check for check after move
      if (gameCopy.isCheck()) {
        playCheck();
      }

      setGame(gameCopy);
      return result;
    } catch (error) {
      return null;
    }
  };

  // Function to handle piece drop
  const onDrop = (sourceSquare: string, targetSquare: string) => {
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q' // Always promote to queen for simplicity
    });

    // If move is invalid, return false to revert the piece
    if (move === null) return false;
    return true;
  };
  
  // Control handlers
  const handleToggleTheaterMode = () => setIsTheaterMode(!isTheaterMode);
  const handleToggleFocusMode = () => setIsFocusMode(!isFocusMode);
  const handleFlipBoard = () => setIsBoardFlipped(!isBoardFlipped);
  const handleOpenSettings = () => {
    // Implement settings modal or dropdown
    console.log('Settings opened');
  };

  return (
    <div className={`chessboard-section ${isTheaterMode ? 'theater-mode-active' : ''} ${isFocusMode ? 'focus-mode-active' : ''}`}>
      <div className="theater-mode">
        <div className="board-and-players-container">
          <div className="chessboard-container">
            <ChessboardControls 
              isTheaterMode={isTheaterMode}
              isFocusMode={isFocusMode}
              isBoardFlipped={isBoardFlipped}
              onToggleTheaterMode={handleToggleTheaterMode}
              onToggleFocusMode={handleToggleFocusMode}
              onFlipBoard={handleFlipBoard}
              onOpenSettings={handleOpenSettings}
            />
            <Chessboard 
              id="PlayChess"
              position={game.fen()}
              onPieceDrop={onDrop}
              boardOrientation={isBoardFlipped ? 'black' : 'white'}
              customBoardStyle={{
                borderRadius: '8px',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)'
              }}
              customDarkSquareStyle={{ backgroundColor: '#7b8a9b' }}
              customLightSquareStyle={{ backgroundColor: '#e2e8f0' }}
            />
          </div>
          
          <div className="players-sidebar">
            <div className="player-info opponent">
              <div className="player-avatar">
                <img src="/path/to/default-avatar.png" alt="Opponent" />
              </div>
              <div className="player-details">
                <div className="player-name">Opponent</div>
                <div className="player-rating">1500</div>
              </div>
            </div>
            
            <div className="timer-container">
              <div className="opponent-timer">10:00</div>
              <div className="vs-indicator">vs</div>
              <div className="player-timer">10:00</div>
            </div>
            
            <div className="player-info user">
              <div className="player-avatar">
                <img src="/path/to/user-avatar.png" alt="You" />
              </div>
              <div className="player-details">
                <div className="player-name">CosmosCorona10</div>
                <div className="player-rating">1850</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessboardSection;
