import { Archive, Brain, ScanLine } from 'lucide-react'

const LogoLoader = ({ size = 'md', className = '' }) => {
    const getSize = () => {
        switch (size) {
            case 'sm': return 32
            case 'lg': return 96
            case 'xl': return 128
            default: return 64
        }
    }

    const iconSize = getSize()

    return (
        <div className={`logo-loader ${className}`}>
            <div className="logo-icon-wrapper">
                <Archive size={iconSize} className="logo-main" />
                <div className="logo-scan-overlay">
                    <ScanLine size={iconSize} />
                </div>
                <div className="logo-brain-float">
                    <Brain size={iconSize * 0.4} />
                </div>
            </div>
            <div className="logo-rings"></div>
        </div>
    )
}

export default LogoLoader
