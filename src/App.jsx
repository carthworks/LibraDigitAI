import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import WelcomeScreen from './components/WelcomeScreen'
import LogoLoader from './components/LogoLoader'
import { ProjectProvider } from './context/ProjectContext'
import { ToastProvider } from './context/ToastContext'
import { ThemeProvider } from './context/ThemeContext'
import ErrorBoundary from './components/ErrorBoundary'

// The desktop app loads index.html from disk (file://), where path-style URLs
// such as file:///upload do not exist: reloading the window showed a blank
// page. Hash URLs (index.html#/upload) work there; the web build keeps clean URLs.
const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter

// Each page is its own chunk, so heavy libraries (charts, PDF rendering, the
// rich-text editor, bcrypt) only download when the page that needs them opens.
const LandingPage = lazy(() => import('./pages/LandingPage'))
const MarketingInfo = lazy(() => import('./pages/MarketingInfo'))
const LoginScreen = lazy(() => import('./components/LoginScreen'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const UploadOCR = lazy(() => import('./pages/UploadOCR'))
const BatchProcessing = lazy(() => import('./pages/BatchProcessing'))
const Cleanup = lazy(() => import('./pages/Cleanup'))
const Metadata = lazy(() => import('./pages/Metadata'))
const Archive = lazy(() => import('./pages/Archive'))
const ArchiveSearch = lazy(() => import('./pages/ArchiveSearch'))
const ConvertedEbooks = lazy(() => import('./pages/ConvertedEbooks'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Settings = lazy(() => import('./pages/Settings'))
const Help = lazy(() => import('./pages/Help'))
const TrustCenter = lazy(() => import('./pages/TrustCenter'))
import CookieConsent from './components/CookieConsent'

const PageFallback = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <LogoLoader size="md" />
    </div>
)

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
        <ThemeProvider>
            <ToastProvider>
                <ProjectProvider>
                {showWelcome && (
                    <WelcomeScreen onComplete={() => setShowWelcome(false)} />
                )}
                <Router>
                    <Suspense fallback={<PageFallback />}>
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

                        {/* Trust & Legal Compliance Anchors (Publicly accessible anytime) */}
                        <Route path="/trust" element={<TrustCenter />} />
                        <Route path="/about" element={<TrustCenter />} />
                        <Route path="/contact" element={<TrustCenter />} />
                        <Route path="/privacy" element={<TrustCenter />} />
                        <Route path="/terms" element={<TrustCenter />} />
                        <Route path="/refund" element={<TrustCenter />} />
                        <Route path="/pricing" element={<TrustCenter />} />
                        <Route path="/cookies" element={<TrustCenter />} />

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
                                                <ErrorBoundary inline={true}>
                                                    <Suspense fallback={<PageFallback />}>
                                                    <Routes>
                                                        <Route path="/" element={<Dashboard />} />
                                                        <Route path="/upload" element={<UploadOCR />} />
                                                        <Route path="/batch" element={<BatchProcessing />} />
                                                        <Route path="/cleanup/:projectId" element={<Cleanup />} />
                                                        <Route path="/metadata/:projectId" element={<Metadata />} />
                                                        <Route path="/archive/:projectId" element={<Archive />} />
                                                        <Route path="/ebooks" element={<ConvertedEbooks />} />
                                                        <Route path="/library" element={<ConvertedEbooks />} />
                                                        <Route path="/search" element={<ArchiveSearch />} />
                                                        <Route path="/analytics" element={<Analytics />} />
                                                        <Route path="/settings" element={<Settings />} />
                                                        <Route path="/help" element={<Help />} />
                                                        <Route path="/trust" element={<TrustCenter />} />
                                                        <Route path="/about" element={<TrustCenter />} />
                                                        <Route path="/contact" element={<TrustCenter />} />
                                                        <Route path="/privacy" element={<TrustCenter />} />
                                                        <Route path="/terms" element={<TrustCenter />} />
                                                        <Route path="/refund" element={<TrustCenter />} />
                                                        <Route path="/pricing" element={<TrustCenter />} />
                                                        <Route path="/cookies" element={<TrustCenter />} />
                                                        <Route path="*" element={<Navigate to="/" replace />} />
                                                    </Routes>
                                                    </Suspense>
                                                </ErrorBoundary>
                                            </div>
                                        </div>
                                    </div>
                                }
                            />
                        )}
                    </Routes>
                    </Suspense>
                    <CookieConsent />
                </Router>
            </ProjectProvider>
        </ToastProvider>
        </ThemeProvider>
    )
}

export default App
