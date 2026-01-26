import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { X, Save, CheckSquare, Square, Edit3, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import './BulkMetadataEditor.css'

const API_URL = 'http://localhost:5000/api'

const BulkMetadataEditor = ({ projects, onClose, onSaveComplete }) => {
    // State for selected projects (subset of passed projects)
    const [selectedIds, setSelectedIds] = useState([])

    // State for common form fields
    const [formData, setFormData] = useState({
        title_prefix: '',
        title_suffix: '',
        author: '',
        year: '',
        subject: 'General',
        keywords: ''
    })

    // State to track which fields to apply
    const [applyFields, setApplyFields] = useState({
        title_prefix: false,
        title_suffix: false,
        author: false,
        year: false,
        subject: false,
        keywords: false
    })

    const [processing, setProcessing] = useState(false)
    const [error, setError] = useState(null)
    const [successMsg, setSuccessMsg] = useState(null)

    // Select all projects on mount
    useEffect(() => {
        if (projects && projects.length > 0) {
            setSelectedIds(projects.map(p => p.id))
        }
    }, [projects])

    // Handle project selection toggle
    const toggleProjectSelection = (projectId) => {
        setSelectedIds(prev => {
            if (prev.includes(projectId)) {
                return prev.filter(id => id !== projectId)
            } else {
                return [...prev, projectId]
            }
        })
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === projects.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(projects.map(p => p.id))
        }
    }

    // Handle form changes
    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))

        // Auto-enable the "apply" checkbox when user types
        if (value && !applyFields[name]) {
            setApplyFields(prev => ({ ...prev, [name]: true }))
        }
    }

    const handleCheckboxChange = (name) => {
        setApplyFields(prev => ({ ...prev, [name]: !prev[name] }))
    }

    // Preview logic: Returns what the title would allow like
    const getPreviewTitle = (originalTitle, prefix, suffix) => {
        let newTitle = originalTitle || 'Untitled'
        if ((applyFields.title_prefix && prefix) || (applyFields.title_suffix && suffix)) {
            return `${prefix || ''}${newTitle}${suffix || ''}`
        }
        return newTitle
    }

    const handleSave = async () => {
        if (selectedIds.length === 0) {
            setError('Please select at least one project to update.')
            return
        }

        const fieldsToUpdate = Object.keys(applyFields).filter(key => applyFields[key])
        if (fieldsToUpdate.length === 0) {
            setError('Please select at least one field to apply.')
            return
        }

        setProcessing(true)
        setError(null)
        setSuccessMsg(null)

        try {
            // Prepare payload
            const payload = {
                project_ids: selectedIds,
                metadata: {
                    author: applyFields.author ? formData.author : undefined,
                    year: applyFields.year ? formData.year : undefined,
                    subject: applyFields.subject ? formData.subject : undefined,
                    keywords: applyFields.keywords ? formData.keywords : undefined
                },
                title_modifications: {
                    prefix: applyFields.title_prefix ? formData.title_prefix : undefined,
                    suffix: applyFields.title_suffix ? formData.title_suffix : undefined
                }
            }

            const response = await axios.post(`${API_URL}/batch/bulk-metadata`, payload)

            if (response.data.success) {
                setSuccessMsg(`Successfully updated ${response.data.updated_count} projects!`)
                setTimeout(() => {
                    onSaveComplete() // Callback to refresh parent
                    onClose()
                }, 1500)
            }
        } catch (err) {
            console.error(err)
            setError(err.response?.data?.error || 'Failed to update metadata. Please try again.')
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="bulk-editor-overlay">
            <div className="bulk-editor-modal">
                {/* Header */}
                <div className="bulk-editor-header">
                    <h2>
                        <Edit3 size={24} />
                        Bulk Metadata Editor
                        <span className="selection-count">
                            {selectedIds.length} Selected
                        </span>
                    </h2>
                    <button className="btn-icon" onClick={onClose} title="Close">
                        <X size={24} />
                    </button>
                </div>

                <div className="bulk-editor-content">
                    {/* Left Pane: Editor Form */}
                    <div className="editor-form-pane">
                        <div className="form-section">
                            <h3>Metadata Fields</h3>
                            <p className="text-sm text-secondary mb-md">
                                Check the box next to a field to apply it to all selected projects.
                            </p>

                            {/* Title Modification */}
                            <div className="field-group">
                                <div className="field-header">
                                    <label className="field-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={applyFields.title_prefix}
                                            onChange={() => handleCheckboxChange('title_prefix')}
                                        />
                                        Add Title Prefix
                                    </label>
                                    {applyFields.title_prefix && <span className="apply-badge">Applying</span>}
                                </div>
                                <input
                                    type="text"
                                    name="title_prefix"
                                    className="form-input"
                                    placeholder="e.g. [ Confidential ] "
                                    value={formData.title_prefix}
                                    onChange={handleInputChange}
                                    disabled={!applyFields.title_prefix}
                                />
                            </div>

                            <div className="field-group">
                                <div className="field-header">
                                    <label className="field-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={applyFields.title_suffix}
                                            onChange={() => handleCheckboxChange('title_suffix')}
                                        />
                                        Add Title Suffix
                                    </label>
                                    {applyFields.title_suffix && <span className="apply-badge">Applying</span>}
                                </div>
                                <input
                                    type="text"
                                    name="title_suffix"
                                    className="form-input"
                                    placeholder="e.g. - Draft Version"
                                    value={formData.title_suffix}
                                    onChange={handleInputChange}
                                    disabled={!applyFields.title_suffix}
                                />
                            </div>

                            {/* Author */}
                            <div className="field-group">
                                <div className="field-header">
                                    <label className="field-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={applyFields.author}
                                            onChange={() => handleCheckboxChange('author')}
                                        />
                                        Set Author
                                    </label>
                                    {applyFields.author && <span className="apply-badge">Applying</span>}
                                </div>
                                <input
                                    type="text"
                                    name="author"
                                    className="form-input"
                                    placeholder="Author Name"
                                    value={formData.author}
                                    onChange={handleInputChange}
                                    disabled={!applyFields.author}
                                />
                            </div>

                            {/* Year */}
                            <div className="field-group">
                                <div className="field-header">
                                    <label className="field-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={applyFields.year}
                                            onChange={() => handleCheckboxChange('year')}
                                        />
                                        Set Year
                                    </label>
                                    {applyFields.year && <span className="apply-badge">Applying</span>}
                                </div>
                                <input
                                    type="text"
                                    name="year"
                                    className="form-input"
                                    placeholder="YYYY"
                                    value={formData.year}
                                    onChange={handleInputChange}
                                    disabled={!applyFields.year}
                                />
                            </div>

                            {/* Subject */}
                            <div className="field-group">
                                <div className="field-header">
                                    <label className="field-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={applyFields.subject}
                                            onChange={() => handleCheckboxChange('subject')}
                                        />
                                        Set Subject
                                    </label>
                                    {applyFields.subject && <span className="apply-badge">Applying</span>}
                                </div>
                                <select
                                    name="subject"
                                    className="form-select"
                                    value={formData.subject}
                                    onChange={handleInputChange}
                                    disabled={!applyFields.subject}
                                >
                                    <option value="General">General</option>
                                    <option value="Science">Science</option>
                                    <option value="Technology">Technology</option>
                                    <option value="History">History</option>
                                    <option value="Literature">Literature</option>
                                    <option value="Medicine">Medicine</option>
                                    <option value="Law">Law</option>
                                    <option value="Business">Business</option>
                                    <option value="Arts">Arts</option>
                                </select>
                            </div>

                            {/* Keywords */}
                            <div className="field-group">
                                <div className="field-header">
                                    <label className="field-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={applyFields.keywords}
                                            onChange={() => handleCheckboxChange('keywords')}
                                        />
                                        Set Keywords
                                    </label>
                                    {applyFields.keywords && <span className="apply-badge">Applying</span>}
                                </div>
                                <textarea
                                    name="keywords"
                                    className="form-textarea"
                                    placeholder="Comma separated keywords"
                                    value={formData.keywords}
                                    onChange={handleInputChange}
                                    disabled={!applyFields.keywords}
                                    style={{ minHeight: '80px' }}
                                />
                            </div>

                        </div>
                    </div>

                    {/* Right Pane: Project Preview */}
                    <div className="projects-preview-pane">
                        <div className="preview-header">
                            <h3>Attributes Updates Preview</h3>
                            <button className="btn btn-ghost btn-sm" onClick={toggleSelectAll}>
                                {selectedIds.length === projects.length ? (
                                    <><CheckSquare size={16} /> Deselect All</>
                                ) : (
                                    <><Square size={16} /> Select All</>
                                )}
                            </button>
                        </div>

                        {/* Error & Success Messages */}
                        {error && (
                            <div className="alert alert-error mb-lg">
                                <AlertTriangle size={20} />
                                <span>{error}</span>
                            </div>
                        )}
                        {successMsg && (
                            <div className="alert alert-success mb-lg">
                                <CheckCircle size={20} />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        <div className="preview-grid">
                            {projects.map(project => {
                                const isSelected = selectedIds.includes(project.id)
                                return (
                                    <div
                                        key={project.id}
                                        className={`preview-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => toggleProjectSelection(project.id)}
                                    >
                                        <div className="card-top">
                                            <div className="file-icon-wrapper">
                                                <Info size={20} />
                                            </div>
                                            <div className="file-details">
                                                <span className="file-name" title={project.filename}>
                                                    {project.filename}
                                                </span>
                                                <span className="file-meta">
                                                    ID: {project.id} • {new Date(project.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="metadata-preview">
                                            {/* Title Preview */}
                                            <div className="meta-row">
                                                <span className="meta-label">Title:</span>
                                                <span className={`meta-value ${(applyFields.title_prefix || applyFields.title_suffix) && isSelected ? 'modified' : ''}`}>
                                                    {isSelected
                                                        ? getPreviewTitle(project.title || project.filename, formData.title_prefix, formData.title_suffix)
                                                        : (project.title || project.filename)
                                                    }
                                                </span>
                                            </div>

                                            {/* Author Preview */}
                                            <div className="meta-row">
                                                <span className="meta-label">Author:</span>
                                                <span className={`meta-value ${applyFields.author && isSelected ? 'modified' : ''}`}>
                                                    {isSelected && applyFields.author ? formData.author : (project.author || '-')}
                                                </span>
                                            </div>

                                            {/* Modified Indicator */}
                                            {isSelected && Object.values(applyFields).some(Boolean) && (
                                                <div className="mt-sm text-center" style={{ fontSize: '0.8rem', color: 'var(--color-accent)' }}>
                                                    Will be updated
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bulk-editor-footer">
                    <div className="footer-info">
                        Updating {selectedIds.length} projects
                    </div>
                    <div className="footer-actions">
                        <button className="btn btn-secondary" onClick={onClose} disabled={processing}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={processing}>
                            {processing ? (
                                <>Processing...</>
                            ) : (
                                <><Save size={16} /> Apply Changes</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default BulkMetadataEditor
