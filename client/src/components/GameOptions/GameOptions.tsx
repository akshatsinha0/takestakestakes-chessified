import React from 'react';
import GameOption from './GameOption';
import './GameOptions.css';

const GameOptions: React.FC = () => {
  const options = [
    {
      id: 'play-online',
      title: 'Play Online',
      description: 'Play vs a person of similar skill',
      icon: 'lightning',
      color: '#ffc107'
    },
    {
      id: 'play-bots',
      title: 'Play Bots',
      description: 'Challenge a bot from Easy to Master',
      icon: 'robot',
      color: '#3f87f5'
    },
    {
      id: 'play-friend',
      title: 'Play a Friend',
      description: 'Invite a friend to a game of chess',
      icon: 'handshake',
      color: '#f5813f'
    },
    {
      id: 'tournaments',
      title: 'Tournaments',
      description: 'Join an Arena where anyone can win',
      icon: 'trophy',
      color: '#e5a356'
    },
    {
      id: 'chess-variants',
      title: 'Chess Variants',
      description: 'Find fun new ways to play chess',
      icon: 'dice',
      color: '#4caf50'
    }
  ];

  return (
    <div className="game-options">
      <h2>Play Chess</h2>
      <div className="options-container">
        {options.map(option => (
          <GameOption
            key={option.id}
            title={option.title}
            description={option.description}
            icon={option.icon}
            color={option.color}
          />
        ))}
      </div>
    </div>
  );
};

export default GameOptions;
