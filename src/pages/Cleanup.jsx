import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import {
    Save, AlertCircle, ArrowRight, X, Download, Globe,
    AlertTriangle, Sparkles, ZoomIn, ZoomOut, Maximize2,
    ExternalLink, Eye, EyeOff, FileText, CheckCircle2, RotateCcw
} from 'lucide-react'
import WorkflowTracker from '../components/WorkflowTracker'
import TextEditor from '../components/TextEditor'
import Modal from '../components/Modal'
import { API_URL } from '../config'
import { useToast } from '../context/ToastContext'
import './Cleanup.css'

export function extractCleanContent(raw) {
    if (!raw || typeof raw !== 'string') return raw || ''
    if (!raw.includes('DOCUMENT ANALYSIS REPORT') && !raw.includes('📖 MAIN CONTENT')) {
        return raw
    }

    const mainSection = raw.match(/📖 MAIN CONTENT\s*[\r\n]+[-=]+[\r\n]+([\s\S]*?)(?=(?:[\r\n]+(?:✍️|📈|📊|📝|={40,}))|$)/i)
    const tablesSection = raw.match(/📊 TABLES\s*[\r\n]+[-=]+[\r\n]+([\s\S]*?)(?=(?:[\r\n]+(?:✍️|📈|📝|📖|={40,}))|$)/i)
    const hwSection = raw.match(/✍️ HANDWRITTEN TEXT\s*[\r\n]+[-=]+[\r\n]+([\s\S]*?)(?=(?:[\r\n]+(?:📈|={40,}))|$)/i)

    const parts = []
    if (mainSection && mainSection[1].trim()) parts.push(mainSection[1].trim())
    if (tablesSection && tablesSection[1].trim()) parts.push("### Extracted Tables\n" + tablesSection[1].trim())
    if (hwSection && hwSection[1].trim()) parts.push("### Handwritten Notes\n" + hwSection[1].trim())

    if (parts.length > 0) return parts.join('\n\n')

    // Fallback line-by-line filter if section regex fails
    const filteredLines = raw.split(/\r?\n/).filter(line => {
        const trimmed = line.trim()
        if (/^={3,}$/.test(trimmed)) return false
        if (/^-{3,}$/.test(trimmed)) return false
        if (/^DOCUMENT ANALYSIS REPORT$/i.test(trimmed)) return false
        if (/^📐 Page Orientation/i.test(trimmed)) return false
        if (/^📄 PAGE STRUCTURE/i.test(trimmed)) return false
        if (/^(Header|Footer|Stamps\/Watermarks|Signatures):/i.test(trimmed)) return false
        if (/^📊 TABLES$/i.test(trimmed)) return false
        if (/^📝 FORM FIELDS$/i.test(trimmed)) return false
        if (/^(Checkboxes|Text Fields):/i.test(trimmed)) return false
        if (/^📖 MAIN CONTENT$/i.test(trimmed)) return false
        if (/^✍️ HANDWRITTEN TEXT$/i.test(trimmed)) return false
        if (/^📈 STATISTICS$/i.test(trimmed)) return false
        if (/^(Total Words|Tables|Checkboxes|Text Fields|Stamps|Signatures): \d+/i.test(trimmed)) return false
        return true
    })

    return filteredLines.join('\n').trim()
}

