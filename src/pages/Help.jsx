import React from 'react'
import { Book, Shield, Box, Search, Layers, FileText, Cpu, User, Lock } from 'lucide-react'
import './Help.css'

const Help = () => {
    return (
        <div className="help-page">
            <div className="help-header">
                <h1>LibraDigit AI Help & Guide</h1>
                <p>Welcome to your personal digital archive assistant. Here is how to get the most out of it.</p>
            </div>

            <div className="help-section">
                <h2><Shield size={24} /> New Features & Standards</h2>
                <div className="feature-card">
                    <h3>📦 Standard BagIt Archiving</h3>
                    <p>
                        We have upgraded our archiving engine to follow the international <strong>BagIt</strong> standard.
                        Instead of just a single PDF, your archives are now robust packages containing:
                    </p>
                    <ul>
                        <li><strong>Data Folder</strong>: Contains your pristine, searchable PDF.</li>
                        <li><strong>Manifest File</strong>: A cryptographic checksum (MD5) to prove file integrity years from now.</li>
                        <li><strong>Bag Info</strong>: Human-readable metadata about the archive package.</li>
                    </ul>
                </div>

                <div className="feature-card">
                    <h3>🏷️ Embedded Metadata</h3>
                    <p>
                        Metadata is no longer just in the database. We now <strong>embed</strong> your Title, Author, Subject,
                        and Keywords directly into the PDF file itself (XMP Metadata).
                    </p>
                    <p>
                        This means if you email the PDF to someone or open it in any external viewer, the metadata travels
                        with the file, making it universally searchable.
                    </p>
                </div>

                <div className="feature-card">
                    <h3>👁️ Draft Preview</h3>
                    <p>
                        You can now verify your documents <em>before</em> finishing the project.
                        Click the <strong>Eye Icon</strong> on any project in the "Needs Cleanup" or "Metadata" stage
                        to see the <strong>Searchable PDF Draft</strong>.
                    </p>
                </div>
            </div>

            <div className="help-section">
                <h2><Book size={24} /> System Capabilities</h2>
                <div className="capabilities-grid">
                    <div className="cap-card">
                        <h3><Cpu size={20} /> OCR Processing</h3>
                        <p>Tesseract-powered text extraction with multi-language support (Eng, Spa, Fra, Deu, etc.)</p>
                    </div>
                    <div className="cap-card">
                        <h3><Lock size={20} /> Offline-First</h3>
                        <p>No cloud dependency, complete data privacy. All data stays local on your machine.</p>
                    </div>
                    <div className="cap-card">
                        <h3><FileText size={20} /> Searchable PDFs</h3>
                        <p>Generates high-fidelity "Image-over-Text" PDFs that preserve original layout while being fully searchable.</p>
                    </div>
                </div>
            </div>

            <div className="help-section">
                <h2><Layers size={24} /> Workflow Guide</h2>
                <div className="steps-container">
                    <div className="step-item">
                        <div className="step-number">1</div>
                        <div className="step-content">
                            <h4>Upload & Language</h4>
                            <p>Upload your scanned PDF or Image. Select the document language (English, Spanish, French, etc.) for accurate OCR.</p>
                        </div>
                    </div>
                    <div className="step-item">
                        <div className="step-number">2</div>
                        <div className="step-content">
                            <h4>OCR Processing</h4>
                            <p>The AI engine converts image text into selectable, searchable text while preserving the original layout.</p>
                        </div>
                    </div>
                    <div className="step-item">
                        <div className="step-number">3</div>
                        <div className="step-content">
                            <h4>Cleanup & Verify</h4>
                            <p>Use the text editor to fix any typos. Use the "Draft Preview" to ensure the PDF looks correct.</p>
                        </div>
                    </div>
                    <div className="step-item">
                        <div className="step-number">4</div>
                        <div className="step-content">
                            <h4>Metadata & Archive</h4>
                            <p>Add descriptive details. The system then builds the BagIt package and embeds your metadata.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="help-section">
                <h2><Search size={24} /> Troubleshooting</h2>
                <div className="troubleshoot-list">
                    <details>
                        <summary>Backend/Project Won't Start</summary>
                        <p>Ensure Python backend is running via <code>python server.py</code> in the backend folder.</p>
                    </details>
                    <details>
                        <summary>Tesseract Not Found</summary>
                        <p>Install Tesseract OCR and add it to your system PATH. Verify with <code>tesseract --version</code>.</p>
                    </details>
                    <details>
                        <summary>Failed to Load PDF</summary>
                        <p>If a file is actually a text file with a .pdf extension, the system will now automatically detect and handle it.</p>
                    </details>
                </div>
            </div>

            <div className="help-section about-section">
                <h2><User size={24} /> About the Developer</h2>
                <div className="author-card">
                    <img src="/welcome_screen.png" alt="LibraDigit AI Welcome" className="author-logo" />
                    <div className="author-details">
                        <h3>KarthikeyanT</h3>
                        <p>Full Stack Developer & AI Specialist</p>
                        <p><strong>Email:</strong> <a href="mailto:tkarthikeyan@gmail.com">tkarthikeyan@gmail.com</a></p>
                        <p><strong>GitHub:</strong> <a href="https://github.com/carthworks" target="_blank" rel="noopener noreferrer">github.com/carthworks</a></p>
                        <p className="author-note">"Built with ❤️ for librarians and archivists worldwide"</p>
                    </div>
                </div>
            </div>

            <div className="help-footer">
                <p>Version 1.0.0 • Offline-First Digital Archival System</p>
            </div>
        </div>
    )
}

export default Help
