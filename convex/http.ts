import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

/*
(1.) Creates the deployment's HTTP router and delegates all authentication endpoints to
     the Better Auth component via `authComponent.registerRoutes(http, createAuth)`. This
     mounts the sign-in/sign-up/callback/session/JWKS routes (e.g.
     `/api/auth/*` and the OAuth callbacks `/api/auth/callback/<provider>`) onto this
     same deployment's `.site` domain.
(2.) `cors: true` is enabled because the browser SPA is served from a different origin
     (the Vite dev server / static host) than the Convex `.site` auth origin; without CORS
     the cross-origin auth fetches and social redirects initiated by the client plugins
     would be blocked.
(3.) `createAuth` is passed by reference (not invoked) so the component can construct a
     request-scoped Better Auth instance per incoming HTTP request, mirroring the
     transaction-bound factory pattern used for queries and mutations.

This file is the public HTTP surface of the backend and the counterpart to the JWT
verification declared in `auth.config.ts`: the routes registered here ISSUE the tokens
that the rest of the deployment VERIFIES. Centralizing route registration through the
component keeps the application free of hand-written auth endpoints, which reduces attack
surface and guarantees the issued tokens, JWKS, and cookie handling stay mutually
consistent as the component is upgraded. The OAuth callback paths are derived from the
provider ids configured in `auth.ts`, so enabling Google/Facebook later requires no change
here. Additional non-auth HTTP actions (e.g. webhooks) can be appended to `http` below
without disturbing the auth wiring. Assumes the SPA origin is permitted by the component's
trusted-origins/cross-domain configuration.
*/
const http = httpRouter();

authComponent.registerRoutes(http, createAuth, { cors: true });

export default http;
