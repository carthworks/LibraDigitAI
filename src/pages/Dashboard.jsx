import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { Plus, FileText, Clock, CheckCircle, AlertCircle, Trash2 } from 'lucide-react'
import './Dashboard.css'

const Dashboard = () => {
    const navigate = useNavigate()
    const { projects, loading, error, deleteProject } = useProject()

    const getStatusInfo = (status) => {
        const statusMap = {
            upload: { label: 'Uploaded', color: 'primary', icon: FileText },
            ocr: { label: 'OCR Processing', color: 'primary', icon: Clock },
            cleanup: { label: 'Needs Cleanup', color: 'warning', icon: AlertCircle },
            metadata: { label: 'Needs Metadata', color: 'warning', icon: AlertCircle },
            archived: { label: 'Archived', color: 'accent', icon: CheckCircle }
        }
        return statusMap[status] || statusMap.upload
    }

    const getProgressPercentage = (status) => {
        const progressMap = {
            upload: 20,
            ocr: 40,
            cleanup: 60,
            metadata: 80,
            archived: 100
        }
        return progressMap[status] || 0
    }

    const handleProjectClick = (project) => {
        switch (project.status) {
            case 'upload':
            case 'ocr':
                navigate('/upload')
                break
            case 'cleanup':
                navigate(`/cleanup/${project.id}`)
                break
            case 'metadata':
                navigate(`/metadata/${project.id}`)
                break
            case 'archived':
                navigate(`/archive/${project.id}`)
                break
            default:
                navigate('/upload')
        }
    }

    const handleDelete = async (e, projectId) => {
        e.stopPropagation()
        if (window.confirm('Are you sure you want to delete this project?')) {
            try {
                await deleteProject(projectId)
            } catch (err) {
                alert('Failed to delete project')
            }
        }
    }

    if (loading && projects.length === 0) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Loading projects...</p>
            </div>
        )
    }

    return (
        <div className="dashboard">
            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <div>
                        <strong>Error</strong>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            <div className="dashboard-header">
                <div>
                    <h2>Your Projects</h2>
                    <p className="text-secondary">Manage your digitization workflow</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/upload')}>
                    <Plus size={20} />
                    Start New Project
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <FileText size={64} />
                    </div>
                    <h3 className="empty-state-title">No projects yet</h3>
                    <p className="empty-state-description">
                        Start your first digitization project by uploading a scanned document
                    </p>
                    <button className="btn btn-primary btn-lg mt-lg" onClick={() => navigate('/upload')}>
                        <Plus size={20} />
                        Create Your First Project
                    </button>
                </div>
            ) : (
                <div className="projects-grid">
                    {projects.map((project) => {
                        const statusInfo = getStatusInfo(project.status)
                        const StatusIcon = statusInfo.icon
                        const progress = getProgressPercentage(project.status)

                        return (
                            <div
                                key={project.id}
                                className="project-card"
                                onClick={() => handleProjectClick(project)}
                            >
                                <div className="project-card-header">
                                    <div className="project-icon">
                                        <FileText size={24} />
                                    </div>
                                    <button
                                        className="project-delete"
                                        onClick={(e) => handleDelete(e, project.id)}
                                        title="Delete project"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="project-info">
                                    <h3 className="project-name">{project.filename}</h3>
                                    <div className="project-meta">
                                        <span className={`badge badge-${statusInfo.color}`}>
                                            <StatusIcon size={14} />
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                </div>

                                <div className="project-progress">
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <span className="progress-text">{progress}% Complete</span>
                                </div>

                                <div className="project-footer">
                                    <span className="project-date">
                                        <Clock size={14} />
                                        {new Date(project.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default Dashboard
