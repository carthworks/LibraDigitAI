import { useState, useEffect } from 'react'
import {
    Lock,
    Mail,
    User,
    KeyRound,
    ArrowRight,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    Eye,
    EyeOff,
    Sparkles,
    X,
    Archive,
    RotateCcw,
    UserPlus,
    LogIn
} from 'lucide-react'
import bcrypt from 'bcryptjs'

const LoginScreen = ({ onLogin, isModal = false, onClose = null, initialMode = 'login' }) => {
    // Mode: 'login' | 'register' | 'reset'
    const [authMode, setAuthMode] = useState(initialMode)
    
    // Form fields
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [recoveryKey, setRecoveryKey] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(true)

    // UI feedback
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    useEffect(() => {
        const storedHash = localStorage.getItem('auth_hash')
        if (!storedHash) {
            setAuthMode('register')
        }
    }, [])

    const switchMode = (mode) => {
        setAuthMode(mode)
        setError('')
        setSuccessMessage('')
        setPassword('')
        setConfirmPassword('')
    }

    // 1. Handle Sign In
    const handleLogin = (e) => {
        e.preventDefault()
        setError('')
        setSuccessMessage('')

        if (!password) {
            setError('Please enter your password')
            return
        }

        setIsLoading(true)

        setTimeout(() => {
            const storedHash = localStorage.getItem('auth_hash')
            if (!storedHash) {
                // If no master hash exists yet, allow initial creation
                const salt = bcrypt.genSaltSync(10)
                const hash = bcrypt.hashSync(password, salt)
                localStorage.setItem('auth_hash', hash)
                localStorage.setItem('auth_user', username || 'Archivist')
                if (rememberMe) localStorage.setItem('app_session_active', 'true')
                setSuccessMessage('Welcome! Initial sovereign security key created.')
                setTimeout(() => {
                    if (onLogin) onLogin()
                }, 800)
                return
            }

            try {
                const isValid = bcrypt.compareSync(password, storedHash)
                if (isValid) {
                    if (rememberMe) localStorage.setItem('app_session_active', 'true')
                    setSuccessMessage('Access granted. Entering sovereign archive...')
                    setTimeout(() => {
                        if (onLogin) onLogin()
                    }, 600)
                } else {
                    setIsLoading(false)
                    setError('Incorrect password. Access denied.')
                }
            } catch (err) {
                setIsLoading(false)
                setError('Authentication error. Please retry.')
            }
        }, 600)
    }

    // 2. Handle Registration
    const handleRegister = (e) => {
        e.preventDefault()
        setError('')
        setSuccessMessage('')

        if (password.length < 6) {
            setError('Master password must be at least 6 characters')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setIsLoading(true)

        setTimeout(() => {
            try {
                const salt = bcrypt.genSaltSync(10)
                const hash = bcrypt.hashSync(password, salt)
                localStorage.setItem('auth_hash', hash)
                localStorage.setItem('auth_user', username || 'Lead Archivist')
                if (email) localStorage.setItem('auth_email', email)
                
                // Set default recovery key or user chosen key
                const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
                const generatedKey = recoveryKey.trim() || 'SOVEREIGN-' + randomPart
                localStorage.setItem('auth_recovery_key', generatedKey)

                setSuccessMessage(`Account initialized! Your recovery key is: ${generatedKey}`)

                setTimeout(() => {
                    if (onLogin) onLogin()
                }, 1400)
            } catch (err) {
                setError('Failed to encrypt and store credentials.')
                setIsLoading(false)
            }
        }, 800)
    }

    // 3. Handle Password Reset
    const handleResetPassword = (e) => {
        e.preventDefault()
        setError('')
        setSuccessMessage('')

        if (password.length < 6) {
            setError('New password must be at least 6 characters')
            return
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        const storedRecoveryKey = localStorage.getItem('auth_recovery_key')

        // A stored recovery key must always be supplied; a blank key used to skip this check.
        if (storedRecoveryKey && recoveryKey.trim().toUpperCase() !== storedRecoveryKey.toUpperCase()) {
            setError('Invalid Recovery Key. Please check your key and retry.')
            return
        }

        setIsLoading(true)

        setTimeout(() => {
            try {
                const salt = bcrypt.genSaltSync(10)
                const hash = bcrypt.hashSync(password, salt)
                localStorage.setItem('auth_hash', hash)

                setSuccessMessage('Password reset successfully! You can now log in.')
                setIsLoading(false)

                setTimeout(() => {
                    switchMode('login')
                }, 1200)
            } catch (err) {
                setError('Failed to update master password.')
                setIsLoading(false)
            }
        }, 800)
    }

    // Quick demo access for testing
    const handleQuickAccess = () => {
        const storedHash = localStorage.getItem('auth_hash')
        if (!storedHash) {
            const salt = bcrypt.genSaltSync(10)
            const hash = bcrypt.hashSync('admin123', salt)
            localStorage.setItem('auth_hash', hash)
            localStorage.setItem('auth_user', 'Demo Archivist')
        }
        localStorage.setItem('app_session_active', 'true')
        if (onLogin) onLogin()
    }

    const modalContent = (
        <div className="auth-card-box">
            {isModal && onClose && (
                <button
                    type="button"
                    className="auth-modal-close-btn"
                    onClick={onClose}
                    aria-label="Close login dialog"
                >
                    <X size={18} />
                </button>
            )}

            {/* Clean Logo Header */}
            <div className="auth-header-block">
                <div className="auth-brand-badge">
                    <Archive size={26} className="brand-archive-icon" />
                </div>
                <h2>
                    {authMode === 'login' && 'Sign In to LibraDigit AI'}
                    {authMode === 'register' && 'Create Sovereign Account'}
                    {authMode === 'reset' && 'Reset Master Password'}
                </h2>
                <p>
                    {authMode === 'login' && 'Access your encrypted local digital preservation workspace.'}
                    {authMode === 'register' && 'Set up your on-device master credentials and archival profile.'}
                    {authMode === 'reset' && 'Recover access using your offline recovery key or security token.'}
                </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="auth-mode-tabs" role="tablist">
                <button
                    type="button"
                    className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                    onClick={() => switchMode('login')}
                >
                    <LogIn size={15} />
                    <span>Sign In</span>
                </button>
                <button
                    type="button"
                    className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
                    onClick={() => switchMode('register')}
                >
                    <UserPlus size={15} />
                    <span>Register</span>
                </button>
                <button
                    type="button"
                    className={`auth-tab-btn ${authMode === 'reset' ? 'active' : ''}`}
                    onClick={() => switchMode('reset')}
                >
                    <RotateCcw size={15} />
                    <span>Reset</span>
                </button>
            </div>

            {/* 1. SIGN IN FORM */}
            {authMode === 'login' && (
                <form onSubmit={handleLogin} className="auth-form-deck">
                    <div className="auth-input-group">
                        <User className="auth-input-icon" size={17} />
                        <input
                            type="text"
                            placeholder="Username or Archivist ID (Optional)"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                        />
                    </div>

                    <div className="auth-input-group">
                        <Lock className="auth-input-icon" size={17} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Master Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                            autoFocus
                        />
                        <button
                            type="button"
                            className="auth-eye-btn"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    <div className="auth-options-row">
                        <label className="remember-checkbox">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span>Remember session</span>
                        </label>
                        <button
                            type="button"
                            className="btn-link-action"
                            onClick={() => switchMode('reset')}
                        >
                            Forgot Password?
                        </button>
                    </div>

                    {error && (
                        <div className="auth-error-banner" role="alert">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="auth-success-banner" role="status">
                            <CheckCircle2 size={16} />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-auth-submit"
                        disabled={isLoading || !password}
                    >
                        {isLoading ? (
                            <span>Verifying Credentials...</span>
                        ) : (
                            <>
                                <span>Enter Workspace</span>
                                <ArrowRight size={17} />
                            </>
                        )}
                    </button>

                    <div className="auth-quick-actions">
                        <button
                            type="button"
                            className="btn-demo-quick"
                            onClick={handleQuickAccess}
                        >
                            <Sparkles size={14} />
                            <span>Instant Demo Launch</span>
                        </button>
                    </div>
                </form>
            )}

            {/* 2. REGISTRATION FORM */}
            {authMode === 'register' && (
                <form onSubmit={handleRegister} className="auth-form-deck">
                    <div className="auth-input-group">
                        <User className="auth-input-icon" size={17} />
                        <input
                            type="text"
                            placeholder="Full Name / Organization (Optional)"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="auth-input-group">
                        <Mail className="auth-input-icon" size={17} />
                        <input
                            type="email"
                            placeholder="Email Address (Optional for notifications)"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="auth-input-group">
                        <Lock className="auth-input-icon" size={17} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create Master Password (min. 6 chars)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            className="auth-eye-btn"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    <div className="auth-input-group">
                        <Lock className="auth-input-icon" size={17} />
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm Master Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            className="auth-eye-btn"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    <div className="auth-input-group">
                        <KeyRound className="auth-input-icon" size={17} />
                        <input
                            type="text"
                            placeholder="Custom Recovery Phrase / Key (Optional)"
                            value={recoveryKey}
                            onChange={(e) => setRecoveryKey(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="auth-error-banner" role="alert">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="auth-success-banner" role="status">
                            <CheckCircle2 size={16} />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-auth-submit"
                        disabled={isLoading || !password || !confirmPassword}
                    >
                        {isLoading ? (
                            <span>Encrypting & Registering...</span>
                        ) : (
                            <>
                                <span>Create Account & Initialize</span>
                                <ArrowRight size={17} />
                            </>
                        )}
                    </button>
                </form>
            )}

            {/* 3. RESET PASSWORD FORM */}
            {authMode === 'reset' && (
                <form onSubmit={handleResetPassword} className="auth-form-deck">
                    <div className="auth-input-group">
                        <KeyRound className="auth-input-icon" size={17} />
                        <input
                            type="text"
                            placeholder="Recovery Key or Master Secret"
                            value={recoveryKey}
                            onChange={(e) => setRecoveryKey(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="auth-input-group">
                        <Lock className="auth-input-icon" size={17} />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="New Master Password (min. 6 chars)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            className="auth-eye-btn"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    <div className="auth-input-group">
                        <Lock className="auth-input-icon" size={17} />
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm New Master Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            className="auth-eye-btn"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {error && (
                        <div className="auth-error-banner" role="alert">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="auth-success-banner" role="status">
                            <CheckCircle2 size={16} />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-auth-submit"
                        disabled={isLoading || !password || !confirmPassword}
                    >
                        {isLoading ? (
                            <span>Updating Encryption Key...</span>
                        ) : (
                            <>
                                <span>Reset Password & Enter</span>
                                <ArrowRight size={17} />
                            </>
                        )}
                    </button>

                    <div className="auth-quick-actions">
                        <button
                            type="button"
                            className="btn-link-action"
                            onClick={() => switchMode('login')}
                        >
                            Remember password? Back to Sign In
                        </button>
                    </div>
                </form>
            )}

            {/* Footer Trust Indicator */}
            <div className="auth-footer-security">
                <ShieldCheck size={14} className="icon-emerald" />
                <span>100% On-Device Sovereign Processing • Bcrypt Encrypted</span>
            </div>
        </div>
    )

    if (isModal) {
        return (
            <div className="auth-modal-backdrop" onClick={onClose}>
                <div className="auth-modal-dialog" onClick={(e) => e.stopPropagation()}>
                    {modalContent}
                </div>
            </div>
        )
    }

    return (
        <div className="login-fullscreen-wrapper">
            <div className="login-center-container">
                {modalContent}
            </div>
        </div>
    )
}

export default LoginScreen
