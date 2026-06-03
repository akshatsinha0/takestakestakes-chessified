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

export function useAuthActions() {
  const ensureProfile = useMutation(api.profiles.ensureProfile)
  const updateProfileMutation = useMutation(api.profiles.updateProfile)

  const signIn = async (email: string, password: string) => {
    const { error } = await authClient.signIn.email({ email, password })
    return { error: error ? messageFrom(error, 'Sign in failed.') : null }
  }

  const signUp = async (email: string, password: string, username: string) => {
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: username,
    })
    if (error) {
      return { error: messageFrom(error, 'Sign up failed.') }
    }
    await ensureProfile({ username })
    return { error: null }
  }

  const socialSignIn = async (provider: SocialProvider) => {
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: callbackURL(),
    })
    return {
      error: error ? messageFrom(error, 'Social sign in failed.') : null,
    }
  }

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
