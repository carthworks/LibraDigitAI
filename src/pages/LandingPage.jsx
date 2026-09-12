import React, { useState, useEffect } from 'react'
import {
    ShieldCheck,
    Lock,
    Sparkles,
    Layers,
    FileText,
    Search,
    Cpu,
    ArrowRight,
    CheckCircle2,
    Database,
    Zap,
    BookOpen,
    FolderCheck,
    ChevronRight,
    ExternalLink,
    HelpCircle,
    Building2,
    Scale,
    GraduationCap,
    Landmark,
    X,
    Eye
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import LogoLoader from '../components/LogoLoader'
import LoginScreen from '../components/LoginScreen'
import './LandingPage.css'

const LandingPage = ({ onLogin, isLoggedIn }) => {
    const navigate = useNavigate()
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [activeTab, setActiveTab] = useState('overview')
    const [isFirstRun, setIsFirstRun] = useState(false)

    useEffect(() => {
        const storedHash = localStorage.getItem('auth_hash')
        setIsFirstRun(!storedHash)
    }, [])

    const handleLaunchWorkspace = () => {
        if (isLoggedIn) {
            navigate('/')
        } else {
            setShowLoginModal(true)
        }
    }

    return (
        <div className="landing-container">
            {/* Header / Navigation */}
            <header className="landing-nav">
                <div className="landing-nav-inner">
                    <div className="landing-brand">
                        <LogoLoader size="sm" />
                        <div className="brand-text">
                            <span className="brand-title">LibraDigit AI</span>
                            <span className="brand-tag">v1.2.0 • Local Archival AI</span>
                        </div>
                    </div>

                    <nav className="landing-nav-links">
                        <a href="#features">Features</a>
                        <a href="#solutions">Solutions</a>
                        <a href="#pipeline">Workflow</a>
                        <a href="#security">Security</a>
                        <Link to="/marketing" className="nav-highlight">Marketing Info</Link>
                    </nav>

                    <div className="landing-nav-actions">
                        {isLoggedIn ? (
                            <button
                                className="btn-primary-action"
                                onClick={() => navigate('/')}
                            >
                                <span>Enter Workspace</span>
                                <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button
                                className="btn-primary-action"
                                onClick={() => setShowLoginModal(true)}
                            >
                                <Lock size={16} />
                                <span>{isFirstRun ? 'Setup & Login' : 'Sign In'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="landing-hero">
                <div className="hero-content">
                    <div className="hero-badge">
                        <Sparkles size={14} />
                        <span>Next-Gen Archival Preservation & Multi-Engine OCR</span>
                    </div>

                    <h1 className="hero-headline">
                        Transform Physical Heritage Into <span className="gradient-text">AI-Searchable</span> Digital Archives
                    </h1>

                    <p className="hero-subheadline">
                        High-accuracy local OCR, automated image restoration, Dublin Core & MARC21 metadata generation, and instant full-text search—engineered for 100% privacy and air-gapped security.
                    </p>

                    <div className="hero-cta-group">
                        <button className="btn-hero-primary" onClick={handleLaunchWorkspace}>
                            <span>{isLoggedIn ? 'Launch Workspace' : (isFirstRun ? 'Initialize Secure Setup' : 'Access Archive System')}</span>
                            <ArrowRight size={18} />
                        </button>
                        <Link to="/marketing" className="btn-hero-secondary">
                            <BookOpen size={18} />
                            <span>Explore Marketing Overview</span>
                        </Link>
                    </div>

                    <div className="hero-trust-row">
                        <div className="trust-item">
                            <ShieldCheck size={16} className="trust-icon success" />
                            <span>100% Offline & Private</span>
                        </div>
                        <div className="trust-item">
                            <Cpu size={16} className="trust-icon primary" />
                            <span>Tesseract + AI Clean Engines</span>
                        </div>
                        <div className="trust-item">
                            <Database size={16} className="trust-icon accent" />
                            <span>Dublin Core & MARC21 Ready</span>
                        </div>
                    </div>
                </div>

                {/* Hero Interactive Preview Card */}
                <div className="hero-preview-wrapper">
                    <div className="preview-glass-card">
                        <div className="preview-card-header">
                            <div className="card-dots">
                                <span className="dot red"></span>
                                <span className="dot yellow"></span>
                                <span className="dot green"></span>
                            </div>
                            <span className="card-filename">MS-1842-Charter-Preservation.tif</span>
                            <span className="card-status-badge">AI Processed • 99.8% Conf.</span>
                        </div>

                        <div className="preview-split">
                            <div className="preview-pane-original">
                                <div className="pane-header">
                                    <Eye size={14} />
                                    <span>Archival Document Scan</span>
                                </div>
                                <div className="manuscript-mock">
                                    <div className="mock-seal"></div>
                                    <div className="mock-line title"></div>
                                    <div className="mock-line"></div>
                                    <div className="mock-line"></div>
                                    <div className="mock-line short"></div>
                                    <div className="mock-stamp">VERIFIED 1842</div>
                                </div>
                            </div>

                            <div className="preview-pane-extracted">
                                <div className="pane-header">
                                    <Sparkles size={14} />
                                    <span>Dual-Layer OCR & Metadata</span>
                                </div>
                                <div className="extracted-text-box">
                                    <code>
                                        <span className="token-keyword">title:</span> "Municipal Charter of Royal Registry"<br />
                                        <span className="token-keyword">creator:</span> "Archival Guild of Record Keepers"<br />
                                        <span className="token-keyword">date:</span> "1842-10-14" (Validated ISO-8601)<br />
                                        <span className="token-keyword">language:</span> "Latin / Early English (lat, eng)"<br />
                                        <span className="token-keyword">format:</span> "application/pdf+a (Dual-Layer)"
                                    </code>
                                </div>
                                <div className="preview-tag-list">
                                    <span className="chip-tag">Dublin Core</span>
                                    <span className="chip-tag">Auto-Deskewed</span>
                                    <span className="chip-tag">Binarized</span>
                                    <span className="chip-tag">Fuzzy Indexed</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Metrics Showcase */}
            <section className="landing-metrics">
                <div className="metric-card">
                    <div className="metric-number">99.8%</div>
                    <div className="metric-label">OCR Character Accuracy</div>
                    <div className="metric-desc">Dual-pass engine optimized for historical and degraded fonts</div>
                </div>
                <div className="metric-card">
                    <div className="metric-number">0 bytes</div>
                    <div className="metric-label">External Telemetry</div>
                    <div className="metric-desc">All processing executes locally in an air-gapped runtime</div>
                </div>
                <div className="metric-card">
                    <div className="metric-number">10x</div>
                    <div className="metric-label">Batch Throughput</div>
                    <div className="metric-desc">Multi-threaded concurrent page deskewing and OCR pipeline</div>
                </div>
                <div className="metric-card">
                    <div className="metric-number">100%</div>
                    <div className="metric-label">Standards Compliance</div>
                    <div className="metric-desc">Dublin Core, MARC21, PDF/A-1b, and TEI-XML export schemas</div>
                </div>
            </section>

            {/* Core Features Grid */}
            <section className="landing-features" id="features">
                <div className="landing-section-header">
                    <span className="landing-section-eyebrow">Enterprise Capabilities</span>
                    <h2 className="landing-section-title">Engineered for Curators, Librarians & Archivists</h2>
                    <p className="landing-section-subtitle">
                        Everything required to ingest, clean, extract, catalog, and preserve complex physical media collections in high fidelity.
                    </p>
                </div>

                <div className="landing-features-grid">
                    <div className="landing-feature-card">
                        <div className="landing-feature-icon-box primary">
                            <Sparkles size={24} />
                        </div>
                        <h3>Multi-Engine AI OCR</h3>
                        <p>Adaptive binarization, edge smoothing, deskewing, and high-precision text recognition for modern prints and historic manuscripts.</p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="landing-feature-icon-box accent">
                            <Layers size={24} />
                        </div>
                        <h3>High-Volume Batch Processing</h3>
                        <p>Feed entire folders of high-resolution TIFF, JPG, and PDF scans with live status monitoring, automated queuing, and batch export.</p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="landing-feature-icon-box success">
                            <FileText size={24} />
                        </div>
                        <h3>Dublin Core & MARC21 Tagging</h3>
                        <p>Smart metadata suggestions with structured cataloging fields, automatic date resolution, and standardized vocabulary mapping.</p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="landing-feature-icon-box warning">
                            <Search size={24} />
                        </div>
                        <h3>Deep Full-Text Search</h3>
                        <p>Instant keyword, wildcard, and fuzzy search across your entire repository with OCR confidence scoring and highlighted snippets.</p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="landing-feature-icon-box info">
                            <Cpu size={24} />
                        </div>
                        <h3>Document Cleanup & Restoration</h3>
                        <p>Interactive contrast stretching, deskewing, background noise erasing, and border cropping before text extraction.</p>
                    </div>

                    <div className="landing-feature-card">
                        <div className="landing-feature-icon-box primary">
                            <ShieldCheck size={24} />
                        </div>
                        <h3>Air-Gapped Privacy & Security</h3>
                        <p>Bcrypt password-protected local storage, zero third-party cloud dependence, and complete compliance with institutional data governance.</p>
                    </div>
                </div>
            </section>

            {/* Interactive Pipeline Showcase */}
            <section className="landing-pipeline" id="pipeline">
                <div className="landing-section-header">
                    <span className="landing-section-eyebrow">End-to-End Workflow</span>
                    <h2 className="landing-section-title">The Five-Step Archival Digitization Pipeline</h2>
                    <p className="landing-section-subtitle">
                        From raw scanned imagery to a fully indexed, archival-grade preservation repository in minutes.
                    </p>
                </div>

                <div className="landing-pipeline-grid">
                    <div className="landing-pipeline-card">
                        <div className="landing-step-badge">01</div>
                        <div className="landing-step-icon"><FolderCheck size={22} /></div>
                        <h4>1. Ingest Scans</h4>
                        <p>Drag and drop multi-page PDFs, high-res TIFFs, or batch directory scans.</p>
                    </div>

                    <div className="landing-pipeline-card">
                        <div className="landing-step-badge">02</div>
                        <div className="landing-step-icon"><Zap size={22} /></div>
                        <h4>2. AI Clean & Deskew</h4>
                        <p>Automated rotation, skew correction, thresholding, and speckle removal.</p>
                    </div>

                    <div className="landing-pipeline-card">
                        <div className="landing-step-badge">03</div>
                        <div className="landing-step-icon"><Sparkles size={22} /></div>
                        <h4>3. Dual-Pass OCR</h4>
                        <p>Multi-language text extraction with bounding box coordinates and confidence levels.</p>
                    </div>

                    <div className="landing-pipeline-card">
                        <div className="landing-step-badge">04</div>
                        <div className="landing-step-icon"><Database size={22} /></div>
                        <h4>4. Metadata Tagging</h4>
                        <p>Dublin Core / MARC21 schema tagging with AI title and author inference.</p>
                    </div>

                    <div className="landing-pipeline-card">
                        <div className="landing-step-badge">05</div>
                        <div className="landing-step-icon"><Search size={22} /></div>
                        <h4>5. Index & Export</h4>
                        <p>Searchable PDF/A generation, SQLite full-text indexation, and archive package export.</p>
                    </div>
                </div>
            </section>

            {/* Target Solutions */}
            <section className="landing-solutions" id="solutions">
                <div className="landing-section-header">
                    <span className="landing-section-eyebrow">Industry Solutions</span>
                    <h2 className="landing-section-title">Tailored for Heritage, Legal & Academic Institutions</h2>
                </div>

                <div className="landing-solutions-grid">
                    <div className="landing-solution-card">
                        <div className="solution-icon-wrap"><Landmark size={24} /></div>
                        <h3>Heritage Libraries & Museums</h3>
                        <p>Digitize rare manuscripts, historical newspapers, and fragile ledger books with delicate preservation care and zero risk of data loss.</p>
                        <ul className="solution-list">
                            <li><CheckCircle2 size={16} /> Preservation-grade PDF/A-1b</li>
                            <li><CheckCircle2 size={16} /> High dynamic range image cleanup</li>
                        </ul>
                    </div>

                    <div className="landing-solution-card">
                        <div className="solution-icon-wrap"><GraduationCap size={24} /></div>
                        <h3>Universities & Research Centers</h3>
                        <p>Transform special collections, theses, journals, and scientific archives into instantly searchable, citation-ready research databases.</p>
                        <ul className="solution-list">
                            <li><CheckCircle2 size={16} /> Dublin Core schema validation</li>
                            <li><CheckCircle2 size={16} /> Multi-language OCR recognition</li>
                        </ul>
                    </div>

                    <div className="landing-solution-card">
                        <div className="solution-icon-wrap"><Scale size={24} /></div>
                        <h3>Legal & Government Registries</h3>
                        <p>Process sensitive court documents, municipal registers, and confidential contracts under strict air-gapped compliance requirements.</p>
                        <ul className="solution-list">
                            <li><CheckCircle2 size={16} /> Zero external cloud transmission</li>
                            <li><CheckCircle2 size={16} /> Audit trail & local encryption</li>
                        </ul>
                    </div>

                    <div className="landing-solution-card">
                        <div className="solution-icon-wrap"><Building2 size={24} /></div>
                        <h3>Corporate & Media Archives</h3>
                        <p>Centralize decades of legacy documentation, engineering drawings, and press clippings into a scalable digital intelligence hub.</p>
                        <ul className="solution-list">
                            <li><CheckCircle2 size={16} /> High-throughput batch ingestion</li>
                            <li><CheckCircle2 size={16} /> Sub-second full-text retrieval</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Security & Air-Gapped Architecture Section */}
            <section className="landing-security" id="security">
                <div className="landing-section-header">
                    <span className="landing-section-eyebrow">Zero-Trust & Sovereignty</span>
                    <h2 className="landing-section-title">Institutional Security & Air-Gapped Architecture</h2>
                    <p className="landing-section-subtitle">
                        Engineered from the ground up for strict confidentiality, complete cryptographic privacy, and compliance with high-security heritage, legal, and government environments.
                    </p>
                </div>

                <div className="landing-security-grid">
                    <div className="landing-security-card">
                        <div className="security-icon-box success">
                            <ShieldCheck size={28} />
                        </div>
                        <h3>100% Air-Gapped Processing</h3>
                        <p>Every single operation—including dual-pass OCR, image binarization, deskewing, and metadata parsing—runs strictly on local hardware with zero external API calls.</p>
                        <div className="security-badge-pill">Zero Cloud Telemetry</div>
                    </div>

                    <div className="landing-security-card">
                        <div className="security-icon-box primary">
                            <Lock size={28} />
                        </div>
                        <h3>Bcrypt Cryptographic Authentication</h3>
                        <p>Local archive access is protected with salted bcrypt key derivation. Your master passphrase never leaves your device memory.</p>
                        <div className="security-badge-pill">Salted Key Derivation</div>
                    </div>

                    <div className="landing-security-card">
                        <div className="security-icon-box accent">
                            <Database size={28} />
                        </div>
                        <h3>Local Storage & Sovereign Database</h3>
                        <p>Documents and full-text inverted indexes are persisted in embedded SQLite databases on your local file system, granting you absolute physical ownership.</p>
                        <div className="security-badge-pill">Embedded SQLite 3 & FTS5</div>
                    </div>

                    <div className="landing-security-card">
                        <div className="security-icon-box info">
                            <Scale size={28} />
                        </div>
                        <h3>Regulatory & Preservation Compliance</h3>
                        <p>Designed for compliance with FIPS 140-2 environments, HIPAA/GDPR data sovereignty mandates, and ISO 19005 (PDF/A) preservation standards.</p>
                        <div className="security-badge-pill">ISO 19005 & Dublin Core</div>
                    </div>
                </div>
            </section>

            {/* CTA Banner */}
            <section className="landing-cta-banner">
                <div className="cta-banner-content">
                    <h2>Ready to Digitize Your Physical Heritage?</h2>
                    <p>Start digitizing and archiving today with full offline security and state-of-the-art AI accuracy.</p>
                    <div className="cta-btn-group">
                        <button className="btn-hero-primary" onClick={handleLaunchWorkspace}>
                            <span>{isLoggedIn ? 'Go to Application Workspace' : 'Sign In / Get Started'}</span>
                            <ArrowRight size={18} />
                        </button>
                        <Link to="/marketing" className="btn-hero-secondary">
                            <span>Read Complete Marketing Deck</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-inner">
                    <div className="footer-col brand">
                        <div className="footer-brand">
                            <LogoLoader size="sm" />
                            <span>LibraDigit AI</span>
                        </div>
                        <p>The sovereign, local-first artificial intelligence platform for physical record digitization and archival preservation.</p>
                        <div className="footer-badge">
                            <ShieldCheck size={14} />
                            <span>Air-Gapped & WCAG 2.1 AA Compliant</span>
                        </div>
                    </div>

                    <div className="footer-col">
                        <h4>Product</h4>
                        <a href="#features">Features</a>
                        <a href="#pipeline">Workflow</a>
                        <a href="#solutions">Solutions</a>
                        <Link to="/marketing">Marketing Overview</Link>
                    </div>

                    <div className="footer-col">
                        <h4>Application</h4>
                        {isLoggedIn ? (
                            <>
                                <Link to="/">Dashboard</Link>
                                <Link to="/upload">OCR Upload</Link>
                                <Link to="/batch">Batch Processing</Link>
                                <Link to="/search">Archive Search</Link>
                            </>
                        ) : (
                            <>
                                <button className="footer-link-btn" onClick={() => setShowLoginModal(true)}>Sign In</button>
                                <button className="footer-link-btn" onClick={() => setShowLoginModal(true)}>Security Setup</button>
                                <Link to="/help">Help Center</Link>
                            </>
                        )}
                    </div>

                    <div className="footer-col">
                        <h4>Standards & Security</h4>
                        <span>Dublin Core Metadata</span>
                        <span>MARC21 Standard</span>
                        <span>Bcrypt Local Hashing</span>
                        <span>Zero Telemetry Policy</span>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© 2026 LibraDigit AI. All rights reserved. Crafted for archival sovereignty.</p>
                    <div className="footer-bottom-links">
                        <Link to="/marketing">Product Tour</Link>
                        <span className="dot-sep">•</span>
                        <Link to="/help">Documentation</Link>
                    </div>
                </div>
            </footer>

            {/* Interactive Login, Registration & Password Reset Modal */}
            {showLoginModal && (
                <LoginScreen
                    isModal={true}
                    onClose={() => setShowLoginModal(false)}
                    onLogin={() => {
                        if (onLogin) onLogin()
                        setShowLoginModal(false)
                        navigate('/')
                    }}
                />
            )}
        </div>
    )
}

export default LandingPage
