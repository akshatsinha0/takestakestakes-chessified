import React, { useState } from 'react';
import './ChessboardControls.css';
import flipBoardIcon from '../../assets/images/flip-board-icon.png';
import theaterModeIcon from '../../assets/images/theater-mode-icon.png';
import focusModeIcon from '../../assets/images/focus-mode-icon.png';
import settingsIcon from '../../assets/images/settingsicon.png';

interface ChessboardControlsProps {
  isTheaterMode: boolean;
  isFocusMode: boolean;
  isBoardFlipped: boolean;
  onToggleTheaterMode: () => void;
  onToggleFocusMode: () => void;
  onFlipBoard: () => void;
  onOpenSettings: () => void;
}

const ChessboardControls: React.FC<ChessboardControlsProps> = ({
  isTheaterMode,
  isFocusMode,
  isBoardFlipped,
  onToggleTheaterMode,
  onToggleFocusMode,
  onFlipBoard,
  onOpenSettings
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`chessboard-controls-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button 
        className="toggle-button"
        onClick={toggleExpand}
        aria-label={isExpanded ? "Hide controls" : "Show controls"}
      >
        <div className="arrow-icon">
          {isExpanded ? '◄' : '►'}
        </div>
      </button>
      
      <div className="chessboard-controls">
        <button 
          className={`control-button ${isBoardFlipped ? 'active' : ''}`}
          onClick={onFlipBoard}
          title="Flip Board"
        >
          <div className="control-icon-wrapper">
            <img src={flipBoardIcon} alt="Flip Board" className="control-icon" />
          </div>
          <span className="control-tooltip">Flip Board</span>
        </button>
        
        <button 
          className={`control-button ${isTheaterMode ? 'active' : ''}`}
          onClick={onToggleTheaterMode}
          title="Theater Mode"
        >
          <div className="control-icon-wrapper">
            <img src={theaterModeIcon} alt="Theater Mode" className="control-icon" />
          </div>
          <span className="control-tooltip">Theater Mode</span>
        </button>
        
        <button 
          className={`control-button ${isFocusMode ? 'active' : ''}`}
          onClick={onToggleFocusMode}
          title="Focus Mode"
        >
          <div className="control-icon-wrapper">
            <img src={focusModeIcon} alt="Focus Mode" className="control-icon" />
          </div>
          <span className="control-tooltip">Focus Mode</span>
        </button>
        
        <button 
          className="control-button"
          onClick={onOpenSettings}
          title="Settings"
        >
          <div className="control-icon-wrapper">
            <img src={settingsIcon} alt="Settings" className="control-icon" />
          </div>
          <span className="control-tooltip">Settings</span>
        </button>
      </div>
    </div>
  );
};

export default ChessboardControls;
