import { useMemo } from 'react'
import { ONLINE_THRESHOLD_MS } from '../../../convex/lib/constants'
import { useQuery, useMutation } from 'convex/react'
import { toast } from 'react-toastify'
import { api } from '../../../convex/_generated/api'
import { FriendStatus } from '../../../convex/lib/domain'
import { useAuth } from '../../context/AuthContext'
import './UserProfile.css'

/*
(1.) Shows another player's public profile from the reactive `profiles.byUserId` query, derives
     their win/loss/draw record from `games.historyForUser`, and reflects the friendship edge from
     `friends.relationshipWith`, so every panel stays live without manual refetching.
(2.) Win/loss/draw counts are computed on the client from the completed-game list using the stored
     `winnerId` (a null winner is a draw), keeping the backend history query simple while presenting
     a full record relative to the viewed player.
(3.) The friend action button is a pure function of the relationship state: no edge offers "Add
     Friend" (`friends.request`); a pending edge the viewer sent offers "Cancel" while one they
     received reads "Request Pending"; an accepted edge offers "Remove Friend". Cancel and remove both
     call `friends.remove`, the single mutation that deletes an edge the caller belongs to.
(4.) The component renders nothing for a missing profile and a loading state until the profile query
     resolves, and hides friend actions on the viewer's own profile.

This modal composes three focused queries plus two mutations into a complete player view. Driving the
action button entirely from relationship state keeps the social UI consistent with the backend's edge
model, and deriving stats on the client avoids a dedicated aggregate query while staying accurate.
*/

interface UserProfileProps {
  userId: string
  onClose: () => void
}

const UserProfile = ({ userId, onClose }: UserProfileProps) => {
  const { user } = useAuth()
  const profile = useQuery(api.profiles.byUserId, { userId })
  const history = useQuery(api.games.historyForUser, { userId }) ?? []
  const relationship = useQuery(api.friends.relationshipWith, { userId })
  const sendRequest = useMutation(api.friends.request)
  const removeEdge = useMutation(api.friends.remove)

  const stats = useMemo(() => {
    const total = history.length
    const wins = history.filter((game) => game.winnerId === userId).length
    const losses = history.filter(
      (game) => game.winnerId !== null && game.winnerId !== userId,
    ).length
    const draws = total - wins - losses
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0
    return { total, wins, losses, draws, winRate }
  }, [history, userId])

  if (profile === undefined) {
    return (
      <div className='user-profile-overlay' onClick={onClose}>
        <div
          className='user-profile-modal'
          onClick={(event) => event.stopPropagation()}
        >
          <div className='loading-spinner'>Loading...</div>
        </div>
      </div>
    )
  }
  if (profile === null) {
    return null
  }

  const isOwnProfile = user?.id === userId
  const isOnline = Date.now() - profile.lastActive < ONLINE_THRESHOLD_MS

  const handleAddFriend = async () => {
    try {
      await sendRequest({ receiverId: userId })
      toast.success('Friend request sent!')
    } catch {
      toast.error('Failed to send friend request')
    }
  }

  const handleRemoveEdge = async () => {
    if (!relationship) {
      return
    }
    await removeEdge({ requestId: relationship._id })
    toast.info('Friendship updated')
  }

  const renderFriendAction = () => {
    if (isOwnProfile) {
      return null
    }
    if (!relationship) {
      return (
        <button
          className='action-btn friend-request-btn'
          onClick={handleAddFriend}
        >
          Add Friend
        </button>
      )
    }
    if (relationship.status === FriendStatus.ACCEPTED) {
      return (
        <button
          className='action-btn remove-friend-btn'
          onClick={handleRemoveEdge}
        >
          Remove Friend
        </button>
      )
    }
    if (relationship.status === FriendStatus.PENDING) {
      const sentByMe = relationship.senderId === user?.id
      return (
        <button
          className='action-btn pending-btn'
          onClick={handleRemoveEdge}
          disabled={!sentByMe}
        >
          {sentByMe ? 'Cancel Friend Request' : 'Friend Request Pending'}
        </button>
      )
    }
    return null
  }

  return (
    <div className='user-profile-overlay' onClick={onClose}>
      <div
        className='user-profile-modal'
        onClick={(event) => event.stopPropagation()}
      >
        <button className='close-btn' onClick={onClose}>
          ×
        </button>
        <div className='profile-header'>
          <div className='profile-avatar-large'>
            <div className='avatar-circle'>
              {profile.username.charAt(0).toUpperCase()}
            </div>
            {isOnline && <span className='online-indicator' />}
          </div>
          <div className='profile-info'>
            <h2 className='profile-username'>{profile.username}</h2>
            <div className='profile-rating'>
              <span className='rating-label'>Rating:</span>
              <span className='rating-value'>{profile.rating}</span>
            </div>
            <div className='profile-status'>
              {isOnline ? (
                <span className='status-online'>● Online</span>
              ) : (
                <span className='status-offline'>● Offline</span>
              )}
            </div>
          </div>
        </div>

        {profile.bio && (
          <div className='profile-bio'>
            <h3>About</h3>
            <p>{profile.bio}</p>
          </div>
        )}

        <div className='profile-stats'>
          <h3>Statistics</h3>
          <div className='stats-grid'>
            <div className='stat-item'>
              <span className='stat-value'>{stats.total}</span>
              <span className='stat-label'>Games</span>
            </div>
            <div className='stat-item'>
              <span className='stat-value'>{stats.wins}</span>
              <span className='stat-label'>Wins</span>
            </div>
            <div className='stat-item'>
              <span className='stat-value'>{stats.losses}</span>
              <span className='stat-label'>Losses</span>
            </div>
            <div className='stat-item'>
              <span className='stat-value'>{stats.draws}</span>
              <span className='stat-label'>Draws</span>
            </div>
            <div className='stat-item'>
              <span className='stat-value'>{stats.winRate}%</span>
              <span className='stat-label'>Win Rate</span>
            </div>
          </div>
        </div>

        <div className='profile-actions'>{renderFriendAction()}</div>
      </div>
    </div>
  )
}

export default UserProfile
