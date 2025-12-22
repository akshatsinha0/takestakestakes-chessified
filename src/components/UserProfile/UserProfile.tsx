import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseAuthContext } from '../../context/SupabaseAuthContext';
import { toast } from 'react-toastify';
import './UserProfile.css';

interface UserProfileProps {
  userId: string;
  onClose: () => void;
}

interface ProfileData {
  id: string;
  username: string;
  rating: number;
  bio?: string;
  is_online: boolean;
  created_at: string;
}

interface FriendRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
}

interface GameStats {
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId, onClose }) => {
  const { user } = useSupabaseAuthContext();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [gameStats, setGameStats] = useState<GameStats>({ total_games: 0, wins: 0, losses: 0, draws: 0 });
  const [friendRequest, setFriendRequest] = useState<FriendRequest | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    setIsLoading(true);
    
    try {
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile load error:', profileError);
        toast.error('Failed to load profile');
        return;
      }

      setProfile(profileData);

      // Load game statistics
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('result, winner, white_player_id, black_player_id')
        .or(`white_player_id.eq.${userId},black_player_id.eq.${userId}`)
        .eq('status', 'completed');

      if (!gamesError && games) {
        const stats = {
          total_games: games.length,
          wins: games.filter(g => g.winner === userId).length,
          losses: games.filter(g => g.winner && g.winner !== userId).length,
          draws: games.filter(g => !g.winner || g.result === 'draw').length
        };
        setGameStats(stats);
      }

      // Check if already friends or if there's a pending request
      if (user) {
        const { data: friendData, error: friendError } = await supabase
          .from('friend_requests')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`)
          .single();

        if (!friendError && friendData) {
          setFriendRequest(friendData);
          if (friendData.status === 'accepted') {
            setIsFriend(true);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!user || !profile) return;

    setIsSendingRequest(true);

    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: profile.id,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Friend request error:', error);
        toast.error('Failed to send friend request');
        return;
      }

      setFriendRequest(data);
      toast.success(`Friend request sent to ${profile.username}!`);
    } catch (error) {
      console.error('Failed to send friend request:', error);
      toast.error('Failed to send friend request');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleCancelFriendRequest = async () => {
    if (!friendRequest) return;

    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', friendRequest.id);

      if (error) {
        console.error('Cancel request error:', error);
        toast.error('Failed to cancel request');
        return;
      }

      setFriendRequest(null);
      toast.info('Friend request cancelled');
    } catch (error) {
      console.error('Failed to cancel request:', error);
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendRequest) return;

    if (!confirm('Are you sure you want to remove this friend?')) return;

    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', friendRequest.id);

      if (error) {
        console.error('Remove friend error:', error);
        toast.error('Failed to remove friend');
        return;
      }

      setFriendRequest(null);
      setIsFriend(false);
      toast.info('Friend removed');
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  };

  const handleChallenge = () => {
    // This will be handled by the existing challenge system
    toast.info('Challenge feature - use the Challenge button in All Players list');
    onClose();
  };

  if (isLoading) {
    return (
      <div className="user-profile-overlay" onClick={onClose}>
        <div className="user-profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const isOwnProfile = user?.id === userId;
  const winRate = gameStats.total_games > 0 
    ? Math.round((gameStats.wins / gameStats.total_games) * 100) 
    : 0;

  return (
    <div className="user-profile-overlay" onClick={onClose}>
      <div className="user-profile-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>

        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar-large">
            <div className="avatar-circle">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            {profile.is_online && <span className="online-indicator"></span>}
          </div>
          
          <div className="profile-info">
            <h2 className="profile-username">{profile.username}</h2>
            <div className="profile-rating">
              <span className="rating-label">Rating:</span>
              <span className="rating-value">{profile.rating}</span>
            </div>
            <div className="profile-status">
              {profile.is_online ? (
                <span className="status-online">● Online</span>
              ) : (
                <span className="status-offline">● Offline</span>
              )}
            </div>
          </div>
        </div>

        {/* Bio Section */}
        {profile.bio && (
          <div className="profile-bio">
            <h3>About</h3>
            <p>{profile.bio}</p>
          </div>
        )}

        {/* Game Statistics */}
        <div className="profile-stats">
          <h3>Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{gameStats.total_games}</div>
              <div className="stat-label">Total Games</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{gameStats.wins}</div>
              <div className="stat-label">Wins</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{gameStats.losses}</div>
              <div className="stat-label">Losses</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{gameStats.draws}</div>
              <div className="stat-label">Draws</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{winRate}%</div>
              <div className="stat-label">Win Rate</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <div className="profile-actions">
            {isFriend ? (
              <>
                <button className="action-btn challenge-btn" onClick={handleChallenge}>
                  Challenge to Game
                </button>
                <button className="action-btn remove-friend-btn" onClick={handleRemoveFriend}>
                  Remove Friend
                </button>
              </>
            ) : friendRequest ? (
              friendRequest.status === 'pending' ? (
                <button 
                  className="action-btn pending-btn" 
                  onClick={handleCancelFriendRequest}
                  disabled={friendRequest.sender_id !== user?.id}
                >
                  {friendRequest.sender_id === user?.id 
                    ? 'Cancel Friend Request' 
                    : 'Friend Request Pending'}
                </button>
              ) : null
            ) : (
              <button 
                className="action-btn friend-request-btn" 
                onClick={handleSendFriendRequest}
                disabled={isSendingRequest}
              >
                {isSendingRequest ? 'Sending...' : 'Send Friend Request'}
              </button>
            )}
          </div>
        )}

        {/* Member Since */}
        <div className="profile-footer">
          <span className="member-since">
            Member since {new Date(profile.created_at).toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