const Cleanup = () => {
    const { projectId } = useParams()
    const navigate = useNavigate()
    const { getProject, saveCleanedText, deleteProject, currentProject, loading, error } = useProject()
    const { addToast } = useToast()

    const [cleanedText, setCleanedText] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [showCancelDialog, setShowCancelDialog] = useState(false)

    const [confidenceData, setConfidenceData] = useState([])

    // Preview zoom & view controls
    const [zoom, setZoom] = useState(1)
    const [previewCollapsed, setPreviewCollapsed] = useState(false)
    const [previewError, setPreviewError] = useState(false)

    // Modal States
    const [showTranslateModal, setShowTranslateModal] = useState(false)
    const [showPDFConfirm, setShowPDFConfirm] = useState(false)
    const [targetLang, setTargetLang] = useState('en')
    const [translationError, setTranslationError] = useState('')

    useEffect(() => {
        if (projectId) {
            loadProject()
        }
    }, [projectId])

    const loadProject = async () => {
        try {
            const project = await getProject(projectId)
            setCleanedText(project.cleaned_text || project.ocr_text || '')
            if (project.confidence_data) {
                try {
                    setConfidenceData(JSON.parse(project.confidence_data))
                } catch (e) {
                    console.error("Error parsing confidence data", e)
                }
            }
        } catch (err) {
            console.error('Failed to load project:', err)
        }
    }

    const hasReportBanners = cleanedText && (
        cleanedText.includes('DOCUMENT ANALYSIS REPORT') ||
        cleanedText.includes('📖 MAIN CONTENT') ||
        cleanedText.includes('================================================================================')
    )

    const handleExtractClean = () => {
        const clean = extractCleanContent(cleanedText)
        setCleanedText(clean)
        addToast('Clean document text extracted without diagnostic headers', 'success')
    }

    const handleDownloadSearchablePDF = () => setShowPDFConfirm(true)

    const performDownloadPDF = () => {
        window.open(`${API_URL}/projects/${projectId}/searchable_pdf`, '_blank')
        setShowPDFConfirm(false)
    }

    const handleTranslate = () => setShowTranslateModal(true)

    const performTranslation = async () => {
        if (!targetLang) return
        setTranslationError('')

        try {
            setSaving(true)
            const res = await fetch(`${API_URL}/translate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: cleanedText, target: targetLang })
            })
            const data = await res.json()
            if (data.translated_text) {
                setCleanedText(data.translated_text)
                setShowTranslateModal(false)
                addToast('Document translated successfully', 'success')
            } else {
                setTranslationError('Translation failed: ' + (data.error || 'Unknown error'))
            }
        } catch (e) {
            setTranslationError('Error translating: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    const handleHighlightUncertain = () => {
        if (!confidenceData || !confidenceData.length) {
            addToast('No low confidence text data available for this document.', 'info')
            return
        }
        let newText = cleanedText
        let count = 0
        confidenceData.forEach(item => {
            const escaped = item.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const regex = new RegExp(`\\b${escaped}\\b`, 'g')
            newText = newText.replace(regex, `<span style="background-color: #fff9c4; color: #1f2933; padding: 1px 3px; border-radius: 2px;" title="Confidence: ${Number(item.conf)}%">${escapeHtml(item.word)}</span>`)
            count++
        })
        if (count > 0) {
            setCleanedText(newText)
            addToast(`Highlighted ${count} uncertain words for review`, 'success')
        } else {
            addToast("Could not match words in current text.", 'warning')
        }
    }

    const handleSave = async () => {
        if (!cleanedText.trim()) {
            addToast('Text cannot be empty', 'error')
            return
        }

        try {
            setSaving(true)
            setSaved(false)
            await saveCleanedText(projectId, cleanedText)
            setSaved(true)
            addToast('Progress saved successfully', 'success')
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            addToast('Failed to save cleaned text', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleContinue = async () => {
        if (!saved) {
            await handleSave()
        }
        navigate(`/metadata/${projectId}`)
    }

    const handleCancel = () => {
        setShowCancelDialog(true)
    }

    const confirmCancel = async () => {
        try {
            await deleteProject(projectId)
            navigate('/')
        } catch (err) {
            console.error('Failed to delete project:', err)
            addToast('Failed to cancel project. Please try again.', 'error')
        }
    }

    if (loading && !currentProject) {
        return (
            <div className="cleanup-loading">
                <div className="spinner"></div>
                <p>Loading project workspace...</p>
            </div>
        )
    }

    const filename = currentProject?.filename || 'Document'
    const isPdf = filename.toLowerCase().endsWith('.pdf')
    const originalFileUrl = `${API_URL}/projects/${projectId}/file?type=original`

    return (
        <div className="cleanup-page">
            {currentProject && (
                <WorkflowTracker currentStep={3} projectStatus={currentProject.status} />
            )}

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <div>
                        <strong>Error</strong>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            <div className="cleanup-container">
                {/* Modern Unified Studio Action Bar */}
                <div className="cleanup-header-bar">
                    <div className="cleanup-doc-info">
                        <span className="doc-type-badge">{isPdf ? 'PDF' : 'SCAN'}</span>
                        <div className="doc-title-group">
                            <h2 className="doc-filename" title={filename}>{filename}</h2>
                            <div className="doc-meta-tags">
                                <span className="meta-tag status-tag">Status: {currentProject?.status || 'cleanup'}</span>
                                {currentProject?.created_at && (
                                    <span className="meta-tag date-tag">
                                        {new Date(currentProject.created_at).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="cleanup-actions">
                        {/* Quick Text Utility Tools */}
                        <div className="cleanup-tools-group">
                            {hasReportBanners && (
                                <button
                                    type="button"
                                    className="btn-studio-action highlight-action"
                                    onClick={handleExtractClean}
                                    title="Strip OCR layout diagnostic report and keep only clean digitized text"
                                >
                                    <Sparkles size={16} />
                                    <span>Clean Text</span>
                                </button>
                            )}

                            <button
                                type="button"
                                className={`btn-studio-action ${confidenceData.length ? 'has-alerts' : ''}`}
                                onClick={handleHighlightUncertain}
                                title={confidenceData.length ? `Highlight ${confidenceData.length} Low Confidence Words` : 'No uncertain words detected'}
                                disabled={!confidenceData.length}
                            >
                                <AlertTriangle size={16} />
                                <span>Uncertain {confidenceData.length ? `(${confidenceData.length})` : ''}</span>
                            </button>

                            <button
                                type="button"
                                className="btn-studio-action"
                                onClick={handleTranslate}
                                title="Translate Extracted Text"
                            >
                                <Globe size={16} />
                                <span>Translate</span>
                            </button>

                            <button
                                type="button"
                                className="btn-studio-action"
                                onClick={handleDownloadSearchablePDF}
                                title="Download Searchable PDF with invisible text layer"
                            >
                                <Download size={16} />
                                <span>Searchable PDF</span>
                            </button>
                        </div>

                        <div className="action-divider" />

                        {/* Primary Workflow Actions */}
                        <div className="cleanup-nav-group">
                            <button
                                type="button"
                                className="btn btn-ghost btn-cancel-doc"
                                onClick={handleCancel}
                                title="Cancel and delete this project"
                            >
                                <X size={16} />
                                <span>Cancel</span>
                            </button>

                            <button
                                type="button"
                                className="btn btn-secondary btn-save-doc"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saved ? <CheckCircle2 size={16} className="text-green-500" /> : <Save size={16} />}
                                <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}</span>
                            </button>

                            <button
                                type="button"
                                className="btn btn-primary btn-continue-doc"
                                onClick={handleContinue}
                            >
                                <span>Continue to Metadata</span>
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Workspace Split View */}
                <div className={`cleanup-split-view ${previewCollapsed ? 'preview-hidden' : ''}`}>
                    {/* Left Panel: Document Viewer */}
                    {!previewCollapsed && (
                        <div className="cleanup-preview-pane">
                            <div className="pane-header">
                                <div className="pane-title">
                                    <FileText size={16} className="text-orange-400" />
                                    <span>Original Document</span>
                                </div>
                                <div className="viewer-toolbar">
                                    {!isPdf && !previewError && (
                                        <>
                                            <button
                                                type="button"
                                                className="btn-zoom"
                                                onClick={() => setZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                                                title="Zoom Out"
                                            >
                                                <ZoomOut size={14} />
                                            </button>
                                            <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                                            <button
                                                type="button"
                                                className="btn-zoom"
                                                onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))}
                                                title="Zoom In"
                                            >
                                                <ZoomIn size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-zoom-fit"
                                                onClick={() => setZoom(1)}
                                                title="Reset Zoom to 100%"
                                            >
                                                <RotateCcw size={12} />
                                                <span>Fit</span>
                                            </button>
                                        </>
                                    )}
                                    <a
                                        href={originalFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-open-ext"
                                        title="Open original file in new window"
                                    >
                                        <ExternalLink size={14} />
                                    </a>
                                    <button
                                        type="button"
                                        className="btn-collapse-pane"
                                        onClick={() => setPreviewCollapsed(true)}
                                        title="Hide preview for full-width editor"
                                    >
                                        <EyeOff size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="preview-pane-body">
                                {!previewError ? (
                                    isPdf ? (
                                        <div className="pdf-embed-wrapper">
                                            <iframe
                                                src={`${originalFileUrl}#toolbar=0&navpanes=0`}
                                                title={filename}
                                                className="preview-iframe"
                                                onError={() => setPreviewError(true)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="image-scroll-wrapper">
                                            <img
                                                src={originalFileUrl}
                                                alt={filename}
                                                className="source-document-image"
                                                style={{
                                                    transform: `scale(${zoom})`,
                                                    transformOrigin: 'top center'
                                                }}
                                                onError={() => setPreviewError(true)}
                                            />
                                        </div>
                                    )
                                ) : (
                                    <div className="preview-fallback-card">
                                        <div className="fallback-icon">
                                            <FileText size={48} />
                                        </div>
                                        <h4>{filename}</h4>
                                        <p className="fallback-note">
                                            Scanned file loaded and processed with OCR. You can inspect the extracted text on the right.
                                        </p>
                                        <div className="fallback-meta">
                                            <span className="badge-pill">Status: {currentProject?.status}</span>
                                            <a
                                                href={originalFileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="link-raw-file"
                                            >
                                                Open Raw Document ↗
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Right Panel: Cleaned Text Editor */}
                    <div className="cleanup-editor-pane">
                        <div className="pane-header">
                            <div className="pane-title">
                                <Sparkles size={16} className="text-orange-400" />
                                <span>Digitized & Searchable Text</span>
                            </div>
                            <div className="editor-pane-tools">
                                {previewCollapsed && (
                                    <button
                                        type="button"
                                        className="btn-expand-pane"
                                        onClick={() => setPreviewCollapsed(false)}
                                        title="Show Original Document side-by-side"
                                    >
                                        <Eye size={14} />
                                        <span>Show Document Preview</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Layout Report Banner Alert if present */}
                        {hasReportBanners && (
                            <div className="layout-report-alert">
                                <div className="alert-copy">
                                    <Sparkles size={16} className="sparkle-icon" />
                                    <span>Raw OCR analysis layout report detected in editor.</span>
                                </div>
                                <button
                                    type="button"
                                    className="btn-strip-report"
                                    onClick={handleExtractClean}
                                >
                                    ✨ Extract Clean Document Text
                                </button>
                            </div>
                        )}

                        <div className="editor-pane-body">
                            <TextEditor
                                value={cleanedText}
                                onChange={(e) => setCleanedText(e.target.value)}
                                placeholder="OCR extracted text will appear here. Correct spelling or format as needed..."
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Cancel Project Modal */}
            <Modal
                isOpen={showCancelDialog}
                title="Cancel Project?"
                onClose={() => setShowCancelDialog(false)}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowCancelDialog(false)}>Keep Working</button>
                        <button className="btn btn-danger" onClick={confirmCancel}>
                            <X size={20} style={{ marginRight: '8px' }} /> Yes, Cancel Project
                        </button>
                    </>
                }
            >
                <p>Are you sure you want to cancel this project? This will delete the uploaded file and all associated data. This action cannot be undone.</p>
            </Modal>

            {/* Translation Modal */}
            <Modal
                isOpen={showTranslateModal}
                title="Translate Extracted Document Text"
                onClose={() => setShowTranslateModal(false)}
                footer={
                    <>
                        <button className="btn btn-ghost" onClick={() => setShowTranslateModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={performTranslation} disabled={saving}>
                            {saving ? 'Translating...' : 'Translate'}
                        </button>
                    </>
                }
            >
                <p>Enter the target language code (e.g., 'es' for Spanish, 'fr' for French, 'ta' for Tamil, 'de' for German):</p>
                <input
                    className="form-input"
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    placeholder="en"
                    autoFocus
                />
                {translationError && <p className="mt-2" style={{ color: '#ef4444' }}>{translationError}</p>}
            </Modal>

            {/* PDF Download Confirmation Modal */}
            <Modal
                isOpen={showPDFConfirm}
                title="Download Searchable PDF"
                onClose={() => setShowPDFConfirm(false)}
                footer={
                    <>
                        <button className="btn btn-ghost" onClick={() => setShowPDFConfirm(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={performDownloadPDF}>
                            <Download size={18} style={{ marginRight: '8px' }} /> Download PDF
                        </button>
                    </>
                }
            >
                <p>Do you want to download the auto-generated Searchable PDF (Sandwich PDF)?</p>
                <p style={{ marginTop: '8px', opacity: 0.75, fontSize: '0.88rem' }}>
                    This file preserves the original scans with an invisible, selectable and searchable text layer conforming to library digitization standards.
                </p>
            </Modal>
        </div>
    )
}

function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
}

export default Cleanup
