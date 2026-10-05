import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { HelpCircle, Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import HelpModal from './HelpModal'

const Header = () => {
    const location = useLocation()
    const [showHelp, setShowHelp] = useState(false)

    // Keyboard shortcut: ? to open help
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === '?' && !showHelp) {
                e.preventDefault()
                setShowHelp(true)
            }
        }

        window.addEventListener('keypress', handleKeyPress)
        return () => window.removeEventListener('keypress', handleKeyPress)
    }, [showHelp])

    const getPageTitle = () => {
        switch (location.pathname) {
            case '/':
                return 'Dashboard'
            case '/upload':
                return 'Upload & OCR'
            case '/batch':
                return 'Batch Processing'
            case '/search':
                return 'Archive Search'
            case '/analytics':
                return 'Analytics & Reports'
            case '/settings':
                return 'System Settings'
            case '/help':
                return 'Help & Documentation'
            case location.pathname.match(/\/cleanup/)?.input:
                return 'OCR Cleanup'
            case location.pathname.match(/\/metadata/)?.input:
                return 'Metadata Editor'
            case location.pathname.match(/\/archive/)?.input:
                return 'Archive Builder'
            default:
                return 'LibraDigit AI'
        }
    }

    const getPageDescription = () => {
        switch (location.pathname) {
            case '/':
                return 'Manage your digitization projects'
            case '/upload':
                return 'Upload documents and run OCR processing'
            case '/batch':
                return 'Process multiple documents in bulk'
            case '/search':
                return 'Full-text search across your digital archive'
            case '/analytics':
                return 'Archive statistics, storage usage, and growth'
            case '/settings':
                return 'Configure storage paths, OCR engines, and defaults'
            case '/help':
                return 'User manual, workflows, and troubleshooting'
            case location.pathname.match(/\/cleanup/)?.input:
                return 'Review and improve OCR text accuracy'
            case location.pathname.match(/\/metadata/)?.input:
                return 'Add metadata to make documents discoverable'
            case location.pathname.match(/\/archive/)?.input:
                return 'Generate structured digital archive'
            default:
                return 'Digital Archive Builder'
        }
    }

    const { theme, toggleTheme } = useTheme()

    return (
        <>
            <header className="header">
                <div className="header-content">
                    <div className="header-title-section">
                        <h1 className="header-title">{getPageTitle()}</h1>
                        <p className="header-description">{getPageDescription()}</p>
                    </div>
                    <div className="header-actions">
                        <button
                            className="header-btn theme-toggle-btn"
                            title={theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
                            aria-label="Toggle visual theme"
                            onClick={toggleTheme}
                        >
                            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                        <button
                            className="header-btn"
                            title="Help & Guide"
                            aria-label="Open help and documentation dialog"
                            onClick={() => setShowHelp(true)}
                        >
                            <HelpCircle size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
        </>
    )
}

export default Header
