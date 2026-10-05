import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { API_URL as API_BASE } from '../config'
import { runJob, JobCancelledError } from '../api/jobs'

const ProjectContext = createContext()

export const useProject = () => {
    const context = useContext(ProjectContext)
    if (!context) {
        throw new Error('useProject must be used within ProjectProvider')
    }
    return context
}

export const ProjectProvider = ({ children }) => {
    const [projects, setProjects] = useState([])
    const [currentProject, setCurrentProject] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Helper to notify other tabs of changes
    const notifyOtherTabs = (type, data = null) => {
        localStorage.setItem(`project_sync_event`, JSON.stringify({
            type,
            data,
            timestamp: Date.now()
        }))
    }

    // Fetch all projects
    const fetchProjects = async () => {
        try {
            setLoading(true)
            const response = await axios.get(`${API_BASE}/projects`)
            setProjects(response.data.projects || [])
            setError(null)
        } catch (err) {
            setError('Unable to fetch projects. Please ensure the backend server is running.')
            console.error('Error fetching projects:', err)
        } finally {
            setLoading(false)
        }
    }

    // Create new project with file upload
    const createProject = async (file) => {
        try {
            setLoading(true)

            // Create FormData to send file
            const formData = new FormData()
            formData.append('file', file)

            const response = await axios.post(`${API_BASE}/projects`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            await fetchProjects()
            notifyOtherTabs('REFRESH')
            setError(null)
            return response.data.project
        } catch (err) {
            setError('Unable to create project. Please try again.')
            console.error('Error creating project:', err)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // Get project by ID
    const getProject = async (projectId) => {
        try {
            setLoading(true)
            const response = await axios.get(`${API_BASE}/projects/${projectId}`)
            setCurrentProject(response.data.project)
            setError(null)
            return response.data.project
        } catch (err) {
            setError('Unable to fetch project details.')
            console.error('Error fetching project:', err)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // Update project status
    const updateProjectStatus = async (projectId, status) => {
        try {
            await axios.put(`${API_BASE}/projects/${projectId}/status`, { status })
            await fetchProjects()
            notifyOtherTabs('REFRESH')
            if (currentProject?.id === projectId) {
                setCurrentProject({ ...currentProject, status })
            }
        } catch (err) {
            console.error('Error updating project status:', err)
        }
    }

    // OCR runs as a background job on the server; options.onProgress(job)
    // receives page-level progress and options.onStart(job) the job id.
    const runProcessingJob = async (kind, projectId, params, options, fallbackError) => {
        try {
            setLoading(true)
            const result = await runJob(kind, projectId, params, options)
            await getProject(projectId)
            notifyOtherTabs('REFRESH')
            setError(null)
            return result
        } catch (err) {
            if (err instanceof JobCancelledError) throw err
            const errorMsg = err.message || fallbackError
            setError(errorMsg)
            console.error(`Error running ${kind}:`, err)
            throw new Error(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    const runOCR = (projectId, language = 'eng', options = {}) =>
        runProcessingJob('ocr', projectId, { language }, options,
            'OCR processing failed. Please check if Tesseract is installed.')

    const runAdvancedOCR = (projectId, language = 'eng', options = {}) =>
        runProcessingJob('advanced_ocr', projectId, { language }, options,
            'Advanced OCR processing failed. Please check if OpenCV and Tesseract are installed.')

    const convertHandwrittenToPDF = (projectId, title, language = 'eng', options = {}) =>
        runProcessingJob('handwritten_to_pdf', projectId, { title, language }, options,
            'Handwritten to PDF conversion failed.')

    // Save cleaned text
    const saveCleanedText = async (projectId, cleanedText) => {
        try {
            setLoading(true)
            await axios.post(`${API_BASE}/cleanup/${projectId}`, { cleaned_text: cleanedText })
            await getProject(projectId)
            notifyOtherTabs('REFRESH')
            setError(null)
        } catch (err) {
            setError('Unable to save cleaned text.')
            console.error('Error saving cleaned text:', err)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // Save metadata
    const saveMetadata = async (projectId, metadata) => {
        try {
            setLoading(true)
            await axios.post(`${API_BASE}/metadata/${projectId}`, metadata)
            await getProject(projectId)
            notifyOtherTabs('REFRESH')
            setError(null)
        } catch (err) {
            setError('Unable to save metadata.')
            console.error('Error saving metadata:', err)
            throw err
        } finally {
            setLoading(false)
        }
    }

    // Generate archive
    const generateArchive = async (projectId) => {
        try {
            setLoading(true)
            const response = await axios.post(`${API_BASE}/archive/${projectId}`)
            await getProject(projectId)
            notifyOtherTabs('REFRESH')
            setError(null)
            return response.data
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Unable to generate archive.'
            setError(errorMsg)
            console.error('Error generating archive:', err)
            throw new Error(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    // Delete project
    const deleteProject = async (projectId) => {
        try {
            await axios.delete(`${API_BASE}/projects/${projectId}`)

            // Remove locally first
            setProjects(prev => prev.filter(p => p.id !== projectId))

            // Notify other tabs
            notifyOtherTabs('DELETE', { id: projectId })

            if (currentProject?.id === projectId) {
                setCurrentProject(null)
            }
        } catch (err) {
            console.error('Error deleting project:', err)
            throw err
        }
    }

    useEffect(() => {
        fetchProjects()

        // Listen for cross-tab events
        const handleStorageEvent = (e) => {
            if (e.key === 'project_sync_event' && e.newValue) {
                try {
                    const eventData = JSON.parse(e.newValue)
                    if (eventData.type === 'DELETE') {
                        setProjects(prev => prev.filter(p => p.id !== eventData.data.id))
                    } else if (eventData.type === 'REFRESH') {
                        // Silent background fetch to update list without global spinner
                        axios.get(`${API_BASE}/projects`).then(response => {
                            setProjects(response.data.projects || [])
                        })
                    }
                } catch (err) {
                    console.error("Failed to process sync event", err)
                }
            }
        }

        window.addEventListener('storage', handleStorageEvent)
        return () => window.removeEventListener('storage', handleStorageEvent)
    }, [])

    const value = {
        projects,
        currentProject,
        loading,
        error,
        fetchProjects,
        createProject,
        getProject,
        updateProjectStatus,
        runOCR,
        runAdvancedOCR,
        convertHandwrittenToPDF,
        saveCleanedText,
        saveMetadata,
        generateArchive,
        deleteProject,
        setError
    }

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    )
}
