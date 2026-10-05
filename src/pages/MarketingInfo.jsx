import { useState } from 'react'
import {
    ShieldCheck,
    Lock,
    FileText,
    Cpu,
    ArrowRight,
    CheckCircle2,
    XCircle,
    Database,
    Landmark,
    GraduationCap,
    Scale,
    ChevronDown,
    ChevronUp,
    Send,
    ArrowLeft
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import LogoLoader from '../components/LogoLoader'

const MarketingInfo = ({ isLoggedIn, onOpenLogin }) => {
    const navigate = useNavigate()
    const [openFaq, setOpenFaq] = useState(0)
    const [formSubmitted, setFormSubmitted] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        institution: '',
        collectionSize: '1,000 - 10,000 pages',
        message: ''
    })

    const faqs = [
        {
            q: "How does LibraDigit AI guarantee 100% data sovereignty and privacy?",
            a: "LibraDigit AI is built from the ground up as a local-first application. All image deskewing, binarization, neural OCR extraction, Dublin Core metadata tagging, and full-text indexation execute entirely on your machine. No documents, metadata, or telemetry are ever transmitted to third-party cloud servers."
        },
        {
            q: "What archival and bibliographic standards are supported out-of-the-box?",
            a: "We natively support Dublin Core Metadata Element Set (DCMES, ISO 15836), MARC21 Bibliographic formats, ALTO-XML, TEI (Text Encoding Initiative), and archival-grade dual-layer PDF/A-1b and PDF/A-2b preservation outputs."
        },
        {
            q: "Can the system handle damaged, historical, or low-contrast physical documents?",
            a: "Yes. LibraDigit AI includes an intelligent pre-processing cleanup pipeline with adaptive thresholding (Otsu + Sauvola algorithms), high dynamic range contrast stretching, automatic skew correction up to ±45°, and noise speckle reduction designed specifically for aged manuscripts and yellowed pulp paper."
        },
        {
            q: "How does the batch processing pipeline perform on high-volume archives?",
            a: "The multi-threaded ingestion queue processes concurrent page streams with sub-second page turnover. A standard multi-core workstation can process between 1,200 to 3,500 archival pages per hour with full OCR and metadata extraction."
        },
        {
            q: "Can I integrate LibraDigit AI with existing Repository Systems like DSpace, Koha, or Fedora?",
            a: "Yes. Exported archive bundles include standard METS/MODS, Dublin Core RDF/XML, and JSON-LD manifest files that can be ingested directly into institutional repositories and library management systems without manual reformatting."
        }
    ]

    const handleFormSubmit = (e) => {
        e.preventDefault()
        setFormSubmitted(true)
    }

    return (
        <div className="marketing-container">
            {/* Top Navigation */}
            <header className="marketing-nav">
                <div className="marketing-nav-inner">
                    <div className="marketing-brand">
                        <Link to="/landing" className="brand-link">
                            <LogoLoader size="sm" />
                            <div className="brand-text">
                                <span className="brand-title">LibraDigit AI</span>
                                <span className="brand-tag">Product & Solution Overview</span>
                            </div>
                        </Link>
                    </div>

                    <div className="marketing-nav-actions">
                        <Link to="/landing" className="btn-back-link">
                            <ArrowLeft size={16} />
                            <span>Back to Landing</span>
                        </Link>
                        {isLoggedIn ? (
                            <button
                                className="btn-action-primary"
                                onClick={() => navigate('/')}
                            >
                                <span>Go to Workspace</span>
                                <ArrowRight size={16} />
                            </button>
                        ) : (
                            <Link to="/landing" className="btn-action-primary">
                                <Lock size={16} />
                                <span>Sign In / Launch</span>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="marketing-hero">
                <div className="marketing-hero-inner">
                    <div className="hero-pill">
                        <Landmark size={14} />
                        <span>Institutional-Grade Preservation Technology</span>
                    </div>

                    <h1 className="marketing-headline">
                        The Sovereign AI Standard for <span className="gradient-text">Physical Record Digitization</span>
                    </h1>

                    <p className="marketing-subheadline">
                        A comprehensive architectural overview of LibraDigit AI: engineered to empower libraries, museums, academic research facilities, and government registries with air-gapped OCR accuracy, standard cataloging, and permanent archival search.
                    </p>

                    <div className="hero-button-row">
                        <a href="#comparison" className="btn-mkt-primary">
                            <span>Compare Architecture & Capabilities</span>
                            <ArrowRight size={16} />
                        </a>
                        <a href="#inquiry" className="btn-mkt-secondary">
                            <span>Institutional Inquiries</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* Competitive Comparison Matrix */}
            <section className="marketing-comparison" id="comparison">
                <div className="section-header-centered">
                    <span className="section-badge">Solution Matrix</span>
                    <h2>Architectural Comparison</h2>
                    <p>How LibraDigit AI compares against traditional cloud OCR APIs and legacy desktop tools.</p>
                </div>

                <div className="table-responsive-wrapper">
                    <table className="comparison-table">
                        <thead>
                            <tr>
                                <th>Feature / Capability</th>
                                <th className="highlight-col">LibraDigit AI</th>
                                <th>Cloud APIs (AWS/Google)</th>
                                <th>Legacy Desktop (ABBYY)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Data Privacy & Air-Gap</strong></td>
                                <td className="highlight-col">
                                    <span className="badge-pass"><CheckCircle2 size={14} /> 100% On-Device / Air-Gapped</span>
                                </td>
                                <td>
                                    <span className="badge-fail"><XCircle size={14} /> Cloud Upload Required</span>
                                </td>
                                <td>
                                    <span className="badge-warn">Local, but requires online licensing</span>
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Dublin Core & MARC21 Auto-Tagging</strong></td>
                                <td className="highlight-col">
                                    <span className="badge-pass"><CheckCircle2 size={14} /> Native Schema Generator</span>
                                </td>
                                <td>
                                    <span className="badge-fail"><XCircle size={14} /> Raw text only (no schema)</span>
                                </td>
                                <td>
                                    <span className="badge-fail"><XCircle size={14} /> Limited / Manual</span>
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Historic Document Image Restoration</strong></td>
                                <td className="highlight-col">
                                    <span className="badge-pass"><CheckCircle2 size={14} /> Adaptive Sauvola + De-skew</span>
                                </td>
                                <td>
                                    <span className="badge-warn">Basic thresholding</span>
                                </td>
                                <td>
                                    <span className="badge-pass"><CheckCircle2 size={14} /> Desktop filters</span>
                                </td>
                            </tr>
                            <tr>
                                <td><strong>High-Volume Concurrent Batch Pipeline</strong></td>
                                <td className="highlight-col">
                                    <span className="badge-pass"><CheckCircle2 size={14} /> Multi-threaded local queue</span>
                                </td>
                                <td>
                                    <span className="badge-pass"><CheckCircle2 size={14} /> Cloud batch (cost per page)</span>
                                </td>
                                <td>
                                    <span className="badge-warn">Single-job serial processing</span>
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Integrated Full-Text Search Engine</strong></td>
                                <td className="highlight-col">
                                    <span className="badge-pass"><CheckCircle2 size={14} /> Instant sub-second SQLite FTS5</span>
                                </td>
                                <td>
                                    <span className="badge-fail"><XCircle size={14} /> Requires external database</span>
                                </td>
                                <td>
                                    <span className="badge-warn">File-by-file search</span>
                                </td>
                            </tr>
                            <tr>
                                <td><strong>Pricing Model & Recurring Cost</strong></td>
                                <td className="highlight-col">
                                    <span className="badge-pass"><CheckCircle2 size={14} /> Sovereign / Zero API Fees</span>
                                </td>
                                <td>
                                    <span className="badge-fail"><XCircle size={14} /> Expensive per-page cloud bills</span>
                                </td>
                                <td>
                                    <span className="badge-fail"><XCircle size={14} /> High seat/page licensing limits</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Technical Specifications */}
            <section className="marketing-specs">
                <div className="section-header-centered">
                    <span className="section-badge">Technical Specs</span>
                    <h2>Engine Specifications & Interoperability</h2>
                    <p>Designed to fit cleanly into existing archival infrastructure with zero friction.</p>
                </div>

                <div className="specs-grid">
                    <div className="spec-card">
                        <div className="spec-icon"><Cpu size={22} /></div>
                        <h3>OCR Recognition Engine</h3>
                        <ul>
                            <li><strong>Core Model:</strong> Tesseract 5.x with LSTM Neural Networks</li>
                            <li><strong>Character Sets:</strong> Latin, Cyrillic, Greek, Arabic, Devanagari, CJK</li>
                            <li><strong>Segmentation:</strong> Page layout analysis with column & table detection</li>
                            <li><strong>Confidence Metrics:</strong> Word and character level probability scoring</li>
                        </ul>
                    </div>

                    <div className="spec-card">
                        <div className="spec-icon"><Database size={22} /></div>
                        <h3>Metadata & Bibliographic Schemas</h3>
                        <ul>
                            <li><strong>Dublin Core (DCMES):</strong> 15 core elements + extended qualified terms</li>
                            <li><strong>MARC21:</strong> Leader, Control fields, and 1xx/2xx/5xx/6xx variable tags</li>
                            <li><strong>Interchange Formats:</strong> JSON-LD, Dublin Core RDF/XML, TEI P5</li>
                            <li><strong>Identifier Resolution:</strong> ISBN, ISSN, DOI, Handle, and Local Shelfmarks</li>
                        </ul>
                    </div>

                    <div className="spec-card">
                        <div className="spec-icon"><FileText size={22} /></div>
                        <h3>Preservation Export Formats</h3>
                        <ul>
                            <li><strong>PDF/A:</strong> ISO 19005 compliant PDF/A-1b & PDF/A-2b dual-layer text</li>
                            <li><strong>XML Schemas:</strong> ALTO XML (v4.2), hOCR, and METS container manifests</li>
                            <li><strong>Cleaned Imagery:</strong> Lossless TIFF, uncompressed PNG, high-Q JPEG</li>
                            <li><strong>Raw Data:</strong> Structured JSON transcripts with word-level bounding boxes</li>
                        </ul>
                    </div>

                    <div className="spec-card">
                        <div className="spec-icon"><ShieldCheck size={22} /></div>
                        <h3>Security & System Architecture</h3>
                        <ul>
                            <li><strong>Authentication:</strong> Bcrypt salt hashing with local session protection</li>
                            <li><strong>Database:</strong> Embedded SQLite 3 with FTS5 inverted text index</li>
                            <li><strong>Telemetry:</strong> 0 outbound requests; fully air-gap certified</li>
                            <li><strong>Accessibility:</strong> WCAG 2.1 AA compliant keyboard & screen-reader UI</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Institutional Use Cases */}
            <section className="marketing-usecases">
                <div className="section-header-centered">
                    <span className="section-badge">Proven Impact</span>
                    <h2>Engineered for High-Stakes Archival Workflows</h2>
                </div>

                <div className="usecase-grid">
                    <div className="usecase-item">
                        <div className="usecase-header">
                            <Landmark size={20} className="icon-org" />
                            <h4>National & State Heritage Collections</h4>
                        </div>
                        <p>Digitizing 18th and 19th-century municipal gazettes, historical charters, and delicate manuscript collections without exposing precious records to external networks.</p>
                        <div className="usecase-tag">Result: 4.8x faster ingestion throughput</div>
                    </div>

                    <div className="usecase-item">
                        <div className="usecase-header">
                            <GraduationCap size={20} className="icon-org" />
                            <h4>University Special Collections & Theses</h4>
                        </div>
                        <p>Converting hundreds of thousands of doctoral dissertations, research papers, and faculty ledgers into an automated Dublin Core digital research library.</p>
                        <div className="usecase-tag">Result: 100% automated metadata compliance</div>
                    </div>

                    <div className="usecase-item">
                        <div className="usecase-header">
                            <Scale size={20} className="icon-org" />
                            <h4>Judicial & Legal Document Repositories</h4>
                        </div>
                        <p>Processing confidential court dockets, land deed registries, and historical statutes with tamper-proof local storage and granular full-text searchability.</p>
                        <div className="usecase-tag">Result: Zero cloud risk & FIPS compatibility</div>
                    </div>
                </div>
            </section>

            {/* FAQ Accordion */}
            <section className="marketing-faq">
                <div className="section-header-centered">
                    <span className="section-badge">Frequently Asked Questions</span>
                    <h2>Technical & Operational Inquiries</h2>
                </div>

                <div className="faq-list">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className={`faq-card ${openFaq === index ? 'active' : ''}`}
                            onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                        >
                            <div className="faq-question">
                                <h3>{faq.q}</h3>
                                {openFaq === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </div>
                            {openFaq === index && (
                                <div className="faq-answer">
                                    <p>{faq.a}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Inquiry Form */}
            <section className="marketing-inquiry" id="inquiry">
                <div className="inquiry-card">
                    <div className="inquiry-header">
                        <h2>Institutional Inquiries & Deployment</h2>
                        <p>Looking to deploy LibraDigit AI across multiple scanning workstations or integrate with your institution's repository? Reach out below.</p>
                    </div>

                    {formSubmitted ? (
                        <div className="inquiry-success">
                            <CheckCircle2 size={48} className="success-icon" />
                            <h3>Inquiry Received</h3>
                            <p>Thank you for reaching out. Our digital preservation engineering team will respond within 1 business day.</p>
                            <button
                                className="btn-mkt-secondary"
                                onClick={() => setFormSubmitted(false)}
                            >
                                Submit Another Inquiry
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleFormSubmit} className="inquiry-form">
                            <div className="form-row">
                                <div className="form-field">
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Dr. Eleanor Vance"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Work / Institutional Email *</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="e.vance@archival-institute.org"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-field">
                                    <label>Institution / Organization *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="National Heritage Library"
                                        value={formData.institution}
                                        onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>Estimated Collection Size</label>
                                    <select
                                        value={formData.collectionSize}
                                        onChange={(e) => setFormData({ ...formData, collectionSize: e.target.value })}
                                    >
                                        <option>Under 1,000 pages</option>
                                        <option>1,000 - 10,000 pages</option>
                                        <option>10,000 - 100,000 pages</option>
                                        <option>100,000+ pages (Enterprise Archival)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-field">
                                <label>Project Description / Special Requirements</label>
                                <textarea
                                    rows={4}
                                    placeholder="Describe your digitization requirements, source languages, formats, or repository targets..."
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                ></textarea>
                            </div>

                            <button type="submit" className="btn-submit-inquiry">
                                <Send size={16} />
                                <span>Submit Institutional Inquiry</span>
                            </button>
                        </form>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="marketing-footer">
                <div className="footer-inner-clean">
                    <div className="footer-left">
                        <LogoLoader size="sm" />
                        <span>LibraDigit AI • Sovereign Archival Intelligence</span>
                    </div>
                    <div className="footer-right">
                        <Link to="/landing">Home</Link>
                        <Link to="/help">Help & Docs</Link>
                        <Link to="/">Launch App</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default MarketingInfo
