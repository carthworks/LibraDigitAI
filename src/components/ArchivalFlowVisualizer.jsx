import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import {
    BookOpen,
    Cpu,
    FileText,
    Play,
    Pause,
    RotateCcw,
    Sparkles,
    CheckCircle2,
    Search
} from 'lucide-react'
import './ArchivalFlowVisualizer.css'

// Helper: Generate procedural high-res texture for the Old Aged Book Pages
function createOldBookPageTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')
    if (!ctx) return new THREE.CanvasTexture(canvas)

    // Aged parchment background
    const bgGradient = ctx.createLinearGradient(0, 0, 1024, 1024)
    bgGradient.addColorStop(0, '#fef3c7')
    bgGradient.addColorStop(0.5, '#fde68a')
    bgGradient.addColorStop(1, '#f59e0b')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, 1024, 1024)

    // Aged paper noise & vignetting
    for (let i = 0; i < 4000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(180, 83, 9, 0.04)' : 'rgba(120, 53, 15, 0.03)'
        ctx.fillRect(Math.random() * 1024, Math.random() * 1024, Math.random() * 8 + 2, Math.random() * 8 + 2)
    }

    // Weathered book border
    ctx.strokeStyle = 'rgba(146, 64, 14, 0.4)'
    ctx.lineWidth = 12
    ctx.strokeRect(30, 30, 964, 964)
    ctx.lineWidth = 4
    ctx.strokeRect(50, 50, 924, 924)

    // Manuscript Title (Gothic / Antique style)
    ctx.fillStyle = '#451a03'
    ctx.font = 'bold 38px "Cinzel", "Times New Roman", serif'
    ctx.textAlign = 'center'
    ctx.fillText('HISTORIA & REGISTRUM', 512, 120)
    ctx.font = 'italic 22px "Times New Roman", serif'
    ctx.fillStyle = '#78350f'
    ctx.fillText('Anno Domini MDCCCXLII • Royal Archival Charter', 512, 160)

    // Dividing ornate rule
    ctx.strokeStyle = '#b45309'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(200, 190)
    ctx.lineTo(824, 190)
    ctx.stroke()

    // Antique handwritten text lines (Two-column layout simulation)
    const renderColumn = (startX, width) => {
        let y = 240
        ctx.fillStyle = '#451a03'
        for (let row = 0; row < 15; row++) {
            const lineLen = row === 14 ? width * 0.6 : width - (Math.random() * 20)
            ctx.fillRect(startX, y, lineLen, 7)
            y += 34
        }
    }

    renderColumn(100, 380)
    renderColumn(544, 380)

    // Red/Gold Archival Wax Seal
    ctx.beginPath()
    ctx.arc(512, 840, 75, 0, Math.PI * 2)
    ctx.fillStyle = '#b91c1c'
    ctx.fill()
    ctx.lineWidth = 6
    ctx.strokeStyle = '#991b1b'
    ctx.stroke()

    ctx.fillStyle = '#fef08a'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('★ ARCHIVE SEAL ★', 512, 835)
    ctx.font = '12px sans-serif'
    ctx.fillText('LIBRA DIGIT 1842', 512, 855)

    const texture = new THREE.CanvasTexture(canvas)
    texture.anisotropy = 8
    return texture
}

