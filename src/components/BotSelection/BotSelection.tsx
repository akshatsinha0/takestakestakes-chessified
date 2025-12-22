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
    icon: 'R'
  },
  {
    id: 'easy',
    name: 'Casual Bot',
    rating: 1000,
    level: 'Easy',
    description: 'Makes occasional mistakes',
    color: '#8bc34a',
    icon: 'C'
  },
  {
    id: 'intermediate',
    name: 'Skilled Bot',
    rating: 1200,
    level: 'Intermediate',
    description: 'Solid fundamental play',
    color: '#ffc107',
    icon: 'S'
  },
  {
    id: 'advanced',
    name: 'Expert Bot',
    rating: 1500,
    level: 'Advanced',
    description: 'Strong tactical awareness',
    color: '#ff9800',
    icon: 'E'
  },
  {
    id: 'master',
    name: 'Master Bot',
    rating: 1800,
    level: 'Master',
    description: 'Near-perfect play',
    color: '#f44336',
    icon: 'M'
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster Bot',
    rating: 2200,
    level: 'Grandmaster',
    description: 'Unforgiving and precise',
    color: '#9c27b0',
    icon: 'G'
  }
];

const TIME_CONTROLS = [
  { label: '1 min', value: '1+0', minutes: 1, increment: 0 },
  { label: '3 min', value: '3+0', minutes: 3, increment: 0 },
  { label: '5 min', value: '5+0', minutes: 5, increment: 0 },
  { label: '10 min', value: '10+0', minutes: 10, increment: 0 },
  { label: '15 min', value: '15+0', minutes: 15, increment: 0 },
  { label: '30 min', value: '30+0', minutes: 30, increment: 0 },
  { label: 'Unlimited', value: 'unlimited', minutes: 0, increment: 0 }
];

interface BotSelectionProps {
  onClose: () => void;
  onSelectBot: (bot: Bot, timeControl: any) => void;
}

const BotSelection: React.FC<BotSelectionProps> = ({ onClose, onSelectBot }) => {
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [selectedTime, setSelectedTime] = useState(TIME_CONTROLS[3]); // Default 10 min

  const handleBotClick = (bot: Bot) => {
    setSelectedBot(bot);
  };

  const handlePlayBot = () => {
    if (selectedBot) {
      onSelectBot(selectedBot, selectedTime);
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
              style={{ 
                borderColor: selectedBot?.id === bot.id ? bot.color : 'transparent',
                borderRadius: 0
              }}
            >
              <div className="bot-icon" style={{ background: bot.color, borderRadius: 0 }}>
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
                <div className="selected-indicator" style={{ background: bot.color, borderRadius: 0 }}>
                  ✓
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Time Control Selection */}
        <div className="time-control-section">
          <h3 className="time-control-title">Time Control</h3>
          <div className="time-control-grid">
            {TIME_CONTROLS.map((time) => (
              <button
                key={time.value}
                className={`time-control-btn ${selectedTime.value === time.value ? 'selected' : ''}`}
                onClick={() => setSelectedTime(time)}
                style={{
                  borderRadius: 0,
                  background: selectedTime.value === time.value ? '#e5a356' : 'rgba(42, 67, 97, 0.4)',
                  color: selectedTime.value === time.value ? '#0f1419' : '#f5f5f5'
                }}
              >
                {time.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bot-modal-footer">
          <button className="cancel-btn" onClick={onClose} style={{ borderRadius: 0 }}>
            Cancel
          </button>
          <button
            className="play-btn"
            onClick={handlePlayBot}
            disabled={!selectedBot}
            style={{
              background: selectedBot ? selectedBot.color : '#666',
              cursor: selectedBot ? 'pointer' : 'not-allowed',
              borderRadius: 0
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
