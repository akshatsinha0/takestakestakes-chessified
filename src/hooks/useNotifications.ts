import { useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Doc } from '../../convex/_generated/dataModel'
import { useAuth } from '../context/AuthContext'

/*
(1.) Composes the notification feed from two reactive Convex queries: pending game challenges
     (`challenges.inbox`) and incoming friend requests (`friends.incomingRequests`), each already
     enriched with the sender's profile. Convex reactivity replaces the former realtime channel
     wiring, so a new challenge or request appears without any subscription bookkeeping.
(2.) Both queries are skipped until the session is authenticated, so an anonymous visitor issues no
     identity-bound reads, and a combined `loading` flag stays true until both resolve to avoid
     rendering a half-populated feed.
(3.) Dismissal is local: `removeNotification` records an id in a `dismissed` set that filters the
     derived list, letting the UI hide an item immediately after the user acts on it while the
     authoritative pending state remains the server's responsibility. The next reactive update from
     the server (once the challenge or request is resolved) removes the row at the source.
(4.) Each item is normalized to a stable shape (id, type, title, message, data, created_at) so the
     header renders challenges and friend requests uniformly, and the sender is carried in `data`
     for avatar and naming without a second lookup.

This hook is the read model for the notification bell. Deriving it from reactive queries plus a small
local dismissal set keeps the feed live and consistent with the backend while giving the immediate UI
feedback users expect, and it exposes only what the header consumes, keeping the surface minimal.
*/

export interface AppNotification {
  id: string
  type: 'challenge' | 'friend_request'
  title: string
  message: string
  data: {
    invitation?: Doc<'gameInvitations'>
    friendRequest?: Doc<'friendRequests'>
    sender: Doc<'profiles'> | null
  }
  read: boolean
  created_at: string
}

export const useNotifications = () => {
  const { isAuthenticated } = useAuth()
  const challenges = useQuery(
    api.challenges.inbox,
    isAuthenticated ? {} : 'skip',
  )
  const friendRequests = useQuery(
    api.friends.incomingRequests,
    isAuthenticated ? {} : 'skip',
  )
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set())

  const loading = challenges === undefined || friendRequests === undefined

  const notifications = useMemo<AppNotification[]>(() => {
    const challengeNotifications: AppNotification[] = (challenges ?? []).map(
      ({ invitation, sender }) => ({
        id: invitation._id,
        type: 'challenge',
        title: 'Game Challenge',
        message: `${sender?.username ?? 'Someone'} (${sender?.rating ?? 1200}) challenged you to a ${invitation.timeControl} game`,
        data: { invitation, sender },
        read: false,
        created_at: new Date(invitation._creationTime).toISOString(),
      }),
    )
    const friendNotifications: AppNotification[] = (friendRequests ?? []).map(
      ({ request, sender }) => ({
        id: request._id,
        type: 'friend_request',
        title: 'Friend Request',
        message: `${sender?.username ?? 'Someone'} sent you a friend request`,
        data: { friendRequest: request, sender },
        read: false,
        created_at: new Date(request._creationTime).toISOString(),
      }),
    )
    return [...challengeNotifications, ...friendNotifications]
      .filter((notification) => !dismissed.has(notification.id))
      .toSorted(
        (first, second) =>
          new Date(second.created_at).getTime() -
          new Date(first.created_at).getTime(),
      )
  }, [challenges, friendRequests, dismissed])

  const removeNotification = (notificationId: string) => {
    setDismissed((previous) => new Set(previous).add(notificationId))
  }

  return {
    notifications,
    unreadCount: notifications.length,
    loading,
    removeNotification,
  }
}
