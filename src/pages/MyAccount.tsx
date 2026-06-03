import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './MyAccount.module.css'

/*
(1.) Account settings page that reads the player's profile from the `useAuth` context and edits
     the user-controlled username through the context's `updateProfile`, which writes to Convex and
     re-renders every observer reactively, so no manual refetch is needed after saving.
(2.) The username field is seeded from the current profile when it loads, and saving submits the
     full editable set (username plus the existing bio and avatar) because the underlying mutation
     takes complete values rather than partial updates, matching the project's no-optional rule.
(3.) Route protection and load gating derive from the context, redirecting unauthenticated users
     and showing a loading state until the profile resolves, so the form never renders against an
     absent profile.

This page is a focused editor over the authentication context's profile. Delegating persistence to
the shared `updateProfile` keeps account edits consistent with how the rest of the app mutates
profile data and removes the previous direct data-access path, leaving the Convex profile as the
single source of truth.
*/

const SAVED_NOTICE_MS = 2000

const MyAccount = () => {
  const { user, profile, updateProfile } = useAuth()
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setUsername(profile.username)
    }
  }, [profile])

  const handleSave = async () => {
    if (!profile) {
      return
    }
    setSaving(true)
    await updateProfile({
      username,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), SAVED_NOTICE_MS)
  }

  if (!user) {
    return <Navigate to='/' />
  }
  if (!profile) {
    return <div className={styles['account-page']}>Loading...</div>
  }

  return (
    <div className={styles['account-page']}>
      <div className={styles['account-card']}>
        <div className={styles['account-header']}>
          <div className={styles['account-avatar']}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.username} />
            ) : (
              <span className='avatar-fallback'>
                {profile.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className={styles['account-header-info']}>
            <h2>{profile.username}</h2>
            <div className={styles['account-rating']}>
              ELO: <span>{profile.rating}</span>
            </div>
          </div>
        </div>
        <div className={styles['account-fields']}>
          <div className={styles['account-field']}>
            <label>Email</label>
            <input type='email' value={user.email} disabled />
          </div>
          <div className={styles['account-field']}>
            <label>Username</label>
            <input
              type='text'
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
        </div>
        <button
          className={styles['save-btn']}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {saved && <div className={styles['success-msg']}>Saved!</div>}
      </div>
    </div>
  )
}

export default MyAccount
