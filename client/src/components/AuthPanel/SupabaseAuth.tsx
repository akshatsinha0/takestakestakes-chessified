import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function SupabaseAuth() {
  const { signup, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    try {
      await signup({ email, password, username });
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await login({ email, password });
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setMode('login')} disabled={mode === 'login'}>Login</button>
        <button onClick={() => setMode('signup')} disabled={mode === 'signup'}>Sign Up</button>
      </div>
      {mode === 'signup' && (
        <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      )}
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
      {mode === 'signup' ? (
        <button onClick={handleSignUp} disabled={loading}>Sign Up</button>
      ) : (
        <button onClick={handleSignIn} disabled={loading}>Sign In</button>
      )}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
} 