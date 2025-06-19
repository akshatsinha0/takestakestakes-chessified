import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Forms.css';
import googleLogo from '../../assets/GoogleLogo.png';
import facebookLogo from '../../assets/FacebookLogo.png';
import visibilityOn from '../../assets/VisibilityON.png';
import visibilityOff from '../../assets/VisibilityOFF.png';
import PasswordGenerator from './PasswordGenerator';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const SignupForm = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  
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
  const [isLoading, setIsLoading] = useState(false);
  const [showCheckEmail, setShowCheckEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const emailInputRef = useRef<HTMLInputElement>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setIsLoading(true);
    setShowCheckEmail(false);
    try {
      const result = await signup({ email: formData.email, password: formData.password, username: formData.username });
      // If signup returns a session, redirect. If not, show check email message.
      if (result && result.session) {
        toast.success("Account created successfully!");
        onClose();
        navigate('/dashboard');
      } else {
        setShowCheckEmail(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create account. Please try again.");
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGeneratedPassword = (password: string) => {
    setFormData(prev => ({
      ...prev,
      password,
      confirmPassword: password
    }));
    setShowPasswordGenerator(false);
  };

  const checkEmailExists = async (email: string) => {
    if (!email) return;
    // Query Supabase auth.users table via RPC or REST API (Supabase does not allow direct client-side access to auth.users)
    // Instead, try to sign up with a dummy password and catch the error
    const { error } = await supabase.auth.signUp({ email, password: 'dummy-password' });
    if (error && error.message.toLowerCase().includes('already registered')) {
      setEmailError('An account is registered with this email');
    } else {
      setEmailError('');
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) toast.error(error.message || 'Google signup failed');
    } catch (error) {
      toast.error('Google signup failed');
      console.error('Google signup error:', error);
    }
  };

  const handleFacebookSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'facebook' });
      if (error) toast.error(error.message || 'Facebook signup failed');
    } catch (error) {
      toast.error('Facebook signup failed');
      console.error('Facebook signup error:', error);
    }
  };

  useEffect(() => {
    // Check for confirmation or magic link in URL
    const url = new URL(window.location.href);
    const type = url.searchParams.get('type');
    if (type === 'signup' || type === 'magiclink') {
      supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
        if (data.session) {
          navigate('/dashboard');
        }
      });
    }
  }, [navigate]);
  
  useEffect(() => {
    // Supabase will automatically detect the session in the URL hash and store it
    // But you may want to redirect to dashboard after confirmation
    const url = new URL(window.location.href);
    const hash = url.hash;
    if (hash.includes('access_token') && hash.includes('type=signup')) {
      // Wait a tick for Supabase to process the session
      setTimeout(() => {
        supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
          if (data.session) {
            navigate('/dashboard');
          }
        });
      }, 500);
    }
  }, [navigate]);
  
  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2 className="form-title">Join the Grandmasters</h2>
      {showCheckEmail && (
        <div style={{ color: 'var(--accent)', marginBottom: 12 }}>
          Check your email to confirm your account before logging in.
        </div>
      )}
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
          onBlur={() => checkEmailExists(formData.email)}
          placeholder="youremail@example.com"
          required
          ref={emailInputRef}
        />
        {emailError && (
          <div style={{ color: 'red', marginTop: 4, fontSize: 13 }}>{emailError}</div>
        )}
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
      <button 
        type="submit" 
        className="submit-button"
        disabled={isLoading}
      >
        {isLoading ? "Creating Account..." : "Begin Your Journey"}
      </button>
      <div className="social-login">
        <p>Or sign up with</p>
        <div className="social-buttons">
          <button type="button" className="social-button google" onClick={handleGoogleSignup}>
            <img src={googleLogo} alt="Google" className="social-icon" />
            <span>Google</span>
          </button>
          <button type="button" className="social-button facebook" onClick={handleFacebookSignup}>
            <img src={facebookLogo} alt="Facebook" className="social-icon" />
            <span>Facebook</span>
          </button>
        </div>
      </div>
      {showPasswordGenerator && (
        <PasswordGenerator onSelectPassword={handleGeneratedPassword} onClose={() => setShowPasswordGenerator(false)} />
      )}
    </form>
  );
};

export default SignupForm;
