import { useState, useEffect } from 'react'
import axios from 'axios'
import { Sparkles, Check, Loader, AlertCircle } from 'lucide-react'
import { API_URL } from '../config'
import './MetadataSuggestions.css'

function MetadataSuggestions({ projectId, onAccept }) {
    const [suggestions, setSuggestions] = useState(null)
    const [error, setError] = useState(null)
    const [extracting, setExtracting] = useState(false)

    useEffect(() => {
        loadSuggestions()
    }, [projectId])

    const loadSuggestions = async () => {
        try {
            const response = await axios.get(`${API_URL}/metadata/suggestions/${projectId}`)
            if (response.data.suggestions) {
                setSuggestions(response.data.suggestions)
            }
        } catch (error) {
            console.error('Error loading suggestions:', error)
        }
    }

    const extractMetadata = async () => {
        setExtracting(true)
        setError(null)

        try {
            const response = await axios.post(`${API_URL}/metadata/extract/${projectId}`)

            // Normalize the response - the extraction returns {title, author, ...}
            // but we need {suggested_title, suggested_author, ...}
            const extracted = response.data.suggestions
            const normalized = {
                suggested_title: extracted.title,
                suggested_author: extracted.author,
                suggested_year: extracted.year,
                suggested_subject: extracted.subject,
                suggested_keywords: extracted.keywords,
                confidence_scores: extracted.confidence_scores
            }

            setSuggestions(normalized)
        } catch (error) {
            console.error('Error extracting metadata:', error)
            setError(error.response?.data?.error || 'Failed to extract metadata')
        } finally {
            setExtracting(false)
        }
    }

    const acceptSuggestion = (field, value) => {
        if (onAccept) {
            onAccept(field, value)
        }
    }

    const acceptAllSuggestions = () => {
        if (suggestions && onAccept) {
            if (suggestions.suggested_title) onAccept('title', suggestions.suggested_title)
            if (suggestions.suggested_author) onAccept('author', suggestions.suggested_author)
            if (suggestions.suggested_year) onAccept('year', suggestions.suggested_year)
            if (suggestions.suggested_subject) onAccept('subject', suggestions.suggested_subject)
            if (suggestions.suggested_keywords) onAccept('keywords', suggestions.suggested_keywords)
        }
    }

    const getConfidenceColor = (score) => {
        if (score >= 0.7) return 'high'
        if (score >= 0.4) return 'medium'
        return 'low'
    }

    const getConfidenceLabel = (score) => {
        if (score >= 0.7) return 'High Confidence'
        if (score >= 0.4) return 'Medium Confidence'
        return 'Low Confidence'
    }

    if (!suggestions) {
        return (
            <div className="metadata-suggestions">
                <div className="suggestions-header">
                    <div className="header-content">
                        <Sparkles className="sparkles-icon" />
                        <div>
                            <h3>AI Metadata Extraction</h3>
                            <p>Let AI automatically extract metadata from your document</p>
                        </div>
                    </div>
                    <button
                        className="extract-btn"
                        onClick={extractMetadata}
                        disabled={extracting}
                    >
                        {extracting ? (
                            <>
                                <Loader className="spin" size={18} />
                                Extracting...
                            </>
                        ) : (
                            <>
                                <Sparkles size={18} />
                                Extract Metadata
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <div className="error-message">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}
            </div>
        )
    }

    const confidenceScores = suggestions.confidence_scores || {}
    const overallConfidence = confidenceScores.overall || 0

    return (
        <div className="metadata-suggestions">
            <div className="suggestions-header">
                <div className="header-content">
                    <Sparkles className="sparkles-icon" />
                    <div>
                        <h3>AI Suggestions</h3>
                        <div className={`confidence-badge ${getConfidenceColor(overallConfidence)}`}>
                            {getConfidenceLabel(overallConfidence)} ({Math.round(overallConfidence * 100)}%)
                        </div>
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className="accept-all-btn"
                        onClick={acceptAllSuggestions}
                    >
                        <Check size={18} />
                        Accept All
                    </button>
                    <button
                        className="refresh-btn"
                        onClick={extractMetadata}
                        disabled={extracting}
                    >
                        {extracting ? (
                            <Loader className="spin" size={18} />
                        ) : (
                            <>
                                <Sparkles size={18} />
                                Re-extract
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="suggestions-list">
                {suggestions.suggested_title && (
                    <SuggestionItem
                        label="Title"
                        value={suggestions.suggested_title}
                        confidence={confidenceScores.title}
                        onAccept={() => acceptSuggestion('title', suggestions.suggested_title)}
                    />
                )}

                {suggestions.suggested_author && (
                    <SuggestionItem
                        label="Author"
                        value={suggestions.suggested_author}
                        confidence={confidenceScores.author}
                        onAccept={() => acceptSuggestion('author', suggestions.suggested_author)}
                    />
                )}

                {suggestions.suggested_year && (
                    <SuggestionItem
                        label="Year"
                        value={suggestions.suggested_year}
                        confidence={confidenceScores.year}
                        onAccept={() => acceptSuggestion('year', suggestions.suggested_year)}
                    />
                )}

                {suggestions.suggested_subject && (
                    <SuggestionItem
                        label="Subject"
                        value={suggestions.suggested_subject}
                        confidence={confidenceScores.subject}
                        onAccept={() => acceptSuggestion('subject', suggestions.suggested_subject)}
                    />
                )}

                {suggestions.suggested_keywords && (
                    <SuggestionItem
                        label="Keywords"
                        value={suggestions.suggested_keywords}
                        confidence={confidenceScores.keywords}
                        onAccept={() => acceptSuggestion('keywords', suggestions.suggested_keywords)}
                    />
                )}
            </div>
        </div>
    )
}

function SuggestionItem({ label, value, confidence, onAccept }) {
    const getConfidenceColor = (score) => {
        if (score >= 0.7) return 'high'
        if (score >= 0.4) return 'medium'
        return 'low'
    }

    return (
        <div className="suggestion-item">
            <div className="suggestion-header">
                <span className="suggestion-label">{label}</span>
                <span className={`confidence-indicator ${getConfidenceColor(confidence)}`}>
                    {Math.round(confidence * 100)}%
                </span>
            </div>
            <div className="suggestion-content">
                <div className="suggestion-value">{value}</div>
                <button
                    className="accept-btn"
                    onClick={onAccept}
                    title="Accept this suggestion"
                >
                    <Check size={16} />
                    Accept
                </button>
            </div>
        </div>
    )
}

export default MetadataSuggestions
