import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
    ShieldCheck, Lock, RefreshCw, Info, Mail,
    CreditCard, Cookie, CheckCircle2, ArrowLeft,
    ExternalLink, MapPin, Clock, Send, Scale
} from 'lucide-react'
import LogoLoader from '../components/LogoLoader'
import './TrustCenter.css'

const TrustCenter = () => {
    const location = useLocation()
    const navigate = useNavigate()

    // Map path to active tab
    const getTabFromPath = (pathname) => {
        if (pathname.includes('/privacy')) return 'privacy'
        if (pathname.includes('/terms')) return 'terms'
        if (pathname.includes('/refund')) return 'refund'
        if (pathname.includes('/about')) return 'about'
        if (pathname.includes('/contact')) return 'contact'
        if (pathname.includes('/pricing')) return 'pricing'
        if (pathname.includes('/cookies')) return 'cookies'
        return 'overview'
    }

    const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname))
    const [contactSubmitted, setContactSubmitted] = useState(false)
    const [contactForm, setContactForm] = useState({
        name: '',
        email: '',
        subject: 'General Trust & Compliance Inquiry',
        message: '',
        consent: false
    })

    useEffect(() => {
        const tab = getTabFromPath(location.pathname)
        setActiveTab(tab)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }, [location.pathname])

    const handleTabChange = (tabKey) => {
        setActiveTab(tabKey)
        const pathMap = {
            overview: '/trust',
            privacy: '/privacy',
            terms: '/terms',
            refund: '/refund',
            about: '/about',
            contact: '/contact',
            pricing: '/pricing',
            cookies: '/cookies'
        }
        navigate(pathMap[tabKey] || '/trust')
    }

    const handleContactSubmit = (e) => {
        e.preventDefault()
        if (!contactForm.consent) return
        setContactSubmitted(true)
    }

    return (
        <div className="trust-page-container">
            {/* Header Navigation Bar */}
            <header className="trust-top-nav">
                <div className="nav-inner">
                    <Link to="/" className="trust-brand">
                        <LogoLoader size="sm" />
                        <span className="brand-text">LibraDigit AI</span>
                        <span className="brand-pill">Trust & Compliance</span>
                    </Link>
                    <div className="nav-actions">
                        <Link to="/" className="btn-back-home">
                            <ArrowLeft size={15} />
                            <span>Return to App</span>
                        </Link>
                        <button
                            type="button"
                            className="btn-cookie-manage"
                            onClick={() => window.openCookieConsentSettings?.()}
                        >
                            <Cookie size={14} />
                            <span>Cookie Settings</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Banner */}
            <div className="trust-hero-banner">
                <div className="trust-hero-content">
                    <div className="trust-status-badge">
                        <ShieldCheck size={16} className="icon-emerald" />
                        <span>Sovereign Archival Standards • Legally Verified & Privacy First</span>
                    </div>
                    <h1>Trust, Legal Governance & Compliance Hub</h1>
                    <p>
                        Comprehensive legal policies, transparent pricing, FTC click-to-cancel consumer protection, and verifiable air-gapped data sovereignty guarantees for libraries, archives, and institutions.
                    </p>
                    <div className="trust-meta-strip">
                        <span><strong>Entity:</strong> Carthworks / LibraDigit AI</span>
                        <span className="dot">•</span>
                        <span><strong>Lead Architect:</strong> Karthikeyan T</span>
                        <span className="dot">•</span>
                        <span><strong>Last Updated:</strong> October 2026</span>
                        <span className="dot">•</span>
                        <span><strong>Audit Level:</strong> WCAG 2.1 AA & GDPR Art. 6</span>
                    </div>
                </div>
            </div>

            {/* Pillar Navigation Tabs */}
            <nav className="trust-tabs-ribbon" aria-label="Trust center sections">
                <button
                    type="button"
                    className={`trust-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => handleTabChange('overview')}
                >
                    <ShieldCheck size={16} />
                    <span>Overview</span>
                </button>
                <button
                    type="button"
                    className={`trust-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
                    onClick={() => handleTabChange('privacy')}
                >
                    <Lock size={16} />
                    <span>Privacy Policy</span>
                </button>
                <button
                    type="button"
                    className={`trust-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
                    onClick={() => handleTabChange('terms')}
                >
                    <Scale size={16} />
                    <span>Terms & Conditions</span>
                </button>
                <button
                    type="button"
                    className={`trust-tab-btn ${activeTab === 'refund' ? 'active' : ''}`}
                    onClick={() => handleTabChange('refund')}
                >
                    <RefreshCw size={16} />
                    <span>Cancellation & Refund</span>
                </button>
                <button
                    type="button"
                    className={`trust-tab-btn ${activeTab === 'pricing' ? 'active' : ''}`}
                    onClick={() => handleTabChange('pricing')}
                >
                    <CreditCard size={16} />
                    <span>Transparent Pricing</span>
                </button>
                <button
                    type="button"
                    className={`trust-tab-btn ${activeTab === 'about' ? 'active' : ''}`}
                    onClick={() => handleTabChange('about')}
                >
                    <Info size={16} />
                    <span>About Company</span>
                </button>
                <button
                    type="button"
                    className={`trust-tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
                    onClick={() => handleTabChange('contact')}
                >
                    <Mail size={16} />
                    <span>Contact & Support</span>
                </button>
                <button
                    type="button"
                    className={`trust-tab-btn ${activeTab === 'cookies' ? 'active' : ''}`}
                    onClick={() => handleTabChange('cookies')}
                >
                    <Cookie size={16} />
                    <span>Cookie Policy</span>
                </button>
            </nav>

            {/* TAB CONTENTS */}
            <main className="trust-main-card">

                {/* 1. OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="trust-section-block">
                        <div className="section-head">
                            <h2>The 6 Pillars of Sovereign Archival Trust</h2>
                            <p>Every digital document processed through LibraDigit AI is protected by clear legal terms and cryptographic sovereignty.</p>
                        </div>

                        <div className="trust-pillars-grid">
                            <div className="pillar-card" onClick={() => handleTabChange('privacy')}>
                                <div className="pillar-icon emerald"><Lock size={22} /></div>
                                <h3>Zero Cloud Telemetry</h3>
                                <p>100% on-device OCR, segmentation, and vector cataloging. No document fragments or metadata ever leave your host system.</p>
                                <span className="pillar-link">Read Privacy Policy →</span>
                            </div>

                            <div className="pillar-card" onClick={() => handleTabChange('terms')}>
                                <div className="pillar-icon sapphire"><Scale size={22} /></div>
                                <h3>Permissive Governance</h3>
                                <p>Standard open-source and commercial licensing without hidden restrictive lock-ins or predatory runtime royalties.</p>
                                <span className="pillar-link">Read Terms of Service →</span>
                            </div>

                            <div className="pillar-card" onClick={() => handleTabChange('refund')}>
                                <div className="pillar-icon amber"><RefreshCw size={22} /></div>
                                <h3>FTC Click-to-Cancel Ready</h3>
                                <p>Zero subscription traps. Canceling or exporting data is 1-click simple, accompanied by a 14-day statutory refund guarantee.</p>
                                <span className="pillar-link">Read Refund Terms →</span>
                            </div>

                            <div className="pillar-card" onClick={() => handleTabChange('pricing')}>
                                <div className="pillar-icon purple"><CreditCard size={22} /></div>
                                <h3>Upfront Transparent Pricing</h3>
                                <p>Zero drip pricing or surprise checkout fees. Itemized tier costs and guaranteed support SLAs published publicly.</p>
                                <span className="pillar-link">View Transparent Pricing →</span>
                            </div>

                            <div className="pillar-card" onClick={() => handleTabChange('about')}>
                                <div className="pillar-icon teal"><Info size={22} /></div>
                                <h3>Verifiable Corporate Identity</h3>
                                <p>Architected by Carthworks / Karthikeyan T with verifiable repository commits, public specifications, and ISO standards compliance.</p>
                                <span className="pillar-link">Explore Company Origin →</span>
                            </div>

                            <div className="pillar-card" onClick={() => handleTabChange('contact')}>
                                <div className="pillar-icon rose"><Mail size={22} /></div>
                                <h3>Monitored Support Channels</h3>
                                <p>Direct email support with a strict 24-hour business SLA, physical mailing address, and dedicated archival consultation.</p>
                                <span className="pillar-link">Contact Support →</span>
                            </div>
                        </div>

                        <div className="standards-matrix-banner">
                            <div className="matrix-col">
                                <CheckCircle2 size={18} className="icon-emerald" />
                                <div>
                                    <strong>ISO 19005 (PDF/A-1b)</strong>
                                    <span>Long-term archival preservation standard</span>
                                </div>
                            </div>
                            <div className="matrix-col">
                                <CheckCircle2 size={18} className="icon-emerald" />
                                <div>
                                    <strong>RFC 8493 (BagIt)</strong>
                                    <span>Cryptographic checksum manifests</span>
                                </div>
                            </div>
                            <div className="matrix-col">
                                <CheckCircle2 size={18} className="icon-emerald" />
                                <div>
                                    <strong>WCAG 2.1 AA Compliant</strong>
                                    <span>High contrast & screen-reader accessible</span>
                                </div>
                            </div>
                            <div className="matrix-col">
                                <CheckCircle2 size={18} className="icon-emerald" />
                                <div>
                                    <strong>GDPR & CCPA Aligned</strong>
                                    <span>Strict data minimization & sovereign control</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. PRIVACY POLICY */}
                {activeTab === 'privacy' && (
                    <article className="trust-legal-article">
                        <div className="legal-title-wrap">
                            <h2>LibraDigit AI Privacy Policy</h2>
                            <span className="legal-version">Effective Date: October 6, 2026 • Version 1.3</span>
                        </div>

                        <div className="legal-callout info">
                            <Lock size={20} />
                            <div>
                                <strong>Our Fundamental Privacy Promise:</strong>
                                <p>LibraDigit AI is engineered as a local-first sovereign application. Your ingested scans, extracted OCR text, Dublin Core metadata, and PDF/A archives NEVER touch external cloud servers, AI third-party APIs, or ad trackers.</p>
                            </div>
                        </div>

                        <section className="legal-section">
                            <h3>1. Categories of Personal Data Processed</h3>
                            <p>We believe in strict <strong>Data Minimization</strong> (GDPR Art. 5(1)(c)). We only process data strictly necessary for the immediate software function:</p>
                            <ul>
                                <li><strong>Local Authentication Credentials:</strong> Master passwords are encrypted on-device using salted Bcrypt hashes (10 rounds) and stored only in your local client database.</li>
                                <li><strong>Document Content:</strong> Scans, TIFFs, PDFs, and transcribed text files uploaded to the app are processed strictly on your local CPU/GPU runtime.</li>
                                <li><strong>Local User Preferences:</strong> UI theme setting (dark/light) and view options stored in your browser's local storage.</li>
                                <li><strong>Inquiry Submissions:</strong> If you voluntarily submit an institutional inquiry via our contact form, we process your name, email, institution, and project description solely to respond to your request.</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h3>2. Legal Bases for Processing (GDPR Art. 6)</h3>
                            <ul>
                                <li><strong>Performance of Contract (Art. 6(1)(b)):</strong> Providing the local digital preservation functionality you request.</li>
                                <li><strong>Explicit Consent (Art. 6(1)(a)):</strong> Contact inquiries submitted through our verified contact forms.</li>
                                <li><strong>Legitimate Interests (Art. 6(1)(f)):</strong> Protecting local workspace security and preventing unauthorized access.</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h3>3. Zero Third-Party Sub-processors & Cloud Trackers</h3>
                            <p>LibraDigit AI does not integrate Google Analytics, Meta Pixels, Mixpanel, Hotjar, Clarity, or third-party advertising SDKs. No telemetry pings are transmitted during OCR processing, BagIt generation, or metadata enrichment.</p>
                        </section>

                        <section className="legal-section">
                            <h3>4. Your Rights Under GDPR & CCPA/CPRA</h3>
                            <p>Because all document data resides on your machine, you have absolute sovereign control over your information:</p>
                            <ul>
                                <li><strong>Right to Access & Portability:</strong> Export your complete digital records anytime as open-standard BagIt RFC 8493 packages.</li>
                                <li><strong>Right to Erasure (Deletion):</strong> Delete any project or all database records instantly using the in-app delete actions.</li>
                                <li><strong>Right to Rectification:</strong> Edit OCR text and metadata fields directly in the Cleanup Studio and Metadata Editor.</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h3>5. Data Protection Officer & Privacy Inquiries</h3>
                            <p>For any privacy-related requests or formal compliance inquiries, please contact our designated privacy lead directly:</p>
                            <div className="contact-box-compact">
                                <strong>Data Protection Officer:</strong> Karthikeyan T<br />
                                <strong>Direct Email:</strong> <a href="mailto:tkarthikeyan@gmail.com">tkarthikeyan@gmail.com</a><br />
                                <strong>Organization:</strong> Carthworks / LibraDigit AI<br />
                                <strong>Response SLA:</strong> Within 24 hours on business days
                            </div>
                        </section>
                    </article>
                )}

                {/* 3. TERMS & CONDITIONS */}
                {activeTab === 'terms' && (
                    <article className="trust-legal-article">
                        <div className="legal-title-wrap">
                            <h2>Terms & Conditions (TOS)</h2>
                            <span className="legal-version">Effective Date: October 6, 2026 • Version 1.3</span>
                        </div>

                        <section className="legal-section">
                            <h3>1. Acceptance of Terms</h3>
                            <p>By accessing or deploying the LibraDigit AI software, web platform, or desktop runtime, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you are using the software on behalf of an institution, university, or archival repository, you represent that you have authority to bind that entity.</p>
                        </section>

                        <section className="legal-section">
                            <h3>2. Software License & Intellectual Property</h3>
                            <p>The core LibraDigit AI preservation architecture is distributed under permissive open standards (MIT License / Apache 2.0). You are granted a worldwide, non-exclusive license to run, customize, audit, and integrate the system for academic, governmental, commercial, and personal archival purposes.</p>
                            <p>All trademarks, logos, brand emblems, and documentation belonging to <strong>LibraDigit AI</strong> and <strong>Carthworks</strong> remain the intellectual property of Karthikeyan T.</p>
                        </section>

                        <section className="legal-section">
                            <h3>3. Acceptable Use Policy</h3>
                            <p>You agree not to use LibraDigit AI to:</p>
                            <ul>
                                <li>Process or distribute materials that violate applicable criminal laws, intellectual property rights, or privacy rights of third parties without proper lawful authorization.</li>
                                <li>Reverse-engineer or circumvent security safeguards with malicious intent.</li>
                                <li>Misrepresent digitized or AI-restored facsimile documents as unverified historical originals without appropriate provenance attribution.</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h3>4. Disclaimers & Limitation of Liability</h3>
                            <p>LibraDigit AI provides high-precision OCR and automated archival packaging. However, the software is provided <em>"as is"</em> without warranties of any kind. Archivists and users remain solely responsible for verifying OCR recognition fidelity, historical text accuracy, and ensuring long-term secondary backup redundancy of all physical and digital records.</p>
                            <p>To the maximum extent permitted by applicable law, Carthworks and Karthikeyan T shall not be liable for any indirect, incidental, or consequential damages resulting from data corruption or hardware failures.</p>
                        </section>

                        <section className="legal-section">
                            <h3>5. Governing Law & Dispute Resolution</h3>
                            <p>These terms shall be governed by and construed in accordance with the laws of India and applicable international commercial arbitration standards, without regard to conflict of law principles.</p>
                        </section>
                    </article>
                )}

                {/* 4. CANCELLATION & REFUND POLICY */}
                {activeTab === 'refund' && (
                    <article className="trust-legal-article">
                        <div className="legal-title-wrap">
                            <h2>Cancellation & Refund Policy</h2>
                            <span className="legal-version">Effective Date: October 6, 2026 • FTC Click-to-Cancel Compliant</span>
                        </div>

                        <div className="legal-callout success">
                            <RefreshCw size={20} />
                            <div>
                                <strong>FTC Click-to-Cancel & Transparent Refund Assurance:</strong>
                                <p>We firmly reject dark patterns, forced continuity traps, and difficult cancellation mazes. Canceling a commercial support agreement or obtaining a refund is straightforward, fast, and fully documented.</p>
                            </div>
                        </div>

                        <section className="legal-section">
                            <h3>1. 14-Day Statutory Money-Back Guarantee</h3>
                            <p>For any institutional license, enterprise deployment package, or paid support plan, we provide a <strong>14-day 100% money-back guarantee</strong> from the date of purchase. If LibraDigit AI does not meet your archival benchmark requirements, you may request a full refund with no questions asked.</p>
                        </section>

                        <section className="legal-section">
                            <h3>2. Self-Serve & 1-Click Cancellation (Click-to-Cancel)</h3>
                            <p>Per the FTC 2024 Click-to-Cancel regulations, canceling any ongoing commercial tier or annual support agreement is as easy as signing up:</p>
                            <ul>
                                <li><strong>Self-Service:</strong> Send an email to <a href="mailto:tkarthikeyan@gmail.com">tkarthikeyan@gmail.com</a> with the subject line <em>"Cancel Subscription / Service"</em> or manage your agreement via your institutional procurement portal.</li>
                                <li><strong>No Phone Call Traps:</strong> We will never require you to call a retention phone line, complete lengthy exit surveys, or navigate deceptive maze-like flows to stop service.</li>
                                <li><strong>Immediate Confirmation:</strong> Cancellations are confirmed via written email receipt within 24 hours.</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h3>3. Refund Processing Timelines & Payout Methods</h3>
                            <p>Upon receipt and approval of your refund request:</p>
                            <ul>
                                <li>Refunds are initiated within <strong>2 business days</strong>.</li>
                                <li>Funds typically reflect in your original payment method (bank transfer, credit card, or institutional purchase order credit) within <strong>5 to 7 business days</strong> depending on your banking provider.</li>
                            </ul>
                        </section>

                        <section className="legal-section">
                            <h3>4. Open Source / Community Tier</h3>
                            <p>The standard standalone LibraDigit AI offline application is <strong>100% free and open-source forever</strong>. There are zero recurring fees, no surprise credit card holds, and no trial conversions for community users.</p>
                        </section>
                    </article>
                )}

                {/* 5. TRANSPARENT PRICING & SUPPORT INFO */}
                {activeTab === 'pricing' && (
                    <div className="trust-section-block">
                        <div className="section-head">
                            <h2>Upfront Transparent Pricing & Support SLA</h2>
                            <p>No hidden fees, no drip pricing, no surprise checkout markups. Every tier is clearly itemized with defined customer support availability.</p>
                        </div>

                        <div className="pricing-grid-clean">
                            <div className="pricing-card">
                                <div className="price-badge">Open Source Community</div>
                                <h3>Sovereign Archival</h3>
                                <div className="price-tag">$0 <span>/ forever</span></div>
                                <p className="price-desc">Complete offline application for independent researchers, historians, and local archives.</p>
                                <ul className="price-features">
                                    <li><CheckCircle2 size={16} /> Unlimited local document OCR & indexing</li>
                                    <li><CheckCircle2 size={16} /> Neural handwriting & multilingual OCR</li>
                                    <li><CheckCircle2 size={16} /> Dublin Core & MARC21 metadata generation</li>
                                    <li><CheckCircle2 size={16} /> ISO PDF/A-1b & BagIt package export</li>
                                    <li><CheckCircle2 size={16} /> Community GitHub issue support</li>
                                </ul>
                                <Link to="/" className="btn-plan-action">Launch Free Workspace</Link>
                                <span className="price-footnote">Zero payment info required</span>
                            </div>

                            <div className="pricing-card featured">
                                <div className="price-badge">Institutional Pilot</div>
                                <h3>Library & University</h3>
                                <div className="price-tag">$499 <span>/ one-time setup</span></div>
                                <p className="price-desc">Assisted on-premise deployment, bulk pipeline tuning, and custom metadata catalog integration.</p>
                                <ul className="price-features">
                                    <li><CheckCircle2 size={16} /> All Sovereign Archival features</li>
                                    <li><CheckCircle2 size={16} /> Assisted installation & Tesseract GPU tuning</li>
                                    <li><CheckCircle2 size={16} /> Custom Dublin Core ontology mapping</li>
                                    <li><CheckCircle2 size={16} /> Dedicated email support with <strong>24-hr SLA</strong></li>
                                    <li><CheckCircle2 size={16} /> 14-day full money-back guarantee</li>
                                </ul>
                                <button type="button" className="btn-plan-action primary" onClick={() => handleTabChange('contact')}>
                                    Inquire for Pilot
                                </button>
                                <span className="price-footnote">Includes all taxes • No recurring subscription</span>
                            </div>

                            <div className="pricing-card">
                                <div className="price-badge">Enterprise Archival</div>
                                <h3>National Repositories</h3>
                                <div className="price-tag">Custom Quote</div>
                                <p className="price-desc">Air-gapped batch digitization infrastructure, custom fine-tuned OCR models, and dedicated engineering SLA.</p>
                                <ul className="price-features">
                                    <li><CheckCircle2 size={16} /> Multi-workstation clustering & queueing</li>
                                    <li><CheckCircle2 size={16} /> Custom regional language / script fine-tuning</li>
                                    <li><CheckCircle2 size={16} /> Tailored SLA with <strong>4-hour response window</strong></li>
                                    <li><CheckCircle2 size={16} /> Dedicated staff training & handover sessions</li>
                                    <li><CheckCircle2 size={16} /> Annual integrity maintenance contract</li>
                                </ul>
                                <button type="button" className="btn-plan-action" onClick={() => handleTabChange('contact')}>
                                    Contact Archival Team
                                </button>
                                <span className="price-footnote">Procurement invoice & wire transfer supported</span>
                            </div>
                        </div>

                        <div className="support-sla-card">
                            <h3>Customer Support Service Level Agreement (SLA)</h3>
                            <div className="sla-rows">
                                <div className="sla-row">
                                    <strong>Primary Channel</strong>
                                    <span>Direct Email: <a href="mailto:tkarthikeyan@gmail.com">tkarthikeyan@gmail.com</a></span>
                                </div>
                                <div className="sla-row">
                                    <strong>Hours of Operation</strong>
                                    <span>Monday – Friday: 09:00 to 18:00 IST (UTC+05:30)</span>
                                </div>
                                <div className="sla-row">
                                    <strong>Standard Response Time</strong>
                                    <span>Within 24 business hours for all general and pilot inquiries</span>
                                </div>
                                <div className="sla-row">
                                    <strong>Critical Incident SLA</strong>
                                    <span>Within 4 hours for enterprise air-gapped preservation deployments</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. ABOUT PAGE */}
                {activeTab === 'about' && (
                    <article className="trust-legal-article">
                        <div className="legal-title-wrap">
                            <h2>About LibraDigit AI & Carthworks</h2>
                            <span className="legal-version">Company Profile & Sovereign Archival Mission</span>
                        </div>

                        <section className="legal-section">
                            <h3>Our Origin & Core Mission</h3>
                            <p>
                                Worldwide, millions of rare manuscripts, historical periodicals, public gazettes, and academic research papers remain trapped in fragile physical paper or dark digital silos. Traditional cloud-based OCR services require shipping sensitive, proprietary, or national heritage documents to remote servers—violating sovereignty and privacy.
                            </p>
                            <p>
                                <strong>LibraDigit AI</strong> was engineered by <strong>Carthworks</strong> under the direction of <strong>Karthikeyan T</strong> to solve this fundamental challenge: providing libraries, heritage foundations, legal archives, and memory institutions with a 100% sovereign, local-first artificial intelligence workstation that performs deep neural OCR, Dublin Core metadata cataloging, and ISO-compliant PDF/A-1b preservation directly on host machines without external dependencies.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h3>Leadership & Engineering Team</h3>
                            <div className="team-profile-card">
                                <div className="team-avatar">KT</div>
                                <div className="team-info">
                                    <h4>Karthikeyan T</h4>
                                    <span className="team-role">Lead Architect & Founder, Carthworks</span>
                                    <p>
                                        Full-stack software architect specializing in digital preservation systems, high-throughput document processing pipelines, neural OCR integration, and sovereign air-gapped computing.
                                    </p>
                                    <div className="team-links">
                                        <a href="mailto:tkarthikeyan@gmail.com"><Mail size={14} /> tkarthikeyan@gmail.com</a>
                                        <a href="https://github.com/carthworks" target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> github.com/carthworks</a>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="legal-section">
                            <h3>Corporate Identity & Operating Jurisdiction</h3>
                            <div className="jurisdiction-grid">
                                <div className="j-item">
                                    <strong>Product:</strong>
                                    <span>LibraDigit AI (v1.3.0)</span>
                                </div>
                                <div className="j-item">
                                    <strong>Publishing Entity:</strong>
                                    <span>Carthworks Digital Products</span>
                                </div>
                                <div className="j-item">
                                    <strong>Principal Contact:</strong>
                                    <span>Karthikeyan T</span>
                                </div>
                                <div className="j-item">
                                    <strong>Operating Jurisdiction:</strong>
                                    <span>Tamil Nadu, India (Global Distribution)</span>
                                </div>
                                <div className="j-item">
                                    <strong>Official Repository:</strong>
                                    <span>github.com/carthworks/LibraDigitAI</span>
                                </div>
                                <div className="j-item">
                                    <strong>Compliance Framework:</strong>
                                    <span>ISO 19005, RFC 8493, WCAG 2.1 AA, GDPR</span>
                                </div>
                            </div>
                        </section>
                    </article>
                )}

                {/* 7. CONTACT PAGE */}
                {activeTab === 'contact' && (
                    <div className="trust-section-block">
                        <div className="section-head">
                            <h2>Contact & Customer Support</h2>
                            <p>Reach out directly to our engineering and compliance desk. All inquiries receive direct attention with a strict 24-hour response SLA.</p>
                        </div>

                        <div className="contact-layout-grid">
                            <div className="contact-info-panel">
                                <h3>Direct Support Channels</h3>
                                <p>We maintain active, direct lines of communication for archivists, librarians, and technical evaluators:</p>

                                <div className="channel-item">
                                    <div className="c-icon"><Mail size={20} /></div>
                                    <div className="c-text">
                                        <strong>Primary Support Email</strong>
                                        <a href="mailto:tkarthikeyan@gmail.com">tkarthikeyan@gmail.com</a>
                                        <span>Monitored daily • 24hr response SLA</span>
                                    </div>
                                </div>

                                <div className="channel-item">
                                    <div className="c-icon"><MapPin size={20} /></div>
                                    <div className="c-text">
                                        <strong>Registered Headquarters</strong>
                                        <span>Carthworks Archival Engineering</span>
                                        <span>Tamil Nadu, India</span>
                                    </div>
                                </div>

                                <div className="channel-item">
                                    <div className="c-icon"><Clock size={20} /></div>
                                    <div className="c-text">
                                        <strong>Support Hours</strong>
                                        <span>Monday – Friday: 09:00 – 18:00 IST</span>
                                        <span>Weekend emergencies monitored for Enterprise</span>
                                    </div>
                                </div>

                                <div className="channel-item">
                                    <div className="c-icon"><ExternalLink size={20} /></div>
                                    <div className="c-text">
                                        <strong>Open Source Repository</strong>
                                        <a href="https://github.com/carthworks/LibraDigitAI" target="_blank" rel="noopener noreferrer">
                                            github.com/carthworks/LibraDigitAI
                                        </a>
                                        <span>Public issue tracker & bug reports</span>
                                    </div>
                                </div>
                            </div>

                            <div className="contact-form-panel">
                                <h3>Send an Inquiry</h3>
                                {contactSubmitted ? (
                                    <div className="contact-success-state">
                                        <CheckCircle2 size={44} className="icon-emerald" />
                                        <h4>Inquiry Successfully Received</h4>
                                        <p>Thank you, <strong>{contactForm.name}</strong>. Our team has received your message and will respond to <strong>{contactForm.email}</strong> within 24 business hours.</p>
                                        <button
                                            type="button"
                                            className="btn-plan-action"
                                            onClick={() => {
                                                setContactSubmitted(false)
                                                setContactForm({ name: '', email: '', subject: 'General Inquiry', message: '', consent: false })
                                            }}
                                        >
                                            Send Another Message
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleContactSubmit} className="trust-contact-form">
                                        <div className="form-field">
                                            <label htmlFor="c-name">Full Name *</label>
                                            <input
                                                id="c-name"
                                                type="text"
                                                required
                                                placeholder="Dr. Eleanor Vance"
                                                value={contactForm.name}
                                                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label htmlFor="c-email">Official / Monitored Email *</label>
                                            <input
                                                id="c-email"
                                                type="email"
                                                required
                                                placeholder="eleanor@heritage.org"
                                                value={contactForm.email}
                                                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label htmlFor="c-subject">Subject / Inquiry Type</label>
                                            <select
                                                id="c-subject"
                                                value={contactForm.subject}
                                                onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                                            >
                                                <option>General Trust & Compliance Inquiry</option>
                                                <option>Institutional Deployment / Pilot</option>
                                                <option>Custom Metadata Mapping Request</option>
                                                <option>Privacy / Data Protection Question</option>
                                                <option>Bug Report / Feature Request</option>
                                            </select>
                                        </div>

                                        <div className="form-field">
                                            <label htmlFor="c-message">Message Details *</label>
                                            <textarea
                                                id="c-message"
                                                rows={4}
                                                required
                                                placeholder="Please provide details about your institution, collection size, or question..."
                                                value={contactForm.message}
                                                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                            ></textarea>
                                        </div>

                                        {/* Mandatory GDPR Consent Checkbox (Anti-dark pattern) */}
                                        <div className="form-consent-box">
                                            <input
                                                type="checkbox"
                                                id="c-consent"
                                                required
                                                checked={contactForm.consent}
                                                onChange={(e) => setContactForm({ ...contactForm, consent: e.target.checked })}
                                            />
                                            <label htmlFor="c-consent">
                                                I agree to the <Link to="/privacy">Privacy Policy</Link> and consent to Carthworks processing my contact information solely for responding to this inquiry. No marketing spam will be sent.
                                            </label>
                                        </div>

                                        <button
                                            type="submit"
                                            className="btn-plan-action primary"
                                            disabled={!contactForm.consent}
                                        >
                                            <Send size={15} />
                                            <span>Submit Inquiry</span>
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 8. COOKIE POLICY */}
                {activeTab === 'cookies' && (
                    <article className="trust-legal-article">
                        <div className="legal-title-wrap">
                            <h2>Cookie Disclosures & Local Storage Policy</h2>
                            <span className="legal-version">Compliant with ePrivacy Directive & GDPR Art. 5(3)</span>
                        </div>

                        <section className="legal-section">
                            <h3>What Are Cookies and Local Storage?</h3>
                            <p>
                                Cookies and HTML5 Local Storage are small text data entries saved in your browser storage. In LibraDigit AI, we reject third-party tracking cookies, behavioral tracking pixels, and profiling beacons.
                            </p>
                        </section>

                        <section className="legal-section">
                            <h3>Active Local Storage & Cookie Inventory</h3>
                            <div className="cookie-table-wrapper">
                                <table className="cookie-inventory-table">
                                    <thead>
                                        <tr>
                                            <th>Key / Name</th>
                                            <th>Category</th>
                                            <th>Provider</th>
                                            <th>Purpose</th>
                                            <th>Lifespan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><code>app_session_active</code></td>
                                            <td><span className="cat-badge necessary">Strictly Necessary</span></td>
                                            <td>Local Host</td>
                                            <td>Tracks authenticated workspace state to prevent unauthorized access.</td>
                                            <td>Session / Local</td>
                                        </tr>
                                        <tr>
                                            <td><code>auth_hash</code></td>
                                            <td><span className="cat-badge necessary">Strictly Necessary</span></td>
                                            <td>Local Host</td>
                                            <td>Stores the salted cryptographic hash of your master password for on-device login.</td>
                                            <td>Persistent (Local)</td>
                                        </tr>
                                        <tr>
                                            <td><code>libradigit_theme</code></td>
                                            <td><span className="cat-badge functional">Functional</span></td>
                                            <td>Local Host</td>
                                            <td>Remembers your preference between Dark Mode and High-Contrast Light Mode.</td>
                                            <td>Persistent</td>
                                        </tr>
                                        <tr>
                                            <td><code>libradigit_cookie_consent</code></td>
                                            <td><span className="cat-badge necessary">Strictly Necessary</span></td>
                                            <td>Local Host</td>
                                            <td>Records your explicit cookie and privacy category choices with timestamp.</td>
                                            <td>1 Year</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="legal-section">
                            <h3>How to Modify or Revoke Consent</h3>
                            <p>You can adjust your cookie choices at any time by clicking the button below:</p>
                            <div style={{ marginTop: '14px' }}>
                                <button
                                    type="button"
                                    className="btn-plan-action primary"
                                    style={{ display: 'inline-flex', width: 'auto' }}
                                    onClick={() => window.openCookieConsentSettings?.()}
                                >
                                    <Cookie size={16} />
                                    <span>Open Interactive Cookie Preferences</span>
                                </button>
                            </div>
                        </section>
                    </article>
                )}

            </main>

            {/* Global Trust Footer */}
            <footer className="trust-page-footer">
                <div className="footer-links-row">
                    <Link to="/about">About Us</Link>
                    <span className="sep">•</span>
                    <Link to="/contact">Contact Support</Link>
                    <span className="sep">•</span>
                    <Link to="/privacy">Privacy Policy</Link>
                    <span className="sep">•</span>
                    <Link to="/terms">Terms of Service</Link>
                    <span className="sep">•</span>
                    <Link to="/refund">Refund Policy</Link>
                    <span className="sep">•</span>
                    <Link to="/pricing">Pricing & SLAs</Link>
                    <span className="sep">•</span>
                    <Link to="/cookies">Cookie Policy</Link>
                    <span className="sep">•</span>
                    <button
                        type="button"
                        className="btn-footer-cookie"
                        onClick={() => window.openCookieConsentSettings?.()}
                    >
                        Cookie Settings
                    </button>
                </div>
                <p className="copyright-line">
                    © 2026 LibraDigit AI • Carthworks. Architected by Karthikeyan T (<a href="mailto:tkarthikeyan@gmail.com">tkarthikeyan@gmail.com</a>). Distributed under MIT / Apache 2.0.
                </p>
            </footer>
        </div>
    )
}

export default TrustCenter
