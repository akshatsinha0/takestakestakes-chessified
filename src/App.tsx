import React, { useState, lazy, Suspense } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './App.css'

import { AuthProvider, useAuth } from './context/AuthContext'

// Lazy load components
const Sidebar = lazy(() => import('./components/Sidebar/Sidebar'))
const MainLayout = lazy(() => import('./components/Layout/MainLayout'))
const AuthPanel = lazy(() => import('./components/Authentication/AuthPanel'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Profile = lazy(() => import('./pages/Profile'))
const MyAccount = lazy(() => import('./pages/MyAccount'))
const Settings = lazy(() => import('./pages/Settings'))

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingFallback />
  }

  if (!isAuthenticated) {
    return <Navigate to='/' replace />
  }

  return children
}

// Public route that redirects authenticated users to dashboard
const PublicRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <LoadingFallback />
  }

  if (isAuthenticated) {
    return <Navigate to='/dashboard' replace />
  }

  return children
}

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: 'var(--primary-dark)',
      color: 'var(--text-light)',
    }}
  >
    <div>Loading...</div>
  </div>
)

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null)

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const openAuth = (mode: 'login' | 'signup') => setAuthMode(mode)
  const closeAuth = () => setAuthMode(null)

  return (
    <div className='app'>
      <ToastContainer
        position='top-right'
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme='dark'
      />

      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Home route */}
          <Route
            path='/'
            element={
              <PublicRoute>
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
                  {authMode && (
                    <AuthPanel
                      mode={authMode}
                      closePanel={closeAuth}
                      switchMode={(mode) => setAuthMode(mode)}
                    />
                  )}
                </>
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path='/dashboard'
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path='/profile'
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path='/account'
            element={
              <ProtectedRoute>
                <MyAccount />
              </ProtectedRoute>
            }
          />

          <Route
            path='/settings'
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* Fallback route */}
          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

export default App
