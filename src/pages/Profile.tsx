import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Profile.css'

/*
(1.) Renders the signed-in player's public profile straight from the `useAuth` context, which
     already exposes the reactive Convex profile, so the page needs no data fetch of its own and
     stays in sync automatically as the profile changes.
(2.) Route protection and load gating are derived from the same context: an unauthenticated
     visitor is redirected home, and a loading state is shown until the profile resolves, which
     prevents a flash of "not found" before the reactive query returns.
(3.) The avatar falls back to the username's initial when no image is set, and rating defaults to
     the seeded value, so the card always renders a complete identity even for a brand-new account.

This page is a thin reactive view over the authentication context. Removing its former direct
profile fetch eliminates a redundant data path and a source of stale state, since the context's
Convex query is the single source of truth for the current user's profile across the application.
*/

const Profile = () => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <div className="profile-page">Loading...</div>
  }
  if (!user) {
    return <Navigate to="/" />
  }
  if (!profile) {
    return <div className="profile-page">Profile not found.</div>
  }

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.username} />
          ) : (
            <span className="avatar-fallback">
              {profile.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="profile-info">
          <h2>{profile.username}</h2>
          <div className="profile-email">{user.email}</div>
          <div className="profile-rating">
            ELO: <span>{profile.rating}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
