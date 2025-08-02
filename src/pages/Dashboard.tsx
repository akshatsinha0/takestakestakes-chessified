import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout/DashboardLayout';
import Header from '../components/Header/Header';
import ChessboardSection from '../components/ChessboardSection/ChessboardSection';
import GameOptions from '../components/GameOptions/GameOptions';
import ChallengeNotification from '../components/ChallengeNotification/ChallengeNotification';
import ActiveGames from '../components/ActiveGames/ActiveGames';
import './Dashboard.css';
const Dashboard: React.FC = () => {
  const [playYourselfMode, setPlayYourselfMode] = useState(false);

  const handlePlayYourself = () => setPlayYourselfMode(true);
  const handleExitPlayYourself = () => setPlayYourselfMode(false);

  return (
    <DashboardLayout>
      <Header />
      <ChallengeNotification />
      <div className="dashboard-content">
        <ActiveGames />
        <ChessboardSection 
          playYourselfMode={playYourselfMode} 
          onExitPlayYourself={handleExitPlayYourself}
        />
        <GameOptions onPlayYourself={handlePlayYourself} />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