// Helper: Generate procedural high-res texture for the Formatted Searchable PDF
function createFormattedPdfTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 1024
    const ctx = canvas.getContext('2d')
    if (!ctx) return new THREE.CanvasTexture(canvas)

    // Crisp white PDF document background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 1024, 1024)

    // Subtle drop paper grid
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(20, 20, 984, 984)

    // PDF Top Header Ribbon (Adobe Red style)
    ctx.fillStyle = '#dc2626'
    ctx.fillRect(20, 20, 984, 80)

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('📄 PDF/A-1b Searchable Archive Document', 60, 70)

    ctx.font = 'bold 18px monospace'
    ctx.textAlign = 'right'
    ctx.fillText('ISO 19005-1 COMPLIANT', 960, 70)

    // Search query banner
    ctx.fillStyle = '#eff6ff'
    ctx.fillRect(60, 125, 904, 60)
    ctx.strokeStyle = '#93c5fd'
    ctx.lineWidth = 2
    ctx.strokeRect(60, 125, 904, 60)

    ctx.fillStyle = '#1e40af'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('🔍 Full-Text Search Indexed • "Charter" (99.8% OCR Confidence)', 85, 162)

    // Dublin Core Metadata Box
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(60, 210, 904, 150)
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1.5
    ctx.strokeRect(60, 210, 904, 150)

    ctx.fillStyle = '#334155'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText('Dublin Core & MARC21 Metadata Block', 85, 245)

    ctx.font = '15px monospace'
    ctx.fillStyle = '#475569'
    ctx.fillText('dc:title       = "Municipal Charter of Royal Registry"', 85, 275)
    ctx.fillText('dc:date        = "1842-10-14" (ISO-8601 Validated)', 85, 300)
    ctx.fillText('dc:format      = "application/pdf; profile=PDF/A-1b"', 85, 325)
    ctx.fillText('dc:rights      = "Public Domain / Air-Gapped Sovereign"', 85, 350)

    // Digital Formatted Article Typography
    ctx.fillStyle = '#0f172a'
    ctx.font = 'bold 26px sans-serif'
    ctx.fillText('Municipal Charter of Royal Registry (1842)', 60, 410)

    // Formatted Text Paragraphs with Highlighted Search Terms
    const renderParagraph = (startY, lines) => {
        let y = startY
        for (let i = 0; i < lines; i++) {
            // Main text bar
            ctx.fillStyle = '#334155'
            ctx.fillRect(60, y, 904, 12)

            // Simulated OCR Highlight (Cyan glow)
            if (i === 1 || i === 4 || i === 7) {
                ctx.fillStyle = '#38bdf8'
                ctx.fillRect(180, y - 3, 140, 18)
                ctx.fillStyle = '#0369a1'
                ctx.font = 'bold 12px monospace'
                ctx.fillText('SEARCH MATCH', 190, y + 10)
            }
            y += 26
        }
    }

    renderParagraph(450, 12)

    // Verified Checksum & Seal Bottom Footer
    ctx.fillStyle = '#ecfdf5'
    ctx.fillRect(60, 810, 904, 140)
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2
    ctx.strokeRect(60, 810, 904, 140)

    ctx.fillStyle = '#065f46'
    ctx.font = 'bold 22px sans-serif'
    ctx.fillText('✓ Sovereign BagIt Checksum Verified (SHA-512)', 90, 855)

    ctx.font = '14px monospace'
    ctx.fillStyle = '#047857'
    ctx.fillText('Hash: 9e107d9d372bb6826bd81d3542a419d6b5e0c5d0a927a4b1... (100% Sovereign)', 90, 890)
    ctx.fillText('Deliverable: Ready for Institutional Archive Ingestion & Digital Access', 90, 915)

    const texture = new THREE.CanvasTexture(canvas)
    texture.anisotropy = 8
    return texture
}

