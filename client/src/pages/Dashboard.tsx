import React from 'react';
import DashboardLayout from '../components/DashboardLayout/DashboardLayout';
import Header from '../components/Header/Header';
import ChessboardSection from '../components/ChessboardSection/ChessboardSection';
import GameOptions from '../components/GameOptions/GameOptions';
import './Dashboard.css';
const Dashboard: React.FC = () => {
  // User details would typically come from your authentication context/state
  // const userDetails = {
  //   username: 'CosmosCorona10',
  //   rating: 1850,
  //   avatarUrl: '/path/to/avatar.jpg'
  // };
  
  return (
    <DashboardLayout>
      <Header /> {/* Remove user prop */}
      <div className="dashboard-content">
        <ChessboardSection />
        <GameOptions />
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
