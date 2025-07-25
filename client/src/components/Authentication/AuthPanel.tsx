import { useState, useEffect } from 'react';
import './AuthPanel.css';
import SupabaseLoginForm from './SupabaseLoginForm';
import SupabaseSignupForm from './SupabaseSignupForm';

interface AuthPanelProps {
  mode: 'login' | 'signup';
  closePanel: () => void;
  switchMode: (mode: 'login' | 'signup') => void;
}

const AuthPanel = ({ mode, closePanel, switchMode }: AuthPanelProps) => {
  const [animatedIn, setAnimatedIn] = useState(false);
  
  useEffect(() => {
    // Trigger animation after component mounts
    setTimeout(() => {
      setAnimatedIn(true);
    }, 10);
    
    // Handle escape key press
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closePanel]);

  const handleClose = () => {
    setAnimatedIn(false);
    setTimeout(closePanel, 300); // Wait for animation before removing
  };

  return (
    <div className={`auth-overlay ${animatedIn ? 'visible' : ''}`} onClick={handleClose}>
      <div className="auth-panel" onClick={e => e.stopPropagation()}>
        <button className="close-auth" onClick={handleClose}>×</button>
        
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Log In
          </button>
          <button 
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => switchMode('signup')}
          >
            Sign Up
          </button>
        </div>
        
        <div className="auth-content">
          {mode === 'login' ? 
            <SupabaseLoginForm onClose={handleClose} /> : 
            <SupabaseSignupForm onClose={handleClose} />
          }
        </div>
      </div>
    </div>
  );
};

export default AuthPanel;
