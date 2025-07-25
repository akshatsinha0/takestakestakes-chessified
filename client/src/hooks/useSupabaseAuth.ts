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
    let isUpdatingRef = false
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setAuthState(prev => ({ ...prev, loading: false }))
          return
        }

        if (session?.user) {
          console.log('Initial session found for user:', session.user.id)
          let profile = await fetchUserProfile(session.user.id)
          
          // If no profile exists and user has username in metadata, create profile
          if (!profile && session.user.user_metadata?.username) {
            try {
              await createUserProfile(session.user.id, session.user.user_metadata.username)
              profile = await fetchUserProfile(session.user.id)
            } catch (error) {
              console.error('Failed to create profile on initial session:', error)
            }
          }
          
          setAuthState({
            user: session.user,
            profile,
            session,
            loading: false
          })
        } else {
          console.log('No initial session found')
          setAuthState(prev => ({ ...prev, loading: false }))
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        setAuthState(prev => ({ ...prev, loading: false }))
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        // Prevent multiple simultaneous updates using ref
        if (isUpdatingRef) {
          console.log('Auth state update already in progress, skipping...')
          return
        }
        
        isUpdatingRef = true
        
        try {
          if (session?.user) {
            let profile = await fetchUserProfile(session.user.id)
            
            // If no profile exists and user has username in metadata, create profile
            if (!profile && session.user.user_metadata?.username) {
              try {
                await createUserProfile(session.user.id, session.user.user_metadata.username)
                profile = await fetchUserProfile(session.user.id)
              } catch (error) {
                console.error('Failed to create profile on auth state change:', error)
                // Continue without profile if creation fails
              }
            }
            
            setAuthState({
              user: session.user,
              profile,
              session,
              loading: false
            })
          } else {
            // Clear state on logout
            setAuthState({
              user: null,
              profile: null,
              session: null,
              loading: false
            })
          }
        } catch (error) {
          console.error('Error in auth state change handler:', error)
          setAuthState(prev => ({ ...prev, loading: false }))
        } finally {
          isUpdatingRef = false
        }
      }
    )

    return () => {
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
      console.log('Starting signIn process...')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      console.log('SignIn response:', { data: !!data, error: !!error })

      if (error) {
        console.error('SignIn error:', error)
        throw error
      }

      return { data, error: null }
    } catch (error) {
      console.error('Signin error:', error)
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
      console.log('Starting signOut process...')
      
      // Let Supabase handle the session cleanup properly
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Signout error:', error)
        // Don't throw error, continue with cleanup
      }
      
      // Clear local state after Supabase cleanup
      setAuthState({
        user: null,
        profile: null,
        session: null,
        loading: false
      })
      
      console.log('SignOut completed')
    } catch (error) {
      console.error('Signout error:', error)
      // Even if signOut fails, clear local state
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