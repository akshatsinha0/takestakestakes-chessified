import { useRef, useEffect } from 'react';
import './Sidebar.css';
import logo from '../../assets/WebsiteLogo.png';
import lessonsLogo from '../../assets/LessonsLogo.png';
import puzzlesLogo from '../../assets/PuzzlesLogo.png';
import eventsLogo from '../../assets/ChessEventsLogo.png';
import membersLogo from '../../assets/MembersLogo.png';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar = ({ isOpen, toggleSidebar }: SidebarProps) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target as Node)) {
        toggleSidebar();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, toggleSidebar]);

  // Lock body scroll when sidebar is open (mobile)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'visible' : ''}`} onClick={toggleSidebar}></div>
      <aside ref={sidebarRef} className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src={logo} alt="TakesTakesTakes" className="sidebar-logo" />
          <button className="close-sidebar" onClick={toggleSidebar}>×</button>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li className="nav-item active">
              <a href="#play">
                <div className="nav-icon">♟️</div>
                <span className="nav-text">Play Chess</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#puzzles">
                <div className="nav-icon">
                  <img src={puzzlesLogo} alt="Puzzles" />
                </div>
                <span className="nav-text">Daily Puzzles</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#lessons">
                <div className="nav-icon">
                  <img src={lessonsLogo} alt="Lessons" />
                </div>
                <span className="nav-text">Strategic Lessons</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#events">
                <div className="nav-icon">
                  <img src={eventsLogo} alt="Events" />
                </div>
                <span className="nav-text">Tournaments</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#community">
                <div className="nav-icon">
                  <img src={membersLogo} alt="Community" />
                </div>
                <span className="nav-text">Community</span>
              </a>
            </li>
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <p>Already a member?</p>
          <button className="sidebar-login">Sign In</button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
