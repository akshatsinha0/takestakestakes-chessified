import React, { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout/DashboardLayout'
import Header from '../components/Header/Header'
import ChessboardSection from '../components/ChessboardSection/ChessboardSection'
import GameOptions from '../components/GameOptions/GameOptions'
import ChallengeNotification from '../components/ChallengeNotification/ChallengeNotification'
import { useAuth } from '../context/AuthContext'
import { useUserPresence } from '../hooks/useUserPresence'
import { useActiveGameRedirect } from '../hooks/useActiveGameRedirect'
import './Dashboard.css'

const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const [playYourselfMode, setPlayYourselfMode] = useState(false)
  const [playBotMode, setPlayBotMode] = useState(false)
  const [selectedBot, setSelectedBot] = useState<any>(null)
  const [botTimeControl, setBotTimeControl] = useState<any>(null)

  // Track user presence
  useUserPresence(user?.id)
  // Join a game the moment a sent challenge is accepted (or matchmaking pairs).
  useActiveGameRedirect(Boolean(user))

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
      <ChallengeNotification />
      <div className='dashboard-content'>
        <ChessboardSection
          playYourselfMode={playYourselfMode}
          onExitPlayYourself={handleExitPlayYourself}
          playBotMode={playBotMode}
          selectedBot={selectedBot}
          botTimeControl={botTimeControl}
          onExitBotMode={handleExitBotMode}
        />
        <GameOptions
          onPlayYourself={handlePlayYourself}
          onPlayBot={handlePlayBot}
        />
      </div>
    </DashboardLayout>
  )
}

export default Dashboard
