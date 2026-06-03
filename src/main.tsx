import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexReactClient } from 'convex/react'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { authClient } from './lib/auth-client'
import './index.css'
import App from './App';

/*
(1.) Instantiates the app-wide `ConvexReactClient` from `VITE_CONVEX_URL` (the deployment's
     `.convex.cloud` data origin) and mounts it together with the Better Auth client via
     `ConvexBetterAuthProvider`, which becomes the root of the React tree.
(2.) `ConvexBetterAuthProvider` supersedes the legacy Supabase auth wiring: it injects the
     authenticated Convex client into context so every descendant `useQuery`/`useMutation`
     runs as the signed-in user, and it reactively tracks auth state via the
     `api.auth.getAuthUser` query exposed in `convex/auth.ts`.
(3.) The client is created once at module scope (not per render) so a single websocket and
     auth session are shared across the entire application, preventing duplicate
     connections and redundant token refreshes.
(4.) `VITE_CONVEX_URL` is validated as present so an unconfigured environment fails
     immediately with an actionable message instead of surfacing opaque transport errors.

This is the composition root of the front end: it binds the data layer (Convex) and the
authentication layer (Better Auth) before any feature code runs, guaranteeing that routing,
protected routes, and data hooks downstream can assume a configured, auth-aware client.
Keeping instantiation here — above `App` and outside React's render cycle — yields a stable
singleton that scales cleanly as the app grows, and isolates environment wiring to one
file so deployment changes never ripple into components. During the staged Supabase→Convex
migration both auth systems may briefly coexist beneath this provider; later stages remove
the Supabase provider entirely, at which point this remains the sole auth/data boundary.
Assumes exactly one Convex deployment per build, identified by the Vite-injected env vars.
*/
const convexUrl = import.meta.env.VITE_CONVEX_URL as string;

if (!convexUrl) {
  throw new Error(
    'Missing VITE_CONVEX_URL. Run `npx convex dev` and set it in .env.local.'
  );
}

const convex = new ConvexReactClient(convexUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <App />
    </ConvexBetterAuthProvider>
  </StrictMode>,
)
