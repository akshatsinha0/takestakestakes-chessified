import { createContext, useContext, ReactNode } from 'react'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'
import { Profile } from '../lib/supabase'
import { User, Session, AuthError } from '@supabase/supabase-js'

interface SupabaseAuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  signUp: (email: string, password: string, username: string) => Promise<{ data: any; error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>
  signInWithGoogle: () => Promise<{ data: any; error: AuthError | null }>
  signInWithFacebook: () => Promise<{ data: any; error: AuthError | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ data: any; error: any } | { error: string; data?: undefined }>
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined)

export const useSupabaseAuthContext = () => {
  const context = useContext(SupabaseAuthContext)
  if (context === undefined) {
    throw new Error('useSupabaseAuthContext must be used within a SupabaseAuthProvider')
  }
  return context
}

export const SupabaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useSupabaseAuth()

  return (
    <SupabaseAuthContext.Provider value={auth}>
      {children}
    </SupabaseAuthContext.Provider>
  )
}
