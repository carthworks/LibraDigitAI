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
    FolderOpen,
    ArrowRight,
    SlidersHorizontal,
    BookOpen,
    Download,
    ChevronDown
} from 'lucide-react'
import Modal from '../components/Modal'
import NeedsAttention from '../components/NeedsAttention'
import { useActiveJobs } from '../hooks/useActiveJobs'
import { cancelJob } from '../api/jobs'
import { displayTitle, nextStep } from '../utils/workflow'
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

    const getStatusInfo = (status, hasArchive = true) => {
        if (status === 'archived' && !hasArchive) {
            return { label: 'Ready to Archive', color: 'info', icon: SlidersHorizontal, step: '4/5' }
        }
        const statusMap = {
            upload: { label: 'Uploaded', color: 'primary', icon: FileText, step: '1/5' },
            ocr: { label: 'OCR Processing', color: 'primary', icon: Clock, step: '2/5' },
            cleanup: { label: 'Needs Cleanup', color: 'warning', icon: AlertCircle, step: '3/5' },
            metadata: { label: 'Needs Metadata', color: 'info', icon: SlidersHorizontal, step: '4/5' },
            archived: { label: 'Archived & Preserved', color: 'success', icon: CheckCircle2, step: '5/5' }
        }
        return statusMap[status] || statusMap.upload
    }


    // Background OCR jobs; reload documents when one finishes.
    const jobs = useActiveJobs(fetchProjects)
    const jobByProject = useMemo(() => new Map(jobs.map(job => [job.project_id, job])), [jobs])

    // A document with a running job opens its progress view; otherwise its next step.
    const handleProjectClick = (project) => navigate(
        jobByProject.has(project.id) ? `/upload?project=${project.id}` : nextStep(project).path
    )

    const handleStopJob = async (job) => {
        try {
            await cancelJob(job.id)
            addToast('Stopping after the current page…', 'info')
        } catch {
            addToast('Could not stop processing. Please try again.', 'error')
        }
    }

    const showWaiting = () => {
        setStatusFilter('waiting')
        setCurrentPage(1)
        document.querySelector('.dashboard-funnel-bar')?.scrollIntoView({ behavior: 'smooth' })
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
        // Keyed by workflow step so tabs, cards and the attention panel agree.
        const c = { all: projects.length, ocr: 0, cleanup: 0, metadata: 0, archive: 0, done: 0 }
        projects.forEach(p => { c[nextStep(p).key]++ })
        return c
    }, [projects])

    // Real figures for the summary cards (no placeholders).
    const stats = useMemo(() => {
        const archives = projects.filter(p => p.has_archive)
        const measured = projects.filter(p => typeof p.mean_confidence === 'number')
        const avgConfidence = measured.length
            ? measured.reduce((sum, p) => sum + p.mean_confidence, 0) / measured.length
            : null
        const waitingProjects = projects.filter(p => nextStep(p).needsAction && !jobByProject.has(p.id))
        const waitingBy = { ocr: 0, cleanup: 0, metadata: 0, archive: 0 }
        waitingProjects.forEach(p => { waitingBy[nextStep(p).key]++ })
        const waiting = waitingProjects.length
        return {
            archives: archives.length,
            pdfa: archives.filter(p => p.archive_format === 'PDF/A-2b').length,
            avgConfidence,
            measured: measured.length,
            waiting,
            waitingBy,
        }
    }, [projects, jobByProject])

    // Filter, Sort, and Pagination Logic
    const filteredProjects = useMemo(() => {
        return projects
            .filter(project => {
                const matchesSearch = displayTitle(project).toLowerCase().includes(searchQuery.toLowerCase())
                    || project.filename.toLowerCase().includes(searchQuery.toLowerCase())
                if (!matchesSearch) return false

                if (statusFilter === 'all') return true
                if (statusFilter === 'waiting') return nextStep(project).needsAction && !jobByProject.has(project.id)
                return nextStep(project).key === statusFilter
            })
            .sort((a, b) => {
                if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at)
                if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at)
                if (sortBy === 'progress') return nextStep(b).progress - nextStep(a).progress
                if (sortBy === 'name') return a.filename.localeCompare(b.filename)
                return 0
            })
    }, [projects, searchQuery, statusFilter, sortBy, jobByProject])

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

            {/* Compact header: what this is and the main actions */}
            <div className="dash-header">
                <div className="dash-header-text">
                    <p className="dash-summary">
                        {projects.length === 0
                            ? 'Start by uploading a scanned document.'
                            : stats.waiting > 0
                                ? `${stats.waiting} document${stats.waiting === 1 ? '' : 's'} waiting on you`
                                : 'Everything is archived.'}
                    </p>
                </div>
                <div className="dash-header-actions">
                    <button className="btn-dash-primary" onClick={() => navigate('/upload')}>
                        <Plus size={18} />
                        <span>New Ingest & OCR</span>
                    </button>
                    <button className="btn-dash-secondary" onClick={() => navigate('/batch')}>
                        <Layers size={18} />
                        <span>Batch Queue</span>
                    </button>
                    <button className="btn-dash-secondary" onClick={() => navigate('/ebooks')}>
                        <BookOpen size={18} />
                        <span>E-Books</span>
                    </button>
                    <details className="dash-menu">
                        <summary className="btn-dash-secondary">
                            <Download size={18} />
                            <span>Export</span>
                            <ChevronDown size={14} />
                        </summary>
                        <div className="dash-menu-list" role="menu">
                            <a role="menuitem" href={`${API_URL}/export/metadata?format=csv`} download>
                                <strong>Catalogue (CSV)</strong>
                                <span>Dublin Core, opens in Excel</span>
                            </a>
                            <a role="menuitem" href={`${API_URL}/export/metadata?format=xml`} download>
                                <strong>Catalogue (XML)</strong>
                                <span>oai_dc records for repositories</span>
                            </a>
                        </div>
                    </details>
                </div>
            </div>

            {projects.length > 0 && (
                <NeedsAttention
                    projects={projects}
                    jobs={jobs}
                    onStopJob={handleStopJob}
                    onShowAll={showWaiting}
                />
            )}

            {/* Real-time Metric Cards Deck */}
            {projects.length > 0 && (
            <>
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
                        <span className="stat-label">Waiting On You</span>
                        <div className="stat-icon-wrapper warning"><Clock size={20} /></div>
                    </div>
                    <div className="stat-value">{stats.waiting}</div>
                    <div className="stat-footer">
                        <span className="stat-hint text-warning">{stats.waitingBy.ocr} OCR • {stats.waitingBy.cleanup} review • {stats.waitingBy.metadata} metadata • {stats.waitingBy.archive} to archive</span>
                    </div>
                </div>

                <div className="metric-stat-card">
                    <div className="stat-card-top">
                        <span className="stat-label">Archive Packages</span>
                        <div className="stat-icon-wrapper success"><CheckCircle2 size={20} /></div>
                    </div>
                    <div className="stat-value">{stats.archives}</div>
                    <div className="stat-footer">
                        <span className="stat-hint text-success">
                            {stats.archives === 0
                                ? 'None created yet'
                                : `${stats.pdfa} PDF/A-2b · ${stats.archives - stats.pdfa} standard PDF`}
                        </span>
                    </div>
                </div>

                <div className="metric-stat-card">
                    <div className="stat-card-top">
                        <span className="stat-label">OCR Confidence Average</span>
                        <div className="stat-icon-wrapper info"><Sparkles size={20} /></div>
                    </div>
                    <div className="stat-value">{stats.avgConfidence === null ? '—' : `${stats.avgConfidence.toFixed(1)}%`}</div>
                    <div className="stat-footer">
                        <span className="stat-hint">
                            {stats.measured === 0
                                ? 'Shown after the first OCR run'
                                : `Tesseract word confidence, ${stats.measured} document${stats.measured === 1 ? '' : 's'}`}
                        </span>
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
                        className={`funnel-tab ${statusFilter === 'ocr' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter('ocr'); setCurrentPage(1); }}
                    >
                        <span>Needs OCR</span>
                        <span className="tab-count">{counts.ocr}</span>
                    </button>
                    <button
                        className={`funnel-tab ${statusFilter === 'cleanup' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter('cleanup'); setCurrentPage(1); }}
                    >
                        <span>Needs Review</span>
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
                        className={`funnel-tab ${statusFilter === 'archive' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter('archive'); setCurrentPage(1); }}
                    >
                        <span>Ready to Archive</span>
                        <span className="tab-count">{counts.archive}</span>
                    </button>
                    <button
                        className={`funnel-tab ${statusFilter === 'done' ? 'active' : ''}`}
                        onClick={() => { setStatusFilter('done'); setCurrentPage(1); }}
                    >
                        <span>Archived</span>
                        <span className="tab-count">{counts.done}</span>
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

            </>
            )}

            {/* Main Content Area: Empty State or Grid / Table */}
            {projects.length === 0 ? (
                <div className="dashboard-empty-hub">
                    <div className="empty-hub-icon">
                        <FolderOpen size={48} />
                    </div>
                    <h3>Digitize your first document</h3>
                    <ol className="empty-hub-steps">
                        <li><strong>Upload</strong> a scan or PDF. Text is extracted on this computer.</li>
                        <li><strong>Review</strong> the recognised text and fix any errors.</li>
                        <li><strong>Describe and archive</strong>: add title, author and year, then create a PDF/A archive package.</li>
                    </ol>
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
                                const statusInfo = getStatusInfo(project.status, project.has_archive)
                                const StatusIcon = statusInfo.icon
                                const step = nextStep(project)
                                const progress = step.progress
                                const job = jobByProject.get(project.id)

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
                                                {displayTitle(project)}
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

                                        <div className="card-next-step">
                                            {job ? (
                                                <span className="card-job-status">
                                                    {job.status === 'queued' ? 'Queued for OCR' : `${job.message} · ${Math.round(job.progress)}%`}
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className={step.needsAction ? 'btn-dash-primary btn-sm' : 'btn-dash-secondary btn-sm'}
                                                    onClick={(e) => { e.stopPropagation(); navigate(step.path) }}
                                                >
                                                    <span>{step.label}</span>
                                                    <ArrowRight size={14} />
                                                </button>
                                            )}
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
                                            const statusInfo = getStatusInfo(project.status, project.has_archive)
                                            const StatusIcon = statusInfo.icon
                                            const progress = nextStep(project).progress

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
                                                                <span className="doc-title">{displayTitle(project)}</span>
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
                                                                <span>{jobByProject.has(project.id) ? 'View progress' : nextStep(project).label}</span>
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
