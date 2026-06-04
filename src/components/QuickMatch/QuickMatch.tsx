import { useState } from 'react'
import { useMutation } from 'convex/react'
import { toast } from 'react-toastify'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'
import { TIME_CONTROLS } from '../../lib/gameConfig'
import './QuickMatch.css'

/*
(1.) Drives quick matchmaking through the Convex `matchmaking.quickMatch` mutation, which either
     joins an existing waiting game or opens a new one. It does not navigate: when a match becomes
     active, the dashboard's in-place board (driven by `games.currentForUser`) takes over the screen,
     so play happens on the dashboard rather than a separate page.
(2.) `findMatch` enters a searching state while waiting for an opponent; an immediate pairing makes the
     board appear at once, while an unmatched search waits until another player joins, both surfaced by
     the dashboard board reactively with no polling here.
(3.) `cancelSearch` calls `leaveQueue`, which removes the caller's still-waiting game so abandoning a
     search leaves no orphan.

This component is the ranked-play entry point. Reducing it to create-or-join plus a local searching
flag keeps it focused; the transition from searching to playing is owned by the dashboard board reading
the single current-game query, not by navigation or a bespoke watch.
*/

const QuickMatch = () => {
  const { user } = useAuth()
  const quickMatch = useMutation(api.matchmaking.quickMatch)
  const leaveQueue = useMutation(api.matchmaking.leaveQueue)
  const [selectedTime, setSelectedTime] = useState('5+0')
  const [searching, setSearching] = useState(false)

  const findMatch = async () => {
    if (!user) {
      toast.error('Please log in to play')
      return
    }
    try {
      await quickMatch({ timeControl: selectedTime })
      setSearching(true)
    } catch {
      toast.error('Failed to find match')
    }
  }

  const cancelSearch = async () => {
    await leaveQueue({})
    setSearching(false)
    toast.info('Search cancelled')
  }

  return (
    <div className='quick-match'>
      <h3>Quick Match</h3>
      <div className='time-selector'>
        {TIME_CONTROLS.map((control) => (
          <button
            key={control.value}
            className={`time-btn ${selectedTime === control.value ? 'selected' : ''}`}
            onClick={() => setSelectedTime(control.value)}
            disabled={searching}
          >
            <div className='time-name'>{control.category}</div>
            <div className='time-duration'>{control.label}</div>
          </button>
        ))}
      </div>

      {searching ? (
        <div className='searching-container'>
          <div className='searching-spinner' />
          <p className='searching-text'>Searching for opponent...</p>
          <button className='cancel-search-btn' onClick={cancelSearch}>
            Cancel
          </button>
        </div>
      ) : (
        <button className='find-match-btn' onClick={findMatch}>
          Find Match
        </button>
      )}
    </div>
  )
}

export default QuickMatch
