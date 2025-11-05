import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createProfile, getProfile } from '../utils/profileApi';

interface User {
  id: string;
  email: string;
  username?: string;
  rating?: number;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  signup: (userData: { email: string; password: string; username: string }) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        let profile = await getProfile(session.user.id).catch(() => null);
        if (!profile) {
          // Use a generic username instead of email prefix
          await createProfile({ id: session.user.id, username: 'User' });
          profile = await getProfile(session.user.id).catch(() => null);
        }
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          username: profile?.username || 'User',
          rating: profile?.rating,
          avatarUrl: profile?.avatar_url,
        });
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });
    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        let profile = await getProfile(session.user.id).catch(() => null);
        if (!profile) {
          // Use a generic username instead of email prefix
          await createProfile({ id: session.user.id, username: 'User' });
          profile = await getProfile(session.user.id).catch(() => null);
        }
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          username: profile?.username || 'User',
          rating: profile?.rating,
          avatarUrl: profile?.avatar_url,
        });
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  const login = async ({ email, password }: { email: string; password: string }) => {
    console.log('Login: starting signInWithPassword');
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login: error from supabase', error);
      throw error;
    }
    if (data.user) {
      console.log('Login: got user', data.user);
      let profile = await getProfile(data.user.id).catch((e) => {
        console.error('Login: getProfile failed', e);
        return null;
      });
      if (!profile) {
        // Prompt for username or auto-generate a unique one
        const baseUsername = data.user.email?.split('@')[0] || 'User';
        let username = baseUsername;
        let suffix = 1;
        // Ensure username is unique
        while (true) {
          const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .single();
          if (!existing) break;
          username = `${baseUsername}${suffix}`;
          suffix++;
        }
        await createProfile({ id: data.user.id, username });
        profile = await getProfile(data.user.id).catch((e) => {
          console.error('Login: getProfile after create failed', e);
          return null;
        });
      }
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        username: profile?.username || 'User',
        rating: profile?.rating,
        avatarUrl: profile?.avatar_url,
      });
      setIsAuthenticated(true);
    }
    console.log('Login: finished');
  };

  const signup = async ({ email, password, username }: { email: string; password: string; username: string }) => {
    const { error, data } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // Only create profile if session is present (auto-confirmed)
    if (data.session && data.user) {
      // Check if username is taken
      const { data: existing, error: existingError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();
      if (existing) {
        throw new Error('Username already taken');
      }
      await createProfile({ id: data.user.id, username });
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        username,
        rating: 1200,
      });
      setIsAuthenticated(true);
    }
    // Return the result so the form can check for session and show the right message
    return data;
  };

  const logout = async () => {
    console.log('Logout: signing out from Supabase');
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
