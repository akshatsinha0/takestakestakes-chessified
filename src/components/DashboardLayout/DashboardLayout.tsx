import React from 'react';
import TwinklingStars from '../TwinklingStars/TwinklingStars';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="dashboard-layout">
      <TwinklingStars />
      <div className="dashboard-content-wrapper">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
