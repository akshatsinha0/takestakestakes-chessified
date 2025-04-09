import { useState, useEffect } from 'react';
import './MainLayout.css';
import centralBoard from '../../assets/CentralBoardImage.png';
import logo from '../../assets/WebsiteLogo.png';
import FAQSection from '../FAQ/FAQSection';

interface MainLayoutProps {
  toggleSidebar: () => void;
  openLogin: () => void;
  openSignup: () => void;
}

const MainLayout = ({ toggleSidebar, openLogin, openSignup }: MainLayoutProps) => {
  const [activeUsers, setActiveUsers] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [animationComplete, setAnimationComplete] = useState(false);
  
  // Simulate increasing stats for visual effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers(prev => Math.min(prev + Math.floor(Math.random() * 5), 12500));
      setGamesPlayed(prev => Math.min(prev + Math.floor(Math.random() * 10), 185000));
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Control typewriter animation completion with a longer timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 3000); // Increased from 2500ms to ensure animation completes
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="main-layout">
      <header className="header">
        <div className="header-left">
          <button className="menu-button" onClick={toggleSidebar} aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
          <div className="logo-container">
            <div className={`typewriter-text ${animationComplete ? 'complete' : ''}`}>
              TAKES TAKES TAKES
            </div>
            <img 
              src={logo} 
              alt="TakesTakesTakes" 
              className={`header-logo ${animationComplete ? 'visible' : ''}`} 
            />
          </div>
        </div>
        <div className="header-right">
          <button className="auth-button login" onClick={openLogin}>Log In</button>
          <button className="auth-button signup" onClick={openSignup}>Sign Up</button>
        </div>
      </header>
      
      <main className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Master the Board.<br />Elevate Your Game.</h1>
          <p className="hero-subtitle">
            Join TakesTakesTakes, where strategic minds converge.
            Experience chess like never before with real-time matches and advanced training tools.
          </p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">{activeUsers.toLocaleString()}</span>
              <span className="stat-label">Players Online</span>
            </div>
            <div className="stat">
              <span className="stat-number">{gamesPlayed.toLocaleString()}</span>
              <span className="stat-label">Games Today</span>
            </div>
          </div>
          <button className="cta-button" onClick={openSignup}>Play Now - It's Free</button>
        </div>
        <div className="hero-visual">
          <div className="board-container">
            <img src={centralBoard} alt="Chess board" className="board-image" />
            <div className="board-glow"></div>
          </div>
        </div>
      </main>
      <FAQSection />
    </div>
  );
};

export default MainLayout;
