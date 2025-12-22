import React, { useState, useEffect } from 'react';
import { useSupabaseAuthContext } from '../context/SupabaseAuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import Header from '../components/Header/Header';
import DashboardLayout from '../components/DashboardLayout/DashboardLayout';
import './Settings.css';

const Settings: React.FC = () => {
  const { user, profile } = useSupabaseAuthContext();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile settings
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Game preferences
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoQueen, setAutoQueen] = useState(true);
  const [showLegalMoves, setShowLegalMoves] = useState(true);
  const [boardTheme, setBoardTheme] = useState('classic');
  const [pieceSet, setPieceSet] = useState('standard');
  
  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowChallenges, setAllowChallenges] = useState(true);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setEmail(user?.email || '');
      setBio(profile.bio || '');
    }
  }, [profile, user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = () => {
    // Save to localStorage for now
    localStorage.setItem('chess_preferences', JSON.stringify({
      soundEnabled,
      autoQueen,
      showLegalMoves,
      boardTheme,
      pieceSet
    }));
    toast.success('Preferences saved!');
  };

  const handleSavePrivacy = () => {
    // Save to localStorage for now
    localStorage.setItem('privacy_settings', JSON.stringify({
      profileVisibility,
      showOnlineStatus,
      allowChallenges
    }));
    toast.success('Privacy settings saved!');
  };

  return (
    <DashboardLayout>
      <Header />
      <div className="settings-page">
        <div className="settings-container">
          <h1 className="settings-title">Settings</h1>
          
          <div className="settings-tabs">
            <button 
              className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            <button 
              className={`settings-tab ${activeTab === 'game' ? 'active' : ''}`}
              onClick={() => setActiveTab('game')}
            >
              Game Preferences
            </button>
            <button 
              className={`settings-tab ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              Privacy
            </button>
          </div>

          <div className="settings-content">
            {activeTab === 'profile' && (
              <div className="settings-section">
                <h2>Profile Settings</h2>
                
                <div className="settings-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                  />
                </div>

                <div className="settings-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    placeholder="Email address"
                  />
                  <small>Email cannot be changed here</small>
                </div>

                <div className="settings-group">
                  <label>Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>

                <div className="settings-group">
                  <label>Rating</label>
                  <input
                    type="text"
                    value={profile?.rating || 1200}
                    disabled
                  />
                  <small>Rating is calculated based on your game results</small>
                </div>

                <button 
                  className="save-btn"
                  onClick={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            )}

            {activeTab === 'game' && (
              <div className="settings-section">
                <h2>Game Preferences</h2>
                
                <div className="settings-group">
                  <div className="settings-toggle">
                    <div>
                      <label>Sound Effects</label>
                      <small>Play sounds for moves, captures, and checks</small>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={soundEnabled}
                        onChange={(e) => setSoundEnabled(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="settings-group">
                  <div className="settings-toggle">
                    <div>
                      <label>Auto-Queen</label>
                      <small>Automatically promote pawns to queen</small>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={autoQueen}
                        onChange={(e) => setAutoQueen(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="settings-group">
                  <div className="settings-toggle">
                    <div>
                      <label>Show Legal Moves</label>
                      <small>Highlight legal moves when selecting a piece</small>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showLegalMoves}
                        onChange={(e) => setShowLegalMoves(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="settings-group">
                  <label>Board Theme</label>
                  <select 
                    value={boardTheme}
                    onChange={(e) => setBoardTheme(e.target.value)}
                  >
                    <option value="classic">Classic</option>
                    <option value="wood">Wood</option>
                    <option value="marble">Marble</option>
                    <option value="blue">Blue</option>
                    <option value="green">Green</option>
                  </select>
                </div>

                <div className="settings-group">
                  <label>Piece Set</label>
                  <select 
                    value={pieceSet}
                    onChange={(e) => setPieceSet(e.target.value)}
                  >
                    <option value="standard">Standard</option>
                    <option value="modern">Modern</option>
                    <option value="classic">Classic</option>
                    <option value="neo">Neo</option>
                  </select>
                </div>

                <button 
                  className="save-btn"
                  onClick={handleSavePreferences}
                >
                  Save Preferences
                </button>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="settings-section">
                <h2>Privacy Settings</h2>
                
                <div className="settings-group">
                  <label>Profile Visibility</label>
                  <select 
                    value={profileVisibility}
                    onChange={(e) => setProfileVisibility(e.target.value)}
                  >
                    <option value="public">Public - Anyone can view</option>
                    <option value="friends">Friends Only</option>
                    <option value="private">Private - Only me</option>
                  </select>
                </div>

                <div className="settings-group">
                  <div className="settings-toggle">
                    <div>
                      <label>Show Online Status</label>
                      <small>Let others see when you're online</small>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showOnlineStatus}
                        onChange={(e) => setShowOnlineStatus(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="settings-group">
                  <div className="settings-toggle">
                    <div>
                      <label>Allow Game Challenges</label>
                      <small>Allow other players to challenge you</small>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={allowChallenges}
                        onChange={(e) => setAllowChallenges(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <button 
                  className="save-btn"
                  onClick={handleSavePrivacy}
                >
                  Save Privacy Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings; 