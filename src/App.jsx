import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import UploadOCR from './pages/UploadOCR'
import Cleanup from './pages/Cleanup'
import Metadata from './pages/Metadata'
import Archive from './pages/Archive'
import { ProjectProvider } from './context/ProjectContext'

function App() {
    return (
        <ProjectProvider>
            <Router>
                <div className="app-container">
                    <Sidebar />
                    <div className="main-content">
                        <Header />
                        <div className="content-area">
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/upload" element={<UploadOCR />} />
                                <Route path="/cleanup/:projectId" element={<Cleanup />} />
                                <Route path="/metadata/:projectId" element={<Metadata />} />
                                <Route path="/archive/:projectId" element={<Archive />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </div>
                    </div>
                </div>
            </Router>
        </ProjectProvider>
    )
}

export default App
