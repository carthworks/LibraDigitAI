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
import { ProjectProvider } from './context/ProjectContext'
import ArchiveSearch from './pages/ArchiveSearch'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import { ToastProvider } from './context/ToastContext'

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [showWelcome, setShowWelcome] = useState(false)

    useEffect(() => {
        // Sync logout across tabs - listen for storage events from other tabs
        const handleStorageChange = (e) => {
            if (e.key === 'app_session_active' && !e.newValue) {
                setIsLoggedIn(false)
            }
        }
        window.addEventListener('storage', handleStorageChange)

        // Optional: Check existence on mount if we wanted persistence, 
        // but for now we settle for just syncing the logout action if it happens elsewhere.

        return () => window.removeEventListener('storage', handleStorageChange)
    }, [])

    const handleLogin = () => {
        localStorage.setItem('app_session_active', 'true')
        setIsLoggedIn(true)
        setShowWelcome(true)
    }

    if (!isLoggedIn) {
        return <LoginScreen onLogin={handleLogin} />
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
                </Router>
            </ProjectProvider>
        </ToastProvider>
    )
}

export default App
