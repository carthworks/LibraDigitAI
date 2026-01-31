import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { Plus, FileText, Clock, CheckCircle, AlertCircle, Trash2, LayoutGrid, List, Search, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react'
import Modal from '../components/Modal'
import { useToast } from '../context/ToastContext'
import { API_URL } from '../config'
import './Dashboard.css'

const Dashboard = () => {
    const navigate = useNavigate()
    const { projects, loading, error, deleteProject, fetchProjects } = useProject()
    const { addToast } = useToast()
    const [viewMode, setViewMode] = useState('list') // 'grid' or 'list'

    // Refresh projects on mount to ensure data is up to date when navigating from sidebar
    React.useEffect(() => {
        fetchProjects()
    }, [])

    // Search & Pagination State
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 8

    // Preview Modal State
    const [previewProject, setPreviewProject] = useState(null)

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [projectToDelete, setProjectToDelete] = useState(null)

    const handlePreview = (e, project) => {
        e.stopPropagation()
        setPreviewProject(project)
    }

    const closePreview = () => setPreviewProject(null)

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

    const handleDelete = (e, projectId) => {
        e.stopPropagation()
        setProjectToDelete(projectId)
        setShowDeleteModal(true)
    }

    const confirmDelete = async () => {
        if (!projectToDelete) return

        try {
            await deleteProject(projectToDelete)
            addToast('Project deleted successfully', 'success')
        } catch (err) {
            addToast('Failed to delete project', 'error')
        }
        setShowDeleteModal(false)
        setProjectToDelete(null)
    }

    // Filter and Pagination Logic
    const filteredProjects = projects.filter(project =>
        project.filename.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
    const currentProjects = filteredProjects.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage)
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
                <div className="dashboard-actions">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setCurrentPage(1) // Reset to page 1 on search
                            }}
                        />
                    </div>
                    <div className="view-toggle">
                        <button
                            className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="List View"
                        >
                            <List size={20} />
                        </button>
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate('/upload')}>
                        <Plus size={20} />
                        New Project
                    </button>
                </div>
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
                <>
                    {viewMode === 'grid' ? (
                        <div className="projects-grid">
                            {currentProjects.map((project) => {
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
                                            <div className="flex gap-sm">
                                                <button
                                                    className={`project-delete ${['upload', 'ocr'].includes(project.status) ? 'btn-disabled-opacity' : ''}`}
                                                    onClick={(e) => !['upload', 'ocr'].includes(project.status) ? handlePreview(e, project) : addToast('PDF preview is available after OCR processing is complete.', 'info')}
                                                    title={project.status === 'archived' ? "View Archived Document" : "View Searchable PDF (Draft)"}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    className="project-delete"
                                                    onClick={(e) => handleDelete(e, project.id)}
                                                    title="Delete project"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
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
                    ) : (
                        <div className="projects-list-container">
                            <table className="projects-table">
                                <thead>
                                    <tr>
                                        <th>File Name</th>
                                        <th>Status</th>
                                        <th>Progress</th>
                                        <th>Date Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentProjects.map((project) => {
                                        const statusInfo = getStatusInfo(project.status)
                                        const StatusIcon = statusInfo.icon
                                        const progress = getProgressPercentage(project.status)

                                        return (
                                            <tr key={project.id} onClick={() => handleProjectClick(project)} className="clickable-row">
                                                <td className="col-name">
                                                    <div className="flex items-center gap-md">
                                                        <div className="list-icon">
                                                            <FileText size={18} />
                                                        </div>
                                                        <span className="font-medium">{project.filename}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge badge-${statusInfo.color}`}>
                                                        <StatusIcon size={14} />
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="col-progress">
                                                    <div className="flex flex-col gap-sm">
                                                        <div className="progress-bar">
                                                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                                        </div>
                                                        <span className="text-secondary text-sm">{progress}%</span>
                                                    </div>
                                                </td>
                                                <td className="text-secondary">
                                                    {new Date(project.created_at).toLocaleDateString()}
                                                </td>
                                                <td>
                                                    <div className="flex gap-sm">
                                                        <button
                                                            className={`btn-icon ${['upload', 'ocr'].includes(project.status) ? 'btn-disabled-opacity' : ''}`}
                                                            onClick={(e) => !['upload', 'ocr'].includes(project.status) ? handlePreview(e, project) : addToast('PDF preview is available after OCR processing is complete.', 'info')}
                                                            title={project.status === 'archived' ? "View Archived Document" : "View Searchable PDF (Draft)"}
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                        <button
                                                            className="btn-icon delete-btn"
                                                            onClick={(e) => handleDelete(e, project.id)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="pagination-controls">
                            <button
                                className="btn-icon"
                                disabled={currentPage === 1}
                                onClick={() => handlePageChange(currentPage - 1)}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="page-info">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                className="btn-icon"
                                disabled={currentPage === totalPages}
                                onClick={() => handlePageChange(currentPage + 1)}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </>
            )
            }

            {/* Document Preview Modal */}
            {
                previewProject && (
                    <div className="modal-overlay" onClick={closePreview}>
                        <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div>
                                    <h3>{previewProject.filename}</h3>
                                    {previewProject.status === 'archived' ? (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 'bold' }}>FINAL ARCHIVE</span>
                                    ) : (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 'bold' }}>DRAFT PREVIEW (SEARCHABLE PDF)</span>
                                    )}
                                </div>
                                <button className="modal-close" onClick={closePreview}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="modal-body p-0">
                                {/* Assuming the PDF or Image is served from the backend */}
                                <iframe
                                    src={`${API_URL}/projects/${previewProject.id}/file`}
                                    className="pdf-preview-frame"
                                    title="Document Preview"
                                />
                            </div>
                            <div className="modal-footer">
                                <div className="flex items-center gap-md">
                                    <span className={`badge badge-${getStatusInfo(previewProject.status).color}`}>
                                        {getStatusInfo(previewProject.status).label}
                                    </span>
                                    <span className="text-sm text-muted">
                                        {new Date(previewProject.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <button className="btn btn-primary" onClick={() => handleProjectClick(previewProject)}>
                                    Open Project Workflow
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                title="Delete Project?"
                onClose={() => setShowDeleteModal(false)}
                footer={
                    <>
                        <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                        <button className="btn btn-danger" onClick={confirmDelete}>
                            <Trash2 size={16} style={{ marginRight: '8px' }} /> Delete
                        </button>
                    </>
                }
            >
                <p>Are you sure you want to delete this project? This action cannot be undone.</p>
            </Modal>
        </div >
    )
}

export default Dashboard
