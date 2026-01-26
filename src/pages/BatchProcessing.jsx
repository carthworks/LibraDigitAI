import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Upload, Play, Pause, X, CheckCircle, AlertCircle, Loader, FileText, Image as ImageIcon, Trash2, Clock, Calendar, Edit3 } from 'lucide-react'
import './BatchProcessing.css'
import BulkMetadataEditor from '../components/BulkMetadataEditor'

const API_URL = 'http://localhost:5000/api'

function BatchProcessing() {
    const navigate = useNavigate()
    const [selectedFiles, setSelectedFiles] = useState([])
    const [batchName, setBatchName] = useState('')
    const [uploading, setUploading] = useState(false)
    const [currentBatch, setCurrentBatch] = useState(null)
    const [batchStatus, setBatchStatus] = useState(null)
    const [batchProjects, setBatchProjects] = useState([]) // Stores project details for the active batch
    const [recentBatches, setRecentBatches] = useState([])
    const [dragActive, setDragActive] = useState(false)
    const [showBulkEditor, setShowBulkEditor] = useState(false)

    useEffect(() => {
        loadRecentBatches()
    }, [])

    useEffect(() => {
        if (currentBatch && batchStatus?.status === 'processing') {
            const interval = setInterval(() => {
                fetchBatchStatus(currentBatch)
            }, 2000)
            return () => clearInterval(interval)
        }
    }, [currentBatch, batchStatus])

    // Load project details when looking at a completed batch
    useEffect(() => {
        if (batchStatus && params_has_completed_successfully(batchStatus.status)) {
            fetchBatchProjects(batchStatus.items)
        }
    }, [batchStatus])

    const params_has_completed_successfully = (status) => {
        return status === 'completed' || status === 'completed_with_errors'
    }

    const loadRecentBatches = async () => {
        try {
            const response = await axios.get(`${API_URL}/batch/list?limit=10`)
            setRecentBatches(response.data.batches || [])
        } catch (error) {
            console.error('Error loading batches:', error)
        }
    }

    const fetchBatchProjects = async (items) => {
        if (!items) return
        // In a real app we might want a dedicated endpoint to get all projects for a batch
        // For now, we will construct project objects from the items or fetch them if needed. 
        // Our Batch Item has project_id.
        // Let's assume we want to pass full project objects to the Bulk Editor.
        // We can fetch them individually or create a new endpoint. 
        // For efficiency, let's just create minimal objects if we can, or fetch them all.

        // Let's just pass the items knowing they have project_id and filename for now, 
        // or actually fetch them to show current metadata.

        try {
            const projectIds = items.map(i => i.project_id)
            if (projectIds.length === 0) return

            // We don't have a bulk-get-projects endpoint yet, so we'll just map the items
            // to a structure the editor accepts. The editor needs id, filename, created_at
            // and maybe current metadata (title, author etc) for preview. 
            // Since we didn't add a bulk-get endpoint, the preview might show "Loading..." or we skip deep preview.

            // To make it fully functional, let's fetch basic details. 
            // Actually, let's iterate and fetch - it's okay for < 50 items.

            const promises = projectIds.map(id => axios.get(`${API_URL}/projects/${id}`))
            const results = await Promise.all(promises)
            const projects = results.map(r => r.data.project)
            setBatchProjects(projects)

        } catch (err) {
            console.error("Failed to load project details for editor", err)
        }
    }

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
        const files = Array.from(e.dataTransfer.files)
        handleFiles(files)
    }

    const handleFileInput = (e) => {
        const files = Array.from(e.target.files)
        handleFiles(files)
    }

    const handleFiles = (files) => {
        const supportedFiles = files.filter(file => {
            const ext = file.name.toLowerCase()
            return ext.endsWith('.pdf') || ext.endsWith('.png') ||
                ext.endsWith('.jpg') || ext.endsWith('.jpeg') ||
                ext.endsWith('.tiff') || ext.endsWith('.bmp')
        })
        setSelectedFiles(prev => [...prev, ...supportedFiles])
    }

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    }

    const getFileIcon = (filename) => {
        const ext = filename.split('.').pop().toLowerCase()
        if (ext === 'pdf') return <FileText size={24} className="file-icon-pdf" />
        return <ImageIcon size={24} className="file-icon-img" />
    }

    const handleUploadAndProcess = async () => {
        if (selectedFiles.length === 0) {
            alert('Please select files to upload')
            return
        }

        setUploading(true)
        setBatchProjects([]) // Reset previous batch projects

        try {
            const formData = new FormData()
            selectedFiles.forEach(file => {
                formData.append('files', file)
            })
            formData.append('batch_name', batchName || `Batch ${new Date().toLocaleString()}`)

            const response = await axios.post(`${API_URL}/batch/create`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })

            const { batch_id } = response.data
            await axios.post(`${API_URL}/batch/${batch_id}/start`)

            setCurrentBatch(batch_id)
            setSelectedFiles([])
            setBatchName('')
            fetchBatchStatus(batch_id)

        } catch (error) {
            console.error('Error uploading batch:', error)
            alert('Error uploading files: ' + (error.response?.data?.error || error.message))
        } finally {
            setUploading(false)
        }
    }

    const fetchBatchStatus = async (batchId) => {
        try {
            const response = await axios.get(`${API_URL}/batch/${batchId}/status`)
            setBatchStatus(response.data)
            if (response.data.status === 'completed' || response.data.status === 'completed_with_errors') {
                loadRecentBatches()
            }
        } catch (error) {
            console.error('Error fetching batch status:', error)
        }
    }

    const cancelBatch = async (batchId) => {
        try {
            await axios.post(`${API_URL}/batch/${batchId}/cancel`)
            fetchBatchStatus(batchId)
        } catch (error) {
            console.error('Error cancelling batch:', error)
        }
    }

    const deleteBatch = async (batchId) => {
        if (!confirm('Delete this batch? This will not delete the processed projects.')) return
        try {
            await axios.delete(`${API_URL}/batch/${batchId}`)
            loadRecentBatches()
            if (currentBatch === batchId) {
                setCurrentBatch(null)
                setBatchStatus(null)
                setBatchProjects([])
            }
        } catch (error) {
            console.error('Error deleting batch:', error)
        }
    }

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle className="status-icon success" />
            case 'processing': return <Loader className="status-icon processing spin" />
            case 'failed':
            case 'completed_with_errors': return <AlertCircle className="status-icon error" />
            default: return <Loader className="status-icon" />
        }
    }

    return (
        <div className="batch-processing-container">
            {showBulkEditor && (
                <BulkMetadataEditor
                    projects={batchProjects}
                    onClose={() => setShowBulkEditor(false)}
                    onSaveComplete={() => {
                        // Refresh projects to show new metadata if we were displaying it
                        fetchBatchProjects(batchStatus.items)
                    }}
                />
            )}

            <div className="batch-header">
                <div className="header-content">
                    <h1>📦 Batch Manager</h1>
                    <p>Streamline your workflow by processing multiple documents simultaneously.</p>
                </div>
                <div className="header-stats">
                    <div className="stat-pill">
                        <Clock size={16} />
                        <span>Avg. Time: ~3s/page</span>
                    </div>
                </div>
            </div>

            <div className={`batch-workspace ${selectedFiles.length > 0 ? 'has-files' : ''}`}>
                {/* Upload Section */}
                <div className="upload-pane">
                    <div
                        className={`drop-zone-premium ${dragActive ? 'active' : ''}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <div className="drop-content">
                            <div className="icon-wrapper">
                                <Upload className="upload-icon-large" />
                            </div>
                            <h3>Drag & Drop Files Here</h3>
                            <p className="sub-text">PDFs, Images (PNG, JPG, TIFF)</p>
                            <label className="browse-btn">
                                Browse Files
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
                                    onChange={handleFileInput}
                                    className="hidden-input"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                    <div className="files-pane fade-in">
                        <div className="pane-header">
                            <h3>Queue ({selectedFiles.length})</h3>
                            <button className="text-btn" onClick={() => setSelectedFiles([])}>Clear All</button>
                        </div>

                        <div className="file-list-premium">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="file-row">
                                    <div className="file-icon-container">
                                        {getFileIcon(file.name)}
                                    </div>
                                    <div className="file-details">
                                        <span className="name" title={file.name}>{file.name}</span>
                                        <span className="size">{formatFileSize(file.size)}</span>
                                    </div>
                                    <button className="action-btn" onClick={() => removeFile(index)}>
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="batch-actions">
                            <input
                                type="text"
                                placeholder="Name this batch (Optional)"
                                value={batchName}
                                onChange={(e) => setBatchName(e.target.value)}
                                className="batch-name-field"
                            />
                            <button
                                className="process-btn-premium"
                                onClick={handleUploadAndProcess}
                                disabled={uploading}
                            >
                                {uploading ? <Loader size={20} className="spin" /> : <Play size={20} />}
                                {uploading ? 'Uploading...' : 'Start Batch Processing'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Live Progress */}
            {batchStatus && (
                <div className="live-status-card fade-in">
                    <div className="status-header">
                        <div className="batch-title">
                            <h3>{batchStatus.name}</h3>
                            <span className={`status-badge ${batchStatus.status}`}>
                                {batchStatus.status.replace('_', ' ')}
                            </span>
                        </div>
                        <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
                            {/* Bulk Edit Button (Visible only when completed) */}
                            {params_has_completed_successfully(batchStatus.status) && (
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => setShowBulkEditor(true)}
                                    title="Edit metadata for all files in this batch"
                                >
                                    <Edit3 size={16} /> Bulk Edit Metadata
                                </button>
                            )}

                            {batchStatus.status === 'processing' && (
                                <button className="cancel-pill" onClick={() => cancelBatch(currentBatch)}>
                                    <X size={14} /> Cancel
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="premium-progress-bar">
                        <div
                            className={`premium-progress-fill ${batchStatus.status}`}
                            style={{ width: `${batchStatus.progress_percent}%` }}
                        />
                    </div>

                    <div className="progress-metrics">
                        <div className="metric">
                            <span className="label">Progress</span>
                            <span className="value">{batchStatus.progress_percent}%</span>
                        </div>
                        <div className="metric">
                            <span className="label">Documents</span>
                            <span className="value">{batchStatus.processed_files} / {batchStatus.total_files}</span>
                        </div>
                        <div className="metric-group">
                            <span className="metric success"><CheckCircle size={14} /> {batchStatus.status_counts?.completed || 0}</span>
                            <span className="metric error"><AlertCircle size={14} /> {batchStatus.status_counts?.failed || 0}</span>
                        </div>
                    </div>

                    <div className="processed-items-grid">
                        {batchStatus.items?.map((item, index) => (
                            <div key={index} className={`mini-item-card ${item.status}`}>
                                <div className="mini-icon">{getStatusIcon(item.status)}</div>
                                <div className="mini-info">
                                    <span className="mini-name">{item.filename}</span>
                                    {item.error_message && <span className="mini-error">{item.error_message}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Batches History */}
            <div className="recent-batches-section">
                <h2>Batch History</h2>
                <div className="recent-grid">
                    {recentBatches.length === 0 ? (
                        <div className="empty-history">
                            <Clock size={48} />
                            <p>No recent batches found.</p>
                        </div>
                    ) : (
                        recentBatches.map(batch => (
                            <div key={batch.id} className="history-card">
                                <div className="history-icon">
                                    {getStatusIcon(batch.status)}
                                </div>
                                <div className="history-info">
                                    <h4>{batch.name}</h4>
                                    <div className="meta">
                                        <span>{batch.total_files} Files</span>
                                        <span>•</span>
                                        <span>{new Date(batch.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="history-actions">
                                    <button
                                        className="icon-action-btn"
                                        onClick={() => { setCurrentBatch(batch.id); fetchBatchStatus(batch.id); }}
                                        title="View Details"
                                    >
                                        <FileText size={18} />
                                    </button>
                                    <button
                                        className="icon-action-btn danger"
                                        onClick={() => deleteBatch(batch.id)}
                                        title="Delete Log"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

export default BatchProcessing
