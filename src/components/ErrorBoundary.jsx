import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('Unhandled Application Error:', error, errorInfo)
    }

    handleReload = () => {
        window.location.reload()
    }

    handleGoHome = () => {
        this.setState({ hasError: false, error: null })
        window.location.href = '/'
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    padding: '2rem',
                    backgroundColor: '#212327',
                    color: '#ffffff',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                    textAlign: 'center'
                }}>
                    <div style={{
                        maxWidth: '480px',
                        background: '#191b1f',
                        border: '1px solid rgba(207, 46, 46, 0.3)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.6)'
                    }}>
                        <div style={{
                            display: 'inline-flex',
                            padding: '1rem',
                            borderRadius: '50%',
                            background: 'rgba(207, 46, 46, 0.15)',
                            color: '#cf2e2e',
                            marginBottom: '1rem'
                        }}>
                            <AlertTriangle size={36} />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffffff' }}>
                            Something went wrong
                        </h2>
                        <p style={{ color: '#abb8c3', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            An unexpected error occurred while rendering the interface. Your archive data remains safe.
                        </p>
                        {this.state.error?.message && (
                            <div style={{
                                background: '#2a2d34',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.8rem',
                                color: '#cf2e2e',
                                fontFamily: 'JetBrains Mono, monospace',
                                marginBottom: '1.5rem',
                                textAlign: 'left',
                                wordBreak: 'break-all'
                            }}>
                                {this.state.error.message}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '0.5rem',
                                    background: '#3b82f6',
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    fontSize: '0.875rem'
                                }}
                            >
                                <RefreshCw size={16} />
                                Reload App
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.625rem 1.25rem',
                                    borderRadius: '0.5rem',
                                    background: '#20202e',
                                    color: '#cbd5e1',
                                    border: '1px solid rgba(148, 163, 184, 0.2)',
                                    cursor: 'pointer',
                                    fontWeight: 500,
                                    fontSize: '0.875rem'
                                }}
                            >
                                <Home size={16} />
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
