import React, { useState, useEffect } from 'react'
import { Lock, ArrowRight, ShieldCheck, AlertCircle, UserPlus, CheckCircle } from 'lucide-react'
import bcrypt from 'bcryptjs'
import LogoLoader from './LogoLoader'
import './LoginScreen.css'

const LoginScreen = ({ onLogin }) => {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isFirstRun, setIsFirstRun] = useState(false)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    useEffect(() => {
        // Check if we have a stored hash
        const hash = localStorage.getItem('auth_hash')
        if (!hash) {
            setIsFirstRun(true)
        }
    }, [])

    const handleRegister = (e) => {
        e.preventDefault()
        setError('')
        setSuccessMessage('')

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setIsLoading(true)

        // Hashing intentionally delayed to prevent blocking UI if it was synchronous, 
        // though bcryptjs is sync by default unless async method used.
        // We simulate "Setup" process
        setTimeout(() => {
            try {
                const salt = bcrypt.genSaltSync(10)
                const hash = bcrypt.hashSync(password, salt)
                localStorage.setItem('auth_hash', hash)

                setSuccessMessage('Security setup complete! Logging you in...')

                setTimeout(() => {
                    onLogin()
                }, 1000)
            } catch (err) {
                setError('Failed to secure password. Please try again.')
                setIsLoading(false)
            }
        }, 800)
    }

    const handleLogin = (e) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        setTimeout(() => {
            const storedHash = localStorage.getItem('auth_hash')
            if (!storedHash) {
                setError('Security error: No password found. Please reset application data.')
                setIsLoading(false)
                return
            }

            const isValid = bcrypt.compareSync(password, storedHash)
            if (isValid) {
                onLogin()
            } else {
                setIsLoading(false)
                setError('Invalid password. Access denied.')
            }
        }, 800)
    }

    return (
        <div className="login-screen">
            <div className="login-card">
                <div className="login-header">
                    <LogoLoader size="md" />
                    <h1>{isFirstRun ? 'System Setup' : 'Welcome Back'}</h1>
                    <p>{isFirstRun
                        ? 'Create a secure password for your local archive.'
                        : 'Enter your credentials to access the archive builder'}</p>
                </div>

                <form onSubmit={isFirstRun ? handleRegister : handleLogin} className="login-form">
                    <div className="input-group">
                        <Lock className="input-icon" size={20} />
                        <input
                            type="password"
                            placeholder={isFirstRun ? "Create Password" : "Password"}
                            aria-label={isFirstRun ? "Create password" : "Enter password"}
                            autoComplete={isFirstRun ? "new-password" : "current-password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={error ? 'error' : ''}
                            autoFocus
                        />
                    </div>

                    {isFirstRun && (
                        <div className="input-group">
                            <Lock className="input-icon" size={20} />
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                aria-label="Confirm password"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={error ? 'error' : ''}
                            />
                        </div>
                    )}

                    {error && (
                        <div className="error-message" role="alert">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="success-message" role="status" style={{ color: 'green', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                            <CheckCircle size={16} />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-login"
                        aria-label={isFirstRun ? "Set password and login" : "Access system"}
                        disabled={isLoading || !password}
                    >
                        {isLoading ? (
                            <span className="loading-dots">{isFirstRun ? 'Securing...' : 'Verifying...'}</span>
                        ) : (
                            <>
                                {isFirstRun ? 'Set Password & Login' : 'Access System'}
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <ShieldCheck size={16} />
                    <span>{isFirstRun ? 'Offline & Encrypted Storage' : 'Secure Offline Environment'}</span>
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
