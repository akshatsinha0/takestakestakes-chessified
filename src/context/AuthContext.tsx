import { createContext, useContext, useEffect, useMemo, ReactNode } from 'react'
import { useConvexAuth, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { useAuthActions } from '../hooks/useAuthActions'

/*
(1.) Provides authentication STATE to the React tree and pairs it with the actions from
     `useAuthActions`, so consumers read `user`/`profile`/`isAuthenticated`/`loading` and call
     `signIn`/`signUp`/social/`signOut`/`updateProfile` from one `useAuth()` hook. This is the
     Convex + Better Auth replacement for the former Supabase auth context, and no consumer
     references a backend-specific symbol.
(2.) Reactive identity comes from `useConvexAuth` (authentication and loading flags), while
     `api.auth.getAuthUser` and `api.profiles.getCurrentProfile` supply the user record and
     application profile. Both queries are skipped with `'skip'` until the session is
     authenticated, so an anonymous visitor issues no failing identity reads.
(3.) `loading` stays true until the dependent queries resolve for an authenticated session,
     preventing a flash where a user is known to be signed in but their profile has not yet
     arrived, which the route guards rely on to avoid premature redirects.
(4.) A safety effect provisions a profile when an authenticated user has none, covering
     social sign-in where no username was collected; the fallback username is derived from
     the account name or the email local-part. Because `ensureProfile` is idempotent, this
     effect is harmless when the email signup flow has already created the profile.
(5.) `user` is projected to a minimal `{ id, email, name }` shape so feature code depends on a
     stable contract rather than the raw Better Auth document, and `profile` is coerced from
     `undefined` (loading) to `null` (absent) to keep consumers free of a third state.

This module is the single source of authentication context for the application and the
boundary that hides the auth/data backend from feature code. Centralizing state derivation,
loading semantics, and one-time profile provisioning here means every screen observes
consistent auth behavior, and a future change to the identity backend is contained to this
file and the action hook it composes. The context throws when used outside its provider, which
surfaces wiring mistakes immediately rather than yielding confusing null identities at runtime.
*/

type AuthUser = { id: string; email: string; name: string }

type AuthContextValue = {
  user: AuthUser | null
  profile: Doc<'profiles'> | null
  isAuthenticated: boolean
  loading: boolean
} & ReturnType<typeof useAuthActions>

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { isLoading, isAuthenticated } = useConvexAuth()
  const actions = useAuthActions()

  const authUser = useQuery(api.auth.getAuthUser, isAuthenticated ? {} : 'skip')
  const profileDoc = useQuery(
    api.profiles.getCurrentProfile,
    isAuthenticated ? {} : 'skip',
  )

  const profile = profileDoc ?? null

  useEffect(() => {
    if (isAuthenticated && authUser && profileDoc === null) {
      const fallback = authUser.name || authUser.email.split('@')[0]
      void actions.ensureProfile(fallback)
    }
  }, [isAuthenticated, authUser, profileDoc, actions])

  const user: AuthUser | null = authUser
    ? { id: authUser._id, email: authUser.email, name: authUser.name }
    : null

  const loading =
    isLoading ||
    (isAuthenticated && (authUser === undefined || profileDoc === undefined))

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, isAuthenticated, loading, ...actions }),
    [user, profile, isAuthenticated, loading, actions],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
