import React, { useState } from 'react'
import {
    BookOpen, ShieldCheck, Layers, Search, FileText, Cpu, Lock,
    HelpCircle, ChevronDown, Sparkles, CheckCircle2, ArrowRight,
    Terminal, ExternalLink, Mail, Github, Heart, Server
} from 'lucide-react'
import './Help.css'

const Help = () => {
    const [activeTab, setActiveTab] = useState('workflow')
    const [faqSearch, setFaqSearch] = useState('')

    const faqs = [
        {
            q: "How do I install & run LibraDigit AI locally?",
            a: "LibraDigit AI runs via a lightweight local environment. Run '.\\run-app.bat' on Windows or 'npm run dev' alongside 'python server.py' in the backend directory. No external cloud connections are required."
        },
        {
            q: "Tesseract OCR engine not found or path error?",
            a: "Install Tesseract OCR 5.x on your host system and ensure the executable directory (e.g. C:\\Program Files\\Tesseract-OCR) is added to your system PATH variable. You can verify it by running 'tesseract --version' in your terminal."
        },
        {
            q: "How does the system handle scanned image-only PDFs?",
            a: "The ingestion pipeline automatically detects whether a PDF contains selectable text or scanned raster images. Image-only pages are rendered at high DPI and routed through neural OCR for character extraction."
        },
        {
            q: "What archival formats are generated upon preservation?",
            a: "Each document is converted into an ISO-compliant PDF/A-1b with embedded XMP metadata and a BagIt (RFC 8493) directory package with MD5/SHA-512 manifest checksums."
        },
        {
            q: "Can I digitize handwritten manuscripts and charters?",
            a: "Yes! Use the 'Single Ingest & OCR' module with Advanced OCR enabled, or select 'Convert Handwritten Image to Searchable PDF' to segment handwritten lines and synthesize structured typography."
        },
        {
            q: "Where is my document data stored?",
            a: "All ingested scans, OCR layers, metadata files, and BagIt packages are stored exclusively in your local application directory. Zero cloud syncing or telemetry is transmitted."
        }
    ]

    const filteredFaqs = faqs.filter(
        item => item.q.toLowerCase().includes(faqSearch.toLowerCase()) || item.a.toLowerCase().includes(faqSearch.toLowerCase())
    )

    return (
        <div className="help-page-container">
            {/* Hero Header */}
            <div className="help-hero-banner">
                <div className="hero-banner-left">
                    <div className="hero-status-pill">
                        <ShieldCheck size={14} className="icon-emerald" />
                        <span>Sovereign Archival Documentation • v1.2.0</span>
                    </div>
                    <h1>Knowledge Base & Compliance Guide</h1>
                    <p>Comprehensive manual for digitization workflows, neural OCR tuning, BagIt preservation, and offline privacy guarantees.</p>
                </div>
            </div>

            {/* Interactive Tab Ribbon */}
            <div className="help-tabs-bar">
                <button
                    type="button"
                    className={`help-tab ${activeTab === 'workflow' ? 'active' : ''}`}
                    onClick={() => setActiveTab('workflow')}
                >
                    <Layers size={16} />
                    <span>Workflow Guide</span>
                </button>
                <button
                    type="button"
                    className={`help-tab ${activeTab === 'features' ? 'active' : ''}`}
                    onClick={() => setActiveTab('features')}
                >
                    <Sparkles size={16} />
                    <span>Core Features</span>
                </button>
                <button
                    type="button"
                    className={`help-tab ${activeTab === 'faqs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('faqs')}
                >
                    <HelpCircle size={16} />
                    <span>Troubleshooting & FAQ</span>
                </button>
                <button
                    type="button"
                    className={`help-tab ${activeTab === 'privacy' ? 'active' : ''}`}
                    onClick={() => setActiveTab('privacy')}
                >
                    <Lock size={16} />
                    <span>Privacy & Trust</span>
                </button>
                <button
                    type="button"
                    className={`help-tab ${activeTab === 'about' ? 'active' : ''}`}
                    onClick={() => setActiveTab('about')}
                >
                    <BookOpen size={16} />
                    <span>About & Support</span>
                </button>
            </div>

            {/* TAB CONTENT: 1. WORKFLOW GUIDE */}
            {activeTab === 'workflow' && (
                <div className="help-content-section">
                    <div className="section-title-box">
                        <h2>5-Stage Sovereign Preservation Pipeline</h2>
                        <p>How physical manuscripts and digital files transition into permanent archival assets.</p>
                    </div>

                    <div className="pipeline-steps-grid">
                        <div className="pipeline-step-card">
                            <div className="step-badge">01</div>
                            <div className="step-icon-wrap primary"><FileText size={20} /></div>
                            <h3>Ingest & Extraction</h3>
                            <p>Upload scanned PDFs, TIFFs, or JPEGs. The dual-pass engine analyzes page structure and applies OCR.</p>
                        </div>

                        <div className="pipeline-step-card">
                            <div className="step-badge">02</div>
                            <div className="step-icon-wrap warning"><Sparkles size={20} /></div>
                            <h3>Cleanup Studio</h3>
                            <p>Review OCR text side-by-side with original scans. Fix typos and inspect live PDF preview drafts.</p>
                        </div>

                        <div className="pipeline-step-card">
                            <div className="step-badge">03</div>
                            <div className="step-icon-wrap info"><Cpu size={20} /></div>
                            <h3>Metadata Studio</h3>
                            <p>Generate Dublin Core and MARC21 descriptive metadata with AI entity auto-extraction.</p>
                        </div>

                        <div className="pipeline-step-card">
                            <div className="step-badge">04</div>
                            <div className="step-icon-wrap success"><CheckCircle2 size={20} /></div>
                            <h3>BagIt Preservation</h3>
                            <p>Build ISO-standard BagIt package (RFC 8493) with cryptographic manifests and PDF/A-1b assets.</p>
                        </div>

                        <div className="pipeline-step-card">
                            <div className="step-badge">05</div>
                            <div className="step-icon-wrap primary"><Search size={20} /></div>
                            <h3>Archive Search</h3>
                            <p>Query your repository with full-text fuzzy matching, metadata filtering, and instant exports.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: 2. CORE FEATURES */}
            {activeTab === 'features' && (
                <div className="help-content-section">
                    <div className="section-title-box">
                        <h2>Engine Capabilities & Archival Tooling</h2>
                        <p>High-performance features engineered for institutions, archivists, and research centers.</p>
                    </div>

                    <div className="features-showcase-grid">
                        <div className="help-feature-card">
                            <div className="feat-icon-box primary"><Layers size={22} /></div>
                            <h3>Batch Ingest Queue</h3>
                            <p>Ingest complete folder hierarchies of manuscripts and process hundreds of documents in parallel threads.</p>
                        </div>

                        <div className="help-feature-card">
                            <div className="feat-icon-box success"><Lock size={22} /></div>
                            <h3>100% Air-Gapped Privacy</h3>
                            <p>Operates entirely locally with zero cloud dependencies. No sensitive records ever leave your sovereign hardware.</p>
                        </div>

                        <div className="help-feature-card">
                            <div className="feat-icon-box info"><Search size={22} /></div>
                            <h3>Full-Text Search Engine</h3>
                            <p>Instant search across your complete corpus with exact snippet highlighting, date ranges, and subject filters.</p>
                        </div>

                        <div className="help-feature-card">
                            <div className="feat-icon-box warning"><Cpu size={22} /></div>
                            <h3>Dual Neural OCR Support</h3>
                            <p>Switch between Tesseract 5.x Neural LSTM and local GLM-OCR vision architectures for complex layouts.</p>
                        </div>

                        <div className="help-feature-card">
                            <div className="feat-icon-box primary"><FileText size={22} /></div>
                            <h3>ISO PDF/A-1b Generation</h3>
                            <p>Embeds searchable OCR text layers and Dublin Core XMP metadata into future-proof archival standards.</p>
                        </div>

                        <div className="help-feature-card">
                            <div className="feat-icon-box success"><Server size={22} /></div>
                            <h3>BagIt Package Exports</h3>
                            <p>Generates verifiable BagIt packages with MD5 checksums ready for library repository deposits.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: 3. TROUBLESHOOTING & FAQS */}
            {activeTab === 'faqs' && (
                <div className="help-content-section">
                    <div className="faq-search-wrapper">
                        <Search size={18} className="faq-search-icon" />
                        <input
                            type="text"
                            placeholder="Search troubleshooting questions, setup guides, error codes..."
                            value={faqSearch}
                            onChange={(e) => setFaqSearch(e.target.value)}
                        />
                    </div>

                    <div className="faq-accordion-list">
                        {filteredFaqs.map((faq, index) => (
                            <details key={index} className="modern-faq-item" open={index === 0}>
                                <summary className="faq-summary">
                                    <span className="faq-q-text">{faq.q}</span>
                                    <ChevronDown size={16} className="faq-chevron" />
                                </summary>
                                <div className="faq-answer-body">
                                    <p>{faq.a}</p>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: 4. PRIVACY & COMPLIANCE */}
            {activeTab === 'privacy' && (
                <div className="help-content-section">
                    <div className="section-title-box">
                        <h2>Trust, Sovereignty & Legal Compliance</h2>
                        <p>Guarantees for institutions, legal entities, and privacy-critical organizations.</p>
                    </div>

                    <div className="privacy-cards-grid">
                        <div className="privacy-detail-card">
                            <div className="pcard-icon emerald"><Lock size={24} /></div>
                            <h3>Zero Cloud Telemetry Guarantee</h3>
                            <p>LibraDigit AI has no external analytical beacons, telemetry pings, or tracking cookies. All compute happens inside your local machine runtime.</p>
                        </div>

                        <div className="privacy-detail-card">
                            <div className="pcard-icon sapphire"><ShieldCheck size={24} /></div>
                            <h3>ISO Archival Compliance</h3>
                            <p>Full support for ISO 19005 (PDF/A-1b), RFC 8493 (BagIt specification), and ANSI/NISO Z39.85 (Dublin Core metadata standards).</p>
                        </div>

                        <div className="privacy-detail-card">
                            <div className="pcard-icon info"><BookOpen size={24} /></div>
                            <h3>Permissive Open Source Licensing</h3>
                            <p>Distributed under the MIT License. Free for academic, government, commercial, and personal archival use without subscription locks.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: 5. ABOUT & SUPPORT */}
            {activeTab === 'about' && (
                <div className="help-content-section">
                    <div className="about-creator-card">
                        <div className="creator-profile-info">
                            <div className="creator-avatar">KT</div>
                            <div className="creator-text">
                                <h3>Karthikeyan T</h3>
                                <p className="creator-role">Lead Architect & Archival Systems Specialist</p>
                                <p className="creator-bio">Designed to empower librarians, researchers, historians, and archivists worldwide with sovereign digital preservation tools.</p>
                            </div>
                        </div>

                        <div className="creator-contact-links">
                            <a href="mailto:tkarthikeyan@gmail.com" className="contact-link-pill">
                                <Mail size={16} />
                                <span>tkarthikeyan@gmail.com</span>
                            </a>
                            <a href="https://github.com/carthworks" target="_blank" rel="noopener noreferrer" className="contact-link-pill">
                                <Github size={16} />
                                <span>github.com/carthworks</span>
                                <ExternalLink size={12} />
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Help
