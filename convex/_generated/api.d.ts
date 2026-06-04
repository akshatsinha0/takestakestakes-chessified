/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as challenges from "../challenges.js";
import type * as friends from "../friends.js";
import type * as games from "../games.js";
import type * as http from "../http.js";
import type * as lib_completion from "../lib/completion.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_domain from "../lib/domain.js";
import type * as lib_elo from "../lib/elo.js";
import type * as lib_functions from "../lib/functions.js";
import type * as lib_gameFactory from "../lib/gameFactory.js";
import type * as lib_identity from "../lib/identity.js";
import type * as lib_tables from "../lib/tables.js";
import type * as lib_time from "../lib/time.js";
import type * as matchmaking from "../matchmaking.js";
import type * as moves from "../moves.js";
import type * as presence from "../presence.js";
import type * as profiles from "../profiles.js";
import type * as stats from "../stats.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  challenges: typeof challenges;
  friends: typeof friends;
  games: typeof games;
  http: typeof http;
  "lib/completion": typeof lib_completion;
  "lib/constants": typeof lib_constants;
  "lib/domain": typeof lib_domain;
  "lib/elo": typeof lib_elo;
  "lib/functions": typeof lib_functions;
  "lib/gameFactory": typeof lib_gameFactory;
  "lib/identity": typeof lib_identity;
  "lib/tables": typeof lib_tables;
  "lib/time": typeof lib_time;
  matchmaking: typeof matchmaking;
  moves: typeof moves;
  presence: typeof presence;
  profiles: typeof profiles;
  stats: typeof stats;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
