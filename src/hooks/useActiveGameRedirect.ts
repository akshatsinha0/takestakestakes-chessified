import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { GameStatus } from '../../convex/lib/domain'

/*
(1.) Watches the signed-in player's active games and navigates them into a game that has just
     become in-progress for them — the moment a challenge they SENT is accepted (a game is
     created with them as a player) or matchmaking pairs them. This closes the gap where the
     challenger had no route into the game the acceptor created.
(2.) The first resolved snapshot is treated as a baseline: existing in-progress games are
     recorded WITHOUT navigating, so landing on the dashboard while already having an active
     game does not yank the player away. Only a game id appearing AFTER that baseline triggers
     navigation, which is precisely the "a new game just started for me" event.
(3.) It is reactive, not polled: `games.activeForUser` re-delivers when the acceptor's
     transaction creates the game, so the redirect happens within Convex's normal update latency
     with no interval or subscription bookkeeping. Navigating to a game the player is already on
     is idempotent, so this safely coexists with the acceptor's own direct navigation.
(4.) The query is skipped until `enabled` (the caller passes whether a user is present), so an
     unauthenticated render issues no identity-bound read.

This hook is the challenger-and-matchmaking side of starting a game. Expressing "join any game
that newly becomes active for me" as a reactive baseline-diff keeps both entry paths (accepted
challenge, matched queue) working from one place, and the baseline guard prevents the annoying
behavior of force-redirecting a player who simply revisits the dashboard mid-game.
*/

export const useActiveGameRedirect = (enabled: boolean) => {
  const navigate = useNavigate()
  const activeGames = useQuery(api.games.activeForUser, enabled ? {} : 'skip')
  const knownGameIds = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (!activeGames) {
      return
    }
    const inProgress = activeGames.filter(
      (game) => game.status === GameStatus.InProgress,
    )
    if (knownGameIds.current === null) {
      knownGameIds.current = new Set(inProgress.map((game) => game._id))
      return
    }
    const fresh = inProgress.find(
      (game) => !knownGameIds.current?.has(game._id),
    )
    if (fresh) {
      knownGameIds.current.add(fresh._id)
      navigate(`/game/${fresh._id}`)
    }
  }, [activeGames, navigate])
}
