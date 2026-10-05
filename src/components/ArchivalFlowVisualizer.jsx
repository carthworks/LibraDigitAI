import { useState, useEffect } from 'react'
import {
    Play,
    Pause,
    RotateCw,
    Folder,
    Search,
    Lock,
    Tag,
    ArrowRight
} from 'lucide-react'

const ArchivalFlowVisualizer = () => {
    const [isPlaying, setIsPlaying] = useState(true)
    const [activeStep, setActiveStep] = useState(null)
    const [searchPulseIndex, setSearchPulseIndex] = useState(0)

    // Animated scanline and step loop
    useEffect(() => {
        if (!isPlaying) return

        const interval = setInterval(() => {
            setSearchPulseIndex(prev => (prev + 1) % 3)
        }, 120)

        return () => clearInterval(interval)
    }, [isPlaying])

    return (
        <div className="flow-showcase-card">
            {/* Card Header */}
            <div className="showcase-header">
                <h3 className="showcase-title">From Scans to Searchable Knowledge</h3>
                <button
                    className={`btn-workflow-action ${isPlaying ? 'playing' : ''}`}
                    onClick={() => setIsPlaying(!isPlaying)}
                >
                    <span>See the Workflow in Action</span>
                    <div className="workflow-play-icon">
                        {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                    </div>
                </button>
            </div>

            {/* Main 5-Step Pipeline Grid */}
            <div className="pipeline-steps-grid">
                {/* -------------------------------------------------------------
                    STEP 1: INGEST SCANS
                    ------------------------------------------------------------- */}
                <div
                    className={`step-column ${activeStep === 1 ? 'active' : ''}`}
                    onMouseEnter={() => setActiveStep(1)}
                    onMouseLeave={() => setActiveStep(null)}
                >
                    <div className="step-visual-container">
                        <div className="fanned-stack-wrapper">
                            {/* Old Book Background Layer */}
                            <div className="vintage-book-layer">
                                <div className="book-spine-line"></div>
                                <div className="book-gold-frame">
                                    <div className="book-filigree-emblem">❖</div>
                                    <div className="book-gold-text">HISTORIA</div>
                                </div>
                            </div>

                            {/* Vintage Photo Middle Layer */}
                            <div className="vintage-photo-layer">
                                <div className="photo-inner-sepia">
                                    <div className="photo-figure"></div>
                                </div>
                            </div>

                            {/* Typewritten Manuscript Top Layer */}
                            <div className="vintage-doc-layer">
                                <div className="doc-typewriter-lines">
                                    <div className="tw-line"></div>
                                    <div className="tw-line"></div>
                                    <div className="tw-line"></div>
                                    <div className="tw-line short"></div>
                                </div>
                            </div>

                            {/* Floating File Badges */}
                            <div className="badge-file badge-pdf">PDF</div>
                            <div className="badge-file badge-tiff">TIFF</div>
                            <div className="badge-file badge-folder">
                                <Folder size={11} />
                            </div>
                            <div className="badge-file badge-smartcard"></div>
                        </div>
                    </div>

                    <div className="step-arrow-divider">
                        <ArrowRight size={14} className="cyan-arrow" />
                    </div>

                    <div className="step-footer-info">
                        <div className="step-number-circle step-1-circle">1</div>
                        <h4 className="step-heading">Ingest Scans</h4>
                        <p className="step-description">
                            Drag & drop PDFs, TIFFs, or batch scans.
                        </p>
                    </div>
                </div>

                {/* -------------------------------------------------------------
                    STEP 2: AI CLEAN & DESKEW
                    ------------------------------------------------------------- */}
                <div
                    className={`step-column ${activeStep === 2 ? 'active' : ''}`}
                    onMouseEnter={() => setActiveStep(2)}
                    onMouseLeave={() => setActiveStep(null)}
                >
                    <div className="step-visual-container">
                        <div className="deskew-split-card">
                            {/* Circular Rotate Icon on Top */}
                            <div className="deskew-rotate-badge">
                                <RotateCw size={13} className="rotate-icon-blue" />
                            </div>

                            {/* Split Document */}
                            <div className="split-doc-wrapper">
                                {/* Left: Aged Skewed Side */}
                                <div className="split-half left-aged">
                                    <div className="aged-text-lines">
                                        <div className="aged-line"></div>
                                        <div className="aged-line"></div>
                                        <div className="aged-line"></div>
                                        <div className="aged-line"></div>
                                        <div className="aged-line short"></div>
                                        <div className="aged-line"></div>
                                        <div className="aged-line short"></div>
                                    </div>
                                </div>

                                {/* Center Split Dotted Divider */}
                                <div className="split-center-divider">
                                    <div className="divider-pulse-glow"></div>
                                </div>

                                {/* Right: Clean Deskewed Binarized Side */}
                                <div className="split-half right-clean">
                                    <div className="clean-text-lines">
                                        <div className="clean-line"></div>
                                        <div className="clean-line"></div>
                                        <div className="clean-line"></div>
                                        <div className="clean-line"></div>
                                        <div className="clean-line short"></div>
                                        <div className="clean-line"></div>
                                        <div className="clean-line short"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="step-arrow-divider">
                        <ArrowRight size={14} className="cyan-arrow" />
                    </div>

                    <div className="step-footer-info">
                        <div className="step-number-circle step-2-circle">2</div>
                        <h4 className="step-heading">AI Clean & Deskew</h4>
                        <p className="step-description">
                            Auto rotation, skew correction, noise removal.
                        </p>
                    </div>
                </div>

                {/* -------------------------------------------------------------
                    STEP 3: DUAL-PASS OCR
                    ------------------------------------------------------------- */}
                <div
                    className={`step-column ${activeStep === 3 ? 'active' : ''}`}
                    onMouseEnter={() => setActiveStep(3)}
                    onMouseLeave={() => setActiveStep(null)}
                >
                    <div className="step-visual-container">
                        <div className="ocr-preview-tablet">
                            {/* OCR Badge on top right */}
                            <div className="ocr-green-tag">OCR</div>

                            {/* OCR Document with Multi-Colored Bounding Boxes */}
                            <div className="ocr-sheet-content">
                                <div className="ocr-bbox bbox-blue">
                                    <div className="bbox-line blue-line"></div>
                                </div>
                                <div className="ocr-bbox bbox-yellow">
                                    <div className="bbox-line yellow-line"></div>
                                </div>
                                <div className="ocr-bbox bbox-cyan">
                                    <div className="bbox-line cyan-line"></div>
                                </div>
                                <div className="ocr-bbox bbox-orange">
                                    <div className="bbox-line orange-line"></div>
                                </div>
                                <div className="ocr-bbox bbox-red">
                                    <div className="bbox-line red-line"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="step-arrow-divider">
                        <ArrowRight size={14} className="cyan-arrow" />
                    </div>

                    <div className="step-footer-info">
                        <div className="step-number-circle step-3-circle">3</div>
                        <h4 className="step-heading">Dual-Pass OCR</h4>
                        <p className="step-description">
                            Multi-language extraction with bounding boxes and confidence.
                        </p>
                    </div>
                </div>

                {/* -------------------------------------------------------------
                    STEP 4: METADATA TAGGING
                    ------------------------------------------------------------- */}
                <div
                    className={`step-column ${activeStep === 4 ? 'active' : ''}`}
                    onMouseEnter={() => setActiveStep(4)}
                    onMouseLeave={() => setActiveStep(null)}
                >
                    <div className="step-visual-container">
                        <div className="metadata-sheet-card">
                            {/* Yellow Tag Badge */}
                            <div className="metadata-yellow-tag">
                                <Tag size={12} className="tag-icon-white" />
                            </div>

                            {/* Left Document Icon Thumbnail */}
                            <div className="metadata-sheet-inner">
                                <div className="meta-doc-thumbnail">
                                    <div className="thumb-header"></div>
                                    <div className="thumb-line"></div>
                                    <div className="thumb-line"></div>
                                </div>

                                {/* Metadata Table */}
                                <div className="metadata-table-rows">
                                    <div className="meta-row">
                                        <span className="meta-key">Title</span>
                                        <span className="meta-val">AI-inferred title</span>
                                    </div>
                                    <div className="meta-row">
                                        <span className="meta-key">Author</span>
                                        <span className="meta-val">AI-inferred author</span>
                                    </div>
                                    <div className="meta-row">
                                        <span className="meta-key">Date</span>
                                        <span className="meta-val highlight-year">1923 (inferred)</span>
                                    </div>
                                    <div className="meta-row">
                                        <span className="meta-key">Subject</span>
                                        <span className="meta-val">Cultural Heritage</span>
                                    </div>
                                    <div className="meta-row">
                                        <span className="meta-key">Format</span>
                                        <span className="meta-val">Text</span>
                                    </div>
                                    <div className="meta-row">
                                        <span className="meta-key">Schema</span>
                                        <span className="meta-val schema-tag">Dublin Core / MARC21</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="step-arrow-divider">
                        <ArrowRight size={14} className="cyan-arrow" />
                    </div>

                    <div className="step-footer-info">
                        <div className="step-number-circle step-4-circle">4</div>
                        <h4 className="step-heading">Metadata Tagging</h4>
                        <p className="step-description">
                            Dublin Core / MARC21 tagging with AI inference.
                        </p>
                    </div>
                </div>

                {/* -------------------------------------------------------------
                    STEP 5: INDEX & EXPORT
                    ------------------------------------------------------------- */}
                <div
                    className={`step-column ${activeStep === 5 ? 'active' : ''}`}
                    onMouseEnter={() => setActiveStep(5)}
                    onMouseLeave={() => setActiveStep(null)}
                >
                    <div className="step-visual-container">
                        <div className="search-export-widget">
                            {/* Glowing Green Search Button on Top Right */}
                            <div className="search-emerald-badge">
                                <Search size={13} />
                            </div>

                            {/* Search Input Box */}
                            <div className="search-bar-mock">
                                <Search size={11} className="search-bar-icon" />
                                <span className="search-placeholder">Search your archives...</span>
                            </div>

                            {/* 3 Search Hit Result Rows */}
                            <div className="search-results-list">
                                <div className={`search-hit-item ${searchPulseIndex === 0 ? 'pulse-hit' : ''}`}>
                                    <div className="hit-thumbnail"></div>
                                    <div className="hit-text-col">
                                        <span className="hit-title">Cultural Heritage...</span>
                                        <span className="hit-snippet">Page 12 ... <span className="hl-yellow">heritage</span> ...</span>
                                    </div>
                                </div>
                                <div className={`search-hit-item ${searchPulseIndex === 1 ? 'pulse-hit' : ''}`}>
                                    <div className="hit-thumbnail"></div>
                                    <div className="hit-text-col">
                                        <span className="hit-title">Preservation Methods...</span>
                                        <span className="hit-snippet">Page 43 ... <span className="hl-yellow">preservation</span> ...</span>
                                    </div>
                                </div>
                                <div className={`search-hit-item ${searchPulseIndex === 2 ? 'pulse-hit' : ''}`}>
                                    <div className="hit-thumbnail"></div>
                                    <div className="hit-text-col">
                                        <span className="hit-title">Digital Archives...</span>
                                        <span className="hit-snippet">Page 117 ... <span className="hl-yellow">archive</span> ...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="step-arrow-divider empty-end"></div>

                    <div className="step-footer-info">
                        <div className="step-number-circle step-5-circle">5</div>
                        <h4 className="step-heading">Index & Export</h4>
                        <p className="step-description">
                            Searchable PDF/A, full-text index, and flexible export options.
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Track & Privacy Guarantee Ribbon */}
            <div className="showcase-bottom-track">
                {/* Curved Dotted Flow Path */}
                <div className="flow-path-timeline">
                    <div className="timeline-node">
                        <span className="node-glow-dot"></span>
                        <span className="node-text">PRESERVE</span>
                    </div>
                    <div className="timeline-segment">
                        <div className="dash-line"></div>
                        <ArrowRight size={10} className="dash-arrow" />
                    </div>
                    <div className="timeline-node">
                        <span className="node-glow-dot"></span>
                        <span className="node-text">ENRICH</span>
                    </div>
                    <div className="timeline-segment">
                        <div className="dash-line"></div>
                        <ArrowRight size={10} className="dash-arrow" />
                    </div>
                    <div className="timeline-node">
                        <span className="node-glow-dot"></span>
                        <span className="node-text">SEARCH</span>
                    </div>
                    <div className="timeline-segment">
                        <div className="dash-line"></div>
                        <ArrowRight size={10} className="dash-arrow" />
                    </div>
                    <div className="timeline-node">
                        <span className="node-glow-dot"></span>
                        <span className="node-text">DISCOVER</span>
                    </div>
                </div>

                {/* 100% Private Air-Gapped Ready Badge */}
                <div className="air-gapped-security-pill">
                    <div className="security-icon-box">
                        <Lock size={12} className="text-emerald-400" />
                    </div>
                    <div className="security-text-box">
                        <span className="sec-title">100% PRIVATE</span>
                        <span className="sec-subtitle">AIR-GAPPED READY</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ArchivalFlowVisualizer
