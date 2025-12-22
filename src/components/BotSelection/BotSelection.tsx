import React, { useState } from 'react';
import './BotSelection.css';

interface Bot {
  id: string;
  name: string;
  rating: number;
  level: string;
  description: string;
  color: string;
  icon: string;
}

const BOTS: Bot[] = [
  {
    id: 'beginner',
    name: 'Rookie Bot',
    rating: 800,
    level: 'Beginner',
    description: 'Perfect for learning the basics',
    color: '#4caf50',
    icon: '🌱'
  },
  {
    id: 'easy',
    name: 'Casual Bot',
    rating: 1000,
    level: 'Easy',
    description: 'Makes occasional mistakes',
    color: '#8bc34a',
    icon: '😊'
  },
  {
    id: 'intermediate',
    name: 'Skilled Bot',
    rating: 1200,
    level: 'Intermediate',
    description: 'Solid fundamental play',
    color: '#ffc107',
    icon: '🎯'
  },
  {
    id: 'advanced',
    name: 'Expert Bot',
    rating: 1500,
    level: 'Advanced',
    description: 'Strong tactical awareness',
    color: '#ff9800',
    icon: '🔥'
  },
  {
    id: 'master',
    name: 'Master Bot',
    rating: 1800,
    level: 'Master',
    description: 'Near-perfect play',
    color: '#f44336',
    icon: '👑'
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster Bot',
    rating: 2200,
    level: 'Grandmaster',
    description: 'Unforgiving and precise',
    color: '#9c27b0',
    icon: '⚡'
  }
];

interface BotSelectionProps {
  onClose: () => void;
  onSelectBot: (bot: Bot) => void;
}

const BotSelection: React.FC<BotSelectionProps> = ({ onClose, onSelectBot }) => {
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);

  const handleBotClick = (bot: Bot) => {
    setSelectedBot(bot);
  };

  const handlePlayBot = () => {
    if (selectedBot) {
      onSelectBot(selectedBot);
      onClose();
    }
  };

  return (
    <div className="bot-selection-overlay" onClick={onClose}>
      <div className="bot-selection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bot-modal-header">
          <h2>Choose Your Opponent</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="bot-grid">
          {BOTS.map((bot) => (
            <div
              key={bot.id}
              className={`bot-card ${selectedBot?.id === bot.id ? 'selected' : ''}`}
              onClick={() => handleBotClick(bot)}
              style={{ borderColor: selectedBot?.id === bot.id ? bot.color : 'transparent' }}
            >
              <div className="bot-icon" style={{ background: bot.color }}>
                {bot.icon}
              </div>
              <div className="bot-info">
                <h3 className="bot-name">{bot.name}</h3>
                <div className="bot-level" style={{ color: bot.color }}>
                  {bot.level}
                </div>
                <div className="bot-rating">Rating: {bot.rating}</div>
                <p className="bot-description">{bot.description}</p>
              </div>
              {selectedBot?.id === bot.id && (
                <div className="selected-indicator" style={{ background: bot.color }}>
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bot-modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="play-btn"
            onClick={handlePlayBot}
            disabled={!selectedBot}
            style={{
              background: selectedBot ? selectedBot.color : '#666',
              cursor: selectedBot ? 'pointer' : 'not-allowed'
            }}
          >
            {selectedBot ? `Play vs ${selectedBot.name}` : 'Select a Bot'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BotSelection;
