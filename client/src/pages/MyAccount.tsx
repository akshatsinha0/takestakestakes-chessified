import React, { useEffect, useState } from 'react';
import { useSupabaseAuthContext } from '../context/SupabaseAuthContext';
import { getProfile, updateProfile } from '../utils/profileApi';
import styles from './MyAccount.module.css';
import { Navigate } from 'react-router-dom';

const MyAccount: React.FC = () => {
  const { user, profile: authProfile, loading: authLoading } = useSupabaseAuthContext();
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Use profile from auth context if available, otherwise fetch it
    if (authProfile) {
      setProfile(authProfile);
      setUsername(authProfile.username || '');
      setLoading(false);
    } else {
      getProfile(user.id).then((p) => {
        setProfile(p);
        setUsername(p.username || '');
      }).finally(() => setLoading(false));
    }
  }, [user, authProfile]);

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    await updateProfile(user.id, { username });
    setSuccess(true);
    setSaving(false);
    setTimeout(() => setSuccess(false), 2000);
  };

  if (!user) return <Navigate to="/" />;
  if (loading) return <div className={styles['account-page']}>Loading...</div>;
  if (!profile) return <div className={styles['account-page']}>Account not found.</div>;

  return (
    <div className={styles['account-page']}>
      <div className={styles['account-card']}>
        <div className={styles['account-header']}>
          <div className={styles['account-avatar']}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} />
            ) : (
              <span className="avatar-fallback">{profile.username?.charAt(0)?.toUpperCase() || 'U'}</span>
            )}
          </div>
          <div className={styles['account-header-info']}>
            <h2>{profile.username}</h2>
            <div className={styles['account-rating']}>ELO: <span>{profile.rating || 1200}</span></div>
          </div>
        </div>
        <div className={styles['account-fields']}>
          <div className={styles['account-field']}>
            <label>Email</label>
            <input type="email" value={user.email} disabled />
          </div>
          <div className={styles['account-field']}>
            <label>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
        </div>
        <button className={styles['save-btn']} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        {success && <div className={styles['success-msg']}>Saved!</div>}
        <div className={styles['account-divider']}></div>
        <div className={styles['account-section']}>
          <h3>Change Password</h3>
          <div className={styles['account-field']}>
            <input type="password" placeholder="New password (coming soon)" disabled />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyAccount; 