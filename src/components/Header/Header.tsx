import { useState, useEffect, useRef } from 'react';
import './Header.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSupabaseAuthContext } from '../../context/SupabaseAuthContext';
import { Avatar, Menu, MenuItem, IconButton, Badge, Fade } from '@mui/material';
import { 
  AccountCircle, 
  Notifications, 
  Settings, 
  ExitToApp, 
  KeyboardArrowDown,
  Person as PersonIcon,
  History as HistoryIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { getAllProfiles } from '../../utils/profileApi';
import ChallengeModal from '../ChallengeModal/ChallengeModal';
import GameHistory from '../GameHistory/GameHistory';
import { useNotifications } from '../../hooks/useNotifications';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import notiIcon from '../../assets/images/noti.png';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useSupabaseAuthContext();
  const [activeTab, setActiveTab] = useState('/play');
  const [prevTab, setPrevTab] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [animationDirection, setAnimationDirection] = useState('right');
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState<any>(null);
  const [showGameHistory, setShowGameHistory] = useState(false);
  const [userStats, setUserStats] = useState({ games: 0, wins: 0, winRate: 0 });
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  
  // Use notifications hook
  const { notifications, unreadCount, removeNotification } = useNotifications();
  
  const open = Boolean(anchorEl);
  
  const navItems = [
    { name: 'Play', path: '/play' },
    { name: 'Puzzles', path: '/puzzles' },
    { name: 'Lessons', path: '/lessons' },
    { name: 'Analysis', path: '/analysis' }
  ];

  useEffect(() => {
    const path = location.pathname;
    if (path !== activeTab) {
      setPrevTab(activeTab);
      const currentIndex = navItems.findIndex(item => item.path === path);
      const prevIndex = navItems.findIndex(item => item.path === activeTab);
      setAnimationDirection(currentIndex > prevIndex ? 'right' : 'left');
      setActiveTab(path);
    }
  }, [location, activeTab]);
  
  useEffect(() => {
    if (indicatorRef.current) {
      const activeElement = document.querySelector(`.nav-item[data-path="${activeTab}"]`);
      if (activeElement) {
        const { width, left } = activeElement.getBoundingClientRect();
        const parentLeft = indicatorRef.current.parentElement?.getBoundingClientRect().left || 0;
        
        indicatorRef.current.style.width = `${width}px`;
        indicatorRef.current.style.transform = `translateX(${left - parentLeft}px)`;
      }
    }
  }, [activeTab]);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getInitial = (name: string | undefined) => {
    return name?.charAt(0).toUpperCase() || 'G';
  };

  const handleLogout = async () => {
    handleClose();
    await signOut();
    navigate('/');
  };

  const handleUserDropdown = async () => {
    const willOpen = !userDropdownOpen;
    setUserDropdownOpen(willOpen);
    
    // Fetch users every time the dropdown opens to get fresh data
    if (willOpen) {
      setLoadingUsers(true);
      try {
        console.log('[UserDropdown] Fetching all profiles...');
        const users = await getAllProfiles();
        console.log('[UserDropdown] Fetched users:', users.length, users);
        setAllUsers(users);
      } catch (e) {
        console.error('[UserDropdown] Error fetching users:', e);
        setAllUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  // Handle notification dropdown toggle
  const handleNotificationClick = () => {
    setNotificationDropdownOpen(!notificationDropdownOpen);
  };

  // Handle accepting a challenge from notification
  const handleAcceptChallenge = async (notification: any) => {
    const invitation = notification.data?.invitation;
    if (!invitation || !user) return;

    try {
      // Update invitation status
      await supabase
        .from('game_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      // Determine colors randomly
      const isWhite = Math.random() < 0.5;
      const whitePlayerId = isWhite ? user.id : invitation.from_user_id;
      const blackPlayerId = isWhite ? invitation.from_user_id : user.id;

      // Parse time control
      let initialTime = 600;
      if (invitation.time_control) {
        const timeMinutes = parseInt(invitation.time_control.split('+')[0]);
        initialTime = timeMinutes * 60;
      }

      // Create the game
      const { error: gameError } = await supabase
        .from('games')
        .insert({
          created_by: user.id,
          opponent_id: invitation.from_user_id,
          white_player_id: whitePlayerId,
          black_player_id: blackPlayerId,
          status: 'in_progress',
          time_control: invitation.time_control,
          board_state: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          current_turn: 'white',
          white_time_remaining: initialTime,
          black_time_remaining: initialTime,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (gameError) {
        console.error('Error creating game:', gameError);
        toast.error('Failed to start game');
        return;
      }

      removeNotification(notification.id);
      setNotificationDropdownOpen(false);
      toast.success('Game started!');
      
      // Navigate to play page if not already there
      if (location.pathname !== '/play') {
        navigate('/play');
      }
    } catch (error) {
      console.error('Error accepting challenge:', error);
      toast.error('Failed to accept challenge');
    }
  };

  // Handle declining a challenge from notification
  const handleDeclineChallenge = async (notification: any) => {
    const invitation = notification.data?.invitation;
    if (!invitation) return;

    try {
      await supabase
        .from('game_invitations')
        .update({ status: 'declined' })
        .eq('id', invitation.id);

      removeNotification(notification.id);
      toast.info('Challenge declined');
    } catch (error) {
      console.error('Error declining challenge:', error);
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <div className="user-list-trigger" onClick={handleUserDropdown} tabIndex={0} style={{ marginRight: '1.2rem', position: 'relative' }}>
            <span className="user-list-icon">👥</span>
            <span className="user-list-label">Users</span>
            <span className="dropdown-arrow">▼</span>
            {userDropdownOpen && (
              <div className="user-list-dropdown">
                <div className="user-list-title">All Players</div>
                {loadingUsers ? (
                  <div className="user-list-loading">Loading...</div>
                ) : (
                  <div className="user-list-scroll">
                    {allUsers.length === 0 && <div className="user-list-empty">No users found.</div>}
                    {allUsers.map((u) => {
                      // Consider user online if they were active in the last 5 minutes
                      const isOnline = u.last_active ? 
                        (new Date().getTime() - new Date(u.last_active).getTime()) < 5 * 60 * 1000 
                        : false;
                      
                      return (
                        <div className="user-list-item" key={u.id}>
                          <div className="user-list-avatar">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.username} />
                            ) : (
                              <span className="avatar-fallback">{u.username?.charAt(0)?.toUpperCase() || 'U'}</span>
                            )}
                            <span className={`user-status-dot ${isOnline ? 'online' : 'offline'}`}></span>
                          </div>
                          <div className="user-list-info">
                            <span className="user-list-username">{u.username}</span>
                            <span className="user-list-rating">{u.rating || 1200}</span>
                          </div>
                          {u.id !== user?.id && (
                            <button className="challenge-btn" onClick={(e) => {
                              e.stopPropagation();
                              setChallengeTarget(u);
                              setUserDropdownOpen(false);
                            }}>
                              Challenge
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="logo">
            <h1 className="logo-text">TakesTakesTakes</h1>
          </div>
          
          <nav className="main-nav">
            <div className="nav-items-container">
              {navItems.map((item) => (
                <Link 
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${activeTab === item.path ? 'active' : ''}`}
                  data-path={item.path}
                >
                  {item.name}
                  <span className="nav-item-glow"></span>
                </Link>
              ))}
              <div 
                ref={indicatorRef} 
                className={`active-indicator ${animationDirection}`}
                data-prev={prevTab}
              ></div>
            </div>
          </nav>
        </div>
        
        <div className="header-right">
          <div className="user-section">
            <div className="user-profile" onClick={handleMenu}>
              <div className="avatar-container">
                {profile?.avatar_url ? (
                  <Avatar src={profile.avatar_url} alt={profile.username} className="user-avatar" />
                ) : (
                  <div className="avatar">
                    {profile ? getInitial(profile.username) : 'G'}
                    <div className="online-status"></div>
                  </div>
                )}
              </div>
              
              <div className="user-info">
                <span className="username">{profile?.username || 'Guest'}</span>
                {profile && <span className="rating">{profile.rating}</span>}
              </div>
              
              <KeyboardArrowDown className="dropdown-arrow" />
            </div>
            
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={open}
              onClose={handleClose}
              className="enhanced-dropdown"
              elevation={0}
              TransitionComponent={Fade}
              transitionDuration={200}
              disableScrollLock
            >
              <div className="dropdown-container">
                {user && (
                  <>
                    <div className="dropdown-header">
                      <div className="user-avatar-large">
                        {profile?.avatar_url ? (
                          <Avatar src={profile.avatar_url} alt={profile.username || 'User'} />
                        ) : (
                          <div className="avatar-fallback">{profile?.username?.charAt(0) || 'U'}</div>
                        )}
                      </div>
                      <div className="user-details-expanded">
                        <span className="user-fullname">{profile?.username || 'User'}</span>
                        <span className="user-rating-expanded">
                          <span className="rating-value">{profile?.rating || 1200}</span>
                          <span className="rating-label">ELO</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                  </>
                )}
                
                <MenuItem onClick={() => { handleClose(); navigate('/profile'); }} className="dropdown-item profile-item">
                  <div className="menu-icon-wrapper">
                    <AccountCircle className="menu-icon" />
                  </div>
                  <div className="menu-text">Profile</div>
                  <div className="menu-indicator">
                    <span className="chess-piece">♟</span>
                  </div>
                </MenuItem>
                
                <MenuItem onClick={() => { handleClose(); navigate('/account'); }} className="dropdown-item account-item">
                  <div className="menu-icon-wrapper">
                    <PersonIcon className="menu-icon" />
                  </div>
                  <div className="menu-text">My Account</div>
                  <div className="menu-indicator">
                    <span className="chess-piece">♜</span>
                  </div>
                </MenuItem>
                
                <MenuItem onClick={() => { handleClose(); setShowGameHistory(true); }} className="dropdown-item history-item">
                  <div className="menu-icon-wrapper">
                    <HistoryIcon className="menu-icon" />
                  </div>
                  <div className="menu-text">Game History</div>
                  <div className="menu-indicator">
                    <span className="chess-piece">♞</span>
                  </div>
                </MenuItem>
                
                <MenuItem onClick={() => { handleClose(); navigate('/settings'); }} className="dropdown-item settings-item">
                  <div className="menu-icon-wrapper">
                    <Settings className="menu-icon" />
                  </div>
                  <div className="menu-text">Settings</div>
                  <div className="menu-indicator">
                    <span className="chess-piece">♝</span>
                  </div>
                </MenuItem>
                
                <div className="dropdown-divider"></div>
                
                <MenuItem 
                  onClick={handleLogout}
                  className="dropdown-item logout-item"
                >
                  <div className="menu-icon-wrapper logout">
                    <ExitToApp className="menu-icon" />
                  </div>
                  <div className="menu-text">Logout</div>
                  <div className="menu-indicator">
                    <span className="chess-piece">♚</span>
                  </div>
                </MenuItem>
                
                {user && (
                  <div className="dropdown-footer">
                    <div className="user-stats">
                      <div className="stat-item">
                        <span className="stat-value">0</span>
                        <span className="stat-label">Games</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-value">0</span>
                        <span className="stat-label">Wins</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-value">0%</span>
                        <span className="stat-label">Win Rate</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Menu>
          </div>
          
          <div className="notification-wrapper" style={{ position: 'relative' }}>
            <IconButton 
              aria-label="notifications" 
              className="notification-icon"
              onClick={handleNotificationClick}
            >
              <Badge 
                badgeContent={unreadCount} 
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none',
                    backgroundColor: '#e53e3e',
                    color: 'white',
                    fontWeight: 'bold'
                  }
                }}
              >
                <Notifications />
              </Badge>
            </IconButton>
            
            {/* Notification Dropdown */}
            {notificationDropdownOpen && (
              <div className="notification-dropdown" style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                width: '380px',
                maxHeight: '500px',
                background: 'linear-gradient(145deg, #1a2332 0%, #0f1419 100%)',
                borderRadius: '12px',
                border: '2px solid rgba(229, 163, 86, 0.3)',
                boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(229, 163, 86, 0.1)',
                zIndex: 10000,
                overflow: 'hidden'
              }}>
                {/* Header */}
                <div style={{
                  padding: '1rem 1.25rem',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{ 
                    color: '#f5f5f5', 
                    margin: 0, 
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <img 
                      src={notiIcon} 
                      alt="Notifications" 
                      style={{ 
                        width: '20px', 
                        height: '20px',
                        objectFit: 'contain'
                      }} 
                    />
                    Notifications
                    {unreadCount > 0 && (
                      <span style={{
                        background: '#e53e3e',
                        color: 'white',
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '10px',
                        fontWeight: '700'
                      }}>
                        {unreadCount}
                      </span>
                    )}
                  </h3>
                  <IconButton 
                    size="small" 
                    onClick={() => setNotificationDropdownOpen(false)}
                    sx={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </div>
                
                {/* Notifications List */}
                <div style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                  padding: '0.5rem'
                }}>
                  {notifications.length === 0 ? (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: 'rgba(255, 255, 255, 0.5)'
                    }}>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <img 
                          src={notiIcon} 
                          alt="No notifications" 
                          style={{ 
                            width: '60px', 
                            height: '60px',
                            objectFit: 'contain',
                            opacity: 0.5
                          }} 
                        />
                      </div>
                      <div style={{ fontSize: '0.95rem' }}>No notifications</div>
                      <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                        Challenge someone to play!
                      </div>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        style={{
                          background: 'rgba(42, 67, 97, 0.4)',
                          borderRadius: '10px',
                          padding: '1rem',
                          marginBottom: '0.5rem',
                          border: '1px solid rgba(229, 163, 86, 0.2)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* Notification Header */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          {/* Avatar */}
                          <div style={{
                            width: '45px',
                            height: '45px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #d48d3b, #e5a356)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            fontWeight: '700',
                            color: '#0f1419',
                            flexShrink: 0
                          }}>
                            {notification.data?.sender?.username?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          
                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              color: '#e5a356',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              marginBottom: '0.2rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem'
                            }}>
                              <img 
                                src={notiIcon} 
                                alt="Challenge" 
                                style={{ 
                                  width: '14px', 
                                  height: '14px',
                                  objectFit: 'contain'
                                }} 
                              />
                              {notification.title}
                            </div>
                            <div style={{
                              color: '#f5f5f5',
                              fontSize: '0.9rem',
                              lineHeight: '1.4'
                            }}>
                              {notification.message}
                            </div>
                            <div style={{
                              color: 'rgba(255, 255, 255, 0.5)',
                              fontSize: '0.75rem',
                              marginTop: '0.3rem'
                            }}>
                              {formatTimeAgo(notification.created_at)}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        {notification.type === 'challenge' && (
                          <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            marginTop: '0.5rem'
                          }}>
                            <button
                              onClick={() => handleAcceptChallenge(notification)}
                              style={{
                                flex: 1,
                                padding: '0.6rem',
                                background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() => handleDeclineChallenge(notification)}
                              style={{
                                flex: 1,
                                padding: '0.6rem',
                                background: 'rgba(229, 62, 62, 0.2)',
                                color: '#fc8181',
                                border: '1px solid rgba(229, 62, 62, 0.4)',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              ✕ Decline
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <IconButton aria-label="settings" className="settings-icon">
            <Settings />
          </IconButton>
        </div>
      </div>
      {challengeTarget && (
        <ChallengeModal
          targetUser={challengeTarget}
          onClose={() => setChallengeTarget(null)}
        />
      )}
      {showGameHistory && (
        <GameHistory onClose={() => setShowGameHistory(false)} />
      )}
    </header>
  );
};

export default Header;
