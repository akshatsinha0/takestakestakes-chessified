import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Doc } from '../../../convex/_generated/dataModel'
import { GameResult } from '../../../convex/lib/domain'
import { useAuth } from '../../context/AuthContext'
import GameViewer from '../GameViewer/GameViewer'
import './GameHistory.css'

/*
(1.) Lists the signed-in player's completed games from the reactive `games.historyForUser`
     query and lets them open any game in the move-by-move viewer. The list updates
     automatically as new games finish, with no manual reload.
(2.) Opponent and self usernames are resolved from the `profiles.directory` query through a
     `nameOf` lookup, because the history query returns raw games keyed by player id; pairing the
     two queries keeps each one simple and index-driven rather than embedding a join.
(3.) The result label is computed relative to the viewer's color from the stored `result` enum,
     so the same completed game reads as "Win" or "Loss" correctly for whichever side the user
     played, and a missing finish time renders empty rather than an invalid date.

This modal is a reactive history view composed from two focused queries. Deriving result and
opponent display on the client from authoritative game and profile data keeps the backend
queries minimal while presenting a complete, self-consistent record.
*/

const GameHistory = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth()
  const games = useQuery(
    api.games.historyForUser,
    user ? { userId: user.id } : 'skip',
  )
  const directory = useQuery(api.profiles.directory, {}) ?? []
  const [selectedGame, setSelectedGame] = useState<Doc<'games'> | null>(null)

  const nameOf = (userId: string | null): string =>
    directory.find((profile) => profile.userId === userId)?.username ??
    'Unknown'

  const resultFor = (game: Doc<'games'>): string => {
    if (!user) {
      return ''
    }
    const isWhite = game.whitePlayerId === user.id
    if (game.result === GameResult.Draw) {
      return 'Draw'
    }
    if (game.result === GameResult.WhiteWins) {
      return isWhite ? 'Win' : 'Loss'
    }
    if (game.result === GameResult.BlackWins) {
      return isWhite ? 'Loss' : 'Win'
    }
    return 'Abandoned'
  }

  const resultClass = (game: Doc<'games'>): string =>
    resultFor(game).toLowerCase()

  if (selectedGame) {
    return (
      <GameViewer game={selectedGame} onClose={() => setSelectedGame(null)} />
    )
  }

  return (
    <div className="game-history-overlay" onClick={onClose}>
      <div className="game-history-modal" onClick={(event) => event.stopPropagation()}>
        <div className="game-history-header">
          <h3>Game History</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="game-history-content">
          {games === undefined ? (
            <div className="loading">Loading games...</div>
          ) : (
            <div className="games-list">
              {games.length === 0 ? (
                <div className="no-games">No games played yet</div>
              ) : (
                games.map((game) => (
                  <div
                    key={game._id}
                    className="game-item"
                    onClick={() => setSelectedGame(game)}
                  >
                    <div className="game-players">
                      <div className="player white">
                        <span className="piece">♔</span>
                        {nameOf(game.whitePlayerId)}
                      </div>
                      <div className="vs">vs</div>
                      <div className="player black">
                        <span className="piece">♚</span>
                        {nameOf(game.blackPlayerId)}
                      </div>
                    </div>
                    <div className="game-info">
                      <div className={`result ${resultClass(game)}`}>
                        {resultFor(game)}
                      </div>
                      <div className="time-control">{game.timeControl}</div>
                      <div className="date">
                        {game.finishedAt
                          ? new Date(game.finishedAt).toLocaleDateString()
                          : ''}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameHistory
