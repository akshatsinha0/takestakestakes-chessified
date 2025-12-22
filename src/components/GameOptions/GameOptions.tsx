import React, { useState } from 'react';
import GameOption from './GameOption';
import QuickMatch from '../QuickMatch/QuickMatch';
import BotSelection from '../BotSelection/BotSelection';
import './GameOptions.css';

const TIME_FORMATS = [
  {
    label: 'Bullet',
    times: [
      { label: '1|0', desc: '1 min', min: 1, increment: 0 },
      { label: '2|1', desc: '2 min + 1s', min: 2, increment: 1 },
    ],
    color: '#ffc107',
  },
  {
    label: 'Blitz',
    times: [
      { label: '3|0', desc: '3 min', min: 3, increment: 0 },
      { label: '3|2', desc: '3 min + 2s', min: 3, increment: 2 },
      { label: '5|0', desc: '5 min', min: 5, increment: 0 },
      { label: '5|3', desc: '5 min + 3s', min: 5, increment: 3 },
    ],
    color: '#3f87f5',
  },
  {
    label: 'Rapid',
    times: [
      { label: '10|0', desc: '10 min', min: 10, increment: 0 },
      { label: '10|5', desc: '10 min + 5s', min: 10, increment: 5 },
      { label: '15|10', desc: '15 min + 10s', min: 15, increment: 10 },
    ],
    color: '#4caf50',
  },
  {
    label: 'Classical',
    times: [
      { label: '30|0', desc: '30 min', min: 30, increment: 0 },
      { label: '30|20', desc: '30 min + 20s', min: 30, increment: 20 },
    ],
    color: '#e5a356',
  },
];

const GameOptions: React.FC<{ onPlayYourself?: () => void; onPlayBot?: (bot: any, timeControl: any) => void }> = ({ onPlayYourself, onPlayBot }) => {
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showQuickMatch, setShowQuickMatch] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [showBotSelection, setShowBotSelection] = useState(false);
  const [customHour, setCustomHour] = useState(0);
  const [customMin, setCustomMin] = useState(10);
  const [customSec, setCustomSec] = useState(0);
  const [customInc, setCustomInc] = useState(0);

  const handleOptionClick = (id: string) => {
    if (id === 'play-online') setShowTimeModal(true);
    else if (id === 'play-bots') setShowBotSelection(true);
  };

  const handleTimeSelect = (label: string) => {
    setShowTimeModal(false);
    setShowCustom(false);
    setShowQuickMatch(true);
  };

  return (
    <div className="game-options">
      <h2>Play Chess</h2>
      <div className="options-container">
        {[{
          id: 'play-online',
          title: 'Play Online',
          description: 'Play vs a person of similar skill',
          icon: 'lightning',
          color: '#ffc107',
        },
        {
          id: 'play-bots',
          title: 'Play Bots',
          description: 'Challenge a bot from Easy to Master',
          icon: 'robot',
          color: '#3f87f5',
        },
        {
          id: 'play-friend',
          title: 'Play a Friend',
          description: 'Invite a friend to a game of chess',
          icon: 'handshake',
          color: '#f5813f',
        },
        {
          id: 'tournaments',
          title: 'Tournaments',
          description: 'Join an Arena where anyone can win',
          icon: 'trophy',
          color: '#e5a356',
        },
        {
          id: 'chess-variants',
          title: 'Chess Variants',
          description: 'Find fun new ways to play chess',
          icon: 'dice',
          color: '#4caf50',
        },
        // New Play Yourself option
        {
          id: 'play-yourself',
          title: 'Play Yourself',
          description: 'Practice by playing both sides',
          icon: 'focus-mode-icon', // Use an existing icon or add a new one
          color: '#d48d3b',
        }].map(option => (
          <GameOption
            key={option.id}
            title={option.title}
            description={option.description}
            icon={option.icon}
            color={option.color}
            onClick={() => {
              if (option.id === 'play-yourself' && onPlayYourself) onPlayYourself();
              else handleOptionClick(option.id);
            }}
          />
        ))}
      </div>

      {showTimeModal && (
        <div className="time-modal-overlay" onClick={() => setShowTimeModal(false)}>
          <div className="time-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Choose Time Format</h3>
            <div className="time-format-groups">
              {TIME_FORMATS.map(format => (
                <div key={format.label} className="time-format-group">
                  <div className="format-label" style={{ color: format.color }}>{format.label}</div>
                  <div className="format-times">
                    {format.times.map(t => (
                      <button
                        key={t.label}
                        className="time-btn"
                        style={{ background: 'var(--primary-light)', color: 'var(--text-light)' }}
                        onClick={() => handleTimeSelect(`${format.label} (${t.label})`)}
                      >
                        <span className="time-label">{t.label}</span>
                        <span className="time-desc">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="time-format-group custom-group">
                <div className="format-label" style={{ color: '#d48d3b' }}>Custom</div>
                <div className="format-times">
                  {!showCustom ? (
                    <button className="time-btn custom-btn" onClick={() => setShowCustom(true)}>
                      <span className="time-label">Custom</span>
                      <span className="time-desc">Set your own</span>
                    </button>
                  ) : (
                    <div className="custom-inputs">
                      <div className="custom-labels">
                        <span className="custom-label">Hour</span>
                        <span className="custom-label">Minute</span>
                        <span className="custom-label">Second</span>
                        <span className="custom-label">Increment</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={12}
                        value={customHour}
                        onChange={e => setCustomHour(Number(e.target.value))}
                        className="custom-input"
                        placeholder="Hour"
                        style={{ background: 'var(--primary-light)', color: 'var(--text-light)' }}
                      />
                      <span className="custom-sep">|</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={customMin}
                        onChange={e => setCustomMin(Number(e.target.value))}
                        className="custom-input"
                        placeholder="Minute"
                        style={{ background: 'var(--primary-light)', color: 'var(--text-light)' }}
                      />
                      <span className="custom-sep">|</span>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={customSec}
                        onChange={e => setCustomSec(Number(e.target.value))}
                        className="custom-input"
                        placeholder="Second"
                        style={{ background: 'var(--primary-light)', color: 'var(--text-light)' }}
                      />
                      <span className="custom-sep">inc</span>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={customInc}
                        onChange={e => setCustomInc(Number(e.target.value))}
                        className="custom-input"
                        placeholder="Increment"
                        style={{ background: 'var(--primary-light)', color: 'var(--text-light)' }}
                      />
                      <button
                        className="time-btn confirm-btn"
                        style={{ background: '#d48d3b', color: 'var(--primary-dark)' }}
                        onClick={() => handleTimeSelect(`Custom (${customHour}h ${customMin}m ${customSec}s | +${customInc})`)}
                      >
                        Confirm
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button className="close-modal-btn" onClick={() => setShowTimeModal(false)}>×</button>
          </div>
        </div>
      )}
      
      {showQuickMatch && (
        <div className="quick-match-container">
          <QuickMatch />
          <button className="close-quick-match" onClick={() => setShowQuickMatch(false)}>Back to Options</button>
        </div>
      )}
      
      {showBotSelection && (
        <BotSelection
          onClose={() => setShowBotSelection(false)}
          onSelectBot={(bot, timeControl) => {
            if (onPlayBot) onPlayBot(bot, timeControl);
          }}
        />
      )}
    </div>
  );
};

export default GameOptions;
