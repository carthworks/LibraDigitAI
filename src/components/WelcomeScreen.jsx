import { useEffect, useState } from 'react'
import LogoLoader from './LogoLoader'
import './WelcomeScreen.css'

const WelcomeScreen = ({ onComplete }) => {
    const [status, setStatus] = useState('Initializing...')
    const [progress, setProgress] = useState(0)
    const [isFading, setIsFading] = useState(false)

    useEffect(() => {
        // Simulation of startup checks
        const steps = [
            { msg: 'Loading core modules...', time: 800 },
            { msg: 'Connecting to local database...', time: 1600 },
            { msg: 'Verifying OCR engine...', time: 2400 },
            { msg: 'Preparing user interface...', time: 3200 },
            { msg: 'Ready', time: 3800 }
        ]

        let currentStep = 0
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                setStatus(steps[currentStep].msg)
                setProgress(((currentStep + 1) / steps.length) * 100)
                currentStep++
            } else {
                clearInterval(interval)
                setIsFading(true)
                setTimeout(() => {
                    onComplete()
                }, 1200) // Wait for fade out animation
            }
        }, 1200)

        return () => clearInterval(interval)
    }, [onComplete])

    return (
        <div className={`welcome-screen ${isFading ? 'fade-out' : ''}`}>
            <div className="welcome-content">
                <div className="welcome-logo">
                    <LogoLoader size="xl" />
                </div>

                <h1 className="app-title">
                    LibraDigit <span className="text-gradient">AI</span>
                </h1>

                <p className="app-subtitle">Advanced Digital Archive Builder</p>

                <div className="loading-container">
                    <div className="loading-bar-bg">
                        <div
                            className="loading-bar-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="loading-status">
                        <span className="status-text">{status}</span>
                        <span className="status-percent">{Math.round(progress)}%</span>
                    </div>
                </div>

                <div className="version-tag">
                    v1.0.0
                </div>
            </div>

            <div className="welcome-background">
                <div className="glow-orb orb-1"></div>
                <div className="glow-orb orb-2"></div>
                <div className="grid-overlay"></div>
            </div>
        </div>
    )
}

export default WelcomeScreen
