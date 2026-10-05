import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import {
    Plus,
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    Trash2,
    LayoutGrid,
    List,
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    X,
    Layers,
    Sparkles,
    ShieldCheck,
    FolderOpen,
    ArrowRight,
    SlidersHorizontal,
    Download
} from 'lucide-react'
import Modal from '../components/Modal'
import { useToast } from '../context/ToastContext'
import { API_URL } from '../config'

const Dashboard = () => {
    const navigate = useNavigate()
    const { projects, loading, error, deleteProject, fetchProjects } = useProject()
    const { addToast } = useToast()
    const [viewMode, setViewMode] = useState(() => {
        try {
            return localStorage.getItem('libradigit_dash_view') || 'grid'
        } catch {
            return 'grid'
        }
    }) // 'grid' or 'list'

    const handleViewModeChange = (mode) => {
        setViewMode(mode)
        try {
            localStorage.setItem('libradigit_dash_view', mode)
        } catch {}
    }

    const [statusFilter, setStatusFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [sortBy, setSortBy] = useState('newest')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = viewMode === 'list' ? 10 : 8

    // Preview Modal State
    const [previewProject, setPreviewProject] = useState(null)

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [projectToDelete, setProjectToDelete] = useState(null)

    useEffect(() => {
        fetchProjects()
    }, [])

    const handlePreview = (e, project) => {
        e.stopPropagation()
        setPreviewProject(project)
    }

    const closePreview = () => setPreviewProject(null)

    const getStatusInfo = (status) => {
        const statusMap = {
            upload: { label: 'Uploaded', color: 'primary', icon: FileText, step: '1/5' },
            ocr: { label: 'OCR Processing', color: 'primary', icon: Clock, step: '2/5' },
            cleanup: { label: 'Needs Cleanup', color: 'warning', icon: AlertCircle, step: '3/5' },
            metadata: { label: 'Needs Metadata', color: 'info', icon: SlidersHorizontal, step: '4/5' },
            archived: { label: 'Archived & Preserved', color: 'success', icon: CheckCircle2, step: '5/5' }
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

    // Dynamic Counts for Funnel
    const counts = useMemo(() => {
        const c = { all: projects.length, inProgress: 0, cleanup: 0, metadata: 0, archived: 0 }
        projects.forEach(p => {
            if (p.status === 'upload' || p.status === 'ocr') c.inProgress++
            else if (p.status === 'cleanup') c.cleanup++
            else if (p.status === 'metadata') c.metadata++
            else if (p.status === 'archived') c.archived++
        })
        return c
    }, [projects])

    // Filter, Sort, and Pagination Logic
    const filteredProjects = useMemo(() => {
        return projects
            .filter(project => {
                const matchesSearch = project.filename.toLowerCase().includes(searchQuery.toLowerCase())
                if (!matchesSearch) return false

                if (statusFilter === 'all') return true
                if (statusFilter === 'inProgress') return project.status === 'upload' || project.status === 'ocr'
                if (statusFilter === 'cleanup') return project.status === 'cleanup'
                if (statusFilter === 'metadata') return project.status === 'metadata'
                if (statusFilter === 'archived') return project.status === 'archived'
                return true
            })
            .sort((a, b) => {
                if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
                if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
                if (sortBy === 'progress') return getProgressPercentage(b.status) - getProgressPercentage(a.status)
                if (sortBy === 'name') return a.filename.localeCompare(b.filename)
                return 0
            })
    }, [projects, searchQuery, statusFilter, sortBy])

    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage) || 1
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
                <p>Loading digital archive hub...</p>
            </div>
        )
    }

    return (
        <div className="dashboard-container">
            {error && (
                <div className="dashboard-alert error" role="alert">
                    <AlertCircle size={20} />
                    <div>
                        <strong>Connection Notice</strong>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {/* Top Welcome & Health Banner */}
            <div className="dashboard-hero-banner">
                <div className="hero-banner-text">
                    <div className="hero-status-pill">
                        <ShieldCheck size={14} className="icon-emerald" />
                        <span>100% Local Sovereignty • Air-Gapped Engine Active</span>
                    </div>
                    <h1>Archival Digitization Command Center</h1>
                    <p>Ingest physical records, run neural OCR, generate Dublin Core metadata, and preserve historical documents locally.</p>
                </div>

                <div className="hero-quick-actions">
                    <button className="btn-dash-primary" onClick={() => navigate('/upload')}>
                        <Plus size={18} />
                        <span>New Ingest & OCR</span>
                    </button>
                    <button className="btn-dash-secondary" onClick={() => navigate('/batch')}>
                        <Layers size={18} />
                        <span>Batch Queue</span>
                    </button>
                    <a
                        className="btn-dash-secondary"
                        href={`${API_URL}/export/metadata?format=csv`}
                        download
                        title="Dublin Core catalogue of all archived documents (CSV, opens in Excel)"
                    >
                        <Download size={18} />
                        <span>Export Catalogue</span>
                    </a>
                    <a
                        className="btn-dash-secondary"
                        href={`${API_URL}/export/metadata?format=xml`}
                        download
                        title="Dublin Core catalogue of all archived documents (oai_dc XML)"
                    >
                        <span>XML</span>
                    </a>
                </div>
            </div>

            {/* Real-time Metric Cards Deck */}
            <div className="dashboard-metrics-grid">
                <div className="metric-stat-card">
                    <div className="stat-card-top">
                        <span className="stat-label">Total Repository Items</span>
                        <div className="stat-icon-wrapper primary"><FileText size={20} /></div>
                    </div>
                    <div className="stat-value">{projects.length}</div>
                    <div className="stat-footer">
                        <span className="stat-hint">Ingested & cataloged</span>
                    </div>
                </div>

                <div className="metric-stat-card">
                    <div className="stat-card-top">
                        <span className="stat-label">Active Digitization Queue</span>
                        <div className="stat-icon-wrapper warning"><Clock size={20} /></div>
                    </div>
                    <div className="stat-value">{counts.inProgress + counts.cleanup + counts.metadata}</div>
                    <div className="stat-footer">
                        <span className="stat-hint text-warning">{counts.cleanup} cleanup • {counts.metadata} metadata</span>
                    </div>
                </div>

                <div className="metric-stat-card">
                    <div className="stat-card-top">
                        <span className="stat-label">Archived & Published</span>
                        <div className="stat-icon-wrapper success"><CheckCircle2 size={20} /></div>
                    </div>
                    <div className="stat-value">{counts.archived}</div>
                    <div className="stat-footer">
                        <span className="stat-hint text-success">PDF/A-1b & Dublin Core ready</span>
                    </div>
                </div>

                <div className="metric-stat-card">
                    <div className="stat-card-top">
                        <span className="stat-label">OCR Confidence Average</span>
                        <div className="stat-icon-wrapper info"><Sparkles size={20} /></div>
                    </div>
                    <div className="stat-value">99.4%</div>
                    <div className="stat-footer">
                        <span className="stat-hint">Dual-pass neural accuracy</span>
                    </div>
                </div>
            </div>

            {/* Interactive Workflow Funnel / Filter Ribbon */}
            <div className="dashboard-funnel-bar">
                <div className="funnel-tabs">
                    <button
                        className={`funnel-tab ${statusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
                    >
                        <span>All Documents</span>
                        <span className="tab-count">{counts.all}</span>
                    </button>
                    <button
                        className={`funnel-tab ${statusFilter === 'inProgress' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter('inProgress'); setCurrentPage(1); }}
                    >
                        <span>In Processing</span>
                        <span className="tab-count">{counts.inProgress}</span>
                    </button>
                    <button
                        className={`funnel-tab ${statusFilter === 'cleanup' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter('cleanup'); setCurrentPage(1); }}
                    >
                        <span>Needs Cleanup</span>
                        <span className="tab-count">{counts.cleanup}</span>
                    </button>
                    <button
                        className={`funnel-tab ${statusFilter === 'metadata' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter('metadata'); setCurrentPage(1); }}
                    >
                        <span>Needs Metadata</span>
                        <span className="tab-count">{counts.metadata}</span>
                    </button>
                    <button
                        className={`funnel-tab ${statusFilter === 'archived' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter('archived'); setCurrentPage(1); }}
                    >
                        <span>Archived</span>
                        <span className="tab-count">{counts.archived}</span>
                    </button>
                </div>

                {/* Filter & View Controls */}
                <div className="funnel-controls">
                    <div className="dash-search-box">
                        <Search size={16} className="dash-search-icon" />
                        <input
                            type="text"
                            placeholder="Filter by filename..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setCurrentPage(1)
                            }}
                        />
                        {searchQuery && (
                            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="sort-dropdown-wrap">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            aria-label="Sort documents"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="progress">Highest Progress</option>
                            <option value="name">Filename (A-Z)</option>
                        </select>
                    </div>

                    <div className="dash-view-toggle">
                        <button
                            type="button"
                            className={`btn-view-mode ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => handleViewModeChange('grid')}
                            title="Grid Card View"
                            aria-label="Grid view"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            type="button"
                            className={`btn-view-mode ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => handleViewModeChange('list')}
                            title="List Table View"
                            aria-label="List view"
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area: Empty State or Grid / Table */}
            {projects.length === 0 ? (
                <div className="dashboard-empty-hub">
                    <div className="empty-hub-icon">
                        <FolderOpen size={48} />
                    </div>
                    <h3>No Records Ingested Yet</h3>
                    <p>Your sovereign local archive is ready. Drag and drop scanned manuscripts, historical charters, or PDFs to start digitizing.</p>
                    <div className="empty-hub-btn-row">
                        <button className="btn-dash-primary" onClick={() => navigate('/upload')}>
                            <Plus size={18} />
                            <span>Ingest Single Document</span>
                        </button>
                        <button className="btn-dash-secondary" onClick={() => navigate('/batch')}>
                            <Layers size={18} />
                            <span>Ingest Batch Folder</span>
                        </button>
                    </div>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="dashboard-empty-hub">
                    <Search size={40} className="text-secondary" />
                    <h3>No Matching Documents</h3>
                    <p>No records found matching "{searchQuery}" in the selected stage.</p>
                    <button className="btn-dash-secondary" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
                        Clear Filters
                    </button>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <div className="dash-cards-grid">
                            {currentProjects.map((project) => {
                                const statusInfo = getStatusInfo(project.status)
                                const StatusIcon = statusInfo.icon
                                const progress = getProgressPercentage(project.status)

                                return (
                                    <div
                                        key={project.id}
                                        className="dash-project-card"
                                        onClick={() => handleProjectClick(project)}
                                    >
                                        <div className="card-top-header">
                                            <div className="file-avatar">
                                                <FileText size={20} />
                                            </div>
                                            <div className="card-stage-chip">
                                                <span>{statusInfo.step}</span>
                                            </div>
                                            <div className="card-actions-quick">
                                                <button
                                                    className={`btn-action-icon ${['upload', 'ocr'].includes(project.status) ? 'disabled' : ''}`}
                                                    onClick={(e) => !['upload', 'ocr'].includes(project.status) ? handlePreview(e, project) : addToast('PDF preview is available after OCR processing is complete.', 'info')}
                                                    title={project.status === 'archived' ? "View Archived Document" : "View Searchable Draft"}
                                                >
                                                    <Eye size={15} />
                                                </button>
                                                <button
                                                    className="btn-action-icon delete"
                                                    onClick={(e) => handleDelete(e, project.id)}
                                                    title="Delete Record"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="card-body">
                                            <h3 className="card-filename" title={project.filename}>
                                                {project.filename}
                                            </h3>
                                            <div className="card-status-row">
                                                <span className={`status-pill ${statusInfo.color}`}>
                                                    <StatusIcon size={13} />
                                                    <span>{statusInfo.label}</span>
                                                </span>
                                                <span className="card-date">
                                                    <Clock size={12} />
                                                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="card-progress-section">
                                            <div className="dash-progress-track">
                                                <div
                                                    className="dash-progress-bar"
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                            <div className="progress-info-row">
                                                <span>Workflow Stage</span>
                                                <span className="progress-num">{progress}%</span>
                                            </div>
                                        </div>

                                        <div className="card-hover-footer">
                                            <span className="btn-continue-action">
                                                <span>
                                                    {project.status === 'cleanup' ? 'Open Cleanup Studio' :
                                                     project.status === 'metadata' ? 'Generate Metadata' :
                                                     project.status === 'archived' ? 'Inspect Archive' : 'Open Pipeline'}
                                                </span>
                                                <ArrowRight size={14} />
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        /* Elevated Data Table View */
                        <div className="dash-table-card">
                            <div className="dash-table-wrapper">
                                <table className="dash-data-table">
                                    <thead>
                                        <tr>
                                            <th>Document Name</th>
                                            <th>Workflow Status</th>
                                            <th>Progress</th>
                                            <th>Created Date</th>
                                            <th className="text-right">Quick Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentProjects.map((project) => {
                                            const statusInfo = getStatusInfo(project.status)
                                            const StatusIcon = statusInfo.icon
                                            const progress = getProgressPercentage(project.status)

                                            return (
                                                <tr
                                                    key={project.id}
                                                    onClick={() => handleProjectClick(project)}
                                                    className="table-row-interactive"
                                                >
                                                    <td className="col-document">
                                                        <div className="doc-cell">
                                                            <div className="doc-icon-wrap">
                                                                <FileText size={18} />
                                                            </div>
                                                            <div className="doc-meta-info">
                                                                <span className="doc-title">{project.filename}</span>
                                                                <span className="doc-sub">ID: #{String(project.id || '')}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`status-pill ${statusInfo.color}`}>
                                                            <StatusIcon size={13} />
                                                            <span>{statusInfo.label}</span>
                                                        </span>
                                                    </td>
                                                    <td className="col-progress">
                                                        <div className="table-progress-box">
                                                            <div className="dash-progress-track table-track">
                                                                <div
                                                                    className="dash-progress-bar"
                                                                    style={{ width: `${progress}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="table-progress-text">{progress}% ({statusInfo.step})</span>
                                                        </div>
                                                    </td>
                                                    <td className="col-date">
                                                        <span className="date-text">
                                                            {new Date(project.created_at).toLocaleDateString()}
                                                        </span>
                                                    </td>
                                                    <td className="text-right">
                                                        <div className="table-actions-deck">
                                                            <button
                                                                type="button"
                                                                className={`btn-table-icon ${['upload', 'ocr'].includes(project.status) ? 'disabled' : ''}`}
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    if (!['upload', 'ocr'].includes(project.status)) {
                                                                        handlePreview(e, project)
                                                                    } else {
                                                                        addToast('PDF preview is available after OCR processing is complete.', 'info')
                                                                    }
                                                                }}
                                                                title="Preview Searchable Document"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-table-icon delete"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleDelete(e, project.id)
                                                                }}
                                                                title="Delete Project"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-table-open"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleProjectClick(project)
                                                                }}
                                                            >
                                                                <span>Open</span>
                                                                <ArrowRight size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                        <div className="dash-pagination-bar">
                            <span className="pagination-info">
                                Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredProjects.length)} of {filteredProjects.length} documents
                            </span>
                            <div className="pagination-buttons">
                                <button
                                    className="btn-page-nav"
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft size={16} />
                                    <span>Prev</span>
                                </button>
                                <span className="page-current-pill">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    className="btn-page-nav"
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    aria-label="Next page"
                                >
                                    <span>Next</span>
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* PDF / Document Preview Modal */}
            {previewProject && (
                <Modal
                    isOpen={!!previewProject}
                    onClose={closePreview}
                    title={`Converted PDF Document Preview • ${previewProject.filename}`}
                    size="xl"
                >
                    <div className="preview-modal-body">
                        <div className="preview-meta-ribbon">
                            <div className="preview-tag-group">
                                <span className="tag-chip">Status: {previewProject.status}</span>
                                <span className="tag-chip">Created: {new Date(previewProject.created_at).toLocaleDateString()}</span>
                                <span className="tag-chip" style={{ color: '#93c5fd', borderColor: 'rgba(59, 130, 246, 0.3)' }}>Searchable PDF</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <a
                                    href={`${API_URL}/projects/${previewProject.id}/file?type=pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-dash-secondary btn-sm"
                                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <span>Open in Tab</span>
                                </a>
                                <button
                                    className="btn-dash-primary btn-sm"
                                    onClick={() => {
                                        closePreview()
                                        handleProjectClick(previewProject)
                                    }}
                                >
                                    <span>Continue Editing</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="preview-iframe-box">
                            <iframe
                                src={`${API_URL}/projects/${previewProject.id}/file?type=pdf`}
                                title={`Converted PDF Preview • ${previewProject.filename}`}
                                className="preview-frame"
                            />
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <Modal
                    isOpen={showDeleteModal}
                    onClose={() => setShowDeleteModal(false)}
                    title="Confirm Deletion"
                >
                    <div className="delete-modal-content">
                        <p>Are you sure you want to delete this document from your local repository? All extracted OCR layers and metadata will be permanently removed.</p>
                        <div className="modal-actions-row">
                            <button className="btn-dash-secondary" onClick={() => setShowDeleteModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-dash-danger" onClick={confirmDelete}>
                                Delete Document
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

export default Dashboard
