import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import './Forms.css'
import googleLogo from '../../assets/GoogleLogo.png'
import facebookLogo from '../../assets/FacebookLogo.png'
import visibilityOn from '../../assets/VisibilityON.png'
import visibilityOff from '../../assets/VisibilityOFF.png'
import PasswordGenerator from './PasswordGenerator'

/*
(1.) Account creation form backed by the Convex + Better Auth `useAuth` context. `signUp`
     creates the account and provisions the profile in one normalized call returning
     `{ error: string | null }`; a null error means the session is active and the user is
     routed to the dashboard.
(2.) Client-side guards reject mismatched passwords and too-short usernames before calling
     the backend, giving immediate feedback, while the backend remains the authoritative
     validator of credential and uniqueness rules.
(3.) An optional password generator can fill both password fields, and social sign-up reuses
     the same OAuth entry points as login so a new user can onboard with one click; the
     submit button is disabled while the request is in flight.

This component is the presentational onboarding entry point. It depends only on the auth
context contract rather than any backend SDK, so the provider can change without edits here,
and it keeps no credential state beyond the live form, clearing naturally when the modal
closes.
*/

const MINIMUM_USERNAME_LENGTH = 3

const SignupForm = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate()
  const { signUp, signInWithGoogle, signInWithFacebook } = useAuth()

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  })
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target
    setFormData((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match")
      return
    }
    if (formData.username.length < MINIMUM_USERNAME_LENGTH) {
      toast.error('Username must be at least 3 characters long')
      return
    }
    setIsSubmitting(true)
    const { error } = await signUp(
      formData.email,
      formData.password,
      formData.username,
    )
    setIsSubmitting(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success('Account created successfully!')
    onClose()
    navigate('/dashboard', { replace: true })
  }

  const handleGeneratedPassword = (password: string) => {
    setFormData((previous) => ({
      ...previous,
      password,
      confirmPassword: password,
    }))
    setShowPasswordGenerator(false)
  }

  const handleGoogleSignup = async () => {
    const { error } = await signInWithGoogle()
    if (error) toast.error(error)
  }

  const handleFacebookSignup = async () => {
    const { error } = await signInWithFacebook()
    if (error) toast.error(error)
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
            type={passwordVisible ? 'text' : 'password'}
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
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? 'Hide password' : 'Show password'}
          >
            <img
              src={passwordVisible ? visibilityOn : visibilityOff}
              alt={passwordVisible ? 'Hide password' : 'Show password'}
              className="visibility-icon"
            />
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="confirm-password">Confirm Password</label>
        <div className="password-input-container">
          <input
            type={confirmPasswordVisible ? 'text' : 'password'}
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
            onClick={() => setConfirmPasswordVisible((visible) => !visible)}
            aria-label={
              confirmPasswordVisible ? 'Hide password' : 'Show password'
            }
          >
            <img
              src={confirmPasswordVisible ? visibilityOn : visibilityOff}
              alt={confirmPasswordVisible ? 'Hide password' : 'Show password'}
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
          <span>
            I agree to the <a href="#terms">Terms of Service</a> and{' '}
            <a href="#privacy">Privacy Policy</a>
          </span>
        </label>
      </div>

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? 'Creating Account...' : 'Begin Your Journey'}
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

export default SignupForm
