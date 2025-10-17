import { useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase, Profile } from '../lib/supabase'
import { toast } from 'react-toastify'
import { sessionManager } from '../utils/sessionManager'

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
    let updateInProgress = false
    
    // Safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('[Auth] Safety timeout reached, setting loading to false')
        setAuthState(prev => ({ ...prev, loading: false }))
      }
    }, 10000) // 10 second timeout
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('[Auth] Getting initial session...')
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (error) {
          console.error('[Auth] Error getting session:', error)
          setAuthState({ user: null, profile: null, session: null, loading: false })
          return
        }

        if (session?.user) {
          console.log('[Auth] Initial session found for user:', session.user.id)
          sessionManager.updateTimestamp()
          
          let profile = await fetchUserProfile(session.user.id)
          
          // If no profile exists and user has username in metadata, create profile
          if (!profile && session.user.user_metadata?.username) {
            try {
              await createUserProfile(session.user.id, session.user.user_metadata.username)
              profile = await fetchUserProfile(session.user.id)
            } catch (error) {
              console.error('[Auth] Failed to create profile on initial session:', error)
            }
          }
          
          if (mounted) {
            clearTimeout(safetyTimeout)
            setAuthState({
              user: session.user,
              profile,
              session,
              loading: false
            })
          }
        } else {
          console.log('[Auth] No initial session found')
          if (mounted) {
            clearTimeout(safetyTimeout)
            setAuthState({ user: null, profile: null, session: null, loading: false })
          }
        }
      } catch (error) {
        console.error('[Auth] Error in getInitialSession:', error)
        if (mounted) {
          setAuthState({ user: null, profile: null, session: null, loading: false })
        }
      }
    }

    getInitialSession()

    // Handle visibility change to refresh session
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !updateInProgress) {
        console.log('[Auth] Tab became visible, checking session...')
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await sessionManager.refreshSession()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        console.log('[Auth] State changed:', event, session?.user?.id)
        
        // Skip if update is in progress, but don't queue
        if (updateInProgress) {
          console.log('[Auth] Update already in progress, skipping...')
          return
        }
        
        updateInProgress = true
        
        try {
          if (session?.user) {
            sessionManager.updateTimestamp()
            
            let profile = await fetchUserProfile(session.user.id)
            
            // If no profile exists and user has username in metadata, create profile
            if (!profile && session.user.user_metadata?.username) {
              try {
                await createUserProfile(session.user.id, session.user.user_metadata.username)
                profile = await fetchUserProfile(session.user.id)
              } catch (error) {
                console.error('[Auth] Failed to create profile on auth state change:', error)
              }
            }
            
            if (mounted) {
              clearTimeout(safetyTimeout)
              setAuthState({
                user: session.user,
                profile,
                session,
                loading: false
              })
            }
          } else {
            // Clear state on logout
            sessionManager.clearSession()
            if (mounted) {
              clearTimeout(safetyTimeout)
              setAuthState({
                user: null,
                profile: null,
                session: null,
                loading: false
              })
            }
          }
        } catch (error) {
          console.error('[Auth] Error in auth state change handler:', error)
          if (mounted) {
            setAuthState(prev => ({ ...prev, loading: false }))
          }
        } finally {
          updateInProgress = false
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(safetyTimeout)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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
        console.error('Error fetching profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  const createUserProfile = async (userId: string, username: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert([
          { id: userId, username, rating: 1200 }
        ])

      if (error) {
        console.error('Error creating profile:', error)
        throw error
      }
    } catch (error) {
      console.error('Error creating profile:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      })

      if (error) throw error

      // Create profile if user is immediately confirmed (no email verification)
      if (data.user && data.session) {
        await createUserProfile(data.user.id, username)
      }

      if (data.user && !data.session) {
        toast.info('Please check your email to confirm your account')
      }

      return { data, error: null }
    } catch (error) {
      console.error('Signup error:', error)
      return { data: null, error: error as AuthError }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('[Auth] Starting signIn process...')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      console.log('[Auth] SignIn response:', { hasData: !!data, hasError: !!error })

      if (error) {
        console.error('[Auth] SignIn error:', error)
        throw error
      }

      // Wait for auth state to update
      if (data.session) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

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
      console.error('Google signin error:', error)
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
      console.error('Facebook signin error:', error)
      return { data: null, error: error as AuthError }
    }
  }

  const signOut = async () => {
    try {
      console.log('[Auth] Starting signOut process...')
      
      // Clear session manager data
      sessionManager.clearSession()
      
      // Clear local state first to prevent UI flicker
      setAuthState({
        user: null,
        profile: null,
        session: null,
        loading: false
      })
      
      // Then clear Supabase session
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[Auth] Signout error:', error)
      }
      
      console.log('[Auth] SignOut completed')
    } catch (error) {
      console.error('[Auth] Signout error:', error)
      // Ensure state is cleared even if signOut fails
      sessionManager.clearSession()
      setAuthState({
        user: null,
        profile: null,
        session: null,
        loading: false
      })
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
      console.error('Profile update error:', error)
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