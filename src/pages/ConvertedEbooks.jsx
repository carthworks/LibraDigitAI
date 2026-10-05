import { useState, useEffect, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
    BookOpen,
    FileText,
    Download,
    ExternalLink,
    Eye,
    ZoomIn,
    ZoomOut,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Minimize2,
    X,
    User,
    HardDrive,
    Search,
    SlidersHorizontal,
    LayoutGrid,
    List,
    RotateCw,
    Copy,
    Check,
    CheckCircle2,
    Clock,
    AlertCircle,
    RefreshCw,
    FolderArchive,
    Sparkles,
    FileCode
} from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import { API_URL } from '../config'
import { useToast } from '../context/ToastContext'
import './ConvertedEbooks.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

const MemoPage = memo(Page)

export default function ConvertedEbooks() {
    const navigate = useNavigate()
    const { addToast } = useToast()

    // State for Ebooks list
    const [ebooks, setEbooks] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(null)

    // Filters and Search
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedSubject, setSelectedSubject] = useState('all')
    const [selectedStatus, setSelectedStatus] = useState('all')
    const [sortBy, setSortBy] = useState('newest')
    const [viewMode, setViewMode] = useState('table') // 'table' or 'grid'

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const pageSize = 10

    // Viewer Modal State
    const [selectedDoc, setSelectedDoc] = useState(null)
    const [viewerTab, setViewerTab] = useState('pdf') // 'pdf', 'text', 'metadata'
    const [pdfMode, setPdfMode] = useState('canvas') // 'canvas' (react-pdf) or 'iframe'
    const [numPages, setNumPages] = useState(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [scale, setScale] = useState(1.1)
    const [rotation, setRotation] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [copiedText, setCopiedText] = useState(false)
    const [fullProjectDetails, setFullProjectDetails] = useState(null)
    const [loadingDetails, setLoadingDetails] = useState(false)

    // Load Ebooks from backend
    const fetchEbooks = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true)
        else setLoading(true)
        setError(null)

        try {
            const { data } = await axios.get(`${API_URL}/projects/ebooks`)
            setEbooks(data.ebooks || [])
        } catch (err) {
            console.warn('Direct /projects/ebooks endpoint error, falling back to /projects:', err)
            try {
                const { data } = await axios.get(`${API_URL}/projects`)
                const fallbackList = (data.projects || []).map(p => ({
                    id: p.id,
                    filename: p.filename,
                    status: p.status,
                    created_at: p.created_at,
                    updated_at: p.updated_at,
                    display_title: p.filename.replace(/\.[^/.]+$/, ''),
                    has_pdf: true
                }))
                setEbooks(fallbackList)
            } catch (fallbackErr) {
                setError('Failed to fetch converted documents repository.')
                addToast('Failed to load converted e-books', 'error')
            }
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchEbooks()
    }, [])

    // Open Document Reader
    const handleOpenReader = async (doc, defaultTab = 'pdf') => {
        setSelectedDoc(doc)
        setViewerTab(defaultTab)
        setPageNumber(1)
        setScale(1.1)
        setRotation(0)
        setCopiedText(false)
        setFullProjectDetails(null)

        // Fetch full project text and metadata details
        try {
            setLoadingDetails(true)
            const { data } = await axios.get(`${API_URL}/projects/${doc.id}`)
            setFullProjectDetails(data.project)
        } catch (err) {
            console.error('Failed to load detailed project data:', err)
        } finally {
            setLoadingDetails(false)
        }
    }

    const handleCloseReader = () => {
        setSelectedDoc(null)
        setIsFullscreen(false)
        setFullProjectDetails(null)
    }

    // Keyboard navigation inside Reader
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedDoc) return
            if (e.key === 'Escape') {
                handleCloseReader()
            } else if (viewerTab === 'pdf') {
                if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                    setPageNumber(p => (numPages && p < numPages ? p + 1 : p))
                } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                    setPageNumber(p => (p > 1 ? p - 1 : 1))
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedDoc, viewerTab, numPages])

    // Copy extracted text
    const handleCopyText = () => {
        const textToCopy = fullProjectDetails?.cleaned_text || fullProjectDetails?.ocr_text || selectedDoc?.snippet || ''
        if (!textToCopy) return
        navigator.clipboard.writeText(textToCopy)
        setCopiedText(true)
        addToast('Document text copied to clipboard', 'success')
        setTimeout(() => setCopiedText(false), 2500)
    }

    // Formatted file size helper
    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    // Dynamic distinct subjects
    const distinctSubjects = useMemo(() => {
        const subs = new Set()
        ebooks.forEach(e => {
            if (e.subject && e.subject.trim()) {
                subs.add(e.subject.trim())
            }
        })
        return Array.from(subs).sort()
    }, [ebooks])

    // Summary metrics
    const metrics = useMemo(() => {
        let totalStorage = 0
        let archivedCount = 0
        let totalWords = 0

        ebooks.forEach(e => {
            if (e.file_size) totalStorage += e.file_size
            if (e.status === 'archived') archivedCount++
            if (e.word_count) totalWords += e.word_count
        })

        return {
            totalCount: ebooks.length,
            archivedCount,
            totalStorageFormatted: formatBytes(totalStorage),
            totalWordsFormatted: totalWords.toLocaleString(),
            subjectsCount: distinctSubjects.length
        }
    }, [ebooks, distinctSubjects])

    // Filtered & Sorted Ebooks
    const filteredEbooks = useMemo(() => {
        return ebooks
            .filter(doc => {
                // Search query filter
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase()
                    const title = (doc.display_title || doc.title || '').toLowerCase()
                    const filename = (doc.filename || '').toLowerCase()
                    const author = (doc.author || '').toLowerCase()
                    const subject = (doc.subject || '').toLowerCase()
                    const keywords = (doc.keywords || '').toLowerCase()
                    const year = (doc.year || '').toString()

                    const matches =
                        title.includes(q) ||
                        filename.includes(q) ||
                        author.includes(q) ||
                        subject.includes(q) ||
                        keywords.includes(q) ||
                        year.includes(q)
                    if (!matches) return false
                }

                // Subject filter
                if (selectedSubject !== 'all') {
                    if ((doc.subject || '').trim() !== selectedSubject) return false
                }

                // Status filter
                if (selectedStatus === 'archived' && doc.status !== 'archived') return false
                if (selectedStatus === 'in-progress' && doc.status === 'archived') return false
                if (selectedStatus === 'has-pdf' && !doc.has_pdf) return false

                return true
            })
            .sort((a, b) => {
                if (sortBy === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0)
                if (sortBy === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0)
                if (sortBy === 'title') return (a.display_title || '').localeCompare(b.display_title || '')
                if (sortBy === 'author') return (a.author || '').localeCompare(b.author || '')
                if (sortBy === 'year') return (parseInt(b.year) || 0) - (parseInt(a.year) || 0)
                if (sortBy === 'size') return (b.file_size || 0) - (a.file_size || 0)
                return 0
            })
    }, [ebooks, searchQuery, selectedSubject, selectedStatus, sortBy])

    // Pagination slice
    const totalPages = Math.ceil(filteredEbooks.length / pageSize) || 1
    const paginatedEbooks = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return filteredEbooks.slice(start, start + pageSize)
    }, [filteredEbooks, currentPage, pageSize])

    return (
        <div className="ebooks-page-container">
            {/* Header Hero */}
            <header className="ebooks-header-hero">
                <div className="ebooks-title-group">
                    <h1>
                        <span className="title-badge-icon">
                            <BookOpen size={22} />
                        </span>
                        Converted E-Books Repository
                    </h1>
                    <p className="ebooks-subtitle">
                        Comprehensive registry of all digitized manuscripts, OCR-converted e-books, and searchable PDF archives. Click any document row to view and read with high-fidelity canvas rendering.
                    </p>
                </div>

                <div className="ebooks-hero-actions">
                    <button
                        className="btn-hero-refresh"
                        onClick={() => fetchEbooks(true)}
                        disabled={refreshing}
                        title="Reload Repository"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                    <button
                        className="btn-hero-primary"
                        onClick={() => navigate('/upload')}
                    >
                        <Sparkles size={16} />
                        <span>Digitize New E-Book</span>
                    </button>
                </div>
            </header>

            {/* Metrics Ribbon */}
            <section className="ebooks-metrics-row">
                <div className="metric-glass-card">
                    <div className="metric-icon-box blue">
                        <BookOpen size={24} />
                    </div>
                    <div className="metric-data">
                        <span className="metric-value">{metrics.totalCount}</span>
                        <span className="metric-label">Total Converted E-Books</span>
                    </div>
                </div>

                <div className="metric-glass-card">
                    <div className="metric-icon-box emerald">
                        <CheckCircle2 size={24} />
                    </div>
                    <div className="metric-data">
                        <span className="metric-value">{metrics.archivedCount}</span>
                        <span className="metric-label">Archived & Preserved</span>
                    </div>
                </div>

                <div className="metric-glass-card">
                    <div className="metric-icon-box amber">
                        <FolderArchive size={24} />
                    </div>
                    <div className="metric-data">
                        <span className="metric-value">{metrics.subjectsCount}</span>
                        <span className="metric-label">Subject Categories</span>
                    </div>
                </div>

                <div className="metric-glass-card">
                    <div className="metric-icon-box purple">
                        <HardDrive size={24} />
                    </div>
                    <div className="metric-data">
                        <span className="metric-value">{metrics.totalStorageFormatted}</span>
                        <span className="metric-label">Archive Footprint</span>
                    </div>
                </div>
            </section>

            {/* Filter and Search Bar */}
            <section className="ebooks-filter-bar">
                <div className="search-input-wrapper">
                    <Search size={17} className="search-icon-inside" />
                    <input
                        type="text"
                        placeholder="Search by title, author, subject, keywords, year..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setCurrentPage(1)
                        }}
                        className="search-input-field"
                    />
                    {searchQuery && (
                        <button
                            className="clear-search-btn"
                            onClick={() => setSearchQuery('')}
                            title="Clear search"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>

                <div className="filter-controls-cluster">
                    {/* Subject Filter */}
                    <select
                        value={selectedSubject}
                        onChange={(e) => {
                            setSelectedSubject(e.target.value)
                            setCurrentPage(1)
                        }}
                        className="filter-select"
                        title="Filter by subject"
                    >
                        <option value="all">All Subjects ({distinctSubjects.length})</option>
                        {distinctSubjects.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={selectedStatus}
                        onChange={(e) => {
                            setSelectedStatus(e.target.value)
                            setCurrentPage(1)
                        }}
                        className="filter-select"
                        title="Filter by status"
                    >
                        <option value="all">All Statuses</option>
                        <option value="archived">Archived Only</option>
                        <option value="in-progress">In-Progress</option>
                        <option value="has-pdf">With Searchable PDF</option>
                    </select>

                    {/* Sort Selector */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="filter-select"
                        title="Sort documents"
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="title">Title (A - Z)</option>
                        <option value="author">Author (A - Z)</option>
                        <option value="year">Year (Recent First)</option>
                        <option value="size">File Size (Largest)</option>
                    </select>

                    {/* View Mode Toggle */}
                    <div className="view-mode-toggle">
                        <button
                            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                            title="Table View"
                        >
                            <List size={16} />
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Grid View"
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>
                </div>
            </section>

            {/* Main Content Area: Table View or Grid View */}
            {loading ? (
                <div className="ebooks-loading-state">
                    <RefreshCw size={36} className="animate-spin text-accent" />
                    <p>Loading converted e-books archive...</p>
                </div>
            ) : error ? (
                <div className="ebooks-empty-state">
                    <AlertCircle size={40} color="#f87171" />
                    <h3>Unable to load archive</h3>
                    <p>{error}</p>
                    <button className="btn-hero-primary" onClick={() => fetchEbooks()}>
                        Try Again
                    </button>
                </div>
            ) : filteredEbooks.length === 0 ? (
                <div className="ebooks-empty-state">
                    <BookOpen size={48} color="#64748b" />
                    <h3>No Converted E-Books Found</h3>
                    <p>
                        {searchQuery || selectedSubject !== 'all' || selectedStatus !== 'all'
                            ? 'No documents match your current filter criteria. Try clearing filters or changing search keywords.'
                            : 'You have not digitized any documents yet. Upload a scanned book or document to start conversion.'}
                    </p>
                    <button className="btn-hero-primary" onClick={() => navigate('/upload')}>
                        <Sparkles size={16} />
                        <span>Start OCR Digitization</span>
                    </button>
                </div>
            ) : viewMode === 'table' ? (
                /* Rich Responsive Table View */
                <div className="ebooks-table-wrapper">
                    <div className="responsive-table-scroll">
                        <table className="ebooks-table">
                            <thead>
                                <tr>
                                    <th className="col-cover">Format</th>
                                    <th className="col-title sortable" onClick={() => setSortBy(sortBy === 'title' ? 'newest' : 'title')}>
                                        Title & Document Details
                                    </th>
                                    <th className="col-author sortable" onClick={() => setSortBy(sortBy === 'author' ? 'newest' : 'author')}>
                                        Author
                                    </th>
                                    <th className="col-year sortable" onClick={() => setSortBy(sortBy === 'year' ? 'newest' : 'year')}>
                                        Year
                                    </th>
                                    <th className="col-subject">Subject & Classification</th>
                                    <th className="col-status">Preservation Status</th>
                                    <th className="col-metrics sortable" onClick={() => setSortBy(sortBy === 'size' ? 'newest' : 'size')}>
                                        Size & Scope
                                    </th>
                                    <th className="col-actions">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedEbooks.map((doc) => (
                                    <tr
                                        key={doc.id}
                                        onClick={() => handleOpenReader(doc, 'pdf')}
                                        title="Click to view document reader"
                                    >
                                        <td className="col-cover" onClick={(e) => e.stopPropagation()}>
                                            <div
                                                className={`doc-cover-pill ${doc.has_pdf ? 'pdf' : ''}`}
                                                onClick={() => handleOpenReader(doc, 'pdf')}
                                            >
                                                <FileText size={20} />
                                            </div>
                                        </td>
                                        <td>
                                            <div className="cell-title-block">
                                                <span className="doc-primary-title">
                                                    {doc.display_title}
                                                </span>
                                                <span className="doc-filename-sub" title={doc.filename}>
                                                    {doc.filename}
                                                </span>
                                                {doc.keywords && (
                                                    <div className="tag-pills-row">
                                                        {doc.keywords.split(',').slice(0, 3).map((kw, i) => (
                                                            <span key={i} className="mini-tag-pill">
                                                                #{kw.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="cell-author">
                                                <User size={13} color="#94a3b8" />
                                                <span>{doc.author || 'Unknown Author'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="cell-year">
                                                <span>{doc.year || '—'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {doc.subject ? (
                                                <span className="subject-badge">{doc.subject}</span>
                                            ) : (
                                                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Unclassified</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`status-badge ${doc.status === 'archived' ? 'archived' : 'processing'}`}>
                                                {doc.status === 'archived' ? (
                                                    <>
                                                        <CheckCircle2 size={13} />
                                                        <span>Archived</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock size={13} />
                                                        <span>{doc.status || 'Active'}</span>
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="cell-metrics">
                                                <span>{formatBytes(doc.file_size)}</span>
                                                {doc.word_count > 0 && (
                                                    <span style={{ color: '#64748b' }}>
                                                        {doc.word_count.toLocaleString()} words
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <div className="cell-actions">
                                                <button
                                                    className="btn-action-view"
                                                    onClick={() => handleOpenReader(doc, 'pdf')}
                                                    title="Open in Document Reader"
                                                >
                                                    <Eye size={14} />
                                                    <span>View</span>
                                                </button>

                                                <a
                                                    href={`${API_URL}/projects/${doc.id}/file?type=pdf`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn-action-icon"
                                                    title="Open PDF in new browser tab"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>

                                                <a
                                                    href={`${API_URL}/projects/${doc.id}/searchable_pdf`}
                                                    download
                                                    className="btn-action-icon"
                                                    title="Download Searchable PDF"
                                                >
                                                    <Download size={14} />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="ebooks-pagination-bar">
                        <div className="pagination-info">
                            Showing {(currentPage - 1) * pageSize + 1} to{' '}
                            {Math.min(currentPage * pageSize, filteredEbooks.length)} of {filteredEbooks.length} e-books
                        </div>

                        <div className="pagination-nav-group">
                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                            >
                                <ChevronLeft size={16} />
                                <span>Previous</span>
                            </button>

                            <span style={{ color: '#e2e8f0', fontSize: '0.85rem', margin: '0 8px' }}>
                                Page {currentPage} of {totalPages}
                            </span>

                            <button
                                className="pagination-btn"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                            >
                                <span>Next</span>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                /* Grid View Mode */
                <div className="ebooks-grid-wrapper">
                    {paginatedEbooks.map((doc) => (
                        <div
                            key={doc.id}
                            className="ebook-card-item"
                            onClick={() => handleOpenReader(doc, 'pdf')}
                        >
                            <div>
                                <div className="card-top-header">
                                    <div className={`doc-cover-pill ${doc.has_pdf ? 'pdf' : ''}`}>
                                        <FileText size={22} />
                                    </div>
                                    <span className={`status-badge ${doc.status === 'archived' ? 'archived' : 'processing'}`}>
                                        {doc.status}
                                    </span>
                                </div>

                                <h3 className="card-title" title={doc.display_title}>
                                    {doc.display_title}
                                </h3>

                                <div className="card-author-year">
                                    <span>{doc.author || 'Unknown Author'}</span>
                                    <span>•</span>
                                    <span>{doc.year || 'Year N/A'}</span>
                                </div>

                                {doc.subject && (
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <span className="subject-badge">{doc.subject}</span>
                                    </div>
                                )}

                                {doc.snippet && (
                                    <p className="card-snippet">
                                        {doc.snippet}
                                    </p>
                                )}
                            </div>

                            <div className="card-bottom-footer" onClick={(e) => e.stopPropagation()}>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                    {formatBytes(doc.file_size)}
                                </span>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        className="btn-action-view"
                                        onClick={() => handleOpenReader(doc, 'pdf')}
                                    >
                                        <Eye size={14} />
                                        <span>View</span>
                                    </button>
                                    <a
                                        href={`${API_URL}/projects/${doc.id}/file?type=pdf`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn-action-icon"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Document Reader & Viewer Modal */}
            {selectedDoc && (
                <div
                    className="reader-modal-overlay"
                    onClick={(e) => {
                        if (e.target.classList.contains('reader-modal-overlay')) {
                            handleCloseReader()
                        }
                    }}
                >
                    <div className={`reader-modal-dialog ${isFullscreen ? 'fullscreen' : ''}`}>
                        {/* Top Bar */}
                        <div className="reader-top-bar">
                            <div className="reader-doc-info">
                                <div className="title-badge-icon" style={{ width: 34, height: 34 }}>
                                    <BookOpen size={18} />
                                </div>
                                <div className="reader-doc-titles">
                                    <h2 className="reader-doc-title">
                                        {selectedDoc.display_title}
                                    </h2>
                                    <div className="reader-doc-meta-sub">
                                        <span>{selectedDoc.author || 'Unknown'}</span>
                                        <span>•</span>
                                        <span>{selectedDoc.year || 'N/A'}</span>
                                        {selectedDoc.subject && (
                                            <>
                                                <span>•</span>
                                                <span style={{ color: '#7dd3fc' }}>{selectedDoc.subject}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Center Navigation Tabs */}
                            <div className="reader-nav-tabs">
                                <button
                                    className={`reader-tab-btn ${viewerTab === 'pdf' ? 'active' : ''}`}
                                    onClick={() => setViewerTab('pdf')}
                                >
                                    <FileText size={15} />
                                    <span>Document PDF</span>
                                </button>
                                <button
                                    className={`reader-tab-btn ${viewerTab === 'text' ? 'active' : ''}`}
                                    onClick={() => setViewerTab('text')}
                                >
                                    <FileCode size={15} />
                                    <span>Extracted Text</span>
                                </button>
                                <button
                                    className={`reader-tab-btn ${viewerTab === 'metadata' ? 'active' : ''}`}
                                    onClick={() => setViewerTab('metadata')}
                                >
                                    <SlidersHorizontal size={15} />
                                    <span>Archival Dossier</span>
                                </button>
                            </div>

                            {/* Top Controls */}
                            <div className="reader-top-controls">
                                <a
                                    href={`${API_URL}/projects/${selectedDoc.id}/file?type=pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="reader-ctrl-btn"
                                    title="Open PDF in new tab"
                                >
                                    <ExternalLink size={16} />
                                </a>

                                <a
                                    href={`${API_URL}/projects/${selectedDoc.id}/searchable_pdf`}
                                    download
                                    className="reader-ctrl-btn"
                                    title="Download Searchable PDF"
                                >
                                    <Download size={16} />
                                </a>

                                <button
                                    className="reader-ctrl-btn"
                                    onClick={() => setIsFullscreen(f => !f)}
                                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                >
                                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>

                                <button
                                    className="reader-ctrl-btn close"
                                    onClick={handleCloseReader}
                                    title="Close Reader (Esc)"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Main Stage */}
                        <div className="reader-main-stage">
                            {viewerTab === 'pdf' && (
                                <div className="pdf-viewer-canvas-pane">
                                    {pdfMode === 'canvas' ? (
                                        <div
                                            className="pdf-canvas-card"
                                            style={{ transform: `rotate(${rotation}deg)` }}
                                        >
                                            <Document
                                                file={`${API_URL}/projects/${selectedDoc.id}/file?type=pdf`}
                                                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                                                onLoadError={() => setPdfMode('iframe')}
                                                loading={
                                                    <div style={{ padding: '3rem', color: '#94a3b8' }}>
                                                        <RefreshCw className="animate-spin" size={32} />
                                                        <p style={{ marginTop: '1rem' }}>Rendering High-DPI Page...</p>
                                                    </div>
                                                }
                                            >
                                                <MemoPage
                                                    pageNumber={pageNumber}
                                                    scale={scale}
                                                    renderTextLayer={true}
                                                    renderAnnotationLayer={true}
                                                />
                                            </Document>
                                        </div>
                                    ) : (
                                        <iframe
                                            src={`${API_URL}/projects/${selectedDoc.id}/file?type=pdf`}
                                            title={selectedDoc.display_title}
                                            className="pdf-iframe-frame"
                                        />
                                    )}
                                </div>
                            )}

                            {viewerTab === 'text' && (
                                <div className="text-reader-pane">
                                    <div className="text-reader-header">
                                        <div>
                                            <h3 style={{ margin: 0, color: '#fff' }}>Extracted Text & Transcription</h3>
                                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                                                {loadingDetails ? 'Loading text layer...' : `${((fullProjectDetails?.cleaned_text || fullProjectDetails?.ocr_text || selectedDoc.snippet || '').split(/\s+/).length).toLocaleString()} words`}
                                            </span>
                                        </div>

                                        <button className="btn-hero-refresh" onClick={handleCopyText}>
                                            {copiedText ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
                                            <span>{copiedText ? 'Copied!' : 'Copy All Text'}</span>
                                        </button>
                                    </div>

                                    <div className="text-content-box">
                                        {loadingDetails ? (
                                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                                <RefreshCw className="animate-spin" size={24} />
                                                <p>Fetching OCR text layer...</p>
                                            </div>
                                        ) : (
                                            fullProjectDetails?.cleaned_text ||
                                            fullProjectDetails?.ocr_text ||
                                            selectedDoc.snippet ||
                                            'No extracted text layer recorded for this document yet.'
                                        )}
                                    </div>
                                </div>
                            )}

                            {viewerTab === 'metadata' && (
                                <div className="metadata-dossier-pane">
                                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
                                        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.4rem' }}>
                                            Archival Preservation Dossier
                                        </h2>
                                        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
                                            Embedded XMP, BagIt package structure, and system integrity metadata.
                                        </p>
                                    </div>

                                    <div className="dossier-grid">
                                        <div className="dossier-card">
                                            <h3>
                                                <BookOpen size={16} />
                                                Document Catalog
                                            </h3>
                                            <div className="dossier-field">
                                                <div className="dossier-label">Title</div>
                                                <div className="dossier-val">{selectedDoc.display_title}</div>
                                            </div>
                                            <div className="dossier-field">
                                                <div className="dossier-label">Author</div>
                                                <div className="dossier-val">{selectedDoc.author || 'Not set'}</div>
                                            </div>
                                            <div className="dossier-field">
                                                <div className="dossier-label">Year</div>
                                                <div className="dossier-val">{selectedDoc.year || 'Not set'}</div>
                                            </div>
                                            <div className="dossier-field">
                                                <div className="dossier-label">Subject Classification</div>
                                                <div className="dossier-val">{selectedDoc.subject || 'Unclassified'}</div>
                                            </div>
                                            <div className="dossier-field">
                                                <div className="dossier-label">Keywords / Tags</div>
                                                <div className="dossier-val">{selectedDoc.keywords || 'None'}</div>
                                            </div>
                                        </div>

                                        <div className="dossier-card">
                                            <h3>
                                                <FolderArchive size={16} />
                                                File & Storage Information
                                            </h3>
                                            <div className="dossier-field">
                                                <div className="dossier-label">Source Filename</div>
                                                <div className="dossier-val">{selectedDoc.filename}</div>
                                            </div>
                                            <div className="dossier-field">
                                                <div className="dossier-label">Preservation Status</div>
                                                <div className="dossier-val" style={{ textTransform: 'capitalize' }}>
                                                    {selectedDoc.status}
                                                </div>
                                            </div>
                                            <div className="dossier-field">
                                                <div className="dossier-label">File Size</div>
                                                <div className="dossier-val">{formatBytes(selectedDoc.file_size)}</div>
                                            </div>
                                            <div className="dossier-field">
                                                <div className="dossier-label">Ingested On</div>
                                                <div className="dossier-val">
                                                    {selectedDoc.created_at ? new Date(selectedDoc.created_at).toLocaleString() : '—'}
                                                </div>
                                            </div>
                                            <div className="dossier-field">
                                                <div className="dossier-label">Archive Standard</div>
                                                <div className="dossier-val">BagIt v1.0 • Embedded XMP</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                                        <button
                                            className="btn-hero-primary"
                                            onClick={() => {
                                                handleCloseReader()
                                                navigate(`/metadata/${selectedDoc.id}`)
                                            }}
                                        >
                                            <SlidersHorizontal size={15} />
                                            <span>Edit Metadata & Re-Archive</span>
                                        </button>
                                        <button
                                            className="btn-hero-refresh"
                                            onClick={() => {
                                                handleCloseReader()
                                                navigate(`/cleanup/${selectedDoc.id}`)
                                            }}
                                        >
                                            <FileCode size={15} />
                                            <span>Refine OCR Cleanup Text</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Control Strip (Only in PDF Mode) */}
                        {viewerTab === 'pdf' && pdfMode === 'canvas' && (
                            <div className="reader-bottom-strip">
                                <div className="reader-page-nav">
                                    <button
                                        className="reader-ctrl-btn"
                                        onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                                        disabled={pageNumber <= 1}
                                        title="Previous Page (Left Arrow)"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>

                                    <span className="page-indicator-pill">
                                        Page {pageNumber} of {numPages || '...'}
                                    </span>

                                    <button
                                        className="reader-ctrl-btn"
                                        onClick={() => setPageNumber(p => (numPages && p < numPages ? p + 1 : p))}
                                        disabled={numPages && pageNumber >= numPages}
                                        title="Next Page (Right Arrow)"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>

                                <div className="reader-zoom-cluster">
                                    <button
                                        className="reader-ctrl-btn"
                                        onClick={() => setScale(s => Math.max(0.6, parseFloat((s - 0.15).toFixed(2))))}
                                        title="Zoom Out"
                                    >
                                        <ZoomOut size={16} />
                                    </button>

                                    <span className="zoom-level-label">
                                        {Math.round(scale * 100)}%
                                    </span>

                                    <button
                                        className="reader-ctrl-btn"
                                        onClick={() => setScale(s => Math.min(2.5, parseFloat((s + 0.15).toFixed(2))))}
                                        title="Zoom In"
                                    >
                                        <ZoomIn size={16} />
                                    </button>

                                    <button
                                        className="reader-ctrl-btn"
                                        onClick={() => setRotation(r => (r + 90) % 360)}
                                        title="Rotate 90°"
                                    >
                                        <RotateCw size={16} />
                                    </button>

                                    <button
                                        className="reader-ctrl-btn"
                                        onClick={() => setPdfMode('iframe')}
                                        title="Switch to Browser Native PDF Frame"
                                    >
                                        <ExternalLink size={16} />
                                        <span style={{ fontSize: '0.75rem', marginLeft: 4 }}>Native Viewer</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
