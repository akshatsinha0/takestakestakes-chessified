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
  History as HistoryIcon
} from '@mui/icons-material';
import { getAllProfiles } from '../../utils/profileApi';
import ChallengeModal from '../ChallengeModal/ChallengeModal';
import GameHistory from '../GameHistory/GameHistory';

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
    setUserDropdownOpen((prev) => !prev);
    if (!userDropdownOpen) {
      setLoadingUsers(true);
      try {
        const users = await getAllProfiles();
        setAllUsers(users);
      } catch (e) {
        setAllUsers([]);
      }
      setLoadingUsers(false);
    }
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
                    {allUsers.map((u) => (
                      <div className="user-list-item" key={u.id}>
                        <div className="user-list-avatar">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.username} />
                          ) : (
                            <span className="avatar-fallback">{u.username?.charAt(0)?.toUpperCase() || 'U'}</span>
                          )}
                          <span className={`user-status-dot offline`}></span>
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
                    ))}
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
          
          <IconButton aria-label="notifications" className="notification-icon">
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>
          
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
