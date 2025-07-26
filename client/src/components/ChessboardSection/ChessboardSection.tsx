import { useAuth } from '../../context/AuthContext';
import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import './ChessboardSection.css';
import ChessboardControls from './ChessboardControls';
import useChessSounds from '../../hooks/useChessSounds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRocket, faTimes, faPlus, faChessBoard, 
  faUsers, faCog, faChevronLeft, faChevronRight, 
  faStepBackward, faStepForward, faUndo, faRedo,
  faThumbsUp, faThumbsDown, faTrophy, faInfoCircle,
  faPlus as faAdd, faHistory
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../../lib/supabase';

interface ChessMove {
  san: string;
  time: number;
  piece: string;
  from: string;
  to: string;
  captured?: string;
  color: 'w' | 'b';
}

interface ChessboardSectionProps {
  playYourselfMode?: boolean;
  onExitPlayYourself?: () => void;
}

const ChessboardSection: React.FC<ChessboardSectionProps> = ({ playYourselfMode = false, onExitPlayYourself }) => {
  const { user } = useAuth();
  const [game, setGame] = useState(new Chess());
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isBoardFlipped, setIsBoardFlipped] = useState(false);
  const { playMove, playCapture, playCastle, playCheck } = useChessSounds();

  const [moves, setMoves] = useState<ChessMove[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [gameStatus, setGameStatus] = useState<string>('');
  const [opening, setOpening] = useState<string>("Opening");
  const [gameResult, setGameResult] = useState<{
    winner: string | null;
    method: string;
    time: string;
  }>({
    winner: null,
    method: '',
    time: ''
  });

  const moveStartTime = useRef(performance.now());
  const movesContainerRef = useRef<HTMLDivElement>(null);

  const [showEvaluation, setShowEvaluation] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const [showExplorer, setShowExplorer] = useState(false);
  const makeAMove = (move: any) => {
    const gameCopy = new Chess(game.fen());
    
    try {
      const currentTime = performance.now();
      const timeTaken = (currentTime - moveStartTime.current) / 1000;
      moveStartTime.current = currentTime;
      
      const result = gameCopy.move(move);
      
      if (result.captured) {
        playCapture();
      } else if (result.san.includes('O-O')) {
        playCastle();
      } else {
        playMove();
      }

      if (gameCopy.isCheck()) {
        playCheck();
      }

      const newMove: ChessMove = {
        san: result.san,
        time: Math.round(timeTaken * 10) / 10,
        piece: result.piece,
        from: result.from,
        to: result.to,
        captured: result.captured,
        color: result.color
      };
      
      setMoves(prevMoves => [...prevMoves, newMove]);
      setCurrentMoveIndex(prevMoves => prevMoves + 1);

      if (gameCopy.isGameOver()) {
        let winner = null;
        let method = '';
        
        if (gameCopy.isCheckmate()) {
          winner = result.color === 'w' ? 'white' : 'black';
          method = 'checkmate';
        } else if (gameCopy.isDraw()) {
          method = 'draw';
        } else if (gameCopy.isStalemate()) {
          method = 'stalemate';
        } else if (gameCopy.isThreefoldRepetition()) {
          method = 'repetition';
        } else if (gameCopy.isInsufficientMaterial()) {
          method = 'insufficient material';
        }
        
        setGameResult({
          winner: winner,
          method: method,
          time: '1 min Rated'
        });
        
        setGameStatus('GAME OVER');
      }

      setGame(gameCopy);
      return result;
    } catch (error) {
      return null;
    }
  };

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q'
    });

    if (move === null) return false;
    return true;
  };
  
  useEffect(() => {
    if (movesContainerRef.current && moves.length > 0) {
      movesContainerRef.current.scrollTop = movesContainerRef.current.scrollHeight;
    }
  }, [moves.length]);

  // Force theater mode if playYourselfMode is true
  useEffect(() => {
    if (playYourselfMode) setIsTheaterMode(true);
  }, [playYourselfMode]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Handler for submitting the game in Play Yourself mode
  const handleSubmitPlayYourselfGame = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      let result = 'draw';
      if (game.isCheckmate()) {
        result = game.turn() === 'w' ? 'black_wins' : 'white_wins';
      } else if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
        result = 'draw';
      }
      const { data: gameData, error: gameError } = await supabase.from('games').insert([
        {
          created_by: user.id,
          opponent_id: user.id,
          status: 'game_over',
          result,
          created_at: new Date().toISOString()
        }
      ]).select().single();
      if (gameError) {
        setSubmitError(gameError.message || 'Game insert error');
        setIsSubmitting(false);
        return;
      }
      for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        const { error: moveError } = await supabase.from('moves').insert([
          {
            game_id: gameData.id,
            move_number: i + 1,
            san: move.san,
            time_taken: move.time,
            created_at: new Date().toISOString()
          }
        ]);
        if (moveError) {
          setSubmitError(moveError.message || 'Move insert error');
          setIsSubmitting(false);
          return;
        }
      }
      if (onExitPlayYourself) onExitPlayYourself();
    } catch (err) {
      setSubmitError(err?.message || 'Failed to save game. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTheaterMode = () => setIsTheaterMode(!isTheaterMode);
  const handleToggleFocusMode = () => setIsFocusMode(!isFocusMode);
  const handleFlipBoard = () => setIsBoardFlipped(!isBoardFlipped);
  const handleOpenSettings = () => {
    console.log('Settings opened');
  };
  
  const renderMoveHistory = () => {
    const moveRows = [];
    for (let i = 0; i < moves.length; i += 2) {
      const whiteMove = moves[i];
      const blackMove = i + 1 < moves.length ? moves[i + 1] : null;
      const moveNumber = Math.floor(i / 2) + 1;
      
      moveRows.push(
        <div key={moveNumber} className="move-row">
          <div className="move-number">{moveNumber}.</div>
          <div className="move white">
            <div className="piece-symbol">{getPieceSymbol(whiteMove.piece, 'w')}</div>
            <div className="move-san">{whiteMove.san}</div>
            <div className="move-time">{whiteMove.time.toFixed(1)}s</div>
          </div>
          {blackMove && (
            <div className="move black">
              <div className="piece-symbol">{getPieceSymbol(blackMove.piece, 'b')}</div>
              <div className="move-san">{blackMove.san}</div>
              <div className="move-time">{blackMove.time.toFixed(1)}s</div>
            </div>
          )}
        </div>
      );
    }
    
    return moveRows;
  };
  
  const getPieceSymbol = (piece: string, color: 'w' | 'b') => {
    const pieceMap: Record<string, string> = {
      'p': color === 'w' ? '♙' : '♟',
      'n': color === 'w' ? '♘' : '♞',
      'b': color === 'w' ? '♗' : '♝',
      'r': color === 'w' ? '♖' : '♜',
      'q': color === 'w' ? '♕' : '♛',
      'k': color === 'w' ? '♔' : '♚'
    };
    
    return pieceMap[piece] || '';
  };
  
  return (
    <div className={`chessboard-section ${isTheaterMode ? 'theater-mode-active' : ''} ${isFocusMode ? 'focus-mode-active' : ''}`}>
      <div className="theater-mode">
        <div className="board-and-players-container">
          <div className="board-sidebar-wrapper">
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
                  <div className="player-name">{user?.username || 'Guest'}</div>
                  <div className="player-rating">{user?.rating}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="game-analysis-container">
            <div className="analysis-panel">
              <div className="analysis-header">
                <div className="analysis-tabs">
                  <div className="tab active">
                    <FontAwesomeIcon icon={faRocket} />
                    <span>Analysis</span>
                  </div>
                  <div className="tab">
                    <FontAwesomeIcon icon={faPlus} />
                    <span>New Game</span>
                  </div>
                  <div className="tab">
                    <FontAwesomeIcon icon={faChessBoard} />
                    <span>Games</span>
                  </div>
                  <div className="tab">
                    <FontAwesomeIcon icon={faUsers} />
                    <span>Players</span>
                  </div>
                </div>
                
                <div className="analysis-options">
                  <div className="option">
                    <span>Evaluation</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showEvaluation}
                        onChange={() => setShowEvaluation(!showEvaluation)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div className="option">
                    <span>Lines</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showLines}
                        onChange={() => setShowLines(!showLines)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div className="option">
                    <span>Explorer</span>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showExplorer}
                        onChange={() => setShowExplorer(!showExplorer)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  
                  <div className="settings-icon">
                    <FontAwesomeIcon icon={faCog} />
                  </div>
                </div>
              </div>
              
              <div className="upgrade-banner">
                <span className="diamond-icon">♦</span>
                <span className="upgrade-text">Upgrade to get computer engine moves</span>
              </div>
              
              <div className="opening-info">
                <span className="opening-name">{opening}</span>
                <span className="info-icon"><FontAwesomeIcon icon={faInfoCircle} /></span>
              </div>
              
              <div className="moves-container" ref={movesContainerRef}>
                {renderMoveHistory()}
              </div>
              
              <div className="game-review-button">
                <button className="review-btn">
                  <FontAwesomeIcon icon={faTrophy} />
                  <span>Game Review</span>
                </button>
              </div>
              
              <div className="move-controls">
                <div className="move-buttons">
                  <button className="move-btn"><FontAwesomeIcon icon={faAdd} /></button>
                  <button className="move-btn"><FontAwesomeIcon icon={faHistory} /></button>
                </div>
                
                <div className="navigation-controls">
                  <button className="nav-btn"><FontAwesomeIcon icon={faStepBackward} /></button>
                  <button className="nav-btn"><FontAwesomeIcon icon={faChevronLeft} /></button>
                  <button className="nav-btn"><FontAwesomeIcon icon={faChevronRight} /></button>
                  <button className="nav-btn"><FontAwesomeIcon icon={faStepForward} /></button>
                  <button className="nav-btn"><FontAwesomeIcon icon={faRedo} /></button>
                  <button className="nav-btn"><FontAwesomeIcon icon={faUndo} /></button>
                </div>
              </div>
              
              {gameStatus && (
                <div className="game-status">
                  <div className="game-result">
                    <div className="status-header">{gameStatus}</div>
                    <div className="result-details">
                      {user?.username} ({user?.rating}) won by resignation ({gameResult.time})
                    </div>
                    <div className="rating-change">
                    {gameResult.winner === 'user' && `New rating: ${user?.rating}`}
                    </div>
                  </div>
                  
                  <div className="opponent-feedback">
                    <div className="feedback-question">
                      Was your opponent a good sport?
                    </div>
                    <div className="feedback-buttons">
                      <button className="feedback-btn like"><FontAwesomeIcon icon={faThumbsUp} /></button>
                      <button className="feedback-btn dislike"><FontAwesomeIcon icon={faThumbsDown} /></button>
                    </div>
                  </div>
                  
                  <div className="message-input">
                    <input type="text" placeholder="Send a message..." />
                    <button className="emoji-btn">😊</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Show Submit Game button only in Play Yourself mode */}
        {playYourselfMode && (
          <div style={{ textAlign: 'center', margin: '1.5rem 0' }}>
            <button className="review-btn" onClick={handleSubmitPlayYourselfGame} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Game'}
            </button>
            <button className="review-btn" style={{ marginLeft: 12, background: '#444' }} onClick={onExitPlayYourself} disabled={isSubmitting}>
              Cancel
            </button>
            {submitError && <div style={{ color: 'red', marginTop: 8 }}>{submitError}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChessboardSection;
