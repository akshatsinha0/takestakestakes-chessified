import { useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

/*
(1.) Keeps the signed-in player marked online by calling the Convex `presence.heartbeat`
     mutation on mount, on a fixed interval, and whenever the tab becomes visible again. The
     server stamps `lastActive`, and staleness alone marks a player offline, so no explicit
     "go offline" call is needed on unmount.
(2.) The mutation derives the user from the authenticated request, so the hook passes no id;
     the `userId` parameter is retained only as an enable/disable gate so the effect does
     nothing until a user is known, mirroring the call sites that already pass the current id.
(3.) `HEARTBEAT_INTERVAL_MS` is set below the server's online threshold so an active player
     always refreshes before their presence would expire, and the visibility listener catches
     the common case of a backgrounded tab returning without waiting for the next interval.

This hook is the client half of the presence system. By delegating all state to a single
idempotent mutation and tying refresh to both time and tab visibility, it keeps the online
indicator accurate with minimal traffic and no teardown bookkeeping, and it stays decoupled
from any backend SDK beyond the generated Convex API.
*/

const HEARTBEAT_INTERVAL_MS = 60 * 1000

export const useUserPresence = (userId: string | undefined) => {
  const heartbeat = useMutation(api.presence.heartbeat)

  useEffect(() => {
    if (!userId) {
      return
    }
    const sendHeartbeat = () => {
      void heartbeat({})
    }
    sendHeartbeat()
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId, heartbeat])
}
