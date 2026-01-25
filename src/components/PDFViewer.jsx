import React, { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, X } from 'lucide-react'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import './PDFViewer.css'

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

function PDFViewer({ fileUrl, fileName, onClose }) {
    const [numPages, setNumPages] = useState(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [scale, setScale] = useState(1.0)
    const [loading, setLoading] = useState(true)

    function onDocumentLoadSuccess({ numPages }) {
        setNumPages(numPages)
        setLoading(false)
    }

    function onDocumentLoadError(error) {
        console.error('Error loading PDF:', error)
        setLoading(false)
    }

    const goToPrevPage = () => {
        setPageNumber(prev => Math.max(prev - 1, 1))
    }

    const goToNextPage = () => {
        setPageNumber(prev => Math.min(prev + 1, numPages))
    }

    const zoomIn = () => {
        setScale(prev => Math.min(prev + 0.2, 3.0))
    }

    const zoomOut = () => {
        setScale(prev => Math.max(prev - 0.2, 0.5))
    }

    const handleDownload = () => {
        const link = document.createElement('a')
        link.href = fileUrl
        link.download = fileName || 'document.pdf'
        link.click()
    }

    return (
        <div className="pdf-viewer-overlay" onClick={onClose}>
            <div className="pdf-viewer-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="pdf-viewer-header">
                    <div className="pdf-viewer-title">
                        <h3>{fileName || 'Document Viewer'}</h3>
                        {numPages && (
                            <span className="page-info">
                                Page {pageNumber} of {numPages}
                            </span>
                        )}
                    </div>
                    <button className="close-btn" onClick={onClose} title="Close">
                        <X size={24} />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="pdf-viewer-toolbar">
                    <div className="toolbar-group">
                        <button
                            onClick={goToPrevPage}
                            disabled={pageNumber <= 1}
                            title="Previous page"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="page-indicator">
                            {pageNumber} / {numPages || '?'}
                        </span>
                        <button
                            onClick={goToNextPage}
                            disabled={pageNumber >= numPages}
                            title="Next page"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="toolbar-group">
                        <button onClick={zoomOut} disabled={scale <= 0.5} title="Zoom out">
                            <ZoomOut size={20} />
                        </button>
                        <span className="zoom-indicator">{Math.round(scale * 100)}%</span>
                        <button onClick={zoomIn} disabled={scale >= 3.0} title="Zoom in">
                            <ZoomIn size={20} />
                        </button>
                    </div>

                    <div className="toolbar-group">
                        <button onClick={handleDownload} title="Download PDF">
                            <Download size={20} />
                            Download
                        </button>
                    </div>
                </div>

                {/* PDF Content */}
                <div className="pdf-viewer-content">
                    {loading && (
                        <div className="pdf-loading">
                            <div className="spinner"></div>
                            <p>Loading PDF...</p>
                        </div>
                    )}
                    <Document
                        file={fileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={null}
                    >
                        <Page
                            pageNumber={pageNumber}
                            scale={scale}
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                        />
                    </Document>
                </div>
            </div>
        </div>
    )
}

export default PDFViewer
