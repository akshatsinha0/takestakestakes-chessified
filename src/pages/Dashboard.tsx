import React, { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import DashboardLayout from '../components/DashboardLayout/DashboardLayout'
import Header from '../components/Header/Header'
import ChessboardSection from '../components/ChessboardSection/ChessboardSection'
import GameOptions from '../components/GameOptions/GameOptions'
import ChallengeNotification from '../components/ChallengeNotification/ChallengeNotification'
import { useAuth } from '../context/AuthContext'
import { useUserPresence } from '../hooks/useUserPresence'
import './Dashboard.css'

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  // When an online game is active, the board takes over the dashboard and the
  // play options / challenge banner are hidden so play happens in place.
  const currentGame = useQuery(api.games.currentForUser, user ? {} : 'skip')
  const inGame = Boolean(currentGame)
  const [playYourselfMode, setPlayYourselfMode] = useState(false)
  const [playBotMode, setPlayBotMode] = useState(false)
  const [selectedBot, setSelectedBot] = useState<any>(null)
  const [botTimeControl, setBotTimeControl] = useState<any>(null)

  // Track user presence
  useUserPresence(user?.id)

  const handlePlayYourself = () => setPlayYourselfMode(true)
  const handleExitPlayYourself = () => setPlayYourselfMode(false)

  const handlePlayBot = (bot: any, timeControl: any) => {
    setSelectedBot(bot)
    setBotTimeControl(timeControl)
    setPlayBotMode(true)
  }

  const handleExitBotMode = () => {
    setPlayBotMode(false)
    setSelectedBot(null)
    setBotTimeControl(null)
  }

  return (
    <DashboardLayout>
      <Header />
      {!inGame && <ChallengeNotification />}
      <div className='dashboard-content'>
        <ChessboardSection
          playYourselfMode={playYourselfMode}
          onExitPlayYourself={handleExitPlayYourself}
          playBotMode={playBotMode}
          selectedBot={selectedBot}
          botTimeControl={botTimeControl}
          onExitBotMode={handleExitBotMode}
        />
        {!inGame && (
          <GameOptions
            onPlayYourself={handlePlayYourself}
            onPlayBot={handlePlayBot}
          />
        )}
      </div>
    </DashboardLayout>
  )
}

export default Dashboard
