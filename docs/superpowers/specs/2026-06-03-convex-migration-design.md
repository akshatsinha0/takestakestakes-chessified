# Supabase → Convex Migration Design

**Date:** 2026-06-03
**Branch:** `migrate-to-convex`
**Status:** Approved design, pending implementation plan

## Goal

Replace the Supabase backend (auth + Postgres + realtime + one Edge Function) with
Convex, driven entirely from the CLI/code with no Supabase dashboard configuration.
Auth is handled by the **Better Auth** Convex component
(https://www.convex.dev/components/better-auth) with email/password **and** Google +
Facebook social login.

### Why migrate
- The existing Supabase project is paused for >90 days and cannot be restored via the
  dashboard. Data is throwaway test data.
- Convex is CLI-first: `npx convex dev` provisions the deployment and pushes
  schema/functions; secrets are set with `npx convex env set`. No dashboard clicking.
- Convex reactive queries replace Supabase realtime channels, simplifying the live
  game-sync code substantially.

## Decisions (locked)

1. **Auth:** Better Auth component — email/password **+ Google + Facebook** social.
2. **Data:** Fresh start. No migration of old Supabase rows.
3. **Cleanup:** Delete all legacy/unimplemented/redundant code encountered during the
   migration (notably the dead custom-auth implementation).
4. **Approach:** Staged full replacement (no throwaway abstraction layer). Each stage is
   a working, verifiable checkpoint. End state has zero Supabase code and the
   `@supabase/supabase-js` dependency removed.

## Current Supabase surface area

- **Auth:** `supabase.auth` (email/password, Google/Facebook OAuth), `profiles` table,
  session handling in `useSupabaseAuth` / `SupabaseAuthContext`.
- **Data tables:** `profiles`, `games`, `moves`, `game_invitations`, `user_stats`,
  `friend_requests`.
- **Realtime:** `.channel(...).on('postgres_changes', ...)` for game updates, move
  inserts, notifications, presence.
- **Edge Function:** `calculate-rating` (invoked from `useGameSubscription`).
- **123 Supabase calls across 22 files**; Supabase is called directly from components,
  hooks, services, and utils (no existing data-access abstraction).
- **Known defect carried over:** `supabase-schema.sql` is missing the `increment`
  column that `matchmakingService` inserts; matchmaking has a check-then-act race.

## Target architecture

### 1. Schema (`convex/schema.ts`)

Better Auth owns its own user/session tables inside the component. App domain tables are
keyed by the Better Auth user id.

| Convex table      | Replaces            | Key fields / notes                                                            |
|-------------------|---------------------|-------------------------------------------------------------------------------|
| `profiles`        | `profiles`          | `userId` (Better Auth), `username`, `rating`, `avatarUrl`, `lastActive`       |
| `games`           | `games`             | full game state; **adds the missing `increment` field**                       |
| `moves`           | `moves`             | `gameId`, `moveNumber`, `playerColor`, `san`, `fen`, `timeTaken`              |
| `gameInvitations` | `game_invitations`  | challenges: `fromUserId`, `toUserId`, `timeControl`, `status`, `expiresAt`    |
| `userStats`       | `user_stats`        | highest rating, streaks, counters                                             |
| `friendRequests`  | friend-requests SQL | `fromUserId`, `toUserId`, `status`                                            |

Indexes (`by_status`, `by_game`, `by_player`, etc.) replace Postgres indexes. Row
authorization moves into the Convex functions: each query/mutation checks
`authComponent.getAuthUser(ctx)` against the row owner — the equivalent of the old RLS
policies.

### 2. Realtime → reactive queries

All `.channel(...).on('postgres_changes')` code is **deleted**. Convex `useQuery` is
reactive by default — `useQuery(api.games.get, { gameId })` re-renders automatically when
the game or its moves change.

- `useGameSubscription` → a reactive `getGame` query + `makeMove` mutation.
- `Game.tsx` manual channel + `loadGame()` polling → `useQuery`.
- Notifications and presence → reactive queries.

### 3. Functions

Server-authoritative and transactional.

- **Queries:** `games.get`, `moves.list`, `games.activeForUser`, `games.historyForUser`,
  `profiles.get`, `profiles.onlinePlayers`, `challenges.inbox`, `friends.list`.
- **Mutations:** `games.create`, `moves.make`, `matchmaking.quickMatch`,
  `matchmaking.leaveQueue`, `challenges.send`, `challenges.accept`, `challenges.decline`,
  `profiles.update`, `friends.request`, `friends.respond`, `stats.calculateRating`.
- `stats.calculateRating` replaces the `calculate-rating` Edge Function, called on game
  completion.
- **Bonus fix:** Convex mutations are atomic transactions, so the matchmaking
  check-then-act race is eliminated.

### 4. Auth wiring

Files: `convex/convex.config.ts`, `convex/auth.config.ts`, `convex/auth.ts`,
`convex/http.ts`, `src/lib/auth-client.ts`.

- `betterAuth()` with `emailAndPassword` enabled and `socialProviders` for google +
  facebook; `crossDomain` plugin.
- `authComponent = createClient(...)`; `getCurrentUser` query via
  `authComponent.getAuthUser(ctx)`.
- `http.ts`: `authComponent.registerRoutes(http, createAuth, { cors: true })`.
- `src/lib/auth-client.ts`: `createAuthClient({ baseURL: VITE_CONVEX_SITE_URL,
  plugins: [convexClient(), crossDomainClient()] })`.
- `main.tsx`: wrap app in `<ConvexBetterAuthProvider client={convex} authClient={authClient}>`.
- `useSupabaseAuth` / `SupabaseAuthContext` → thin context backed by `authClient` +
  `getCurrentUser`; the app `profiles` row is created via mutation on first sign-in.
- `signInWithGoogle` / `signInWithFacebook` → `authClient.signIn.social({ provider })`.

### 5. Packages & env

- **Install:** `convex@latest` (>= 1.25.0), `@convex-dev/better-auth`,
  `better-auth@~1.6.9`.
- **Remove:** `@supabase/supabase-js`.
- **Env (CLI):** `npx convex env set BETTER_AUTH_SECRET=...`,
  `npx convex env set SITE_URL http://localhost:5173`, plus
  `GOOGLE_CLIENT_ID/SECRET` and `FACEBOOK_CLIENT_ID/SECRET` once provided.
- **`.env.local`:** `CONVEX_DEPLOYMENT`, `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL`,
  `VITE_SITE_URL=http://localhost:5173`.

### 6. Files

- **New:** `convex/` (schema, auth, auth.config, http, convex.config, and function
  modules `games.ts`, `moves.ts`, `matchmaking.ts`, `challenges.ts`, `profiles.ts`,
  `stats.ts`, `friends.ts`), `src/lib/auth-client.ts`.
- **Deleted:** `src/lib/supabase.ts`, `src/services/matchmakingService.ts`,
  `src/utils/gameApi.ts`, `src/utils/profileApi.ts`, legacy `src/context/AuthContext.tsx`
  and `src/components/Authentication/{LoginForm,SignupForm,PasswordGenerator}.tsx`, all
  root `.sql` files and `supabase/` migrations, and `@supabase/supabase-js` from
  `package.json`.
- **Rewritten:** the ~22 components/hooks/pages that call Supabase, to use
  `useQuery` / `useMutation`.

### 7. The one manual step (because social login was chosen)

Create OAuth apps in the **Google** and **Facebook** developer consoles and provide the
client IDs/secrets; they are set via `npx convex env set`. Redirect URI:
`https://<deployment>.convex.site/api/auth/callback/<provider>`. Everything else is
CLI/code only. Email/password works with zero external config, so social can be deferred
without blocking the rest of the migration.

## Implementation stages (each a verifiable checkpoint)

1. **Scaffold** Convex + Better Auth — email/password login working, app builds.
2. **Social providers** — Google + Facebook wired (after credentials provided).
3. **Core game loop** — schema, `games.get` / `moves.make`, `Game.tsx` on reactive queries.
4. **Lobby** — matchmaking + challenges.
5. **Profiles, stats, friends, presence.**
6. **Teardown** — delete all Supabase code + dependency, final cleanup and verification.

## Testing

- Keep the existing Vitest setup. Port `authErrorHandler` usage as needed.
- Add Convex function tests where practical (`convex-test`) for `moves.make`,
  `matchmaking.quickMatch`, and `stats.calculateRating` (the transactional/race-sensitive
  paths).
- Each stage must `npm run build` and `npm run lint` clean before moving on.

## Out of scope

- Migrating historical Supabase data.
- New gameplay features beyond what exists today.
- Bot/AI opponent changes (existing `BotSelection` UI behavior is preserved as-is).
