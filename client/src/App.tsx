// import { ReactNode } from 'react';
import React from 'react';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import Sidebar from './components/Sidebar/Sidebar';
import MainLayout from './components/Layout/MainLayout';
import AuthPanel from './components/Authentication/AuthPanel';
import Dashboard from './pages/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected route component to ensure only authenticated users can access
const ProtectedRoute = ({ children }: { children: React.ReactElement  }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const { isAuthenticated } = useAuth();
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const openAuth = (mode: 'login' | 'signup') => setAuthMode(mode);
  const closeAuth = () => setAuthMode(null);
  
  // Auto-redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && window.location.pathname === '/') {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated]);

  return (
    <div className="app">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      
      <Routes>
        {/* Home route with landing page */}
        <Route 
          path="/" 
          element={
            <>
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
              {authMode && 
                <AuthPanel 
                  mode={authMode} 
                  closePanel={closeAuth} 
                  switchMode={(mode) => setAuthMode(mode)} 
                />
              }
            </>
          } 
        />
        
        {/* Protected dashboard route */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Fallback route for any unmatched paths */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
