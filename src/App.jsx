import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import UploadOCR from './pages/UploadOCR'
import Cleanup from './pages/Cleanup'
import Metadata from './pages/Metadata'
import Archive from './pages/Archive'
import Help from './pages/Help'
import BatchProcessing from './pages/BatchProcessing'
import WelcomeScreen from './components/WelcomeScreen'
import LoginScreen from './components/LoginScreen'
import LandingPage from './pages/LandingPage'
import MarketingInfo from './pages/MarketingInfo'
import { ProjectProvider } from './context/ProjectContext'
import ArchiveSearch from './pages/ArchiveSearch'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import { ToastProvider } from './context/ToastContext'

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(() => {
        return localStorage.getItem('app_session_active') === 'true'
    })
    const [showWelcome, setShowWelcome] = useState(false)

    useEffect(() => {
        // Sync logout/login across tabs
        const handleStorageChange = (e) => {
            if (e.key === 'app_session_active') {
                setIsLoggedIn(e.newValue === 'true')
            }
        }
        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [])

    const handleLogin = () => {
        localStorage.setItem('app_session_active', 'true')
        setIsLoggedIn(true)
        setShowWelcome(true)
    }

    const handleLogout = () => {
        localStorage.removeItem('app_session_active')
        setIsLoggedIn(false)
    }

    return (
        <ToastProvider>
            <ProjectProvider>
                {showWelcome && (
                    <WelcomeScreen onComplete={() => setShowWelcome(false)} />
                )}
                <Router>
                    <Routes>
                        {/* Public Routes accessible anytime */}
                        <Route
                            path="/landing"
                            element={<LandingPage onLogin={handleLogin} isLoggedIn={isLoggedIn} />}
                        />
                        <Route
                            path="/marketing"
                            element={<MarketingInfo isLoggedIn={isLoggedIn} onOpenLogin={() => {}} />}
                        />

                        {/* If not logged in, root routes render LandingPage or Login */}
                        {!isLoggedIn ? (
                            <>
                                <Route
                                    path="/"
                                    element={<LandingPage onLogin={handleLogin} isLoggedIn={false} />}
                                />
                                <Route
                                    path="/login"
                                    element={<LoginScreen onLogin={handleLogin} />}
                                />
                                <Route
                                    path="*"
                                    element={<Navigate to="/" replace />}
                                />
                            </>
                        ) : (
                            /* Authenticated Workspace */
                            <Route
                                path="/*"
                                element={
                                    <div className="app-container">
                                        <Sidebar onLogout={handleLogout} />
                                        <div className="main-content">
                                            <Header />
                                            <div className="content-area">
                                                <Routes>
                                                    <Route path="/" element={<Dashboard />} />
                                                    <Route path="/upload" element={<UploadOCR />} />
                                                    <Route path="/batch" element={<BatchProcessing />} />
                                                    <Route path="/cleanup/:projectId" element={<Cleanup />} />
                                                    <Route path="/metadata/:projectId" element={<Metadata />} />
                                                    <Route path="/archive/:projectId" element={<Archive />} />
                                                    <Route path="/search" element={<ArchiveSearch />} />
                                                    <Route path="/analytics" element={<Analytics />} />
                                                    <Route path="/settings" element={<Settings />} />
                                                    <Route path="/help" element={<Help />} />
                                                    <Route path="*" element={<Navigate to="/" replace />} />
                                                </Routes>
                                            </div>
                                        </div>
                                    </div>
                                }
                            />
                        )}
                    </Routes>
                </Router>
            </ProjectProvider>
        </ToastProvider>
    )
}

export default App
