import { createAuthClient } from 'better-auth/react'
import {
  convexClient,
  crossDomainClient,
} from '@convex-dev/better-auth/client/plugins'

/*
(1.) Constructs the browser-side Better Auth client used by all React auth flows (sign-up,
     sign-in, social sign-in, sign-out). Its `baseURL` is the Convex deployment's `.site`
     HTTP origin (`VITE_CONVEX_SITE_URL`), where the routes from `convex/http.ts` are served.
(2.) `convexClient()` attaches the Better Auth session token to Convex requests, so the
     provider and every `useQuery`/`useMutation` automatically execute as the signed-in user;
     `crossDomainClient()` performs the cross-origin cookie and redirect handshake required
     because the SPA origin and the Convex `.site` auth origin differ, mirroring the server
     `crossDomain` plugin.
(3.) `SocialProvider` names the OAuth providers once so no component passes a raw provider
     string; both the client (here) and the server provider configuration reference the same
     identifiers, removing a class of typos that would silently break a login button.
(4.) `VITE_CONVEX_SITE_URL` is validated as present so a misconfigured environment fails
     immediately with an actionable message instead of producing opaque auth failures later.

This module is the single client-side entry point for authentication, intentionally thin so
it owns only transport and session configuration. Higher level hooks compose the typed
`authClient` methods, which keeps the React tree decoupled from auth internals; swapping
providers, adjusting cross-domain behavior, or upgrading the SDK touches exactly this file.
The exported client is a singleton suitable for the app-wide provider mounted in `main.tsx`,
and `SocialProvider` is exported alongside it so the provider vocabulary stays colocated with
the client that consumes it.
*/

export const SocialProvider = {
  Google: 'google',
  Facebook: 'facebook',
} as const

export type SocialProvider =
  (typeof SocialProvider)[keyof typeof SocialProvider]

const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL as string

if (!convexSiteUrl) {
  throw new Error(
    'Missing VITE_CONVEX_SITE_URL. Run `bunx convex dev` and set it in .env.local.',
  )
}

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [convexClient(), crossDomainClient()],
})
