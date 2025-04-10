import { useState, useEffect, useRef } from 'react';
import './Header.css';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, Menu, MenuItem, IconButton, Badge } from '@mui/material';
import { AccountCircle, Notifications, Settings, ExitToApp, KeyboardArrowDown } from '@mui/icons-material';

interface HeaderProps {
  user: {
    username: string;
    rating: number;
    avatarUrl: string;
  };
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('/play');
  const [prevTab, setPrevTab] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [animationDirection, setAnimationDirection] = useState('right');
  const indicatorRef = useRef<HTMLDivElement>(null);
  
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

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
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
                {user.avatarUrl ? (
                  <Avatar src={user.avatarUrl} alt={user.username} className="user-avatar" />
                ) : (
                  <div className="avatar">
                    {getInitial(user.username)}
                    <div className="online-status"></div>
                  </div>
                )}
              </div>
              
              <div className="user-info">
                <span className="username">{user.username}</span>
                <span className="rating">{user.rating}</span>
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
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={open}
              onClose={handleClose}
              className="user-menu"
            >
              <MenuItem onClick={handleClose} className="menu-item">
                <AccountCircle className="menu-icon" /> Profile
              </MenuItem>
              <MenuItem onClick={handleClose} className="menu-item">
                My Account
              </MenuItem>
              <MenuItem onClick={handleClose} className="menu-item">
                <Settings className="menu-icon" /> Settings
              </MenuItem>
              <MenuItem onClick={handleClose} className="menu-item logout">
                <ExitToApp className="menu-icon" /> Logout
              </MenuItem>
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
