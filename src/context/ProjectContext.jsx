import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const ProjectContext = createContext()

export const useProject = () => {
    const context = useContext(ProjectContext)
    if (!context) {
        throw new Error('useProject must be used within ProjectProvider')
    }
    return context
}

const API_BASE = 'http://localhost:5000/api'

export const ProjectProvider = ({ children }) => {
    const [projects, setProjects] = useState([])
    const [currentProject, setCurrentProject] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

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
            if (currentProject?.id === projectId) {
                setCurrentProject({ ...currentProject, status })
            }
        } catch (err) {
            console.error('Error updating project status:', err)
        }
    }

    // Run OCR on project
    const runOCR = async (projectId, language = 'eng') => {
        try {
            setLoading(true)
            const response = await axios.post(`${API_BASE}/ocr/${projectId}`, { language })
            await getProject(projectId)
            setError(null)
            return response.data
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'OCR processing failed. Please check if Tesseract is installed.'
            setError(errorMsg)
            console.error('Error running OCR:', err)
            throw new Error(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    // Save cleaned text
    const saveCleanedText = async (projectId, cleanedText) => {
        try {
            setLoading(true)
            await axios.post(`${API_BASE}/cleanup/${projectId}`, { cleaned_text: cleanedText })
            await getProject(projectId)
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
            await fetchProjects()
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
