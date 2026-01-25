import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { Upload, FileText, AlertCircle, CheckCircle, Loader, X } from 'lucide-react'
import './UploadOCR.css'

const UploadOCR = () => {
    const navigate = useNavigate()
    const { createProject, runOCR, deleteProject, error, setError } = useProject()

    const [file, setFile] = useState(null)
    const [dragActive, setDragActive] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [currentProject, setCurrentProject] = useState(null)
    const [ocrResult, setOcrResult] = useState(null)
    const [language, setLanguage] = useState('eng')

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
            setError('Only PDF or image files (PNG, JPEG, TIFF) are allowed')
            return
        }

        if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
            setError('File size must be less than 50MB')
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

            // Create project with file upload
            const project = await createProject(file)
            setCurrentProject(project)

            setUploading(false)

            // Show success message
            // Show success message
            // Auto-advance to OCR setup screen
            // The user will then select language and click "Run OCR" manually
            setUploading(false)

        } catch (err) {
            setUploading(false)
            setError('Failed to upload file. Please try again.')
        }
    }

    const handleRunOCR = async (projectId) => {
        try {
            setProcessing(true)
            setError(null)

            const result = await runOCR(projectId || currentProject.id, language)
            setOcrResult(result)
            setProcessing(false)

            // Navigate to cleanup after OCR
            setTimeout(() => {
                navigate(`/cleanup/${projectId || currentProject.id}`)
            }, 1500)

        } catch (err) {
            setProcessing(false)
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
            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <div>
                        <strong>Error</strong>
                        <p>{error}</p>
                    </div>
                </div>
            )}

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
                                    <p className="upload-hint">Supported: PDF, PNG, JPEG, TIFF (Max 50MB)</p>
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
                                <span>Uploading file...</span>
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
                                <button
                                    className="btn btn-primary btn-lg w-full"
                                    onClick={() => handleRunOCR(currentProject.id)}
                                >
                                    Run OCR
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default UploadOCR
