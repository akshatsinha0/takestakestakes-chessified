import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

/*
(1.) Registers the Better Auth component (`@convex-dev/better-auth`) into this Convex
     deployment via `app.use(betterAuth)`, which mounts the component's own isolated
     tables (users, sessions, accounts, verification, jwks) under a namespaced scope.
(2.) The component owns and migrates its authentication schema independently of the
     application schema in `convex/schema.ts`; the app never reads those tables directly
     and instead goes through the typed client created in `convex/auth.ts`.
(3.) This file is the single source of truth for component wiring — additional Convex
     components (e.g. rate limiting, presence) would be registered here with further
     `app.use(...)` calls, keeping deployment composition declarative and centralized.

This module is the deployment manifest for Convex components. Convex reads it at deploy
and codegen time to provision the Better Auth component and to generate the
`components.betterAuth` reference consumed by the backend auth client. Keeping component
registration isolated here means the rest of the codebase depends only on generated,
type-safe handles rather than on component internals, which preserves a clean boundary
and makes it trivial to add, remove, or upgrade components without touching application
logic. The design assumes exactly one Better Auth component per deployment, which matches
the single-tenant authentication model this chess application requires.
*/
const app = defineApp();
app.use(betterAuth);

export default app;
