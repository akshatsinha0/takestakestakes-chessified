import { getAuthConfigProvider } from '@convex-dev/better-auth/auth-config'
import type { AuthConfig } from 'convex/server'

/*
(1.) Declares the JWT auth provider Convex uses to validate identities on every
     query/mutation/action. `getAuthConfigProvider()` returns a `customJwt` provider
     whose issuer and JWKS endpoint resolve to this same deployment's Better Auth HTTP
     routes (registered in `convex/http.ts`), closing the loop between token issuance and
     verification within one deployment.
(2.) No static `jwks` value is passed, so Convex fetches the public key set from the
     component's `/.well-known` endpoint at runtime. A static JWKS (via
     `npx convex run auth:generateJwk | npx convex env set JWKS`) is an available future
     optimization to remove that fetch, but is intentionally omitted to keep setup
     CLI-only and configuration-free for now.
(3.) The object is typed `satisfies AuthConfig` so any drift from Convex's expected
     provider shape fails at compile time rather than silently breaking authentication.

This configuration tells the Convex runtime how to trust the bearer tokens minted by
Better Auth. Convex's identity system (`ctx.auth.getUserIdentity()`) only returns a user
when the incoming JWT is signed by a key advertised in one of these providers; therefore
this file is the trust anchor for all server-side authorization in the application. The
provider is generated dynamically rather than hard-coded so the issuer URL automatically
tracks the active deployment (dev vs. prod), eliminating environment-specific edits.
Edge cases — key rotation and multiple environments — are handled by the runtime JWKS
fetch, at the cost of a network lookup that the static-JWKS path can later eliminate.
*/
export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig
