import { createAuthClient } from "better-auth/react";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";

/*
(1.) Constructs the browser-side Better Auth client used by all React auth UI
     (sign-up, sign-in, social sign-in, sign-out). Its `baseURL` points at the Convex
     deployment's `.site` HTTP origin (`VITE_CONVEX_SITE_URL`), where the routes from
     `convex/http.ts` are served.
(2.) The `convexClient()` plugin bridges Better Auth sessions into Convex by attaching the
     session JWT to Convex requests, so `ConvexBetterAuthProvider` and every `useQuery`/
     `useMutation` automatically run as the authenticated user.
(3.) The `crossDomainClient()` plugin handles the cross-origin cookie/redirect handshake
     required because the SPA origin and the Convex `.site` auth origin differ — the client
     counterpart to the server-side `crossDomain` plugin in `convex/auth.ts`.
(4.) `VITE_CONVEX_SITE_URL` is injected at build time by Vite from `.env.local` and is the
     `.site` sibling of `VITE_CONVEX_URL`; it is validated as defined so a misconfigured
     environment fails fast and loudly rather than producing silent auth failures.

This module is the single entry point for authentication on the client and is intentionally
thin: it owns transport/session configuration only, exposing typed `authClient` methods
(`authClient.signIn.email`, `authClient.signUp.email`, `authClient.signIn.social`,
`authClient.signOut`) that higher-level hooks and context providers compose. Concentrating
this wiring in one file means swapping providers, adjusting CORS/cross-domain behavior, or
upgrading the auth SDK touches exactly one location, which keeps the React tree decoupled
from auth internals and easy to reason about and test. Assumes a single Convex deployment
per build; multi-tenant or multi-region setups would parameterize `baseURL`. The exported
client is a singleton suitable for the app-wide provider mounted in `src/main.tsx`.
*/
const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL as string;

if (!convexSiteUrl) {
  throw new Error(
    "Missing VITE_CONVEX_SITE_URL. Run `npx convex dev` and set it in .env.local."
  );
}

export const authClient = createAuthClient({
  baseURL: convexSiteUrl,
  plugins: [convexClient(), crossDomainClient()],
});
