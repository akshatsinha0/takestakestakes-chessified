import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from 'convex/react'
import { toast } from 'react-toastify'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { GameStatus } from '../../../convex/lib/domain'
import { useAuth } from '../../context/AuthContext'
import './QuickMatch.css'

/*
(1.) Drives quick matchmaking through the Convex `matchmaking.quickMatch` mutation, which either
     joins an existing waiting game or opens a new one and returns its id. The component then watches
     that game with a reactive `games.get` query and navigates to the board the instant the game
     becomes in progress, replacing the former realtime channel subscription.
(2.) Because `quickMatch` is transactional, an immediate pairing returns an already in-progress game
     so the watch fires and navigates at once, while an unmatched search returns a waiting game and
     the same watch transitions to navigation automatically when an opponent later joins, with no
     polling or manual subscription teardown.
(3.) `cancelSearch` calls `leaveQueue`, which removes the caller's still-waiting game, so abandoning a
     search leaves no orphaned game; the watch query is skipped until a search id exists, so an idle
     component issues no reads.

This component is the lobby entry point for ranked play. Expressing "search" as create-or-join plus a
reactive watch removes the bespoke subscription and immediate-match probing the previous version
needed, and it leans on Convex reactivity so the move from searching to playing is driven by data
changes rather than client coordination.
*/

const TIME_CONTROLS = [
  { id: '1+0', name: 'Bullet', time: '1 min' },
  { id: '3+0', name: 'Blitz', time: '3 min' },
  { id: '5+0', name: 'Blitz', time: '5 min' },
  { id: '10+0', name: 'Rapid', time: '10 min' },
]

const QuickMatch = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const quickMatch = useMutation(api.matchmaking.quickMatch)
  const leaveQueue = useMutation(api.matchmaking.leaveQueue)
  const [selectedTime, setSelectedTime] = useState('5+0')
  const [searchingGameId, setSearchingGameId] = useState<Id<'games'> | null>(
    null,
  )

  const watchedGame = useQuery(
    api.games.get,
    searchingGameId ? { gameId: searchingGameId } : 'skip',
  )

  useEffect(() => {
    if (watchedGame && watchedGame.game.status === GameStatus.InProgress) {
      toast.success('Match found! Starting game...')
      navigate(`/game/${watchedGame.game._id}`)
    }
  }, [watchedGame, navigate])

  const findMatch = async () => {
    if (!user) {
      toast.error('Please log in to play')
      return
    }
    try {
      const gameId = await quickMatch({ timeControl: selectedTime })
      setSearchingGameId(gameId)
    } catch {
      toast.error('Failed to find match')
    }
  }

  const cancelSearch = async () => {
    await leaveQueue({})
    setSearchingGameId(null)
    toast.info('Search cancelled')
  }

  const searching = searchingGameId !== null

  return (
    <div className="quick-match">
      <h3>Quick Match</h3>
      <div className="time-selector">
        {TIME_CONTROLS.map((control) => (
          <button
            key={control.id}
            className={`time-btn ${selectedTime === control.id ? 'selected' : ''}`}
            onClick={() => setSelectedTime(control.id)}
            disabled={searching}
          >
            <div className="time-name">{control.name}</div>
            <div className="time-duration">{control.time}</div>
          </button>
        ))}
      </div>

      {searching ? (
        <div className="searching-container">
          <div className="searching-spinner" />
          <p className="searching-text">Searching for opponent...</p>
          <button className="cancel-search-btn" onClick={cancelSearch}>
            Cancel
          </button>
        </div>
      ) : (
        <button className="find-match-btn" onClick={findMatch}>
          Find Match
        </button>
      )}
    </div>
  )
}

export default QuickMatch
