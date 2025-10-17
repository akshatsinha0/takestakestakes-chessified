import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useSupabaseAuthContext } from '../../context/SupabaseAuthContext'
import { authErrorHandler } from '../../utils/authErrorHandler'
import { sessionManager } from '../../utils/sessionManager'
import './Forms.css'
import googleLogo from '../../assets/GoogleLogo.png'
import facebookLogo from '../../assets/FacebookLogo.png'
import visibilityOn from '../../assets/VisibilityON.png'
import visibilityOff from '../../assets/VisibilityOFF.png'
import PasswordGenerator from './PasswordGenerator'

const SupabaseSignupForm = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate()
  const { signUp, signInWithGoogle, signInWithFacebook } = useSupabaseAuthContext()
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  })
  
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match")
      return
    }
    
    if (formData.username.length < 3) {
      toast.error("Username must be at least 3 characters long")
      return
    }
    
    setIsLoading(true)
    
    try {
      const { data, error } = await signUp(formData.email, formData.password, formData.username)
      
      if (error) {
        authErrorHandler.showError(error)
        return
      }
      
      if (data.user) {
        if (data.session) {
          sessionManager.updateTimestamp()
          toast.success('Account created successfully!')
          onClose()
          navigate('/dashboard')
        } else {
          toast.info('Please check your email to confirm your account')
          onClose()
        }
      }
    } catch (error) {
      console.error('[SignupForm] Unexpected error:', error)
      authErrorHandler.showError(error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleGeneratedPassword = (password: string) => {
    setFormData(prev => ({
      ...prev,
      password,
      confirmPassword: password
    }))
    setShowPasswordGenerator(false)
  }
  
  const handleGoogleSignup = async () => {
    try {
      const { error } = await signInWithGoogle()
      if (error) {
        toast.error(error.message || 'Google signup failed')
      }
    } catch (error) {
      toast.error('Google signup failed')
      console.error('Google signup error:', error)
    }
  }
  
  const handleFacebookSignup = async () => {
    try {
      const { error } = await signInWithFacebook()
      if (error) {
        toast.error(error.message || 'Facebook signup failed')
      }
    } catch (error) {
      toast.error('Facebook signup failed')
      console.error('Facebook signup error:', error)
    }
  }
  
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
          minLength={3}
          maxLength={20}
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
            minLength={6}
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
          <button 
            type="button" 
            className="social-button google"
            onClick={handleGoogleSignup}
          >
            <img src={googleLogo} alt="Google" className="social-icon" />
            <span>Google</span>
          </button>
          <button 
            type="button" 
            className="social-button facebook"
            onClick={handleFacebookSignup}
          >
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
  )
}

export default SupabaseSignupForm