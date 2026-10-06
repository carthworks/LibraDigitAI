import { useState, useEffect, useRef } from 'react'
import ReactQuill from 'react-quill'
import DOMPurify from 'dompurify'
import { FileText, Type, CheckCircle } from 'lucide-react'

const TextEditor = ({ value, onChange, placeholder = "Text will appear here..." }) => {
    const [stats, setStats] = useState({ chars: 0, words: 0, lines: 0 })
    const quillRef = useRef(null)

    // Custom Toolbar Configuration
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
            [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
            [{ 'align': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
            ['clean']                                         // remove formatting button
        ]
    }

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'align',
        'list', 'bullet',
        'indent'
    ]

    // Update stats when value changes
    useEffect(() => {
        // Strip HTML safely to count actual text
        try {
            const parser = new DOMParser()
            const doc = parser.parseFromString(value || '', 'text/html')
            const text = doc.body.textContent || ''

            const chars = text.length
            const words = text.trim() ? text.trim().split(/\s+/).length : 0
            const lines = text.split(/\r\n|\r|\n/).length

            setStats({ chars, words, lines })
        } catch {
            setStats({ chars: (value || '').length, words: 0, lines: 1 })
        }
    }, [value])

    const handleChange = (content, delta, source, editor) => {
        // Adapt ReactQuill's onChange to match parent expected event format
        // Sanitize output via DOMPurify to defend against Quill 1.3.7 vulnerabilities (M8)
        const sanitized = DOMPurify.sanitize(content || '', { USE_PROFILES: { html: true } })
        onChange({ target: { value: sanitized } })
    }

    return (
        <div className="text-editor rich-editor">
            <ReactQuill
                ref={quillRef}
                theme="snow"
                value={value}
                onChange={handleChange}
                modules={modules}
                formats={formats}
                placeholder={placeholder}
                className="quill-editor"
            />

            <div className="editor-footer">
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

                <div className="editor-tips-mini">
                    <CheckCircle size={14} />
                    <span>Tips: Use text color to highlight uncertain words.</span>
                </div>
            </div>
        </div>
    )
}

export default TextEditor
