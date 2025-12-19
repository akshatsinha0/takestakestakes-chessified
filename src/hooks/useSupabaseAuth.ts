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

    // Safety timeout - 5 seconds should be enough
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Timeout reached after 5s, forcing loading to false')
        setAuthState(prev => {
          console.log('[Auth] Current state before timeout:', prev)
          return { ...prev, loading: false }
        })
      }
    }, 5000)

    // Get initial session
    const initAuth = async () => {
      try {
        console.log('[Auth] Initializing...')
        
        // Try to get session from storage first
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[Auth] Session error:', error)
          throw error
        }
        
        if (!mounted) return

        if (session?.user) {
          console.log('[Auth] Session found:', session.user.id)
          
          // Set user immediately, fetch profile in background
          setAuthState({
            user: session.user,
            profile: null,
            session,
            loading: false
          })
          
          clearTimeout(timeout)
          
          // Fetch profile asynchronously
          fetchUserProfile(session.user.id).then(profile => {
            if (mounted) {
              setAuthState(prev => ({
                ...prev,
                profile
              }))
            }
          }).catch(err => {
            console.error('[Auth] Profile fetch failed:', err)
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

        console.log('[Auth] Event:', event, 'Session:', !!session)

        if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            profile: null,
            session: null,
            loading: false
          })
          return
        }

        if (session?.user) {
          // Set user immediately
          setAuthState({
            user: session.user,
            profile: null,
            session,
            loading: false
          })
          
          // Fetch profile in background
          fetchUserProfile(session.user.id).then(profile => {
            if (mounted) {
              setAuthState(prev => ({
                ...prev,
                profile
              }))
            }
          })
        } else if (event === 'SIGNED_IN') {
          // If we get SIGNED_IN but no session, something is wrong
          console.error('[Auth] SIGNED_IN event but no session')
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
      console.log('[Auth] Fetching profile for:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('[Auth] Profile fetch error:', error)
        // Return a default profile instead of null
        return {
          id: userId,
          username: 'User',
          rating: 1200
        }
      }

      if (!data) {
        console.warn('[Auth] No profile found, returning default')
        return {
          id: userId,
          username: 'User',
          rating: 1200
        }
      }

      console.log('[Auth] Profile fetched successfully')
      return data
    } catch (error) {
      console.error('[Auth] Profile fetch exception:', error)
      // Return a default profile on exception
      return {
        id: userId,
        username: 'User',
        rating: 1200
      }
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
      // Set loading state immediately
      setAuthState(prev => ({ ...prev, loading: true }))
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setAuthState(prev => ({ ...prev, loading: false }))
        throw error
      }

      // Fetch profile immediately after successful login
      if (data.user) {
        const profile = await fetchUserProfile(data.user.id)
        setAuthState({
          user: data.user,
          profile,
          session: data.session,
          loading: false
        })
      }

      return { data, error: null }
    } catch (error) {
      console.error('[Auth] Signin error:', error)
      setAuthState(prev => ({ ...prev, loading: false }))
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
