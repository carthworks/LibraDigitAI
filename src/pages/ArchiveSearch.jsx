import React, { useState, useEffect, useRef, memo } from "react"
import axios from "axios"
import debounce from "lodash.debounce"
import DOMPurify from "dompurify"
import {
    Search, Loader, AlertCircle, X,
    ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
    Maximize2, Minimize2
} from "lucide-react"
import { Document, Page, pdfjs } from "react-pdf"
import { useToast } from "../context/ToastContext"
import "./ArchiveSearch.css"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url"
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

const API_URL = "http://localhost:5000/api"
const MemoPage = memo(Page)

export default function ArchiveSearch() {
    const { addToast } = useToast()

    const [query, setQuery] = useState("")
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)

    const [selectedPdf, setSelectedPdf] = useState(null)
    const [numPages, setNumPages] = useState(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [scale, setScale] = useState(1)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [viewAsImage, setViewAsImage] = useState(false)

    const cache = useRef(new Map())

    // Stable debounce instance
    const debouncedSearch = useRef(
        debounce(async (searchQuery) => {
            if (!searchQuery.trim()) {
                setResults([])
                setLoading(false)
                return
            }

            if (cache.current.has(searchQuery)) {
                setResults(cache.current.get(searchQuery))
                setLoading(false)
                setSearched(true)
                return
            }

            setLoading(true)
            try {
                const { data } = await axios.get(`${API_URL}/search`, {
                    params: { q: searchQuery, limit: 50 }
                })
                cache.current.set(searchQuery, data.results || [])
                setResults(data.results || [])
                setSearched(true)
            } catch {
                addToast("Failed to search archives.", "error")
            } finally {
                setLoading(false)
            }
        }, 300)
    ).current

    useEffect(() => () => debouncedSearch.cancel(), [])

    const handleSearchChange = (e) => {
        const val = e.target.value
        setQuery(val)
        debouncedSearch(val)
    }

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
                <Search size={22} />
                <input
                    className="search-input"
                    value={query}
                    onChange={handleSearchChange}
                    placeholder="Search by title, author, content..."
                />
                {loading && <Loader className="spin" size={22} />}
            </div>

            {searched && results.length > 0 && (
                <div className="search-meta-info">
                    Found {results.length} matches
                </div>
            )}

            {results.length ? (
                <table className="results-table">
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Year</th>
                            <th>Metadata</th>
                            <th>Context</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results.map((r) => (
                            <tr key={r.id} onClick={() => openPdfViewer(r)} className="result-row">
                                <td>{r.subject || "General"}</td>
                                <td>{r.year || "N/A"}</td>
                                <td>
                                    <b>{r.author || "Unknown"}</b>
                                    <div>{r.title}</div>
                                </td>
                                <td>
                                    <div
                                        className="result-snippet-text"
                                        dangerouslySetInnerHTML={sanitize(r.snippet)}
                                    />
                                </td>
                                <td>
                                    <button className="view-btn">View PDF</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
