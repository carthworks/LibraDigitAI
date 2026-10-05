import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProject } from '../context/ProjectContext'
import { Archive as ArchiveIcon, AlertCircle, CheckCircle, Home, FileDown, ShieldCheck, ShieldAlert } from 'lucide-react'
import { API_URL } from '../config'
import WorkflowTracker from '../components/WorkflowTracker'

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

    const formatBytes = (bytes) => {
        if (!bytes) return 'N/A'
        const units = ['B', 'KB', 'MB', 'GB']
        const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
        return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`
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
                                    <span className="folder-icon">📁</span>
                                    <span>
                                        {metadata.author ? `${sanitizeFilename(metadata.author)}_` : ''}
                                        {metadata.year ? `${sanitizeFilename(metadata.year)}_` : ''}
                                        {sanitizeFilename(metadata.title) || 'Title'}/
                                    </span>
                                </div>
                                <div className="folder-item indent-4">
                                    <span className="folder-icon">📁</span>
                                    <span>data/</span>
                                </div>
                                <div className="folder-item indent-5">
                                    <span className="file-icon">📄</span>
                                    <span>
                                        {metadata.author ? `${sanitizeFilename(metadata.author)}_` : ''}
                                        {metadata.year ? `${sanitizeFilename(metadata.year)}_` : ''}
                                        {sanitizeFilename(metadata.title) || 'Title'}.pdf <em className="text-secondary">(PDF/A-2b where possible)</em>
                                    </span>
                                </div>
                                {['dublin-core.xml', 'bag-info.txt', 'bagit.txt', 'manifest-sha256.txt', 'tagmanifest-sha256.txt'].map(name => (
                                    <div className="folder-item indent-4" key={name}>
                                        <span className="file-icon">📄</span>
                                        <span>{name}</span>
                                    </div>
                                ))}
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
                                <span className="info-value">{formatBytes(archiveResult.file_size)}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Format:</span>
                                {archiveResult.pdfa?.pdfa ? (
                                    <span className="badge badge-success archive-format-badge">
                                        <ShieldCheck size={14} /> {archiveResult.pdfa.conformance}
                                    </span>
                                ) : (
                                    <span className="badge badge-warning archive-format-badge">
                                        <ShieldAlert size={14} /> {archiveResult.pdfa?.conformance || 'PDF'} (not PDF/A)
                                    </span>
                                )}
                            </div>
                            {archiveResult.pdfa && !archiveResult.pdfa.pdfa && archiveResult.pdfa.issues?.length > 0 && (
                                <ul className="archive-pdfa-issues">
                                    {archiveResult.pdfa.issues.map(issue => <li key={issue}>{issue}</li>)}
                                </ul>
                            )}
                            <div className="info-item">
                                <span className="info-label">Status:</span>
                                <span className="badge badge-accent">Archived</span>
                            </div>
                        </div>

                        <div className="archive-actions">
                            <a
                                className="btn btn-secondary btn-lg"
                                href={`${API_URL}/projects/${projectId}/dublin-core`}
                                download
                            >
                                <FileDown size={20} />
                                Dublin Core XML
                            </a>
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
