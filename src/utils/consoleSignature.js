/**
 * Developer Console Signature & DevTools Inspection Helper
 * Implements @carthworks developer signature standards for LibraDigit AI
 */

let isSignatureInitialized = false

export function initConsoleSignature() {
    if (isSignatureInitialized || typeof window === 'undefined') return
    isSignatureInitialized = true

    const titleStyle = 'font-size: 14px; font-weight: 800; color: #ffffff; background: linear-gradient(135deg, #f15a24 0%, #ff6900 50%, #fcb900 100%); padding: 6px 14px; border-radius: 6px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);'
    const labelStyle = 'font-weight: 700; color: #f15a24;'
    const valStyle = 'color: #eff1f6;'
    const linkStyle = 'color: #fcb900; font-weight: 600; text-decoration: underline;'
    const quoteStyle = 'font-style: italic; color: #00d084;'
    const tipLabelStyle = 'font-weight: 700; color: #fcb900;'
    const codeStyle = 'font-family: "JetBrains Mono", monospace; color: #f15a24; background: rgba(241, 90, 36, 0.15); padding: 2px 6px; border-radius: 4px;'

    console.log('%c🏛️ LibraDigit AI — Digital Archive Builder v1.3.0', titleStyle)

    console.log(
        '%c👨‍💻 Lead Engineer:%c Karthikeyan T (@carthworks)\n' +
        '%c✉️  Support Email: %ctkarthikeyan@gmail.com\n' +
        '%c🐙 GitHub:       %chttps://github.com/carthworks\n' +
        '%c💼 LinkedIn:     %chttps://www.linkedin.com/in/carthworks\n' +
        '%c📜 License:      %cMIT (Open Source)\n' +
        '%c🔒 Architecture: %c100% Offline-First (Zero Cloud Telemetry)\n' +
        '%c📦 Standards:    %cISO BagIt (RFC 8493) • PDF/A ISO 19005 • Dublin Core\n' +
        '%c✨ Mission:      %c"Preserving human knowledge through intelligent, offline archival systems."',
        labelStyle, valStyle,
        labelStyle, valStyle,
        labelStyle, linkStyle,
        labelStyle, linkStyle,
        labelStyle, valStyle,
        labelStyle, valStyle,
        labelStyle, valStyle,
        labelStyle, quoteStyle
    )

    console.log(
        '%c💡 DevTools Helper:%c Type %cLibraDigit.help()%c to interactively inspect system capabilities!',
        tipLabelStyle,
        valStyle,
        codeStyle,
        valStyle
    )

    // Interactive DevTools Inspection API
    window.LibraDigit = {
        version: '1.3.0',
        author: {
            name: 'Karthikeyan T',
            handle: '@carthworks',
            email: 'tkarthikeyan@gmail.com',
            github: 'https://github.com/carthworks',
            linkedin: 'https://www.linkedin.com/in/carthworks'
        },
        standards: [
            'ISO BagIt (RFC 8493) Preservation Packaging',
            'ISO 19005 Archival PDF/A Specification',
            'Dublin Core & XMP Embedded Metadata',
            'SQLite FTS5 Full-Text Search Engine'
        ],
        techStack: () => {
            console.table({
                'Frontend': 'React 18, Vite 5, Lucide Icons, Recharts, React-PDF, React-Quill',
                'Backend': 'Python 3, Flask, SQLite3, SQLite FTS5',
                'OCR & Vision': 'Tesseract OCR 5, OpenCV, GLM-OCR / Ollama Vision',
                'Preservation': 'PyMuPDF (fitz), ReportLab, BagIt Standard'
            })
            return '⚡ LibraDigit AI System Architecture'
        },
        info: () => {
            console.info({
                app: 'LibraDigit AI',
                version: '1.2.0',
                status: 'Production Ready',
                mode: 'Offline-First Desktop / Web Application',
                license: 'MIT',
                author: 'Karthikeyan T (@carthworks)'
            })
            return '📄 System Info Loaded'
        },
        help: () => {
            console.table({
                'LibraDigit.info()': 'Print complete system and version metadata',
                'LibraDigit.techStack()': 'Inspect full-stack architecture and engines',
                'LibraDigit.author': 'View lead engineer profile and contact channels',
                'LibraDigit.standards': 'List international digital preservation compliance'
            })
            return '🚀 Type any helper command above in DevTools.'
        }
    }
}

export default initConsoleSignature
