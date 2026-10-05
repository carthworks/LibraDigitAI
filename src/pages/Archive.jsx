import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { Archive as ArchiveIcon, AlertCircle, CheckCircle, Home } from 'lucide-react'
import WorkflowTracker from '../components/WorkflowTracker'
import './Archive.css'

const Archive = () => {
    const { projectId } = useParams()
    const navigate = useNavigate()
    const { getProject, generateArchive, currentProject, loading, error } = useProject()

    const [generating, setGenerating] = useState(false)
    const [archiveResult, setArchiveResult] = useState(null)

    useEffect(() => {
        if (projectId) {
            loadProject()
        }
    }, [projectId])

    const loadProject = async () => {
        try {
            await getProject(projectId)
        } catch (err) {
            console.error('Failed to load project:', err)
        }
    }

    const handleGenerateArchive = async () => {
        try {
            setGenerating(true)
            const result = await generateArchive(projectId)
            setArchiveResult(result)
        } catch (err) {
            alert('Failed to generate archive')
        } finally {
            setGenerating(false)
        }
    }

    // Sanitize filename - remove special characters and spaces
    const sanitizeFilename = (text) => {
        if (!text) return ''
        let sanitized = text.replace(/\s+/g, '_')
        sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '')
        sanitized = sanitized.replace(/_+/g, '_')
        sanitized = sanitized.replace(/^_+|_+$/g, '')
        return sanitized
    }

    if (loading && !currentProject) {
        return (
            <div className="archive-loading">
                <div className="spinner"></div>
                <p>Loading project...</p>
            </div>
        )
    }

    const metadata = currentProject?.metadata || {}

    return (
        <div className="archive-page">
            {currentProject && (
                <WorkflowTracker currentStep={5} projectStatus={currentProject.status} />
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

            <div className="archive-container">
                {!archiveResult ? (
                    <>
                        <div className="archive-header">
                            <div>
                                <h2>Generate Archive</h2>
                                <p className="text-secondary">
                                    Create a structured digital archive with your processed document
                                </p>
                            </div>
                        </div>

                        <div className="archive-preview-card">
                            <h3>Archive Structure</h3>
                            <div className="folder-structure">
                                <div className="folder-item">
                                    <span className="folder-icon">📁</span>
                                    <span>Archive/</span>
                                </div>
                                <div className="folder-item indent-1">
                                    <span className="folder-icon">📁</span>
                                    <span>{sanitizeFilename(metadata.subject) || 'Subject'}/</span>
                                </div>
                                <div className="folder-item indent-2">
                                    <span className="folder-icon">📁</span>
                                    <span>{sanitizeFilename(metadata.year) || 'Year'}/</span>
                                </div>
                                <div className="folder-item indent-3">
                                    <span className="file-icon">📄</span>
                                    <span>
                                        {metadata.author ? `${sanitizeFilename(metadata.author)}_` : ''}
                                        {metadata.year ? `${sanitizeFilename(metadata.year)}_` : ''}
                                        {sanitizeFilename(metadata.title) || 'Title'}.pdf
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="archive-metadata-card">
                            <h3>Document Metadata</h3>
                            <div className="metadata-grid">
                                <div className="metadata-item">
                                    <span className="metadata-label">Title</span>
                                    <span className="metadata-value">{metadata.title || 'Not set'}</span>
                                </div>
                                <div className="metadata-item">
                                    <span className="metadata-label">Author</span>
                                    <span className="metadata-value">{metadata.author || 'Not set'}</span>
                                </div>
                                <div className="metadata-item">
                                    <span className="metadata-label">Year</span>
                                    <span className="metadata-value">{metadata.year || 'Not set'}</span>
                                </div>
                                <div className="metadata-item">
                                    <span className="metadata-label">Subject</span>
                                    <span className="metadata-value">{metadata.subject || 'Not set'}</span>
                                </div>
                                <div className="metadata-item full-width">
                                    <span className="metadata-label">Keywords</span>
                                    <span className="metadata-value">{metadata.keywords || 'Not set'}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-lg w-full"
                            onClick={handleGenerateArchive}
                            disabled={generating}
                        >
                            {generating ? (
                                <>
                                    <div className="spinner spinner-sm"></div>
                                    Generating Archive...
                                </>
                            ) : (
                                <>
                                    <ArchiveIcon size={20} />
                                    Generate Archive File
                                </>
                            )}
                        </button>
                    </>
                ) : (
                    <div className="archive-success">
                        <CheckCircle size={64} className="success-icon" />
                        <h2>Archive Generated Successfully!</h2>
                        <p>Your document has been processed and archived</p>

                        <div className="archive-info-card">
                            <h3>Archive Details</h3>
                            <div className="info-item">
                                <span className="info-label">File Path:</span>
                                <code className="info-value">{archiveResult.archive_path}</code>
                            </div>
                            <div className="info-item">
                                <span className="info-label">File Size:</span>
                                <span className="info-value">{archiveResult.file_size || 'N/A'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Status:</span>
                                <span className="badge badge-accent">Archived</span>
                            </div>
                        </div>

                        <div className="archive-actions">
                            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/')}>
                                <Home size={20} />
                                Back to Dashboard
                            </button>
                            <button className="btn btn-primary btn-lg" onClick={() => navigate('/upload')}>
                                <ArchiveIcon size={20} />
                                Start New Project
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default Archive
