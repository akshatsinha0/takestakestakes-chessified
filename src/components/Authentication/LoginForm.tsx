import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import './Forms.css'
import googleLogo from '../../assets/GoogleLogo.png'
import facebookLogo from '../../assets/FacebookLogo.png'
import visibilityOn from '../../assets/VisibilityON.png'
import visibilityOff from '../../assets/VisibilityOFF.png'

/*
(1.) Email/password sign-in form backed by the Convex + Better Auth `useAuth` context. It
     calls `signIn`, which returns a normalized `{ error: string | null }`, so success is
     simply a null error; on success it closes the modal and routes to the dashboard.
(2.) Social sign-in delegates to `signInWithGoogle`/`signInWithFacebook`, which initiate the
     OAuth redirect handled by the Better Auth HTTP routes; any returned error string is
     surfaced through a toast without leaking provider internals.
(3.) Local component state holds only the form fields and transient UI flags (password
     visibility, submitting); the password is never logged, and the submit button is disabled
     while the request is in flight to prevent duplicate submissions.

This component is the presentational entry point for returning users. It depends only on the
auth context contract, not on any backend SDK, so the authentication provider can change
without touching this file. Validation beyond "fields present" is intentionally delegated to
the server, keeping the form thin and the single source of truth for credential rules on the
backend.
*/

const LoginForm = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate()
  const { signIn, signInWithGoogle, signInWithFacebook } = useAuth()

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    const { error } = await signIn(formData.email, formData.password)
    setIsSubmitting(false)
    if (error) {
      toast.error(error)
      return
    }
    toast.success('Welcome back, Grandmaster!')
    onClose()
    navigate('/dashboard', { replace: true })
  }

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle()
    if (error) toast.error(error)
  }

  const handleFacebookLogin = async () => {
    const { error } = await signInWithFacebook()
    if (error) toast.error(error)
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
            type={passwordVisible ? 'text' : 'password'}
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

      <button type="submit" className="submit-button" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Enter the Arena'}
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

export default LoginForm
