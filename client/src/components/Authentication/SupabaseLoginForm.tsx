import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useSupabaseAuthContext } from '../../context/SupabaseAuthContext'
import './Forms.css'
import googleLogo from '../../assets/GoogleLogo.png'
import facebookLogo from '../../assets/FacebookLogo.png'
import visibilityOn from '../../assets/VisibilityON.png'
import visibilityOff from '../../assets/VisibilityOFF.png'

const SupabaseLoginForm = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate()
  const { signIn, signInWithGoogle, signInWithFacebook } = useSupabaseAuthContext()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  
  const [passwordVisible, setPasswordVisible] = useState(false)
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
    setIsLoading(true)
    
    try {
      const { data, error } = await signIn(formData.email, formData.password)
      
      if (error) {
        toast.error(error.message || 'Login failed')
        return
      }
      
      if (data.user) {
        toast.success('Welcome back, Grandmaster!')
        onClose()
        navigate('/dashboard')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleGoogleLogin = async () => {
    try {
      const { error } = await signInWithGoogle()
      if (error) {
        toast.error(error.message || 'Google login failed')
      }
    } catch (error) {
      toast.error('Google login failed')
      console.error('Google login error:', error)
    }
  }
  
  const handleFacebookLogin = async () => {
    try {
      const { error } = await signInWithFacebook()
      if (error) {
        toast.error(error.message || 'Facebook login failed')
      }
    } catch (error) {
      toast.error('Facebook login failed')
      console.error('Facebook login error:', error)
    }
  }
  
  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2 className="form-title">Welcome Back, Strategist</h2>
      
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="youremail@example.com"
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <div className="password-input-container">
          <input
            type={passwordVisible ? "text" : "password"}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Your secret key"
            required
          />
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
      
      <div className="form-options">
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleChange}
          />
          <span>Remember me</span>
        </label>
        
        <a href="#forgot-password" className="forgot-password">
          Forgot password?
        </a>
      </div>
      
      <button 
        type="submit" 
        className="submit-button"
        disabled={isLoading}
      >
        {isLoading ? "Logging in..." : "Enter the Arena"}
      </button>
      
      <div className="social-login">
        <p>Or continue with</p>
        <div className="social-buttons">
          <button 
            type="button" 
            className="social-button google"
            onClick={handleGoogleLogin}
          >
            <img src={googleLogo} alt="Google" className="social-icon" />
            <span>Google</span>
          </button>
          <button 
            type="button" 
            className="social-button facebook"
            onClick={handleFacebookLogin}
          >
            <img src={facebookLogo} alt="Facebook" className="social-icon" />
            <span>Facebook</span>
          </button>
        </div>
      </div>
    </form>
  )
}

export default SupabaseLoginForm