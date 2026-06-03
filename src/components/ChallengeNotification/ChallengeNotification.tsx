import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { toast } from 'react-toastify'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useAuth } from '../../context/AuthContext'
import './ChallengeNotification.css'

/*
(1.) Renders an inline banner of incoming game challenges from the reactive `challenges.inbox`
     query, so a challenge appears and disappears automatically as it is created, accepted, or
     expires, with no realtime channel or manual reload.
(2.) Accepting calls the `challenges.accept` mutation, which atomically marks the invitation
     accepted and creates the game, then navigates the player straight to the new board using the
     returned game id; declining calls `challenges.decline`.
(3.) The query is skipped until authenticated, and the component renders nothing when there are no
     pending challenges, so it stays invisible until it has something actionable to show.

This banner is a focused, reactive surface over the same challenge API the notification bell uses.
Routing both accept and the immediate navigation through the single mutation keeps invitation
resolution and game creation consistent regardless of which UI the player acts from.
*/

const ChallengeNotification = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const challenges =
    useQuery(api.challenges.inbox, isAuthenticated ? {} : 'skip') ?? []
  const acceptChallenge = useMutation(api.challenges.accept)
  const declineChallenge = useMutation(api.challenges.decline)

  const handleAccept = async (invitationId: Id<'gameInvitations'>) => {
    try {
      const gameId = await acceptChallenge({ invitationId })
      toast.success('Challenge accepted! Game starting...')
      navigate(`/game/${gameId}`)
    } catch {
      toast.error('Failed to accept challenge')
    }
  }

  const handleDecline = async (invitationId: Id<'gameInvitations'>) => {
    try {
      await declineChallenge({ invitationId })
      toast.info('Challenge declined')
    } catch {
      toast.error('Failed to decline challenge')
    }
  }

  if (challenges.length === 0) {
    return null
  }

  return (
    <div className="challenge-notifications">
      {challenges.map(({ invitation, sender }) => (
        <div key={invitation._id} className="challenge-notification">
          <div className="challenge-info">
            <div className="challenger-name">{sender?.username ?? 'Someone'}</div>
            <div className="challenge-details">
              <span className="time-control">{invitation.timeControl}</span>
              <span className="rating">({sender?.rating ?? 1200})</span>
            </div>
            {invitation.message && (
              <div className="challenge-message">&quot;{invitation.message}&quot;</div>
            )}
          </div>
          <div className="challenge-actions">
            <button
              className="accept-btn"
              onClick={() => handleAccept(invitation._id)}
            >
              Accept
            </button>
            <button
              className="decline-btn"
              onClick={() => handleDecline(invitation._id)}
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ChallengeNotification
