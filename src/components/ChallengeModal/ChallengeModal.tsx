import { useState } from 'react'
import { useMutation } from 'convex/react'
import { toast } from 'react-toastify'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import './ChallengeModal.css'

/*
(1.) Sends a direct game challenge to another player through the Convex `challenges.send`
     mutation, which creates a pending, server-expiring invitation; the recipient sees it in
     their reactive notification feed without any client-side delivery wiring.
(2.) The target is passed as a full profile document, so the challenge addresses the player by
     their Better Auth `userId` and the modal can show their username, avoiding a second lookup.
(3.) Time control is chosen from a fixed catalog and an optional message is forwarded verbatim;
     the empty string is a valid message, matching the mutation's required-not-optional contract,
     so no special-casing of "no message" is needed.

This modal is a thin sender over the challenges API. Delegating creation and expiry to the
backend keeps invitation lifecycle rules in one place, and depending only on the generated
mutation leaves the component free of any backend SDK details.
*/

interface ChallengeModalProps {
  targetUser: Doc<'profiles'>
  onClose: () => void
}

const TIME_CONTROLS = [
  { id: '1+0', name: 'Bullet', time: '1 min', increment: '0 sec' },
  { id: '3+0', name: 'Blitz', time: '3 min', increment: '0 sec' },
  { id: '5+0', name: 'Blitz', time: '5 min', increment: '0 sec' },
  { id: '10+0', name: 'Rapid', time: '10 min', increment: '0 sec' },
  { id: '15+10', name: 'Rapid', time: '15 min', increment: '10 sec' },
  { id: '30+0', name: 'Classical', time: '30 min', increment: '0 sec' },
]

const ChallengeModal = ({ targetUser, onClose }: ChallengeModalProps) => {
  const sendChallenge = useMutation(api.challenges.send)
  const [selectedTimeControl, setSelectedTimeControl] = useState('5+0')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    setSending(true)
    try {
      await sendChallenge({
        toUserId: targetUser.userId,
        timeControl: selectedTimeControl,
        message,
      })
      toast.success(`Challenge sent to ${targetUser.username}!`)
      onClose()
    } catch {
      toast.error('Failed to send challenge')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="challenge-overlay" onClick={onClose}>
      <div className="challenge-modal" onClick={(event) => event.stopPropagation()}>
        <div className="challenge-header">
          <h3>Challenge {targetUser.username}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="challenge-content">
          <div className="time-controls">
            <h4>Select Time Control</h4>
            <div className="time-grid">
              {TIME_CONTROLS.map((control) => (
                <div
                  key={control.id}
                  className={`time-control-card ${selectedTimeControl === control.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTimeControl(control.id)}
                >
                  <div className="time-control-name">{control.name}</div>
                  <div className="time-control-time">{control.time}</div>
                  <div className="time-control-increment">+{control.increment}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="challenge-message">
            <h4>Message (Optional)</h4>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Good luck!"
              maxLength={100}
            />
          </div>
          <div className="challenge-actions">
            <button className="cancel-btn" onClick={onClose}>Cancel</button>
            <button className="send-btn" onClick={handleSend} disabled={sending}>
              {sending ? 'Sending...' : 'Send Challenge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChallengeModal
