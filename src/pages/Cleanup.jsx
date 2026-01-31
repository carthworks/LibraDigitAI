import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { Save, AlertCircle, ArrowRight, X, Download, Globe, AlertTriangle } from 'lucide-react'
import WorkflowTracker from '../components/WorkflowTracker'
import TextEditor from '../components/TextEditor'
import Modal from '../components/Modal'
import { API_URL } from '../config'
import { useToast } from '../context/ToastContext'
import './Cleanup.css'

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
            addToast('No low confidence text data available.', 'info')
            return
        }
        let newText = cleanedText
        let count = 0
        confidenceData.forEach(item => {
            const regex = new RegExp(`\\b${item.word}\\b`, 'g')
            if (!newText.includes(`background-color: #fff9c4`)) {
            }
            newText = newText.replace(regex, `<span style="background-color: #fff9c4" title="Confidence: ${item.conf}%">${item.word}</span>`)
            count++
        })
        if (count > 0) {
            setCleanedText(newText)
            addToast(`Highlighted ${count} uncertain words`, 'success')
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
                <p>Loading project...</p>
            </div>
        )
    }

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
                <div className="cleanup-header">
                    <div className="cleanup-header-content">
                        <h2>OCR Text Cleanup</h2>
                        <p className="text-secondary">
                            Review and correct any OCR errors in the extracted text
                        </p>
                    </div>
                    <div className="cleanup-actions">
                        <div className="cleanup-tools" style={{ display: 'flex', gap: '8px', marginRight: '16px', borderRight: '1px solid #ddd', paddingRight: '16px' }}>
                            <button className="btn btn-ghost" onClick={handleDownloadSearchablePDF} title="Download Searchable PDF (Sandwich)">
                                <Download size={20} />
                            </button>
                            <button className="btn btn-ghost" onClick={handleTranslate} title="Translate Text">
                                <Globe size={20} />
                            </button>
                            <button
                                className="btn btn-ghost"
                                onClick={handleHighlightUncertain}
                                title={`Highlight ${confidenceData.length} Low Confidence Words`}
                                disabled={!confidenceData.length}
                            >
                                <AlertTriangle size={20} color={confidenceData.length ? "#F59E0B" : "currentColor"} />
                            </button>
                        </div>
                        <button
                            className="btn btn-ghost"
                            onClick={handleCancel}
                            title="Cancel and delete this project"
                        >
                            <X size={20} />
                            Cancel
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            <Save size={20} />
                            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleContinue}
                        >
                            Continue to Metadata
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="cleanup-split-view">
                    {/* Left side - Document Preview */}
                    <div className="cleanup-preview">
                        <div className="preview-header">
                            <span className="editor-label">Original Document</span>
                        </div>
                        <div className="preview-content">
                            {currentProject?.filename ? (
                                <div className="document-preview-card">
                                    <div className="document-icon">
                                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                    </div>
                                    <h4>{currentProject.filename}</h4>
                                    <p className="preview-note">
                                        📄 The uploaded document has been processed with OCR.<br />
                                        Review the extracted text on the right and make corrections.
                                    </p>
                                    <div className="preview-stats">
                                        <div className="stat-item">
                                            <span className="stat-label">Status</span>
                                            <span className="stat-value">{currentProject.status}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Created</span>
                                            <span className="stat-value">
                                                {new Date(currentProject.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="preview-placeholder">
                                    <p>No document preview available</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right side - Text Editor */}
                    <div className="cleanup-editor">
                        <TextEditor
                            value={cleanedText}
                            onChange={(e) => setCleanedText(e.target.value)}
                            placeholder="OCR extracted text will appear here..."
                        />
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
                title="Translate Document"
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
                <p>Enter the target language code (e.g., 'es' for Spanish, 'fr' for French):</p>
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
                            <Download size={20} style={{ marginRight: '8px' }} /> Download
                        </button>
                    </>
                }
            >
                <p>Do you want to download the auto-generated Searchable PDF (Sandwich PDF)?</p>
                <p style={{ marginTop: '8px', opacity: 0.7, fontSize: '0.9em' }}>This file contains the original image with an invisible text layer, preserving the original look.</p>
            </Modal>
        </div>
    )
}

export default Cleanup