const ArchivalFlowVisualizer = () => {
    const mountRef = useRef(null)
    const [isPlaying, setIsPlaying] = useState(true)
    const [activeStage, setActiveStage] = useState(2)
    const isPlayingRef = useRef(true)

    useEffect(() => {
        isPlayingRef.current = isPlaying
    }, [isPlaying])

    useEffect(() => {
        const container = mountRef.current
        if (!container) return

        let width = container.clientWidth || 600
        let height = container.clientHeight || 460

        // 1. Scene & Camera Setup
        const scene = new THREE.Scene()
        scene.fog = new THREE.FogExp2(0x0a0c10, 0.035)

        const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
        camera.position.set(0, 0.8, 9.8)

        let renderer
        try {
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
            })
            renderer.setSize(width, height)
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
            renderer.toneMapping = THREE.ACESFilmicToneMapping
            renderer.toneMappingExposure = 1.25
            container.appendChild(renderer.domElement)
        } catch (e) {
            console.error('WebGL init error:', e)
            return
        }

        // 2. Lighting Rig
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.9)
        scene.add(ambientLight)

        const mainLight = new THREE.DirectionalLight(0xffffff, 1.8)
        mainLight.position.set(4, 8, 8)
        scene.add(mainLight)

        const amberLight = new THREE.PointLight(0xf59e0b, 2.5, 14)
        amberLight.position.set(-4.0, 1.5, 3)
        scene.add(amberLight)

        const neuralLight = new THREE.PointLight(0x3b82f6, 3.2, 14)
        neuralLight.position.set(0, 0, 3)
        scene.add(neuralLight)

        const greenLight = new THREE.PointLight(0x10b981, 2.5, 14)
        greenLight.position.set(4.0, 1.5, 3)
        scene.add(greenLight)

        // Root Flow Group
        const flowRoot = new THREE.Group()
        scene.add(flowRoot)

        // ----------------------------------------------------------------------
        // STAGE 1 (LEFT): PHYSICAL OLD AGED BOOK & MANUSCRIPT
        // ----------------------------------------------------------------------
        const bookGroup = new THREE.Group()
        bookGroup.position.set(-3.7, 0, 0)
        flowRoot.add(bookGroup)

        // Procedural Old Book Texture
        const oldBookTexture = createOldBookPageTexture()

        // Open Book Pages (Left & Right folios)
        const pageGeometry = new THREE.PlaneGeometry(1.6, 2.3, 16, 16)
        const pageMaterial = new THREE.MeshStandardMaterial({
            map: oldBookTexture,
            roughness: 0.85,
            metalness: 0.05,
            side: THREE.DoubleSide
        })

        // Left Open Page (slightly angled)
        const leftPage = new THREE.Mesh(pageGeometry, pageMaterial)
        leftPage.position.set(-0.75, 0, 0.1)
        leftPage.rotation.y = 0.22
        bookGroup.add(leftPage)

        // Right Open Page (slightly angled)
        const rightPage = new THREE.Mesh(pageGeometry, pageMaterial)
        rightPage.position.set(0.75, 0, 0.1)
        rightPage.rotation.y = -0.22
        bookGroup.add(rightPage)

        // Leather Hardcover / Backing
        const coverGeo = new THREE.BoxGeometry(3.3, 2.45, 0.18)
        const coverMat = new THREE.MeshStandardMaterial({
            color: 0x451a03, // Antique Leather Burgundy/Brown
            roughness: 0.4,
            metalness: 0.2
        })
        const bookCover = new THREE.Mesh(coverGeo, coverMat)
        bookCover.position.set(0, 0, -0.02)
        bookGroup.add(bookCover)

        // Gold Embossed Spine Rim
        const spineGeo = new THREE.CylinderGeometry(0.14, 0.14, 2.48, 16)
        const spineMat = new THREE.MeshStandardMaterial({
            color: 0xd97706,
            roughness: 0.2,
            metalness: 0.8
        })
        const spine = new THREE.Mesh(spineGeo, spineMat)
        spine.position.set(0, 0, -0.08)
        bookGroup.add(spine)

        // Sweeping Laser Scan Line (Deskew / Ingestion Laser)
        const laserGeo = new THREE.CylinderGeometry(0.015, 0.015, 3.2, 16)
        const laserMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.95
        })
        const laserLine = new THREE.Mesh(laserGeo, laserMat)
        laserLine.rotation.z = Math.PI / 2
        laserLine.position.z = 0.3
        bookGroup.add(laserLine)

        // Glowing Laser Light Curtain
        const curtainGeo = new THREE.PlaneGeometry(3.2, 0.45)
        const curtainMat = new THREE.MeshBasicMaterial({
            color: 0x0284c7,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide
        })
        const laserCurtain = new THREE.Mesh(curtainGeo, curtainMat)
        laserCurtain.position.z = 0.28
        bookGroup.add(laserCurtain)

        // ----------------------------------------------------------------------
        // STAGE 2 (CENTER): LOCAL AI OCR & LAYOUT ENGINE CORE
        // ----------------------------------------------------------------------
        const engineGroup = new THREE.Group()
        engineGroup.position.set(0, 0, 0)
        flowRoot.add(engineGroup)

        // Glowing Quantum Core
        const coreGeo = new THREE.IcosahedronGeometry(0.95, 1)
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0x2563eb,
            emissive: 0x1d4ed8,
            emissiveIntensity: 0.7,
            roughness: 0.15,
            metalness: 0.9
        })
        const coreMesh = new THREE.Mesh(coreGeo, coreMat)
        engineGroup.add(coreMesh)

        // Outer Geometric Lattice
        const latticeGeo = new THREE.IcosahedronGeometry(1.35, 1)
        const latticeMat = new THREE.MeshBasicMaterial({
            color: 0x93c5fd,
            wireframe: true,
            transparent: true,
            opacity: 0.7
        })
        const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat)
        engineGroup.add(latticeMesh)

        // Dual Orbiting AI Accelerators
        const ring1Geo = new THREE.TorusGeometry(1.65, 0.022, 16, 64)
        const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.85 })
        const ring1 = new THREE.Mesh(ring1Geo, ring1Mat)
        engineGroup.add(ring1)

        const ring2Geo = new THREE.TorusGeometry(1.8, 0.018, 16, 64)
        const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.65 })
        const ring2 = new THREE.Mesh(ring2Geo, ring2Mat)
        ring2.rotation.x = Math.PI / 3.5
        engineGroup.add(ring2)

        // Floating Neural OCR Glyphs
        const glyphCount = 40
        const glyphGeo = new THREE.BufferGeometry()
        const glyphPos = new Float32Array(glyphCount * 3)
        for (let i = 0; i < glyphCount; i++) {
            const angle = (i / glyphCount) * Math.PI * 2
            const r = 1.45 + (Math.random() - 0.5) * 0.35
            glyphPos[i * 3] = Math.cos(angle) * r
            glyphPos[i * 3 + 1] = (Math.random() - 0.5) * 1.3
            glyphPos[i * 3 + 2] = Math.sin(angle) * r
        }
        glyphGeo.setAttribute('position', new THREE.BufferAttribute(glyphPos, 3))
        const glyphMat = new THREE.PointsMaterial({
            color: 0x38bdf8,
            size: 0.08,
            transparent: true,
            opacity: 0.95
        })
        const glyphPoints = new THREE.Points(glyphGeo, glyphMat)
        engineGroup.add(glyphPoints)

        // ----------------------------------------------------------------------
        // STAGE 3 (RIGHT): FORMATTED SEARCHABLE PDF/A DOCUMENT
        // ----------------------------------------------------------------------
        const pdfGroup = new THREE.Group()
        pdfGroup.position.set(3.7, 0, 0)
        flowRoot.add(pdfGroup)

        // Procedural Formatted PDF Texture
        const pdfTexture = createFormattedPdfTexture()

        // Digital PDF Page Mesh
        const pdfGeo = new THREE.BoxGeometry(2.0, 2.7, 0.05)
        const pdfMat = new THREE.MeshStandardMaterial({
            map: pdfTexture,
            roughness: 0.25,
            metalness: 0.1
        })
        const pdfMesh = new THREE.Mesh(pdfGeo, pdfMat)
        pdfGroup.add(pdfMesh)

        // Glowing Blue/Green Document Rim
        const pdfEdgesGeo = new THREE.EdgesGeometry(pdfGeo)
        const pdfEdgesMat = new THREE.LineBasicMaterial({
            color: 0x10b981,
            linewidth: 2
        })
        const pdfEdges = new THREE.LineSegments(pdfEdgesGeo, pdfEdgesMat)
        pdfGroup.add(pdfEdges)

        // Search Scanner Pulse on PDF
        const searchPulseGeo = new THREE.PlaneGeometry(1.95, 0.2)
        const searchPulseMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide
        })
        const searchPulse = new THREE.Mesh(searchPulseGeo, searchPulseMat)
        searchPulse.position.z = 0.04
        pdfGroup.add(searchPulse)

        // Searchable Rays / Star Sparkles
        const sparkleCount = 28
        const sparkleGeo = new THREE.BufferGeometry()
        const sparklePos = new Float32Array(sparkleCount * 3)
        for (let i = 0; i < sparkleCount; i++) {
            sparklePos[i * 3] = (Math.random() - 0.5) * 2.3
            sparklePos[i * 3 + 1] = (Math.random() - 0.5) * 2.9
            sparklePos[i * 3 + 2] = (Math.random() - 0.5) * 0.8 + 0.3
        }
        sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3))
        const sparkleMat = new THREE.PointsMaterial({
            color: 0x6ee7b7,
            size: 0.06,
            transparent: true,
            opacity: 0.9
        })
        const sparkles = new THREE.Points(sparkleGeo, sparkleMat)
        pdfGroup.add(sparkles)

        // ----------------------------------------------------------------------
        // CONNECTING PARTICLE DATA FLOW STREAMS (Stream 1 & 2)
        // ----------------------------------------------------------------------
        const createFlowStream = (startX, endX, colorHex) => {
            const count = 55
            const geometry = new THREE.BufferGeometry()
            const positions = new Float32Array(count * 3)
            const speeds = new Float32Array(count)

            for (let i = 0; i < count; i++) {
                const p = i / count
                positions[i * 3] = startX + (endX - startX) * p
                positions[i * 3 + 1] = Math.sin(p * Math.PI) * 0.35 + (Math.random() - 0.5) * 0.08
                positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2
                speeds[i] = 0.022 + Math.random() * 0.015
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
            const material = new THREE.PointsMaterial({
                color: colorHex,
                size: 0.08,
                transparent: true,
                opacity: 0.9
            })

            const points = new THREE.Points(geometry, material)
            flowRoot.add(points)

            return { points, geometry, positions, speeds, startX, endX }
        }

        // Stream 1: Old Book -> AI Core (Warm amber-to-cyan data flow)
        const stream1 = createFlowStream(-2.8, -1.1, 0x38bdf8)
        // Stream 2: AI Core -> Formatted PDF (Emerald verified PDF stream)
        const stream2 = createFlowStream(1.1, 2.8, 0x34d399)

        // ----------------------------------------------------------------------
        // Mouse Interaction / Tilt
        // ----------------------------------------------------------------------
        let isDragging = false
        let previousMousePosition = { x: 0, y: 0 }
        let targetRotation = { x: 0.08, y: 0 }
        let currentRotation = { x: 0.08, y: 0 }

        const onMouseDown = (e) => {
            isDragging = true
            previousMousePosition = { x: e.clientX, y: e.clientY }
        }

        const onMouseMove = (e) => {
            if (isDragging) {
                const deltaX = e.clientX - previousMousePosition.x
                const deltaY = e.clientY - previousMousePosition.y

                targetRotation.y += deltaX * 0.004
                targetRotation.x += deltaY * 0.004
                targetRotation.x = Math.max(-0.35, Math.min(0.35, targetRotation.x))
                targetRotation.y = Math.max(-0.5, Math.min(0.5, targetRotation.y))

                previousMousePosition = { x: e.clientX, y: e.clientY }
            }
        }

        const onMouseUp = () => {
            isDragging = false
        }

        container.addEventListener('mousedown', onMouseDown)
        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)

        // ----------------------------------------------------------------------
        // Main Render & Animation Loop
        // ----------------------------------------------------------------------
        let animationFrameId
        let clock = new THREE.Clock()

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate)
            const elapsedTime = clock.getElapsedTime()

            // Smooth mouse rotation
            currentRotation.x += (targetRotation.x - currentRotation.x) * 0.06
            currentRotation.y += (targetRotation.y - currentRotation.y) * 0.06
            flowRoot.rotation.y = currentRotation.y
            flowRoot.rotation.x = currentRotation.x

            if (isPlayingRef.current) {
                // Natural Levitation for each element
                bookGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.07
                engineGroup.position.y = Math.sin(elapsedTime * 1.5 + 1.1) * 0.07
                pdfGroup.position.y = Math.sin(elapsedTime * 1.5 + 2.2) * 0.07

                // Book scan laser sweep
                const scanY = Math.sin(elapsedTime * 2.8) * 0.95
                laserLine.position.y = scanY
                laserCurtain.position.y = scanY

                // Neural Core Rotations
                coreMesh.rotation.y -= 0.012
                latticeMesh.rotation.y += 0.015
                latticeMesh.rotation.x += 0.009
                ring1.rotation.z += 0.018
                ring2.rotation.y += 0.014
                glyphPoints.rotation.y += 0.01

                // Formatted PDF subtle angles and search pulse sweep
                pdfGroup.rotation.y = Math.sin(elapsedTime * 0.8) * 0.06 - 0.1
                const pulseY = Math.sin(elapsedTime * 2.2) * 1.1
                searchPulse.position.y = pulseY
                sparkles.rotation.y -= 0.008

                // Particle stream movement
                const updateStream = (stream) => {
                    const pos = stream.geometry.attributes.position.array
                    for (let i = 0; i < pos.length / 3; i++) {
                        pos[i * 3] += stream.speeds[i]
                        if (pos[i * 3] > stream.endX) {
                            pos[i * 3] = stream.startX
                        }
                        const progress = (pos[i * 3] - stream.startX) / (stream.endX - stream.startX)
                        pos[i * 3 + 1] = Math.sin(progress * Math.PI) * 0.35 + Math.sin(elapsedTime * 4 + i) * 0.03
                    }
                    stream.geometry.attributes.position.needsUpdate = true
                }

                updateStream(stream1)
                updateStream(stream2)
            }

            renderer.render(scene, camera)
        }

        animate()

        // ----------------------------------------------------------------------
        // Responsive Resize
        // ----------------------------------------------------------------------
        const handleResize = () => {
            if (!container) return
            const newWidth = container.clientWidth
            const newHeight = container.clientHeight
            camera.aspect = newWidth / newHeight
            camera.updateProjectionMatrix()
            renderer.setSize(newWidth, newHeight)
        }

        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            container.removeEventListener('mousedown', onMouseDown)
            window.removeEventListener('mousemove', onMouseMove)
            window.removeEventListener('mouseup', onMouseUp)
            cancelAnimationFrame(animationFrameId)
            renderer.dispose()
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement)
            }
        }
    }, [])

    const handleReset = () => {
        setIsPlaying(true)
    }

    return (
        <div className="archival-flow-container">
            {/* Top Minimal HUD Header (Clean & Uncluttered) */}
            <div className="flow-hud-header">
                <div className="flow-title-badge">
                    <span className="status-dot"></span>
                    <span>Live Purpose Flow: Old Manuscript ➔ Searchable PDF/A</span>
                </div>

                <div className="flow-controls-quick">
                    <button
                        className={`flow-btn-hud ${isPlaying ? 'active' : ''}`}
                        onClick={() => setIsPlaying(!isPlaying)}
                        title={isPlaying ? 'Pause 3D Simulation' : 'Play 3D Simulation'}
                    >
                        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                        <span>{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>
                    <button
                        className="flow-btn-hud"
                        onClick={handleReset}
                        title="Reset 3D Perspective"
                    >
                        <RotateCcw size={12} />
                        <span>Reset</span>
                    </button>
                </div>
            </div>

            {/* Stage Visual Labels (Placed above flow nodes without obscuring) */}
            <div className="flow-stage-labels-row">
                <div className="stage-label-chip left">
                    <BookOpen size={13} className="text-amber-400" />
                    <span>1. Input: Old Book Scan</span>
                </div>
                <div className="stage-label-chip center">
                    <Cpu size={13} className="text-blue-400" />
                    <span>2. Air-Gapped AI OCR</span>
                </div>
                <div className="stage-label-chip right">
                    <FileText size={13} className="text-emerald-400" />
                    <span>3. Output: Formatted PDF</span>
                </div>
            </div>

            {/* Three.js Interactive WebGL Canvas */}
            <div ref={mountRef} className="archival-flow-canvas" />

            {/* Bottom Minimal Feature Badges */}
            <div className="flow-bottom-summary">
                <div className="flow-summary-tag">
                    <Sparkles size={13} />
                    <span>Auto-Deskew & Contrast</span>
                </div>
                <div className="flow-summary-tag">
                    <Search size={13} />
                    <span>Dual-Layer Searchable Text</span>
                </div>
                <div className="flow-summary-tag">
                    <CheckCircle2 size={13} />
                    <span>Dublin Core & ISO BagIt</span>
                </div>
            </div>
        </div>
    )
}

export default ArchivalFlowVisualizer
