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
    
    const timeoutId = setTimeout(() => {
      setIsLoading(false)
      toast.error('Login timeout. Please clear browser data and try again.')
    }, 15000)
    
    try {
      console.log('Login form: Starting login process')
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const { data, error } = await signIn(formData.email, formData.password)
      
      clearTimeout(timeoutId)
      
      if (error) {
        console.error('Login form: Login error', error)
        if (error.message?.includes('Invalid login credentials')) {
          toast.error('Invalid email or password')
        } else if (error.message?.includes('Too many requests')) {
          toast.error('Too many login attempts. Please wait a few minutes and try again.')
        } else if (error.message?.includes('Email not confirmed')) {
          toast.error('Please check your email and confirm your account first')
        } else {
          toast.error(error.message || 'Login failed')
        }
        
        setIsLoading(false)
        return
      }
      
      if (data.user) {
        console.log('Login form: Login successful')
        toast.success('Welcome back, Grandmaster!')
        onClose()
        navigate('/dashboard')
      }
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Login form: Unexpected error', error)
      toast.error('An unexpected error occurred. Please try clearing your browser data.')
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