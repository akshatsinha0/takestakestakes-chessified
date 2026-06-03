import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { toast } from 'react-toastify'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { useAuth } from '../../context/AuthContext'
import './FriendInvite.css'

/*
(1.) Lets a player find another by username and send them a game challenge. Candidate players come
     from the reactive `profiles.directory` query filtered client-side by the typed query, excluding
     the caller, so no per-keystroke server search is needed.
(2.) Sending invokes the Convex `challenges.send` mutation, which creates a pending invitation the
     recipient receives in their reactive feed; color is intentionally not chosen here because the
     game factory assigns sides when the challenge is accepted, keeping a single source of truth for
     color assignment and avoiding a control that the backend would override.
(3.) The selected time control drives the invitation's cadence, and the send button is disabled until
     a friend is selected and while the request is in flight, preventing empty or duplicate sends.

This modal is a search-and-challenge surface composed from one query and one mutation. Delegating
invitation creation and color assignment to the backend keeps challenge semantics identical to every
other entry point, and filtering an already-loaded directory keeps search responsive without extra
round trips.
*/

interface FriendInviteProps {
  onClose: () => void
  onGameCreated: (gameId: string) => void
}

const TIME_CONTROLS = [
  { label: '1 min', value: '1+0' },
  { label: '3 min', value: '3+0' },
  { label: '5 min', value: '5+0' },
  { label: '10 min', value: '10+0' },
  { label: '15 min', value: '15+0' },
  { label: '30 min', value: '30+0' },
]

const FriendInvite = ({ onClose }: FriendInviteProps) => {
  const { user } = useAuth()
  const sendChallenge = useMutation(api.challenges.send)
  const directory = useQuery(api.profiles.directory, {}) ?? []
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFriend, setSelectedFriend] = useState<Doc<'profiles'> | null>(
    null,
  )
  const [selectedTimeControl, setSelectedTimeControl] = useState(
    TIME_CONTROLS[3],
  )
  const [isSending, setIsSending] = useState(false)

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return []
    }
    return directory
      .filter(
        (profile) =>
          profile.userId !== user?.id &&
          profile.username.toLowerCase().includes(query),
      )
      .slice(0, 10)
  }, [searchQuery, directory, user])

  const handleSend = async () => {
    if (!selectedFriend) {
      toast.error('Please select a friend')
      return
    }
    setIsSending(true)
    try {
      await sendChallenge({
        toUserId: selectedFriend.userId,
        timeControl: selectedTimeControl.value,
        message: '',
      })
      toast.success(`Game invitation sent to ${selectedFriend.username}!`)
      onClose()
    } catch {
      toast.error('Failed to send invitation')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="friend-invite-overlay" onClick={onClose}>
      <div className="friend-invite-modal" onClick={(event) => event.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        <h2 className="modal-title">Play a Friend</h2>

        <div className="search-section">
          <label>Search for a friend</label>
          <input
            type="text"
            className="search-input"
            placeholder="Enter username..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((profile) => (
                <div
                  key={profile._id}
                  className={`search-result-item ${selectedFriend?._id === profile._id ? 'selected' : ''}`}
                  onClick={() => setSelectedFriend(profile)}
                >
                  <div className="result-info">
                    <div className="result-username">{profile.username}</div>
                    <div className="result-rating">Rating: {profile.rating}</div>
                  </div>
                  {selectedFriend?._id === profile._id && (
                    <span className="check-mark">✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && (
            <div className="no-results">No users found</div>
          )}
        </div>

        {selectedFriend && (
          <div className="selected-friend">
            <span>Playing against:</span>
            <strong>{selectedFriend.username}</strong>
            <span className="friend-rating">({selectedFriend.rating})</span>
          </div>
        )}

        <div className="time-control-section">
          <label>Time Control</label>
          <div className="time-control-grid">
            {TIME_CONTROLS.map((control) => (
              <button
                key={control.value}
                className={`time-control-btn ${selectedTimeControl.value === control.value ? 'selected' : ''}`}
                onClick={() => setSelectedTimeControl(control)}
              >
                {control.label}
              </button>
            ))}
          </div>
        </div>

        <button
          className="create-game-btn"
          onClick={handleSend}
          disabled={!selectedFriend || isSending}
        >
          {isSending ? 'Sending...' : 'Send Invitation'}
        </button>
      </div>
    </div>
  )
}

export default FriendInvite
