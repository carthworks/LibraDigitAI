import React, { useState, useEffect, useRef, memo } from "react"
import axios from "axios"
import debounce from "lodash.debounce"
import DOMPurify from "dompurify"
import {
    Search, Loader, AlertCircle, X,
    ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
    Maximize2, Minimize2, FileText, Sliders, ChevronDown, ChevronUp
} from "lucide-react"
import { Document, Page, pdfjs } from "react-pdf"
import { useToast } from "../context/ToastContext"
import { API_URL } from "../config"
import "./ArchiveSearch.css"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker
const MemoPage = memo(Page)

export default function ArchiveSearch() {
    const { addToast } = useToast()

    const [query, setQuery] = useState("")
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)

    // Advanced Filters State
    const [advancedOpen, setAdvancedOpen] = useState(false)
    const [filters, setFilters] = useState({
        exact: false,
        smart: false,
        field: 'all',
        yearStart: '',
        yearEnd: ''
    })

    const [selectedPdf, setSelectedPdf] = useState(null)
    const [numPages, setNumPages] = useState(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [scale, setScale] = useState(1)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [viewAsImage, setViewAsImage] = useState(false)

    const handleSearchChange = (e) => setQuery(e.target.value)

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    // Effect for Searching with Debounce
    useEffect(() => {
        const performSearch = async () => {
            // Return if empty query AND no filters are set
            if (!query.trim() && !filters.yearStart && !filters.yearEnd) {
                setResults([])
                setSearched(false)
                setLoading(false)
                return
            }

            setLoading(true)
            try {
                const params = {
                    q: query,
                    limit: 50,
                    exact: filters.exact,
                    smart: filters.smart,
                    field: filters.field,
                    year_start: filters.yearStart,
                    year_end: filters.yearEnd
                }

                const { data } = await axios.get(`${API_URL}/search`, { params })
                setResults(data.results || [])
                setSearched(true)
            } catch {
                addToast("Failed to search archives.", "error")
            } finally {
                setLoading(false)
            }
        }

        const timer = setTimeout(performSearch, 400)
        return () => clearTimeout(timer)
    }, [query, filters, addToast])

    const openPdfViewer = (result) => {
        setSelectedPdf({ ...result, url: `${API_URL}/projects/${result.id}/file` })
        setPageNumber(1)
        setScale(1)
        setViewAsImage(false)
    }

    const closePdfViewer = () => {
        setSelectedPdf(null)
        setIsFullscreen(false)
    }

    const changePage = (offset) => {
        setPageNumber((p) => {
            const next = p + offset
            if (next < 1) return 1
            if (next > numPages) return numPages
            return next
        })
    }

    const sanitize = (html) => ({
        __html: DOMPurify.sanitize(html || "")
    })

    return (
        <div className="archive-search-container">
            <div className="search-header">
                <h1>Archive Search</h1>
                <p>Instantly find documents across your archive.</p>
            </div>

            <div className="search-box-wrapper">
                <Search size={22} className="search-icon-large" />
                <input
                    className="search-input"
                    value={query}
                    onChange={handleSearchChange}
                    placeholder="Search by title, author, content..."
                />
                {loading && <Loader className="spin search-spinner" size={22} />}
            </div>

            <div className="advanced-filter-toggle">
                <button
                    className="advanced-toggle-btn"
                    onClick={() => setAdvancedOpen(!advancedOpen)}
                >
                    <Sliders size={16} />
                    Advanced Options
                    {advancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {advancedOpen && (
                <div className="advanced-filters-panel">
                    <div className="filter-group">
                        <label>Search Mode</label>
                        <div className="filter-controls-row">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={filters.exact}
                                    onChange={(e) => handleFilterChange('exact', e.target.checked)}
                                />
                                Exact Phrase
                            </label>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={filters.smart}
                                    onChange={(e) => handleFilterChange('smart', e.target.checked)}
                                />
                                Smart Search (Fuzzy)
                            </label>
                        </div>
                    </div>

                    <div className="filter-group">
                        <label>Field</label>
                        <select
                            className="filter-select"
                            value={filters.field}
                            onChange={(e) => handleFilterChange('field', e.target.value)}
                        >
                            <option value="all">All Fields</option>
                            <option value="title">Title</option>
                            <option value="author">Author</option>
                            <option value="content">Content</option>
                            <option value="keywords">Keywords</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Year Range</label>
                        <div className="date-inputs">
                            <input
                                type="number"
                                className="filter-input" placeholder="Start"
                                value={filters.yearStart}
                                onChange={(e) => handleFilterChange('yearStart', e.target.value)}
                            />
                            <span>-</span>
                            <input
                                type="number"
                                className="filter-input" placeholder="End"
                                value={filters.yearEnd}
                                onChange={(e) => handleFilterChange('yearEnd', e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {searched && results.length > 0 && (
                <div className="search-meta-info">
                    Found {results.length} matches
                </div>
            )}

            {results.length ? (
                <div className="results-grid-container">
                    <div className="results-grid">
                        <div className="grid-header">
                            <div className="grid-cell">Title</div>
                            <div className="grid-cell">Subject</div>
                            <div className="grid-cell">Year</div>
                            <div className="grid-cell">Author</div>
                            <div className="grid-cell">Context</div>
                            <div className="grid-cell">Action</div>
                        </div>
                        {results.map((r) => (
                            <div
                                key={r.id}
                                className="grid-row"
                                onClick={() => openPdfViewer(r)}
                            >
                                <div className="grid-cell">
                                    <div className="cell-content">
                                        <FileText size={18} className="cell-icon" />
                                        <span className="cell-title">{r.title || "Untitled Document"}</span>
                                    </div>
                                </div>
                                <div className="grid-cell">
                                    <span className="badge badge-primary">
                                        {r.subject || "General"}
                                    </span>
                                </div>
                                <div className="grid-cell">
                                    {r.year || "N/A"}
                                </div>
                                <div className="grid-cell">
                                    {r.author || "Unknown"}
                                </div>
                                <div className="grid-cell grid-cell-snippet">
                                    <div
                                        className="result-snippet-text"
                                        dangerouslySetInnerHTML={sanitize(r.snippet)}
                                    />
                                </div>
                                <div className="grid-cell grid-cell-action">
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            openPdfViewer(r)
                                        }}
                                    >
                                        <ZoomIn size={16} />
                                        View
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                searched && !loading && (
                    <div className="empty-state">
                        <AlertCircle size={40} />
                        <p>No results found</p>
                    </div>
                )
            )}

            {selectedPdf && (
                <div className={`pdf-modal-overlay ${isFullscreen ? "fullscreen" : ""}`}>
                    <div className="pdf-modal-content">
                        <div className="pdf-header">
                            <div>
                                <h2>{selectedPdf.title}</h2>
                                <span>
                                    {selectedPdf.author} • {selectedPdf.year} • {selectedPdf.subject}
                                </span>
                            </div>
                            <div className="pdf-controls">
                                <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))}><ZoomOut /></button>
                                <span>{Math.round(scale * 100)}%</span>
                                <button onClick={() => setScale(s => Math.min(2.5, s + 0.1))}><ZoomIn /></button>
                                <button onClick={() => setIsFullscreen(f => !f)}>
                                    {isFullscreen ? <Minimize2 /> : <Maximize2 />}
                                </button>
                                <button onClick={closePdfViewer}><X /></button>
                            </div>
                        </div>

                        <div className="pdf-body">
                            <div className="pdf-viewer-container">
                                {viewAsImage ? (
                                    <img
                                        src={selectedPdf.url}
                                        alt={selectedPdf.title}
                                        style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
                                    />
                                ) : (
                                    <Document
                                        file={selectedPdf.url}
                                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                                        onLoadError={() => setViewAsImage(true)}
                                    >
                                        <MemoPage
                                            pageNumber={pageNumber}
                                            scale={scale}
                                            renderTextLayer
                                            renderAnnotationLayer
                                        />
                                    </Document>
                                )}
                            </div>

                            <div className="pdf-captions-panel">
                                <h3>Context Matches</h3>
                                <div dangerouslySetInnerHTML={sanitize(selectedPdf.snippet)} />
                            </div>
                        </div>

                        <div className="pdf-footer">
                            <button disabled={pageNumber <= 1} onClick={() => changePage(-1)}>
                                <ChevronLeft /> Prev
                            </button>
                            <span>
                                Page {pageNumber} of {numPages || "--"}
                            </span>
                            <button disabled={pageNumber >= numPages} onClick={() => changePage(1)}>
                                Next <ChevronRight />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
