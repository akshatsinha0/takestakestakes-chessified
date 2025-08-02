import React, { useEffect, useState } from 'react';
import { useSupabaseAuthContext } from '../context/SupabaseAuthContext';
import { getProfile } from '../utils/profileApi';
import { Navigate } from 'react-router-dom';
import './Profile.css';

const Profile: React.FC = () => {
  const { user, profile: authProfile, loading: authLoading } = useSupabaseAuthContext();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Use profile from auth context if available, otherwise fetch it
    if (authProfile) {
      setProfile(authProfile);
      setLoading(false);
    } else {
      getProfile(user.id).then(setProfile).finally(() => setLoading(false));
    }
  }, [user, authProfile]);

  if (!user) return <Navigate to="/" />;
  if (loading) return <div className="profile-page">Loading...</div>;
  if (!profile) return <div className="profile-page">Profile not found.</div>;

  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} />
          ) : (
            <span className="avatar-fallback">{profile.username?.charAt(0)?.toUpperCase() || 'U'}</span>
          )}
        </div>
        <div className="profile-info">
          <h2>{profile.username}</h2>
          <div className="profile-email">{user.email}</div>
          <div className="profile-rating">ELO: <span>{profile.rating || 1200}</span></div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 