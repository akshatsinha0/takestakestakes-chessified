import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseAuthContext } from '../../context/SupabaseAuthContext';
import { toast } from 'react-toastify';
import './FriendInvite.css';

interface FriendInviteProps {
  onClose: () => void;
  onGameCreated: (gameId: string) => void;
}

interface Profile {
  id: string;
  username: string;
  rating: number;
  is_online: boolean;
}

const TIME_CONTROLS = [
  { label: '1 min', value: '1+0', minutes: 1, increment: 0 },
  { label: '3 min', value: '3+0', minutes: 3, increment: 0 },
  { label: '5 min', value: '5+0', minutes: 5, increment: 0 },
  { label: '10 min', value: '10+0', minutes: 10, increment: 0 },
  { label: '15 min', value: '15+0', minutes: 15, increment: 0 },
  { label: '30 min', value: '30+0', minutes: 30, increment: 0 },
];

const FriendInvite: React.FC<FriendInviteProps> = ({ onClose, onGameCreated }) => {
  const { user } = useSupabaseAuthContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [selectedTimeControl, setSelectedTimeControl] = useState(TIME_CONTROLS[3]); // Default 10 min
  const [selectedColor, setSelectedColor] = useState<'white' | 'black' | 'random'>('random');
  const [isCreating, setIsCreating] = useState(false);

  // Search for users
  useEffect(() => {
    if (!searchQuery.trim() || !user) {
      setSearchResults([]);
      return;
    }

    const searchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, rating, is_online')
        .neq('id', user.id) // Exclude current user
        .ilike('username', `%${searchQuery}%`)
        .limit(10);

      if (error) {
        console.error('Search error:', error);
        return;
      }

      setSearchResults(data || []);
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user]);

  const handleCreateGame = async () => {
    if (!selectedFriend || !user) {
      toast.error('Please select a friend');
      return;
    }

    setIsCreating(true);

    try {
      // Determine player colors
      let whitePlayerId = user.id;
      let blackPlayerId = selectedFriend.id;

      if (selectedColor === 'black') {
        whitePlayerId = selectedFriend.id;
        blackPlayerId = user.id;
      } else if (selectedColor === 'random') {
        const random = Math.random() > 0.5;
        if (random) {
          whitePlayerId = selectedFriend.id;
          blackPlayerId = user.id;
        }
      }

      // Create game
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .insert({
          white_player_id: whitePlayerId,
          black_player_id: blackPlayerId,
          status: 'pending',
          time_control: selectedTimeControl.value,
          white_time_remaining: selectedTimeControl.minutes * 60,
          black_time_remaining: selectedTimeControl.minutes * 60,
          board_state: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          current_turn: 'white',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (gameError) {
        console.error('Game creation error:', gameError);
        toast.error('Failed to create game');
        setIsCreating(false);
        return;
      }

      // Create challenge notification
      const { error: challengeError } = await supabase
        .from('challenges')
        .insert({
          challenger_id: user.id,
          challenged_id: selectedFriend.id,
          game_id: gameData.id,
          time_control: selectedTimeControl.value,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (challengeError) {
        console.error('Challenge creation error:', challengeError);
        toast.error('Failed to send invitation');
        setIsCreating(false);
        return;
      }

      toast.success(`Game invitation sent to ${selectedFriend.username}!`);
      onGameCreated(gameData.id);
      onClose();
    } catch (error) {
      console.error('Failed to create game:', error);
      toast.error('Failed to create game');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="friend-invite-overlay" onClick={onClose}>
      <div className="friend-invite-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        
        <h2 className="modal-title">Play a Friend</h2>
        
        {/* Friend Search */}
        <div className="search-section">
          <label>Search for a friend</label>
          <input
            type="text"
            className="search-input"
            placeholder="Enter username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((profile) => (
                <div
                  key={profile.id}
                  className={`search-result-item ${selectedFriend?.id === profile.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFriend(profile)}
                >
                  <div className="result-info">
                    <div className="result-username">
                      {profile.username}
                      {profile.is_online && <span className="online-dot"></span>}
                    </div>
                    <div className="result-rating">Rating: {profile.rating}</div>
                  </div>
                  {selectedFriend?.id === profile.id && <span className="check-mark">✓</span>}
                </div>
              ))}
            </div>
          )}
          
          {searchQuery && searchResults.length === 0 && (
            <div className="no-results">No users found</div>
          )}
        </div>
        
        {/* Selected Friend Display */}
        {selectedFriend && (
          <div className="selected-friend">
            <span>Playing against:</span>
            <strong>{selectedFriend.username}</strong>
            <span className="friend-rating">({selectedFriend.rating})</span>
          </div>
        )}
        
        {/* Time Control Selection */}
        <div className="time-control-section">
          <label>Time Control</label>
          <div className="time-control-grid">
            {TIME_CONTROLS.map((tc) => (
              <button
                key={tc.value}
                className={`time-control-btn ${selectedTimeControl.value === tc.value ? 'selected' : ''}`}
                onClick={() => setSelectedTimeControl(tc)}
              >
                {tc.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Color Selection */}
        <div className="color-selection-section">
          <label>Play as</label>
          <div className="color-buttons">
            <button
              className={`color-btn ${selectedColor === 'white' ? 'selected' : ''}`}
              onClick={() => setSelectedColor('white')}
            >
              <span className="piece-icon">♔</span>
              White
            </button>
            <button
              className={`color-btn ${selectedColor === 'random' ? 'selected' : ''}`}
              onClick={() => setSelectedColor('random')}
            >
              <span className="piece-icon">⚡</span>
              Random
            </button>
            <button
              className={`color-btn ${selectedColor === 'black' ? 'selected' : ''}`}
              onClick={() => setSelectedColor('black')}
            >
              <span className="piece-icon">♚</span>
              Black
            </button>
          </div>
        </div>
        
        {/* Create Game Button */}
        <button
          className="create-game-btn"
          onClick={handleCreateGame}
          disabled={!selectedFriend || isCreating}
        >
          {isCreating ? 'Creating...' : 'Send Invitation'}
        </button>
      </div>
    </div>
  );
};

export default FriendInvite;
