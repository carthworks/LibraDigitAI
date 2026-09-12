import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Upload, Play, Pause, X, CheckCircle, AlertCircle, Loader, FileText, Image as ImageIcon, Trash2, Clock, Calendar, Edit3 } from 'lucide-react'
import { API_URL } from '../config'
import './BatchProcessing.css'
import BulkMetadataEditor from '../components/BulkMetadataEditor'

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
                        fetchBatchProjects(batchStatus?.items)
                    }}
                />
            )}

            {/* Hero Header */}
            <div className="batch-hero-banner">
                <div className="batch-hero-left">
                    <div className="hero-status-pill">
                        <Clock size={14} className="icon-sapphire" />
                        <span>High-Throughput Parallel OCR Pipeline</span>
                    </div>
                    <h1>Batch Ingestion & Processing Hub</h1>
                    <p>Stage, queue, and process bulk archival manuscripts and multi-page PDFs simultaneously with dual-engine OCR and auto-metadata indexing.</p>
                </div>
                <div className="batch-hero-stats">
                    <div className="stat-pill-badge">
                        <Clock size={15} />
                        <span>Avg. Speed: ~3s / page</span>
                    </div>
                </div>
            </div>

            {/* Main Stage & Dropzone Workspace */}
            <div className={`batch-workspace-deck ${selectedFiles.length > 0 ? 'has-staged-files' : ''}`}>
                {/* Upload & Drop Card */}
                <div className="batch-drop-card">
                    <div
                        className={`batch-drop-zone ${dragActive ? 'drag-active' : ''}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <div className="drop-icon-circle">
                            <Upload size={28} />
                        </div>
                        <h3>Drag & Drop Archival Documents</h3>
                        <p>Supports multi-page PDFs and High-Res Images (PNG, JPG, TIFF, BMP)</p>
                        <label className="btn-browse-action">
                            <Upload size={16} />
                            <span>Browse Computer</span>
                            <input
                                type="file"
                                multiple
                                accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
                                onChange={handleFileInput}
                                className="hidden-file-input"
                            />
                        </label>
                    </div>
                </div>

                {/* Staged Files Queue Panel */}
                {selectedFiles.length > 0 && (
                    <div className="staged-files-panel fade-in">
                        <div className="staged-header">
                            <div>
                                <h3>Staging Queue</h3>
                                <span className="staged-count">{selectedFiles.length} files selected</span>
                            </div>
                            <button className="btn-clear-staged" onClick={() => setSelectedFiles([])}>
                                Clear All
                            </button>
                        </div>

                        <div className="staged-items-scroll">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="staged-item-row">
                                    <div className="item-left">
                                        {getFileIcon(file.name)}
                                        <div className="item-text">
                                            <span className="item-name" title={file.name}>{file.name}</span>
                                            <span className="item-size">{formatFileSize(file.size)}</span>
                                        </div>
                                    </div>
                                    <button className="btn-remove-item" onClick={() => removeFile(index)} title="Remove file">
                                        <X size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="batch-launch-footer">
                            <input
                                type="text"
                                placeholder="Batch label / accession title (Optional)"
                                value={batchName}
                                onChange={(e) => setBatchName(e.target.value)}
                                className="batch-input-field"
                            />
                            <button
                                className="btn-start-batch"
                                onClick={handleUploadAndProcess}
                                disabled={uploading}
                            >
                                {uploading ? <Loader size={18} className="spin" /> : <Play size={18} />}
                                <span>{uploading ? 'Ingesting Batch...' : 'Start Batch Execution'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Live Progress Card */}
            {batchStatus && (
                <div className="batch-status-panel fade-in">
                    <div className="status-panel-header">
                        <div className="status-title-group">
                            <h3>{batchStatus.name}</h3>
                            <span className={`status-badge ${batchStatus.status}`}>
                                {batchStatus.status.replace('_', ' ')}
                            </span>
                        </div>
                        <div className="status-actions-group">
                            {params_has_completed_successfully(batchStatus.status) && (
                                <button
                                    className="btn-bulk-edit"
                                    onClick={() => setShowBulkEditor(true)}
                                    title="Edit metadata for all files in this batch"
                                >
                                    <Edit3 size={15} />
                                    <span>Bulk Edit Metadata</span>
                                </button>
                            )}

                            {batchStatus.status === 'processing' && (
                                <button className="btn-cancel-batch" onClick={() => cancelBatch(currentBatch)}>
                                    <X size={14} /> Cancel Pipeline
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="batch-progress-meter">
                        <div className="meter-info-row">
                            <span>Processing Pipeline</span>
                            <span>{batchStatus.progress_percent || 0}% Complete</span>
                        </div>
                        <div className="meter-track">
                            <div
                                className={`meter-fill ${batchStatus.status}`}
                                style={{ width: `${batchStatus.progress_percent || 0}%` }}
                            />
                        </div>
                    </div>

                    <div className="status-metrics-row">
                        <div className="metric-pill">
                            <span className="metric-lbl">Total Documents</span>
                            <span className="metric-val">{batchStatus.processed_files} / {batchStatus.total_files}</span>
                        </div>
                        <div className="metric-pill success">
                            <CheckCircle size={15} />
                            <span>{batchStatus.status_counts?.completed || 0} Successful</span>
                        </div>
                        <div className="metric-pill error">
                            <AlertCircle size={15} />
                            <span>{batchStatus.status_counts?.failed || 0} Failed</span>
                        </div>
                    </div>

                    <div className="batch-items-grid">
                        {batchStatus.items?.map((item, index) => (
                            <div key={index} className={`batch-mini-card ${item.status}`}>
                                <div className="mini-icon">{getStatusIcon(item.status)}</div>
                                <div className="mini-info">
                                    <span className="mini-name" title={item.filename}>{item.filename}</span>
                                    {item.error_message && <span className="mini-error">{item.error_message}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Batches History */}
            <div className="recent-batches-card">
                <div className="recent-batches-header">
                    <h3>Recent Batch Runs</h3>
                    <p>Historical log of multi-document ingestion jobs.</p>
                </div>
                <div className="recent-batches-grid">
                    {recentBatches.length === 0 ? (
                        <div className="empty-batches-state">
                            <Clock size={40} className="empty-icon" />
                            <p>No recent batch executions recorded.</p>
                        </div>
                    ) : (
                        recentBatches.map(batch => (
                            <div key={batch.id} className="history-batch-item">
                                <div className="history-icon-box">
                                    {getStatusIcon(batch.status)}
                                </div>
                                <div className="history-text-col">
                                    <h4>{batch.name}</h4>
                                    <div className="history-meta-sub">
                                        <span>{batch.total_files} Documents</span>
                                        <span className="sep">•</span>
                                        <span>{new Date(batch.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="history-actions-col">
                                    <button
                                        className="btn-history-action"
                                        onClick={() => { setCurrentBatch(batch.id); fetchBatchStatus(batch.id); }}
                                        title="View Details"
                                    >
                                        <FileText size={16} />
                                    </button>
                                    <button
                                        className="btn-history-action danger"
                                        onClick={() => deleteBatch(batch.id)}
                                        title="Delete Log"
                                    >
                                        <Trash2 size={16} />
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
