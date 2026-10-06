import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import {
    Save, AlertCircle, ArrowRight, X, Sparkles, Check,
    FileText, Folder, Calendar, User, Tag, Eye, EyeOff,
    ExternalLink, Copy, CheckCircle2
} from 'lucide-react'
import WorkflowTracker from '../components/WorkflowTracker'
import Modal from '../components/Modal'
import { API_URL } from '../config'
import { useToast } from '../context/ToastContext'
import axios from 'axios'
import './Metadata.css'

const SUBJECT_PRESETS = [
    'Government & ID Records',
    'Literature & Arts',
    'History & Manuscripts',
    'Legal & Judicial',
    'Science & Technology',
    'Philosophy & Religion',
    'Academic & Research',
    'Rare Library Collections'
]

// Text edited in Cleanup is stored as the editor's HTML; show and copy it as plain text.
const projectPlainText = (project) => {
    const text = project?.cleaned_text || project?.ocr_text || ''
    if (!/<[a-z][^>]*>/i.test(text)) return text
    const doc = new DOMParser().parseFromString(text, 'text/html')
    const blocks = doc.body.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote, pre')
    return blocks.length
        ? Array.from(blocks, block => block.textContent).join('\n')
        : doc.body.textContent || ''
}

const Metadata = () => {
    const { projectId } = useParams()
    const navigate = useNavigate()
    const { getProject, saveMetadata, deleteProject, currentProject, loading, error } = useProject()
    const { addToast } = useToast()

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

    // AI Suggestions State
    const [suggestions, setSuggestions] = useState(null)
    const [extracting, setExtracting] = useState(false)

    // Document Reference Pane State
    const [showRefPane, setShowRefPane] = useState(true)
    const [keywordInput, setKeywordInput] = useState('')
    const [copiedText, setCopiedText] = useState(false)

    useEffect(() => {
        if (projectId) {
            loadProject()
            loadSuggestions()
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
            } else if (project.filename) {
                // Pre-fill sensible default title from filename if completely empty
                const defaultTitle = project.filename.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ')
                setFormData(prev => ({
                    ...prev,
                    title: prev.title || defaultTitle
                }))
            }
        } catch (err) {
            console.error('Failed to load project:', err)
        }
    }

    const loadSuggestions = async () => {
        try {
            const res = await axios.get(`${API_URL}/metadata/suggestions/${projectId}`)
            if (res.data?.suggestions) {
                setSuggestions(res.data.suggestions)
            }
        } catch (err) {
            console.error('Error loading suggestions:', err)
        }
    }

    const handleExtractAI = async () => {
        setExtracting(true)

        try {
            const res = await axios.post(`${API_URL}/metadata/extract/${projectId}`)
            const extracted = res.data?.suggestions || {}
            const normalized = {
                suggested_title: extracted.title,
                suggested_author: extracted.author,
                suggested_year: extracted.year,
                suggested_subject: extracted.subject,
                suggested_keywords: extracted.keywords,
                confidence_scores: extracted.confidence_scores || {}
            }
            setSuggestions(normalized)
            addToast('AI metadata extraction completed!', 'success')
        } catch (err) {
            console.error('Failed to extract metadata:', err)
            const msg = err.response?.data?.error || 'Extraction failed'
            addToast(msg, 'error')
        } finally {
            setExtracting(false)
        }
    }

    const handleAcceptAll = () => {
        if (!suggestions) return
        setFormData(prev => ({
            title: suggestions.suggested_title || prev.title,
            author: suggestions.suggested_author || prev.author,
            year: suggestions.suggested_year ? String(suggestions.suggested_year) : prev.year,
            subject: suggestions.suggested_subject || prev.subject,
            keywords: suggestions.suggested_keywords || prev.keywords
        }))
        setErrors({})
        addToast('All AI suggestions applied to form', 'success')
    }

    const handleApplySuggestion = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
        addToast(`Applied suggestion for ${field}`, 'info')
    }

    const validateForm = () => {
        const newErrors = {}
        if (!formData.title.trim()) {
            newErrors.title = 'Document title is required'
        }
        if (formData.year && !/^\d{4}$/.test(formData.year.trim())) {
            newErrors.year = 'Year must be a 4-digit number (e.g., 2024)'
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    // Keyword tag management
    const currentTags = formData.keywords
        ? formData.keywords.split(',').map(s => s.trim()).filter(Boolean)
        : []

    const handleAddTag = (rawTag) => {
        const tag = rawTag.trim().toLowerCase()
        if (!tag) return
        if (!currentTags.includes(tag)) {
            const nextTags = [...currentTags, tag]
            setFormData(prev => ({ ...prev, keywords: nextTags.join(', ') }))
        }
        setKeywordInput('')
    }

    const handleRemoveTag = (tagToRemove) => {
        const nextTags = currentTags.filter(t => t !== tagToRemove)
        setFormData(prev => ({ ...prev, keywords: nextTags.join(', ') }))
    }

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            handleAddTag(keywordInput)
        } else if (e.key === 'Backspace' && !keywordInput && currentTags.length > 0) {
            handleRemoveTag(currentTags[currentTags.length - 1])
        }
    }

    const handleSave = async () => {
        if (!validateForm()) return

        try {
            setSaving(true)
            setSaved(false)
            await saveMetadata(projectId, formData)
            setSaved(true)
            addToast('Metadata saved successfully', 'success')
            setTimeout(() => setSaved(false), 3000)
        } catch (err) {
            addToast('Failed to save metadata. Please try again.', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleContinue = async () => {
        if (!validateForm()) return
        if (!saved) {
            await handleSave()
        }
        navigate(`/archive/${projectId}`)
    }

    const handleCancel = () => setShowCancelDialog(true)

    const confirmCancel = async () => {
        try {
            await deleteProject(projectId)
            navigate('/')
        } catch (err) {
            console.error('Failed to delete project:', err)
            addToast('Failed to cancel project.', 'error')
        }
    }

    const sanitizeFilename = (text) => {
        if (!text) return ''
        let sanitized = text.replace(/\s+/g, '_')
        sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '')
        sanitized = sanitized.replace(/_+/g, '_')
        return sanitized.replace(/^_+|_+$/g, '')
    }

    const handleCopyOcrText = () => {
        const text = projectPlainText(currentProject)
        if (text) {
            navigator.clipboard.writeText(text)
            setCopiedText(true)
            addToast('OCR text copied to clipboard', 'info')
            setTimeout(() => setCopiedText(false), 2000)
        }
    }

    if (loading && !currentProject) {
        return (
            <div className="metadata-loading">
                <div className="spinner"></div>
                <p>Loading document metadata workspace...</p>
            </div>
        )
    }

    const filename = currentProject?.filename || 'Document'
    const isPdf = filename.toLowerCase().endsWith('.pdf')
    const originalFileUrl = `${API_URL}/projects/${projectId}/file?type=original`
    const ocrSnippet = projectPlainText(currentProject).trim()

    // Calculated Archival Paths
    const subjectFolder = sanitizeFilename(formData.subject) || 'General'
    const yearFolder = sanitizeFilename(formData.year) || 'Undated'
    const authorPrefix = formData.author ? `${sanitizeFilename(formData.author)}_` : ''
    const yearPrefix = formData.year ? `${sanitizeFilename(formData.year)}_` : ''
    const fileBaseName = `${authorPrefix}${yearPrefix}${sanitizeFilename(formData.title) || 'Document'}.pdf`

    // Extract suggested keywords list from AI suggestions if any
    const aiKeywords = suggestions?.suggested_keywords
        ? suggestions.suggested_keywords.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
        : []

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
                {/* Modern Studio Action Header */}
                <div className="metadata-header-bar">
                    <div className="metadata-doc-info">
                        <span className="doc-type-badge">{isPdf ? 'PDF' : 'SCAN'}</span>
                        <div className="doc-title-group">
                            <h2 className="doc-filename" title={filename}>{filename}</h2>
                            <div className="doc-meta-tags">
                                <span className="meta-tag status-tag">Step 4: Dublin Core Metadata</span>
                                <span className="meta-tag format-tag">Preservation BagIt Compliant</span>
                            </div>
                        </div>
                    </div>

                    <div className="metadata-header-actions">
                        {suggestions ? (
                            <button
                                type="button"
                                className="btn-ai-autofill"
                                onClick={handleAcceptAll}
                                title="Apply all AI detected metadata fields"
                            >
                                <Sparkles size={16} />
                                <span>Auto-Fill All with AI</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="btn-ai-extract"
                                onClick={handleExtractAI}
                                disabled={extracting}
                                title="Run AI metadata extraction from OCR text"
                            >
                                <Sparkles size={16} className={extracting ? 'spin' : ''} />
                                <span>{extracting ? 'Analyzing...' : 'Extract with AI'}</span>
                            </button>
                        )}

                        <div className="action-divider" />

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
                            <span>{saving ? 'Saving...' : saved ? 'Saved!' : 'Save Metadata'}</span>
                        </button>

                        <button
                            type="button"
                            className="btn btn-primary btn-continue-doc"
                            onClick={handleContinue}
                        >
                            <span>Continue to Archive</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Workspace Split: Reference Panel & Dublin Core Form */}
                <div className={`metadata-workspace-grid ${!showRefPane ? 'ref-hidden' : ''}`}>
                    {/* Left Column: Document Reference Panel */}
                    {showRefPane && (
                        <div className="doc-reference-pane">
                            <div className="pane-header">
                                <div className="pane-title">
                                    <FileText size={15} className="text-orange-400" />
                                    <span>Document Reference</span>
                                </div>
                                <div className="pane-controls">
                                    <a
                                        href={originalFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-open-ext"
                                        title="Open original scan in new tab"
                                    >
                                        <ExternalLink size={13} />
                                    </a>
                                    <button
                                        type="button"
                                        className="btn-toggle-pane"
                                        onClick={() => setShowRefPane(false)}
                                        title="Hide Reference Pane"
                                    >
                                        <EyeOff size={13} />
                                    </button>
                                </div>
                            </div>

                            <div className="reference-pane-body">
                                {/* Visual Scan Thumbnail */}
                                <div className="reference-thumbnail-box">
                                    {!isPdf ? (
                                        <img
                                            src={originalFileUrl}
                                            alt={filename}
                                            className="ref-scan-image"
                                        />
                                    ) : (
                                        <div className="pdf-thumbnail-placeholder">
                                            <FileText size={40} className="text-blue-400" />
                                            <span>PDF Document</span>
                                        </div>
                                    )}
                                </div>

                                {/* OCR Text Preview Snippet with quick copy */}
                                <div className="reference-text-box">
                                    <div className="text-box-header">
                                        <span className="box-label">Extracted OCR Text</span>
                                        <button
                                            type="button"
                                            className="btn-copy-snippet"
                                            onClick={handleCopyOcrText}
                                            title="Copy full OCR text"
                                        >
                                            {copiedText ? <Check size={13} /> : <Copy size={13} />}
                                            <span>{copiedText ? 'Copied' : 'Copy'}</span>
                                        </button>
                                    </div>
                                    <div className="ocr-snippet-scroll">
                                        {ocrSnippet ? (
                                            <pre>{ocrSnippet}</pre>
                                        ) : (
                                            <p className="no-ocr-msg">No OCR text available.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Right Column: Dublin Core Metadata Form */}
                    <div className="metadata-form-pane">
                        <div className="pane-header">
                            <div className="pane-title">
                                <Tag size={15} className="text-orange-400" />
                                <span>Cataloging & Archival Schema (Dublin Core)</span>
                            </div>
                            {!showRefPane && (
                                <button
                                    type="button"
                                    className="btn-show-ref"
                                    onClick={() => setShowRefPane(true)}
                                    title="Show Document Scan & OCR Reference"
                                >
                                    <Eye size={14} />
                                    <span>Show Document Reference</span>
                                </button>
                            )}
                        </div>

                        {/* AI Extraction Banner if not yet run */}
                        {!suggestions && (
                            <div className="ai-discovery-banner">
                                <div className="banner-text">
                                    <Sparkles size={18} className="text-orange-400 sparkle-pulse" />
                                    <div>
                                        <strong>Auto-Catalog with AI Extraction</strong>
                                        <p>Extract Title, Author, Year, Subject, and Keywords directly from your scanned text.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-run-extraction"
                                    onClick={handleExtractAI}
                                    disabled={extracting}
                                >
                                    <Sparkles size={14} />
                                    <span>{extracting ? 'Analyzing Document...' : 'Run Auto-Extraction'}</span>
                                </button>
                            </div>
                        )}

                        <div className="metadata-form-body">
                            {/* Title Field */}
                            <div className="form-group-card">
                                <div className="field-label-row">
                                    <label className="form-label required" htmlFor="title">
                                        <FileText size={15} />
                                        <span>Document Title</span>
                                    </label>
                                    {suggestions?.suggested_title && suggestions.suggested_title !== formData.title && (
                                        <button
                                            type="button"
                                            className="suggestion-chip"
                                            onClick={() => handleApplySuggestion('title', suggestions.suggested_title)}
                                            title="Click to apply AI suggested title"
                                        >
                                            <Sparkles size={12} />
                                            <span>Suggested: "{suggestions.suggested_title}"</span>
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    className={`form-input modern-input ${errors.title ? 'has-error' : ''}`}
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="e.g., Aadhaar Identification Card (Backside)"
                                    autoFocus
                                />
                                {errors.title ? (
                                    <span className="field-error-msg">{errors.title}</span>
                                ) : (
                                    <div className="quick-chip-row">
                                        <span className="chip-label">Quick fill:</span>
                                        <button
                                            type="button"
                                            className="chip-btn"
                                            onClick={() => handleApplySuggestion('title', filename.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' '))}
                                        >
                                            Use Filename
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Author & Year Row */}
                            <div className="form-grid-2col">
                                {/* Author */}
                                <div className="form-group-card">
                                    <div className="field-label-row">
                                        <label className="form-label" htmlFor="author">
                                            <User size={15} />
                                            <span>Author / Creator / Issuer</span>
                                        </label>
                                        {suggestions?.suggested_author && suggestions.suggested_author !== formData.author && (
                                            <button
                                                type="button"
                                                className="suggestion-chip"
                                                onClick={() => handleApplySuggestion('author', suggestions.suggested_author)}
                                                title="Click to apply AI suggested author"
                                            >
                                                <Sparkles size={12} />
                                                <span>Apply: "{suggestions.suggested_author}"</span>
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        id="author"
                                        name="author"
                                        className="form-input modern-input"
                                        value={formData.author}
                                        onChange={handleChange}
                                        placeholder="e.g., UIDAI, Government of India"
                                    />
                                </div>

                                {/* Year */}
                                <div className="form-group-card">
                                    <div className="field-label-row">
                                        <label className="form-label" htmlFor="year">
                                            <Calendar size={15} />
                                            <span>Publication / Issue Year</span>
                                        </label>
                                        {suggestions?.suggested_year && String(suggestions.suggested_year) !== formData.year && (
                                            <button
                                                type="button"
                                                className="suggestion-chip"
                                                onClick={() => handleApplySuggestion('year', String(suggestions.suggested_year))}
                                            >
                                                <Sparkles size={12} />
                                                <span>Apply: {suggestions.suggested_year}</span>
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        id="year"
                                        name="year"
                                        className={`form-input modern-input ${errors.year ? 'has-error' : ''}`}
                                        value={formData.year}
                                        onChange={handleChange}
                                        placeholder="YYYY (e.g. 2024)"
                                        maxLength="4"
                                    />
                                    {errors.year ? (
                                        <span className="field-error-msg">{errors.year}</span>
                                    ) : (
                                        <div className="quick-chip-row">
                                            <span className="chip-label">Presets:</span>
                                            <button
                                                type="button"
                                                className="chip-btn"
                                                onClick={() => handleApplySuggestion('year', String(new Date().getFullYear()))}
                                            >
                                                {new Date().getFullYear()}
                                            </button>
                                            <button
                                                type="button"
                                                className="chip-btn"
                                                onClick={() => handleApplySuggestion('year', '2024')}
                                            >
                                                2024
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Subject & Category */}
                            <div className="form-group-card">
                                <div className="field-label-row">
                                    <label className="form-label" htmlFor="subject">
                                        <Folder size={15} />
                                        <span>Subject Classification / Archival Category</span>
                                    </label>
                                    {suggestions?.suggested_subject && suggestions.suggested_subject !== formData.subject && (
                                        <button
                                            type="button"
                                            className="suggestion-chip"
                                            onClick={() => handleApplySuggestion('subject', suggestions.suggested_subject)}
                                        >
                                            <Sparkles size={12} />
                                            <span>Suggested: {suggestions.suggested_subject}</span>
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    id="subject"
                                    name="subject"
                                    className="form-input modern-input"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    placeholder="Enter or click preset category below"
                                />
                                <div className="subject-presets-wrapper">
                                    <span className="chip-label">Common categories:</span>
                                    <div className="preset-chips-list">
                                        {SUBJECT_PRESETS.map(preset => (
                                            <button
                                                key={preset}
                                                type="button"
                                                className={`preset-category-pill ${formData.subject === preset ? 'active-pill' : ''}`}
                                                onClick={() => handleApplySuggestion('subject', preset)}
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Keywords (Interactive Tag Pills) */}
                            <div className="form-group-card">
                                <div className="field-label-row">
                                    <label className="form-label" htmlFor="keywords">
                                        <Tag size={15} />
                                        <span>Search Keywords & Indexing Tags</span>
                                    </label>
                                    <span className="field-subtext">Press Enter or comma to add tags</span>
                                </div>

                                <div className="interactive-tags-container">
                                    <div className="tags-flex-wrap">
                                        {currentTags.map(tag => (
                                            <span key={tag} className="active-tag-chip">
                                                <span>{tag}</span>
                                                <button
                                                    type="button"
                                                    className="btn-remove-tag"
                                                    onClick={() => handleRemoveTag(tag)}
                                                    title={`Remove ${tag}`}
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                        <input
                                            type="text"
                                            id="keywords"
                                            className="tag-inline-input"
                                            value={keywordInput}
                                            onChange={(e) => setKeywordInput(e.target.value)}
                                            onKeyDown={handleTagKeyDown}
                                            placeholder={currentTags.length === 0 ? "Type keyword and press Enter..." : "Add another..."}
                                        />
                                    </div>
                                </div>

                                {/* Clickable AI Keywords Suggestions */}
                                {aiKeywords.length > 0 && (
                                    <div className="suggested-tags-wrapper">
                                        <span className="chip-label">AI suggested tags (click to add):</span>
                                        <div className="suggested-tags-list">
                                            {aiKeywords.map(k => {
                                                const isAdded = currentTags.includes(k)
                                                return (
                                                    <button
                                                        key={k}
                                                        type="button"
                                                        className={`ai-tag-chip ${isAdded ? 'is-added' : ''}`}
                                                        onClick={() => isAdded ? handleRemoveTag(k) : handleAddTag(k)}
                                                        disabled={isAdded}
                                                    >
                                                        {isAdded && <Check size={11} />}
                                                        <span>{k}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Live Archival Preservation Tree Preview */}
                            <div className="archive-visual-preview-card">
                                <div className="preview-card-header">
                                    <div className="preview-title-box">
                                        <Folder size={15} className="text-orange-400" />
                                        <span>Real-Time Archival Destination Preview</span>
                                    </div>
                                    <span className="offline-badge">OFFLINE PRESERVATION</span>
                                </div>

                                <div className="directory-tree-visual">
                                    <div className="tree-node root-node">
                                        <span className="node-icon">📁</span>
                                        <span className="node-name">/Archive</span>
                                    </div>
                                    <div className="tree-node branch-node">
                                        <span className="tree-connector">└──</span>
                                        <span className="node-icon">📂</span>
                                        <span className="node-highlight subject-highlight">{subjectFolder}</span>
                                        <span className="node-desc">(Subject folder)</span>
                                    </div>
                                    <div className="tree-node branch-node level-2">
                                        <span className="tree-connector">└──</span>
                                        <span className="node-icon">📂</span>
                                        <span className="node-highlight year-highlight">{yearFolder}</span>
                                        <span className="node-desc">(Year folder)</span>
                                    </div>
                                    <div className="tree-node leaf-node">
                                        <span className="tree-connector">└──</span>
                                        <span className="node-icon">📄</span>
                                        <span className="node-highlight file-highlight">{fileBaseName}</span>
                                        <span className="bagit-pill">PDF/A-1b</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cancel Project Confirmation Modal */}
            <Modal
                isOpen={showCancelDialog}
                title="Cancel Project?"
                onClose={() => setShowCancelDialog(false)}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setShowCancelDialog(false)}>Keep Working</button>
                        <button className="btn btn-danger" onClick={confirmCancel}>
                            <X size={18} style={{ marginRight: '6px' }} /> Yes, Cancel Project
                        </button>
                    </>
                }
            >
                <p>Are you sure you want to cancel this project? This will delete the uploaded file and all associated metadata. This action cannot be undone.</p>
            </Modal>
        </div>
    )
}

export default Metadata
