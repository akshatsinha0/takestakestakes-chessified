import { useState, useEffect, useRef } from 'react';
import './Header.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Avatar, Menu, MenuItem, IconButton, Badge, Fade } from '@mui/material';
import { 
  AccountCircle, 
  Notifications, 
  Settings, 
  ExitToApp, 
  KeyboardArrowDown,
  Person as PersonIcon
} from '@mui/icons-material';
import { getAllProfiles } from '../../utils/profileApi';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('/play');
  const [prevTab, setPrevTab] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [animationDirection, setAnimationDirection] = useState('right');
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const open = Boolean(anchorEl);
  
  // Navigation items
  const navItems = [
    { name: 'Play', path: '/play' },
    { name: 'Puzzles', path: '/puzzles' },
    { name: 'Lessons', path: '/lessons' },
    { name: 'Analysis', path: '/analysis' }
  ];

  useEffect(() => {
    // Set active tab based on current location
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
    // Animate the active indicator
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

  const handleLogout = () => {
    handleClose();
    logout();
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
                {user?.avatarUrl ? (
                  <Avatar src={user.avatarUrl} alt={user.username} className="user-avatar" />
                ) : (
                  <div className="avatar">
                    {user ? getInitial(user.username) : 'G'}
                    <div className="online-status"></div>
                  </div>
                )}
              </div>
              
              <div className="user-info">
                <span className="username">{user?.username || 'Guest'}</span>
                {user && <span className="rating">{user.rating}</span>}
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
                        {user?.avatarUrl ? (
                          <Avatar src={user.avatarUrl} alt={user.username || 'User'} />
                        ) : (
                          <div className="avatar-fallback">{user?.username?.charAt(0) || 'U'}</div>
                        )}
                      </div>
                      <div className="user-details-expanded">
                        <span className="user-fullname">{user?.username || 'User'}</span>
                        <span className="user-rating-expanded">
                          <span className="rating-value">{user?.rating || 1200}</span>
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
                        <span className="stat-value">42</span>
                        <span className="stat-label">Games</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-value">28</span>
                        <span className="stat-label">Wins</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-value">67%</span>
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
    </header>
  );
};

export default Header;
