import { useState, useEffect } from 'react';
import './PasswordGenerator.css';

interface PasswordGeneratorProps {
  onClose: () => void;
  onSelectPassword: (password: string) => void;
}

const PasswordGenerator = ({ onClose, onSelectPassword }: PasswordGeneratorProps) => {
  const [passwordOptions, setPasswordOptions] = useState({
    length: 12,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeSimilar: false,
    easyToRead: false
  });
  
  const [password, setPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [copied, setCopied] = useState(false);
  const [animatedIn, setAnimatedIn] = useState(false);
  
  useEffect(() => {
    setTimeout(() => {
      setAnimatedIn(true);
    }, 10);
    
    generatePassword();
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);
  
  useEffect(() => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    setPasswordStrength(strength);
  }, [password]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setPasswordOptions(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value)
    }));
  };
  
  const generatePassword = () => {
    let charset = '';
    if (passwordOptions.lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (passwordOptions.uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (passwordOptions.numbers) charset += '0123456789';
    if (passwordOptions.symbols) charset += '!@#$%^&*()_-+=<>?';
    
    if (passwordOptions.excludeSimilar) {
      charset = charset.replace(/[01IOl]/g, '');
    }
    
    if (passwordOptions.easyToRead) {
      charset = charset.replace(/[{}[\]()<>\/\\'"~,;:]/g, '');
    }
    
    if (charset === '') charset = 'abcdefghijklmnopqrstuvwxyz';
    
    let newPassword = '';
    for (let i = 0; i < passwordOptions.length; i++) {
      newPassword += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    setPassword(newPassword);
    setCopied(false);
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleClose = () => {
    setAnimatedIn(false);
    setTimeout(onClose, 300);
  };
  
  const handleUsePassword = () => {
    onSelectPassword(password);
  };
  
  const getStrengthClass = () => {
    if (passwordStrength < 2) return 'weak';
    if (passwordStrength < 4) return 'medium';
    return 'strong';
  };
  
  const getStrengthText = () => {
    if (passwordStrength < 2) return 'Weak';
    if (passwordStrength < 4) return 'Medium';
    return 'Strong';
  };
  
  return (
    <div className={`password-generator-overlay ${animatedIn ? 'visible' : ''}`} onClick={handleClose}>
      <div className="password-generator-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Strategic Password Generator</h3>
          <button className="close-modal" onClick={handleClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="password-display">
            <input 
              type="text" 
              value={password} 
              readOnly 
              onClick={copyToClipboard}
              aria-label="Generated password"
            />
            <button 
              className="copy-button" 
              onClick={copyToClipboard}
              title="Copy to clipboard"
              aria-label="Copy password"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          
          <div className="strength-meter">
            <div className="strength-label">Password Strength:</div>
            <div className="strength-bar-container">
              <div 
                className={`strength-bar ${getStrengthClass()}`} 
                style={{ width: `${(passwordStrength / 5) * 100}%` }}
              />
            </div>
            <div className={`strength-text ${getStrengthClass()}`}>
              {getStrengthText()}
            </div>
          </div>
          
          <div className="password-options">
            <div className="option-group">
              <label htmlFor="password-length">Password Length: {passwordOptions.length}</label>
              <div className="range-container">
                <input
                  type="range"
                  id="password-length"
                  name="length"
                  min="6"
                  max="30"
                  value={passwordOptions.length}
                  onChange={handleChange}
                  aria-label="Password length"
                />
                <div className="range-values">
                  <span>6</span>
                  <span>30</span>
                </div>
              </div>
            </div>
            
            <div className="checkbox-group">
              <div className="option-checkbox">
                <input
                  type="checkbox"
                  id="uppercase"
                  name="uppercase"
                  checked={passwordOptions.uppercase}
                  onChange={handleChange}
                  aria-label="Include uppercase letters"
                />
                <label htmlFor="uppercase">Include Uppercase Letters</label>
              </div>
              
              <div className="option-checkbox">
                <input
                  type="checkbox"
                  id="lowercase"
                  name="lowercase"
                  checked={passwordOptions.lowercase}
                  onChange={handleChange}
                  aria-label="Include lowercase letters"
                />
                <label htmlFor="lowercase">Include Lowercase Letters</label>
              </div>
              
              <div className="option-checkbox">
                <input
                  type="checkbox"
                  id="numbers"
                  name="numbers"
                  checked={passwordOptions.numbers}
                  onChange={handleChange}
                  aria-label="Include numbers"
                />
                <label htmlFor="numbers">Include Numbers</label>
              </div>
              
              <div className="option-checkbox">
                <input
                  type="checkbox"
                  id="symbols"
                  name="symbols"
                  checked={passwordOptions.symbols}
                  onChange={handleChange}
                  aria-label="Include symbols"
                />
                <label htmlFor="symbols">Include Symbols</label>
              </div>
              
              <div className="option-checkbox">
                <input
                  type="checkbox"
                  id="excludeSimilar"
                  name="excludeSimilar"
                  checked={passwordOptions.excludeSimilar}
                  onChange={handleChange}
                  aria-label="Exclude similar characters"
                />
                <label htmlFor="excludeSimilar">Exclude Similar Characters (0, O, 1, I, l)</label>
              </div>
              
              <div className="option-checkbox">
                <input
                  type="checkbox"
                  id="easyToRead"
                  name="easyToRead"
                  checked={passwordOptions.easyToRead}
                  onChange={handleChange}
                  aria-label="Easy to read"
                />
                <label htmlFor="easyToRead">Easy to Read (exclude ambiguous symbols)</label>
              </div>
            </div>
          </div>
          
          <div className="password-actions">
            <button 
              className="regenerate-button" 
              onClick={generatePassword}
              aria-label="Regenerate password"
            >
              Regenerate Password
            </button>
            <button 
              className="use-password-button" 
              onClick={handleUsePassword}
              aria-label="Use this password"
            >
              Use This Password
            </button>
          </div>
          
          <div className="password-tips">
            <h4>Chess Master's Tip:</h4>
            <p>Like in chess, a strong password combines multiple strategies. 
            Use a mix of characters and adequate length for best security.</p>
          </div>
        </div>
        
        <div className="scroll-indicator" aria-hidden="true" />
      </div>
    </div>
  );
};

export default PasswordGenerator;
