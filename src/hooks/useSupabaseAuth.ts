import { useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'
import { toast } from 'react-toastify'

export interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
}

export const useSupabaseAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true
  })

  useEffect(() => {
    let mounted = true

    // Safety timeout
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Timeout reached, forcing loading to false')
        setAuthState(prev => ({ ...prev, loading: false }))
      }
    }, 3000)

    // Get initial session
    const initAuth = async () => {
      try {
        console.log('[Auth] Initializing...')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (session?.user) {
          console.log('[Auth] Session found:', session.user.id)
          const profile = await fetchUserProfile(session.user.id)
          clearTimeout(timeout)
          setAuthState({
            user: session.user,
            profile,
            session,
            loading: false
          })
        } else {
          console.log('[Auth] No session found')
          clearTimeout(timeout)
          setAuthState({
            user: null,
            profile: null,
            session: null,
            loading: false
          })
        }
      } catch (error) {
        console.error('[Auth] Init error:', error)
        clearTimeout(timeout)
        if (mounted) {
          setAuthState({
            user: null,
            profile: null,
            session: null,
            loading: false
          })
        }
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('[Auth] Event:', event)

        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id)
          setAuthState({
            user: session.user,
            profile,
            session,
            loading: false
          })
        } else {
          setAuthState({
            user: null,
            profile: null,
            session: null,
            loading: false
          })
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[Auth] Profile fetch error:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('[Auth] Profile fetch error:', error)
      return null
    }
  }

  const createUserProfile = async (userId: string, username: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert([{ id: userId, username, rating: 1200 }])

      if (error) throw error
    } catch (error) {
      console.error('[Auth] Profile create error:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      })

      if (error) throw error

      if (data.user && data.session) {
        await createUserProfile(data.user.id, username)
      }

      if (data.user && !data.session) {
        toast.info('Please check your email to confirm your account')
      }

      return { data, error: null }
    } catch (error) {
      console.error('[Auth] Signup error:', error)
      return { data: null, error: error as AuthError }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('[Auth] Signin error:', error)
      return { data: null, error: error as AuthError }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('[Auth] Google signin error:', error)
      return { data: null, error: error as AuthError }
    }
  }

  const signInWithFacebook = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('[Auth] Facebook signin error:', error)
      return { data: null, error: error as AuthError }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('[Auth] Signout error:', error)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!authState.user) return { error: 'No user logged in' }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authState.user.id)
        .select()
        .single()

      if (error) throw error

      setAuthState(prev => ({
        ...prev,
        profile: data
      }))

      return { data, error: null }
    } catch (error) {
      console.error('[Auth] Profile update error:', error)
      return { data: null, error }
    }
  }

  return {
    ...authState,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
    updateProfile,
    isAuthenticated: !!authState.user
  }
}
