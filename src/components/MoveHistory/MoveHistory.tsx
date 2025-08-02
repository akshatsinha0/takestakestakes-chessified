import React, { useEffect, useRef } from 'react';
import './MoveHistory.css';

interface Move {
  notation: string;
  time: number;
  player: 'white' | 'black';
}

interface MoveHistoryProps {
  moves: Move[];
  opening?: string;
  gameStatus?: string;
  currentMoveIndex?: number;
  onMoveSelected?: (index: number) => void;
}

const MoveHistory: React.FC<MoveHistoryProps> = ({ 
  moves, 
  opening, 
  gameStatus, 
  currentMoveIndex = -1,
  onMoveSelected 
}) => {
  const movesContainerRef = useRef<HTMLDivElement>(null);
  
  const movesPaired = [];
  for (let i = 0; i < moves.length; i += 2) {
    movesPaired.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i],
      black: i + 1 < moves.length ? moves[i + 1] : null
    });
  }
  
  useEffect(() => {
    if (movesContainerRef.current && moves.length > 0) {
      movesContainerRef.current.scrollTop = movesContainerRef.current.scrollHeight;
    }
  }, [moves.length]);
  
  const handleMoveClick = (index: number) => {
    if (onMoveSelected) {
      onMoveSelected(index);
    }
  };

  return (
    <div className="move-history">
      {opening && (
        <div className="opening-info">
          <div className="opening-name">{opening}</div>
          <button className="info-button" aria-label="Opening information">ⓘ</button>
        </div>
      )}
      
      <div className="moves-container" ref={movesContainerRef}>
        {movesPaired.map((pair, pairIndex) => (
          <div key={pair.number} className="move-row">
            <div className="move-number">{pair.number}.</div>
            
            <div 
              className={`move white ${currentMoveIndex === pairIndex * 2 ? 'active' : ''}`}
              onClick={() => handleMoveClick(pairIndex * 2)}
            >
              <span className="notation">{pair.white.notation}</span>
              <span className="time">{pair.white.time.toFixed(1)}s</span>
            </div>
            
            {pair.black && (
              <div 
                className={`move black ${currentMoveIndex === pairIndex * 2 + 1 ? 'active' : ''}`}
                onClick={() => handleMoveClick(pairIndex * 2 + 1)}
              >
                <span className="notation">{pair.black.notation}</span>
                <span className="time">{pair.black.time.toFixed(1)}s</span>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {gameStatus && (
        <div className="game-status">
          <div className="status-text">{gameStatus}</div>
          <div className="action-buttons">
            <button className="action-button like" aria-label="Good game">👍</button>
            <button className="action-button dislike" aria-label="Not a good game">👎</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoveHistory;
