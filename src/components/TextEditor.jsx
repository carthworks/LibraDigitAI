import React, { useState, useRef, useEffect } from 'react'
import {
    Undo,
    Redo,
    Copy,
    Search,
    Replace,
    Type,
    ZoomIn,
    ZoomOut,
    WrapText,
    FileText,
    CheckCircle
} from 'lucide-react'
import './TextEditor.css'

const TextEditor = ({ value, onChange, placeholder = "Text will appear here..." }) => {
    const textareaRef = useRef(null)
    const [history, setHistory] = useState([value])
    const [historyIndex, setHistoryIndex] = useState(0)
    const [fontSize, setFontSize] = useState(15)
    const [wordWrap, setWordWrap] = useState(true)
    const [showFindReplace, setShowFindReplace] = useState(false)
    const [findText, setFindText] = useState('')
    const [replaceText, setReplaceText] = useState('')
    const [matchCount, setMatchCount] = useState(0)
    const [currentMatch, setCurrentMatch] = useState(0)
    const [stats, setStats] = useState({ chars: 0, words: 0, lines: 0 })

    // Update stats when value changes
    useEffect(() => {
        const chars = value.length
        const words = value.trim() ? value.trim().split(/\s+/).length : 0
        const lines = value.split('\n').length
        setStats({ chars, words, lines })
    }, [value])

    // Update history when value changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (value !== history[historyIndex]) {
                const newHistory = history.slice(0, historyIndex + 1)
                newHistory.push(value)
                setHistory(newHistory)
                setHistoryIndex(newHistory.length - 1)
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [value])

    // Find matches
    useEffect(() => {
        if (findText) {
            const regex = new RegExp(findText, 'gi')
            const matches = value.match(regex)
            setMatchCount(matches ? matches.length : 0)
        } else {
            setMatchCount(0)
            setCurrentMatch(0)
        }
    }, [findText, value])

    const handleUndo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1
            setHistoryIndex(newIndex)
            onChange({ target: { value: history[newIndex] } })
        }
    }

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1
            setHistoryIndex(newIndex)
            onChange({ target: { value: history[newIndex] } })
        }
    }

    const handleCopy = () => {
        if (textareaRef.current) {
            const selectedText = textareaRef.current.value.substring(
                textareaRef.current.selectionStart,
                textareaRef.current.selectionEnd
            )
            if (selectedText) {
                navigator.clipboard.writeText(selectedText)
            } else {
                navigator.clipboard.writeText(value)
            }
        }
    }

    const handleFindNext = () => {
        if (!findText || matchCount === 0) return

        const regex = new RegExp(findText, 'gi')
        const matches = []
        let match

        while ((match = regex.exec(value)) !== null) {
            matches.push(match.index)
        }

        if (matches.length > 0) {
            const nextIndex = (currentMatch + 1) % matches.length
            setCurrentMatch(nextIndex)

            if (textareaRef.current) {
                const pos = matches[nextIndex]
                textareaRef.current.focus()
                textareaRef.current.setSelectionRange(pos, pos + findText.length)
                textareaRef.current.scrollTop = textareaRef.current.scrollHeight * (pos / value.length)
            }
        }
    }

    const handleReplaceOne = () => {
        if (!findText || matchCount === 0) return

        const start = textareaRef.current.selectionStart
        const end = textareaRef.current.selectionEnd
        const selectedText = value.substring(start, end)

        if (selectedText.toLowerCase() === findText.toLowerCase()) {
            const newValue = value.substring(0, start) + replaceText + value.substring(end)
            onChange({ target: { value: newValue } })
            handleFindNext()
        } else {
            handleFindNext()
        }
    }

    const handleReplaceAll = () => {
        if (!findText) return

        const regex = new RegExp(findText, 'gi')
        const newValue = value.replace(regex, replaceText)
        onChange({ target: { value: newValue } })
        setFindText('')
        setShowFindReplace(false)
    }

    const handleZoomIn = () => {
        setFontSize(prev => Math.min(prev + 2, 24))
    }

    const handleZoomOut = () => {
        setFontSize(prev => Math.max(prev - 2, 10))
    }

    const toggleWordWrap = () => {
        setWordWrap(prev => !prev)
    }

    const handleKeyDown = (e) => {
        // Ctrl+Z for undo
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault()
            handleUndo()
        }
        // Ctrl+Y or Ctrl+Shift+Z for redo
        if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
            e.preventDefault()
            handleRedo()
        }
        // Ctrl+F for find
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault()
            setShowFindReplace(true)
        }
        // Ctrl+H for replace
        if (e.ctrlKey && e.key === 'h') {
            e.preventDefault()
            setShowFindReplace(true)
        }
        // Tab key handling
        if (e.key === 'Tab') {
            e.preventDefault()
            const start = e.target.selectionStart
            const end = e.target.selectionEnd
            const newValue = value.substring(0, start) + '    ' + value.substring(end)
            onChange({ target: { value: newValue } })
            setTimeout(() => {
                textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4
            }, 0)
        }
    }

    return (
        <div className="text-editor">
            {/* Toolbar */}
            <div className="editor-toolbar-enhanced">
                <div className="toolbar-group">
                    <button
                        className="toolbar-btn"
                        onClick={handleUndo}
                        disabled={historyIndex === 0}
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo size={18} />
                    </button>
                    <button
                        className="toolbar-btn"
                        onClick={handleRedo}
                        disabled={historyIndex === history.length - 1}
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo size={18} />
                    </button>
                </div>

                <div className="toolbar-divider"></div>

                <div className="toolbar-group">
                    <button
                        className="toolbar-btn"
                        onClick={handleCopy}
                        title="Copy selected or all text"
                    >
                        <Copy size={18} />
                    </button>
                    <button
                        className={`toolbar-btn ${showFindReplace ? 'active' : ''}`}
                        onClick={() => setShowFindReplace(!showFindReplace)}
                        title="Find & Replace (Ctrl+F)"
                    >
                        <Search size={18} />
                    </button>
                </div>

                <div className="toolbar-divider"></div>

                <div className="toolbar-group">
                    <button
                        className="toolbar-btn"
                        onClick={handleZoomOut}
                        title="Decrease font size"
                    >
                        <ZoomOut size={18} />
                    </button>
                    <span className="toolbar-label">{fontSize}px</span>
                    <button
                        className="toolbar-btn"
                        onClick={handleZoomIn}
                        title="Increase font size"
                    >
                        <ZoomIn size={18} />
                    </button>
                </div>

                <div className="toolbar-divider"></div>

                <div className="toolbar-group">
                    <button
                        className={`toolbar-btn ${wordWrap ? 'active' : ''}`}
                        onClick={toggleWordWrap}
                        title="Toggle word wrap"
                    >
                        <WrapText size={18} />
                    </button>
                </div>

                <div className="toolbar-spacer"></div>

                <div className="toolbar-stats">
                    <span className="stat-item">
                        <FileText size={14} />
                        {stats.lines} lines
                    </span>
                    <span className="stat-item">
                        <Type size={14} />
                        {stats.words} words
                    </span>
                    <span className="stat-item">
                        {stats.chars} chars
                    </span>
                </div>
            </div>

            {/* Find & Replace Panel */}
            {showFindReplace && (
                <div className="find-replace-panel">
                    <div className="find-replace-row">
                        <div className="find-replace-input-group">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Find..."
                                value={findText}
                                onChange={(e) => setFindText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFindNext()}
                            />
                            {matchCount > 0 && (
                                <span className="match-count">
                                    {currentMatch + 1} of {matchCount}
                                </span>
                            )}
                        </div>
                        <button
                            className="btn-find"
                            onClick={handleFindNext}
                            disabled={!findText || matchCount === 0}
                        >
                            Next
                        </button>
                    </div>
                    <div className="find-replace-row">
                        <div className="find-replace-input-group">
                            <Replace size={16} />
                            <input
                                type="text"
                                placeholder="Replace with..."
                                value={replaceText}
                                onChange={(e) => setReplaceText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleReplaceOne()}
                            />
                        </div>
                        <button
                            className="btn-replace"
                            onClick={handleReplaceOne}
                            disabled={!findText || matchCount === 0}
                        >
                            Replace
                        </button>
                        <button
                            className="btn-replace-all"
                            onClick={handleReplaceAll}
                            disabled={!findText || matchCount === 0}
                        >
                            Replace All
                        </button>
                    </div>
                </div>
            )}

            {/* Text Area */}
            <textarea
                ref={textareaRef}
                className="editor-textarea"
                value={value}
                onChange={onChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                spellCheck={true}
                style={{
                    fontSize: `${fontSize}px`,
                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                    overflowX: wordWrap ? 'hidden' : 'auto'
                }}
            />

            {/* OCR Tips */}
            <div className="editor-tips">
                <div className="tip-header">
                    <CheckCircle size={16} />
                    <span>Common OCR Errors to Check:</span>
                </div>
                <div className="tip-list">
                    <span className="tip-item">"rn" → "m"</span>
                    <span className="tip-item">"0" (zero) → "O" (letter)</span>
                    <span className="tip-item">"1" (one) → "l" (L)</span>
                    <span className="tip-item">Missing spaces</span>
                    <span className="tip-item">Special characters</span>
                </div>
            </div>
        </div>
    )
}

export default TextEditor
