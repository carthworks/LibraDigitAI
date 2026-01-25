import React, { useEffect } from 'react'
import { X, BookOpen, Zap, HelpCircle, Mail, Github } from 'lucide-react'
import './HelpModal.css'

const HelpModal = ({ isOpen, onClose }) => {
    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title-section">
                        <HelpCircle size={28} className="modal-icon" />
                        <h2>LibraDigit AI - Help & Guide</h2>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Introduction */}
                    <section className="help-section">
                        <div className="section-header">
                            <BookOpen size={20} />
                            <h3>What is LibraDigit AI?</h3>
                        </div>
                        <p>
                            LibraDigit AI is a professional digitization tool designed for librarians,
                            archivists, and digitization teams. It converts scanned documents into
                            searchable, metadata-rich digital archives using a guided 5-step workflow.
                        </p>
                        <div className="feature-list">
                            <div className="feature-item">
                                <span className="feature-icon">🔍</span>
                                <span>OCR extraction & Searchable PDF generation</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-icon">✏️</span>
                                <span>Text cleanup and error correction</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-icon">📝</span>
                                <span>Comprehensive metadata management</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-icon">📁</span>
                                <span>Structured digital archive generation</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-icon">🔒</span>
                                <span>Offline-first with complete data privacy</span>
                            </div>
                        </div>
                    </section>

                    {/* How to Use */}
                    <section className="help-section">
                        <div className="section-header">
                            <Zap size={20} />
                            <h3>How to Use</h3>
                        </div>
                        <div className="modal-workflow-steps">
                            <div className="modal-workflow-step-item">
                                <div className="step-number">1</div>
                                <div className="step-content">
                                    <h4>Upload & OCR</h4>
                                    <p>Click "Start New Project" and upload your scanned PDF or image file. The system will automatically run OCR to extract text.</p>
                                </div>
                            </div>
                            <div className="modal-workflow-step-item">
                                <div className="step-number">2</div>
                                <div className="step-content">
                                    <h4>Clean Text</h4>
                                    <p>Review the extracted text and correct any OCR errors. Common issues include misread characters and spacing problems.</p>
                                </div>
                            </div>
                            <div className="modal-workflow-step-item">
                                <div className="step-number">3</div>
                                <div className="step-content">
                                    <h4>Add Metadata</h4>
                                    <p>Enter document information: title (required), author, year, subject, and keywords for better searchability.</p>
                                </div>
                            </div>
                            <div className="modal-workflow-step-item">
                                <div className="step-number">4</div>
                                <div className="step-content">
                                    <h4>Generate Archive</h4>
                                    <p>Create a structured digital archive with organized folders and standardized file naming.</p>
                                </div>
                            </div>
                            <div className="modal-workflow-step-item">
                                <div className="step-number">5</div>
                                <div className="step-content">
                                    <h4>Complete!</h4>
                                    <p>Your document is now searchable and properly archived in the structure: <code>/Archive/Subject/Year/Author_Year_Title.pdf</code></p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Tips & Best Practices */}
                    <section className="help-section">
                        <div className="section-header">
                            <span className="tip-icon">💡</span>
                            <h3>Tips & Best Practices</h3>
                        </div>
                        <ul className="tips-list">
                            <li>Use high-quality scans (300 DPI+) for best OCR and layout preservation</li>
                            <li>Supported formats: PDF, PNG, JPEG, TIFF (max 50MB)</li>
                            <li>Always review OCR text for common errors like "rn" vs "m"</li>
                            <li>Use consistent subject categories for better organization</li>
                            <li>Add multiple keywords separated by commas for searchability</li>
                            <li>The app works completely offline - no internet required</li>
                        </ul>
                    </section>

                    {/* Support */}
                    <section className="help-section">
                        <div className="section-header">
                            <Mail size={20} />
                            <h3>Support & Resources</h3>
                        </div>
                        <div className="support-grid">
                            <div className="support-card">
                                <h4>📚 Documentation</h4>
                                <p>Check the README.md and SETUP.md files in the project folder for detailed documentation.</p>
                            </div>
                            <div className="support-card">
                                <h4>🐛 Troubleshooting</h4>
                                <p>Common issues and solutions are available in the BACKEND_GUIDE.md file.</p>
                            </div>
                            <div className="support-card">
                                <h4>⚙️ System Requirements</h4>
                                <p>Node.js v18+, Python v3.8+, and optionally Tesseract OCR for advanced features.</p>
                            </div>
                            <div className="support-card">
                                <h4>🔧 Technical Support</h4>
                                <p>For technical issues, check the terminal output for error messages and consult the documentation.</p>
                            </div>
                        </div>
                    </section>

                    {/* Keyboard Shortcuts */}
                    <section className="help-section">
                        <div className="section-header">
                            <span className="tip-icon">⌨️</span>
                            <h3>Quick Reference</h3>
                        </div>
                        <div className="shortcuts-grid">
                            <div className="shortcut-item">
                                <span className="shortcut-key">?</span>
                                <span className="shortcut-desc">Open this help dialog</span>
                            </div>
                            <div className="shortcut-item">
                                <span className="shortcut-key">Esc</span>
                                <span className="shortcut-desc">Close dialogs</span>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="modal-footer">
                    <p className="version-info">LibraDigit AI v1.0.0 - Built for Librarians & Archivists</p>
                    <button className="btn btn-primary" onClick={onClose}>
                        Got it, thanks!
                    </button>
                </div>
            </div>
        </div>
    )
}

export default HelpModal
