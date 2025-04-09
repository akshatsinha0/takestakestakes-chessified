import { useState } from 'react';
import './Forms.css';
import googleLogo from '../../assets/GoogleLogo.png';
import facebookLogo from '../../assets/FacebookLogo.png';
import visibilityOn from '../../assets/VisibilityON.png';
import visibilityOff from '../../assets/VisibilityOFF.png';
import PasswordGenerator from './PasswordGenerator';

const SignupForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });
  
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Signup attempt:', formData);
    // Handle signup logic here
  };
  
  const handleGeneratedPassword = (password: string) => {
    setFormData(prev => ({
      ...prev,
      password,
      confirmPassword: password
    }));
    setShowPasswordGenerator(false);
  };
  
  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2 className="form-title">Join the Grandmasters</h2>
      
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="ChessMaster2025"
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="signup-email">Email</label>
        <input
          type="email"
          id="signup-email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="youremail@example.com"
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="signup-password">Password</label>
        <div className="password-input-container">
          <input
            type={passwordVisible ? "text" : "password"}
            id="signup-password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a strong password"
            required
          />
          <button 
            type="button" 
            className="password-generate-button"
            onClick={() => setShowPasswordGenerator(true)}
          >
            Generate
          </button>
          <button 
            type="button"
            className="visibility-toggle"
            onClick={() => setPasswordVisible(!passwordVisible)}
            aria-label={passwordVisible ? "Hide password" : "Show password"}
          >
            <img 
              src={passwordVisible ? visibilityOn : visibilityOff} 
              alt={passwordVisible ? "Hide password" : "Show password"} 
              className="visibility-icon" 
            />
          </button>
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="confirm-password">Confirm Password</label>
        <div className="password-input-container">
          <input
            type={confirmPasswordVisible ? "text" : "password"}
            id="confirm-password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Verify your password"
            required
          />
          <button 
            type="button"
            className="visibility-toggle"
            onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
            aria-label={confirmPasswordVisible ? "Hide password" : "Show password"}
          >
            <img 
              src={confirmPasswordVisible ? visibilityOn : visibilityOff} 
              alt={confirmPasswordVisible ? "Hide password" : "Show password"} 
              className="visibility-icon" 
            />
          </button>
        </div>
      </div>
      
      <div className="form-options">
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="agreeTerms"
            checked={formData.agreeTerms}
            onChange={handleChange}
            required
          />
          <span>I agree to the <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a></span>
        </label>
      </div>
      
      <button type="submit" className="submit-button">
        Begin Your Journey
      </button>
      
      <div className="social-login">
        <p>Or sign up with</p>
        <div className="social-buttons">
          <button type="button" className="social-button google">
            <img src={googleLogo} alt="Google" className="social-icon" />
            <span>Google</span>
          </button>
          <button type="button" className="social-button facebook">
            <img src={facebookLogo} alt="Facebook" className="social-icon" />
            <span>Facebook</span>
          </button>
        </div>
      </div>
      
      {showPasswordGenerator && (
        <PasswordGenerator 
          onClose={() => setShowPasswordGenerator(false)}
          onSelectPassword={handleGeneratedPassword}
        />
      )}
    </form>
  );
};

export default SignupForm;
