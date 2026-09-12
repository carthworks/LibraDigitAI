/**
 * Application Configuration
 * Centralized configuration for API endpoints and other environment variables
 */

// API Base URL from environment variable
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

// Helper function to build API endpoints
export const getApiUrl = (endpoint) => {
    // Remove leading slash if present to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    return `${API_URL}/${cleanEndpoint}`
}

// Export other config values as needed
export const config = {
    apiUrl: API_URL,
    // Add other configuration values here as needed
}

export default config
