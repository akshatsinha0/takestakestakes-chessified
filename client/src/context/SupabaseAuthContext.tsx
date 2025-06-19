import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  return <AuthContext.Provider value={{ session }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 