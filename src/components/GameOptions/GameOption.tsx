// GameOption.tsx
import React from 'react';
import './GameOptions.css';

// Import icons properly
import lightningIcon from '../../assets/icons/lightning.png';
import robotIcon from '../../assets/icons/robot.png';
import handshakeIcon from '../../assets/icons/handshake.png';
import trophyIcon from '../../assets/icons/trophy.png';
import diceIcon from '../../assets/icons/dice.png';

interface GameOptionProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  onClick?: () => void;
}

const GameOption: React.FC<GameOptionProps> = ({ title, description, icon, color, onClick }) => {
  // Map icon names to imported assets
  const getIconSrc = (iconName: string) => {
    switch (iconName) {
      case 'lightning': return lightningIcon;
      case 'robot': return robotIcon;
      case 'handshake': return handshakeIcon;
      case 'trophy': return trophyIcon;
      case 'dice': return diceIcon;
      default: return lightningIcon;
    }
  };

  return (
    <div className="game-option" onClick={onClick}>
      <div className="option-icon" style={{ backgroundColor: color }}>
        <img src={getIconSrc(icon)} alt={title} className="icon-image" />
      </div>
      <div className="option-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
};

export default GameOption;
