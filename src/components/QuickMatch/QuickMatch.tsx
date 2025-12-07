import { useState, useEffect } from 'react';
import { useSupabaseAuthContext } from '../../context/SupabaseAuthContext';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { joinMatchmakingQueue, leaveMatchmakingQueue, subscribeToGame } from '../../services/matchmakingService';
import './QuickMatch.css';

const QuickMatch: React.FC = () => {
  const { user, profile } = useSupabaseAuthContext();
  const navigate = useNavigate();
  const [searching, setSearching] = useState(false);
  const [selectedTime, setSelectedTime] = useState('5+0');
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  const timeControls = [
    { id: '1+0', name: 'Bullet', time: '1 min' },
    { id: '3+0', name: 'Blitz', time: '3 min' },
    { id: '5+0', name: 'Blitz', time: '5 min' },
    { id: '10+0', name: 'Rapid', time: '10 min' }
  ];

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (searching && user) {
        leaveMatchmakingQueue(user.id);
      }
    };
  }, [searching, user]);

  useEffect(() => {
    if (!currentGameId) return;

    // Subscribe to game updates
    const subscription = subscribeToGame(currentGameId, (game) => {
      if (game.status === 'in_progress' && game.black_player_id) {
        toast.success('Match found! Starting game...');
        navigate(`/game/${game.id}`);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [currentGameId, navigate]);

  const findQuickMatch = async () => {
    if (!user || !profile) {
      toast.error('Please log in to play');
      return;
    }

    setSearching(true);

    try {
      const result = await joinMatchmakingQueue(
        user.id,
        selectedTime,
        profile.rating || 1200
      );

      if (result.success && result.gameId) {
        setCurrentGameId(result.gameId);
        
        // Check if game is already in progress (matched immediately)
        const response = await fetch(`/api/games/${result.gameId}`);
        if (response.ok) {
          const game = await response.json();
          if (game.status === 'in_progress') {
            toast.success('Match found! Starting game...');
            navigate(`/game/${result.gameId}`);
          } else {
            toast.info('Waiting for opponent...');
          }
        } else {
          toast.info('Waiting for opponent...');
        }
      } else {
        toast.error(result.error || 'Failed to join matchmaking');
        setSearching(false);
      }
    } catch (error) {
      console.error('Quick match error:', error);
      toast.error('Failed to find match');
      setSearching(false);
    }
  };

  const cancelSearch = async () => {
    if (user) {
      await leaveMatchmakingQueue(user.id);
      setSearching(false);
      setCurrentGameId(null);
      toast.info('Search cancelled');
    }
  };

return (
    <div className="quick-match">
      <h3>Quick Match</h3>
      <div className="time-selector">
        {timeControls.map(tc => (
          <button
            key={tc.id}
            className={`time-btn ${selectedTime === tc.id ? 'selected' : ''}`}
            onClick={() => setSelectedTime(tc.id)}
            disabled={searching}
          >
            <div className="time-name">{tc.name}</div>
            <div className="time-duration">{tc.time}</div>
          </button>
        ))}
      </div>
      
      {!searching ? (
        <button className="find-match-btn" onClick={findQuickMatch}>
          Find Match
        </button>
      ) : (
        <div className="searching-container">
          <div className="searching-spinner"></div>
          <p className="searching-text">Searching for opponent...</p>
          <button className="cancel-search-btn" onClick={cancelSearch}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default QuickMatch;