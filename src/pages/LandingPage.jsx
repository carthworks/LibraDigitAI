import { useState, useEffect } from 'react'
import {
    ShieldCheck,
    Lock,
    Layers,
    Search,
    ArrowRight,
    Archive,
    PenLine,
    Languages,
    Download,
    WifiOff,
    Sun,
    Moon
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import LogoLoader from '../components/LogoLoader'
import LoginScreen from '../components/LoginScreen'
import ArchivalFlowVisualizer from '../components/ArchivalFlowVisualizer'

const DOWNLOAD_URL = 'https://github.com/carthworks/LibraDigitAI/releases/latest'
const SCREENSHOT_BASE = `${import.meta.env.BASE_URL}screenshots/`

const STEPS = [
    {
        title: 'Upload and extract the text',
        text: 'Drop in scans, photos or PDFs, one at a time or a whole batch. OCR runs on your computer, page by page, with a progress bar. Scanned PDFs are detected automatically and pages are turned upright.',
        image: 'upload-ocr.webp',
        alt: 'Upload page after OCR has finished on a scanned 1954 library report',
    },
    {
        title: 'Review',
        text: 'Correct recognition errors side by side with the original page. Words the OCR was unsure about can be highlighted.',
        image: 'review.webp',
        alt: 'Cleanup editor showing the scanned page next to its editable text',
    },
    {
        title: 'Describe',
        text: 'Add title, author, year and subject. LibraDigit suggests them from the text, and you stay in control of what is saved.',
        image: 'describe.webp',
        alt: 'Metadata form with title, author, year and subject filled in',
    },
    {
        title: 'Archive',
        text: 'Get a PDF/A-2b file with your catalogue details embedded, in a BagIt folder with checksums and a Dublin Core record.',
        image: 'archive.webp',
        alt: 'Archive result showing a PDF/A-2b file saved to the archive folder',
    },
]

const FEATURES = [
    {
        icon: Search,
        tone: 'warning',
        title: 'Full-text search',
        text: 'Search everything you have archived, with highlighted matches and filters by field and year.',
    },
    {
        icon: Layers,
        tone: 'accent',
        title: 'Batch processing',
        text: 'Process whole folders of scans with a status for every file.',
    },
    {
        icon: Archive,
        tone: 'success',
        title: 'Archival formats',
        text: 'PDF/A-2b checked with the veraPDF validator, BagIt packages with SHA-256 checksums, and Dublin Core export as CSV (for Excel, DSpace or Omeka) or oai_dc XML.',
    },
    {
        icon: PenLine,
        tone: 'primary',
        title: 'Handwriting mode',
        text: 'A dedicated mode for handwritten pages, including a handwriting-to-PDF converter.',
    },
    {
        icon: Languages,
        tone: 'info',
        title: '10 OCR languages included',
        text: 'English, Spanish, French, German, Italian, Portuguese, Hindi, Chinese (Simplified), Japanese and Russian.',
    },
]

const LandingPage = ({ onLogin, isLoggedIn }) => {
    const navigate = useNavigate()
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [isFirstRun, setIsFirstRun] = useState(false)
    // Inside the desktop app the visitor already has LibraDigit, so offer to open it instead of downloading it.
    const isDesktop = Boolean(window.electron)

    useEffect(() => {
        const storedHash = localStorage.getItem('auth_hash')
        setIsFirstRun(!storedHash)
    }, [])

    const { theme, toggleTheme } = useTheme()

    const handleLaunchWorkspace = () => {
        if (isLoggedIn) {
            navigate('/')
        } else {
            setShowLoginModal(true)
        }
    }

    const primaryAction = isDesktop ? (
        <button className="btn-hero-primary" onClick={handleLaunchWorkspace}>
            <span>{isFirstRun && !isLoggedIn ? 'Set up my archive' : 'Open my archive'}</span>
            <ArrowRight size={18} />
        </button>
    ) : (
        <a className="btn-hero-primary" href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
            <Download size={18} />
            <span>Download for Windows</span>
        </a>
    )

    return (
        <div className="landing-container">
            {/* Header / Navigation */}
            <header className="landing-nav">
                <div className="landing-nav-inner">
                    <div className="landing-brand">
                        <LogoLoader size="sm" />
                        <div className="brand-text">
                            <span className="brand-title">LibraDigit AI</span>
                            <span className="brand-tag">v{__APP_VERSION__} • Free for Windows</span>
                        </div>
                    </div>

                    <nav className="landing-nav-links">
                        <a href="#how-it-works">How it works</a>
                        <a href="#features">Features</a>
                        <a href="#privacy">Privacy</a>
                    </nav>

                    <div className="landing-nav-actions">
                        <button
                            type="button"
                            className="btn-theme-nav"
                            onClick={toggleTheme}
                            title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
                            aria-label="Toggle visual theme"
                        >
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                        {isLoggedIn ? (
                            <button
                                className="btn-primary-action"
                                onClick={() => navigate('/')}
                            >
                                <span>Enter Workspace</span>
                                <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button
                                className="btn-primary-action"
                                onClick={() => setShowLoginModal(true)}
                            >
                                <Lock size={16} />
                                <span>{isFirstRun ? 'Setup & Login' : 'Sign In'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* 1. Hero */}
            <section className="landing-hero">
                <div className="hero-content">
                    <div className="hero-badge">
                        <ShieldCheck size={14} />
                        <span>For libraries, museums, schools, colleges and government offices</span>
                    </div>

                    <h1 className="hero-headline">
                        Turn scanned documents into a <span className="gradient-text">searchable digital archive</span> on your own computer.
                    </h1>

                    <p className="hero-subheadline">
                        LibraDigit reads your scans and PDFs with OCR, lets you correct the text and add catalogue details,
                        and saves each document as a preservation-ready PDF/A package. Nothing is uploaded anywhere.
                    </p>

                    <div className="hero-cta-group">
                        {primaryAction}
                        <a href="#how-it-works" className="btn-hero-secondary">
                            <span>See how it works</span>
                        </a>
                    </div>

                    <p className="hero-smallprint">
                        Free · Windows 10 and 11 · Works offline · OCR in 10 languages included
                    </p>
                </div>

                <div className="hero-preview-wrapper hero-flow-3d-wrapper">
                    <ArchivalFlowVisualizer />
                </div>
            </section>

            {/* 2. How it works */}
            <section className="landing-steps" id="how-it-works">
                <div className="landing-section-header">
                    <span className="landing-section-eyebrow">How it works</span>
                    <h2 className="landing-section-title">From a scanned page to an archived, searchable record</h2>
                </div>

                <ol className="landing-step-list">
                    {STEPS.map((step, index) => (
                        <li className="landing-step-row" key={step.title}>
                            <div className="landing-step-text">
                                <span className="landing-step-number">{index + 1}</span>
                                <h3>{step.title}</h3>
                                <p>{step.text}</p>
                            </div>
                            <figure className="landing-shot">
                                <img
                                    src={`${SCREENSHOT_BASE}${step.image}`}
                                    alt={step.alt}
                                    width="1400"
                                    height="875"
                                    loading="lazy"
                                    decoding="async"
                                />
                            </figure>
                        </li>
                    ))}
                </ol>
            </section>

            {/* 3. What you get */}
            <section className="landing-features" id="features">
                <div className="landing-section-header">
                    <span className="landing-section-eyebrow">What you get</span>
                    <h2 className="landing-section-title">Everything a small archive needs, in one app</h2>
                </div>

                <div className="landing-features-grid">
                    {FEATURES.map(({ icon: Icon, tone, title, text }) => (
                        <div className="landing-feature-card" key={title}>
                            <div className={`landing-feature-icon-box ${tone}`}>
                                <Icon size={24} />
                            </div>
                            <h3>{title}</h3>
                            <p>{text}</p>
                        </div>
                    ))}
                </div>

                <figure className="landing-shot landing-shot-wide">
                    <img
                        src={`${SCREENSHOT_BASE}search.webp`}
                        alt="Archive search finding the 1954 report by a phrase from its text"
                        width="1400"
                        height="875"
                        loading="lazy"
                        decoding="async"
                    />
                </figure>
            </section>

            {/* 4. Private by design */}
            <section className="landing-privacy" id="privacy">
                <div className="landing-privacy-card">
                    <WifiOff size={32} className="landing-privacy-icon" />
                    <div>
                        <h2>Your documents never leave your computer.</h2>
                        <p>
                            OCR, search and archiving all run locally. There is no account and no telemetry,
                            and the app keeps working with no internet connection.
                        </p>
                        <p className="landing-privacy-note">
                            The optional Translate button sends the selected text to Google Translate.
                            Administrators can switch it off.
                        </p>
                    </div>
                </div>
            </section>

            {/* 5. Closing call to action */}
            <section className="landing-cta-banner">
                <div className="cta-banner-content">
                    <h2>Start digitizing today.</h2>
                    <p>{isDesktop ? 'Your archive is ready when you are.' : 'Free. Installs in about two minutes.'}</p>
                    <div className="cta-btn-group">
                        {primaryAction}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-inner">
                    <div className="footer-col brand">
                        <div className="footer-brand">
                            <LogoLoader size="sm" />
                            <span>LibraDigit AI</span>
                        </div>
                        <p>Free desktop software for digitizing and preserving documents, for libraries, museums, schools, colleges and government offices.</p>
                        <div className="footer-badge">
                            <ShieldCheck size={14} />
                            <span>Works offline</span>
                        </div>
                    </div>

                    <div className="footer-col">
                        <h4>Product</h4>
                        <a href="#how-it-works">How it works</a>
                        <a href="#features">Features</a>
                        <a href="#privacy">Privacy</a>
                        <Link to="/pricing">Pricing</Link>
                    </div>

                    <div className="footer-col">
                        <h4>Trust & Legal</h4>
                        <Link to="/privacy">Privacy Policy</Link>
                        <Link to="/terms">Terms of Service</Link>
                        <Link to="/refund">Cancellation & Refund</Link>
                        <Link to="/cookies">Cookie Policy</Link>
                        <Link to="/trust">Trust & Compliance Hub</Link>
                    </div>

                    <div className="footer-col">
                        <h4>Company & Support</h4>
                        <Link to="/about">About Us</Link>
                        <Link to="/contact">Contact & Support</Link>
                        <Link to="/help">Help & Documentation</Link>
                        <button
                            type="button"
                            className="footer-link-btn"
                            onClick={() => window.openCookieConsentSettings?.()}
                            title="Manage cookie consent choices"
                        >
                            Cookie Preferences
                        </button>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© 2026 LibraDigit AI. Created by Carthworks / Karthikeyan T (<a href="mailto:tkarthikeyan@gmail.com" style={{ color: '#f08418', textDecoration: 'none' }}>tkarthikeyan@gmail.com</a>). All rights reserved.</p>
                    <div className="footer-bottom-links">
                        <Link to="/privacy">Privacy</Link>
                        <span className="dot-sep">•</span>
                        <Link to="/terms">Terms</Link>
                        <span className="dot-sep">•</span>
                        <Link to="/refund">Refund Policy</Link>
                        <span className="dot-sep">•</span>
                        <Link to="/pricing">Pricing</Link>
                        <span className="dot-sep">•</span>
                        <Link to="/contact">Contact</Link>
                        <span className="dot-sep">•</span>
                        <button
                            type="button"
                            className="footer-link-btn"
                            style={{ display: 'inline', color: 'inherit' }}
                            onClick={() => window.openCookieConsentSettings?.()}
                        >
                            Cookies
                        </button>
                    </div>
                </div>
            </footer>

            {/* Interactive Login, Registration & Password Reset Modal */}
            {showLoginModal && (
                <LoginScreen
                    isModal={true}
                    initialMode={isFirstRun ? 'register' : 'login'}
                    onClose={() => setShowLoginModal(false)}
                    onLogin={() => {
                        if (onLogin) onLogin()
                        setShowLoginModal(false)
                        navigate('/')
                    }}
                />
            )}
        </div>
    )
}

export default LandingPage
