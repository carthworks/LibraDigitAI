import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { useToast } from '../context/ToastContext'
import { Upload, FileText, AlertCircle, CheckCircle, Loader, X, Sparkles, FileDown, Cpu, Zap } from 'lucide-react'
import AdvancedOCRResults from '../components/AdvancedOCRResults'
import { API_URL } from '../config'
import './UploadOCR.css'

const UploadOCR = () => {
    const navigate = useNavigate()
    const { createProject, runOCR, runAdvancedOCR, convertHandwrittenToPDF, deleteProject, error, setError } = useProject()
    const { addToast } = useToast()

    const [file, setFile] = useState(null)
    const [dragActive, setDragActive] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [convertingPDF, setConvertingPDF] = useState(false)
    const [currentProject, setCurrentProject] = useState(null)
    const [ocrResult, setOcrResult] = useState(null)
    const [pdfResult, setPdfResult] = useState(null)
    const [language, setLanguage] = useState('eng')
    const [useAdvancedOCR, setUseAdvancedOCR] = useState(false)
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
        setError(null) // Clear global context error if any
    }

    const handleUpload = async () => {
        if (!file) return

        try {
            setUploading(true)
            setError(null)

            // Create project with file upload
            const project = await createProject(file)
            setCurrentProject(project)

            setUploading(false)
            addToast('File uploaded successfully! Ready for processing.', 'success')

        } catch (err) {
            setUploading(false)
            addToast('Failed to upload file. Please try again.', 'error')
        }
    }

    const handleRunOCR = async (projectId) => {
        try {
            setProcessing(true)
            setError(null)

            // Use advanced OCR if enabled and file is an image
            let result;
            if (useAdvancedOCR) {
                result = await runAdvancedOCR(projectId || currentProject.id, language)
            } else {
                result = await runOCR(projectId || currentProject.id, language)
            }

            setOcrResult(result)
            setProcessing(false)
            addToast('OCR processing completed successfully!', 'success')

            // Navigate to cleanup after OCR
            setTimeout(() => {
                navigate(`/cleanup/${projectId || currentProject.id}`)
            }, 2000)

        } catch (err) {
            setProcessing(false)
            addToast('OCR processing failed. Please check the file and try again.', 'error')
        }
    }

    const handleConvertToPDF = async (projectId) => {
        try {
            setConvertingPDF(true)
            setError(null)

            const title = file?.name?.replace(/\.[^/.]+$/, "") || "Handwritten Notes"

            const result = await convertHandwrittenToPDF(
                projectId || currentProject.id,
                title,
                language
            )

            setPdfResult(result)
            setConvertingPDF(false)
            addToast('PDF conversion successful!', 'success')

            // Show success message
            setTimeout(() => {
                navigate(`/cleanup/${projectId || currentProject.id}`)
            }, 2000)

        } catch (err) {
            setConvertingPDF(false)
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
            // If project was created, delete it
            deleteProject(currentProject.id).catch(err => {
                console.error('Failed to delete project:', err)
            })
        }
        resetForm()
        navigate('/')
    }

    return (
        <div className="upload-ocr">
            {/* Inline Error Removed - handled by Toasts */}

            {!currentProject ? (
                <div className="upload-section">
                    <div className="card card-elevated">
                        <div className="card-header">
                            <div>
                                <h2 className="card-title">Upload Document</h2>
                                <p className="card-description">
                                    Upload a scanned PDF or image file to begin the digitization process
                                </p>
                            </div>
                            {file && (
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={handleCancelUpload}
                                >
                                    <X size={18} />
                                    Cancel
                                </button>
                            )}
                        </div>

                        <div
                            className={`upload-dropzone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            {file ? (
                                <div className="file-preview">
                                    <FileText size={48} className="file-icon" />
                                    <div className="file-info">
                                        <h3>{file.name}</h3>
                                        <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <button className="btn btn-ghost btn-sm" onClick={resetForm}>
                                        Change File
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Upload size={48} className="upload-icon" />
                                    <h3>Drag and drop your file here</h3>
                                    <p>or</p>
                                    <label className="btn btn-secondary">
                                        Browse Files
                                        <input
                                            type="file"
                                            accept=".pdf,.png,.jpg,.jpeg,.tiff"
                                            onChange={handleFileInput}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                    <p className="upload-hint">Supported: PDF (including scanned), PNG, JPEG, TIFF (Max 50MB)</p>
                                </>
                            )}
                        </div>

                        {file && !uploading && (
                            <button
                                className="btn btn-primary btn-lg w-full mt-lg"
                                onClick={handleUpload}
                            >
                                <Upload size={20} />
                                Upload and Process
                            </button>
                        )}

                        {uploading && (
                            <div className="processing-status">
                                <Loader size={24} className="spinner" />
                                <span className="upload-text-anim">Uploading file...</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="ocr-section">
                    <div className="card card-elevated">
                        <div className="card-header">
                            <div>
                                <h2 className="card-title">OCR Processing</h2>
                                <p className="card-description">
                                    Converting your document to searchable text
                                </p>
                            </div>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={handleCancelUpload}
                            >
                                <X size={18} />
                                Cancel
                            </button>
                        </div>

                        {processing ? (
                            <div className="processing-status large">
                                <Loader size={48} className="spinner" />
                                <h3>Running OCR...</h3>
                                <p>This may take a few moments depending on document size</p>
                            </div>
                        ) : ocrResult ? (
                            <div className="success-status">
                                <CheckCircle size={48} className="success-icon" />
                                <h3>OCR Complete!</h3>
                                <p>Your document has been processed successfully</p>

                                {/* Show advanced OCR results if available */}
                                {useAdvancedOCR && ocrResult.statistics && (
                                    <AdvancedOCRResults results={ocrResult} />
                                )}

                                <div className="ocr-stats">
                                    <div className="stat">
                                        <span className="stat-label">Pages Processed</span>
                                        <span className="stat-value">{ocrResult.pages || 1}</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-label">Text Extracted</span>
                                        <span className="stat-value">{ocrResult.text_length || 0} chars</span>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-primary btn-lg mt-lg"
                                    onClick={() => navigate(`/cleanup/${currentProject.id}`)}
                                >
                                    Continue to Cleanup
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="language-selector mb-lg">
                                    <label className="form-label">OCR Language</label>
                                    <select
                                        className="form-select"
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value)}
                                    >
                                        <option value="eng">English (Default)</option>
                                        <option value="spa">Spanish (Español)</option>
                                        <option value="fra">French (Français)</option>
                                        <option value="deu">German (Deutsch)</option>
                                        <option value="ita">Italian (Italiano)</option>
                                        <option value="por">Portuguese (Português)</option>
                                        <option value="hin">Hindi (हिन्दी)</option>
                                        <option value="chi_sim">Chinese - Simplified (简体中文)</option>
                                        <option value="jpn">Japanese (日本語)</option>
                                        <option value="rus">Russian (Русский)</option>
                                    </select>
                                    <p className="form-hint">Note: Ensure corresponding language pack is installed in Tesseract.</p>
                                </div>

                                {/* Advanced OCR Toggle — disabled for GLM-OCR */}
                                <div className="advanced-ocr-toggle mb-lg">
                                    <div className="toggle-header">
                                        <div className="toggle-info">
                                            <Sparkles size={20} className="sparkles-icon" />
                                            <div>
                                                <label className="form-label">Advanced OCR Analysis</label>
                                                {activeEngine === 'glm-ocr' ? (
                                                    <p className="form-hint" style={{ color: '#f59e0b' }}>
                                                        GLM-OCR already performs advanced analysis automatically.
                                                    </p>
                                                ) : (
                                                    <p className="form-hint">
                                                        Detect tables, forms, signatures, page structure, and auto-correct orientation
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={useAdvancedOCR}
                                                disabled={activeEngine === 'glm-ocr'}
                                                onChange={(e) => setUseAdvancedOCR(e.target.checked)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                    {useAdvancedOCR && (
                                        <div className="advanced-features-list">
                                            <ul>
                                                <li>✓ Page orientation detection & correction</li>
                                                <li>✓ Table & form field extraction</li>
                                                <li>✓ Header, footer & page structure analysis</li>
                                                <li>✓ Stamp & signature detection</li>
                                                <li>✓ Handwritten text recognition</li>
                                                <li>✓ Enhanced image preprocessing</li>
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                <button
                                    className="btn btn-primary btn-lg w-full"
                                    onClick={() => handleRunOCR(currentProject.id)}
                                >
                                    {activeEngine === 'glm-ocr' ? (
                                        <>
                                            <Cpu size={20} />
                                            Run OCR <span style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: '6px' }}>✨ GLM-OCR</span>
                                        </>
                                    ) : useAdvancedOCR ? (
                                        <>
                                            <Sparkles size={20} />
                                            Run Advanced OCR <span style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: '6px' }}>⚡ Tesseract</span>
                                        </>
                                    ) : (
                                        <>Run OCR <span style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: '6px' }}>⚡ Tesseract</span></>
                                    )}
                                </button>

                                {/* Handwritten to PDF Button */}
                                <div className="mt-md">
                                    <p className="text-center text-muted mb-sm">
                                        <strong>Or</strong> convert handwritten image notes to formatted PDF
                                    </p>
                                    <button
                                        className="btn btn-secondary btn-lg w-full"
                                        onClick={() => handleConvertToPDF(currentProject.id)}
                                        disabled={convertingPDF || (file && !file.type.startsWith('image/'))}
                                        style={{ opacity: (file && !file.type.startsWith('image/')) ? 0.7 : 1, cursor: (file && !file.type.startsWith('image/')) ? 'not-allowed' : 'pointer' }}
                                        title={file && !file.type.startsWith('image/') ? "This feature is for direct image files. For scanned PDFs with handwriting, use 'Run OCR' above." : "Convert handwritten notes from images to formatted PDF"}
                                    >
                                        <FileDown size={20} />
                                        {convertingPDF ? 'Converting to PDF...' : 'Convert Handwritten Image to PDF'}
                                    </button>
                                    {file && file.type === 'application/pdf' && (
                                        <p className="text-center mt-2" style={{ color: '#4CAF50', fontSize: '0.85rem' }}>
                                            <CheckCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                                            For scanned PDFs with handwritten text, use <strong>"Run OCR"</strong> above - it automatically detects and processes handwriting!
                                        </p>
                                    )}
                                </div>

                                {/* PDF Conversion Success */}
                                {pdfResult && (
                                    <div className="success-message mt-md">
                                        <CheckCircle size={20} className="success-icon" />
                                        <div>
                                            <strong>PDF Generated!</strong>
                                            <p className="text-sm">
                                                {pdfResult.word_count} words extracted • {pdfResult.line_count} lines
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default UploadOCR
