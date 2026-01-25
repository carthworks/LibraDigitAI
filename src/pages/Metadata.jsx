import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { Save, AlertCircle, ArrowRight, X } from 'lucide-react'
import WorkflowTracker from '../components/WorkflowTracker'
import MetadataSuggestions from '../components/MetadataSuggestions'
import './Metadata.css'

const Metadata = () => {
    const { projectId } = useParams()
    const navigate = useNavigate()
    const { getProject, saveMetadata, deleteProject, currentProject, loading, error } = useProject()

    const [formData, setFormData] = useState({
        title: '',
        author: '',
        year: '',
        subject: '',
        keywords: ''
    })
    const [errors, setErrors] = useState({})
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
            if (project.metadata) {
                setFormData({
                    title: project.metadata.title || '',
                    author: project.metadata.author || '',
                    year: project.metadata.year || '',
                    subject: project.metadata.subject || '',
                    keywords: project.metadata.keywords || ''
                })
            }
        } catch (err) {
            console.error('Failed to load project:', err)
        }
    }

    const validateForm = () => {
        const newErrors = {}

        if (!formData.title.trim()) {
            newErrors.title = 'Title is mandatory'
        }

        if (formData.year && !/^\d{4}$/.test(formData.year)) {
            newErrors.year = 'Year must be a 4-digit number'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const handleAcceptSuggestion = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    const handleSave = async () => {
        if (!validateForm()) {
            return
        }

        try {
            setSaving(true)
            setSaved(false)
            await saveMetadata(projectId, formData)
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            alert('Failed to save metadata')
        } finally {
            setSaving(false)
        }
    }

    // Sanitize filename - remove special characters and spaces
    const sanitizeFilename = (text) => {
        if (!text) return ''
        // Replace spaces with underscores
        let sanitized = text.replace(/\s+/g, '_')
        // Remove special characters, keep only alphanumeric, underscore, and hyphen
        sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '')
        // Remove multiple consecutive underscores
        sanitized = sanitized.replace(/_+/g, '_')
        // Remove leading/trailing underscores
        sanitized = sanitized.replace(/^_+|_+$/g, '')
        return sanitized
    }

    const handleContinue = async () => {
        if (!validateForm()) {
            return
        }

        if (!saved) {
            await handleSave()
        }
        navigate(`/archive/${projectId}`)
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
            <div className="metadata-loading">
                <div className="spinner"></div>
                <p>Loading project...</p>
            </div>
        )
    }

    return (
        <div className="metadata-page">
            {currentProject && (
                <WorkflowTracker currentStep={4} projectStatus={currentProject.status} />
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

            <div className="metadata-container">
                <div className="metadata-header">
                    <div className="metadata-header-content">
                        <h2>Document Metadata</h2>
                        <p className="text-secondary">
                            Add metadata to make your document discoverable and organized
                        </p>
                    </div>
                    <div className="metadata-actions">
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
                            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Metadata'}
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleContinue}
                        >
                            Continue to Archive
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>

                {/* AI Metadata Suggestions */}
                <MetadataSuggestions
                    projectId={projectId}
                    onAccept={handleAcceptSuggestion}
                />

                <div className="metadata-form">
                    <div className="form-group">
                        <label className="form-label required" htmlFor="title">
                            Title
                        </label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            className="form-input"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Enter document title"
                        />
                        {errors.title && <span className="form-error">{errors.title}</span>}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="author">
                                Author
                            </label>
                            <input
                                type="text"
                                id="author"
                                name="author"
                                className="form-input"
                                value={formData.author}
                                onChange={handleChange}
                                placeholder="Enter author name"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="year">
                                Year
                            </label>
                            <input
                                type="text"
                                id="year"
                                name="year"
                                className="form-input"
                                value={formData.year}
                                onChange={handleChange}
                                placeholder="YYYY"
                                maxLength="4"
                            />
                            {errors.year && <span className="form-error">{errors.year}</span>}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="subject">
                            Subject
                        </label>
                        <input
                            type="text"
                            id="subject"
                            name="subject"
                            className="form-input"
                            value={formData.subject}
                            onChange={handleChange}
                            placeholder="Enter subject or category"
                        />
                        <span className="form-hint">
                            This will be used for organizing files in the archive
                        </span>
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="keywords">
                            Keywords
                        </label>
                        <input
                            type="text"
                            id="keywords"
                            name="keywords"
                            className="form-input"
                            value={formData.keywords}
                            onChange={handleChange}
                            placeholder="keyword1, keyword2, keyword3"
                        />
                        <span className="form-hint">
                            Separate keywords with commas for better searchability
                        </span>
                    </div>

                    <div className="metadata-preview">
                        <h3>Archive Preview</h3>
                        <div className="preview-path">
                            <code>
                                /Archive/{sanitizeFilename(formData.subject) || 'Subject'}/{sanitizeFilename(formData.year) || 'Year'}/
                                {formData.author ? `${sanitizeFilename(formData.author)}_` : ''}
                                {formData.year ? `${sanitizeFilename(formData.year)}_` : ''}
                                {sanitizeFilename(formData.title) || 'Title'}.pdf
                            </code>
                        </div>
                        <span className="form-hint">
                            Spaces and special characters will be replaced with underscores
                        </span>
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

export default Metadata
