import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Cookie, Settings, Check } from 'lucide-react'
import './CookieConsent.css'

const COOKIE_STORAGE_KEY = 'libradigit_cookie_consent'

export const getStoredConsent = () => {
    try {
        const item = localStorage.getItem(COOKIE_STORAGE_KEY)
        if (item) {
            return JSON.parse(item)
        }
    } catch (e) {
        console.error('Failed to parse cookie consent', e)
    }
    return null
}

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(false)
    const [showPreferences, setShowPreferences] = useState(false)
    const [preferences, setPreferences] = useState({
        necessary: true,
        functional: true,
        analytics: false
    })

    useEffect(() => {
        const consent = getStoredConsent()
        if (!consent) {
            // Delay slightly for smooth page load
            const timer = setTimeout(() => setIsVisible(true), 1200)
            return () => clearTimeout(timer)
        } else {
            setPreferences(consent.categories || { necessary: true, functional: true, analytics: false })
        }
    }, [])

    useEffect(() => {
        // Allow any footer link to trigger settings
        const handleOpenSettings = () => {
            const consent = getStoredConsent()
            if (consent?.categories) {
                setPreferences(consent.categories)
            }
            setShowPreferences(true)
            setIsVisible(true)
        }

        window.openCookieConsentSettings = handleOpenSettings
        window.addEventListener('open_cookie_settings', handleOpenSettings)

        return () => {
            window.removeEventListener('open_cookie_settings', handleOpenSettings)
            delete window.openCookieConsentSettings
        }
    }, [])

    const saveConsent = (acceptedCategories) => {
        const payload = {
            status: 'decided',
            timestamp: new Date().toISOString(),
            categories: acceptedCategories
        }
        try {
            localStorage.setItem(COOKIE_STORAGE_KEY, JSON.stringify(payload))
            window.dispatchEvent(new CustomEvent('cookie_consent_updated', { detail: payload }))
        } catch (e) {
            console.error('Failed to save cookie consent', e)
        }
        setIsVisible(false)
        setShowPreferences(false)
    }

    const handleAcceptAll = () => {
        saveConsent({ necessary: true, functional: true, analytics: true })
    }

    const handleRejectNonEssential = () => {
        saveConsent({ necessary: true, functional: false, analytics: false })
    }

    const handleSavePreferences = () => {
        saveConsent({ ...preferences, necessary: true })
    }

    if (!isVisible) return null

    return (
        <div className="cookie-consent-overlay" role="region" aria-label="Privacy & Cookie Preferences">
            <div className="cookie-consent-banner">
                <div className="consent-header">
                    <div className="consent-icon-badge">
                        <Cookie size={20} />
                    </div>
                    <div className="consent-title-wrap">
                        <h4>Cookie & Privacy Preferences</h4>
                        <p>
                            LibraDigit AI is local-first and sovereign. We use strictly necessary local storage to remember your master session and theme preferences. No personal tracking cookies or external ad beacons are ever deployed.
                        </p>
                    </div>
                </div>

                {showPreferences && (
                    <div className="consent-preferences-box">
                        <div className="preference-item locked">
                            <div className="pref-info">
                                <strong>Strictly Necessary (Required)</strong>
                                <span>Essential for local authentication, session security, and database persistence.</span>
                            </div>
                            <span className="badge-locked">Always Active</span>
                        </div>

                        <div className="preference-item">
                            <div className="pref-info">
                                <strong>Functional Preferences</strong>
                                <span>Remembers dark/light theme toggle, pagination density, and layout view modes.</span>
                            </div>
                            <label className="pref-toggle">
                                <input
                                    type="checkbox"
                                    checked={preferences.functional}
                                    onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                                />
                                <span className="pref-slider"></span>
                            </label>
                        </div>

                        <div className="preference-item">
                            <div className="pref-info">
                                <strong>Anonymous Local Diagnostics</strong>
                                <span>Allows in-browser error logging to assist local performance diagnostics. Zero telemetry is sent to any external server.</span>
                            </div>
                            <label className="pref-toggle">
                                <input
                                    type="checkbox"
                                    checked={preferences.analytics}
                                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                                />
                                <span className="pref-slider"></span>
                            </label>
                        </div>

                        <div className="consent-policy-link">
                            <Link to="/cookies" onClick={() => setIsVisible(false)}>View Detailed Cookie Disclosures</Link>
                            <span>•</span>
                            <Link to="/privacy" onClick={() => setIsVisible(false)}>Privacy Policy</Link>
                        </div>
                    </div>
                )}

                <div className="consent-actions-deck">
                    {!showPreferences ? (
                        <>
                            <button
                                type="button"
                                className="btn-consent-secondary"
                                onClick={() => setShowPreferences(true)}
                            >
                                <Settings size={14} />
                                <span>Customize Preferences</span>
                            </button>
                            <button
                                type="button"
                                className="btn-consent-reject"
                                onClick={handleRejectNonEssential}
                            >
                                <span>Reject Non-Essential</span>
                            </button>
                            <button
                                type="button"
                                className="btn-consent-accept"
                                onClick={handleAcceptAll}
                            >
                                <Check size={14} />
                                <span>Accept All</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="btn-consent-secondary"
                                onClick={() => setShowPreferences(false)}
                            >
                                <span>Back</span>
                            </button>
                            <button
                                type="button"
                                className="btn-consent-reject"
                                onClick={handleRejectNonEssential}
                            >
                                <span>Reject All Optional</span>
                            </button>
                            <button
                                type="button"
                                className="btn-consent-accept"
                                onClick={handleSavePreferences}
                            >
                                <span>Save My Preferences</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CookieConsent
