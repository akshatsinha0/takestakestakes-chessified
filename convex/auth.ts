import { betterAuth } from 'better-auth'
import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex, crossDomain } from '@convex-dev/better-auth/plugins'
import { components } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import authConfig from './auth.config'

/*
(1.) `authComponent` is the typed backend handle for the Better Auth component, created
     once via `createClient<DataModel>(components.betterAuth)`. It exposes the database
     adapter, HTTP route registration, identity helpers (`safeGetAuthUser`/`getAuthUser`),
     and the `clientApi()` query used by the React auth boundary.
(2.) `createAuth(ctx)` is a per-request factory (NOT a singleton) because the Better Auth
     instance must be bound to the current Convex context's transaction via
     `authComponent.adapter(ctx)`. Convex has no request headers, so the `convex()` and
     `crossDomain()` plugins reconstruct session context from the bearer JWT instead.
(3.) Email/password is always enabled with `requireEmailVerification: false` to keep the
     local/dev flow fully CLI-driven and friction-free. Social providers are added
     CONDITIONALLY by `enabledSocialProviders()` — only when both client id and secret env
     vars exist — so Stage 1 builds and runs with zero OAuth setup, and Stage 2 enables
     Google/Facebook by setting env vars alone, with no code change.
(4.) `crossDomain({ siteUrl })` is required because the SPA origin (Vite dev server) and
     the Convex `.site` auth origin differ; it manages cross-origin cookies/redirects.
(5.) `getAuthUser` is re-exported from `authComponent.clientApi()`, registering the public
     `api.auth.getAuthUser` query consumed by `ConvexBetterAuthProvider` on the client.

This module is the authentication core of the migrated backend and the trust boundary
between Better Auth and the chess domain. Every authenticated server function ultimately
relies on the JWT verification configured here and in `auth.config.ts`. The factory shape
lets a single declarative definition serve queries, mutations, actions, and HTTP routes
while remaining transaction-correct, and the conditional social-provider assembly makes
provider rollout a configuration concern rather than a deployment concern — improving
scalability across environments (dev, preview, prod) where different credentials apply.
Edge cases handled: missing OAuth credentials degrade gracefully to password-only;
`SITE_URL` is read once and shared so issuer, base URL, and cross-domain origin stay
consistent. Assumes `SITE_URL` and (optionally) the provider credentials are set via
`npx convex env set`. Future extensibility: add 2FA, magic links, or more providers by
extending the options object without altering consumers.
*/
const siteUrl = process.env.SITE_URL as string

type ProviderCredentials = { clientId: string; clientSecret: string }

const enabledSocialProviders = (): Record<string, ProviderCredentials> => {
  const providers: Record<string, ProviderCredentials> = {}
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }
  }
  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    providers.facebook = {
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }
  }
  return providers
}

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: enabledSocialProviders(),
    plugins: [convex({ authConfig }), crossDomain({ siteUrl })],
  })

export const { getAuthUser } = authComponent.clientApi()
