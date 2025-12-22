import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout/DashboardLayout';
import Header from '../components/Header/Header';
import ChessboardSection from '../components/ChessboardSection/ChessboardSection';
import GameOptions from '../components/GameOptions/GameOptions';
import ChallengeNotification from '../components/ChallengeNotification/ChallengeNotification';
import ActiveGames from '../components/ActiveGames/ActiveGames';
import { useSupabaseAuthContext } from '../context/SupabaseAuthContext';
import { useUserPresence } from '../hooks/useUserPresence';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const [playYourselfMode, setPlayYourselfMode] = useState(false);
  const [playBotMode, setPlayBotMode] = useState(false);
  const [selectedBot, setSelectedBot] = useState<any>(null);
  
  // Track user presence
  useUserPresence(user?.id);

  const handlePlayYourself = () => setPlayYourselfMode(true);
  const handleExitPlayYourself = () => setPlayYourselfMode(false);
  
  const handlePlayBot = (bot: any) => {
    setSelectedBot(bot);
    setPlayBotMode(true);
  };
  
  const handleExitBotMode = () => {
    setPlayBotMode(false);
    setSelectedBot(null);
  };

  return (
    <DashboardLayout>
      <Header />
      <ChallengeNotification />
      <div className="dashboard-content">
        {/* <ActiveGames /> */}
        <ChessboardSection 
          playYourselfMode={playYourselfMode} 
          onExitPlayYourself={handleExitPlayYourself}
          playBotMode={playBotMode}
          selectedBot={selectedBot}
          onExitBotMode={handleExitBotMode}
        />
        <GameOptions 
          onPlayYourself={handlePlayYourself}
          onPlayBot={handlePlayBot}
        />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
