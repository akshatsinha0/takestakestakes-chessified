import { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar/Sidebar';
import MainLayout from './components/Layout/MainLayout';
import AuthPanel from './components/Authentication/AuthPanel';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const openAuth = (mode: 'login' | 'signup') => setAuthMode(mode);
  const closeAuth = () => setAuthMode(null);

  return (
    <div className="app">
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={toggleSidebar} 
        openLogin={() => openAuth('login')} 
      />
      <MainLayout 
        toggleSidebar={toggleSidebar} 
        openLogin={() => openAuth('login')} 
        openSignup={() => openAuth('signup')} 
      />
      {authMode && <AuthPanel mode={authMode} closePanel={closeAuth} switchMode={(mode) => setAuthMode(mode)} />}
    </div>
  );
}

export default App;
