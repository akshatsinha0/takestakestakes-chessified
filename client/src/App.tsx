import React from 'react';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import Sidebar from './components/Sidebar/Sidebar';
import MainLayout from './components/Layout/MainLayout';
import AuthPanel from './components/Authentication/AuthPanel';
import Dashboard from './pages/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected route component with useEffect for navigation
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  
  return isAuthenticated ? children : null;
};

// Public route that redirects authenticated users to dashboard
const PublicRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  
  return !isAuthenticated ? children : null;
};

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const { isAuthenticated } = useAuth();
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const openAuth = (mode: 'login' | 'signup') => setAuthMode(mode);
  const closeAuth = () => setAuthMode(null);

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
        {/* Home route with conditional rendering */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
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
