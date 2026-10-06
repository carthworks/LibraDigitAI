import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useToast } from '../context/ToastContext'
import {
    UploadCloud,
    FileText,
    CheckCircle2,
    Loader2,
    X,
    Sparkles,
    FileDown,
    Cpu,
    ShieldCheck,
    ArrowRight,
    Globe,
    FileCheck
} from 'lucide-react'
import AdvancedOCRResults from '../components/AdvancedOCRResults'
import { API_URL } from '../config'
import { cancelJob, findActiveJob, waitForJob, JobCancelledError } from '../api/jobs'

const UploadOCR = () => {
    const navigate = useNavigate()
    const { createProject, getProject, runOCR, runAdvancedOCR, convertHandwrittenToPDF, deleteProject, setError } = useProject()
    const [searchParams] = useSearchParams()
    const { addToast } = useToast()

    const [file, setFile] = useState(null)
    const [dragActive, setDragActive] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [job, setJob] = useState(null)
    const [cancelling, setCancelling] = useState(false)
    const [convertingPDF, setConvertingPDF] = useState(false)
    const [currentProject, setCurrentProject] = useState(null)
    const [ocrResult, setOcrResult] = useState(null)
    const [pdfResult, setPdfResult] = useState(null)
    const [language, setLanguage] = useState('eng')
    // Standard OCR by default: Advanced layout analysis is about 3x slower per
    // page and only helps documents with tables, forms or stamps.
    const [useAdvancedOCR, setUseAdvancedOCR] = useState(() => {
        try {
            return localStorage.getItem('libradigit_advanced_ocr') === 'true'
        } catch {
            return false
        }
    })
    const handleAdvancedToggle = (checked) => {
        setUseAdvancedOCR(checked)
        try {
            localStorage.setItem('libradigit_advanced_ocr', String(checked))
        } catch {
            // Preference simply isn't remembered.
        }
    }
    const [activeEngine, setActiveEngine] = useState('tesseract') // 'tesseract' | 'glm-ocr'

    // Read active engine from settings once on mount
    useEffect(() => {
        fetch(`${API_URL}/settings`)
            .then(r => r.json())
            .then(s => { if (s.ocr_engine) setActiveEngine(s.ocr_engine) })
            .catch(() => { })
    }, [])

    const handleDrag = (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0])
        }
    }

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0])
        }
    }

    const handleFileSelect = (selectedFile) => {
        const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/tiff']

        if (!validTypes.includes(selectedFile.type)) {
            addToast('Only PDF (including scanned PDFs) or image files (PNG, JPEG, TIFF) are allowed', 'error')
            return
        }

        if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
            addToast('File size must be less than 50MB', 'error')
            return
        }

        setFile(selectedFile)
        setError(null)
    }

    const handleUpload = async () => {
        if (!file) return

        try {
            setUploading(true)
            setError(null)

            const project = await createProject(file)
            setCurrentProject(project)

            setUploading(false)
            addToast('Document ingested successfully! Ready for neural OCR extraction.', 'success')

        } catch (err) {
            setUploading(false)
            addToast('Failed to ingest document. Please try again.', 'error')
        }
    }

    const jobOptions = { onStart: setJob, onProgress: setJob }

    // Opened from the dashboard (/upload?project=<id>): continue that document,
    // and if OCR is already running for it, show its live progress.
    const resumeProjectId = searchParams.get('project')
    useEffect(() => {
        if (!resumeProjectId) return undefined
        const controller = new AbortController()
        ;(async () => {
            let project
            try {
                project = await getProject(resumeProjectId)
            } catch {
                addToast('That document could not be found.', 'error')
                return
            }
            if (controller.signal.aborted) return
            setCurrentProject(project)
            const active = await findActiveJob(project.id).catch(() => null)
            if (!active || controller.signal.aborted) return
            setProcessing(true)
            setJob(active)
            try {
                const result = await waitForJob(active.id, { onProgress: setJob, signal: controller.signal })
                setOcrResult(result)
                addToast('Neural OCR extraction complete!', 'success')
                getProject(project.id).catch(() => {})
            } catch (err) {
                if (err.name === 'AbortError') return
                addToast(err instanceof JobCancelledError ? 'OCR cancelled.' : err.message, err instanceof JobCancelledError ? 'info' : 'error')
            }
            if (!controller.signal.aborted) {
                setProcessing(false)
                setJob(null)
                setCancelling(false)
            }
        })()
        return () => controller.abort()
    }, [resumeProjectId])

    const finishJob = () => {
        setProcessing(false)
        setJob(null)
        setCancelling(false)
    }

    const handleCancel = async () => {
        if (!job) return
        setCancelling(true)
        try {
            setJob(await cancelJob(job.id))
        } catch {
            setCancelling(false)
            addToast('Could not cancel processing. Please try again.', 'error')
        }
    }

    const handleRunOCR = async (projectId) => {
        try {
            setProcessing(true)
            setJob(null)
            setError(null)

            let result
            if (useAdvancedOCR) {
                result = await runAdvancedOCR(projectId || currentProject.id, language, jobOptions)
            } else {
                result = await runOCR(projectId || currentProject.id, language, jobOptions)
            }

            setOcrResult(result)
            finishJob()
            addToast('Neural OCR extraction complete!', 'success')

            setTimeout(() => {
                navigate(`/cleanup/${projectId || currentProject.id}`)
            }, 1800)

        } catch (err) {
            finishJob()
            if (err instanceof JobCancelledError) {
                addToast('OCR cancelled.', 'info')
                return
            }
            addToast(err.message || 'OCR processing encountered an issue. Please verify file and retry.', 'error')
        }
    }

    const handleConvertToPDF = async (projectId) => {
        try {
            setConvertingPDF(true)
            setProcessing(true)
            setJob(null)
            setError(null)

            const title = file?.name?.replace(/\.[^/.]+$/, "") || "Handwritten Document"

            const result = await convertHandwrittenToPDF(
                projectId || currentProject.id,
                title,
                language,
                jobOptions
            )

            setPdfResult(result)
            setConvertingPDF(false)
            finishJob()
            addToast('Handwritten document converted to a searchable PDF!', 'success')

            setTimeout(() => {
                navigate(`/cleanup/${projectId || currentProject.id}`)
            }, 1800)

        } catch (err) {
            setConvertingPDF(false)
            finishJob()
            if (err instanceof JobCancelledError) {
                addToast('Conversion cancelled.', 'info')
                return
            }
            addToast('PDF conversion failed: ' + (err.message || 'Unknown error'), 'error')
        }
    }

    const resetForm = () => {
        setFile(null)
        setCurrentProject(null)
        setOcrResult(null)
        setError(null)
    }

    const handleCancelUpload = () => {
        if (currentProject) {
            deleteProject(currentProject.id).catch(err => {
                console.error('Failed to delete project:', err)
            })
        }
        resetForm()
        navigate('/')
    }

    return (
        <div className="upload-ocr-container">
            {/* Header / Stepper Banner */}
            <div className="upload-header-banner">
                <div className="banner-left">
                    <div className="sovereign-step-pill">
                        <ShieldCheck size={14} className="icon-emerald" />
                        <span>Workflow Stage 1 of 5 • Local Ingest & Extraction</span>
                    </div>
                    <h1>Document Ingest & Neural OCR</h1>
                    <p>
                        Import scanned historical manuscripts, archival charters, or modern PDFs for air-gapped text recognition and metadata preparation.
                    </p>
                </div>
                {file && (
                    <button
                        type="button"
                        className="btn-dash-secondary btn-sm"
                        onClick={handleCancelUpload}
                    >
                        <X size={15} />
                        <span>Cancel Ingest</span>
                    </button>
                )}
            </div>

            {!currentProject ? (
                /* INGEST & DROPZONE SECTION */
                <div className="upload-main-card">
                    <div
                        className={`modern-dropzone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file-selected' : ''}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        {file ? (
                            <div className="selected-file-showcase">
                                <div className="file-icon-box">
                                    <FileText size={38} />
                                </div>
                                <div className="file-details">
                                    <h3>{file.name}</h3>
                                    <div className="file-meta-pills">
                                        <span className="meta-pill">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        <span className="meta-pill">{file.type || 'Document'}</span>
                                        <span className="meta-pill text-emerald">Ready to Ingest</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-dash-secondary btn-sm"
                                    onClick={resetForm}
                                    title="Choose a different document"
                                >
                                    <X size={14} />
                                    <span>Change File</span>
                                </button>
                            </div>
                        ) : (
                            <div className="dropzone-idle-content">
                                <div className="dropzone-icon-circle">
                                    <UploadCloud size={40} />
                                </div>
                                <h3>Drag and drop archival document here</h3>
                                <p>PDF, TIFF, PNG, JPEG scanned records up to 50MB</p>
                                
                                <label className="btn-dash-primary browse-btn-label">
                                    <span>Browse Local Files</span>
                                    <input
                                        type="file"
                                        accept=".pdf,.png,.jpg,.jpeg,.tiff"
                                        onChange={handleFileInput}
                                        style={{ display: 'none' }}
                                    />
                                </label>

                                <div className="format-tags-row">
                                    <span className="format-tag">PDF / Scanned PDF</span>
                                    <span className="format-tag">TIFF (300+ DPI)</span>
                                    <span className="format-tag">PNG / JPEG</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {file && !uploading && (
                        <div className="ingest-action-footer">
                            <button
                                type="button"
                                className="btn-dash-primary btn-lg w-full"
                                onClick={handleUpload}
                            >
                                <UploadCloud size={18} />
                                <span>Ingest Document to Sovereign Repository</span>
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    {uploading && (
                        <div className="upload-progress-box">
                            <Loader2 size={24} className="spin-anim text-primary" />
                            <span>Ingesting document into local storage & verifying checksum...</span>
                        </div>
                    )}
                </div>
            ) : (
                /* OCR CONFIGURATION & PROCESSING SECTION */
                <div className="ocr-configuration-card">
                    <div className="ocr-card-header">
                        <div className="ocr-header-text">
                            <h2>OCR Neural Recognition Engine</h2>
                            <p>Configure language parameters and extraction heuristics for <strong>{file?.name || currentProject.filename}</strong></p>
                        </div>
                    </div>

                    {processing ? (
                        <div className="ocr-processing-active-box">
                            <div className="spinner-orbit">
                                <Loader2 size={44} className="spin-anim text-primary" />
                            </div>
                            <h3>Neural Recognition in Progress...</h3>
                            <p aria-live="polite">{job?.message || 'Performing binarization, deskew analysis, and OCR character extraction.'}</p>
                            <div
                                className="ocr-progress"
                                role="progressbar"
                                aria-label="OCR progress"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(job?.progress || 0)}
                            >
                                <div className="ocr-progress-fill" style={{ width: `${job?.progress || 0}%` }} />
                            </div>
                            <div className="ocr-progress-meta">
                                {job?.status === 'queued' ? 'Queued' : `${Math.round(job?.progress || 0)}%`}
                            </div>
                            <button
                                type="button"
                                className="btn-dash-secondary ocr-cancel-btn"
                                onClick={handleCancel}
                                disabled={!job || cancelling}
                            >
                                {cancelling ? 'Stopping…' : 'Stop processing'}
                            </button>
                            <div className="processing-subtext">Zero data leaves your machine • Running locally</div>
                        </div>
                    ) : ocrResult ? (
                        <div className="ocr-success-box">
                            <div className="success-icon-wrap">
                                <CheckCircle2 size={40} className="text-emerald" />
                            </div>
                            <h3>OCR Extraction Complete!</h3>
                            <p>Text layers extracted and ready for validation in the Cleanup Studio.</p>

                            {useAdvancedOCR && ocrResult.statistics && (
                                <div className="advanced-stats-container">
                                    <AdvancedOCRResults results={ocrResult} />
                                </div>
                            )}

                            <div className="ocr-summary-grid">
                                <div className="ocr-stat-card">
                                    <span className="ocr-stat-label">Pages Processed</span>
                                    <span className="ocr-stat-val">{ocrResult.pages || 1}</span>
                                </div>
                                <div className="ocr-stat-card">
                                    <span className="ocr-stat-label">Extracted Characters</span>
                                    <span className="ocr-stat-val">{(ocrResult.text_length || 0).toLocaleString()}</span>
                                </div>
                                <div className="ocr-stat-card">
                                    <span className="ocr-stat-label">Processing Engine</span>
                                    <span className="ocr-stat-val text-primary">{activeEngine === 'glm-ocr' ? 'GLM-OCR' : 'Tesseract v5'}</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="btn-dash-primary btn-lg mt-md"
                                onClick={() => navigate(`/cleanup/${currentProject.id}`)}
                            >
                                <span>Continue to Cleanup Studio</span>
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="ocr-settings-form">
                            {/* Language & Engine Deck */}
                            <div className="ocr-settings-grid">
                                <div className="form-group-box">
                                    <label className="field-label">
                                        <Globe size={15} />
                                        <span>Document Language Model</span>
                                    </label>
                                    <select
                                        className="dash-select-input"
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                    >
                                        <option value="eng">English (Latin script standard)</option>
                                        <option value="spa">Spanish (Español)</option>
                                        <option value="fra">French (Français)</option>
                                        <option value="deu">German (Deutsch / Fraktur)</option>
                                        <option value="ita">Italian (Italiano)</option>
                                        <option value="por">Portuguese (Português)</option>
                                        <option value="hin">Hindi (हिन्दी)</option>
                                        <option value="chi_sim">Chinese - Simplified (简体中文)</option>
                                        <option value="jpn">Japanese (日本語)</option>
                                        <option value="rus">Russian (Русский)</option>
                                    </select>
                                    <span className="field-hint">Optimizes lexicon dictionary and char detection models.</span>
                                </div>

                                <div className="form-group-box">
                                    <label className="field-label">
                                        <Cpu size={15} />
                                        <span>Active Neural Engine</span>
                                    </label>
                                    <div className="engine-display-chip">
                                        <div className="engine-dot"></div>
                                        <span>{activeEngine === 'glm-ocr' ? 'GLM-OCR Dual-Vision Architecture' : 'Tesseract 5.x Neural LSTM'}</span>
                                    </div>
                                    <span className="field-hint">Configured in Engine Settings. 100% local sovereign execution.</span>
                                </div>
                            </div>

                            {/* Advanced Analysis Toggle */}
                            <div className="advanced-toggle-card">
                                <div className="toggle-info-section">
                                    <div className="toggle-icon-wrap">
                                        <Sparkles size={18} />
                                    </div>
                                    <div className="toggle-copy">
                                        <h4>Advanced Layout & Feature Analysis</h4>
                                        <p>Detect structured tables, form fields, stamps, signatures, and auto-correct skew angle. About 3× slower per page — turn on for forms and tables.</p>
                                    </div>
                                </div>
                                <label className="dash-switch">
                                    <input
                                        type="checkbox"
                                        checked={useAdvancedOCR}
                                        disabled={activeEngine === 'glm-ocr'}
                                        aria-label="Advanced layout and feature analysis"
                                        onChange={(e) => handleAdvancedToggle(e.target.checked)}
                                    />
                                    <span className="dash-slider"></span>
                                </label>
                            </div>

                            {/* Action Buttons */}
                            <div className="ocr-actions-deck">
                                <button
                                    type="button"
                                    className="btn-dash-primary btn-lg w-full"
                                    onClick={() => handleRunOCR(currentProject.id)}
                                >
                                    <Sparkles size={18} />
                                    <span>Execute Neural OCR Recognition</span>
                                    <ArrowRight size={16} />
                                </button>

                                <div className="alt-action-divider">
                                    <span>OR</span>
                                </div>

                                <button
                                    type="button"
                                    className="btn-dash-secondary btn-lg w-full"
                                    onClick={() => handleConvertToPDF(currentProject.id)}
                                    disabled={convertingPDF || (file && !file.type.startsWith('image/'))}
                                >
                                    <FileDown size={18} />
                                    <span>{convertingPDF ? 'Converting to Archival PDF...' : 'Convert Handwritten Image to Searchable PDF'}</span>
                                </button>
                            </div>

                            {pdfResult && (
                                <div className="pdf-generated-notice">
                                    <FileCheck size={18} className="text-emerald" />
                                    <div>
                                        <strong>Archival PDF Generated</strong>
                                        <p>{pdfResult.word_count} words recognized • {pdfResult.line_count} text lines</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default UploadOCR
