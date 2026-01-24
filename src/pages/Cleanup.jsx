import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { Save, AlertCircle, ArrowRight, X } from 'lucide-react'
import WorkflowTracker from '../components/WorkflowTracker'
import TextEditor from '../components/TextEditor'
import './Cleanup.css'

const Cleanup = () => {
    const { projectId } = useParams()
    const navigate = useNavigate()
    const { getProject, saveCleanedText, deleteProject, currentProject, loading, error } = useProject()

    const [cleanedText, setCleanedText] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [showCancelDialog, setShowCancelDialog] = useState(false)

    useEffect(() => {
        if (projectId) {
            loadProject()
        }
    }, [projectId])

    const loadProject = async () => {
        try {
            const project = await getProject(projectId)
            setCleanedText(project.cleaned_text || project.ocr_text || '')
        } catch (err) {
            console.error('Failed to load project:', err)
        }
    }

    const handleSave = async () => {
        if (!cleanedText.trim()) {
            alert('Text cannot be empty')
            return
        }

        try {
            setSaving(true)
            setSaved(false)
            await saveCleanedText(projectId, cleanedText)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            alert('Failed to save cleaned text')
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
            alert('Failed to cancel project. Please try again.')
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

            {/* Cancel Confirmation Dialog */}
            {showCancelDialog && (
                <div className="modal-overlay" onClick={() => setShowCancelDialog(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Cancel Project?</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowCancelDialog(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>
                                Are you sure you want to cancel this project? This will delete the uploaded file
                                and all associated data. This action cannot be undone.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowCancelDialog(false)}
                            >
                                Keep Working
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={confirmCancel}
                            >
                                <X size={20} />
                                Yes, Cancel Project
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Cleanup
