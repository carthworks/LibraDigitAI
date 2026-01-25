import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Upload, Edit3, FileText, Archive, Settings, Layers, LogOut } from 'lucide-react'
import './Sidebar.css'

const Sidebar = ({ onLogout }) => {
    const location = useLocation()
    const navigate = useNavigate()

    const menuItems = [
        { path: '/', icon: Home, label: 'Dashboard' },
        { path: '/upload', icon: Upload, label: 'Upload & OCR' },
        { path: '/batch', icon: Layers, label: 'Batch Processing' },
    ]

    const isActive = (path) => location.pathname === path

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <Archive className="logo-icon" size={32} />
                    <div className="logo-text">
                        <h1 className="logo-title">LibraDigit AI</h1>
                        <p className="logo-subtitle">Digital Archive Builder</p>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                    >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="nav-item logout-btn" onClick={onLogout}>
                    <LogOut size={20} />
                    <span>Logout</span>
                </button>
                <div className="sidebar-info">
                    <p className="info-label">Version</p>
                    <p className="info-value">1.0.0</p>
                </div>
            </div>
        </div>
    )
}

export default Sidebar
