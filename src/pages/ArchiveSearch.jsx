import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Search, FileText, User, ArrowRight, Loader, AlertCircle, X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import debounce from 'lodash.debounce'
import { Document, Page, pdfjs } from 'react-pdf'
import './ArchiveSearch.css'
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useToast } from '../context/ToastContext'

// Configure PDF worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const API_URL = 'http://localhost:5000/api'

function ArchiveSearch() {
    const navigate = useNavigate()
    const { addToast } = useToast()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)

    // PDF Viewer State
    const [selectedPdf, setSelectedPdf] = useState(null)
    const [numPages, setNumPages] = useState(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [scale, setScale] = useState(1.0)
    const [isFullscreen, setIsFullscreen] = useState(false)

    // Debounce search to avoid excessive API calls
    const debouncedSearch = React.useCallback(
        debounce(async (searchQuery) => {
            if (!searchQuery.trim()) {
                setResults([])
                setLoading(false)
                return
            }

            try {
                const response = await axios.get(`${API_URL}/search?q=${encodeURIComponent(searchQuery)}&limit=50`)
                setResults(response.data.results)
                setSearched(true)
            } catch (error) {
                console.error("Search error:", error)
                addToast("Failed to search archives. Please try again.", "error")
            } finally {
                setLoading(false)
            }
        }, 300),
        [addToast]
    )

    useEffect(() => {
        return () => {
            debouncedSearch.cancel()
        }
    }, [debouncedSearch])

    const handleSearchChange = (e) => {
        const val = e.target.value
        setQuery(val)

        if (val.trim()) {
            setLoading(true)
            debouncedSearch(val)
        } else {
            setResults([])
            setSearched(false)
        }
    }

    const openPdfViewer = (result) => {
        setSelectedPdf({
            ...result,
            url: `${API_URL}/projects/${result.id}/file`
        })
        setPageNumber(1)
        setScale(1.0)
    }

    const closePdfViewer = () => {
        setSelectedPdf(null)
        setIsFullscreen(false)
    }

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages)
    }

    const changePage = (offset) => {
        setPageNumber(prevPageNumber => prevPageNumber + offset)
    }

    const previousPage = () => changePage(-1)
    const nextPage = () => changePage(1)

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen)
    }

    return (
        <div className="archive-search-container">
            <div className="search-header">
                <h1>Archive Search</h1>
                <p>Instantly find documents, sections, and content across your entire library.</p>
            </div>

            <div className="search-box-wrapper">
                <Search className="search-icon-large" size={24} />
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search for keywords, titles, authors, or content..."
                    value={query}
                    onChange={handleSearchChange}
                    autoFocus
                />
                {loading && <Loader className="search-spinner spin" size={24} />}
            </div>

            <div className="search-results fade-in">
                {searched && results.length > 0 && (
                    <div className="search-meta-info">
                        Found {results.length} matches
                    </div>
                )}

                {results.length > 0 ? (
                    <div className="results-grid-container">
                        <table className="results-table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Year</th>
                                    <th>Metadata (Author • Title)</th>
                                    <th>Context Match</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((result) => (
                                    <tr key={result.id} onClick={() => openPdfViewer(result)} className="result-row">
                                        <td><span className="badge subject">{result.subject || 'General'}</span></td>
                                        <td>{result.year || 'N/A'}</td>
                                        <td>
                                            <div className="metadata-cell">
                                                <div className="metadata-author">{result.author || 'Unknown Author'}</div>
                                                <div className="metadata-title">{result.title}</div>
                                            </div>
                                        </td>
                                        <td className="snippet-cell">
                                            {result.snippet && (
                                                <div
                                                    className="result-snippet-text"
                                                    dangerouslySetInnerHTML={{ __html: result.snippet }}
                                                />
                                            )}
                                        </td>
                                        <td>
                                            <button className="view-btn">
                                                View PDF
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    searched && !loading && (
                        <div className="empty-state fade-in">
                            <AlertCircle size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                            <h3>No results found</h3>
                            <p>Try adjusting your search terms or keywords.</p>
                        </div>
                    )
                )}
            </div>

            {/* PDF Viewer Modal */}
            {selectedPdf && (
                <div className={`pdf-modal-overlay ${isFullscreen ? 'fullscreen' : ''}`}>
                    <div className="pdf-modal-content">
                        <div className="pdf-header">
                            <div className="pdf-title-info">
                                <h2>{selectedPdf.title}</h2>
                                <span className="pdf-meta">
                                    {selectedPdf.author} • {selectedPdf.year} • {selectedPdf.subject}
                                </span>
                            </div>
                            <div className="pdf-controls">
                                <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} title="Zoom Out"><ZoomOut size={20} /></button>
                                <span className="zoom-level">{Math.round(scale * 100)}%</span>
                                <button onClick={() => setScale(s => Math.min(2.5, s + 0.1))} title="Zoom In"><ZoomIn size={20} /></button>
                                <div className="divider"></div>
                                <button onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                                    {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                                </button>
                                <button onClick={closePdfViewer} className="close-btn" title="Close"><X size={24} /></button>
                            </div>
                        </div>

                        <div className="pdf-body">
                            <div className="pdf-viewer-container">
                                <Document
                                    file={selectedPdf.url}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    loading={<div className="pdf-loading"><Loader className="spin" /> Loading PDF...</div>}
                                    error={<div className="pdf-error">Failed to load PDF.</div>}
                                >
                                    <Page
                                        pageNumber={pageNumber}
                                        scale={scale}
                                        renderTextLayer={true}
                                        renderAnnotationLayer={true}
                                    />
                                </Document>
                            </div>

                            {/* Captions / Context Panel could go here if extracted */}
                            <div className="pdf-captions-panel">
                                <h3>Context Matches</h3>
                                <div
                                    className="caption-content"
                                    dangerouslySetInnerHTML={{ __html: selectedPdf.snippet || 'No distinct context matches found.' }}
                                />
                            </div>
                        </div>

                        <div className="pdf-footer">
                            <button
                                disabled={pageNumber <= 1}
                                onClick={previousPage}
                                className="nav-btn"
                            >
                                <ChevronLeft size={16} /> Previous
                            </button>
                            <span>
                                Page {pageNumber} of {numPages || '--'}
                            </span>
                            <button
                                disabled={pageNumber >= numPages}
                                onClick={nextPage}
                                className="nav-btn"
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ArchiveSearch
