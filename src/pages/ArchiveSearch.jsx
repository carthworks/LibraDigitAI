import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Search, FileText, User, ArrowRight, Loader, AlertCircle } from 'lucide-react'
import debounce from 'lodash.debounce'
import './ArchiveSearch.css'

const API_URL = 'http://localhost:5000/api'

function ArchiveSearch() {
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)

    // Debounce search to avoid excessive API calls
    const debouncedSearch = React.useCallback(
        debounce(async (searchQuery) => {
            if (!searchQuery.trim()) {
                setResults([])
                setLoading(false)
                return
            }

            try {
                const response = await axios.get(`${API_URL}/search?q=${encodeURIComponent(searchQuery)}&limit=50`)
                setResults(response.data.results)
                setSearched(true)
            } catch (error) {
                console.error("Search error:", error)
            } finally {
                setLoading(false)
            }
        }, 300),
        []
    )

    useEffect(() => {
        // Cleanup debounce on unmount
        return () => {
            debouncedSearch.cancel()
        }
    }, [debouncedSearch])

    const handleSearchChange = (e) => {
        const val = e.target.value
        setQuery(val)

        if (val.trim()) {
            setLoading(true)
            debouncedSearch(val)
        } else {
            setResults([])
            setSearched(false)
        }
    }

    const openProject = (projectId) => {
        // Navigate to metadata or archive view? 
        // User asked to find "document available". Viewing it in Cleanup/Metadata page is best currently.
        // Let's assume Metadata view is good for checking details, or a dedicated Viewer if we had one.
        // Re-using Cleanup page (which acts as viewer) or Archive page.
        // Let's go to Archive if it exists, or Metadata.
        // The user journey flow suggests: Upload -> Cleanup -> Metadata -> Archive.
        // If it's in search, it's likely processed. Let's send to Metadata page for now as it has details.
        navigate(`/metadata/${projectId}`)
    }

    return (
        <div className="archive-search-container">
            <div className="search-header">
                <h1>Archive Search</h1>
                <p>Instantly find documents, sections, and content across your entire library.</p>
            </div>

            <div className="search-box-wrapper">
                <Search className="search-icon-large" size={24} />
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search for keywords, titles, authors, or content..."
                    value={query}
                    onChange={handleSearchChange}
                    autoFocus
                />
                {loading && <Loader className="search-spinner spin" size={24} />}
            </div>

            <div className="search-results fade-in">
                {searched && results.length > 0 && (
                    <div className="search-meta-info">
                        Found {results.length} matches
                    </div>
                )}

                {results.map((result) => (
                    <div
                        key={result.id}
                        className="search-result-card"
                        onClick={() => openProject(result.id)}
                    >
                        <div className="result-header">
                            <h3 className="result-title">
                                <FileText size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'text-bottom' }} />
                                {result.title}
                            </h3>
                            {/* <span className="result-score">Relevance: {result.score.toFixed(2)}</span> */}
                        </div>

                        {result.author && (
                            <div className="result-author">
                                <User size={14} />
                                <span>{result.author}</span>
                            </div>
                        )}

                        {result.snippet && (
                            <div
                                className="result-snippet"
                                dangerouslySetInnerHTML={{ __html: result.snippet }}
                            />
                        )}
                    </div>
                ))}

                {searched && results.length === 0 && !loading && (
                    <div className="empty-state fade-in">
                        <AlertCircle size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                        <h3>No results found</h3>
                        <p>Try adjusting your search terms or keywords.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ArchiveSearch
