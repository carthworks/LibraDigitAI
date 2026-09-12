import React from 'react'
import { Book, Shield, Box, Search, Layers, FileText, Cpu, User, Lock, Users, Target, Zap } from 'lucide-react'
import './Help.css'

const Help = () => {
    return (
        <div className="help-page">
            <div className="help-header">
                <h1>LibraDigit AI Help & Guide</h1>
                <p>Welcome to your personal digital archive assistant. Here is how to get the most out of it.</p>
                <img src="/libradigit_ai_poster2.png" className="help-image" alt="LibraDigit AI workflow and system architecture diagram" />
            </div>

            <div className="help-section">
                <h2><Target size={24} /> Project Overview</h2>
                <div className="feature-card">
                    <h3>🎯 Problem & Scope</h3>
                    <p>
                        <strong>The Problem:</strong> Physical archives are deteriorating, difficult to search, and often inaccessible. Cloud solutions compromise privacy, while manual digitization is slow and inconsistent.
                    </p>
                    <p>
                        <strong>The Scope:</strong> LibraDigit AI provides a complete, <strong>offline-first ecosystem</strong> for transforming physical documents into future-proof digital assets. from OCR to metadata enrichment and long-term preservation, ensuring history is never lost.
                    </p>
                </div>

                <div className="feature-card">
                    <h3>👥 Target Audience</h3>
                    <ul className="help-list">
                        <li><strong>🏛️ Librarians & Archivists</strong>: For standard-compliant (BagIt) digital preservation.</li>
                        <li><strong>⚖️ Legal & Medical Professionals</strong>: For 100% private, offline document processing.</li>
                        <li><strong>🎓 Researchers & Historians</strong>: To digitize and search personal reference collections.</li>
                        <li><strong>🏢 Organizations</strong>: Managing large-scale document digitization projects.</li>
                    </ul>
                </div>
            </div>

            <div className="help-section">
                <h2><Zap size={24} /> Core Features</h2>
                <div className="capabilities-grid">
                    <div className="cap-card">
                        <h3><Layers size={20} /> Batch Processing</h3>
                        <p>Process hundreds of documents simultaneously with our multi-threaded batch engine.</p>
                    </div>
                    <div className="cap-card">
                        <h3><Search size={20} /> Full-Text Search</h3>
                        <p>Instantly find any word across your entire archive with context-aware snippet highlighting.</p>
                    </div>
                    <div className="cap-card">
                        <h3><Cpu size={20} /> AI OCR Engine</h3>
                        <p>Tesseract-powered engine supporting 100+ languages with layout preservation.</p>
                    </div>
                    <div className="cap-card">
                        <h3><Lock size={20} /> Privacy First</h3>
                        <p>Zero cloud dependency. Your sensitive data never leaves your local machine.</p>
                    </div>
                    <div className="cap-card">
                        <h3><FileText size={20} /> Smart PDF/A</h3>
                        <p>Generates ISO-compliant archival PDFs with embedded XMP metadata and searchable text layers.</p>
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
                            <p>Upload your scanned PDF (with images) or Image file. The system automatically detects and processes scanned PDFs using OCR, including handwritten text detection. Select the document language (English, Spanish, French, etc.) for accurate text extraction.</p>
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
                        <summary>Installation & Setup Guide</summary>
                        <p>Need help installing? <a href="/install_guide.html" target="_blank" style={{ color: 'var(--color-primary)' }}>Open the detailed Visual Installation Guide</a>.</p>
                    </details>
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
                    <details>
                        <summary>Scanned PDF Not Extracting Text</summary>
                        <p>The system automatically detects scanned PDFs (PDFs containing images instead of text) and applies OCR. If OCR fails, ensure Tesseract is properly installed and the PDF contains readable images.</p>
                    </details>
                </div>
            </div>

            <div className="help-section trust-compliance-section">
                <h2><Shield size={24} /> Privacy, Trust & Legal Compliance</h2>
                <div className="capabilities-grid">
                    <div className="cap-card">
                        <h3><Lock size={20} /> 100% Offline Privacy Guarantee</h3>
                        <p>LibraDigit AI operates completely locally on your device. Zero telemetry, zero cloud sync, and zero tracking cookies. Your document data never leaves your environment.</p>
                    </div>
                    <div className="cap-card">
                        <h3><Book size={20} /> Terms & Open Source Licensing</h3>
                        <p>Licensed under the permissive <strong>MIT License</strong>. Free for academic, institutional, and commercial archival usage without hidden subscriptions or vendor lock-in.</p>
                    </div>
                    <div className="cap-card">
                        <h3><Box size={20} /> International Archival Standards</h3>
                        <p>Full compliance with <strong>ISO BagIt (RFC 8493)</strong> preservation packaging, <strong>PDF/A</strong> standards, MD5 manifest integrity, and Dublin Core embedded XMP metadata.</p>
                    </div>
                </div>
            </div>

            <div className="help-section about-section">
                <h2><User size={24} /> About & Direct Support</h2>
                <div className="author-card">
                    <img src="/welcome_screen.png" alt="LibraDigit AI Welcome" className="author-logo" />
                    <div className="author-details">
                        <h3>Karthikeyan T</h3>
                        <p>Lead Engineer & Archival Systems Specialist</p>
                        <p><strong>Direct Support:</strong> <a href="mailto:tkarthikeyan@gmail.com">tkarthikeyan@gmail.com</a></p>
                        <p><strong>GitHub Repository:</strong> <a href="https://github.com/carthworks" target="_blank" rel="noopener noreferrer">github.com/carthworks</a></p>
                        <p className="author-note">"Built with ❤️ for librarians, archivists, and preservation teams worldwide"</p>
                    </div>
                </div>
            </div>

            <div className="help-footer">
                <p>Version 1.2.0 • Offline-First Digital Archival System • MIT Licensed</p>
            </div>
        </div>
    )
}

export default Help
