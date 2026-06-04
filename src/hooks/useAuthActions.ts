import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { authClient, SocialProvider } from '../lib/auth-client'

/*
(1.) Exposes the imperative authentication actions the UI invokes, each normalized to a
     uniform `{ error: string | null }` result so forms branch on a single shape instead of
     decoding provider-specific responses. `null` error means success.
(2.) `signUp` performs two ordered steps in one call: it creates the Better Auth account,
     and on success provisions the application profile through `api.profiles.ensureProfile`
     with the chosen username. `ensureProfile` is idempotent, so a retry or a concurrent
     provisioning attempt cannot create a duplicate profile.
(3.) Social sign-in routes through the shared `SocialProvider` identifiers and sends the
     browser to a `callbackURL` derived from `window.location.origin`, so the redirect target
     is correct in every environment (dev, preview, production) without a hardcoded host.
(4.) `ensureProfile` is also returned on its own so the auth provider can run it as a safety
     net for accounts created outside the email form (social sign-in, where no username is
     collected up front), keeping profile creation in one place rather than duplicated.
(5.) Error text is extracted defensively from the Better Auth error object, falling back to a
     generic message, so a malformed error never surfaces as `undefined` to the user.

This hook is the action half of the authentication layer, paired with the state exposed by
`AuthContext`. Centralizing the calls here means every entry point (login form, signup form,
social buttons, account screen) shares identical success and error semantics and a single
definition of what "signing up" entails end to end, including profile provisioning. Keeping
these as plain async functions returning normalized results makes them trivial to call from
event handlers and to reason about without inspecting SDK internals at each site.
*/

const messageFrom = (
  error: { message?: string } | null,
  fallback: string,
): string => error?.message ?? fallback

const callbackURL = (): string => `${window.location.origin}/dashboard`

type AuthCall = () => Promise<{ error: { message?: string } | null }>

// Runs a Better Auth client call and ALWAYS resolves to a normalized result,
// never throwing. A thrown error (network failure, blocked request, CSP) is
// caught and logged with its real cause so the UI surfaces what actually
// happened instead of hanging on a pending promise.
const runAuth = async (context: string, fallback: string, call: AuthCall) => {
  try {
    const { error } = await call()
    if (error) {
      console.error(`[auth] ${context} returned an error:`, error)
      return { error: messageFrom(error, fallback) }
    }
    return { error: null }
  } catch (cause) {
    console.error(`[auth] ${context} threw:`, cause)
    const message = cause instanceof Error ? cause.message : fallback
    return { error: message }
  }
}

export function useAuthActions() {
  const ensureProfile = useMutation(api.profiles.ensureProfile)
  const updateProfileMutation = useMutation(api.profiles.updateProfile)

  const signIn = (email: string, password: string) =>
    runAuth('signIn', 'Sign in failed.', () =>
      authClient.signIn.email({ email, password }),
    )

  const signUp = async (email: string, password: string, username: string) => {
    const result = await runAuth('signUp', 'Sign up failed.', () =>
      authClient.signUp.email({ email, password, name: username }),
    )
    if (result.error) {
      return result
    }
    // Best-effort immediate profile creation. The Convex client may not have
    // attached the new session token yet, in which case this throws
    // UNAUTHENTICATED; that is non-fatal because the AuthProvider effect
    // provisions the profile (with this same username) once the session is
    // active.
    try {
      await ensureProfile({ username })
    } catch (cause) {
      console.error('[auth] post-signup ensureProfile deferred:', cause)
    }
    return { error: null }
  }

  const socialSignIn = (provider: SocialProvider) =>
    runAuth(`socialSignIn(${provider})`, 'Social sign in failed.', () =>
      authClient.signIn.social({ provider, callbackURL: callbackURL() }),
    )

  return {
    signIn,
    signUp,
    signInWithGoogle: () => socialSignIn(SocialProvider.Google),
    signInWithFacebook: () => socialSignIn(SocialProvider.Facebook),
    signOut: async () => {
      await authClient.signOut()
    },
    ensureProfile: (username: string) => ensureProfile({ username }),
    updateProfile: async (input: {
      username: string
      bio: string
      avatarUrl: string
    }) => {
      await updateProfileMutation(input)
      return { error: null }
    },
  }
}
