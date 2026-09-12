import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { Home, Upload, Edit3, FileText, Archive, Settings, Layers, LogOut, Search, TrendingUp } from 'lucide-react'
import './Sidebar.css'

const Sidebar = ({ onLogout }) => {
    const location = useLocation()
    const navigate = useNavigate()
    const { fetchProjects } = useProject()

    const menuItems = [
        { path: '/', icon: Home, label: 'Dashboard' },
        { path: '/upload', icon: Upload, label: 'Upload & OCR' },
        { path: '/batch', icon: Layers, label: 'Batch Processing' },
        { path: '/search', icon: Search, label: 'Archive Search' },
        { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
        { path: '/settings', icon: Settings, label: 'Settings' },
        { path: '/help', icon: FileText, label: 'Help & Guide' },
    ]

    const isActive = (path) => location.pathname === path

    const handleNavigation = (path) => {
        if (path === '/') {
            fetchProjects()
        }
        navigate(path)
    }

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <Archive className="logo-icon" size={32} />
                    <div className="logo-text">
                        <div className="logo-title">LibraDigit AI</div>
                        <p className="logo-subtitle">Digital Archive Builder</p>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav" aria-label="Main Navigation">
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => handleNavigation(item.path)}
                        className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                        aria-current={isActive(item.path) ? 'page' : undefined}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="nav-item logout-btn" onClick={onLogout} aria-label="Log out of application">
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
                <div className="sidebar-info">
                    <p className="info-label">Version</p>
                    <p className="info-value">1.2.0</p>
                </div>
            </div>
        </div>
    )
}

export default Sidebar
