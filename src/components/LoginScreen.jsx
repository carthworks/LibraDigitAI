import React, { useState } from 'react'
import { Lock, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react'
import LogoLoader from './LogoLoader'
import './LoginScreen.css'

const LoginScreen = ({ onLogin }) => {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = (e) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        // Simulate network delay for security feel
        setTimeout(() => {
            // Hardcoded password for standalone distribution
            // In a real app, this would check against a secure storage or hash
            if (password === 'libradigit' || password === 'admin') {
                setIsLoading(false)
                onLogin()
            } else {
                setIsLoading(false)
                setError('Invalid password. Default is "libradigit"')
            }
        }, 800)
    }

    return (
        <div className="login-screen">
            <div className="login-card">
                <div className="login-header">
                    <LogoLoader size="md" />
                    <h1>Welcome Back</h1>
                    <p>Enter your credentials to access the archive builder</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    <div className="input-group">
                        <Lock className="input-icon" size={20} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={error ? 'error' : ''}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="error-message">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-login"
                        disabled={isLoading || !password}
                    >
                        {isLoading ? (
                            <span className="loading-dots">Verifying...</span>
                        ) : (
                            <>
                                Access System
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <ShieldCheck size={16} />
                    <span>Secure Offline Environment</span>
                </div>
            </div>

            <div className="login-background">
                <div className="bg-shape shape-1"></div>
                <div className="bg-shape shape-2"></div>
                <div className="bg-grid"></div>
            </div>
        </div>
    )
}

export default LoginScreen
