import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Upload, Play, Pause, X, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import './BatchProcessing.css'

const API_URL = 'http://localhost:5000/api'

function BatchProcessing() {
    const navigate = useNavigate()
    const [selectedFiles, setSelectedFiles] = useState([])
    const [batchName, setBatchName] = useState('')
    const [uploading, setUploading] = useState(false)
    const [currentBatch, setCurrentBatch] = useState(null)
    const [batchStatus, setBatchStatus] = useState(null)
    const [recentBatches, setRecentBatches] = useState([])
    const [dragActive, setDragActive] = useState(false)

    useEffect(() => {
        loadRecentBatches()
    }, [])

    useEffect(() => {
        // Poll for batch status if processing
        if (currentBatch && batchStatus?.status === 'processing') {
            const interval = setInterval(() => {
                fetchBatchStatus(currentBatch)
            }, 2000) // Poll every 2 seconds

            return () => clearInterval(interval)
        }
    }, [currentBatch, batchStatus])

    const loadRecentBatches = async () => {
        try {
            const response = await axios.get(`${API_URL}/batch/list?limit=10`)
            setRecentBatches(response.data.batches || [])
        } catch (error) {
            console.error('Error loading batches:', error)
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
        // Filter for supported file types
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

    const handleUploadAndProcess = async () => {
        if (selectedFiles.length === 0) {
            alert('Please select files to upload')
            return
        }

        setUploading(true)

        try {
            // Create FormData
            const formData = new FormData()
            selectedFiles.forEach(file => {
                formData.append('files', file)
            })
            formData.append('batch_name', batchName || `Batch ${new Date().toLocaleString()}`)

            // Upload files and create batch
            const response = await axios.post(`${API_URL}/batch/create`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            const { batch_id } = response.data

            // Start processing
            await axios.post(`${API_URL}/batch/${batch_id}/start`)

            setCurrentBatch(batch_id)
            setSelectedFiles([])
            setBatchName('')

            // Start polling for status
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

            // Reload recent batches when completed
            if (response.data.status === 'completed' || response.data.status === 'completed_with_errors') {
                loadRecentBatches()
            }
        } catch (error) {
            console.error('Error fetching batch status:', error)
            console.error('Error details:', error.response?.data)
            // Show error to user
            if (error.response?.data?.error) {
                alert(`Error fetching batch status: ${error.response.data.error}`)
            }
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
        if (!confirm('Delete this batch? This will not delete the processed projects.')) {
            return
        }

        try {
            await axios.delete(`${API_URL}/batch/${batchId}`)
            loadRecentBatches()
            if (currentBatch === batchId) {
                setCurrentBatch(null)
                setBatchStatus(null)
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
            case 'completed':
                return <CheckCircle className="status-icon success" />
            case 'processing':
                return <Loader className="status-icon processing spin" />
            case 'failed':
            case 'completed_with_errors':
                return <AlertCircle className="status-icon error" />
            default:
                return <Loader className="status-icon" />
        }
    }

    return (
        <div className="batch-processing-container">
            <div className="batch-header">
                <h1>📦 Batch Processing</h1>
                <p>Upload and process multiple documents at once</p>
            </div>

            {/* Upload Section */}
            <div className="upload-section">
                <div
                    className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <Upload className="upload-icon" />
                    <h3>Drag & Drop Multiple Files</h3>
                    <p>or click to browse</p>
                    <input
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.tiff,.bmp"
                        onChange={handleFileInput}
                        className="file-input"
                    />
                    <p className="file-types">Supported: PDF, PNG, JPG, TIFF, BMP</p>
                </div>

                {selectedFiles.length > 0 && (
                    <div className="selected-files">
                        <div className="files-header">
                            <h3>Selected Files ({selectedFiles.length})</h3>
                            <button
                                className="clear-btn"
                                onClick={() => setSelectedFiles([])}
                            >
                                Clear All
                            </button>
                        </div>

                        <div className="files-list">
                            {selectedFiles.map((file, index) => (
                                <div key={index} className="file-item">
                                    <div className="file-info">
                                        <span className="file-name">{file.name}</span>
                                        <span className="file-size">{formatFileSize(file.size)}</span>
                                    </div>
                                    <button
                                        className="remove-btn"
                                        onClick={() => removeFile(index)}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="batch-controls">
                            <input
                                type="text"
                                placeholder="Batch name (optional)"
                                value={batchName}
                                onChange={(e) => setBatchName(e.target.value)}
                                className="batch-name-input"
                            />
                            <button
                                className="upload-process-btn"
                                onClick={handleUploadAndProcess}
                                disabled={uploading}
                            >
                                {uploading ? (
                                    <>
                                        <Loader className="spin" size={20} />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Play size={20} />
                                        Upload & Process All
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Current Batch Status */}
            {batchStatus && (
                <div className="batch-status-section">
                    <h2>Current Batch: {batchStatus.name}</h2>

                    <div className="progress-container">
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${batchStatus.progress_percent}%` }}
                            />
                        </div>
                        <div className="progress-text">
                            {batchStatus.processed_files} / {batchStatus.total_files} files
                            ({batchStatus.progress_percent}%)
                        </div>
                    </div>

                    <div className="status-counts">
                        <div className="status-count success">
                            <CheckCircle size={20} />
                            <span>{batchStatus.status_counts?.completed || 0} Completed</span>
                        </div>
                        <div className="status-count error">
                            <AlertCircle size={20} />
                            <span>{batchStatus.status_counts?.failed || 0} Failed</span>
                        </div>
                        <div className="status-count pending">
                            <Loader size={20} />
                            <span>{batchStatus.status_counts?.pending || 0} Pending</span>
                        </div>
                    </div>

                    {batchStatus.status === 'processing' && (
                        <button
                            className="cancel-btn"
                            onClick={() => cancelBatch(currentBatch)}
                        >
                            <X size={20} />
                            Cancel Batch
                        </button>
                    )}

                    {/* Individual Files Status */}
                    <div className="batch-items">
                        <h3>Files</h3>
                        <div className="items-list">
                            {batchStatus.items?.map((item, index) => (
                                <div key={index} className={`batch-item ${item.status}`}>
                                    {getStatusIcon(item.status)}
                                    <span className="item-filename">{item.filename}</span>
                                    {item.error_message && (
                                        <span className="item-error">{item.error_message}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Batches */}
            <div className="recent-batches">
                <h2>Recent Batches</h2>
                {recentBatches.length === 0 ? (
                    <p className="no-batches">No batches yet. Upload files to get started!</p>
                ) : (
                    <div className="batches-list">
                        {recentBatches.map(batch => (
                            <div key={batch.id} className="batch-card">
                                <div className="batch-card-header">
                                    <h3>{batch.name}</h3>
                                    {getStatusIcon(batch.status)}
                                </div>
                                <div className="batch-card-info">
                                    <span>{batch.total_files} files</span>
                                    <span>•</span>
                                    <span>{batch.processed_files} processed</span>
                                    <span>•</span>
                                    <span>{new Date(batch.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="batch-card-actions">
                                    <button
                                        className="view-btn"
                                        onClick={() => {
                                            setCurrentBatch(batch.id)
                                            fetchBatchStatus(batch.id)
                                        }}
                                    >
                                        View Details
                                    </button>
                                    <button
                                        className="delete-btn"
                                        onClick={() => deleteBatch(batch.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default BatchProcessing
