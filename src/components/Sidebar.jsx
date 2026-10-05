import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import {
    LayoutDashboard,
    UploadCloud,
    Layers,
    Search,
    BarChart3,
    Settings,
    HelpCircle,
    Sparkles,
    LogOut,
    ChevronDown,
    Archive,
    FolderKanban,
    Database,
    Cpu
} from 'lucide-react'

const Sidebar = ({ onLogout }) => {
    const location = useLocation()
    const navigate = useNavigate()
    const { fetchProjects } = useProject()

    // Accordion state for submenus
    const [openSections, setOpenSections] = useState({
        digitization: true,
        repository: true,
        system: true
    })

    // Automatically expand the section that contains the current active route
    useEffect(() => {
        const path = location.pathname
        if (['/upload', '/batch'].includes(path) || path.startsWith('/cleanup') || path.startsWith('/metadata') || path.startsWith('/archive/')) {
            setOpenSections(prev => ({ ...prev, digitization: true }))
        } else if (['/search', '/analytics'].includes(path)) {
            setOpenSections(prev => ({ ...prev, repository: true }))
        } else if (['/settings', '/help', '/marketing'].includes(path)) {
            setOpenSections(prev => ({ ...prev, system: true }))
        }
    }, [location.pathname])

    const toggleSection = (sectionKey) => {
        setOpenSections(prev => ({
            ...prev,
            [sectionKey]: !prev[sectionKey]
        }))
    }

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/'
        return location.pathname.startsWith(path)
    }

    const handleNavigation = (path) => {
        if (path === '/') {
            fetchProjects()
        }
        navigate(path)
    }

    return (
        <aside className="app-sidebar" aria-label="Main Application Sidebar">
            {/* Compact Header */}
            <div className="sidebar-brand-header">
                <div className="brand-logo-wrap" onClick={() => handleNavigation('/')}>
                    <div className="brand-icon-box">
                        <Archive size={20} className="brand-icon" />
                    </div>
                    <div className="brand-titles">
                        <span className="brand-name">LibraDigit AI</span>
                        <span className="brand-tagline">Preservation Hub</span>
                    </div>
                </div>
            </div>

            {/* Scrollable / Compact Navigation Container */}
            <nav className="sidebar-nav-scroll" aria-label="Navigation Menu">
                {/* Main Dashboard */}
                <div className="nav-group solo-item">
                    <button
                        type="button"
                        onClick={() => handleNavigation('/')}
                        className={`sidebar-nav-btn ${isActive('/') ? 'active' : ''}`}
                        aria-current={isActive('/') ? 'page' : undefined}
                    >
                        <LayoutDashboard size={18} className="nav-icon" />
                        <span className="nav-label">Command Center</span>
                    </button>
                </div>

                {/* Section 1: Digitization Studio */}
                <div className="nav-group">
                    <button
                        type="button"
                        className={`group-header-btn ${openSections.digitization ? 'expanded' : ''}`}
                        onClick={() => toggleSection('digitization')}
                        aria-expanded={openSections.digitization}
                    >
                        <div className="group-title-left">
                            <FolderKanban size={15} className="group-icon" />
                            <span>Digitization Studio</span>
                        </div>
                        <ChevronDown size={14} className={`chevron-indicator ${openSections.digitization ? 'rotated' : ''}`} />
                    </button>

                    {openSections.digitization && (
                        <div className="submenu-items-list">
                            <button
                                type="button"
                                onClick={() => handleNavigation('/upload')}
                                className={`submenu-nav-btn ${isActive('/upload') ? 'active' : ''}`}
                                aria-current={isActive('/upload') ? 'page' : undefined}
                            >
                                <UploadCloud size={16} className="sub-icon" />
                                <span>Single Document OCR</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleNavigation('/batch')}
                                className={`submenu-nav-btn ${isActive('/batch') ? 'active' : ''}`}
                                aria-current={isActive('/batch') ? 'page' : undefined}
                            >
                                <Layers size={16} className="sub-icon" />
                                <span>Batch Ingest Queue</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Section 2: Repository & Discovery */}
                <div className="nav-group">
                    <button
                        type="button"
                        className={`group-header-btn ${openSections.repository ? 'expanded' : ''}`}
                        onClick={() => toggleSection('repository')}
                        aria-expanded={openSections.repository}
                    >
                        <div className="group-title-left">
                            <Database size={15} className="group-icon" />
                            <span>Archive & Intelligence</span>
                        </div>
                        <ChevronDown size={14} className={`chevron-indicator ${openSections.repository ? 'rotated' : ''}`} />
                    </button>

                    {openSections.repository && (
                        <div className="submenu-items-list">
                            <button
                                type="button"
                                onClick={() => handleNavigation('/search')}
                                className={`submenu-nav-btn ${isActive('/search') ? 'active' : ''}`}
                                aria-current={isActive('/search') ? 'page' : undefined}
                            >
                                <Search size={16} className="sub-icon" />
                                <span>Archive Search</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleNavigation('/analytics')}
                                className={`submenu-nav-btn ${isActive('/analytics') ? 'active' : ''}`}
                                aria-current={isActive('/analytics') ? 'page' : undefined}
                            >
                                <BarChart3 size={16} className="sub-icon" />
                                <span>Telemetry & Metrics</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Section 3: System & Resources */}
                <div className="nav-group">
                    <button
                        type="button"
                        className={`group-header-btn ${openSections.system ? 'expanded' : ''}`}
                        onClick={() => toggleSection('system')}
                        aria-expanded={openSections.system}
                    >
                        <div className="group-title-left">
                            <Cpu size={15} className="group-icon" />
                            <span>System & Resources</span>
                        </div>
                        <ChevronDown size={14} className={`chevron-indicator ${openSections.system ? 'rotated' : ''}`} />
                    </button>

                    {openSections.system && (
                        <div className="submenu-items-list">
                            <button
                                type="button"
                                onClick={() => handleNavigation('/settings')}
                                className={`submenu-nav-btn ${isActive('/settings') ? 'active' : ''}`}
                                aria-current={isActive('/settings') ? 'page' : undefined}
                            >
                                <Settings size={16} className="sub-icon" />
                                <span>Engine Settings</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleNavigation('/help')}
                                className={`submenu-nav-btn ${isActive('/help') ? 'active' : ''}`}
                                aria-current={isActive('/help') ? 'page' : undefined}
                            >
                                <HelpCircle size={16} className="sub-icon" />
                                <span>Help & Compliance</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleNavigation('/marketing')}
                                className={`submenu-nav-btn ${isActive('/marketing') ? 'active' : ''}`}
                                aria-current={isActive('/marketing') ? 'page' : undefined}
                            >
                                <Sparkles size={16} className="sub-icon text-accent" />
                                <span>Product Showcase</span>
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* Compact Footer */}
            <div className="sidebar-compact-footer">
                <div className="footer-sovereign-pill">
                    <span className="live-dot"></span>
                    <span className="pill-text">Local Engine Active</span>
                </div>

                <div className="footer-actions-row">
                    <button
                        type="button"
                        className="btn-sidebar-logout"
                        onClick={onLogout}
                        title="Sign out of sovereign workspace"
                        aria-label="Sign out"
                    >
                        <LogOut size={15} />
                        <span>Sign Out</span>
                    </button>

                    <span className="version-chip" title="LibraDigit AI Version">v{__APP_VERSION__}</span>
                </div>
            </div>
        </aside>
    )
}

export default Sidebar
