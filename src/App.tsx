import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import { SupabaseAuthProvider, useSupabaseAuthContext } from './context/SupabaseAuthContext';

// Lazy load components
const Sidebar = lazy(() => import('./components/Sidebar/Sidebar'));
const MainLayout = lazy(() => import('./components/Layout/MainLayout'));
const AuthPanel = lazy(() => import('./components/Authentication/AuthPanel'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const MyAccount = lazy(() => import('./pages/MyAccount'));
const Settings = lazy(() => import('./pages/Settings'));
const Game = lazy(() => import('./pages/Game'));

// Protected route component with useEffect for navigation
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, loading } = useSupabaseAuthContext();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('[ProtectedRoute] Not authenticated, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);
  
  // Show loading while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: 'var(--primary-dark, #1a1d29)',
        color: 'var(--text-light, #fff)'
      }}>
        <div>Loading...</div>
      </div>
    );
  }
  
  return isAuthenticated ? children : null;
};

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    backgroundColor: 'var(--primary-dark, #1a1d29)',
    color: 'var(--text-light, #fff)'
  }}>
    <div>Loading...</div>
  </div>
);

// Public route that redirects authenticated users to dashboard
const PublicRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, loading } = useSupabaseAuthContext();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && isAuthenticated) {
      console.log('[PublicRoute] User authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: 'var(--primary-dark, #1a1d29)',
        color: 'var(--text-light, #fff)'
      }}>
        <div>Loading...</div>
      </div>
    );
  }
  
  return !isAuthenticated ? children : null;
};

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const { isAuthenticated } = useSupabaseAuthContext();
  
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
      
      <Suspense fallback={<LoadingFallback />}>
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
        
        {/* Protected profile route */}
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        
        {/* Protected account route */}
        <Route path="/account" element={<ProtectedRoute><MyAccount /></ProtectedRoute>} />
        
        {/* Protected settings route */}
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        
        {/* Protected game route */}
        <Route path="/game/:gameId" element={<ProtectedRoute><Game /></ProtectedRoute>} />
        
          {/* Fallback route for any unmatched paths */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <Router>
      <SupabaseAuthProvider>
        <AppContent />
      </SupabaseAuthProvider>
    </Router>
  );
}

export default App;
